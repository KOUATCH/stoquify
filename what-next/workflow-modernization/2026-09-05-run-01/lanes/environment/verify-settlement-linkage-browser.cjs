// Real read/action/browser flow; release prerequisites remain synthetic.
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,helper,root}=f;
const {hashPassword}=require(path.join(root,'lib/password.ts'));
const {recordPayrollPaymentSettlementEvidence:record,getPayrollPaymentReconciliation:getRead}=require(path.join(root,'services/payroll/payment-reconciliation.service.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/payroll/payment-reconciliation.service.ts','components/payroll/PayrollPaymentSettlementForm.tsx','components/payroll/PayrollPaymentReconciliationWorkbench.tsx','components/payroll/payroll-settlement-copy.ts','actions/payroll/payroll-payment-reconciliation.actions.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));const result={at:new Date().toISOString(),syntheticReleaseFixtures:true,sourceBefore:hashes(),checks:[]};let browser,page;
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const template=await db.payrollPaymentBatch.findFirstOrThrow({where:{batchNumber:'6d93a3a4-7fdf-4f0e-9427-52beb96eb479-concurrent'}}),scope={organizationId:template.organizationId};
 assert.ok((await db.organization.findUniqueOrThrow({where:{id:scope.organizationId}})).name.startsWith(helper.prefix));
 const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password);
 const actor=await db.user.create({data:{...scope,email:stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const permissions=['dashboard.read','finance.read','payroll.command.read','payroll.reports.read','payroll.payslips.read','payroll.payments.reconcile','payments.reconciliation.read','payments.reconciliation.exception.resolve'];
 const role=await db.role.create({data:{...scope,code:'settlement-'+stamp,nameEn:'Owned settlement operator',permissions,users:{connect:{id:actor.id}}}});
 const modules=['dashboard','finance','accounting','payroll','payment_reconciliation'];await db.tenantModuleConfiguration.update({where:{organizationId:scope.organizationId},data:{selectedModules:modules,activeModules:modules}});
 for(const moduleSlug of modules)if(!await db.tenantModuleGrant.findFirst({where:{...scope,moduleSlug}}))await db.tenantModuleGrant.create({data:{...scope,moduleSlug,status:'active',source:'requested_modules'}});
 browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  await db.role.update({where:{id:role.id},data:{permissions}});
  const batchId=crypto.randomUUID();
  const transaction=await db.paymentTransaction.create({data:{...scope,sourceType:'PAYROLL_PAYMENT',sourceId:batchId,direction:'OUTBOUND',state:'PENDING',amount:'100.00',currencyCode:'XAF',occurredAt:new Date(),idempotencyKey:stamp+'-'+locale,payloadHash:'synthetic'}});
  const batch=await db.payrollPaymentBatch.create({data:{...scope,id:batchId,payrollRunId:template.payrollRunId,batchNumber:stamp+'-'+locale,status:'RELEASED',method:'BANK_TRANSFER',amount:'100.00',currency:'XAF',paymentDate:new Date(),requestedById:template.requestedById,releasedById:template.releasedById,ledgerPostingBatchId:template.ledgerPostingBatchId,postedBusinessEventId:template.postedBusinessEventId,metadata:{...template.metadata,...Object.fromEntries(Object.keys(template.metadata).filter(k=>k.startsWith('settlement:')).map(k=>[k,null]))}}});

  const now=new Date(),first={...scope,payrollPaymentBatchId:batch.id,actorId:actor.id,actorPermissions:permissions,lastAuthAt:now,now,settlementStatus:'partially_settled',settlementAmount:'30.00',statementFileHash:'synthetic-first-'+locale,evidenceHash:'synthetic-first-'+locale,sourceRegisterHash:'synthetic',idempotencyKey:stamp+'-first-'+locale};

  const rail=await db.paymentRail.findFirstOrThrow();
  const provider=await db.providerAccount.create({data:{...scope,paymentRailId:rail.id,providerCode:stamp+locale,displayName:'Owned synthetic statement provider',externalAccountHash:stamp+locale}});
  const file=await db.statementFile.create({data:{...scope,providerAccountId:provider.id,sourceType:'OWNED_SYNTHETIC',fileHash:stamp+locale,periodStart:now,periodEnd:now}});
  const line=await db.statementLine.create({data:{...scope,providerAccountId:provider.id,statementFileId:file.id,fingerprint:stamp+locale,amount:'10.00',currencyCode:'XAF',occurredAt:now,direction:'DEBIT',rawLineHash:stamp+locale}});
  const gap=await db.paymentException.create({data:{...scope,paymentTransactionId:transaction.id,sourceType:'PAYROLL_PAYMENT',sourceId:batch.id,type:'MISSING_STATEMENT_LINE'}});
  const match=await db.matchRecord.create({data:{...scope,paymentTransactionId:transaction.id,statementLineId:line.id,providerAccountId:provider.id,rule:'MANUAL',status:'APPROVED',amountMatched:'10.00',currencyCode:'XAF',metadata:{syntheticApprovalFixture:true}}});
  first.matchRecordId=match.id;
  assert.equal((await db.payrollPaymentBatch.findUniqueOrThrow({where:{id:batch.id}})).paymentTransactionId,null);
  const read=await getRead({...scope,payrollPaymentBatchId:batch.id,actorId:actor.id,actorPermissions:permissions},db);assert.equal(read.batches[0].settlement.remainingAmount,'100.00');assert.ok(read.batches[0].settlement.canRecord);assert.equal(read.batches[0].matches[0].id,match.id);assert.equal((await db.payrollPaymentBatch.findUniqueOrThrow({where:{id:batch.id}})).paymentTransactionId,null);
  await assert.rejects(record({...first,idempotencyKey:stamp+'-stale-'+locale,evidenceHash:'new',expectedBalanceEventId:'stale'},db),/balance changed/);
  const redacted=await getRead({...scope,payrollPaymentBatchId:batch.id,actorId:actor.id,actorPermissions:['payments.reconciliation.read']},db);assert.equal(redacted.batches[0].settlement.remainingAmount,null);assert.equal(redacted.batches[0].settlement.canRecord,false);
  const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},reducedMotion:'reduce'});let loseNext=false,lostAfterServer=false;
  await context.route('**/*',async route=>{if(new URL(route.request().url()).origin!==base)return route.abort();if(loseNext&&route.request().headers()['next-action']){loseNext=false;const response=await route.fetch({timeout:120000});const body=await response.text();result.actionDiagnostic={status:response.status(),codes:[...body.matchAll(/"code":"([A-Z_]+)"/g)].map(m=>m[1]),errors:[...body.matchAll(/"error":"([^"\r\n]+)"/g)].map(m=>f.safe(m[1],secrets))};lostAfterServer=true;return route.abort('failed');}return route.continue();});
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password},timeout:60000})).status(),200);
  page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));result.stage=locale+' load';await page.goto(base+'/'+locale+'/dashboard/payroll/payments',{waitUntil:'domcontentloaded',timeout:180000});
  const row=page.getByRole('row').filter({hasText:batch.batchNumber}),form=row.getByRole('form');await expect(form).toBeVisible();
  const label=locale==='fr'?{amount:'Montant du règlement',status:'État du règlement',register:'Empreinte du registre source',evidence:'Empreinte de la preuve',statement:'Empreinte du fichier de relevé',submit:'Enregistrer la preuve de règlement',retry:'Réessayer la même demande',adopt:'Examiner et utiliser le solde actualisé'}:{amount:'Settlement amount',status:'Settlement status',register:'Source register hash',evidence:'Evidence hash',statement:'Statement file hash',submit:'Record settlement proof',retry:'Retry the same request',adopt:'Review and use refreshed balance'};
  await expect(form.getByLabel(label.amount,{exact:true})).toHaveValue('100.00');
  await form.getByRole('combobox',{name:new RegExp(label.status)}).selectOption('partially_settled');await form.getByLabel(label.amount,{exact:true}).fill('10.00');await form.getByLabel(label.register,{exact:true}).fill('synthetic-register');await form.getByLabel(label.evidence,{exact:true}).fill('synthetic-browser-'+stamp+locale);await form.getByLabel(label.statement,{exact:true}).fill('synthetic-statement-'+stamp+locale);
  const events=()=>db.businessEvent.count({where:{...scope,sourceId:batch.id,eventType:'payroll.payment_batch.reconciled'}});
  result.stage=locale+' fresh authentication';await form.getByRole('button',{name:label.submit,exact:true}).click();
  const passwordField=form.getByLabel(locale==='fr'?'Mot de passe actuel':'Current password',{exact:true});await expect(passwordField).toBeVisible();assert.equal(await events(),0);
  await passwordField.fill(password);await form.getByRole('button',{name:locale==='fr'?'S’authentifier':'Authenticate',exact:true}).click();
  await expect(form.getByRole('status')).toContainText(locale==='fr'?'Authentification confirmée':'Authentication confirmed');assert.equal(await events(),0);
  result.stage=locale+' lost acknowledgement';loseNext=true;await form.getByRole('button',{name:label.submit,exact:true}).click();await expect(form.getByRole('button',{name:label.retry,exact:true})).toBeVisible();assert.ok(lostAfterServer);await expect(form.getByLabel(label.amount,{exact:true})).toBeDisabled();
  assert.equal(await events(),1);
  assert.equal((await db.paymentException.findUniqueOrThrow({where:{id:gap.id}})).status,'RESOLVED');
  await form.getByRole('button',{name:label.retry,exact:true}).click();await expect(form.getByRole('button',{name:label.adopt,exact:true})).toBeVisible();assert.equal(await events(),1);
  await form.getByRole('button',{name:label.adopt,exact:true}).click();await expect(form.getByLabel(label.amount,{exact:true})).toHaveValue('90.00');await expect(form.getByLabel(label.evidence,{exact:true})).toHaveValue('');
  const screenshot='settlement-linkage-'+stamp+'-'+locale+'.png';await form.scrollIntoViewIfNeeded();assert.ok(await form.evaluate(el=>el.scrollWidth<=el.clientWidth+1));await form.screenshot({path:path.join(__dirname,screenshot),animations:'disabled'});
  await db.role.update({where:{id:role.id},data:{permissions:permissions.filter(p=>p!=='payroll.payments.reconcile')}});await page.reload({waitUntil:'domcontentloaded',timeout:180000});await expect(row.getByRole('form')).toHaveCount(0);assert.equal(await events(),1);assert.deepEqual(errors,[]);
  result.checks.push({locale,legacySourceLinkedEvidenceWithoutReadBackfill:true,releasedEvidenceGapWithApprovedMatch:true,defaultRemainder:true,staleRevisionDenied:true,redactedBalance:true,freshAuthentication:true,noAutomaticSettlementAfterAuthentication:true,lostAcknowledgementReplay:true,eventCount:1,explicitUpdatedBalanceReview:true,writePermissionRevoked:true,noFormOverflow:true,noPageErrors:true,screenshot});await context.close();console.log(locale+' settlement linkage passed');
 }
 result.passed=true;
}
main().catch(async e=>{result.passed=false;result.error=f.safe(e,secrets);process.exitCode=1;if(page&&!page.isClosed()){result.failureScreenshot='settlement-linkage-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failureScreenshot),fullPage:true}).catch(()=>{});}}).finally(async()=>{await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);if(!result.sourceStable){result.passed=false;process.exitCode=1;}const file='settlement-linkage-browser-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed,stage:result.stage,error:result.error}));await db.$disconnect();});
