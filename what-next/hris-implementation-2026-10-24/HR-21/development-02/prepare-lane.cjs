const fs=require('node:fs'),base='what-next/hris-implementation-2026-10-24/HR-21/development-02';
let s=fs.readFileSync('services/hris/__tests__/integrated-core-pilot.postgres.test.ts','utf8');
s=s.replaceAll("what-next/hris-implementation-2026-10-24/HR-21/connected-",base+'/connected-');
s=s.replace("import {requestHrisEmployeeLifecycle}","import {applyApprovedHrisEmployeeLifecycle,requestHrisEmployeeLifecycle}");
s=s.replace("const org='hr21-'","const org='hr21dev-' ");
s=s.replace('firstSnapshot:string','firstSnapshot:string,leaverRequest:string');
s=s.replace("const employeeId=employees[1],life=await requestHrisEmployeeLifecycle", "const employeeId=employees[1],life=await requestHrisEmployeeLifecycle");
s=s.replace("expect((await decide(employeeId,'LIFECYCLE',life.workflow.requestId,'APPLY',2)).status).toBe('SCHEDULED');", "leaverRequest=life.workflow.requestId;expect((await decide(employeeId,'LIFECYCLE',life.workflow.requestId,'APPLY',2)).status).toBe('SCHEDULED');");
const marker='afterAll(async()=>{try{';if(!s.includes(marker))throw Error('Cleanup anchor missing');
s=s.replace(marker,()=>`test('effective departure closes assignments, preserves evidence and requires separate account-state proof',async()=>{
 expect(stages).toHaveLength(4)
 jest.useFakeTimers({now:new Date('2026-11-01T12:00:00Z'),doNotFake:['nextTick','setImmediate','clearImmediate','setTimeout','clearTimeout','setInterval','clearInterval','hrtime','performance','queueMicrotask']})
 try{
  const input={...actor(2),employeeId:employees[1],requestId:leaverRequest},applied=await applyApprovedHrisEmployeeLifecycle(input),again=await applyApprovedHrisEmployeeLifecycle(input);expect(applied.applied).toBe(true);expect(again.replayed).toBe(true);expect(again.businessEventId).toBe(applied.businessEventId)
  const employee=await db.payrollEmployee.findUniqueOrThrow({where:{id:employees[1]}});expect(employee.status).toBe('TERMINATED');expect(employee.terminationDate).toEqual(at('2026-11-01'));expect((await db.payrollContract.findUniqueOrThrow({where:{id:contracts[1]}}))).toMatchObject({status:'ENDED',effectiveTo:at('2026-10-31')});expect((await db.payrollEmployeeRubriqueAssignment.findMany({where:{organizationId:org,employeeId:employees[1]}})).every(a=>a.status==='ENDED'&&a.effectiveTo?.getTime()===at('2026-10-31').getTime())).toBe(true)
  expect((await db.user.findUniqueOrThrow({where:{id:users[5]}})).isActive).toBe(true)
  let tasks=(await getLifecycleTaskWorkspace(actor())).tasks;const access=tasks.find(t=>t.requestId===leaverRequest&&t.code==='APPLICATION_ACCESS')!;await expect(decideLifecycleTask(actor(),taskCommand(access,'SUBMIT'))).rejects.toThrow(/ACCOUNT_STATE/)
  // Isolated synthetic account-state fixture only: no identity-provider execution.
  await db.user.update({where:{id:users[5]},data:{isActive:false}})
  for(const code of ['APPLICATION_ACCESS','EXTERNAL_ACCESS','ASSETS']){const task=(await getLifecycleTaskWorkspace(actor())).tasks.find(t=>t.requestId===leaverRequest&&t.code===code)!;const submitted=await decideLifecycleTask(actor(),taskCommand(task,'SUBMIT'));const command=taskCommand(submitted,'APPROVE'),completed=await decideLifecycleTask(actor(1),command);expect(completed.status).toBe('COMPLETED');expect(await decideLifecycleTask(actor(1),command)).toEqual(completed)}
  tasks=(await getLifecycleTaskWorkspace(actor())).tasks;for(const original of starterTasks.get(employees[1])){const retained=tasks.find(t=>t.id===original.id)!;expect({id:retained.id,requestId:retained.requestId,status:retained.status,sourceState:retained.sourceState,evidenceReference:retained.evidenceReference,history:retained.history}).toEqual(original)}
  expect((await getPayrollHandoffPackage(actor(),{packageId:firstPackage})).csvBytes).toBe(firstBytes);expect(await db.businessEvent.count({where:{organizationId:org,eventType:'hris.employee.lifecycle.applied',payload:{path:['requestId'],equals:leaverRequest}}})).toBe(1);record('effective-leaver-native-replay-and-manual-account-proof',{actualAccountRevocation:false,syntheticAccountState:true})
 }finally{jest.useRealTimers()}
})

test('capture owned synthetic database and encrypted-object recovery inputs',async()=>{
 expect(stages).toHaveLength(5);const result=await require('../../../'+${JSON.stringify(base)}+'/snapshot.cjs').snapshot(db,{org,users,employees,objects,environment:Object.fromEntries(envKeys.map(k=>[k,process.env[k]])),packageId:firstPackage});expect(result.documents).toBe(2);expect(result.packages).toBe(2);record('synthetic-recovery-inputs-captured',{tables:result.tables,documents:result.documents,packages:result.packages})
})

`+marker);
s=s.replace('if(stages.length===4)','if(stages.length===6)');
fs.writeFileSync('services/hris/__tests__/integrated-core-development.postgres.test.ts',s);
fs.writeFileSync('jest.hris-development-postgres.config.cjs',"module.exports={...require('./jest.hris-correctness-postgres.config.cjs'),testMatch:['**/integrated-core-development.postgres.test.ts'],testTimeout:120000}\n");
let runner=fs.readFileSync('what-next/hris-implementation-2026-10-24/HR-21/run-connected.cjs','utf8').replace('jest.hris-integrated-pilot-postgres.config.cjs','jest.hris-development-postgres.config.cjs').replace('state.stages?.length===4','state.stages?.length===6');fs.writeFileSync(base+'/run-connected.cjs',runner);
