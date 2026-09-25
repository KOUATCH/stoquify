const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const root=process.cwd(),docs=path.join(root,'docs/accounting'),ev=path.join(__dirname,'evidence');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const pairs=fs.readdirSync(docs).filter(n=>n.endsWith('.md')).sort().map(name=>{
 const md=path.join(docs,name),pdf=path.join(docs,name.slice(0,-3)+'.pdf'),bytes=fs.readFileSync(pdf);
 if(bytes.length<1024||bytes.subarray(0,5).toString('ascii')!=='%PDF-')throw Error('Invalid PDF '+pdf);
 const info=cp.execFileSync('pdfinfo',[pdf],{encoding:'utf8',windowsHide:true});
 const text=cp.execFileSync('C:/Users/J COMPUTER/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',['-c','import sys; from pypdf import PdfReader; print("\\n".join(page.extract_text() or "" for page in PdfReader(sys.argv[1]).pages))',pdf],{encoding:'utf8',windowsHide:true,maxBuffer:10*1024*1024,env:{...process.env,PYTHONIOENCODING:'utf-8'}});
 const pages=Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
 if(!pages||text.trim().length<150)throw Error('PDF text missing '+pdf);
 return {markdown:name,pdf:path.basename(pdf),markdownSha256:hash(md),pdfSha256:hash(pdf),markdownBytes:fs.statSync(md).size,pdfBytes:bytes.length,pages,extractedTextCharacters:text.length};
});
const source='C:/Users/J COMPUTER/.codex/attachments/6472c576-694f-42c2-8aee-dab43eadb541/pasted-text.txt';
const promptPreserved=hash(source)===hash(path.join(docs,'accounting-audit-execution-prompt-2026-09-08.md'));
const preservedReports=['ledger-close-truth-gate','statutory-integration-gate','audit-report','architecture-and-flow-map','risk-register','remediation-plan','evidence-index'].map(n=>({name:n,identical:hash(path.join(docs,n+'.md'))===hash(path.join(__dirname,n+'.md'))}));
if(!promptPreserved||preservedReports.some(r=>!r.identical))throw Error('Preservation validation failed');
const manifest={generatedAt:new Date().toISOString(),publisher:'.agents/skills/docs-report-publisher/scripts/publish_reports.mjs accounting',publisherExitCode:JSON.parse(fs.readFileSync(path.join(ev,'publish-reports-command.json'),'utf8')).exitCode,destination:docs,reportPairs:pairs.length,pairs,promptPreserved,preservedReports,visualReview:{scope:'Sampled PDF pages visually inspected; all PDFs structurally validated and text extracted',samples:['audit-report-page-1.png','risk-register-page-2.png','architecture-page-2.png'],result:'Legible text, complete table columns, repeated headers and page numbering; no clipping observed in sampled pages'},limitations:['Mermaid source is preserved in Markdown and printed as source in PDF; accompanying prose/tables provide the printable interpretation.','Publication validates artifact integrity, not accounting correctness or production readiness.']};
const destination=path.join(docs,'publication-manifest.json');fs.writeFileSync(destination,JSON.stringify(manifest,null,2)+'\n');
const missing=[];
for(const pair of pairs){const md=fs.readFileSync(path.join(docs,pair.markdown),'utf8');for(const match of md.matchAll(/\]\(<([^>]+)>\)/g)){const target=match[1].replace(/:\d+$/,'');if(/^[A-Za-z]:[\\/]/.test(target)&&!fs.existsSync(target))missing.push({document:pair.markdown,target});}}
if(missing.length)throw Error('Missing local links: '+JSON.stringify(missing));
manifest.localLinksValidated=true;fs.writeFileSync(destination,JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(path.join(ev,'publication-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({reportPairs:pairs.length,promptPreserved,localLinksValidated:true,publisherExitCode:manifest.publisherExitCode,pages:pairs.map(p=>({name:p.pdf,pages:p.pages,bytes:p.pdfBytes})),totalPages:pairs.reduce((n,p)=>n+p.pages,0)},null,2));
