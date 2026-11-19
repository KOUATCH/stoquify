const fs=require('node:fs'),cp=require('node:child_process')
const out='docs/retention/execution/P10/evidence',mode=process.argv[2]
if(!['workflow','tests'].includes(mode))throw new Error('Use workflow or tests')
const prefix=`${out}/${mode}-${Date.now()}`
const args=mode==='tests'?['node_modules/jest/bin/jest.js','--config',`${out}/jest.config.cjs`,'--runInBand','--no-cache','--json','--outputFile',`${prefix}.results.json`]:['/d','/s','/c','npm run agent:workflow:check']
const command=mode==='tests'?process.execPath:'cmd.exe',startedAt=new Date().toISOString()
const r=cp.spawnSync(command,args,{encoding:'utf8',maxBuffer:8*1024*1024,windowsHide:true})
fs.writeFileSync(`${prefix}.log`,(r.stdout||'')+(r.stderr||''))
fs.writeFileSync(`${prefix}.execution.json`,JSON.stringify({command,args,startedAt,finishedAt:new Date().toISOString(),exitCode:r.status,error:r.error?.message},null,2)+'\n')
console.log((r.stdout||'')+(r.stderr||''));process.exitCode=r.status??1
