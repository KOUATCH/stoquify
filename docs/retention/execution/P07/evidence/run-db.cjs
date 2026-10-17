const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const t=JSON.parse(fs.readFileSync(path.join(__dirname,'DATABASE_TARGET.json'),'utf8'));
if(t.host!=='localhost'||!/^stoquify_retention_p07_20261017_[a-f0-9]+$/.test(t.database)||t.user!=='retention_fixture')throw Error('Unexpected target');
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(k)));
Object.assign(env,{NODE_ENV:'test',RUN_P07_POSTGRES:'1',DATABASE_URL:`postgresql://${t.user}@localhost:${t.port}/${t.database}?schema=public`});env.DIRECT_URL=env.DATABASE_URL;
const name='database-'+Date.now(),args=['node_modules/jest/bin/jest.js','--config',path.join(__dirname,'jest.database.cjs'),'--runInBand','--no-cache','--json','--outputFile',path.join(__dirname,name+'.results.json')];
const r=spawnSync(process.execPath,args,{cwd:path.resolve(__dirname,'../../../../..'),env,encoding:'utf8',windowsHide:true,maxBuffer:16e6});
fs.writeFileSync(path.join(__dirname,name+'.log'),(r.stdout||'')+(r.stderr||''));fs.writeFileSync(path.join(__dirname,name+'.execution.json'),JSON.stringify({command:[process.execPath,...args],exit:r.status,date:new Date().toISOString(),database:t.database},null,2));console.log(name+': '+r.status);process.exitCode=r.status??1;
