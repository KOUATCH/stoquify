const f=require('./fixtures.cjs'),{db,fs,path,assert}=f,output=__dirname;
const report={startedAt:new Date().toISOString(),target:f.helper.database,synthetic:true,liveProvider:false,checks:[]};
async function check(name,work){await work();report.checks.push({name,status:'PASS'});console.log('PASS '+name)}
async function rejected(work){await assert.rejects(work,e=>['FORBIDDEN','BUSINESS_RULE','BUSINESS_RULE_VIOLATION','CONFLICT','NOT_FOUND'].includes(e.code))}
(async()=>{
 if(!fs.existsSync(path.join(output,'source-before.json')))fs.writeFileSync(path.join(output,'source-before.json'),JSON.stringify(f.sources(),null,2));
 const x=await f.fixture(),[a,b]=x.clients,ea=await f.evidence(x,a,'A'),eb=await f.evidence(x,b,'B');
 report.fixtureOrganizations=[x.firm.id,a.client.id,b.client.id];
 await check('two-client authorized projection and private bodies excluded',async()=>{const list=await f.desk.getAccountantWorkDesk(x.context);assert.equal(list.items.length,2);assert.equal(list.clientsRead,2);assert.ok(!JSON.stringify(list).includes('Synthetic statement supplied'));assert.ok(!JSON.stringify(list).includes(a.recipient.id))});
 await check('cross-client request cannot be opened',()=>rejected(()=>f.desk.getAccountantWorkDetail(x.context,b.client.id,ea.request.id)));
 await check('expired and revoked mandates fail current reads and acceptance',async()=>{
  for(const change of [{expiresAt:new Date(Date.now()-1000)},{status:'REVOKED',activeScopeKey:null}]){
   await db.accountantAccessGrant.update({where:{id:a.grant.id},data:change});
   try{await rejected(()=>f.desk.getAccountantWorkDetail(x.context,a.client.id,ea.request.id));await rejected(()=>f.close.acceptMissingCloseEvidenceResponse(x.firm.id,f.command(a,ea),f.control(x)));assert.equal((await f.desk.getAccountantWorkDesk(x.context)).items.length,1)}
   finally{await db.accountantAccessGrant.update({where:{id:a.grant.id},data:{status:'ACTIVE',activeScopeKey:a.client.id+':'+x.actor.id,expiresAt:new Date(Date.now()+86400000)}})}
  }
 });
 await check('read-only mandate blocks review',async()=>{await db.accountantAccessGrant.update({where:{id:a.grant.id},data:{role:'READ_ONLY'}});try{await rejected(()=>f.desk.assertAccountantWorkClient(x.context,a.client.id,'write'))}finally{await db.accountantAccessGrant.update({where:{id:a.grant.id},data:{role:'REVIEWER'}})}});
 await check('target module denied blocks reads and acceptance preflight',async()=>{
  await db.tenantModuleGrant.update({where:{organizationId_moduleSlug:{organizationId:a.client.id,moduleSlug:'close_assurance'}},data:{endsAt:new Date(Date.now()-1000)}});
  try{await rejected(()=>f.desk.assertAccountantWorkClient(x.context,a.client.id,'read'));await rejected(()=>f.desk.assertAccountantWorkClient(x.context,a.client.id,'write'))}
  finally{await db.tenantModuleGrant.update({where:{organizationId_moduleSlug:{organizationId:a.client.id,moduleSlug:'close_assurance'}},data:{endsAt:null}})}
 });
 await check('stale identity confirmation rejects acceptance',async()=>{await assert.rejects(()=>f.close.acceptMissingCloseEvidenceResponse(x.firm.id,f.command(a,ea),{...f.control(x),freshAuth:{...f.control(x).freshAuth,lastAuthAt:new Date(Date.now()-600000)}}),e=>e.code==='FORBIDDEN'||e.code==='FRESH_AUTH_REQUIRED')});
 await check('read-only client module permits read and blocks review write',async()=>{
  const where={organizationId_moduleSlug:{organizationId:a.client.id,moduleSlug:'close_assurance'}};
  await db.tenantModuleGrant.update({where,data:{status:'read_only',readOnly:true}});
  try{await f.desk.assertAccountantWorkClient(x.context,a.client.id,'read');await rejected(()=>f.desk.assertAccountantWorkClient(x.context,a.client.id,'write'))}
  finally{await db.tenantModuleGrant.update({where,data:{status:'active',readOnly:false}})}
 });
 await check('cross-client response rejected without a new acceptance',async()=>{await assert.rejects(()=>f.close.acceptMissingCloseEvidenceResponse(x.firm.id,{...f.command(a,ea),responseId:eb.response.id},f.control(x)));assert.equal(await db.accountantComment.count({where:{organizationId:a.client.id,visibility:'ACCOUNTANT_RESPONSE_ACCEPTED'}}),0)});
 await check('unanswered request tracks notification state and rejects corrupted source',async()=>{
  const pending=await f.evidence(x,a,'pending',{respond:false}),key=`close-assurance-finding:${pending.finding.id}:missing-evidence-requested:${pending.request.correlationId}:notification`;
  const row=async()=>(await f.desk.getAccountantWorkDesk(x.context)).items.find(item=>item.requestId===pending.request.id);
  assert.equal((await row()).evidenceState,'AWAITING_RESPONSE');assert.equal((await row()).delivery,'PENDING');
  for(const status of ['FAILED','DEAD_LETTER','SENT']){await db.businessEventOutbox.updateMany({where:{organizationId:a.client.id,idempotencyKey:key},data:{status}});assert.equal((await row()).delivery,status)}
  const original=await db.accountantComment.findUniqueOrThrow({where:{id:pending.request.id}});
  await db.accountantComment.update({where:{id:original.id},data:{metadata:{...original.metadata,requestedFromId:b.recipient.id}}});
  assert.equal(await row(),undefined);assert.equal((await f.desk.getAccountantWorkDesk(x.context)).incompleteClients,1);
  await db.accountantComment.update({where:{id:original.id},data:{metadata:original.metadata}});
 });
 await check('transaction failure after acceptance insert rolls back source state',async()=>{
  const originalTransaction=db.$transaction.bind(db),command=f.command(a,ea);
  db.$transaction=(fn,options)=>originalTransaction(tx=>fn(new Proxy(tx,{get(target,property){
   if(property==='accountantComment')return new Proxy(target.accountantComment,{get(model,method){if(method==='create')return async args=>{const result=await model.create(args);if(args.data.visibility==='ACCOUNTANT_RESPONSE_ACCEPTED')throw new Error('M1 synthetic rollback injection');return result};return model[method]}});
   return target[property];
  }})),options);
  try{await assert.rejects(()=>f.close.acceptMissingCloseEvidenceResponse(x.firm.id,command,f.control(x)),/Missing-proof workflow transaction failed/)}finally{db.$transaction=originalTransaction}
  assert.equal((await db.closeAssuranceFinding.findUniqueOrThrow({where:{id:ea.finding.id}})).status,'IN_REVIEW');assert.equal(await db.accountantComment.count({where:{organizationId:a.client.id,correlationId:command.correlationId}}),0);
 });
 await check('concurrent identical commands yield one authoritative acceptance and event',async()=>{
  const command=f.command(a,ea),results=await Promise.all(Array.from({length:4},()=>f.close.acceptMissingCloseEvidenceResponse(x.firm.id,command,f.control(x))));assert.equal(new Set(results.map(r=>r.id)).size,1);
  assert.equal(await db.accountantComment.count({where:{organizationId:a.client.id,correlationId:command.correlationId}}),1);
  const eventKey=`close-assurance-missing-evidence-response:${ea.response.id}:accepted:${command.correlationId}`;
  assert.equal(await db.businessEvent.count({where:{organizationId:a.client.id,idempotencyKey:eventKey}}),1);
  assert.equal(await db.businessEventOutbox.count({where:{organizationId:a.client.id,idempotencyKey:eventKey+':notification'}}),1);
  assert.equal((await f.close.acceptMissingCloseEvidenceResponse(x.firm.id,command,f.control(x))).id,results[0].id);
  report.acceptanceId=results[0].id;
 });
 await check('concurrent distinct commands cannot accept the same response twice',async()=>{
  const results=await Promise.allSettled([f.command(b,eb),f.command(b,eb)].map(command=>f.close.acceptMissingCloseEvidenceResponse(x.firm.id,command,f.control(x))));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
  assert.equal(await db.accountantComment.count({where:{organizationId:b.client.id,findingId:eb.finding.id,visibility:'ACCOUNTANT_RESPONSE_ACCEPTED'}}),1);
 });
 report.status='PASS';
})().catch(e=>{report.status='FAIL';report.error=f.safe(e);console.error(report.error);process.exitCode=1}).finally(async()=>{report.completedAt=new Date().toISOString();report.sources=f.sources();fs.writeFileSync(path.join(output,'postgres.json'),JSON.stringify(report,null,2));await db.$disconnect()});
