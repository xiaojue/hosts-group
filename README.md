hosts-group
===========

以组方式管理hosts文件。

## Usage

```bash
npm install hosts-group
```

```js
var hosts = require('hosts-group');
/**
*@description 设置一个host
*@param domain [String] 域名
        ip  [String] ip
        options [Object]
        {
            groupName: "",//组名，默认defaultGroup
            disabled: true/false,//true-注释 false-启用，默认false
            log: "",//注释，可选
            olddomain: ""//原域名，可选
        }
*/
hosts.set(domain, ip, options);

/**
*@description 删除一个host
*@param domain [String] 域名
        groupName  [String] 组名，默认defaultGroup
*/
hosts.remove(domain, groupName);

/**
*@description 添加一个分组
*@param groupName [String] 组名
        log  [String] 注释，可选
*/
hosts.addGroup(groupName, log);

/**
*@description 设置修改分组名
*@param oldName [String] 组名
        newName [String] 组名
*/
hosts.setGroup(oldName, newName);

/**
*@description 删除一个分组
*@param groupName [String] 组名
*/
hosts.removeGroup(groupName);

/**
*@description 将一个host移动到另一个分组
*@param domain [String] 域名 
        groupName [String] 原组名
        target_groupName [String] 目标组名
*/
hosts.move(domain, groupName, target_groupName);

/**
*@description 注释一个host
*@param domain [String] 域名 
        groupName [String] 组名，默认defaultGroup
*/
hosts.disable(domain, groupName);

/**
*@description 启用一个host
*@param domain [String] 域名
        groupName [String] 组名，默认defaultGroup
*/
hosts.active(domain, groupName);

/**
*@description 注释一个组的host
*@param groupName [String] 组名
*/
hosts.disableGroup(groupName);

/**
*@description 启用一个组的host
*@param groupName [String] 组名
*/
hosts.activeGroup(groupName);

```

## License
MIT license
