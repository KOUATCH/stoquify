const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const scratch='C:/Users/J COMPUTER/.codex/visualizations/2026/10/24/01a16e07-5033-74f0-a987-8d57c6717085/hris-recovery-20261025';
const source='postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function fingerprints(db,org){
 const tables=await db.$queryRawUnsafe("SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='organizationId' ORDER BY table_name");const result={};
 for(const {table_name:t}of tables){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(t))throw Error('Unexpected table identifier');const rows=await db.$queryRawUnsafe(`SELECT to_jsonb(t) AS row FROM "${t}" t WHERE "organizationId"=$1`,org);if(rows.length)result[t]={count:rows.length,sha256:sha(JSON.stringify(rows.map(r=>JSON.stringify(r.row)).sort()))}}
 const organization=await db.organization.findUniqueOrThrow({where:{id:org}});result.organization={count:1,sha256:sha(JSON.stringify(organization))};
 const memberships=await db.$queryRawUnsafe('SELECT to_jsonb(m) AS row FROM "_UserRoles" m JOIN users u ON u.id=m."B" WHERE u."organizationId"=$1',org);result.roleMemberships={count:memberships.length,sha256:sha(JSON.stringify(memberships.map(r=>JSON.stringify(r.row)).sort()))};
 const schema=await db.$queryRawUnsafe("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position");result.schemaColumns={count:schema.length,sha256:sha(JSON.stringify(schema))};
 const ledger=await db.$queryRawUnsafe('SELECT to_jsonb(t) AS row FROM hris_local_test_migrations t');result.localMigrationLedger={count:ledger.length,sha256:sha(JSON.stringify(ledger.map(r=>JSON.stringify(r.row)).sort()))};return result;
}
async function snapshot(db,{org,users,employees,objects,environment,packageId}){
 if(process.env.HRIS_CORRECTNESS_DATABASE_URL!==source)throw Error('Owned source required');fs.mkdirSync(scratch,{recursive:true});
 const run=path.join(scratch,org);fs.mkdirSync(run);const database=path.join(run,'database.dump'),fixture=path.join(run,'fixture.json');
 const fingerprintsBefore=await fingerprints(db,org),docs=await db.$queryRawUnsafe('SELECT id,sha256,"employeeId" FROM hris_employee_documents WHERE "organizationId"=$1',org);
 const packages=await db.$queryRawUnsafe('SELECT id,"packageHash","csvBytes" FROM hris_payroll_handoff_packages WHERE "organizationId"=$1 ORDER BY version',org);
 fs.writeFileSync(fixture,JSON.stringify({org,users,employees,environment,storeName:'HR21 synthetic immutable encrypted store',objects:[...objects].map(([k,b])=>[k,b.toString('base64')]),docs,packages,packageId,fingerprints:fingerprintsBefore}));
 const dumped=spawnSync('C:/Program Files/PostgreSQL/17/bin/pg_dump.exe',['--host=127.0.0.1','--port=55464','--username=hris_test','--dbname=stoquify_local_hris_20261024','--no-password','--format=custom','--file='+database],{encoding:'utf8',windowsHide:true});
 if(dumped.status!==0)throw Error('Synthetic pg_dump failed: '+dumped.stderr);const result={status:'BACKUP_CAPTURED',runId:org,database,fixture,hashes:{database:sha(fs.readFileSync(database)),fixture:sha(fs.readFileSync(fixture))},tables:Object.keys(fingerprintsBefore).length,documents:docs.length,packages:packages.length};
 fs.writeFileSync(path.join(__dirname,'backup-manifest.json'),JSON.stringify(result,null,2));return result;
}
module.exports={snapshot,fingerprints,scratch,sha};
