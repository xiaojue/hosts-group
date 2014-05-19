/**
 * @author xiaojue
 * @email designsor@gmail.com
 * @fileoverview hosts-group
 */
var fs = require('fs');
var os = require('os');
var util = require('util');

var HOSTS = os.platform() == 'win32' ? 'C:/Windows/System32/drivers/etc/hosts': '/etc/hosts';
var EOL = os.EOL;
var groupReg = /^## @(.*?)$/;
var blankReg = /\s+/;
var notes = {};

function hosts(defaultName) {
	this.defaultName = defaultName || 'defaultGroup';
	this.format();
}
/**
notes 
{
    group1: '',
    ...
}

hosts
{
    group1: [
        {
            ip:'',
            domain: '',
            disabled: '',
            note:''
        },
        {
            
        }
    ],
    group2: [
    
    ]
}
*/
hosts.prototype = {
	constructor: hosts,
	//新增方法，避免互斥，修改domain之前，先把所有domain都禁用
	_disableAllDomain:function(domain,hostsobject){
		for(var group in hostsobject){
			var hosts = hostsobject[group];
			for(var i=0;i<hosts.length;i++){
				var host = hosts[i];
				if(domain == host.domain) host.disabled = true;
			}
		}
		return hostsobject;
	},
	//读取host内容并解析成一个json对象
	get: function() {
		var hostsstr = fs.readFileSync(HOSTS, 'utf-8');
		//一个domain 对应一个ip
		//先分组，再去重
		//之后去重
		var lines = hostsstr.split(EOL);
		var hostsobject = {};
		var currentName;
		var currentLog = [];
		var uniq = {};
		notes = {};
		for (var i = 0; i < lines.length; i++) {
			var line = this._parseLine(lines[i]);
			if (!line) continue;
			var type = line.type;
			var val = line.value;
			switch (type) {
			case 1:
				if (!currentName) {
					currentName = this.defaultName;
					hostsobject[currentName] = [];
					if (currentLog.length > 0) {
						notes[currentName] = currentLog.join(EOL);
						currentLog = [];
					}
				}
				val.forEach(function(item) {
					var _item = uniq[currentName + item.domain + item.ip];
					if (!_item) {
						hostsobject[currentName].push(item);
						_item = uniq[currentName + item.domain + item.ip] = item;
					}
					if (currentLog.length > 0) {
						_item.note = (_item.note ? (_item.note + EOL) : '') + currentLog.join(EOL);
					}

				});
				currentLog = [];
				break;
			case 2:
				currentLog.push(val);
				break;
			case 3:
				currentName = val;
				hostsobject[currentName] = [];
				if (currentLog.length > 0) {
					notes[currentName] = currentLog.join(EOL);
					currentLog = [];
				}
				break;
			default:
				break;
			}
		}
		if (currentLog.length > 0) {
			notes.bottom = currentLog.join(EOL);
			currentLog = [];
		}
		return hostsobject;
	},
	//初始化hosts文件,生成默认分组
	format: function() {
		this._batchHost();
	},
	//设置一个domain
	set: function(domain, ip, options) {
		var self = this;
		var defaultName = this.defaultName;
		var updateHost = function(host) {
			host.domain = domain;
			host.ip = ip;
			typeof options.disabled !== 'undefined' ? host.disabled = options.disabled: '';
			typeof options.note !== 'undefined' ? host.note = options.note: '';
		};
		ip = ip || '127.0.0.1';
		options = options || {};
		this._batchHost(function(hostsobject) {
			groupName = options.groupName || defaultName;
			var group = hostsobject[groupName] = hostsobject[groupName] || [];
			for (var i = 0; i < group.length; i++) {
				var host = group[i];
				if ((host.domain === domain && host.ip === ip) || (host.domain === options.olddomain && host.ip === options.oldip)) {
					if(!options.disabled) self._disableAllDomain(domain,hostsobject);
					updateHost(host);
					return hostsobject;
				}
			}
			group.push({
				ip: ip,
				domain: domain,
				disabled: !! options.disabled,
				note: options.note || ''
			});
			return hostsobject;
		});
	},
	//删除一个host
	remove: function(domain, ip, groupName) {
		groupName = groupName || this.defaultName;
		this._batchHost(function(hostsobject) {
			var group = hostsobject[groupName];
			if (group) {
				var _group = [];
				for (var i = 0; i < group.length; i++) {
					var host = group[i];
					if (host.domain === domain && host.ip === ip) continue;
					_group.push(host);
				}
				if (_group.length === group.length) return false;
				hostsobject[groupName] = _group;
				return hostsobject;
			}
		});
	},
	//添加分组
	addGroup: function(groupName, log) {
		if (log) {
			notes[groupName] = log;
		}
		this._batchHost(function(hostsobject) {
			if (hostsobject[groupName]) return false;
			hostsobject[groupName] = [];
			return hostsobject;
		});
	},
	//删除分组
	removeGroup: function(groupName) {
		this._batchHost(function(hostsobject) {
			if (hostsobject[groupName]) {
				delete hostsobject[groupName];
				return hostsobject;
			}
		});
	},
	//修改分组名
	setGroup: function(oldName, newName) {
		this._batchHost(function(hostsobject) {
			if (hostsobject[oldName] && ! hostsobject[newName]) {
				hostsobject[newName] = hostsobject[oldName];
				delete hostsobject[oldName];
				return hostsobject;
			}
		});
	},
	//将一条host从一个组移动到另一个组
	move: function(domain, ip, groupName, target_groupName) {
		this._batchHost(function(hostsobject) {
			var group = hostsobject[groupName];
			var t_group = hostsobject[target_groupName] = hostsobject[target_groupName] || [];
			if (group) {
				var host, move, i;
				//目标分组里是否存在该条host，若存在则不作处理。
				for (i = 0; i < t_group.length; i++) {
					host = t_group[i];
					if (host.domain === domain && host.ip === ip) {
						return false;
					}
				}
				for (i = 0; i < group.length; i++) {
					host = group[i];
					if (host.domain === domain && host.ip === ip) {
						t_group.push(host);
						group.splice(i, 1);
						break;
					}
				}
				return hostsobject;
			}
		});
	},
	//注释一个domain
	disable: function(domain, ip, groupName) {
		this.setDomainDisabled(domain, ip, groupName || defaultName, 1);
	},
	//开启一个domain
	active: function(domain, ip, groupName) {
		this.setDomainDisabled(domain, ip, groupName || defaultName, 0);
	},
	setDomainDisabled: function(domain, ip, groupName, disabled) {
		var self = this;
		this._batchHost(function(hostsobject) {
			if(!disabled) self._disableAllDomain(domain,hostsobject);
			var group = hostsobject[groupName];
			if (group) {
				for (var i = 0; i < group.length; i++) {
					var host = group[i];
					if (host.domain === domain && host.ip === ip) {
						if (host.disabled == disabled) {
							return false;
						}
						host.disabled = disabled;
						return hostsobject;
					}
				}
			}
			return false;
		});
	},
	//注释一个组
	disableGroup: function(groupName) {
		this.setGroupDisabled(groupName, 1);
	},
	//激活一个组
	activeGroup: function(groupName) {
		this.setGroupDisabled(groupName, 0);
	},
	setGroupDisabled: function(groupName, disabled) {
		var self = this;
		this._batchHost(function(hostsobject) {
			var group = hostsobject[groupName];
			if (group) {
				for (var i = 0; i < group.length; i++) {
					var host = group[i];
					if(!disabled) self._disableAllDomain(host.domain,hostsobject);
					host.disabled = disabled;
				}
				return hostsobject;
			}
		});
	},
	_parseLine: function(line) {
		var obj;
		line = line.trim();
		if (line) {
			var isGroupLine = line.match(groupReg);
			obj = {};
			if (isGroupLine) {
				obj.type = 3;
				obj.value = isGroupLine[1];
			} else {
				var line2 = line.split(blankReg);
				if (line2.length < 2 || ! line2[0].match(/^\d|#[\d]/g)) {
					obj.type = 2;
					obj.value = line;
				} else {
					var ip = line2.shift();
					var domains = line2;
					var disabled = (/^#/).test(ip);
					if (disabled) {
						ip = ip.slice(1);
					}
					obj.type = 1;
					obj.value = [];
					domains.forEach(function(domain) {
						obj.value.push({
							ip: ip,
							domain: domain,
							disabled: disabled
						});
					});
				}
			}
		}
		return obj;
	},
	_batchHost: function(fn) {
		var hostsobject = this.get();
		hostsobject = fn ? fn(hostsobject) : hostsobject;
		if (!hostsobject) return;
		var linesStr = this._hostTostr(hostsobject);
		fs.writeFileSync(HOSTS, linesStr);
	},
	_hostTostr: function(hostobj) {
		var lines = [];
		for (var i in hostobj) {
			var group = hostobj[i];
			notes[i] ? lines.push(notes[i]) : '';
			lines.push('## @' + i);
			for (var k = 0; k < group.length; k++) {
				var host = group[k];
				var line = host.disabled ? "#": '';
				host.note ? lines.push(host.note) : '';
				line += host.ip + ' ' + host.domain;
				lines.push(line);
			}
			lines.push("");
		}
		notes.bottom ? lines.push(notes.bottom) : '';
		return lines.join(EOL);
	}
};

module.exports = new hosts();

