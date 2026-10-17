// Clone only the retained synthetic S12 source into a NEW target, then upgrade.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const { sourceTarget } = require('./s12-target.cjs');
const { createNewDatabase } = require('./prisma-local-fresh-bootstrap.js');
const { pgEnvironment } = require('./prisma-local-restore-rehearsal.js');
const { profileAll } = require('./run-s12-rehearsal.cjs');
const { withMigrationLock } = require('./promote-release-schema.cjs');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function main() {
  const [record, evidence] = process.argv.slice(2), root = process.cwd();
  const previous = JSON.parse(fs.readFileSync(record));
  assert.equal(previous.sourceClass, 'New synthetic S12 fixture only');
  assert.equal(previous.localRehearsalPassed, true);
  assert.match(previous.sourceName, /^stoquify_pos_audit_\d{8}_[a-f0-9]{10}$/);
  assert.ok(fs.statSync(evidence).isDirectory());
  const suffix = crypto.randomBytes(5).toString('hex');
  const name = `stoquify_restore_s12_${new Date().toISOString().slice(0,10).replaceAll('-','')}_${suffix}`;
  const source = sourceTarget(previous.sourceName), target = new URL(source); target.pathname = '/' + name;
  const fixture = path.join(root,'.codex-tmp','local-upgrade-'+suffix); fs.mkdirSync(fixture,{recursive:false});
  const schema = path.join(fixture,'prisma'); fs.mkdirSync(schema);
  fs.copyFileSync('prisma/schema.prisma',path.join(schema,'schema.prisma'));
  fs.cpSync('prisma/migrations',path.join(schema,'migrations'),{recursive:true,errorOnExist:true});
  const migrations = fs.readdirSync(path.join(schema,'migrations')).filter(n=>fs.existsSync(path.join(schema,'migrations',n,'migration.sql'))).sort().map(name=>({name,sha256:hash(fs.readFileSync(path.join(schema,'migrations',name,'migration.sql')))}));
  const osEnv = Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE|SystemDrive|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS)$/i.test(key)));
  const env = {...osEnv,NODE_ENV:'test',DATABASE_URL:target.toString(),DIRECT_URL:target.toString(),SHADOW_DATABASE_URL:target.toString(),RUN_S12_REHEARSAL:'1',S12_DATABASE_NAME:name,S12_FIXTURE:record.replace(/-rehearsal\.json$/,'-fixture.json'),S12_RESULT:path.join(evidence,suffix+'-operations-detail.json'),AUTH_SECRET:'synthetic-s12-auth-secret-not-used-outside-local-rehearsal',NEXTAUTH_URL:'http://localhost:3000',NEXT_PUBLIC_BASE_URL:'http://localhost:3000'};
  const report = {sourceName:previous.sourceName,restoreName:name,productionTouched:false,sourceClass:'Retained synthetic S12 data, cloned before upgrade',migrations,checks:[],passed:false,releaseReady:false};
  function run(binary,args,environment,label) {
    const result=spawnSync(binary,args,{cwd:['operations','auth'].includes(label)?root:fixture,env:environment,encoding:'utf8',timeout:300000,maxBuffer:8e6,windowsHide:true});
    fs.writeFileSync(path.join(evidence,suffix+'-'+label+'.log'),((result.stdout||'')+(result.stderr||'')).replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[REDACTED_DATABASE_URL]'),{flag:'wx'});
    report.checks.push({label,exitCode:result.status}); assert.equal(result.status,0,label); console.log(label+': passed');
  }
  const client=new Client({connectionString:target.toString()});
  try {
    const sourceBefore=await profileAll(source.toString());
    run('C:/Program Files/PostgreSQL/17/bin/pg_dump.exe',['--format=custom','--no-owner','--no-privileges','--file='+path.join(fixture,'synthetic.dump')],pgEnvironment(source,osEnv),'dump');
    await createNewDatabase(target,name);
    run('C:/Program Files/PostgreSQL/17/bin/pg_restore.exe',['--exit-on-error','--no-owner','--no-privileges','--dbname='+name,path.join(fixture,'synthetic.dump')],pgEnvironment(target,osEnv),'restore');
    assert.deepEqual(await profileAll(target.toString()),sourceBefore);
    await client.connect();
    const oldHistory=(await client.query('SELECT migration_name,checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name')).rows;
    assert.deepEqual(oldHistory.map(r=>r.migration_name),migrations.slice(0,oldHistory.length).map(m=>m.name));
    oldHistory.forEach((r,i)=>assert.equal(r.checksum,migrations[i].sha256));
    report.predecessorCount=oldHistory.length; report.pending=migrations.slice(oldHistory.length).map(m=>m.name);
    // Fail closed on a different upgrade boundary: inspect new SQL before widening.
    assert.deepEqual(report.pending,['20261016180000_close_source_publication_guard','20261016200000_close_payable_sources','20261016220000_bank_balance_evidence']);
    await withMigrationLock(new Client({connectionString:target.toString()}),async()=>run(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','deploy','--schema',path.join(schema,'schema.prisma')],env,'populated-upgrade'));
    const after=await profileAll(target.toString());
    // Reviewed payable/bank-balance contract backfills deliberately invalidate retained close evidence.
    const expectedMutable = ['_prisma_migrations','close_runs','close_pack_exports'];
    for (const row of sourceBefore.filter(r=>!expectedMutable.includes(r.table))) assert.deepEqual(after.find(r=>r.table===row.table),row,'Existing rows changed: '+row.table);
    for (const table of ['close_runs','close_pack_exports']) assert.equal(after.find(r=>r.table===table).count,sourceBefore.find(r=>r.table===table).count,'Retained close rows lost');
    const history=(await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
    assert.equal(history.length,migrations.length);
    history.forEach((r,i)=>{assert.equal(r.migration_name,migrations[i].name);assert.equal(r.checksum,migrations[i].sha256);assert.ok(r.finished_at&&!r.rolled_back_at)});
    // Prior SQL shape still reads/writes; close source triggers must invalidate stale certification.
    const f=JSON.parse(fs.readFileSync(env.S12_FIXTURE));
    await client.query('UPDATE users SET "firstName"=$1 WHERE id=$2',['Prior SQL client',f.userId]);
    assert.equal((await client.query('SELECT "firstName" FROM users WHERE id=$1',[f.userId])).rows[0].firstName,'Prior SQL client');
    await client.query('UPDATE organizations SET name=name || $1 WHERE id=$2',[' rehearsal',f.organizationId]);
    assert.equal((await client.query('SELECT status FROM close_runs WHERE id=$1',[f.closeRunId])).rows[0].status,'BLOCKED');
    assert.ok(Number((await client.query('SELECT revision FROM close_source_revisions WHERE "organizationId"=$1',[f.organizationId])).rows[0].revision)>0);
    run(process.execPath,[path.join(root,'node_modules/jest/bin/jest.js'),'--config',path.join(root,'jest.s12.config.cjs'),'--runInBand','--no-cache','--runTestsByPath',path.join(root,'tests/s12/operations.postgres.test.ts'),'--json','--outputFile='+path.join(evidence,suffix+'-operations.json')],{...env,S12_EXPECT_UPGRADE_INVALIDATION:'1'},'operations');
    run(process.execPath,['--conditions=react-server','-r',path.join(root,'node_modules/ts-node/register/transpile-only'),'-r',path.join(root,'node_modules/tsconfig-paths/register'),path.join(root,'scripts/s12-auth-probe.ts')],{...env,TS_NODE_PROJECT:path.join(root,'tsconfig.json'),TS_NODE_COMPILER_OPTIONS:JSON.stringify({module:'CommonJS',moduleResolution:'node',jsx:'react-jsx'})},'auth');
    assert.deepEqual(await profileAll(source.toString()),sourceBefore);
    report.sourceUnchanged=true; report.existingTablesPreserved=sourceBefore.length-expectedMutable.length; report.expectedCloseInvalidation=true;
    const currentNames=fs.readdirSync(path.join(root,'prisma/migrations')).filter(n=>fs.existsSync(path.join(root,'prisma/migrations',n,'migration.sql'))).sort();
    report.catalogStillMatches=JSON.stringify(currentNames)===JSON.stringify(migrations.map(m=>m.name))&&migrations.every(m=>hash(fs.readFileSync(path.join(root,'prisma/migrations',m.name,'migration.sql')))===m.sha256);
    assert.ok(report.catalogStillMatches); report.passed=true;
  } finally { await client.end(); fs.writeFileSync(path.join(evidence,suffix+'-upgrade.json'),JSON.stringify(report,null,2),{flag:'wx'}); console.log('Evidence: '+suffix+'-upgrade.json'); }
}
main().catch(error=>{console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[REDACTED_DATABASE_URL]'));process.exitCode=1});
