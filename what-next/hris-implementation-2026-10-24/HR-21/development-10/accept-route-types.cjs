// Same reviewed concurrent development output changes Next's generated route-type reference.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict'),base=__dirname;
const current=fs.readFileSync('next-env.d.ts','utf8'),runtime=fs.readFileSync(path.join(base,'runtime-files/next-env.d.ts'),'utf8');
assert.equal(current.replaceAll('.next-public-performance-20261028','.next-hris-browser').replaceAll('\r\n','\n'),runtime.replaceAll('\r\n','\n'));
fs.writeFileSync(path.join(base,'route-types-change.json'),JSON.stringify({reviewedChange:'Only generated Next route-type output reference differs; runtime keeps its isolated output reference.',currentRoot:current,isolatedRuntime:runtime},null,2));
const p=JSON.parse(fs.readFileSync(path.join(base,'runtime-provenance.json')));p.configurationHashes['next-env.d.ts']=crypto.createHash('sha256').update(fs.readFileSync('next-env.d.ts')).digest('hex');fs.writeFileSync(path.join(base,'runtime-provenance.json'),JSON.stringify(p,null,2));
