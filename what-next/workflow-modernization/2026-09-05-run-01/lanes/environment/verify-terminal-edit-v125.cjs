const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const service=require(path.join(f.root,'services/pos/terminal-management.service.ts')),pos=require(path.join(f.root,'services/pos/pos.service.ts')),dbExport=require(path.join(f.root,'prisma/db.ts'));
const stamp=crypto.randomUUID(),after=process.argv.includes('--after'),fileSource='services/pos/terminal-management.service.ts';
const hash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,fileSource))).digest('hex');
const report={at:new Date().toISOString(),phase:after?'after':'before',sourceBefore:hash(),checks:[],scope:'Actual terminal edit/open services on owned PostgreSQL, with controlled concurrency. No sale/payment or external operation.'};
async function main(){
  await f.helper.withClient(f.target,f.helper.assertOwned);
  const organizationId='workflow_terminal_edit_'+stamp;
  await db.organization.create({data:{id:organizationId,name:f.helper.prefix+'Terminal edit',slug:organizationId,currency:'XAF'}});
  const user=await db.user.create({data:{organizationId,email:stamp+'@example.invalid',name:'Owned cashier'}});
  const location=await db.location.create({data:{organizationId,name:'Original store',code:'ORIGINAL'}}),other=await db.location.create({data:{organizationId,name:'Other store',code:'OTHER'}});
  const create=(number,extra={})=>db.pOSStation.create({data:{organizationId,locationId:location.id,name:number,terminalNumber:number,...extra}});
  const terminal=await create('RACE');let opened=false;
  dbExport.db=db.$extends({query:{pOSStation:{async findFirst({args,query}){
    const row=await query(args);
    if(!opened&&args.where?.id===terminal.id&&args.select?.cashDrawers){
      opened=true;await pos.openPOSShift({organizationId,userId:user.id,locationId:location.id,terminalId:terminal.id,openingBalance:'0'});
    }return row;
  }}}});
  try{
    const edit=()=>service.updateTerminalForManagement(organizationId,terminal.id,{name:'Changed',locationId:location.id,isActive:false,hasCashDrawer:true});
    if(after)await assert.rejects(edit);else await edit();
  }finally{dbExport.db=db;}
  assert.ok(opened);assert.equal((await db.pOSStation.findUniqueOrThrow({where:{id:terminal.id}})).isActive,after);
  report.checks.push({name:after?'Concurrent opening aborts unsafe edit':'Reproduced editing an active shift terminal to inactive',passed:true});
  const move=()=>service.updateTerminalForManagement(organizationId,terminal.id,{name:'Moved',locationId:other.id,isActive:true,hasCashDrawer:true});
  if(after)await assert.rejects(move,/move|active session/);else await move();
  assert.equal((await db.pOSStation.findUniqueOrThrow({where:{id:terminal.id}})).locationId,after?location.id:other.id);
  report.checks.push({name:after?'Active terminal location cannot move':'Reproduced relocation while active shift/drawer remain at old store',passed:true});
  const inactive=await create('INACTIVE',{isActive:false,hasCashDrawer:false});
  await service.updateTerminalForManagement(organizationId,inactive.id,{name:'Renamed',locationId:location.id});
  const renamed=await db.pOSStation.findUniqueOrThrow({where:{id:inactive.id}});
  assert.equal(renamed.isActive,!after);assert.equal(renamed.hasCashDrawer,!after);
  report.checks.push({name:after?'Omitted flags preserve inactive and drawer-disabled intent':'Reproduced omitted flags reactivating terminal and adding drawer',passed:true});
  if(after){
    const idle=await create('IDLE');const drawer=await db.cashDrawer.create({data:{terminalId:idle.id,locationId:location.id,name:'Unused drawer',drawerNumber:'UNUSED-'+stamp}});
    await service.updateTerminalForManagement(organizationId,idle.id,{name:'Moved idle',locationId:other.id});
    assert.equal((await db.cashDrawer.findUniqueOrThrow({where:{id:drawer.id}})).locationId,other.id);
    await assert.rejects(()=>service.updateTerminalForManagement('other-tenant',idle.id,{name:'Denied',locationId:other.id}),/not found/);
    // A completed shift still anchors historical terminal/drawer location.
    await db.pOSSession.updateMany({where:{terminalId:terminal.id},data:{status:'CLOSED'}});
    await db.pOSStation.update({where:{id:terminal.id},data:{currentSessionId:null}});
    await db.cashDrawer.updateMany({where:{terminalId:terminal.id},data:{isOpen:false}});
    await assert.rejects(move,/history/);
    report.checks.push({name:'Unused drawer follows idle relocation; cross-tenant and historical relocation denied',passed:true});
    const atomic=await create('ATOMIC',{isActive:false,hasCashDrawer:false});let attempts=0;
    dbExport.db=db.$extends({query:{cashDrawer:{async create(){attempts++;throw new Error('Owned drawer preparation failure');}}}});
    const enable=()=>service.updateTerminalForManagement(organizationId,atomic.id,{name:'Prepared terminal',locationId:location.id,isActive:true,hasCashDrawer:true});
    try{await assert.rejects(enable,/Owned drawer preparation failure/);}finally{dbExport.db=db;}
    const unchanged=await db.pOSStation.findUniqueOrThrow({where:{id:atomic.id}});assert.equal(unchanged.isActive,false);assert.equal(unchanged.hasCashDrawer,false);assert.equal(unchanged.name,'ATOMIC');assert.equal(attempts,1);
    await enable();await enable();assert.equal(await db.cashDrawer.count({where:{terminalId:atomic.id}}),1);
    report.checks.push({name:'Drawer preparation failure rolls back terminal edit; explicit retry creates one drawer',passed:true});
  }
  assert.equal(await db.payment.count({where:{organizationId}}),0);assert.equal(await db.journalEntry.count({where:{organizationId}}),0);report.passed=true;
}
main().catch(e=>{report.error=f.safe(e);process.exitCode=1;}).finally(async()=>{
  dbExport.db=db;report.sourceAfter=hash();report.sourceStable=report.sourceBefore===report.sourceAfter;
  const file=path.join(__dirname,'terminal-edit-v125-'+report.phase+'-'+stamp+'.json');console.log(JSON.stringify({file,...report}));
  try{fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});}finally{await db.$disconnect();}
});
