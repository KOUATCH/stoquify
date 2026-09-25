const fs=require('fs'),path=require('path');let code=fs.readFileSync(path.join(__dirname,'verify-purchase-approval-fiber.cjs'),'utf8');
code=code.replace('window.__ownedId=0;', 'window.__ownedId=0;window.__ownedFibers=new WeakMap();window.__ownedFiberId=0;');
code=code.replace('result.push({tag:node.tag,key:node.key,', 'let mount=window.__ownedFibers.get(node)||window.__ownedFibers.get(node.alternate);if(!mount)mount=++window.__ownedFiberId;window.__ownedFibers.set(node,mount);if(node.alternate)window.__ownedFibers.set(node.alternate,mount);result.push({mount,index:node.index,tag:node.tag,key:node.key,');
code=code.replace("await ready();await shot('register-review');", "await shot('register-review');");
code=code.replace('setTimeout(resolve,2500)', 'setTimeout(resolve,5500)');
code=code.replace("file='purchase-approval-fiber-probe-'", "file='purchase-approval-mount-probe-'");
fs.writeFileSync(path.join(__dirname,'verify-purchase-approval-mount.cjs'),code,{flag:'wx'});console.log('Prepared mount identity and sibling-position diagnosis.');
