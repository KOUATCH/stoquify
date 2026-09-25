const f = require('./statement-recipient-fixtures.cjs'), {db, fs, path, crypto, assert} = f;
const terminalService = require(path.join(f.root,'services/pos/terminal-management.service.ts'));
const pos = require(path.join(f.root,'services/pos/pos.service.ts')), dbExport = require(path.join(f.root,'prisma/db.ts'));
const stamp=crypto.randomUUID(),after=process.argv.includes('--after');
const files=['services/pos/terminal-management.service.ts','services/pos/pos.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const report={at:new Date().toISOString(),phase:after?'after':'before',sourcesBefore:hashes(),checks:[],scope:'Owned PostgreSQL; actual openPOSShift interleaved after archive availability read. No checkout, payment or external operation.'};
async function main(){
  await f.helper.withClient(f.target,f.helper.assertOwned);
  const organizationId='workflow_terminal_race_'+stamp;
  await db.organization.create({data:{id:organizationId,name:f.helper.prefix+'Terminal race',slug:organizationId,currency:'XAF'}});
  const user=await db.user.create({data:{organizationId,email:stamp+'@example.invalid',name:'Owned cashier'}});
  const location=await db.location.create({data:{organizationId,name:'Owned store',code:'OWNED'}});
  const terminal=await db.pOSStation.create({data:{organizationId,locationId:location.id,name:'Owned terminal',terminalNumber:'OWNED'}});
  let opened=false;
  dbExport.db=db.$extends({query:{pOSStation:{async findFirst({args,query}){
    const row=await query(args);
    if(!opened && args.where?.id===terminal.id && args.select?.currentSession){
      opened=true;
      await pos.openPOSShift({organizationId,userId:user.id,locationId:location.id,terminalId:terminal.id,openingBalance:'0'});
    }
    return row;
  }}}});
  try{
    if(after) await assert.rejects(()=>terminalService.archiveTerminalForManagement(organizationId,terminal.id),/active session/);
    else await terminalService.archiveTerminalForManagement(organizationId,terminal.id);
  }finally{dbExport.db=db;}
  assert.ok(opened);
  const current=await db.pOSStation.findUniqueOrThrow({where:{id:terminal.id}});
  assert.equal(current.isActive,after);assert.ok(current.currentSessionId);
  assert.equal(await db.pOSSession.count({where:{terminalId:terminal.id,status:'ACTIVE'}}),1);
  report.checks.push({name:after?'Archive denied after actual concurrent shift opening; active terminal/session retained':'Reproduced inactive terminal with newly opened active shift',passed:true});
  if(after){
    const idle=await db.pOSStation.create({data:{organizationId,locationId:location.id,name:'Idle terminal',terminalNumber:'IDLE'}});
    await assert.rejects(()=>terminalService.archiveTerminalForManagement('another-tenant',idle.id),/not found/);
    await terminalService.archiveTerminalForManagement(organizationId,idle.id);
    await terminalService.archiveTerminalForManagement(organizationId,idle.id);
    await assert.rejects(()=>pos.openPOSShift({organizationId,userId:user.id,locationId:location.id,terminalId:idle.id,openingBalance:'0'}),/Terminal not found/);
    assert.equal(await db.pOSSession.count({where:{terminalId:idle.id}}),0);
    assert.equal(await db.pOSStation.count({where:{id:idle.id,isActive:false}}),1);
    report.checks.push({name:'Cross-tenant denial, repeated idle archive and denied opening preserve history without orphan sessions',passed:true});
  }
  assert.equal(await db.payment.count({where:{organizationId}}),0);assert.equal(await db.journalEntry.count({where:{organizationId}}),0);report.passed=true;
}
main().catch(error=>{report.error=f.safe(error);process.exitCode=1;}).finally(async()=>{
  dbExport.db=db;report.sourcesAfter=hashes();report.sourceStable=JSON.stringify(report.sourcesBefore)===JSON.stringify(report.sourcesAfter);
  const file=path.join(__dirname,'terminal-race-v124-'+report.phase+'-'+stamp+'.json');console.log(JSON.stringify({file,...report}));
  try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});}finally{await db.$disconnect();}
});
