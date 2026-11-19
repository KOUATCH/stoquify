// Reviewed P12 stale-evidence check: isolated Chromium/loopback fixture only.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process')
const root=path.resolve(__dirname,'../../../../..')
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)))
env.NODE_ENV='test';env.PLAYWRIGHT_BROWSERS_PATH='C:/Users/J COMPUTER/AppData/Local/ms-playwright';env.NEXT_TELEMETRY_DISABLED='1'
const args=['node_modules/jest/bin/jest.js','--config',path.join(__dirname,'jest.storage.cjs'),'--runInBand','--no-cache','--json','--outputFile',path.join(__dirname,'STORAGE_RESULTS.json')]
const startedAt=new Date().toISOString()
const result=spawnSync(process.execPath,args,{cwd:root,env,windowsHide:true,encoding:'utf8',maxBuffer:32*1024*1024})
fs.writeFileSync(path.join(__dirname,'STORAGE.log'),(result.stdout||'')+(result.stderr||''))
fs.writeFileSync(path.join(__dirname,'STORAGE_EXECUTION.json'),JSON.stringify({startedAt,finishedAt:new Date().toISOString(),command:[process.execPath,...args],exit:result.status,error:result.error?.code},null,2))
console.log('P12 focused storage check exit',result.status);process.exitCode=result.status??1
