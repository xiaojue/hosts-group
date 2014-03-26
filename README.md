hosts-group
===========

Management your hosts with group

## Usage

```js
var hosts = require('hosts-group');

hosts.get(); //format hosts file and putout hosts object
/**
 * { defaultGroup: 
 *  [ { ip: '1.1.1.1',
 *      disabled: false,
 *      domain: 'a.com' },
 *    { ip: '2.2.2.2',
 *      disabled: false,
 *      domain: 'b.com' },
 *    { ip: '3.3.3.3',
 *      disabled: false,
 *      domain: 'd.com' },
 *    { ip: '4.4.4.4',
 *      disabled: false,
 *      domain: 'c.com' },
 *    { ip: '0.0.0.2',
 *      disabled: false,
 *      domain: 'www.a.com' } ],
 * test2: 
 *  [ { ip: '127.0.0.1',
 *      disabled: false,
 *      domain: 'test.com' } ] } 
 */

hosts.set(domain, ip, groupName);
hosts.addGroup(groupName);
hosts.removeGroup(groupName);
hosts.move(domain, ip, groupName, target_groupName);
hosts.remove(domain, ip, groupName);
hosts.disable(domain, ip, groupName);
hosts.active(domain, ip, groupName);
hosts.disableGroup(groupName);
hosts.activeGroup(groupName);

```

## License
MIT license
