// Preparation only. Copy unchanged reviewed helpers into a new packet; no application execution.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const prior=path.resolve(__dirname,'../qualification-20261110-r2');
function copy(name,transform=value=>value){const target=path.join(__dirname,name);assert(!fs.existsSync(target));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,transform(fs.readFileSync(path.join(prior,name),'utf8')),{flag:'wx'});}
for(const name of ['dependency-manifest.cjs','check-resources.cjs','environment-guard.cjs','verify-generated-schema.cjs'])copy(name);
copy('resource-snapshot.ps1',value=>value.replaceAll('20261110-r2','20261110-r3').replace('@(55516,55517,3296,3297,3298,3299)','@(55516,55517,55518,3296,3297,3298,3299)'));
fs.mkdirSync(path.join(__dirname,'database'),{recursive:true});fs.mkdirSync(path.join(__dirname,'runtime'),{recursive:true});fs.mkdirSync(path.join(__dirname,'browser'),{recursive:true});
for(const name of ['database/fixture-definition.cjs','database/read-authority-utc.cjs','database/fixture-control.cjs','database/login-fixture-control.cjs','database/direct-api-child.cjs','runtime/run-protected-core.cjs','runtime/run-credential-probes.cjs','runtime/run-origin-probes.cjs','runtime/run-retained-expiry.cjs','runtime/run-expanded.cjs','runtime/qualification-contract.json'])copy(name);
const admission=JSON.parse(fs.readFileSync(path.join(prior,'independent-review/BROWSER-OBSERVER-RECIPE-ADMISSION-r3.json')));const selected=admission.files.map(row=>path.relative(prior,row.path).replaceAll('\\','/')).filter(name=>name.startsWith('browser/')&&name.endsWith('.cjs'));assert(selected.length>0);for(const name of selected)copy(name);
console.log(JSON.stringify({helpersCopied:true,browserSources:selected}));
