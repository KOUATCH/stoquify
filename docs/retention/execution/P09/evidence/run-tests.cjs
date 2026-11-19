// Reviewed direct, narrow pure lane. No npm lifecycle, application setup or database access.
const fs = require('node:fs'), cp = require('node:child_process')
const prefix = `docs/retention/execution/P09/evidence/unit-${Date.now()}`
const args = ['node_modules/jest/bin/jest.js','--config','jest.retention-archive.config.cjs','--runInBand','--no-cache','--json','--outputFile',`${prefix}.results.json`]
const startedAt=new Date().toISOString()
const result=cp.spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:8*1024*1024,windowsHide:true})
fs.writeFileSync(`${prefix}.log`,(result.stdout||'')+(result.stderr||''))
fs.writeFileSync(`${prefix}.execution.json`,JSON.stringify({command:[process.execPath,...args],startedAt,finishedAt:new Date().toISOString(),exitCode:result.status,error:result.error?.message},null,2)+'\n')
console.log((result.stdout||'')+(result.stderr||''))
process.exitCode=result.status ?? 1
