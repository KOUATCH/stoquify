// Foreground controller: allowlisted environment; no application env/provider credentials inherited.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=process.cwd(),fixture=JSON.parse(fs.readFileSync(path.join(root,'.codex-tmp/workflow-closure-private.json'),'utf8'));
const url=new URL(fixture.url);if(url.hostname!=='localhost'||url.pathname!=='/stoquify_pos_audit_20261026_d30f'||fixture.base!=='http://127.0.0.1:3168')throw Error('Wrong synthetic target');
const env={};for(const k of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'])if(process.env[k])env[k]=process.env[k];
Object.assign(env,{NODE_ENV:'development',PORT:'3168',NEXT_DIST_DIR:'.next-workflow-closure',NEXT_TELEMETRY_DISABLED:'1',DATABASE_URL:fixture.url,DIRECT_URL:fixture.url,SHADOW_DATABASE_URL:fixture.url,AUTH_SECRET:fixture.secret,NEXTAUTH_SECRET:fixture.secret,BETTER_AUTH_SECRET:fixture.secret,NEXTAUTH_URL:fixture.base,NEXT_PUBLIC_BASE_URL:fixture.base,NEXT_PUBLIC_APP_URL:fixture.base,PURCHASE_ORDER_AUTHORING_UI_ENABLED:'true',PURCHASE_ORDER_AUTHORING_WRITES_ENABLED:'true'});
const log=fs.openSync(path.join(root,'.codex-tmp/workflow-closure-next-private.log'),'a');
const child=spawn(process.execPath,['scripts/dev-app-safe.js','--hostname','127.0.0.1'],{cwd:path.join(root,'.codex-tmp/workflow-closure-app'),env,windowsHide:true,stdio:['ignore',log,log]});
fs.writeFileSync(path.join(root,'.codex-tmp/workflow-closure-next.pid'),String(child.pid));console.log('Owned isolated application on '+fixture.base+'; PID '+child.pid);
child.on('exit',code=>{process.exitCode=code??1});process.on('SIGINT',()=>child.kill());process.on('SIGTERM',()=>child.kill());
