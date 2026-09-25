const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {hashPassword}=require(path.join(f.root,'lib/password.ts')),{chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const stamp=crypto.randomUUID(),base='http://127.0.0.1:3110',secrets=[],files=['app/[locale]/(dashboard)/dashboard/daily-digest/daily-digest-route-access.tsx','app/[locale]/(dashboard)/dashboard/daily-digest/daily-digest-route-data-access.ts','app/[locale]/(dashboard)/dashboard/daily-digest/error.tsx','app/[locale]/(dashboard)/dashboard/daily-digest/loading.tsx','messages/en.json','messages/fr.json'];
files.push('services/daily-habit/daily-habit-digest.service.ts','services/daily-habit/daily-habit-digest-contracts.ts','components/daily-habit/DailyHabitDigestDashboard.tsx');
files.push("lib/dashboard/bi-presentation.ts","components/bi/BIStateBadge.tsx","components/evidence/EvidenceGradeBadge.tsx","components/bi/BIEvidenceBadgeRow.tsx","components/bi/BICommandModeTabs.tsx","components/bi/BICommandBriefHeader.tsx","components/bi/BIKpiCard.tsx","components/bi/BIBusinessTruthZone.tsx","components/bi/BIWhatChangedStrip.tsx","components/bi/BIRiskOpportunityRadar.tsx","components/bi/BIStateSurface.tsx","services/daily-habit/daily-habit-digest-presentation.ts","app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx");
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),browser:[],scope:'Owned localhost database and credential login only. Invalid currency deliberately triggers rendering failure; no live provider, approval, proposal or financial operation.'};let browser,org;
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 org=await db.organization.create({data:{name:f.helper.prefix+'Digest recovery '+stamp,slug:'digest-recovery-'+stamp,currency:'XAF',timezone:'UTC'}});
 const password='Owned-'+crypto.randomUUID()+'!',hashed=await hashPassword(password);secrets.push(password);
 const actor=await db.user.create({data:{organizationId:org.id,email:'digest-reader-'+stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const role=await db.role.create({data:{organizationId:org.id,code:'administrator',nameEn:'Owned digest reader',permissions:['dashboard.read'],users:{connect:{id:actor.id}}}});
 const count=async()=>({proposals:await db.aiActionProposal.count({where:{organizationId:org.id}}),events:await db.businessEvent.count({where:{organizationId:org.id}}),journals:await db.journalEntry.count({where:{organizationId:org.id}}),payments:await db.payment.count({where:{organizationId:org.id}})}),before=await count();
 browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  await db.role.update({where:{id:role.id},data:{permissions:['dashboard.read']}});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',timezoneId:'America/New_York'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password}})).status(),200);
  const page=await context.newPage(),row={locale,screenshots:[],layouts:[],consoleErrors:[],pageErrors:[],rscRequests:0};result.browser.push(row);
  page.on('pageerror',error=>row.pageErrors.push(f.safe(error,secrets)));
  page.on('console',message=>{if(message.type()==='error')row.consoleErrors.push(f.safe(new Error(message.text()),secrets))});
  page.on('request',request=>{if(new URL(request.url()).pathname===`/${locale}/dashboard/daily-digest`&&request.headers().rsc==='1')row.rscRequests++});
  const heading=locale==='en'?'Daily Habit Digest':'Digest quotidien',errorTitle=locale==='en'?'Daily Digest could not load':'Impossible de charger le digest quotidien';
  const started=Date.now();await page.goto(base+`/${locale}/dashboard/daily-digest`,{timeout:120000});await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();row.initialLoadMs=Date.now()-started;
  for(const width of [1440,768,320]){
   await page.setViewportSize({width,height:1000});
   row.layouts.push(await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,mains:[...document.querySelectorAll('main')].map(el=>({class:el.className,rect:el.getBoundingClientRect().toJSON(),scrollHeight:el.scrollHeight,children:[...el.children].map(c=>({tag:c.tagName,class:c.className,rect:c.getBoundingClientRect().toJSON()}))}))})));
   const file=`digest-recovery-v156-${stamp}-${locale}-${width}-loaded.png`;await page.screenshot({path:path.join(__dirname,file),fullPage:true});row.screenshots.push(file);
  }
  const modeNames=locale==='en'?['Brief','Command','Investigate']:['Synthèse','Pilotage','Examiner'],regionNames=locale==='en'?['Summary and changes','Actions and risks','Source details']:['Synthèse et évolutions','Actions et risques','Détails des sources'];
  for(const width of [1440,768,320]){
   await page.setViewportSize({width,height:1000});
   for(const index of [1,2,0]){
    const button=page.getByRole('button',{name:modeNames[index],exact:true});await button.focus();await page.keyboard.press('Enter');await expect(button).toHaveAttribute('aria-pressed','true');const region=page.getByRole('region',{name:regionNames[index],exact:true});await expect(region).toBeVisible();
    for(const other of [0,1,2].filter(x=>x!==index))await expect(page.getByRole('region',{name:regionNames[other],exact:true})).toHaveCount(0);
    await expect(page.getByRole('region',{name:locale==='en'?'Source limitations':'Limites des sources',exact:true})).toBeVisible();
    await region.scrollIntoViewIfNeeded();const shot=`digest-recovery-v156-${stamp}-${locale}-${width}-mode-${index}.png`;await page.screenshot({path:path.join(__dirname,shot),animations:'disabled'});row.screenshots.push(shot);
   }
  }
  row.keyboardModesAcrossWidths=true;
  await page.getByRole('button',{name:modeNames[1],exact:true}).click();
  const lower=page.getByRole('heading',{name:locale==='en'?'Digest risk radar':'Risques du digest',exact:true});await lower.scrollIntoViewIfNeeded();await expect(lower).toBeInViewport();
  const lowerShot=`digest-recovery-v156-${stamp}-${locale}-320-scrolled.png`;await page.screenshot({path:path.join(__dirname,lowerShot),animations:'disabled'});row.screenshots.push(lowerShot);row.lowerContentVisibleAfterScroll=true;
  row.lowerGeometry=await lower.evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility,opacity:getComputedStyle(el).opacity}));
  const endDay=page.getByRole('button',{name:locale==='en'?'End of day':'Fin de journée',exact:true});await endDay.focus();await page.keyboard.press('Enter');await expect(endDay).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('heading',{name:locale==='en'?'End-of-day pulse':'Point de fin de journée',exact:true}).first()).toBeVisible();
  const owner=page.getByRole('button',{name:locale==='en'?'Owner':'Dirigeant',exact:true});await owner.focus();await page.keyboard.press('Enter');await expect(owner).toHaveAttribute('aria-pressed','true');
  const source=page.getByRole('link',{name:locale==='en'?'Open surface':'Ouvrir l’espace',exact:true});await expect(source).toHaveAttribute('href','/'+locale+'/dashboard/owner-war-room');row.keyboardWorkspaceAndLocalizedLinks=true;
  if(locale==='fr'){await expect(page.getByRole('heading',{name:'Digest du dirigeant',exact:true}).first()).toBeVisible();await expect(page.getByText('Encaissements',{exact:true}).first()).toBeVisible();await expect(page.getByText('Lecture seule',{exact:true})).toBeVisible();await expect(page.getByText('Aucune évolution importante pour le moment',{exact:true})).toBeVisible();await expect(page.getByText('Cash collected',{exact:true})).toHaveCount(0);row.frenchTemplateAndSharedLabels=true;}
  assert.equal(row.pageErrors.length,0,'Loaded digest must hydrate without a timezone text mismatch');
  await expect(page.getByText(locale==='en'?'Generated (UTC)':'Généré (UTC)',{exact:true})).toBeVisible();
  row.timezoneStable=true;
  await db.organization.update({where:{id:org.id},data:{currency:'INVALID'}});await page.reload();
  await expect(page.getByRole('heading',{name:errorTitle,exact:true})).toBeVisible();await expect(page.getByRole('alert').filter({has:page.getByRole('heading',{name:errorTitle,exact:true})})).toBeVisible();
  row.failedReadHasNoDigest=await page.getByRole('heading',{name:heading,exact:true}).count()===0;assert.ok(row.failedReadHasNoDigest);
  const screenshot=`digest-recovery-v156-${stamp}-${locale}-320-error.png`;await page.screenshot({path:path.join(__dirname,screenshot),fullPage:true});row.screenshots.push(screenshot);
  await db.organization.update({where:{id:org.id},data:{currency:'XAF'}});
  const requests=row.rscRequests,retry=page.getByRole('button',{name:locale==='en'?'Retry':'Réessayer',exact:true});await retry.focus();await expect(retry).toBeFocused();await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();assert.ok(row.rscRequests>requests);row.keyboardRetryFreshServer=true;
  await db.role.update({where:{id:role.id},data:{permissions:[]}});await page.reload();
  const denied=locale==='en'?'Daily Digest access is not authorized':'L’accès au digest quotidien n’est pas autorisé';await expect(page.getByRole('heading',{name:denied,exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:heading,exact:true})).toHaveCount(0);row.currentPermissionDenied=true;
  const deniedScreenshot=`digest-recovery-v156-${stamp}-${locale}-320-denied.png`;await page.screenshot({path:path.join(__dirname,deniedScreenshot),fullPage:true});row.screenshots.push(deniedScreenshot);
  await context.close();
 }
 assert.deepEqual(await count(),before);result.noProposalOrFinancialEffects=true;result.passed=true;
}
main().catch(error=>{result.passed=false;result.error=f.safe(error,secrets);process.exitCode=1}).finally(async()=>{if(org)await db.organization.update({where:{id:org.id},data:{currency:'XAF'}});if(browser)await browser.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);const output=path.join(__dirname,'digest-recovery-v156-'+stamp+'.json');fs.writeFileSync(output,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({output,...result}));await db.$disconnect()});
