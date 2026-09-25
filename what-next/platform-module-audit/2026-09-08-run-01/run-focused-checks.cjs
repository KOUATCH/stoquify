const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const run=__dirname, modules=require('./modules.cjs');
const tests=modules.map(m=>m.test).filter(Boolean);
for(const f of tests){if(!fs.existsSync(f))throw new Error('Missing '+f);const t=fs.readFileSync(f,'utf8');if(/new PrismaClient|execSync|execFileSync|spawn\(|unmock|requireActual.*prisma/.test(t))throw new Error('Review side effects before running '+f);}
const args=[require.resolve('jest/bin/jest'),'--runInBand','--runTestsByPath',...tests,'--json','--outputFile',path.join(run,'focused-tests.json'),'--silent'];
const startedAt=new Date().toISOString();const result=cp.spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:20*1024*1024,timeout:300000});
fs.writeFileSync(path.join(run,'focused-tests.log'),(result.stdout||'')+'\n'+(result.stderr||''));
const command={startedAt,finishedAt:new Date().toISOString(),executable:process.execPath,args,exitCode:result.status,signal:result.signal,error:result.error?.message??null,environment:'Local Jest; mock/injected Prisma clients; no DB integration, browser or provider calls intended'};
fs.writeFileSync(path.join(run,'focused-command.json'),JSON.stringify(command,null,2));
if(fs.existsSync(path.join(run,'focused-tests.json'))){const r=JSON.parse(fs.readFileSync(path.join(run,'focused-tests.json'),'utf8'));console.log(JSON.stringify({exitCode:result.status,passed:r.numPassedTests,failed:r.numFailedTests,pending:r.numPendingTests,passedSuites:r.numPassedTestSuites,failedSuites:r.numFailedTestSuites,failures:r.testResults.filter(t=>t.status!=='passed').map(t=>({file:t.name,tests:t.assertionResults.filter(a=>a.status==='failed').map(a=>({name:a.fullName,message:a.failureMessages.join('\n').slice(0,3500)})),message:t.message?.slice(0,1200)}))},null,2));}else console.log(command);
process.exitCode=result.status||0;
