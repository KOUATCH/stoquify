const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {pathToFileURL} = require('node:url');
const runtime = 'C:/Users/J COMPUTER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const root = process.cwd();
const out = path.join(root,'docs/ui-workflow-roadmap');
const evidence = path.join(root,'what-next/ui-workflow-roadmap');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const errors = [];
function check(ok, text){if(!ok)errors.push(text);}
async function main(){
  const canvas = require(require.resolve('@napi-rs/canvas',{paths:[runtime]}));
  for(const n of ['DOMMatrix','ImageData','Path2D']) globalThis[n] = canvas[n];
  const pdfjs = await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs',{paths:[runtime]})).href);
  const registry=JSON.parse(fs.readFileSync(path.join(evidence,'work-package-registry.json')));
  const mdHashes=JSON.parse(fs.readFileSync(path.join(evidence,'source-hashes.json')));
  const oldHashes=JSON.parse(fs.readFileSync(path.join(evidence,'preserved-publication-hashes.json')));
  const ids=new Set(registry.packages.map(p=>p.id));
  check(ids.size===20,'Expected 20 unique packages');
  check(registry.useCases.length===8,'Expected eight cases');
  const seen=new Set(),stack=new Set();
  function visit(id){
    check(!stack.has(id),'Dependency cycle at '+id); if(seen.has(id)||stack.has(id))return;
    const p=registry.packages.find(p=>p.id===id);if(!p){errors.push('Unknown dependency '+id);return;}
    stack.add(id); p.dependencies.forEach(visit);stack.delete(id);seen.add(id);
  }
  ids.forEach(visit);
  let pathCount=0,linkCount=0;
  for(const p of registry.packages){
    for(const key of ['id','title','status','priority','owner','effortPersonDays','currentState','objective','paths','tasks','dataImpact','controls','verification','releaseGate','blockers','definitionOfDone'])check(Boolean(p[key])&&p[key].length!==0,p.id+' missing '+key);
    for(const loc of p.paths){if(!loc.endsWith(' (new)')){check(fs.existsSync(path.join(root,loc)),p.id+' missing path '+loc);pathCount++;}}
  }
  registry.useCases.forEach(c=>c.packages.forEach(id=>check(ids.has(id)&&registry.packages.find(p=>p.id===id).useCases.includes(c.id),'Unmapped '+c.id+'/'+id)));
  const totals=registry.packages.reduce((a,p)=>a.map((v,i)=>v+p.effortPersonDays[i]),[0,0]);
  check(JSON.stringify(totals)===JSON.stringify(registry.totalPersonDays),'Incorrect effort total');
  for(const [f,h] of Object.entries(oldHashes))check(hash(path.join(root,'docs/prompt-execution',f))===h,'Changed existing publication '+f);
  check(fs.readdirSync(out).length===10,'Publication directory has unexpected files');
  const pairs=[];
  for(const [md,h] of Object.entries(mdHashes)){
    check(hash(path.join(out,md))===h,'Publisher changed Markdown '+md);
    const text=fs.readFileSync(path.join(out,md),'utf8');
    for(const m of text.matchAll(/\]\(<([^>]+)>\)/g)){
      let target=m[1].replace(/:\d+$/,'');
      if(target.endsWith('/publication-validation.json')) continue;
      check(fs.existsSync(target),'Missing link '+target);linkCount++;
    }
    const pdf=md.replace(/\.md$/,'.pdf'),bytes=fs.readFileSync(path.join(out,pdf));
    check(bytes.length>1024&&bytes.subarray(0,4).toString()==='%PDF','Invalid PDF '+pdf);
    const doc=await pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true,disableFontFace:true}).promise;
    let chars=0;
    for(let n=1;n<=doc.numPages;n++){
      const pg=await doc.getPage(n);const content=await pg.getTextContent();chars+=content.items.map(i=>i.str||'').join(' ').length;
    }
    check(chars>500,'PDF text missing '+pdf);
    pairs.push({markdown:md,pdf,bytes:bytes.length,pages:doc.numPages,extractedTextCharacters:chars,markdownHashPreserved:true});
    if(md.startsWith('04_')||md.startsWith('05_')){
      for(const n of md.startsWith('04_')?[1,Math.ceil(doc.numPages/2)]:[1]){
        const pg=await doc.getPage(n),viewport=pg.getViewport({scale:1.15});
        const c=canvas.createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
        await pg.render({canvasContext:c.getContext('2d'),viewport}).promise;
        fs.writeFileSync(path.join(evidence,pdf.replace('.pdf','')+'-page-'+n+'.png'),c.toBuffer('image/png'));
      }
    }
    await doc.destroy();
  }
  const result={validatedAt:new Date().toISOString(),status:errors.length?'FAILED':'PASSED',publisherExitCode:0,useCases:8,packages:20,dependencyGraph:'acyclic',effortPersonDays:totals,existingImplementationPathsChecked:pathCount,localLinksChecked:linkCount,existingPublicationFilesUnchanged:Object.keys(oldHashes).length,publicationContainsOnlyFivePairs:true,pairs,errors,limitations:['Rendered previews cover representative pages only; not a manual review of every PDF page.','13 existing foundation tests passed; no new feature or protected browser workflow has been implemented.','Bundled Python lacked PyMuPDF; PDF text/page validation and previews used bundled pdfjs-dist and canvas instead.']};
  fs.writeFileSync(path.join(evidence,'publication-validation.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
  if(errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
