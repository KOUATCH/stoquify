const f=require('./fixtures.cjs'),{db,fs,path,assert}=f,{chromium}=require('playwright'),base='http://127.0.0.1:3110';
const report={startedAt:new Date().toISOString(),synthetic:true,base,checks:[]};let browser,secrets=[];
async function check(name,fn){await fn();report.checks.push({name,status:'PASS'});console.log('PASS '+name)}
async function keyboard(page,locator){await locator.focus();await page.keyboard.press('Enter')}
(async()=>{
 const x=await f.fixture();secrets=[x.password];browser=await chromium.launch({headless:true});report.fixtureOrganizations=[x.firm.id,...x.clients.map(c=>c.client.id)];
 const posted=[];for(const c of x.clients)posted.push(await f.ledger(x,c,c.label==='A'?'100.25':'230.50'));
 for(const locale of ['en','fr']){
  const es=[];for(const c of x.clients)es.push(await f.evidence(x,c,'browser-'+locale));
  await f.evidence(x,x.clients[0],'awaiting-'+locale,{respond:false});
  const context=await browser.newContext({viewport:locale==='fr'?{width:390,height:844}:{width:1440,height:1000},locale:locale==='fr'?'fr-FR':'en-GB'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const auth=await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:x.actor.email,password:x.password},timeout:60000});assert.equal(auth.status(),200,'owned fixture login');
  const page=await context.newPage();page.setDefaultTimeout(60000);
  page.on('pageerror',error=>{report.pageErrors??=[];report.pageErrors.push(f.safe(error,secrets))});
  page.on('response',async response=>{if(response.request().method()==='POST'&&response.request().headers()['next-action']){const body=await response.text().catch(()=>'');const codes=[...body.matchAll(/"code":"([A-Z_]+)"/g)].map(match=>match[1]);if(codes.length){report.actionCodes??=[];report.actionCodes.push(...codes)}}});
  const section=page.locator('section[aria-labelledby="accountant-work-title"]');
  try{
   await page.goto(base+'/'+locale+'/dashboard/accounting/accountant-portfolio',{waitUntil:'domcontentloaded',timeout:120000});
   await check(locale+' two-client pending and submitted tasks visible',async()=>{
    await section.getByText(x.clients[0].client.name,{exact:true}).first().waitFor();await section.getByText(x.clients[1].client.name,{exact:true}).first().waitFor();
    await section.getByText(locale==='fr'?'En attente de la réponse du client':'Awaiting client response',{exact:true}).first().waitFor();
    await section.getByText(locale==='fr'?'Notification en file d’attente':'Notification queued',{exact:true}).first().waitFor();
   });
   const review=locale==='fr'?'Examiner la réponse':'Review response',accept=locale==='fr'?'Accepter la réponse justificative':'Accept evidence response';
   await keyboard(page,section.getByRole('button',{name:review+': '+x.clients[0].client.name+', September A',exact:true}).first());
   await section.locator('#accountant-work-detail').waitFor();
   assert.equal(await section.locator('#accountant-work-detail').evaluate(el=>el===document.activeElement),true);
   await section.locator('#accountant-work-notes').fill('Verified synthetic source for M1-03 '+locale);
   await check(locale+' keyboard detail focus and correct client-period portal link',async()=>{
    const href=await section.getByRole('link').getAttribute('href');assert.ok(href.includes('clientOrganizationId='+x.clients[0].client.id));assert.ok(href.includes('periodId='+x.clients[0].period.id));
   });
   await keyboard(page,section.getByRole('button',{name:accept,exact:true}));
   await check(locale+' real password step-up then explicit same-command acceptance',async()=>{
    const input=section.locator('#accountant-work-password');await input.waitFor();await input.fill(x.password);
    await keyboard(page,section.getByRole('button',{name:locale==='fr'?'Confirmer l’identité':'Confirm identity',exact:true}));
    await section.getByText(locale==='fr'?'Identité confirmée. Réessayez l’acceptation avec la même conclusion.':'Identity confirmed. Retry acceptance with the same review conclusion.',{exact:true}).waitFor();
    await keyboard(page,section.getByRole('button',{name:accept,exact:true}));
    await section.getByText(locale==='fr'?/^Réponse justificative acceptée\./:/^Evidence response accepted\./).waitFor();
    assert.equal(await db.accountantComment.count({where:{organizationId:x.clients[0].client.id,findingId:es[0].finding.id,visibility:'ACCOUNTANT_RESPONSE_ACCEPTED'}}),1);
   });
   await keyboard(page,section.getByRole('button',{name:locale==='fr'?'Actualiser':'Refresh',exact:true}));
   await section.getByRole('button',{name:review+': '+x.clients[1].client.name+', September B',exact:true}).first().waitFor();
   await check(locale+' narrow workdesk does not overflow',async()=>{assert.ok(await section.evaluate(el=>el.scrollWidth<=el.clientWidth+1))});
   await page.screenshot({path:path.join(__dirname,'browser-'+locale+'.png'),fullPage:true});
   await check(locale+' revoked grant rejects browser acceptance and clears review data',async()=>{
    await keyboard(page,section.getByRole('button',{name:review+': '+x.clients[1].client.name+', September B',exact:true}).first());
    await section.locator('#accountant-work-notes').fill('Must not accept after mandate revocation');
    await db.accountantAccessGrant.update({where:{id:x.clients[1].grant.id},data:{status:'REVOKED',activeScopeKey:null}});
    try{await keyboard(page,section.getByRole('button',{name:accept,exact:true}));await section.getByText(locale==='fr'?/^Accès à la revue indisponible/:/^Review access is unavailable/).waitFor();assert.equal(await section.locator('#accountant-work-notes').count(),0)}
    finally{await db.accountantAccessGrant.update({where:{id:x.clients[1].grant.id},data:{status:'ACTIVE',activeScopeKey:x.clients[1].client.id+':'+x.actor.id}})}
   });
   for(let index=0;index<x.clients.length;index++){
    const c=x.clients[index];
    await check(locale+' client '+c.label+' portal refresh and downloaded export retain scope',async()=>{
     await page.goto(base+'/'+locale+'/dashboard/accounting/accountant-portal?clientOrganizationId='+c.client.id+'&periodId='+c.period.id,{waitUntil:'domcontentloaded',timeout:120000});
     await page.waitForLoadState('networkidle',{timeout:60000});
     await page.reload({waitUntil:'networkidle',timeout:120000});
     const exportButton=page.getByRole('button',{name:locale==='fr'?'Exporter le pack':'Export trust pack',exact:true});await exportButton.waitFor();
     const refresh=page.getByRole('button',{name:locale==='fr'?'Actualiser':'Refresh',exact:true});if(await refresh.count())await keyboard(page,refresh.first());
     const downloadPromise=page.waitForEvent('download');await keyboard(page,exportButton);const download=await downloadPromise,location=await download.path(),payload=JSON.parse(fs.readFileSync(location,'utf8'));
     assert.equal(payload.scope.organizationId,c.client.id);assert.equal(payload.scope.periodId,c.period.id);const content=JSON.stringify(payload);assert.ok(content.includes(posted[index].id));assert.ok(!content.includes(posted[1-index].id));
     report.checks.push({name:locale+' '+c.label+' downloaded hash',contentHash:payload.export.contentHash,status:'PASS'});
    });
   }
  }catch(e){await page.screenshot({path:path.join(__dirname,'browser-failure-'+locale+'.png'),fullPage:true}).catch(()=>{});report.pageText=(await page.locator('body').innerText()).slice(-5000);throw e}
  finally{await context.close()}
 }
 report.status='PASS';
})().catch(e=>{report.status='FAIL';report.error=f.safe(e,secrets);console.error(report.error);process.exitCode=1}).finally(async()=>{await browser?.close();await db.$disconnect();report.completedAt=new Date().toISOString();report.sources=f.sources();const latest=path.join(__dirname,'browser.json');if(fs.existsSync(latest))fs.copyFileSync(latest,path.join(__dirname,'browser-previous-'+Date.now()+'.json'));fs.writeFileSync(latest,JSON.stringify(report,null,2))});
