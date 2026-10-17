"use strict";
// Inert without --run. Only the existing guarded, owned loopback database.
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const load = file => require(path.join(root, file)), service = load('services/accounting/close-assurance.service.ts');
  const workflow = load('services/accounting/close-evidence-workflow.service.ts'), payment = load('services/reconciliation/payment-reconciliation-dashboard.service.ts');
  const dbModule = load('prisma/db.ts'), { getModuleCatalog } = load('services/modules/module-catalog.service.ts');
  const { assertDisposableDatabaseIdentity } = load('scripts/disposable-fixture-guard.js');
  const run = crypto.randomUUID(), before = process.argv.includes('--before'), secrets = [], sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const files = [__filename, ...Object.keys(require.cache).filter(file => file.startsWith(root + path.sep) && !file.includes(path.sep + 'node_modules' + path.sep) && !file.includes(path.sep + '.auth' + path.sep) && /\.(ts|js|cjs)$/.test(file))];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries(files.map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), mode: before ? 'before-defect-reproduction' : 'after-verification', checks: [], limitations: ['Owned synthetic fixture only; no migration, seed command, reset, real payment, live activation or external delivery.', 'Assignment authority is exercised through the domain writer; this receipt does not certify every assignment action/access boundary.'] };
  const outside = async () => ({ hash: f.hash({ base: await h.outside(), comments: await db.accountantComment.findMany({ where: { organizationId: { notIn: h.organizations } }, orderBy: { id: 'asc' } }), sessions: await db.session.findMany({ where: { user: { organizationId: { notIn: h.organizations } } }, orderBy: { id: 'asc' } }) }) });
  const check = async (name, work) => { const row = { name }; report.checks.push(row); try { row.result = await work(); row.passed = true; } catch(error) { row.error = f.safe(error, secrets); row.passed = false; throw error; } console.log(JSON.stringify({ name, passed: row.passed })); };
  try {
    const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), 'stoquify_local_registration_20260906_01'); assert.ok(['localhost','127.0.0.1'].includes(target.hostname));
    await helper.withClient(target, helper.assertOwned); await assertDisposableDatabaseIdentity(db, helper.database);
    report.sourceBefore = sources(); report.outsideBefore = await outside();
    const x = await h.fixture('request-assign-' + run.slice(0,8)); report.fixture = x.info;
    const scope = { organizationId: x.organizationId }, ids = x.info.actorIds, modules = getModuleCatalog().map(row => row.slug), controls = {};
    await db.tenantModuleConfiguration.create({ data: { ...scope, manifestHash: 'synthetic-' + run, selectedModules: modules, activeModules: modules } });
    await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ ...scope, moduleSlug, status: 'active', source: 'requested_modules', metadata: { syntheticFixture: true } })) });
    for (const [who, permission] of [['maker','accounting.close.evidence.request'],['checker','accounting.close.finding.comment'],['certifier','accounting.close.accountant.review']]) {
      await db.role.create({ data: { ...scope, code: 'assignment-' + who, nameEn: 'Synthetic ' + who, permissions: [permission, 'accounting.close.finding.assign', ...(who === 'certifier' ? ['accounting.close.finding.comment'] : [])], users: { connect: { id: ids[who] } } } });
      const token = crypto.randomBytes(32).toString('hex'); secrets.push(token); const session = await db.session.create({ data: { userId: ids[who], token, expiresAt: new Date(Date.now()+3600000) } }); controls[who] = { actorId: ids[who], session: { id: session.id, token } };
    }
    report.financialBefore = await h.financial();
    const actor = who => ({ ...scope, actorId: ids[who] });
    const newFinding = async label => {
      const original = payment.getPaymentReconciliationDashboardData; let adverse;
      try { payment.getPaymentReconciliationDashboardData = async () => { throw Error('Explicit synthetic collector failure'); }; adverse = await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: label + run }, controls.maker); }
      finally { payment.getPaymentReconciliationDashboardData = original; }
      const finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { ...scope, closeRunId: adverse.run.id, checklistItem: { key: 'payment-reconciliation' } } });
      await service.runCloseAssurance(x.organizationId, { periodId: x.periodId, correlationId: label + '-restored-' + run }, controls.maker); return finding;
    };
    const request = finding => service.requestMissingCloseEvidence(x.organizationId, { findingId: finding.id, requestedFromId: ids.checker, requestText: 'Review the retained missing reconciliation evidence.', dueAt: new Date(Date.now()+86400000), correlationId: 'request-' + finding.id }, controls.maker);
    const assign = (finding, who) => service.assignCloseFinding(x.organizationId, { findingId: finding.id, assignedToId: ids[who], correlationId: 'assign-' + finding.id }, controls.maker);
    const response = (record, who) => service.respondToMissingCloseEvidence(x.organizationId, { requestId: record.id, responseText: 'Collector restored; review the retained current source.', correlationId: 'response-' + record.id + who }, controls[who]);
    const state = async () => {
      const result = {}; for (const model of ['closeAssuranceFinding','accountantComment','ledgerAuditEvent','businessEvent','businessEventOutbox','businessEventAudit']) result[model] = f.hash(await db[model].findMany({ where: scope, orderBy: { id:'asc' } })); return result;
    };
    await check('Pending request cannot be stranded by generic reassignment', async () => {
      const finding = await newFinding('pending'), record = await request(finding), prior = await state();
      if (before) {
        await assign(finding,'certifier');
        for (const who of ['checker','certifier']) { const view = await workflow.getCloseEvidenceWorkflow(actor(who),x.periodId); assert.equal(view.requests.some(row => row.requestId === record.id),false); await assert.rejects(response(record,who),error => error.code === 'FORBIDDEN'); }
        return { defectReproduced:true, originalAndNewOwnerCannotRespond:true };
      }
      await assert.rejects(assign(finding,'certifier'),error => error.code === 'CONFLICT'); assert.deepEqual(await state(),prior);
      const view = await workflow.getCloseEvidenceWorkflow(actor('checker'),x.periodId); assert.ok(view.requests.some(row => row.requestId === record.id)); await response(record,'checker');
      return { refusedWithoutEffects:true, originalRecipientStillResponds:true };
    });
    await check('Submitted response cannot be reset by assigning the same owner', async () => {
      const finding = await newFinding('submitted'), record = await request(finding); await response(record,'checker'); const prior = await state();
      if (before) { await assign(finding,'checker'); const view=await workflow.getCloseEvidenceWorkflow(actor('certifier'),x.periodId); assert.equal(view.reviews.some(row=>row.request.requestId===record.id),false); return { defectReproduced:true, submittedResponseAbsentFromReview:true }; }
      await assert.rejects(assign(finding,'checker'),error=>error.code==='CONFLICT'); assert.deepEqual(await state(),prior);
      const detail=await workflow.getCloseEvidenceReview(actor('certifier'),record.id); assert.equal(detail.item.request.requestId,record.id); return { refusedWithoutEffects:true, reviewStillReachable:true };
    });
    await check('Request committed during assignment is preserved after serialization retry', async () => {
      const finding = await newFinding('overlap'); let entered, release, timer, paused=false, assignmentReads=0;
      const enteredGate=new Promise(resolve=>{entered=resolve;}), releaseGate=new Promise((resolve,reject)=>{release=resolve;timer=setTimeout(()=>reject(Error('Assignment overlap barrier timed out')),15000);}); releaseGate.catch(()=>{});
      const originalDb=dbModule.db;
      dbModule.db=new Proxy(db,{get(target,property){if(property!=='$transaction')return Reflect.get(target,property);return(work,options)=>target.$transaction(tx=>work(new Proxy(tx,{get(client,model){if(model!=='closeAssuranceFinding')return Reflect.get(client,model);return new Proxy(client.closeAssuranceFinding,{get(delegate,method){if(method!=='findFirst')return Reflect.get(delegate,method);return async args=>{const value=await delegate.findFirst(args);if(args.where.id===finding.id&&args.include?.closeRun){assignmentReads++;if(!paused){paused=true;entered();await releaseGate;}}return value;};}});}})),options);}});
      const pending=assign(finding,'certifier').then(value=>({value}),error=>({error})); let result,record;
      try { await Promise.race([enteredGate,releaseGate]); record=await request(finding); release(); result=await pending; }
      finally { release();clearTimeout(timer);dbModule.db=originalDb; }
      const retained=await db.closeAssuranceFinding.findUniqueOrThrow({where:{id:finding.id}});
      if(before){assert.ok(result.value);assert.equal(retained.ownerId,ids.certifier);return{defectReproduced:true,requestCommittedBeforeAssignment:true,ownerOverwritten:true};}
      assert.equal(result.error?.code,'CONFLICT');assert.equal(retained.ownerId,ids.checker);
      assert.equal(await db.ledgerAuditEvent.count({where:{...scope,action:'CLOSE_FINDING_ASSIGNED',resourceId:finding.id}}),0);
      assert.ok(assignmentReads>=2);await response(record,'checker');return{overlappingRequestPreserved:true,assignmentRefused:true,noAssignmentAudit:true,assignmentReads};
    });
    await check('Ordinary finding assignment without a request remains available',async()=>{const finding=await newFinding('ordinary');const updated=await assign(finding,'checker');assert.equal(updated.ownerId,ids.checker);assert.equal(await db.ledgerAuditEvent.count({where:{...scope,action:'CLOSE_FINDING_ASSIGNED',resourceId:finding.id}}),1);return{assigned:true,auditEvents:1};});
  } catch(error) { report.error=f.safe(error,secrets); }
  finally {
    try{report.sourceAfter=sources();report.sourceStable=f.hash(report.sourceBefore)===f.hash(report.sourceAfter);report.outsideAfter=await outside();report.outsideUnchanged=report.outsideBefore?.hash===report.outsideAfter.hash;report.financialAfter=await h.financial();report.financialUnchanged=f.hash(report.financialBefore)===f.hash(report.financialAfter);}catch(error){report.finalizationError=f.safe(error,secrets);}
    await db.$disconnect();report.passed=report.checks.length===4&&report.checks.every(row=>row.passed)&&report.sourceStable&&report.outsideUnchanged&&report.financialUnchanged&&!report.error&&!report.finalizationError;
    const filename=path.join(__dirname,'close-request-assignment-'+run+'.json');fs.writeFileSync(filename,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({filename,passed:report.passed,error:report.error}));
  }
  return report;
}
if(require.main===module&&process.argv[2]==='--run')main().then(report=>process.exit(report.passed?0:1)).catch(error=>{console.error(error.code||error.name);process.exit(1);});
