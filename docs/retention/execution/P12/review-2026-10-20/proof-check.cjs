// Focused pure projection check for changed accounting source; no application setup/database.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process')
const root=path.resolve(__dirname,'../../../../..')
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(k)))
env.NODE_ENV='test';env.NEXT_TELEMETRY_DISABLED='1'
const args=['node_modules/jest/bin/jest.js','--config','jest.accountant-portfolio.config.cjs','--runInBand','--no-cache','--runTestsByPath','services/accounting/__tests__/close-assurance-current-proof.test.ts','--json','--outputFile',path.join(__dirname,'PROOF_RESULTS.json')]
const start=new Date().toISOString(),r=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024})
fs.writeFileSync(path.join(__dirname,'PROOF.log'),(r.stdout||'')+(r.stderr||''),{flag:'wx'})
fs.writeFileSync(path.join(__dirname,'PROOF_EXECUTION.json'),JSON.stringify({start,end:new Date().toISOString(),command:[process.execPath,...args],exit:r.status,error:r.error?.message||null},null,2)+'\n',{flag:'wx'})
console.log('Focused proof check exit',r.status);process.exitCode=r.status??1
