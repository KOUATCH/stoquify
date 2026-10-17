// Synthetic financial populations; real reconciliation, assessment and export.
// No live customer, real payment, fabricated professional approval or certificate.
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,root,helper}=f;
const {reconcileInventoryClass3}=require(path.join(root,'services/inventory/inventory-reconciliation.service.ts'));
const {runCloseAssurance}=require(path.join(root,'services/accounting/close-assurance.service.ts'));
const {exportClosePack,recordCloseCertificationInvalidation}=require(path.join(root,'services/accounting/close-assurance-pack.service.ts'));
const stamp=crypto.randomUUID(),files=['services/inventory/inventory-reconciliation.service.ts','services/accounting/close-assurance.service.ts','services/accounting/close-assurance-pack.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));const result={at:new Date().toISOString(),syntheticOnly:true,sourceBefore:hashes(),checks:[]};
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const org=await db.organization.create({data:{name:helper.prefix+'Inventory freshness '+stamp,slug:'inventory-freshness-'+stamp,currency:'XOF'}}),scope={organizationId:org.id};
 const actor=await db.user.create({data:{...scope,email:'inventory-freshness-'+stamp+'@example.invalid',isActive:true}});
 const startDate=new Date('2026-09-01T00:00:00Z'),endDate=new Date('2026-09-30T23:59:59.999Z');
 const year=await db.fiscalYear.create({data:{...scope,name:'Owned year',startDate,endDate}}),period=await db.accountingPeriod.create({data:{...scope,fiscalYearId:year.id,periodNumber:1,name:'Owned freshness period',startDate,endDate}});
 const item=await db.item.create({data:{...scope,sku:'OWNED',slug:'owned-'+stamp,nameEn:'Owned fixture item',imageUrls:[]}}),location=await db.location.create({data:{...scope,code:'OWNED',name:'Owned fixture location'}});
 const input={...scope,periodId:period.id,currency:'XOF'};
 async function assess(){await runCloseAssurance(org.id,{periodId:period.id},{actorId:actor.id});return db.closeRun.findFirstOrThrow({where:{...scope,periodId:period.id,runById:actor.id},orderBy:{createdAt:'desc'}})}
 async function draft(run){const before=await f.hash(await db.journalEntry.findMany({where:scope}));const exported=await exportClosePack(org.id,{closeRunId:run.id,mode:'DRAFT_NOT_CERTIFIED'},{actorId:actor.id,actorPermissions:['accounting.close.export']});assert.equal(exported.isCertified,false);assert.equal(await f.hash(await db.journalEntry.findMany({where:scope})),before);return JSON.parse(exported.content)}
 const first=await reconcileInventoryClass3(input,db),second=await reconcileInventoryClass3(input,db);
 assert.notEqual(first.reportHash,second.reportHash);assert.equal(first.evidenceHash,second.evidenceHash);assert.equal(first.evidenceHashVersion,1);
 result.checks.push({name:'observation-time-changes-without-source-change',passed:true,firstReportHash:first.reportHash,secondReportHash:second.reportHash,evidenceHash:first.evidenceHash});
 const saved=await assess(),initialDraft=await draft(saved);
 assert.equal(saved.metadata.inventoryValuationAnnex.sourceHash,first.evidenceHash);assert.equal(saved.metadata.inventoryValuationAnnex.evidenceHashVersion,1);assert.equal(initialDraft.annexes.inventoryValuation.freshness.status,'FRESH');
 assert.ok(initialDraft.export.certificationBlockers.some(text=>text.includes('payroll')));result.checks.push({name:'actual-assessment-and-draft-export-non-XAF-fresh',passed:true,runId:saved.id,remainingBlockers:initialDraft.export.certificationBlockers});
 // Append a later-recorded, backdated, net-zero pair. This is adversarial source
 // fixture setup, not an operational inventory/ledger posting workflow.
 const recordedAt=new Date(),effectiveAt=new Date('2026-09-10T12:00:00Z');
 const rows=await db.inventoryTransaction.createMany({data:[
  {...scope,itemId:item.id,locationId:location.id,type:'TRANSFER_IN',quantity:'1',unitCost:'100',totalCost:'100',balanceAfter:'1',effectiveAt,recordedAt,timeProvenance:'EXPLICIT_SOURCE_TIME',notes:'Synthetic freshness source; no operational posting claim'},
  {...scope,itemId:item.id,locationId:location.id,type:'TRANSFER_OUT',quantity:'-1',unitCost:'100',totalCost:'100',balanceAfter:'0',effectiveAt,recordedAt,timeProvenance:'EXPLICIT_SOURCE_TIME',notes:'Synthetic freshness source; no operational posting claim'},
 ]});assert.equal(rows.count,2);
 const changed=await reconcileInventoryClass3(input,db);assert.equal(changed.inventoryValue,first.inventoryValue);assert.equal(changed.ledgerClass3Value,first.ledgerClass3Value);assert.equal(changed.status,'PASSED');assert.notEqual(changed.evidenceHash,first.evidenceHash);
 const staleDraft=await draft(saved);assert.equal(staleDraft.annexes.inventoryValuation.freshness.status,'STALE');result.checks.push({name:'later-recorded-backdated-net-zero-source-invalidates-old-annex',passed:true,evidenceHash:changed.evidenceHash});
 const refreshed=await assess();assert.equal((await draft(refreshed)).annexes.inventoryValuation.freshness.status,'FRESH');result.checks.push({name:'new-assessment-recovers-after-source-change',passed:true,runId:refreshed.id});
 // Future effective records do not enter this period's population.
 await db.inventoryTransaction.create({data:{...scope,itemId:item.id,locationId:location.id,type:'INITIAL_STOCK',quantity:'1',unitCost:'99',totalCost:'99',balanceAfter:'1',effectiveAt:new Date('2026-10-05T12:00:00Z'),recordedAt:new Date(),timeProvenance:'EXPLICIT_SOURCE_TIME',notes:'Synthetic out-of-period source'}});
 assert.equal((await reconcileInventoryClass3(input,db)).evidenceHash,changed.evidenceHash);result.checks.push({name:'future-effective-source-excluded-from-prior-period',passed:true});
 await recordCloseCertificationInvalidation(org.id,{closeRunId:refreshed.id,sourceModel:'InventoryValuationAnnex',sourceId:period.id,sourceEventName:'inventory.valuation.annex.checked',staleReason:'Synthetic retained invalidation'},{actorId:actor.id});
 const retained=await db.closeRun.findUniqueOrThrow({where:{id:refreshed.id}});assert.equal(retained.metadata.staleState.status,'EVIDENCE_STALE');
 const invalidatedDraft=await draft(retained);assert.ok(invalidatedDraft.export.certificationBlockers.some(text=>text.includes('A recorded change invalidated close certification evidence.')));
 const {getProofTrail}=require(path.join(root,'services/evidence/proof-trail.service.ts'));assert.equal((await getProofTrail({...scope,subjectType:'close.run',subjectId:refreshed.id},db)).evidenceGrade,'blocked');result.checks.push({name:'recorded-invalidation-remains-effective',passed:true});
 const legacy=await db.closeRun.create({data:{...scope,periodId:period.id,status:'READY',metadata:{...saved.metadata,inventoryValuationAnnex:{...saved.metadata.inventoryValuationAnnex,evidenceHashVersion:null}}}});
 await db.closeEvidenceItem.create({data:{...scope,periodId:period.id,closeRunId:legacy.id,evidenceType:'JOURNAL_ENTRY',sourceType:'InventoryValuationAnnex',sourceLabel:'Synthetic legacy inventory annex',sourceHash:first.reportHash,available:true}});
 const legacyDraft=await draft(legacy);assert.equal(legacyDraft.annexes.inventoryValuation.freshness.status,'MISSING');assert.ok(legacyDraft.export.certificationBlockers.some(text=>text.includes('regenerated')));result.checks.push({name:'legacy-annex-requires-new-assessment',passed:true});
 assert.equal(await db.journalEntry.count({where:scope}),0);assert.equal(await db.payment.count({where:scope}),0);assert.equal(await db.closePackExport.count({where:{...scope,isCertified:true}}),0);
 result.fixture={organizationId:org.id,actorId:actor.id,periodId:period.id,initialRunId:saved.id,refreshedRunId:refreshed.id,legacyRunId:legacy.id};result.passed=true;
}
main().catch(error=>{result.passed=false;result.error=f.safe(error)}).finally(async()=>{result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=!!result.passed&&result.sourceStable;const file='inventory-close-freshness-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,...result}));await db.$disconnect();process.exit(result.passed?0:1)});
