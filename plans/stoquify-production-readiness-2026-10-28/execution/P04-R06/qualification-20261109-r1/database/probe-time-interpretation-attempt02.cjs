// Bounded read-only timestamp interpretation probe; no application call or database mutation.
const {fs,path,assert,hash,receipt,connect,target,candidate}=require('./database-common.cjs');
const report={startedAt:new Date().toISOString(),passed:false,databaseRowMutations:0};
async function main(){
 assert.equal(process.argv.length,2);const packet=path.resolve(__dirname,'..'),admission=JSON.parse(fs.readFileSync(path.join(packet,'independent-review/TIME-PROBE-RECIPE-ADMISSION-attempt02.json')));assert.equal(admission.passed,true);for(const row of admission.files)assert.equal(hash(fs.readFileSync(path.join(packet,row.path))),row.sha256);
 const resultPath=path.join(packet,'browser/auth-r06-attempt02/result.json'),result=JSON.parse(fs.readFileSync(resultPath)),failed=result.checks.find(row=>row.id==='R06-C-login');assert(failed&&!failed.passed);
 const findSnapshot=prefix=>{const names=fs.readdirSync(__dirname).filter(name=>name.startsWith(prefix)&&name.endsWith('.json'));assert.equal(names.length,1);return{path:names[0],sha256:hash(fs.readFileSync(path.join(__dirname,names[0]))),value:JSON.parse(fs.readFileSync(path.join(__dirname,names[0])))};};
 const before=findSnapshot('snapshot-credential-positive-before-'),after=findSnapshot('snapshot-credential-positive-after-');
 report.historical={mainResultSha256:hash(fs.readFileSync(resultPath)),failedGroup:failed,signInsWithinGroup:result.signIns.filter(row=>row.alias==='active'&&row.at>=failed.startedAt&&row.at<=failed.finishedAt),before:{path:before.path,sha256:before.sha256,at:before.value.at},after:{path:after.path,sha256:after.sha256,at:after.value.at},lastLoginFieldHashes:{before:before.value.userRows.find(row=>row.idHash===hash('p04r06-active')).fieldHashes.lastLogin,after:after.value.userRows.find(row=>row.idHash===hash('p04r06-active')).fieldHashes.lastLogin},limit:'Original exact requestedAt/finishedAt millisecond variables and raw lastLogin value were not persisted by the failed group. Its group bounds, sign-in start and hashed before/after snapshots remain preserved. Current database values below may reflect later valid logins and do not reconstruct the historical assertion.'};
 const client=await connect(target.full);try{
  await client.query('BEGIN TRANSACTION READ ONLY');
  report.server=(await client.query("SELECT current_setting('TimeZone') AS timezone,clock_timestamp() AS clock,localtimestamp::text AS local_timestamp")).rows[0];
  report.columns=(await client.query("SELECT column_name,data_type,udt_name,datetime_precision FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name IN ('lastLogin','lastFailedLogin','lockedUntil') ORDER BY column_name")).rows;
  const row=(await client.query('SELECT id,pg_typeof("lastLogin")::text AS last_login_type,"lastLogin"::text AS last_login_raw,"lastLogin" AS last_login_default_pg,("lastLogin" AT TIME ZONE \'UTC\') AS last_login_explicit_utc,extract(epoch FROM ("lastLogin" AT TIME ZONE \'UTC\'))*1000 AS last_login_utc_epoch_ms FROM users WHERE id=$1',['p04r06-active'])).rows[0];assert(row);report.current=row;
  report.controlLiteral=(await client.query("SELECT timestamp '1970-01-01 00:00:00' AS default_pg,timestamp '1970-01-01 00:00:00'::text AS raw,(timestamp '1970-01-01 00:00:00' AT TIME ZONE 'UTC') AS explicit_utc")).rows[0];
  await client.query('COMMIT');
 }finally{await client.end();}
 report.node={version:process.version,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,timezoneOffsetMinutes:new Date().getTimezoneOffset(),TZ:process.env.TZ??null};
 const pg=require(path.join(candidate,'node_modules/pg'));report.parser={timestampOid:1114,implementationSha256:hash(pg.types.getTypeParser(1114,'text').toString()),pgVersion:require(path.join(candidate,'node_modules/pg/package.json')).version};
 report.comparison={defaultPgEpochMs:new Date(report.current.last_login_default_pg).getTime(),explicitUtcEpochMs:new Date(report.current.last_login_explicit_utc).getTime(),differenceMs:new Date(report.current.last_login_default_pg).getTime()-new Date(report.current.last_login_explicit_utc).getTime(),sqlUtcEpochMs:Number(report.current.last_login_utc_epoch_ms)};
 assert.equal(report.comparison.explicitUtcEpochMs,report.comparison.sqlUtcEpochMs);report.passed=true;
}
main().catch(error=>{report.error=error.stack||error.message;process.exitCode=1;}).finally(()=>{report.finishedAt=new Date().toISOString();receipt('time-interpretation-attempt02',report);console.log(JSON.stringify({passed:report.passed,error:report.error,node:report.node,comparison:report.comparison}));});
