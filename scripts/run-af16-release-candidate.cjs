// Rehearse the existing build pipeline on the frozen AF16 copy. Never promotes a schema.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const candidate=path.join(root,'.codex-tmp/af16-release-20261026');
const output=path.join(root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-26-run-02');
const artifact=path.join(root,'.codex-tmp/af16-artifact-20261026');
const args=process.argv.slice(2);
const attempt=args.length===0?1:(args.length===2&&args[0]==='--attempt'&&/^[2-9]$/.test(args[1])?Number(args[1]):null);
if(attempt===null)throw Error('Usage: node scripts/run-af16-release-candidate.cjs [--attempt 2..9]');
const suffix=attempt===1?'':`-attempt-${attempt}`;
// The full application needs more than the default 30-minute compiler budget on this host.
// Keep the outer budget longer than compilation plus lint and artifact sealing.
const buildTimeoutMs=60*60*1000, pipelineTimeoutMs=90*60*1000;
const env={};
for(const key of ['PATH','Path','PATHEXT','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC'])if(process.env[key])env[key]=process.env[key];
Object.assign(env,{NEXT_TELEMETRY_DISABLED:'1',DATABASE_URL:'postgresql://af16@127.0.0.1:55451/stoquify_local_af16_20261026_build_r2',DIRECT_URL:'postgresql://af16@127.0.0.1:55451/stoquify_local_af16_20261026_build_r2',NEXTAUTH_URL:'https://127.0.0.1:3186',NEXT_PUBLIC_BASE_URL:'https://127.0.0.1:3186',NEXT_PUBLIC_APP_URL:'https://127.0.0.1:3186',STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS:'0',STOQUIFY_STATEMENT_WHATSAPP_LIVE_SENDS:'0',STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS:'0'});
env.BUILD_APP_TIMEOUT_MS=String(buildTimeoutMs);
for(const key of ['AUTH_SECRET','NEXTAUTH_SECRET','BETTER_AUTH_SECRET','PUBLIC_IDENTITY_ABUSE_HASH_SECRET','AQSTOQFLOW_RECEIPT_TOKEN_SECRET','AQSTOQFLOW_HISTORY_CURSOR_SECRET','AQSTOQFLOW_STATEMENT_TOKEN_SECRET','AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY','AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY'])env[key]=crypto.randomBytes(32).toString('hex');
function run(args,label){
  const fd=fs.openSync(path.join(output,label+'.log'),'wx');
  const start=Date.now();
  const result=spawnSync(process.execPath,args,{cwd:candidate,env,windowsHide:true,stdio:['ignore',fd,fd],timeout:pipelineTimeoutMs});fs.closeSync(fd);
  const receipt={label,exitCode:result.status,signal:result.signal,elapsedMs:Date.now()-start,error:result.error?.message||null,buildTimeoutMs,pipelineTimeoutMs,runnerSha256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex')};
  fs.writeFileSync(path.join(output,label+'.json'),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));return result.status;
}
async function main(){
  if(!fs.existsSync(path.join(output,'candidate-preparation.json')))throw Error('Prepare the candidate first');
  if(fs.existsSync(artifact))throw Error('Refusing existing artifact');
  if(fs.readdirSync(candidate).some(name=>name==='.env'||name.startsWith('.env.')))throw Error('Environment file in candidate');
  const npm=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
  if(!fs.existsSync(npm))throw Error('Installed npm CLI missing');
  if(attempt>1){
    const inspected=require('./build-app-safe.js').inspectBuildProcesses({includeDevProcesses:false});
    const result={attempt,processInspectionError:inspected.error?.message||null,activeBuildPids:inspected.orphans.map(row=>row.pid),passed:!inspected.error&&inspected.orphans.length===0};
    fs.writeFileSync(path.join(output,'retry-precheck'+suffix+'.json'),JSON.stringify(result,null,2),{flag:'wx'});
    if(!result.passed)throw Error('Build precheck is blocked; no retry started and no other process was stopped');
    if(JSON.parse(fs.readFileSync(path.join(output,'client-generation.json'),'utf8')).exitCode!==0)throw Error('Successful retained client generation required');
    const expected=JSON.parse(fs.readFileSync(path.join(output,'source-manifest.json'),'utf8')).files.map(({path,sha256})=>({path,sha256}));
    const actual=require('./candidate-snapshot.cjs').capture(candidate).files.map(({path,sha256})=>({path,sha256}));
    if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error('Frozen candidate changed; prepare a separately reviewed candidate');
  }
  const probe=new (require('pg').Client)({connectionString:env.DATABASE_URL,connectionTimeoutMillis:5000});
  await probe.connect();
  try{
    await require('./af16-verification-context.cjs').guard(probe);
    const rows=(await probe.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
    const catalog=fs.readdirSync(path.join(candidate,'prisma/migrations')).filter(name=>fs.existsSync(path.join(candidate,'prisma/migrations',name,'migration.sql'))).sort();
    if(JSON.stringify(rows.map(row=>row.migration_name))!==JSON.stringify(catalog))throw Error('Build database catalog differs');
    for(const row of rows)if(!row.finished_at||row.rolled_back_at||row.checksum!==crypto.createHash('sha256').update(fs.readFileSync(path.join(candidate,'prisma/migrations',row.migration_name,'migration.sql'))).digest('hex'))throw Error('Build database migration mismatch');
  }finally{await probe.end();}
  fs.writeFileSync(path.join(output,'build-scope'+suffix+'.json'),JSON.stringify({attempt,candidate,artifact,configuration:'Fresh synthetic secrets; inherited environment allowlist; live delivery disabled; no .env files',command:'npm run release:artifact -- <new owned artifact>',databaseTarget:'127.0.0.1:55451/stoquify_local_af16_20261026_build_r2',releasePreflight:'Existing auto mode outside release; conditional warnings do not certify production configuration',environmentVariableNames:Object.keys(env).sort()},null,2),{flag:'wx'});
  let code=0;
  if(attempt===1)code=run(['node_modules/prisma/build/index.js','generate'],'client-generation');
  if(code!==0){process.exitCode=1;return;}
  code=run([npm,'run','release:artifact','--',artifact],'artifact-build'+suffix);
  if(code!==0){process.exitCode=1;return;}
  const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(artifact,'artifact.json'))).digest('hex');
  fs.writeFileSync(path.join(output,'artifact-digest.json'),JSON.stringify({sha256:digest,origin:'Digest captured immediately from the artifact produced by this run'},null,2),{flag:'wx'});
  process.exitCode=run([npm,'run','release:artifact:verify','--',artifact,digest],'artifact-verify'+suffix)===0?0:1;
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
