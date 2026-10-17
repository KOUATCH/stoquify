const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {Client}=require('pg');const dotenv=require('dotenv');
for(const p of ['.env.local','.env']){if(fs.existsSync(p))dotenv.config({path:p,quiet:true});}
const output={capturedAt:new Date().toISOString(),scope:'read-only PostgreSQL metadata; no business row values',queries:[]};
const raw=process.env.DATABASE_URL||process.env.DIRECT_URL;
const expanded=raw?.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g,(_,k)=>process.env[k]||'').replace(/^['"]|['"]$/g,'').trim();
const save=()=>fs.writeFileSync(path.join(__dirname,'verification/database-metadata.json'),JSON.stringify(output,null,2));
if(!expanded){output.status='UNAVAILABLE_NO_CONNECTION';save();console.log(output.status);process.exit();}
const url=new URL(expanded);output.targetKind=['localhost','127.0.0.1','::1'].includes(url.hostname)?'local':'remote';output.targetFingerprint=crypto.createHash('sha256').update(url.hostname+url.pathname).digest('hex');
const client=new Client({connectionString:expanded,connectionTimeoutMillis:12000,application_name:'stoquify_read_only_audit',options:'-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=2000'});
(async()=>{try{
 await client.connect();await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
 async function q(name,sql){const r=await client.query(sql);output[name]=r.rows;output.queries.push({name,sql,rowCount:r.rowCount});}
 await q('session',"SELECT current_setting('transaction_read_only') AS read_only, current_setting('server_version') AS server_version, current_schema() AS schema");
 await q('tables',"SELECT c.relname AS table_name,c.reltuples::bigint AS estimated_rows,c.relrowsecurity AS rls,c.relforcerowsecurity AS force_rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname");
 await q('columns',"SELECT table_name,column_name,data_type,is_nullable,numeric_precision,numeric_scale FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position");
 await q('constraints',"SELECT c.conname,c.contype,r.relname AS table_name,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' ORDER BY r.relname,c.conname");
 await q('triggers',"SELECT c.relname AS table_name,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname");
 await q('indexes',"SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname");
 if(output.tables.some(t=>t.table_name==='_prisma_migrations'))await q('migrations','SELECT migration_name,checksum,finished_at,rolled_back_at,applied_steps_count FROM public._prisma_migrations ORDER BY started_at');
 await client.query('ROLLBACK');output.status='READ_ONLY_METADATA_CAPTURED';
 }catch(e){output.status='UNVERIFIED_CONNECTION_OR_QUERY_FAILED';output.error={code:e.code||e.name,message:String(e.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[redacted]').replaceAll(url.hostname,'[host]').replaceAll(url.username,'[user]')};}finally{await client.end().catch(()=>{});save();console.log(JSON.stringify({status:output.status,targetKind:output.targetKind,tables:output.tables?.length,triggers:output.triggers?.length,migrations:output.migrations?.length,error:output.error},null,2));}})();
