// Reuse only the AF16-owned synthetic cluster and clone its verified empty schema template.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{Client}=require('pg');
const c=require('./af16-verification-context.cjs');
const name='stoquify_local_af16_20261026_build_r2';
const candidate=path.join(c.root,'.codex-tmp/af16-release-20261026');
const output=path.join(c.root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF16/2026-10-26-run-02');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function main(){
  const probe=new Client({connectionString:c.url('template'),connectionTimeoutMillis:5000});await probe.connect();
  let rows;
  try{
    await c.guard(probe);
    rows=(await probe.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;
    const catalog=fs.readdirSync(path.join(candidate,'prisma/migrations')).filter(n=>fs.existsSync(path.join(candidate,'prisma/migrations',n,'migration.sql'))).sort();
    if(JSON.stringify(rows.map(r=>r.migration_name))!==JSON.stringify(catalog))throw Error('Current candidate differs from the verified template catalog');
    for(const row of rows)if(!row.finished_at||row.rolled_back_at||row.checksum!==hash(fs.readFileSync(path.join(candidate,'prisma/migrations',row.migration_name,'migration.sql'))))throw Error('Migration checksum/state mismatch');
    const counts=(await probe.query('SELECT (SELECT count(*) FROM users)::int users,(SELECT count(*) FROM organizations)::int organizations')).rows[0];
    if(counts.users!==0||counts.organizations!==0)throw Error('Template is not empty');
  }finally{await probe.end();}
  const admin=new Client({connectionString:'postgresql://af16@127.0.0.1:55451/postgres',connectionTimeoutMillis:5000});await admin.connect();
  try{
    await c.guard(admin);
    if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount)throw Error('Refusing existing build database');
    await admin.query(`CREATE DATABASE "${name}" TEMPLATE "${c.database('template')}"`);
  }finally{await admin.end();}
  fs.writeFileSync(path.join(output,'build-database.json'),JSON.stringify({name,host:'127.0.0.1',port:55451,clusterGuardPassed:true,sourceTemplate:c.database('template'),migrations:rows.length,checksumsMatch:true,emptyTemplateConfirmed:true,operation:'CREATE DATABASE from retained synthetic template; no existing database reset or migration'},null,2),{flag:'wx'});
  console.log('Created a fresh build-only database from the verified synthetic template.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
