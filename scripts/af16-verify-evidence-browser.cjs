// Real Better Auth and protected UI actions against the explicitly isolated AF06 database.
// No provider delivery worker, operational payment, or production environment is used.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const {chromium}=require('playwright'),{PrismaClient}=require('../.codex-tmp/af16-prisma/client'),axe=require('axe-core')
const privateRoot='C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993'
const fixture=JSON.parse(fs.readFileSync(path.join(privateRoot,'af16-evidence-browser-private.json'),'utf8'))
const target=new URL(fixture.url)
assert.equal(target.hostname,'127.0.0.1');assert.equal(target.port,'55451');assert.equal(target.pathname,'/stoquify_local_af16_20261025_af06_r1')
const output=path.resolve('docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-25-run-01/AF06')
const source=JSON.parse(fs.readFileSync(path.join(output,'browser-fixture.json'),'utf8'))
const report={synthetic:true,checks:[],screenshots:[],pageErrors:[],passed:false}
async function main(){
 const db=new PrismaClient({datasources:{db:{url:fixture.url}}}),browser=await chromium.launch({headless:true})
 const contexts={},pages={}
 const base=fixture.base,route=base+'/en/dashboard/accounting/accountant-portfolio'
 const shot=async(name,page)=>{await page.screenshot({path:path.join(output,name+'.png'),fullPage:false});report.screenshots.push(name+'.png')}
 const check=message=>{report.checks.push(message);console.log(message)}
 const openComposer=async(page,locale='en')=>{
  const title=locale==='en'?'Request and track evidence':'Demander et suivre les justificatifs'
  await page.getByRole('button',{name:title+': Synthetic client',exact:true}).click()
  const section=page.getByRole('region',{name:title+': Synthetic client',exact:true})
  const period=section.getByLabel(locale==='en'?'Client accounting period':'Période comptable du client',{exact:false})
  await period.waitFor()
  // Period choices are intentionally bounded. Walk the actual UI continuation.
  for(let n=0;n<20 && !(await period.locator('option').evaluateAll((els,id)=>els.some(e=>e.value===id),source.periodId));n++){
   await section.getByRole('button',{name:locale==='en'?'Next periods':'Périodes suivantes',exact:true}).click()
   await section.locator('h4').waitFor()
   await page.waitForFunction(({id,fr})=>Array.from(document.querySelectorAll('select')).some(e=>e.closest('label')?.textContent.includes(fr?'Période comptable':'Client accounting') && Array.from(e.options).some(o=>o.value===id)),{id:source.periodId,fr:locale!=='en'},{timeout:10000}).catch(()=>{})
  }
  await period.selectOption(source.periodId)
  await section.getByLabel(locale==='en'?'Scoped evidence question':'Question précise sur les justificatifs',{exact:true}).waitFor()
  return section
 }
 try{
  assert.equal((await db.$queryRawUnsafe('SELECT current_database() AS name'))[0].name,fixture.name)
  for(const role of ['preparer','owner','reviewer']){
   const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
   contexts[role]=context
   const response=await context.request.post(base+'/api/auth/sign-in/email',{data:{email:'af06-'+role+'@example.invalid',password:fixture.password},headers:{Origin:base},timeout:240000})
   assert.equal(response.status(),200,role+' independent sign-in')
   const page=await context.newPage();page.setDefaultTimeout(180000);page.on('pageerror',e=>report.pageErrors.push(e.message));pages[role]=page
  }
  const preparer=pages.preparer,owner=pages.owner,reviewer=pages.reviewer
  await preparer.goto(route,{waitUntil:'domcontentloaded',timeout:240000})
  let composer=await openComposer(preparer)
  // Supports rerunning verification without changing or duplicating an already recorded request.
  let request=await db.accountantComment.findFirst({where:{findingId:source.findingId,visibility:'CLIENT_ACTION_REQUIRED'}})
  if(!request){
   await composer.getByLabel('Existing finding',{exact:false}).selectOption(source.findingId)
   await composer.getByLabel('Client response owner',{exact:false}).selectOption('af06-owner')
   const due=new Date(Date.now()+86400000).toISOString().slice(0,16)
   await composer.getByLabel('Response due',{exact:true}).fill(due)
   await composer.getByLabel('Scoped evidence question',{exact:true}).fill('Please explain the missing settlement proof and its source for this accounting period.')
   await shot('request-composer-en',preparer)
   await composer.getByRole('button',{name:'Send evidence request',exact:true}).click()
   await composer.getByText('Request recorded. The client response owner can reply in their Close evidence workspace.',{exact:true}).waitFor()
   request=await db.accountantComment.findFirstOrThrow({where:{findingId:source.findingId,visibility:'CLIENT_ACTION_REQUIRED'}})
  }
  assert.equal(request.authorId,'af06-preparer')
  check('Named firm preparer records one settlement-proof request through the protected composer.')
  await composer.getByText('Awaiting response',{exact:true}).waitFor().catch(()=>{})
  await shot('request-tracking-en',preparer)
  await owner.goto(base+'/en/dashboard/accounting/close/'+source.periodId,{waitUntil:'domcontentloaded',timeout:240000})
  const workflow=owner.locator('section[aria-labelledby="close-evidence-title"]')
  const comments=()=>db.accountantComment.findMany({where:{findingId:source.findingId},orderBy:{createdAt:'asc'}})
  if(!(await comments()).some(c=>c.visibility==='CLIENT_RESPONSE_SUBMITTED')){
   await workflow.getByRole('button',{name:'Respond to request',exact:true}).click()
   await workflow.getByLabel('Request or response',{exact:true}).fill('The current payment collector is available. Reconciliation remains unsigned and needs its separate financial review.')
   await workflow.getByRole('button',{name:'Submit response',exact:true}).click()
   await workflow.getByText('Response saved. It has not yet been accepted.',{exact:true}).waitFor()
  }
  await shot('client-response-en',owner)
  check('Client recipient replies through the existing Close evidence workspace with their own session.')
  await reviewer.goto(route,{waitUntil:'domcontentloaded',timeout:240000})
  const desk=reviewer.locator('section[aria-labelledby="accountant-work-title"]')
  if(!(await comments()).some(c=>c.visibility==='ACCOUNTANT_RESPONSE_ACCEPTED')){
   const review=desk.getByRole('button',{name:'Review response: Synthetic client, AF06 browser October',exact:true})
   // Prior failed fixture runs can retain another same-named period; select the current request card.
   const card=desk.locator('li').filter({hasText:request.id})
   if(await card.count()) await card.getByRole('button',{name:/Review response/}).click()
   else await review.last().click()
   const detail=desk.locator('section[aria-labelledby="accountant-work-detail"]')
   await detail.getByText('Control outcome: Failed — business conditions still require correction',{exact:true}).waitFor()
   await detail.getByLabel('I have reviewed this replacement observation and the client response.',{exact:true}).check()
   await detail.getByLabel('Review conclusion (10–4,000 characters)',{exact:true}).fill('Checked the current typed payment collection and client response; reconciliation still requires independent signing.')
   await shot('review-preview-en',reviewer)
   await detail.getByRole('button',{name:'Accept evidence response',exact:true}).click()
   await reviewer.waitForFunction(()=>document.body.innerText.includes('Evidence response accepted.') || !!document.querySelector('#accountant-work-password'))
   if(await desk.locator('#accountant-work-password').count()){
    await desk.getByLabel('Current password',{exact:true}).fill(fixture.password)
    await desk.getByRole('button',{name:'Confirm identity',exact:true}).click()
    await desk.getByText('Identity confirmed. Retry acceptance with the same review conclusion.',{exact:true}).waitFor()
    await detail.getByRole('button',{name:'Accept evidence response',exact:true}).click()
    check('Independent reviewer completes the real password freshness challenge before explicit acceptance.')
   }
   await desk.getByText('Evidence response accepted. Refresh to see current work. Payment settlement and close certification remain separate checks.',{exact:true}).waitFor()
  }
  const retained=await comments()
  assert.equal(retained.filter(c=>c.visibility==='CLIENT_ACTION_REQUIRED').length,1)
  assert.equal(retained.filter(c=>c.visibility==='CLIENT_RESPONSE_SUBMITTED').length,1)
  assert.equal(retained.filter(c=>c.visibility==='ACCOUNTANT_RESPONSE_ACCEPTED').length,1)
  assert.equal((await db.closeChecklistItem.findUniqueOrThrow({where:{id:source.replacementId}})).status,'FAILED')
  check('Exactly one request, response and acceptance are retained; FAILED reconciliation is unchanged.')
  await shot('accepted-en',reviewer)
  for(const locale of ['en','fr']){
   await preparer.goto(base+'/'+locale+'/dashboard/accounting/accountant-portfolio',{waitUntil:'domcontentloaded',timeout:240000})
   composer=await openComposer(preparer,locale)
   await composer.getByText(locale==='en'?'Evidence response accepted':'Réponse justificative acceptée',{exact:true}).waitFor()
   for(const width of [1440,390]){
    await preparer.setViewportSize({width,height:1000})
    await composer.scrollIntoViewIfNeeded()
    await preparer.addScriptTag({content:axe.source})
    const result=await preparer.evaluate(async()=>window.axe.run('section[aria-label^="Request and track evidence"],section[aria-label^="Demander et suivre les justificatifs"]',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}))
    assert.equal(result.violations.length,0,locale+' axe: '+JSON.stringify(result.violations.map(v=>v.id)))
    const overflow=await preparer.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)
    assert.equal(overflow,false,locale+' horizontal overflow at '+width)
    check(locale+' '+width+'px: scoped WCAG automated scan has no violations; no page horizontal overflow.')
    await shot('desk-'+locale+'-'+width,preparer)
   }
   const refresh=composer.getByRole('button',{name:locale==='en'?'Refresh evidence choices':'Actualiser les choix',exact:true})
   await refresh.focus();await preparer.keyboard.press('Enter')
   await preparer.waitForFunction(()=>document.activeElement?.tagName==='H4')
   check(locale+': keyboard refresh returns focus to the desk heading.')
  }
  assert.equal(report.pageErrors.length,0,'Browser page errors')
  report.passed=true
 }catch(error){
  report.failure=error.message
  for(const [name,page] of Object.entries(pages)){
   await fs.promises.writeFile(path.join(output,'debug-'+name+'.txt'),await page.locator('body').innerText().catch(()=>'unavailable'))
   await shot('failure-'+name,page).catch(()=>{})
  }
  throw error
 }finally{
  fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(report,null,2))
  await browser.close();await db.$disconnect()
 }
}
main().catch(e=>{console.error(e.message);process.exitCode=1})
