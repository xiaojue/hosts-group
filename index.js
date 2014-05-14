/**
 * @author xiaojue
 * @email designsor@gmail.com
 * @fileoverview hosts-group
 */
var fs = require('fs');
var os = require('os');
var util = require('util');
var groupReg = /^## @(.*?)$/;
var blankReg = /\s+/;
var defaultName = 'defaultGroup';

function hosts() {
	this.HOSTS = os.platform() == 'win32' ? 'C:/Windows/System32/drivers/etc/hosts': '/etc/hosts';
	this.EOL = os.EOL;
	this.format();
}
/**
{
    log:"",
    disabled: "",
    group1: {
        log:"",
        disabled: "",
        domain1: {
            ip: '',
            disable: '',
            log: ''
        },
        domain2: {
            ip: '',
            disable: '',
            log: ''
        },
    },
    group2: {
    
    }
}
*/
hosts.prototype = {
	constructor: hosts,
	//读取host内容并解析成一个json对象
	get: function() {
		var hostsstr = fs.readFileSync(this.HOSTS, 'utf-8');
		//一个domain 对应一个ip
		//先分组，再去重
		//之后去重
		var lines = hostsstr.split(this.EOL);
		var hostsobject = {};
		var currentName;
        var currentLog = [];
		for (var i = 0; i < lines.length; i++) {
			var line = this._parseLine(lines[i]);
            var type = line.type;
            var val = line.value;
            switch(type){
                case 1:
                    if(!currentName){
                        currentName = defaultName;
                        hostsobject[currentName] = {};
                        hostsobject.log = currentLog.join(this.EOL);
                        currentLog = [];
                    }
                    for(var domain in val){
                        hostsobject[currentName][domain] = val[domain];
                        hostsobject[currentName][domain].log = currentLog.join(this.EOL);
                    }
                    currentLog = [];
                    break;
                case 2:
                    currentLog.push(val);
                    break;
                case 3:
                    currentName = val;
                    hostsobject[currentName] = {
                        log: currentLog.join(this.EOL)
                    };
                    currentLog = [];
                    break;
                default:
                    break;
            }
		}
		return hostsobject;
	},
	//初始化hosts文件,生成默认分组
	format: function() {
		this._batchHost();
	},
    //设置一个domain
	set: function(domain, ip, options) {
        ip = ip || '127.0.0.1';
        options = options || {};
		this._batchHost(function(hostsobject) {
			groupName = options.groupName || defaultName;
			if (!hostsobject[groupName]) hostsobject[groupName] = [];
			var group = hostsobject[groupName];
            group[domain] = {
                ip: ip,
                disabled: !!options.disabled/1,
                log: options.log||''
            };
			if (options.olddomain) {
                delete group[options.olddomain];
			}
			return hostsobject;
		});
	},
	remove: function(domain, groupName) {
		this._batchHost(function(hostsobject) {
			var group = hostsobject[groupName||defaultName];
			if (group && group[domain]) {
                delete group[domain];
			}
			return hostsobject;
		});
	},
	addGroup: function(groupName, log) {
		this._batchHost(function(hostsobject) {
			if (!hostsobject[groupName]) hostsobject[groupName] = {log: log};
			return hostsobject;
		});
	},
	removeGroup: function(groupName) {
		this._batchHost(function(hostsobject) {
			if (hostsobject[groupName]) delete hostsobject[groupName];
			return hostsobject;
		});
	},
	setGroup: function(oldName, newName) {
		this._batchHost(function(hostsobject) {
			if (!hostsobject[newName] && hostsobject[oldName]) {
				hostsobject[newName] = hostsobject[oldName];
				delete hostsobject[oldName];
			}
			return hostsobject;
		});
	},
    //将一条host从一个组移动到另一个组
	move: function(domain, groupName, target_groupName) {
		this._batchHost(function(hostsobject) {
			var group = hostsobject[groupName];
			if (group && group[domain]) {
				var host = group[domain];
                var target_group = hostsobject[target_groupName] || {};
                delete group[domain];
                target_group[domain] = host;
			}
			return hostsobject;
		});
	},
	//注释一个domain
	disable: function(domain, groupName) {
		this.setDomainDisabled(domain, groupName || defaultName, 1);
	},
	//开启一个domain
	active: function(domain, groupName) {
		this.setDomainDisabled(domain, groupName || defaultName, 0);
	},
	setDomainDisabled: function(domain, groupName, disabled) {
		this._batchHost(function(hostsobject) {
			var group = hostsobject[groupName];
			if (group && group[domain]) {
                group[domain].disabled = disabled;
			}
			return hostsobject;
		});
	},
	//注释一个组
	disableGroup: function(groupName) {
		this.setGroupDisabled(groupName, 1);
	},
	//激活一个组
	activeGroup: function(groupName) {
		this.setGroupDisabled(groupName, 2);
	},
	setGroupDisabled: function(groupName, disabled) {
		this._batchHost(function(hostsobject) {
			var group = hostsobject[groupName];
            group ? group.disabled = disabled : '';
			return hostsobject;
		});
	},
    _parseLine: function (line){
        var obj;
        var line = line.trim();
        if(line){
            var isGroupLine = line.match(groupReg);
            obj = {};
            if(isGroupLine){
                obj.type = 3;
                obj.value = isGroupLine[1];
            }else{
                var line2 = line.split(blankReg);
                if(line2.length < 2 || !line2[0].match(/^\d|#[\d]/g)){
                    obj.type = 2;
                    obj.value = line;
                }else{
                    var ip = line2.shift();
                    var domains = line2;
                    var disabled = (/^#/).test(ip);
                    if(disabled){
                        ip = ip.slice(1);
                    }
                    obj.type = 1;
                    obj.value = {};
                    domains.forEach(function (domain){
                        obj.value[domain] = {
                            ip: ip,
                            disabled: disabled/1
                        }
                    });
                }
            }
        }
        return obj;
    },
	_batchHost: function(fn) {
		var hostsobject = this.get();
		hostsobject = fn ? fn(hostsobject) : hostsobject;
		var linesStr = this._hostTostr(hostsobject);
		fs.writeFileSync(this.HOSTS, linesStr);
	},
	_hostTostr: function(hostobj) {
		var lines = [];
        var od = hostobj.disabled/1 || 0 + '';
        hostobj.log ? lines.push(hostobj.log) : '';
        
		for (var i in hostobj) {
            if(i === 'log' || k === 'disabled') continue;
            var group = hostobj[i];
            var gd = group.disabled/1 || 0 + '';
            group.log ? lines.push(group.log) : '';
			lines.push('## @' + i);
            for(var k in group){
                if(k === 'log' || k === 'disabled') continue;
                var host = group[k];
                var hd = od + gd + host.disabled/1 || 0;
                var line = /^000$|2/.test(hd) ? '' : '#';
                host.log ? lines.push(host.log) : '';
                line += host.ip + ' ' + k;
                lines.push(line);
            }
		}
		return lines.join(this.EOL);
	}
};

module.exports = new hosts();

