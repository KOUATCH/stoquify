const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const service=require(path.join(f.root,'services/pos/terminal-management.service.ts'));
const stamp=crypto.randomUUID(),after=process.argv.includes('--after'),source='services/pos/terminal-management.service.ts';
const hash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,source))).digest('hex');
const report={at:new Date().toISOString(),phase:after?'after':'before',sourceBefore:hash(),checks:[],scope:'Owned local PostgreSQL actual terminal edits; no checkout/provider operation.'};
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 const organizationId='workflow_terminal_revision_'+stamp;await db.organization.create({data:{id:organizationId,name:f.helper.prefix+'Terminal revision',slug:organizationId,currency:'XAF'}});
 const location=await db.location.create({data:{organizationId,name:'Owned store',code:'OWNED'}});
 const terminal=await service.createTerminalForManagement(organizationId,{name:'Original',locationId:location.id,terminalNumber:'OWNED',hasCashDrawer:false});
 const snapshot=()=>service.getTerminalManagementDataForOrg(organizationId).then(r=>r.terminals.find(t=>t.id===terminal.id));
 const first=await snapshot(),second=await snapshot();
 await service.updateTerminalForManagement(organizationId,terminal.id,{name:'Operator A',locationId:location.id,expectedRevision:first.configurationRevision});
 const stale=()=>service.updateTerminalForManagement(organizationId,terminal.id,{name:'Operator B',locationId:location.id,expectedRevision:second.configurationRevision});
 if(after)await assert.rejects(stale,/changed since/);else await stale();
 assert.equal((await snapshot()).name,after?'Operator A':'Operator B');report.checks.push({name:after?'Stale form rejected without overwriting newer configuration':'Reproduced stale form overwriting another operator',passed:true});
 if(after){
  await assert.rejects(()=>service.updateTerminalForManagement(organizationId,terminal.id,{name:'Missing revision',locationId:location.id}),/changed since/);
  const reviewed=await snapshot();await service.updateTerminalForManagement(organizationId,terminal.id,{name:'Operator B reviewed',locationId:location.id,expectedRevision:reviewed.configurationRevision});
  assert.equal((await snapshot()).name,'Operator B reviewed');
  const base=await snapshot();const results=await Promise.allSettled(['Concurrent A','Concurrent B'].map(name=>service.updateTerminalForManagement(organizationId,terminal.id,{name,locationId:location.id,expectedRevision:base.configurationRevision})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
  report.checks.push({name:'Missing revision denied; explicit reviewed save works; one of two same-revision concurrent submissions wins',passed:true});
 }
 assert.equal(await db.payment.count({where:{organizationId}}),0);assert.equal(await db.journalEntry.count({where:{organizationId}}),0);report.passed=true;
}
main().catch(e=>{report.error=f.safe(e);process.exitCode=1;}).finally(async()=>{
 report.sourceAfter=hash();report.sourceStable=report.sourceBefore===report.sourceAfter;
 const file=path.join(__dirname,'terminal-revision-v126-'+report.phase+'-'+stamp+'.json');console.log(JSON.stringify({file,...report}));
 try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});}finally{await db.$disconnect();}
});
