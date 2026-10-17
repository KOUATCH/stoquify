const fs=require('node:fs'),path=require('node:path');let source=fs.readFileSync(path.join(__dirname,'verify-cash-proof-browser.cjs'),'utf8');
source=source.replaceAll('cash-proof-state-','proof-portal-');
source=source.replace("const hashes=", "files.push('components/evidence/ProofTrailDrawer.tsx','components/bi/BIProofDrawerHost.tsx','components/ui/sheet.tsx','app/globals.css');\nconst hashes=");
source=source.replace("for(const locale of ['en','fr'])", "for(const [locale,width] of [['en',1440],['fr',1440],['en',768],['fr',768],['en',320],['fr',320]])");
source=source.replace("width:locale==='fr'?320:1440", 'width');
source=source.replace("{name:'Evidence Nodes'}", "{name:locale==='fr'?'Éléments de preuve':'Evidence Nodes'}");
source=source.replace("const screenshot='proof-portal-'+stamp+'-'+locale+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true,animations:'disabled'});",()=>`
  result.stage=locale+' '+width+' visual and keyboard';
  const visual=await dialog.evaluate(panel=>{
   const color=value=>{const a=value.match(/[\\d.]+/g)?.map(Number);if(!a||a.length<3)throw Error('Unresolved CSS color '+value);return [a[0],a[1],a[2],a[3]??1]};
   const blend=(fg,bg)=>[0,1,2].map(i=>fg[i]*fg[3]+bg[i]*(1-fg[3])).concat(1);
   const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
   const rootStyle=getComputedStyle(panel),base=color(rootStyle.backgroundColor),rows=[];
   if(base[3]!==1)throw Error('Proof panel background is not opaque');
   const walker=document.createTreeWalker(panel,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()){
    const text=walker.currentNode.textContent.trim(),element=walker.currentNode.parentElement;
    if(!text||!element||element.closest('.sr-only,[aria-hidden="true"]')||!element.getClientRects().length)continue;
    const style=getComputedStyle(element);if(style.visibility==='hidden'||style.display==='none')continue;
    const ancestors=[];for(let node=element;node&&node!==panel;node=node.parentElement)ancestors.push(node);
    let bg=base;for(const node of ancestors.reverse())bg=blend(color(getComputedStyle(node).backgroundColor),bg);
    const fg=blend(color(style.color),bg),l1=lum(fg),l2=lum(bg),ratio=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
    rows.push({text:text.slice(0,110),ratio});
   }
   return {background:rootStyle.backgroundColor,foreground:rootStyle.color,animationName:rootStyle.animationName,rows};
  });
  assert.ok(visual.rows.length>=10);assert.ok(visual.rows.every(row=>row.ratio>=4.5),'Proof text contrast below 4.5: '+JSON.stringify(visual.rows.filter(row=>row.ratio<4.5)));
  assert.equal(visual.animationName,'none');
  for(let i=0;i<5;i++){await page.keyboard.press(i%2?'Shift+Tab':'Tab');assert.ok(await dialog.evaluate(panel=>panel.contains(document.activeElement)),'Keyboard focus escaped proof');}
  const screenshot='proof-portal-'+stamp+'-'+locale+'-'+width+'.png';await page.screenshot({path:path.join(__dirname,screenshot),fullPage:false,animations:'disabled'});
  await page.evaluate(()=>document.documentElement.style.fontSize='32px');
  assert.ok(await dialog.evaluate(panel=>panel.scrollWidth<=panel.clientWidth+1),'Enlarged proof overflows');
  const enlarged='proof-portal-'+stamp+'-'+locale+'-'+width+'-enlarged.png';await page.screenshot({path:path.join(__dirname,enlarged),fullPage:false,animations:'disabled'});
  await page.evaluate(()=>document.documentElement.style.fontSize='');
`);
source=source.replace('result.checks.push({locale,oneDrawer:true', 'result.checks.push({locale,width,visual,enlarged,controlledTextEnlargement:2,keyboardContainment:true,oneDrawer:true');
source=source.replace("console.log(locale+' proof recovery: passed')", "console.log(locale+' '+width+' proof portal: passed')");
fs.writeFileSync(path.join(__dirname,'verify-proof-portal-browser.cjs'),source,{flag:'wx'});
