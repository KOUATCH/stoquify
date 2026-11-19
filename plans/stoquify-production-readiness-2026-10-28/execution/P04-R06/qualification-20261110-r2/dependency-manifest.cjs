// Eight bounded readers. No execution of dependency code and no writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function manifest(directory,label){
 const files=[];function enumerate(dir,prefix=''){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const name=prefix+entry.name;if(name==='.cache'||name.startsWith('.cache/'))continue;const file=path.join(dir,entry.name);assert(!fs.lstatSync(file).isSymbolicLink(),'Dependency links are not admitted');if(entry.isDirectory())enumerate(file,name+'/');else{assert(entry.isFile());files.push({path:name,file});}}}enumerate(directory);
 const result=new Array(files.length);let cursor=0,done=0;await Promise.all(Array.from({length:8},async()=>{while(cursor<files.length){const index=cursor++,row=files[index],stat=await fs.promises.lstat(row.file);assert(stat.isFile()&&!stat.isSymbolicLink());const bytes=await fs.promises.readFile(row.file);result[index]={path:row.path,bytes:bytes.length,sha256:hash(bytes)};if(++done%25000===0)console.log(JSON.stringify({stage:'dependency_hash_progress',label,files:done,total:files.length}));}}));return result;
}
module.exports={manifest,hash};
