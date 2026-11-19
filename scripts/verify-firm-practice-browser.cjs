// Authenticated synthetic AF13 workflow. No production target or real identities.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const {chromium}=require('playwright'),axe=require('axe-core')
const {PrismaClient}=require('../.codex-tmp/af13-prisma/client')
const privateRoot='C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993'
const fixture=JSON.parse(fs.readFileSync(path.join(privateRoot,'af13-browser-private.json'),'utf8'))
const output=path.resolve('docs/accounting-firms/roadmap-2026-10-19/execution/AF13/2026-10-25-run-03')
const source=JSON.parse(fs.readFileSync(path.join(output,'browser-fixture.json'),'utf8'))
const target=new URL(fixture.url)
assert.equal(target.hostname,'127.0.0.1');assert.equal(target.port,'55450');assert.equal(target.pathname,'/stoquify_local_af13_20261025_r1')
const presentationOnly=process.argv.includes('--presentation-only')
const report=presentationOnly?JSON.parse(fs.readFileSync(path.join(output,'browser-verification.json'),'utf8')):{synthetic:true,checks:[],axe:[],screenshots:[],pageErrors:[],passed:false}
if(presentationOnly){assert.ok(report.checks.includes('Guarded current-scope JSON download retains separate currencies and provenance.'));report.passed=false;for(const key of Object.keys(report))if(key.endsWith('FailureText'))delete report[key]}
async function main(){
  const db=new PrismaClient({datasources:{db:{url:fixture.url}}}),browser=await chromium.launch({headless:true})
  const contexts=[],pages={},check=text=>{report.checks.push(text);console.log(text)}
  const route=locale=>`${fixture.base}/${locale}/dashboard/accounting/accountant-portal?clientOrganizationId=${encodeURIComponent(source.client)}&periodId=${encodeURIComponent(source.periodId)}`
  const panel=(page,locale='en')=>page.getByRole('region',{name:locale==='en'?'Firm workload and fee budgets':'Charge du cabinet et budgets d’honoraires',exact:true})
  async function load(page,locale='en'){
    await page.goto(route(locale),{waitUntil:'domcontentloaded',timeout:240000})
    const section=panel(page,locale)
    await section.getByRole('button',{name:locale==='en'?'Load firm engagements':'Charger les missions du cabinet',exact:true}).click()
    await page.waitForFunction(label=>{const s=[...document.querySelectorAll('section')].find(s=>s.getAttribute('aria-label')===label);return !!s?.querySelector('select')||/Current access|Submission not confirmed|Les droits actuels|Envoi non confirmé/.test(s?.textContent||'')},locale==='en'?'Firm workload and fee budgets':'Charge du cabinet et budgets d’honoraires')
    if(!await section.locator('select').count())throw Error('Engagement load failed: '+await section.innerText())
    await section.getByLabel(locale==='en'?'Choose a firm engagement':'Choisir une mission du cabinet',{exact:true}).selectOption(source.engagementId)
    await section.getByRole('heading',{name:locale==='en'?'Retained records and revisions':'Saisies et versions conservées',exact:true}).waitFor()
    return section
  }
  async function saved(page,section){
    await page.waitForFunction(()=>{const s=document.querySelector('section[aria-label="Firm workload and fee budgets"]');return !!s?.querySelector('input[type="password"]')||/Saved\.|Current access|Submission not confirmed/.test(s?.textContent||'')})
    if(await section.getByLabel('Password',{exact:true}).count()){
      await section.getByLabel('Password',{exact:true}).fill(fixture.password)
      await section.getByRole('button',{name:'Verify identity',exact:true}).click()
      await section.getByText('Identity verified. Retry when ready.',{exact:true}).waitFor()
      await section.getByRole('button',{name:'Retry submission',exact:true}).click()
    }
    await section.getByText('Saved. Current revisions loaded.',{exact:true}).waitFor()
  }
  try{
    const actual=(await db.$queryRawUnsafe('SHOW data_directory'))[0].data_directory
    assert.equal(fs.realpathSync(actual).toLowerCase(),fs.realpathSync(path.join(privateRoot,'af13-postgres')).toLowerCase())
    for(const role of ['preparer','reviewer','owner']){
      const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});contexts.push(context)
      const response=await context.request.post(fixture.base+'/api/auth/sign-in/email',{data:{email:source.actors[role]+'@example.invalid',password:fixture.password},headers:{Origin:fixture.base},timeout:240000})
      assert.equal(response.status(),200,role+' real sign-in')
      const page=await context.newPage();page.setDefaultTimeout(90000);page.on('pageerror',error=>report.pageErrors.push(error.message));pages[role]=page
    }
    let section
    if(!presentationOnly){
    section=await load(pages.preparer)
    assert.equal(await section.getByRole('button',{name:'Load confidential fee budgets',exact:true}).count(),0)
    await section.getByLabel('Minutes',{exact:true}).fill('60')
    await section.getByLabel('Work date (UTC)',{exact:true}).fill('2026-09-16')
    await section.getByLabel(/^Reason \(at least/).fill('Synthetic browser manual declaration')
    await section.getByRole('button',{name:'Save record',exact:true}).click();await saved(pages.preparer,section)
    const declaration=await db.firmPracticeRevision.findFirstOrThrow({where:{engagementId:source.engagementId,reason:'Synthetic browser manual declaration'},orderBy:{createdAt:'desc'}})
    assert.equal(declaration.payload.minutes,60)
    const card=section.locator('article').filter({hasText:'preparer: 60 minutes'})
    await card.getByRole('button',{name:'Correct',exact:true}).click()
    await section.getByLabel('Minutes',{exact:true}).fill('90')
    await section.getByLabel(/^Reason \(at least/).fill('Synthetic browser correction retained')
    await section.getByRole('button',{name:'Save record',exact:true}).click();await saved(pages.preparer,section)
    assert.equal(await db.firmPracticeRevision.count({where:{engagementId:source.engagementId,recordKey:declaration.recordKey}}),2)
    check('Real preparer sign-in, manual effort and retained correction; no fee access.')
    section=await load(pages.reviewer)
    await section.getByRole('button',{name:'Engagement workload',exact:true}).click()
    await section.getByText('Coverage: selected engagement and period only — AF12 September',{exact:true}).waitFor()
    await section.getByLabel(/^Reason \(at least/).fill('Independent browser review of correction')
    await section.locator('article').filter({hasText:'preparer: 90 minutes'}).getByRole('button',{name:'Independently review',exact:true}).click()
    await saved(pages.reviewer,section)
    const reviewed=await db.firmPracticeRevision.findFirstOrThrow({where:{engagementId:source.engagementId,recordKey:declaration.recordKey},orderBy:{version:'desc'}})
    assert.equal(reviewed.version,3);assert.equal(reviewed.reviewedById,source.actors.reviewer)
    check('Independent manager review with real password step-up and explicit retry.')
    await section.getByRole('button',{name:'Load confidential fee budgets',exact:true}).click()
    await section.getByText(/XAF 90000.00 — Budget per/).waitFor()
    await section.getByLabel('Record type',{exact:true}).selectOption('FEE')
    await section.getByLabel('Currency',{exact:true}).selectOption('USD')
    await section.getByLabel('Fee budget amount',{exact:true}).fill('30.00')
    await section.getByLabel(/^Reason \(at least/).fill('Synthetic separate USD planning budget')
    await section.getByRole('button',{name:'Save record',exact:true}).click();await saved(pages.reviewer,section)
    await section.getByText(/USD 30.00 — Budget per/).waitFor()
    check('Confidential USD budget saved beside separate EUR and XAF budgets without FX totals.')
    const download = pages.reviewer.waitForEvent('download')
    await section.getByRole('button',{name:'Download current scope (JSON)',exact:true}).click()
    await saved(pages.reviewer,section)
    const exported = await download
    const exportPath=path.join(output,'browser-practice-export.json');await exported.saveAs(exportPath)
    const snapshot=JSON.parse(fs.readFileSync(exportPath,'utf8'))
    assert.equal(snapshot.report.cohortCount,1);assert.equal(snapshot.report.economicsIncluded,true)
    assert.deepEqual(snapshot.report.cohorts[0].summary.economics.map(row=>row.currency),['EUR','USD','XAF'])
    assert.ok(snapshot.watermarkId);assert.ok(snapshot.contentHash)
    check('Guarded current-scope JSON download retains separate currencies and provenance.')
    }
    for(const locale of ['en','fr'])for(const width of [1440,390]){
      await pages.reviewer.setViewportSize({width,height:1000});section=await load(pages.reviewer,locale)
      await section.getByRole('button',{name:locale==='en'?'Load confidential fee budgets':'Charger les budgets confidentiels',exact:true}).click()
      await section.getByText(/^USD 30.00 —/).waitFor()
      await pages.reviewer.addScriptTag({content:axe.source})
      const result=await pages.reviewer.evaluate(async label=>window.axe.run(document.querySelector(`section[aria-label="${label}"]`),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}),locale==='en'?'Firm workload and fee budgets':'Charge du cabinet et budgets d’honoraires')
      report.axe.push({locale,width,violations:result.violations.map(v=>({id:v.id,impact:v.impact}))});assert.equal(result.violations.length,0)
      assert.ok(await pages.reviewer.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1))
      await section.getByRole('heading',{level:2}).scrollIntoViewIfNeeded();const name=`practice-${locale}-${width}.png`;await pages.reviewer.screenshot({path:path.join(output,name)});report.screenshots.push(name)
    }
    check('English/French desktop/mobile renders: four scoped axe scans, no horizontal overflow.')
    await pages.owner.goto(route('en'),{waitUntil:'domcontentloaded',timeout:240000})
    const clientPanel=panel(pages.owner)
    if(await clientPanel.count()){
      await clientPanel.getByRole('button',{name:'Load firm engagements',exact:true}).click()
      await clientPanel.getByText(/Current access does not permit/).waitFor()
      assert.equal(await clientPanel.getByText(/90000.00/).count(),0)
    }
    check('Client identity cannot open the firm workload/economics workspace.')
    section=await load(pages.reviewer)
    await section.getByRole('button',{name:'Load confidential fee budgets',exact:true}).click();await section.getByText(/XAF 90000.00 — Budget per/).waitFor()
    const role=await db.role.findUniqueOrThrow({where:{id:source.actors.reviewer+'-role'}})
    try{
      await db.role.update({where:{id:role.id},data:{permissions:role.permissions.filter(p=>p!=='finance.profitability.read')}})
      await section.getByRole('button',{name:'Hide fee budgets',exact:true}).click()
      await section.getByText('Coverage: selected engagement and period only — AF12 September',{exact:true}).waitFor()
      assert.equal(await section.getByRole('button',{name:'Load confidential fee budgets',exact:true}).count(),0)
      assert.equal(await section.getByText(/90000.00/).count(),0)
    }finally{await db.role.update({where:{id:role.id},data:{permissions:role.permissions}})}
    check('Current fee permission removal clears confidential fields on refresh.')
    assert.equal(report.pageErrors.length,0);report.passed=true
  }finally{
    if(!report.passed)for(const [role,page] of Object.entries(pages)){
      try{report[role+'FailureText']=await panel(page).innerText({timeout:2000});await page.screenshot({path:path.join(output,'failure-'+role+'.png')})}catch{}
    }
    fs.writeFileSync(path.join(output,'browser-verification.json'),JSON.stringify(report,null,2))
    for(const context of contexts)await context.close();await browser.close();await db.$disconnect()
  }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1})
