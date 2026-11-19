// Real Chromium + real components, translations, CSS and IndexedDB; server responses simulated.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),out=__dirname,results=[];
async function main(){
 const files={'/': ['index.html','text/html'],'/bundle.js':['bundle.js','text/javascript'],'/styles.css':['styles.css','text/css']};
 const server=http.createServer((req,res)=>{const file=files[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404).end();return}res.setHeader('Content-Type',file[1]);res.end(fs.readFileSync(path.join(out,'ui-build',file[0])))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({headless:true});
  for(const lang of ['en','fr'])for(const width of [1440,375])for(const flow of ['receiving','inventory','offline']){
   const context=await browser.newContext({viewport:{width,height:900},locale:lang}),page=await context.newPage(),entry={lang,width,flow,status:'FAIL',steps:[],consoleErrors:[]};results.push(entry);
   page.on('pageerror',e=>entry.consoleErrors.push(e.message));
   const m=require(path.join(process.cwd(),'messages',lang+'.json'));
   try{
    await page.goto(base+'/?lang='+lang+'&flow='+flow);await page.locator('main').waitFor();
    if(flow==='receiving'){
     const t=m.purchaseReceiving;await page.locator('#open-receiving').click();const dialog=page.getByRole('dialog');await dialog.waitFor();
     await page.locator('#quantity-ui-line').fill('1');await page.locator('#receiving-inspection').selectOption('PASSED');
     await dialog.getByRole('button',{name:t.review,exact:true}).click();await dialog.getByRole('button',{name:t.confirm,exact:true}).waitFor();
     await dialog.getByRole('button',{name:t.confirm,exact:true}).click();await page.getByText(t.unknown,{exact:true}).waitFor();
     const retained=await page.evaluate(()=>window.submittedCommands[0]);assert.ok(retained.idempotencyKey);entry.steps.push('Unknown outcome retains original request and shows recovery');
     await page.screenshot({path:path.join(out,`ui-${flow}-${lang}-${width}-recovery.png`),fullPage:true});
     for(let i=0;i<16;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog]')),true)}entry.steps.push('Keyboard focus remains in receiving dialog');
     await dialog.getByRole('button',{name:t.recover,exact:true}).click();await page.getByText('GR-UI-001',{exact:false}).first().waitFor();
     const submissions=await page.evaluate(()=>window.submittedCommands);assert.equal(submissions.length,2);assert.deepEqual(submissions[0],submissions[1]);assert.equal(await page.evaluate(()=>window.changedCount),1);entry.steps.push('Retry submits identical retained command; one completion callback');
     await page.addScriptTag({path:require.resolve('axe-core')});entry.axe=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))));
     await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>document.activeElement?.id),'open-receiving');entry.steps.push('Escape closes and restores trigger focus');
    }else if(flow==='inventory'){
     const t=m.inventoryMovementHistory;await page.getByRole('textbox',{name:t.filters.searchLabel}).waitFor();
     await page.getByRole('textbox',{name:t.filters.searchLabel}).fill('missing');await page.getByText(t.states.emptyFilteredTitle,{exact:true}).waitFor();entry.steps.push('Debounced search and empty filtered state render');
     await page.getByRole('button',{name:t.toolbar.clearFilters,exact:true}).first().click();await page.locator(width<768?'[data-table-mobile-row]':'table').waitFor();
     const detail=page.getByRole('button',{name:t.table.detailsFor.replace('{item}',lang==='fr'?'Riz':'Rice')}).filter({visible:true});await detail.focus();await page.keyboard.press('Enter');await page.getByText('ui-movement',{exact:true}).waitFor();entry.steps.push('Keyboard activates details in desktop table/mobile card');
     await page.getByRole('button',{name:t.toolbar.refresh,exact:true}).click();await page.getByText(t.states.loadingTitle,{exact:true}).first().waitFor();await page.locator(width<768?'[data-table-mobile-row]':'table').waitFor();entry.steps.push('Refresh loading and recovery render');
    }else{
     const send=page.getByRole('button',{name:lang==='fr'?'Envoyer les preuves conservées':'Send retained evidence',exact:true});await send.waitFor();const before=await page.evaluate(()=>window.inspectQueues());
     await send.click();await page.getByRole('alert').waitFor();const after=await page.evaluate(()=>window.inspectQueues());assert.equal(before[0].pendingCount,1);assert.equal(after[0].pendingCount,1);entry.steps.push('Unknown server response retains real IndexedDB evidence');
     await context.setOffline(true);await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.disabled));assert.equal(await send.isDisabled(),true);entry.steps.push('Disconnected state disables sending');await context.setOffline(false);
    }
    if(!entry.axe){await page.addScriptTag({path:require.resolve('axe-core')});entry.axe=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))));}
    entry.layout=await page.evaluate(()=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth}));assert.ok(entry.layout.documentWidth<=width+1,'Page-level horizontal overflow');
    await page.screenshot({path:path.join(out,`ui-${flow}-${lang}-${width}.png`),fullPage:true});assert.deepEqual(entry.consoleErrors,[]);entry.status=entry.axe.length?'FAIL_ACCESSIBILITY':'PASS';
   }catch(error){entry.error=error.message;await page.screenshot({path:path.join(out,`ui-${flow}-${lang}-${width}-failure.png`),fullPage:true}).catch(()=>{});}
   finally{await context.close();fs.writeFileSync(path.join(out,'ui-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({lang,width,flow,status:entry.status,error:entry.error,axe:entry.axe?.map(v=>v.id)}));}
  }
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
 if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1});
