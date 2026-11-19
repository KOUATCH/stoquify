// Fresh, retained local databases only; source is the synthetic audit database.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{Client}=require('pg');
const root=process.cwd(),f=JSON.parse(fs.readFileSync(path.join(root,'.codex-tmp/workflow-closure-private.json'),'utf8')),source=new URL(f.url),mode=process.argv[2];
if(process.env.NODE_ENV==='production'||source.hostname!=='localhost'||source.pathname!=='/stoquify_pos_audit_20261026_d30f'||!['upgrade','restore'].includes(mode))throw Error('Wrong disposable scope');
const name='stoquify_local_closure_'+mode+'_'+crypto.randomBytes(4).toString('hex'),target=new URL(source);target.pathname='/'+name;
const {createNewDatabase}=require(path.join(root,'scripts/prisma-local-fresh-bootstrap'));
const migrations=fs.readdirSync(path.join(root,'prisma/migrations')).filter(n=>fs.existsSync(path.join(root,'prisma/migrations',n,'migration.sql'))).sort();
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function run(bin,args,env,label){const r=spawnSync(bin,args,{env,encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:10*1024*1024});fs.writeFileSync(path.join(__dirname,label+'.log'),String(r.stdout||'')+String(r.stderr||''));if(r.error||r.status!==0)throw Error(label+' failed; inspect log');}
const pgEnv=u=>({...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGDATABASE:u.pathname.slice(1)});
async function profile(c){const tables=(await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;const rows=[];for(const {tablename} of tables){if(tablename==='_prisma_migrations')continue;const r=(await c.query(`SELECT count(*)::text AS count, md5(coalesce(string_agg(j, E'\\n' ORDER BY j),'')) AS digest FROM (SELECT row_to_json(t)::text AS j FROM "${tablename}" t) s`)).rows[0];rows.push({table:tablename,...r})}return rows}
async function main(){await createNewDatabase(target,name);const src=new Client({connectionString:source.toString()}),dst=new Client({connectionString:target.toString()});await src.connect();await dst.connect();try{
 if(mode==='upgrade'){
  const dir=path.join(root,'.codex-tmp',name);fs.mkdirSync(path.join(dir,'migrations'),{recursive:true});fs.copyFileSync(path.join(root,'prisma/schema.prisma'),path.join(dir,'schema.prisma'));fs.copyFileSync(path.join(root,'prisma/migrations/migration_lock.toml'),path.join(dir,'migrations/migration_lock.toml'));
  const pre=migrations.filter(n=>n<'20261004130000_purchase_order_authoring');
  const copy=n=>{fs.mkdirSync(path.join(dir,'migrations',n));fs.copyFileSync(path.join(root,'prisma/migrations',n,'migration.sql'),path.join(dir,'migrations',n,'migration.sql'))};pre.forEach(copy);
  const env={...process.env,NODE_ENV:'test',DATABASE_URL:target.toString(),DIRECT_URL:target.toString(),SHADOW_DATABASE_URL:target.toString()};
  run(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy','--schema',path.join(dir,'schema.prisma')],env,'upgrade-before');
  const org=JSON.parse(fs.readFileSync(path.join(__dirname,'authoring-reconciliation.json'),'utf8'))[0].organizationId,baseline=[];
  for(const table of ['organizations','users','locations','items','suppliers','purchase_orders','purchase_order_lines']){
   const cols=(await dst.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",[table])).rows.map(r=>r.column_name);
   const clause=table==='organizations'?'id=$1':table==='purchase_order_lines'?'"purchaseOrderId" IN (SELECT id FROM purchase_orders WHERE "organizationId"=$1)':'"organizationId"=$1';
   // Server JSON preserves timestamp-without-time-zone text; client Date
   // conversion would shift these values through the host's local timezone.
   const rows=(await src.query(`SELECT row_to_json(t) AS value FROM (SELECT ${cols.map(c=>'"'+c+'"').join(',')} FROM "${table}" WHERE ${clause} ORDER BY id) t`,[org])).rows.map(r=>r.value);
   for(const row of rows)await dst.query(`INSERT INTO "${table}" SELECT * FROM json_populate_record(NULL::"${table}",$1::json)`,[JSON.stringify(row)]);
   baseline.push({table,cols,count:rows.length,sha256:hash(rows)});
  }
  migrations.filter(n=>!pre.includes(n)).forEach(copy);
  run(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy','--schema',path.join(dir,'schema.prisma')],env,'upgrade-after');
  fs.writeFileSync(path.join(__dirname,'upgrade-baseline.json'),JSON.stringify({database:name,baseline},null,2));
  for(const row of baseline){const actual=(await dst.query(`SELECT row_to_json(t) AS value FROM (SELECT ${row.cols.map(c=>'"'+c+'"').join(',')} FROM "${row.table}" ORDER BY id) t`)).rows.map(r=>r.value);assert.equal(hash(actual),row.sha256,'Preserved fields differ in '+row.table)}
  const applied=(await dst.query('SELECT migration_name,checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name')).rows;assert.equal(applied.length,migrations.length);
  assert.equal((await dst.query('SELECT count(*) FROM purchase_order_authoring_drafts')).rows[0].count,'0');
  fs.writeFileSync(path.join(__dirname,'upgrade-results.json'),JSON.stringify({status:'PASS',database:name,preMigrationCount:pre.length,finalMigrationCount:applied.length,sourceOrganization:org,preserved:baseline,applied,scope:'Existing populated pre-authoring organizations, users, locations, items, suppliers, purchase orders and lines; not all historic production variants.'},null,2));
 }else{
  const dump=path.join(root,'.codex-tmp',name+'.dump'),bin='C:/Program Files/PostgreSQL/17/bin';
  const before=await profile(src);
  run(path.join(bin,'pg_dump.exe'),['--format=custom','--no-owner','--no-privileges','--file='+dump],pgEnv(source),'restore-dump');
  run(path.join(bin,'pg_restore.exe'),['--exit-on-error','--no-owner','--no-privileges','--dbname='+name,dump],pgEnv(target),'restore-load');
  const restored=await profile(dst),after=await profile(src);assert.deepEqual(after,before,'Source changed during dump');assert.deepEqual(restored,before);
  fs.writeFileSync(path.join(__dirname,'restore-results.json'),JSON.stringify({status:'PASS',source:source.pathname.slice(1),database:name,tables:restored,sourceStable:true,dumpSha256:crypto.createHash('sha256').update(fs.readFileSync(dump)).digest('hex'),retained:true},null,2));
 }
 console.log(JSON.stringify({mode,status:'PASS',database:name}));
 }finally{await src.end();await dst.end()}}
main().catch(e=>{console.error(e.message);process.exitCode=1});
