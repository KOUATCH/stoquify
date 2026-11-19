const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process'),{Client}=require('pg');
const {root,state,environment,pointer,redact}=require('./environment.cjs');
async function main(){const s=state(),client=new Client({connectionString:s.url});await client.connect();
 try{const row=(await client.query("SELECT current_database() AS name,current_setting('data_directory') AS directory")).rows[0];if(row.name!==s.database||path.resolve(row.directory).toLowerCase()!==s.cluster.toLowerCase())throw Error('Wrong private cluster');
 const result=spawnSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','deploy','--config',path.join(s.work,'prisma.config.ts')],{cwd:s.work,env:environment(s,'test'),encoding:'utf8',timeout:240000,windowsHide:true,maxBuffer:20e6});
 fs.writeFileSync(path.join(__dirname,'fresh-migration.log'),redact(result.stdout)+redact(result.stderr));
 const saved=JSON.parse(fs.readFileSync(pointer));saved.migrationExitCode=result.status;fs.writeFileSync(pointer,JSON.stringify(saved,null,2));
 const report=JSON.parse(fs.readFileSync(path.join(__dirname,'target-evidence.json')));report.migrationExitCode=result.status;
 if(result.status===0){const rows=(await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows;const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'migration-catalog.json')));if(rows.length!==catalog.length||rows.some((r,i)=>r.migration_name!==catalog[i].name||r.checksum!==catalog[i].sha256||!r.finished_at||r.rolled_back_at))throw Error('Migration ledger mismatch');report.migrationLedgerVerified=true;report.migrationCount=rows.length;}
 fs.writeFileSync(path.join(__dirname,'target-evidence.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({migrationExitCode:result.status,migrationCount:report.migrationCount,ledgerVerified:!!report.migrationLedgerVerified}));process.exitCode=result.status??1;
 }finally{await client.end()}}
 main().catch(e=>{console.error(redact(e.message));process.exitCode=1});
