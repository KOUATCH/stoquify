const fs=require('node:fs'),path=require('node:path');
const root=process.cwd(), dist='.next-landing-release-20261025';
const build=path.join(root,dist), target=path.join(build,'standalone');
if(!fs.existsSync(path.join(build,'BUILD_ID'))||!fs.existsSync(path.join(target,'server.js')))throw Error('Complete standalone build required');
for(const [source,destination] of [[path.join(root,'public'),path.join(target,'public')],[path.join(build,'static'),path.join(target,dist,'static')]]){
 const relative=path.relative(build,destination);
 if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Preview destination escaped build output');
 fs.cpSync(source,destination,{recursive:true});
}
console.log(JSON.stringify({buildId:fs.readFileSync(path.join(build,'BUILD_ID'),'utf8').trim(),server:path.join(target,'server.js'),assetsCopied:true}));
