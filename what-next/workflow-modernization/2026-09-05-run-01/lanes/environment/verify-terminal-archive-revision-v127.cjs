const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const service=require(path.join(f.root,'services/pos/terminal-management.service.ts'));
const stamp=crypto.randomUUID(),after=process.argv.includes('--after');
const hash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,'services/pos/terminal-management.service.ts'))).digest('hex');
const report={at:new Date().toISOString(),phase:after?'after':'before',sourceBefore:hash(),checks:[],scope:'Owned local PostgreSQL; actual terminal service calls; no provider or financial operation.'};
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 const organizationId='workflow_terminal_archive_revision_'+stamp;
 await db.organization.create({data:{id:organizationId,name:f.helper.prefix+'Archive revision',slug:organizationId,currency:'XAF'}});
 const location=await db.location.create({data:{organizationId,name:'Owned store',code:'OWNED'}});
 const terminal=await service.createTerminalForManagement(organizationId,{name:'Original',locationId:location.id,terminalNumber:'OWNED',hasCashDrawer:false});
 const snapshot=()=>service.getTerminalManagementDataForOrg(organizationId).then(r=>r.terminals.find(t=>t.id===terminal.id));
 const changed=await service.updateTerminalForManagement(organizationId,terminal.id,{name:'Other operator',locationId:location.id,expectedRevision:terminal.configurationRevision});
 const stale=()=>service.archiveTerminalForManagement(organizationId,terminal.id,terminal.configurationRevision);
 if(after)await assert.rejects(stale,/changed since/);else await stale();
 assert.equal((await snapshot()).isActive,after);report.checks.push(after?'Stale deactivation rejected, newer configuration retained':'Reproduced stale confirmation deactivating changed terminal');
 if(after){
  await assert.rejects(()=>service.archiveTerminalForManagement(organizationId,terminal.id),/changed since/);
  await assert.rejects(()=>service.archiveTerminalForManagement('wrong-org',terminal.id,changed.configurationRevision),/not found/);
  const originalUpdate=db.pOSStation.updateMany;let injected=false;
  db.pOSStation.updateMany=async args=>{if(!injected){injected=true;await db.pOSStation.update({where:{id:terminal.id},data:{name:'Intervening change',updatedAt:changed.updatedAt}});}return originalUpdate.call(db.pOSStation,args);};
  try{await assert.rejects(()=>service.archiveTerminalForManagement(organizationId,terminal.id,changed.configurationRevision),/changed since/);}finally{db.pOSStation.updateMany=originalUpdate;}
  assert.equal((await snapshot()).isActive,true);report.checks.push('Missing revision, cross-tenant object and same-timestamp edit after read denied without deactivation');
  const reviewed=await snapshot();await service.archiveTerminalForManagement(organizationId,terminal.id,reviewed.configurationRevision);
  assert.equal((await snapshot()).isActive,false);
  await assert.rejects(()=>service.archiveTerminalForManagement(organizationId,terminal.id,reviewed.configurationRevision),/changed since/);
  assert.equal(await db.pOSStation.count({where:{id:terminal.id}}),1);report.checks.push('Fresh reviewed confirmation deactivates, stale replay rejected, record retained');
 }
 assert.equal(await db.payment.count({where:{organizationId}}),0);assert.equal(await db.journalEntry.count({where:{organizationId}}),0);report.passed=true;
}
main().catch(e=>{report.error=f.safe(e);process.exitCode=1;}).finally(async()=>{report.sourceAfter=hash();report.sourceStable=report.sourceBefore===report.sourceAfter;const file=path.join(__dirname,'terminal-archive-revision-v127-'+report.phase+'-'+stamp+'.json');console.log(JSON.stringify({file,...report}));try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});}finally{await db.$disconnect();}});
