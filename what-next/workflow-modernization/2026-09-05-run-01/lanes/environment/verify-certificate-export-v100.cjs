const f=require('./certificate-export-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const run=crypto.randomUUID().slice(0,12),organizations=[],files=['services/reconciliation/payment-reconciliation-certification.service.ts','services/reconciliation/reconciliation-certificate-export.contracts.ts','actions/payments/reconciliation.actions.ts'];
const sources=()=>Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,p))).digest('hex')]));
const tables=['reconciliationRun','paymentReconciliationInboxItem','journalEntry','ledgerPostingBatch'];
const snapshot=async where=>f.hash(await Promise.all(tables.map(n=>db[n].findMany({where,orderBy:{id:'asc'}}))));
const report={at:new Date().toISOString(),run,sourcesBefore:sources(),checks:[],scope:'Owned synthetic provider setup/internal payment; actual HMAC capture, matching, independent sign service and export. No external provider, payment or statutory approval.'};
const exportFile=command=>f.certification.exportReconciliationCertificate(command);
(async()=>{
 await f.local.withClient(f.target,f.local.assertOwned);report.originalBefore=await snapshot({organizationId:{notIn:organizations}});
 const x=await f.fixture('certificate-export-v100-'+run,organizations),command={...f.context(x),expectedCertificateHash:x.run.certificateHash,idempotencyKey:crypto.randomUUID()};
 report.checks.push('Actual provider capture and matching produce ready run; independent sign service issues source-bound certificate');
 const financial=()=>snapshot({organizationId:x.organizationId}),before=await financial();
 for(const denied of [
  {...command,control:{...command.control,actorPermissions:['payments.reconciliation.read']}},
  {...command,control:{...command.control,actorPermissions:['payments.reconciliation.certificate.export']}},
  {...command,control:{...command.control,lastAuthAt:new Date(Date.now()-600000)}},
  {...command,organizationId:'foreign-tenant'}, {...command,exportedById:'foreign-actor'},
  {...command,runId:'foreign-object'}, {...command,expectedCertificateHash:'0'.repeat(64)},
 ]) await assert.rejects(()=>exportFile(denied));
 assert.equal(await financial(),before);report.checks.push('Missing read/export permission, expired auth, foreign tenant/actor/object and stale preview produce no export or financial effects');
 await db.user.update({where:{id:x.actorId},data:{isActive:false}});
 try{await assert.rejects(()=>exportFile(command),/active workspace actor/i)}finally{await db.user.update({where:{id:x.actorId},data:{isActive:true}})}
 report.checks.push('Inactive actor cannot issue an export');
 const first=await exportFile(command),body=JSON.parse(first.content),receipt=await db.paymentReconciliationInboxItem.findUniqueOrThrow({where:{id:first.inboxItemId}});
 assert.equal(first.sha256,crypto.createHash('sha256').update(first.content).digest('hex'));assert.deepEqual(body.certificate,x.run.certificatePayload);assert.equal(body.export.receiptId,receipt.id);assert.equal(receipt.payloadSummary.result.content,first.content);assert.equal(first.replayed,false);
 report.checks.push('Actual signed certificate and immutable receipt retain exact UTF-8 bytes and SHA-256; receipt is embedded in file');
 const auditWhere={organizationId:x.organizationId,action:'PAYMENT_RECONCILIATION_CERTIFICATE_EXPORT'},eventWhere={organizationId:x.organizationId,eventType:'payment.reconciliation.certificate.exported'};
 const auditCount=await db.ledgerAuditEvent.count({where:auditWhere}),eventCount=await db.businessEvent.count({where:eventWhere});
 const replay=await exportFile({...command,control:{...command.control,now:new Date(Date.now()+1000)},correlationId:'new-transport-'+run});
 assert.equal(replay.replayed,true);assert.equal(replay.content,first.content);assert.equal(replay.inboxItemId,first.inboxItemId);assert.deepEqual(await db.paymentReconciliationInboxItem.findUniqueOrThrow({where:{id:receipt.id}}),receipt);
 assert.equal(await db.ledgerAuditEvent.count({where:auditWhere}),auditCount);assert.equal(await db.businessEvent.count({where:eventWhere}),eventCount);
 report.checks.push('Same request returns original bytes, receipt and timestamp despite new transport metadata; no repeat issuance audit/event');
 await assert.rejects(()=>exportFile({...command,exportedById:x.checkerId}),e=>e.code==='IDEMPOTENCY_CONFLICT');
 const next=await exportFile({...command,idempotencyKey:crypto.randomUUID()});assert.notEqual(next.inboxItemId,first.inboxItemId);assert.notEqual(next.content,first.content);assert.deepEqual(await db.paymentReconciliationInboxItem.findUniqueOrThrow({where:{id:receipt.id}}),receipt);
 report.checks.push('Another actor cannot reuse request identity; intentional new request has separate receipt and preserves prior evidence');
 for(const mutate of [summary=>({...summary,unexpected:'changed'}),summary=>({...summary,result:{...summary.result,content:'tampered'}})]){
  const summary=mutate(receipt.payloadSummary);await db.paymentReconciliationInboxItem.update({where:{id:receipt.id},data:{payloadSummary:summary}});
  try{await assert.rejects(()=>exportFile(command),/review/i)}finally{await db.paymentReconciliationInboxItem.update({where:{id:receipt.id},data:{payloadSummary:receipt.payloadSummary}})}
 }
 report.checks.push('Malformed or modified retained export is refused on retry');
 const beforeFault=await financial(),real=db.$transaction.bind(db);
 db.$transaction=(work,options)=>real(tx=>work(new Proxy(tx,{get(target,key){if(key!=='ledgerAuditEvent')return target[key];return new Proxy(target.ledgerAuditEvent,{get(model,method){if(method!=='create')return model[method];return args=>{if(args.data.action==='PAYMENT_RECONCILIATION_CERTIFICATE_EXPORT')throw new Error('OWNED_CERTIFICATE_EXPORT_AUDIT_FAILURE');return model.create(args)}}})}})),options);
 try{await assert.rejects(()=>exportFile({...command,idempotencyKey:crypto.randomUUID()}),/OWNED_CERTIFICATE_EXPORT_AUDIT_FAILURE/)}finally{db.$transaction=real}
 assert.equal(await financial(),beforeFault);report.checks.push('Late issuance audit failure rolls back the receipt and retained bytes');
 const concurrent={...command,idempotencyKey:crypto.randomUUID()},results=await Promise.allSettled([exportFile(concurrent),exportFile(concurrent)]);
 assert.ok(results.some(r=>r.status==='fulfilled'));for(const result of results)if(result.status==='rejected')assert.equal(result.reason.code,'CONFLICT');
 assert.equal(await db.paymentReconciliationInboxItem.count({where:{organizationId:x.organizationId,idempotencyKey:'reconciliation-certificate-export:'+concurrent.idempotencyKey}}),1);assert.equal((await exportFile(concurrent)).replayed,true);
 report.checks.push('Concurrent duplicate submission issues one durable receipt and can replay safely');
 await db.providerAccount.update({where:{id:x.provider.id},data:{status:'SUSPENDED'}});
 try{assert.equal((await exportFile(command)).content,first.content)}finally{await db.providerAccount.update({where:{id:x.provider.id},data:{status:'ACTIVE'}})}
 report.checks.push('Suspended provider does not prevent authorized retained signed-evidence retrieval');
 await db.reconciliationRun.update({where:{id:x.run.id},data:{certificatePayload:{...x.run.certificatePayload,tampered:true}}});
 try{await assert.rejects(()=>exportFile(command),/hash drift/i)}finally{await db.reconciliationRun.update({where:{id:x.run.id},data:{certificatePayload:x.run.certificatePayload}})}
 const payment=await db.paymentTransaction.findUniqueOrThrow({where:{id:x.payment.id}});await db.paymentTransaction.update({where:{id:payment.id},data:{amount:'100.26'}});
 try{await assert.rejects(()=>exportFile(command),/source evidence drift/i)}finally{await db.paymentTransaction.update({where:{id:payment.id},data:{amount:payment.amount}})}
 assert.equal((await exportFile(command)).content,first.content);report.checks.push('Certificate tampering and changed source amount block even replay; restored evidence reuses original file');
 report.passed=true;
})().catch(e=>{report.error=f.safe(e,[])}).finally(async()=>{
 report.originalUnchanged=report.originalBefore===await snapshot({organizationId:{notIn:organizations}});report.sourcesAfter=sources();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);await db.$disconnect();
 const file='certificate-export-v100-'+run+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({file,passed:report.passed,checks:report.checks,error:report.error,sourceStable:report.sourceStable,originalUnchanged:report.originalUnchanged}));
 process.exit(report.passed&&report.sourceStable&&report.originalUnchanged?0:1);
});
