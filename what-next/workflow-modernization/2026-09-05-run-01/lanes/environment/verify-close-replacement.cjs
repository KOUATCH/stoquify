// Local checks only. No migration, seed or database mutation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../../../..'), evidence=path.resolve(__dirname,'../../evidence');
const phase=process.argv[2]; assert.ok(['jest','typecheck','lint'].includes(phase));
const changed=[
 'services/accounting/close-evidence-collection.ts','services/accounting/__tests__/close-evidence-collection.test.ts',
 'services/accounting/close-evidence-replacement.service.ts','services/accounting/__tests__/close-evidence-replacement.service.test.ts',
 'services/accounting/close-assurance.service.ts','services/accounting/__tests__/close-assurance.service.test.ts',
 'services/accounting/close-assurance.schemas.ts','services/accounting/missing-close-evidence-response-acceptance-contracts.ts',
 'services/accounting/accountant-work-desk.service.ts','services/accounting/accountant-work-desk.contracts.ts','services/accounting/__tests__/accountant-work-desk.service.test.ts',
 'services/snapshots/close-readiness-snapshot.service.ts','services/snapshots/__tests__/close-readiness-snapshot.service.test.ts',
 'components/accounting/AccountantWorkDesk.tsx','components/accounting/accountant-work-desk-copy.ts','components/accounting/__tests__/AccountantWorkDesk.test.tsx',
];
const tests=changed.filter(file=>/\.test\.tsx?$/.test(file)).concat(['actions/accounting/__tests__/close-assurance.actions.test.ts','actions/accounting/__tests__/accountant-work-desk.actions.test.ts','services/accounting/__tests__/close-assurance-pack.service.test.ts']);
const files=[...new Set([...changed,...tests,'package.json','prisma/schema.prisma','jest.config.ts','jest.setup.ts','tsconfig.json','services/accounting/close-assessment-order.service.ts','actions/accounting/accountant-work-desk.actions.ts',path.relative(root,__filename)])];
const hashes=()=>Object.fromEntries(files.map(file=>[file.replaceAll('\\','/'),crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const stem=path.join(evidence,'close-replacement-'+phase+'-'+crypto.randomUUID());
const commands={jest:['node_modules/jest/bin/jest.js','--runInBand','--runTestsByPath',...tests,'--json','--outputFile='+stem+'-jest.json'],lint:['node_modules/eslint/bin/eslint.js',...changed],typecheck:['node_modules/typescript/bin/tsc','--noEmit','--pretty','false']};
const report={at:new Date().toISOString(),phase,command:commands[phase],sourceBefore:hashes()};
const result=spawnSync(process.execPath,commands[phase],{cwd:root,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=8192'}});
report.exitCode=result.status;report.sourceAfter=hashes();report.sourceStable=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);
report.log=path.relative(root,stem+'.log').replaceAll('\\','/'); fs.writeFileSync(stem+'.log',(result.stdout||'')+(result.stderr||''),{flag:'wx'});
if(phase==='jest'&&fs.existsSync(stem+'-jest.json')){const j=JSON.parse(fs.readFileSync(stem+'-jest.json'));report.jest=path.relative(root,stem+'-jest.json').replaceAll('\\','/');report.summary={passed:j.numPassedTests,failed:j.numFailedTests,pending:j.numPendingTests,suites:j.numTotalTestSuites};}
report.passed=result.status===0&&report.sourceStable;fs.writeFileSync(stem+'.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({receipt:stem+'.json',passed:report.passed,sourceStable:report.sourceStable,summary:report.summary}));if(!report.passed)console.log(((result.stdout||'')+(result.stderr||'')).slice(-15000));process.exitCode=report.passed?0:1;
