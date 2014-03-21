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

function hosts() {
	/*
	 * hosts object
	 * {
	 *   groupName:[
	 *		{
	 *			"localhost":{
	 *				ip:"127.0.0.1",
	 *				disabled:false
	 *			}
	 *		}
	 *   ]
	 * }
	 * */

	/*
	 * hosts format
	 *
	 * ## @groupName
	 * 127.0.0.1 localhost
	 * */
	this.HOSTS = os.platform() == 'win32' ? 'C:/Windows/System32/drivers/etc/hosts': '/etc/hosts';
	this.EOL = os.EOL;
	this.hostsobject = this.format();
}

hosts.prototype = {
	constructor: hosts,
	//返回所有的group object
	get: function() {

	},
	//设置一个domain
	set: function(domain, ip) {

	},
	//注释一个domain
	disable: function(domain, ip) {

	},
	//注释一个组
	disableGroup: function(groupName) {

	},
	//激活一个组
	activeGroup: function(groupName) {

	},
	//返回一个组的group object
	getGroup: function(groupName) {

	},
	//修改一个组的object
	setGroup: function(groupName, hosts) {

	},
	//初始化hosts文件,生成默认分组
	format: function() {
		var hostsstr = fs.readFileSync(this.HOSTS, 'utf-8');
		//一个domain 对应一个ip
		//先分组，再去重
		//之后去重
		var lines = hostsstr.split(this.EOL);
		var hostsobject = {};
		var currentName;
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			var nextline = lines[i + 1];
			var isGroupLine = line.match(groupReg);
			var nextIsGroupLine = nextline ? nextline.match(groupReg) : null;
			if (isGroupLine && ! currentName) {
				currentName = isGroupLine[1];
			} else if (nextIsGroupLine) {
				currentName = undefined;
			} else {
				if (!this.isHostLine(line)) continue;
				if (!currentName) currentName = 'defaultGroup';
				this.addHosts(currentName, hostsobject, this.formatLine(line));
			}
		}
		var linesStr = this.hostTostr(hostsobject);
		fs.writeFileSync(this.HOSTS,linesStr);
		return hostsobject;
	},
	hostTostr: function(hostobj) {
		var lines = [];
		for (var i in hostobj) {
			lines.push('## @' + i);
			hostobj[i].forEach(function(host) {
				var line = '';
				if (host.disabled) line += '#';
				line += host.ip + ' ' + host.domain;
				lines.push(line);
			});
		}
		return lines.join(this.EOL);
	},
	addHosts: function(name, group, line) {
		if (!group[name]) group[name] = [];
		for (var i in line) {
			line[i]['domain'] = i;
			group[name].push(line[i]);
		}
	},
	isHostLine: function(line) {
		if (line.trim() === '') return false;
		line = line.split(blankReg);
		if (line.length < 2 || ! line[0].match(/^\d|#[\d]/g)) return false;
		return true;
	},
	formatLine: function(line) {
		line = line.split(blankReg);
		var hostline = {},
		ip = line.shift(),
		domains = line,
		disabled = (/^#/).test(ip);
		if (disabled) ip = ip.slice(1);
		domains.forEach(function(domain) {
			hostline[domain] = {
				ip: ip,
				disabled: disabled
			};
		});
		return hostline;
	}
};

var test = new hosts();

