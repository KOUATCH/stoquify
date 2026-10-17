const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),docs=path.join(root,'docs/moat/roadmap'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const pairs=fs.readdirSync(docs).filter(name=>name.endsWith('.md')).map(name=>{
 const pdf=name.slice(0,-3)+'.pdf',content=fs.readFileSync(path.join(docs,pdf));assert.ok(content.length>0);assert.equal(content.subarray(0,5).toString(),'%PDF-');
 return {markdown:name,pdf,pdfBytes:content.length,markdownSha256:hash(fs.readFileSync(path.join(docs,name))),pdfSha256:hash(content)};
});
assert.equal(pairs.length,7);assert.ok(!fs.readdirSync(docs).some(name=>name.endsWith('.html')));
const final=JSON.parse(fs.readFileSync(path.join(__dirname,'source-final.json'),'utf8'));
for(const [file,digest] of Object.entries(final.sources))assert.equal(hash(fs.readFileSync(path.join(root,file))),digest,'Final source drift: '+file);
fs.writeFileSync(path.join(__dirname,'publication-manifest.json'),JSON.stringify({at:new Date().toISOString(),publisher:'docs-report-publisher',publisherExitCode:0,destination:'docs/moat/roadmap',pairs,noIntermediateHtml:true,sourceDrift:false},null,2));
fs.writeFileSync(path.join(__dirname,'git-status-after.txt'),execFileSync('git',['status','--short'],{cwd:root,windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
console.log(JSON.stringify({reportPairs:pairs.length,nonemptyPDFs:true,sourceDrift:false}));
