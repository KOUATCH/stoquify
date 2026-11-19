// Reviewed concurrent change: only another development output's type include was added.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),crypto=require('crypto');
const base=__dirname,file=path.join(base,'runtime-files/tsconfig.json'),current=JSON.parse(fs.readFileSync('tsconfig.json')),runtime=JSON.parse(fs.readFileSync(file));
const own='.next-hris-browser/types/**/*.ts',other='.next-public-performance-20261028/types/**/*.ts';
assert.ok(current.include.includes(other));const without=(v,remove)=>({...v,include:v.include.filter(x=>!remove.includes(x))});assert.deepEqual(without(current,[other]),without(runtime,[own]));
fs.writeFileSync(path.join(base,'configuration-change.json'),JSON.stringify({reviewedChange:'Added unrelated public-performance generated-type include only; compilerOptions and exclusions unchanged',added:other,previousRuntime:runtime,currentRoot:current},null,2));
fs.writeFileSync(file,JSON.stringify({...current,include:[...current.include,own]},null,2)+'\n');
const p=JSON.parse(fs.readFileSync(path.join(base,'runtime-provenance.json')));p.configurationHashes['tsconfig.json']=crypto.createHash('sha256').update(fs.readFileSync('tsconfig.json')).digest('hex');fs.writeFileSync(path.join(base,'runtime-provenance.json'),JSON.stringify(p,null,2));
console.log('Inspected include-only concurrent configuration change adopted in isolated runtime');
