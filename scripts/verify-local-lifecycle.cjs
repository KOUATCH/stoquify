// New clone of the proven synthetic upgrade, then the existing lifecycle lane.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {Client}=require('pg'),{spawnSync}=require('node:child_process');
const {resolveTarget}=require('./s04-s05-target.cjs');
async function main(){
  const [record,evidence]=process.argv.slice(2),r=JSON.parse(fs.readFileSync(record));assert.equal(r.passed,true);assert.equal(r.sourceClass,'Retained synthetic S12 data, cloned before upgrade');assert.match(r.restoreName,/^stoquify_restore_s12_\d{8}_[a-f0-9]{10}$/);
  const name='stoquify_pos_audit_'+new Date().toISOString().slice(0,10).replaceAll('-','')+'_'+crypto.randomBytes(5).toString('hex'),target=resolveTarget(name),admin=new URL(target);admin.pathname='/postgres';
  const client=new Client({connectionString:admin.toString()});await client.connect();
  try{assert.equal((await client.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount,0);await client.query(`CREATE DATABASE "${name}" TEMPLATE "${r.restoreName}"`)}finally{await client.end()}
  fs.writeFileSync(path.join(evidence,name+'-identity.json'),JSON.stringify({name,host:'localhost',sourceClass:r.sourceClass,clonedFrom:r.restoreName}),{flag:'wx'});
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE)$/i.test(key)));
  const probe=new Client({connectionString:target.toString()});await probe.connect();
  try {
    const rows=(await probe.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
    assert.equal(rows.length,r.migrations.length);
    rows.forEach((row,i)=>{assert.equal(row.migration_name,r.migrations[i].name);assert.equal(row.checksum,r.migrations[i].sha256);assert.ok(row.finished_at&&!row.rolled_back_at);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join('prisma/migrations',row.migration_name,'migration.sql'))).digest('hex'),row.checksum)});
  } finally {await probe.end()}
  // Explicit frozen-catalog query/locking fixture, not current-catalog release certification.
  const untestedMigrations=fs.readdirSync('prisma/migrations').filter(n=>fs.existsSync(path.join('prisma/migrations',n,'migration.sql'))&&!r.migrations.some(m=>m.name===n));
  fs.writeFileSync(path.join(evidence,name+'-lifecycle-scope.json'),JSON.stringify({catalogCount:r.migrations.length,untestedMigrations,releaseReady:false,scope:'Disposable indexed table/locking fixture; not full financial or current catalog qualification'},null,2),{flag:'wx'});
  target.searchParams.set('schema','codex_pos_lifecycle_20260920');Object.assign(env,{NODE_ENV:'test',DATABASE_URL:target.toString(),DIRECT_URL:target.toString(),SHADOW_DATABASE_URL:target.toString(),RUN_S04_S05_POSTGRES:'1',RUN_POS_LIFECYCLE_POSTGRES:'1',POS_DISPOSABLE_DATABASE_NAME:name});
  const result=spawnSync(process.execPath,['node_modules/jest/bin/jest.js','--config','jest.s04-s05.config.cjs','--runInBand','--no-cache','--runTestsByPath','services/pos/__tests__/checkout-lifecycle.postgres.test.ts','--json','--outputFile='+path.join(evidence,name+'-lifecycle.json')],{env,encoding:'utf8',timeout:300000,windowsHide:true});
  fs.writeFileSync(path.join(evidence,name+'-lifecycle-runner.log'),((result.stdout||'')+(result.stderr||'')).replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[REDACTED_DATABASE_URL]'),{flag:'wx'});console.log('Lifecycle exit '+result.status);assert.equal(result.status,0,'Lifecycle runner failed');
}
main().catch(error=>{console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[REDACTED_DATABASE_URL]'));process.exitCode=1});
