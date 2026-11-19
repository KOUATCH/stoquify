const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process')
const root=path.resolve(__dirname,'../../../..'),r=JSON.parse(fs.readFileSync(path.join(__dirname,'DATABASE_TARGET.json')))
if(r.host!=='localhost'||r.user!=='retention_fixture'||!/^stoquify_pos_audit_20261018_[a-f0-9]+$/.test(r.database)||!path.resolve(r.directory).startsWith(path.join(root,'.codex-tmp')+path.sep))throw Error('Unexpected target')
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|PROGRAMFILES|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(k)))
Object.assign(env,{NODE_ENV:'test',DATABASE_URL:`postgresql://${r.user}@localhost:${r.port}/${r.database}?schema=public`,POS_DISPOSABLE_DATABASE_NAME:r.database,RUN_RETENTION_OUTCOMES_POSTGRES:'1'})
const label='retention-db-'+Date.now(),args=['node_modules/jest/bin/jest.js','--config',path.join(__dirname,'jest.retention-db.cjs'),'--runInBand','--no-cache','--json','--outputFile',path.join(__dirname,label+'.results.json')]
const start=new Date().toISOString(),run=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024})
fs.writeFileSync(path.join(__dirname,label+'.log'),(run.stdout||'')+(run.stderr||''))
fs.writeFileSync(path.join(__dirname,label+'.execution.json'),JSON.stringify({start,end:new Date().toISOString(),command:[process.execPath,...args],exit:run.status,error:run.error?.code},null,2))
console.log(label,run.status);process.exitCode=run.status??1
