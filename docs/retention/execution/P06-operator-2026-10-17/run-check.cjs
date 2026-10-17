const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process')
const root=path.resolve(__dirname,'../../../..'),mode=process.argv[2]
if(!['ui','storage'].includes(mode)) throw Error('Expected ui or storage')
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(key)))
env.NODE_ENV='test';env.PLAYWRIGHT_BROWSERS_PATH='C:/Users/J COMPUTER/AppData/Local/ms-playwright';env.NEXT_TELEMETRY_DISABLED='1'
const label=mode+'-'+Date.now(),args=['node_modules/jest/bin/jest.js','--config',path.join(__dirname,`jest.${mode}.cjs`),'--runInBand','--no-cache','--json','--outputFile',path.join(__dirname,label+'.results.json')]
const result=spawnSync(process.execPath,args,{cwd:root,env,windowsHide:true,encoding:'utf8',maxBuffer:32*1024*1024})
fs.writeFileSync(path.join(__dirname,label+'.log'),(result.stdout||'')+(result.stderr||''))
fs.writeFileSync(path.join(__dirname,label+'.execution.json'),JSON.stringify({utc:new Date().toISOString(),command:[process.execPath,...args],exit:result.status,error:result.error?.code},null,2))
console.log(label,result.status);process.exitCode=result.status??1
