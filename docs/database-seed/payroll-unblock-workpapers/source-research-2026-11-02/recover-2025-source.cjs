// Bounded official-site recovery only; failures are retained as provenance, never as statutes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const queries = [
 ['DGI-search-2025-page2.html','https://www.impots.cm/index.php/fr/search/node?keys=2025&page=1'],
 ['DGI-search-2025-page3.html','https://www.impots.cm/index.php/fr/search/node?keys=2025&page=2'],
 ['DGI-CGI2025-current-menu-target.html','https://www.impots.cm/node/e7bedcf3-f8a7-4c9d-954a-96d1a8368f8a'],
 ['DGI-CGI2025-original-target.html','https://www.impots.cm/fr/code-general-des-impots-mis-jour-au-1er-janvier-2025'],
];
async function main(){
 const results=[];
 for(const [file,url] of queries){
  const entry={file,url,retrievedAt:new Date().toISOString()};
  try{
   const r=await fetch(url,{signal:AbortSignal.timeout(45000)});
   if(!['impots.cm','www.impots.cm'].includes(new URL(r.url).hostname))throw new Error('UNEXPECTED_REDIRECT_HOST');
   const b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(path.join(__dirname,file),b);
   Object.assign(entry,{httpStatus:r.status,resolvedUrl:r.url,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex'),contentType:r.headers.get('content-type')});
   entry.relevantLinks=[...b.toString('utf8').matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
    .map(m=>({url:m[1],label:m[2].replace(/<[^>]*>/g,'').trim()})).filter(x=>/2025|CGI|code general|code général/i.test(x.label)&&x.label.length<300);
  }catch(e){entry.error=e.message;}
  results.push(entry);console.log(JSON.stringify(entry));
 }
 fs.writeFileSync(path.join(__dirname,'cgi-2025-recovery-attempts.json'),JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),classification:'RECOVERY_EVIDENCE_NOT_STATUTORY_APPROVAL',results},null,2)+'\n');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
