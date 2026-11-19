const fs=require('node:fs'),cp=require('node:child_process');
const root='what-next/hris-implementation-2026-10-24/HR-08';
const lane=process.argv[2];
let args;
if(lane==='unit') {
 const command=JSON.parse(fs.readFileSync(root+'/evidence.json','utf8')).commands.find(x=>x.includes('--runTestsByPath'));
 args=command.split(' ').slice(1).filter(x=>!x.startsWith('--outputFile='));
 args.push('services/payroll/__tests__/payroll-replay-authorization.test.ts','--outputFile='+root+'/unit-review.json');
} else if(lane==='types') {
 args=['what-next/hris-implementation-2026-10-24/typecheck.cjs',root+'/typecheck-review.txt',
 'services/hris/leave-balance.service.ts','services/hris/operational-time.service.ts','services/hris/operational-attendance.service.ts',
 'services/hris/time-leave.service.ts','services/hris/lifecycle.service.ts','services/hris/org.service.ts','services/hris/employee.service.ts',
 'services/hris/manager-self-service.service.ts','services/payroll/employee.service.ts','services/payroll/payroll-control.service.ts',
 'services/payroll/declaration-lifecycle.service.ts','services/payroll/authority-adapter-worker.service.ts',
 'components/hris/HrisOperationalTimeRequestPanel.tsx','components/hris/HrisEmployeeDirectoryTable.tsx','app/[locale]/(dashboard)/dashboard/people/page.tsx',
 'services/hris/__tests__/hris-correctness.postgres.test.ts','services/payroll/__tests__/payroll-replay-authorization.test.ts',
 'services/payroll/__tests__/authority-adapter-worker.service.test.ts','services/payroll/__tests__/declaration-lifecycle.service.test.ts'];
} else throw Error('Select unit or types');
const startedAt=new Date().toISOString();
const result=cp.spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:20*1024*1024});
fs.writeFileSync(root+'/'+lane+'-review.log',(result.stdout||'')+(result.stderr||''));
fs.writeFileSync(root+'/'+lane+'-review-run.json',JSON.stringify({lane,startedAt,finishedAt:new Date().toISOString(),executable:'node',args,exitCode:result.status,error:result.error?.message},null,2));
console.log((result.stdout||'')+(result.stderr||''));
process.exitCode=result.status??1;
