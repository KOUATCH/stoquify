const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','PATHEXT','SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'].includes(k.toUpperCase())));
Object.assign(env,{NODE_ENV:'test',NEXT_TELEMETRY_DISABLED:'1'});
const r=spawnSync(process.execPath,[path.join(__dirname,'routes-review/static-upload-component-http.cjs')],{cwd:path.resolve(__dirname,'../../../..'),env,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:2*1024*1024});
fs.writeFileSync(path.join(__dirname,'static-http.log'),(r.stdout||'')+(r.stderr||''),{flag:'wx'});
fs.writeFileSync(path.join(__dirname,'static-http-result.json'),JSON.stringify({at:new Date().toISOString(),exitCode:r.status,error:r.error?.message,environmentVariableNames:Object.keys(env),syntheticOnly:true},null,2)+'\n',{flag:'wx'});
console.log(r.stdout);if(r.stderr)console.error(r.stderr);process.exitCode=r.status===0?0:1;
