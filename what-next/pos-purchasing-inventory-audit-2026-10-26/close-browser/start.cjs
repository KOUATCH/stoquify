const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=process.cwd(),f=JSON.parse(fs.readFileSync('.codex-tmp/close-browser-private.json','utf8')),u=new URL(f.url);
if(u.hostname!=='localhost'||u.pathname!=='/stoquify_pos_audit_20261026_d30f'||f.base!=='http://127.0.0.1:3169')throw Error('Wrong disposable target');
const env={};for(const k of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'])if(process.env[k])env[k]=process.env[k];
Object.assign(env,{NODE_ENV:'development',PORT:'3169',NEXT_DIST_DIR:'.next-close-browser',NEXT_TELEMETRY_DISABLED:'1',DATABASE_URL:f.url,DIRECT_URL:f.url,SHADOW_DATABASE_URL:f.url,AUTH_SECRET:f.secret,NEXTAUTH_SECRET:f.secret,BETTER_AUTH_SECRET:f.secret,NEXTAUTH_URL:f.base,NEXT_PUBLIC_BASE_URL:f.base,NEXT_PUBLIC_APP_URL:f.base});
const log=fs.openSync(path.join(root,'.codex-tmp/close-browser-next-private.log'),'a');
const child=spawn(process.execPath,['scripts/dev-app-safe.js','--hostname','127.0.0.1'],{cwd:path.join(root,'.codex-tmp/close-browser-app'),env,windowsHide:true,stdio:['ignore',log,log]});
fs.writeFileSync('.codex-tmp/close-browser-next.pid',String(child.pid));console.log('Owned isolated app '+f.base+' PID '+child.pid);child.on('exit',code=>{process.exitCode=code??1});process.on('SIGINT',()=>child.kill());process.on('SIGTERM',()=>child.kill());
