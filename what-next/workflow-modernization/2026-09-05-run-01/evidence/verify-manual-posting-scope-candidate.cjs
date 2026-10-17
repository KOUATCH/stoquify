// Pure candidate contract checks. No application imports, database or active-file writes.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),ts=require('typescript');
const root=path.resolve(__dirname,'../../../..'),file=path.join(__dirname,'manual-posting-all-period-candidate.ts.txt');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),source=fs.readFileSync(file),current=path.join(root,'services/accounting/journal-posting-order.service.ts');
const before=sha(fs.readFileSync(current)),calls=[],checks=[];
const candidateExports={},context={exports:candidateExports,require(name){
  if(name==='server-only')return {};
  if(name==='@prisma/client')return {Prisma:{sql:(parts,...values)=>({parts,values})}};
  if(name==='@/services/_shared/action-errors')return {ConflictError:class ConflictError extends Error{},NotFoundError:class NotFoundError extends Error{}};
  if(name==='./accounting-period-catalog.service')return {lockAccountingPeriodCatalogInTx:async(...args)=>{calls.push(['catalog',...args])}};
  if(name==='./close-assessment-order.service')return {lockCloseAssessmentPeriodsInTx:async(...args)=>{calls.push(['periods',...args])}};
  throw Error('Unexpected import '+name);
}};
vm.runInNewContext(ts.transpileModule(source.toString(),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
async function main(){
  for(const isolation of ['repeatable read','serializable','unknown']){
    const tx={$queryRaw:async()=>[{isolationLevel:isolation}]};
    await assert.rejects(candidateExports.lockJournalPostingCatalogInTx(tx,'tenant-a'),/Read Committed/);
    await assert.rejects(candidateExports.lockJournalPostingClosePeriodsInTx(tx,'tenant-a',{periodId:'current',entryDate:new Date()}),/Read Committed/);
    assert.equal(calls.length,0);checks.push('refuses-'+isolation);
  }
  let query;
  const tx={$queryRaw:async()=>[{isolationLevel:'read committed'}],accountingPeriod:{findMany:async input=>{query=input;return [{id:'later-no-run'},{id:'current'},{id:'earlier-retained'},{id:'current'}]}}};
  await candidateExports.lockJournalPostingCatalogInTx(tx,'tenant-a');assert.equal(calls[0][1],tx);assert.equal(calls[0][2],'tenant-a');assert.equal(calls[0][3],'shared');checks.push('existing-shared-catalog-contract');
  const ids=await candidateExports.lockJournalPostingClosePeriodsInTx(tx,'tenant-a',{periodId:'current',entryDate:new Date()});
  assert.equal(JSON.stringify(query),JSON.stringify({where:{organizationId:'tenant-a'},select:{id:true},orderBy:{id:'asc'}}));
  assert.equal(JSON.stringify(ids),JSON.stringify(['current','earlier-retained','later-no-run']));
  assert.equal(calls[1][1],tx);assert.equal(calls[1][2],'tenant-a');assert.equal(JSON.stringify(calls[1][3]),JSON.stringify(ids));checks.push('tenant-filtered-complete-deduplicated-sorted-scope');
  const count=calls.length;
  await assert.rejects(candidateExports.lockJournalPostingClosePeriodsInTx(tx,'tenant-a',{periodId:'foreign',entryDate:new Date()}),/not found/);
  await assert.rejects(candidateExports.lockJournalPostingClosePeriodsInTx(tx,'tenant-a',{periodId:'current',entryDate:new Date('invalid')}),/date is unavailable/);
  assert.equal(calls.length,count);checks.push('required-period-and-invalid-date-refusal-before-locks');
  const after=sha(fs.readFileSync(current));assert.equal(before,after);assert.equal(sha(fs.readFileSync(file)),sha(source));
  const report={at:new Date().toISOString(),kind:'PURE_ISOLATED_CANDIDATE_CONTRACT',passed:true,checks,activeSourceBefore:before,activeSourceAfter:after,candidateSha256:sha(source),sourceStable:true,limitations:['Mocked contract only; no PostgreSQL contention/performance claim.','Candidate is not applied by this script.']};
  const output=path.join(__dirname,'manual-posting-scope-candidate-'+crypto.randomUUID()+'.json');fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,...report}));
}
main().catch(error=>{console.error(String(error));process.exitCode=1});
