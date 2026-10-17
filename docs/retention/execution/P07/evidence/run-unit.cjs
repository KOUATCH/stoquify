const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|PATHEXT|USERPROFILE|LOCALAPPDATA|APPDATA|SYSTEMDRIVE|NUMBER_OF_PROCESSORS)$/i.test(k)));
const name='unit-'+Date.now(), root=path.resolve(__dirname,'../../../../..');
const args=['node_modules/jest/bin/jest.js','--config',path.join(__dirname,'jest.unit.cjs'),'--runInBand','--no-cache','--json','--outputFile',path.join(__dirname,name+'.results.json')];
const result=spawnSync(process.execPath,args,{cwd:root,env:{...env,NODE_ENV:'test'},encoding:'utf8',windowsHide:true,maxBuffer:16e6});
fs.writeFileSync(path.join(__dirname,name+'.log'),(result.stdout||'')+(result.stderr||''));
fs.writeFileSync(path.join(__dirname,name+'.execution.json'),JSON.stringify({command:[process.execPath,...args],exit:result.status,date:new Date().toISOString()},null,2));
console.log(name+': '+result.status);process.exitCode=result.status??1;
