const fs=require('node:fs'),path=require('node:path');
const root=process.cwd(),name='.next-public-performance-20261028',build=path.join(root,name),target=path.join(build,'standalone');
if(!fs.existsSync(path.join(build,'BUILD_ID'))||!fs.existsSync(path.join(target,'server.js')))throw Error('Complete build required');
for(const [from,to] of [[path.join(root,'public'),path.join(target,'public')],[path.join(build,'static'),path.join(target,name,'static')]]){const relative=path.relative(build,to);if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Destination escaped owned build');fs.cpSync(from,to,{recursive:true});}
console.log(JSON.stringify({buildId:fs.readFileSync(path.join(build,'BUILD_ID'),'utf8').trim(),assetsCopied:true}));
