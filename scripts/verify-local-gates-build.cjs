// Frozen full application source, no .env, no migration, no provider credentials.
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const {spawn,execFile}=require('node:child_process');
const {capture,restore}=require('./candidate-snapshot.cjs');
const {prepare}=require('./release-artifact.cjs');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function main() {
  const [evidence, previousSource]=process.argv.slice(2), root=process.cwd();
  if (!evidence || !fs.statSync(evidence).isDirectory()) throw new Error('Existing evidence directory required');
  if(previousSource&&!/^[a-f0-9]{10}-build-source\.json$/.test(path.basename(previousSource)))throw new Error('Recorded build source required');
  const source=previousSource?JSON.parse(fs.readFileSync(previousSource)):capture(root), suffix=crypto.randomBytes(5).toString('hex');
  const candidate=path.join(root,'.codex-tmp','full-app-'+(previousSource?path.basename(previousSource).slice(0,10):suffix));
  if(!previousSource)restore(source,candidate);
  // Existing installed dependencies only. This does not prove a clean lockfile install.
  if(!previousSource)fs.symlinkSync(path.join(root,'node_modules'),path.join(candidate,'node_modules'),'junction');
  const manifest=source.files.map(({path,sha256})=>({path,sha256}));
  for(const file of manifest)if(hash(fs.readFileSync(path.join(candidate,file.path)))!==file.sha256)throw new Error('Frozen source differs from recorded input: '+file.path);
  fs.writeFileSync(path.join(evidence,suffix+'-build-source.json'),JSON.stringify({head:source.head,files:manifest},null,2),{flag:'wx'});
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE|SystemDrive|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS)$/i.test(key)));
  Object.assign(env,{NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',NODE_OPTIONS:'--max-old-space-size=8192 --require '+JSON.stringify(path.join(root,'scripts/local-gates-network.cjs')),DATABASE_URL:'postgresql://synthetic:synthetic@127.0.0.1:1/no_database',AUTH_SECRET:crypto.randomBytes(32).toString('hex'),NEXTAUTH_URL:'http://localhost:3000',NEXT_PUBLIC_BASE_URL:'http://localhost:3000'});
  const dependencyMode=fs.lstatSync(path.join(candidate,'node_modules')).isSymbolicLink()?'Existing node_modules junction; clean installation unverified':'Candidate-local dependency directory; consult separate installation evidence, strict clean installation not certified here';
  const report={candidate,sourceHead:source.head,productionTouched:false,compiled:false,artifact:null,releaseReady:false,dependencyMode,startedAt:new Date().toISOString()};
  const identity=()=>manifest.map(({path:file})=>({path:file,sha256:hash(fs.readFileSync(path.join(candidate,file)))}));
  try {
    report.artifact=await prepare(candidate,path.join(candidate,'sealed-artifact'),{env,sourceIdentity:identity,runScript:async()=>{
      const log=fs.openSync(path.join(evidence,suffix+'-build.log'),'wx');
      const child=spawn(process.execPath,[path.join(candidate,'node_modules/next/dist/bin/next'),'build'],{cwd:candidate,env,stdio:['ignore',log,log],windowsHide:true});fs.closeSync(log);
      const timer=setTimeout(()=>{report.timedOut=true;if(process.platform==='win32')execFile('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true},()=>{});else child.kill();},1800000);
      try { const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve)});report.exitCode=code;if(code!==0)throw new Error('Full application compilation failed; see retained log');report.compiled=true; }
      finally {clearTimeout(timer)}
    }});
  } catch(error) { report.error=error.message; process.exitCode=1; }
  finally {report.completedAt=new Date().toISOString();fs.writeFileSync(path.join(evidence,suffix+'-build.json'),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));}
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
