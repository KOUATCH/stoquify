const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const prior={'messages/en.json':'4a9b6ea9c1553f92e8d5de7a732a52c33bb86372177cfcabc664b7d4c312dadc','messages/fr.json':'b75d829b739370f9d7ea7e43d7ec1c54b8a5214e6e538bc91ed11ada33154dd7'};
const rows=[];
for(const [file,expected] of Object.entries(prior)){
 const raw=fs.readFileSync(path.join(root,file),'utf8'),match=raw.match(/  "moduleComposition": \{\r?\n(    "experience": \{\r?\n(?:      "[^\r\n]*\r?\n)+    \},\r?\n)/);
 assert.ok(match);assert.equal(sha(raw.replace(match[1],'')),expected,'Other dictionary bytes changed: '+file);
 rows.push({file,currentSha256:sha(raw),sectionSha256:sha(match[1]),predecessorWithoutSection:expected,section:JSON.parse(raw).moduleComposition.experience});
}
const receipt={at:new Date().toISOString(),scope:'Reviewed independent moduleComposition.experience copy only; exact removal reconstructs the earlier complete dictionary bytes. No Cash Command, password or reconciliation namespaces changed.',rows};
fs.writeFileSync(path.join(__dirname,'evidence/independent-module-copy-revision-2026-09-27.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
const file=path.join(__dirname,'reviewed-independent-module-copy.cjs'),original=fs.readFileSync(file,'utf8');
let output=original.replace("  assert.equal(crypto.createHash('sha256').update(match[1]).digest('hex'), accepted[file], 'Unreviewed independent module copy: ' + file);",`  const revised = ${JSON.stringify(Object.fromEntries(rows.map(row=>[row.file,row.sectionSha256])))};
  const observed = crypto.createHash('sha256').update(match[1]).digest('hex');
  assert.ok(observed === accepted[file] || observed === revised[file], 'Unreviewed independent module copy: ' + file);`);
assert.notEqual(output,original);const pending=file+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,output,{flag:'wx'});fs.renameSync(pending,file);
console.log(JSON.stringify(rows.map(({file,sectionSha256})=>({file,sectionSha256}))));
