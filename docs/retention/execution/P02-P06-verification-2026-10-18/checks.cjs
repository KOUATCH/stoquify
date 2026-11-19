const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process')
const root=path.resolve(__dirname,'../../../..'),mode=process.argv[2]
if(!['p02-unit','operator','server-close','read-states'].includes(mode))throw Error('Unknown check')
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(k)))
env.NODE_ENV='test';env.PLAYWRIGHT_BROWSERS_PATH='C:/Users/J COMPUTER/AppData/Local/ms-playwright';env.NEXT_TELEMETRY_DISABLED='1'
const label=mode+'-'+Date.now(),args=mode==='p02-unit'?['node_modules/jest/bin/jest.js','--config','jest.retention-outcomes.config.cjs','--runInBand','--no-cache','--json','--outputFile',path.join(__dirname,label+'.results.json')]:[path.join(__dirname,'browser-'+mode+'.cjs')]
const start=new Date().toISOString(),run=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024})
fs.writeFileSync(path.join(__dirname,label+'.log'),(run.stdout||'')+(run.stderr||''))
fs.writeFileSync(path.join(__dirname,label+'.execution.json'),JSON.stringify({start,end:new Date().toISOString(),command:[process.execPath,...args],exit:run.status,error:run.error?.code},null,2))
console.log(label,run.status);process.exitCode=run.status??1
