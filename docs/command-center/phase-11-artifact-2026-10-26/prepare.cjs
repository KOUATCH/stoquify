// Captures current source into a new owned directory. No DB or application environment access.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),{capture,restore}=require(path.join(root,'scripts/candidate-snapshot.cjs'));
const pointer=path.join(root,'.codex-tmp/command-center-phase11-current.json');
assert.ok(!fs.existsSync(pointer),'Do not overwrite a prior candidate');
const work=path.join(root,'.codex-tmp/phase11-'+crypto.randomBytes(5).toString('hex')),candidate=path.join(work,'candidate');
fs.mkdirSync(work);console.log('Capturing current source for clean dependency reconstruction');
const snapshot=capture(root);restore(snapshot,candidate);
assert.ok(!fs.existsSync(path.join(candidate,'node_modules')));
const lock=JSON.parse(fs.readFileSync(path.join(candidate,'package-lock.json')));
const vendor=[];
for(const [name,p] of Object.entries(lock.packages))if(p.resolved?.startsWith('file:')){
 const relative=p.resolved.slice(5);assert.match(relative,/^vendor\/[A-Za-z0-9._-]+\.tgz$/);
 const [algorithm,digest]=p.integrity.split('-');assert.equal(crypto.createHash(algorithm).update(fs.readFileSync(path.join(candidate,relative))).digest('base64'),digest);
 vendor.push({name,path:relative,integrityVerified:true});
}
const cleanConfig=path.join(work,'empty-npmrc');fs.writeFileSync(cleanConfig,'');
const state={work,candidate,cache:path.join(work,'npm-cache'),cleanConfig,createdAt:new Date().toISOString()};
fs.writeFileSync(pointer,JSON.stringify(state,null,2));
fs.writeFileSync(path.join(__dirname,'source-baseline.json'),JSON.stringify({...snapshot,files:snapshot.files.map(({content,...f})=>f)},null,2));
fs.writeFileSync(path.join(__dirname,'prepare-results.json'),JSON.stringify({passed:true,files:snapshot.files.length,head:snapshot.head,cleanDependencyDirectory:true,vendor,productionAccess:false,environmentFilesCopied:false},null,2));
console.log(JSON.stringify({files:snapshot.files.length,candidate,vendorVerified:vendor.length}));
