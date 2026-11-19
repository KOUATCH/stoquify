// Foreground controller for the task-owned isolated Next process; no app .env or workers.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{randomBytes}=require('node:crypto')
const root=path.resolve(__dirname,'..')
const base='C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993'
const fixture=JSON.parse(fs.readFileSync(path.join(base,'af06-browser-private.json'),'utf8'))
if(new URL(fixture.url).hostname!=='127.0.0.1'||new URL(fixture.url).pathname!=='/stoquify_local_af06_browser_20261020_r1')throw Error('Invalid synthetic target')
const env={}
for(const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC']) if(process.env[key])env[key]=process.env[key]
Object.assign(env,{NODE_ENV:'development',PORT:'3046',NEXT_DIST_DIR:'.next-af06',NEXT_TELEMETRY_DISABLED:'1',
  DATABASE_URL:fixture.url,DIRECT_URL:fixture.url,SHADOW_DATABASE_URL:fixture.url,
  BETTER_AUTH_SECRET:randomBytes(32).toString('hex'),NEXTAUTH_SECRET:randomBytes(32).toString('hex'),
  NEXTAUTH_URL:fixture.base,NEXT_PUBLIC_BASE_URL:fixture.base,NEXT_PUBLIC_APP_URL:fixture.base,
  ACCOUNTANT_INVITE_ENCRYPTION_KEY:randomBytes(32).toString('hex')})
const log=fs.openSync(path.join(base,'af06-next.log'),'a')
const child=spawn(process.execPath,['scripts/dev-app-safe.js','--hostname','127.0.0.1'],{
  cwd:path.join(root,'.codex-tmp/af06-browser-app'),env,windowsHide:true,stdio:['ignore',log,log]})
fs.writeFileSync(path.join(base,'af06-next.pid'),String(child.pid))
console.log('Owned AF06 Next server PID '+child.pid+' at '+fixture.base)
child.on('exit',code=>{process.exitCode=code??1})
process.on('SIGINT',()=>child.kill())
process.on('SIGTERM',()=>child.kill())

