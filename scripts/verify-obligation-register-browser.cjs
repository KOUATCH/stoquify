// Authenticated AF11 controls on the explicit synthetic target only; no live authority traffic.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const {chromium}=require('playwright'),axe=require('axe-core')
const {PrismaClient}=require('../.codex-tmp/af11-prisma/client')
const base='C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993'
const fixture=JSON.parse(fs.readFileSync(path.join(base,'af11-browser-private.json'),'utf8'))
const out=path.resolve('docs/accounting-firms/roadmap-2026-10-19/execution/AF11/2026-10-20-run-01')
const source=JSON.parse(fs.readFileSync(path.join(out,'browser-fixture.json'),'utf8'))
const target=new URL(fixture.url)
assert.equal(target.hostname,'127.0.0.1');assert.equal(target.port,'55449');assert.equal(target.pathname,'/stoquify_local_af11_20261020_r1')
const report={synthetic:true,checks:[],axe:[],screenshots:[],pageErrors:[],passed:false}
async function main(){
  const db=new PrismaClient({datasources:{db:{url:fixture.url}}}),browser=await chromium.launch({headless:true}),contexts=[]
  const check=text=>{report.checks.push(text);console.log(text)}
  const route=locale=>`${fixture.base}/${locale}/dashboard/accounting/accountant-portal?clientOrganizationId=${encodeURIComponent(source.client)}&periodId=${source.periodId}`
  async function load(page,locale='en'){
    const panel=page.getByTestId('obligation-register'),button=panel.getByRole('button',{name:locale==='en'?'Load / refresh register':'Charger / actualiser le registre',exact:true})
    for(let attempt=0;attempt<2;attempt++){
      const sent=page.waitForRequest(r=>r.method()==='POST'&&r.url().includes('/accountant-portal'),{timeout:15000}).then(()=>true,()=>false)
      await button.click();if(await sent)break
    }
    try { await panel.getByRole('combobox',{name:locale==='en'?/^Applicability/:/^Applicabilité/}).waitFor() }
    catch(error) { console.error('Register load state:',await panel.innerText());await panel.screenshot({path:path.join(out,'load-failure.png')});throw error }
    return panel
  }
  try{
    const actual=(await db.$queryRawUnsafe('SHOW data_directory'))[0].data_directory
    assert.equal(fs.realpathSync(actual).toLowerCase(),fs.realpathSync(path.join(base,'af01-host/af01-postgres')).toLowerCase())
    const pages={}
    for(const role of ['preparer','reviewer']){
      const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});contexts.push(context)
      const response=await context.request.post(fixture.base+'/api/auth/sign-in/email',{data:{email:source.actors[role]+'@example.invalid',password:fixture.password},headers:{Origin:fixture.base},timeout:240000})
      assert.equal(response.status(),200,role+' sign-in')
      pages[role]=await context.newPage();pages[role].setDefaultTimeout(60000);pages[role].on('pageerror',error=>report.pageErrors.push(error.message))
    }
    const preparer=pages.preparer,reviewer=pages.reviewer
    await preparer.goto(route('en'),{waitUntil:'domcontentloaded',timeout:240000});let panel=await load(preparer)
    await panel.getByRole('combobox',{name:/^Applicability/}).selectOption('APPLICABLE')
    await panel.getByLabel('Operational target date (end of day UTC; not a legal deadline)',{exact:true}).fill('2026-09-30')
    await panel.getByRole('combobox',{name:/^Existing domain evidence/}).selectOption(source.packId)
    await panel.getByLabel('Reason / review conclusion (no payroll personal details)',{exact:true}).fill('Synthetic browser operational collection, no Close certification.')
    let intercepted=false
    await preparer.route('**/accountant-portal?**',async route=>{
      if(!intercepted&&route.request().method()==='POST'&&route.request().headers()['next-action']){intercepted=true;await route.fetch();await route.abort('failed')}
      else await route.continue()
    })
    await panel.getByRole('button',{name:'Save new revision',exact:true}).click()
    await panel.getByText(/Outcome uncertain/).waitFor();await preparer.unroute('**/accountant-portal?**')
    assert.equal(await db.firmObligationRevision.count({where:{organizationId:source.client}}),1)
    await panel.getByRole('button',{name:'Retry exact command',exact:true}).click()
    await panel.getByText('Revision recorded; current register reloaded.',{exact:true}).waitFor()
    assert.equal(await db.firmObligationRevision.count({where:{organizationId:source.client}}),1)
    check('Lost response after real commit recovers through exact retry without a duplicate revision.')
    await reviewer.goto(route('en'),{waitUntil:'domcontentloaded',timeout:240000});panel=await load(reviewer)
    await panel.getByRole('button',{name:'Open / edit',exact:true}).click()
    await panel.getByLabel('Reason / review conclusion (no payroll personal details)',{exact:true}).fill('Independent review of the retained synthetic Close pack artifact.')
    await panel.getByRole('button',{name:'Review retained evidence',exact:true}).click()
    await panel.getByLabel('Confirm password',{exact:true}).waitFor()
    await panel.getByLabel('Confirm password',{exact:true}).fill(fixture.password)
    await panel.getByRole('button',{name:'Confirm identity',exact:true}).click()
    await panel.getByText('Identity confirmed. Retry the retained command explicitly.',{exact:true}).waitFor()
    await panel.getByRole('button',{name:'Retry exact command',exact:true}).click()
    await panel.getByText(/Fulfilled with reviewed evidence/).waitFor()
    assert.equal(await db.firmObligationRevision.count({where:{organizationId:source.client}}),2)
    check('Separate reviewer uses real password step-up and explicit retry; operational fulfillment retains independent evidence history.')
    assert.equal(await db.journalEntry.count({where:{organizationId:source.client}}),0)
    assert.equal((await db.closePackExport.findUniqueOrThrow({where:{id:source.packId}})).isCertified,false)
    for(const locale of ['en','fr'])for(const width of [1440,390]){
      await reviewer.setViewportSize({width,height:1000});await reviewer.goto(route(locale),{waitUntil:'domcontentloaded',timeout:240000});panel=await load(reviewer,locale)
      await panel.locator('details').first().locator('summary').click()
      await reviewer.evaluate(axe.source)
      const results=await reviewer.evaluate(async()=>window.axe.run('[data-testid="obligation-register"]',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}))
      report.axe.push({locale,width,violations:results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))})
      assert.equal(results.violations.length,0)
      assert.ok(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'no panel overflow')
      const name=`obligation-register-${locale}-${width}.png`;await panel.screenshot({path:path.join(out,name)});report.screenshots.push(name)
    }
    check('EN/FR desktop/mobile register and source coverage: four scoped axe scans without violations or panel overflow.')
    await reviewer.goto(route('en'),{waitUntil:'domcontentloaded',timeout:240000});panel=await load(reviewer)
    await panel.getByLabel('Include restricted payroll evidence (client payroll role required)',{exact:true}).check()
    await panel.getByRole('button',{name:'Load / refresh register',exact:true}).click()
    await panel.getByText(/Access unavailable/).waitFor();assert.equal(await panel.getByRole('combobox',{name:/^Applicability/}).count(),0)
    check('Firm mandate cannot enable payroll evidence; denial clears private register details.')
    await db.role.update({where:{id:source.actors.preparer+'-role'},data:{permissions:[]}})
    panel=preparer.getByTestId('obligation-register');await panel.getByRole('button',{name:'Load / refresh register',exact:true}).click()
    // The existing portal also refetches its authority and may unmount the register.
    await preparer.waitForFunction(()=>{
      const register=document.querySelector('[data-testid="obligation-register"]')
      return register ? register.textContent.includes('Access unavailable') : document.body.textContent.includes('Accountant portal unavailable')
    })
    assert.equal(await panel.getByRole('combobox',{name:/^Applicability/}).count(),0)
    check('Live role revocation denies the next protected read and clears retained details. No financial or authority submission is sent.')
    assert.deepEqual(report.pageErrors,[]);report.passed=true
  }finally{fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify(report,null,2));for(const context of contexts)await context.close();await browser.close();await db.$disconnect()}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1})
