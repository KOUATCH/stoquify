// Fresh AF12 predecessor, populated by the current AF12 scenarios, then additive upgrade.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{Client}=require('pg')
const c=require('./af16-verification-context.cjs')
async function main(){
 const dir=path.join(c.root,'.codex-tmp/af16-baseline'),out=path.join(c.output,'upgrade');fs.mkdirSync(path.join(dir,'migrations'),{recursive:true});fs.mkdirSync(out,{recursive:true})
 const all=fs.readdirSync(path.join(c.root,'prisma/migrations'),{withFileTypes:true})
 for(const e of all){if(['20261025180000_firm_practice_records','20261025180100_firm_practice_integrity'].includes(e.name))continue;fs.cpSync(path.join(c.root,'prisma/migrations',e.name),path.join(dir,'migrations',e.name),{recursive:e.isDirectory()})}
 fs.writeFileSync(path.join(dir,'prisma.config.ts'),'import { defineConfig } from "prisma/config"; export default defineConfig('+JSON.stringify({schema:path.join(c.root,'.codex-tmp/af16-prisma/schema.prisma'),migrations:{path:path.join(dir,'migrations')}})+')')
 const url=c.url('upgrade'),admin=new Client({connectionString:'postgresql://af16@127.0.0.1:55451/postgres'});await admin.connect()
 try{await c.guard(admin);assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[c.database('upgrade')])).rowCount,0);await admin.query(`CREATE DATABASE "${c.database('upgrade')}"`)}finally{await admin.end()}
 const env={...process.env,DATABASE_URL:url,DIRECT_URL:url,SHADOW_DATABASE_URL:url,AF16_POSTGRES_URL:url,AF16_CLUSTER_DIR:c.cluster,AF12_CLUSTER_DIR:c.cluster}
 function run(args,label){const r=spawnSync(process.execPath,args,{cwd:c.root,env,windowsHide:true,encoding:'utf8',timeout:600000});fs.writeFileSync(path.join(out,label+'.log'),(r.stdout||'')+(r.stderr||''));assert.equal(r.status,0,label)}
 run(['node_modules/prisma/build/index.js','migrate','deploy','--config','.codex-tmp/af16-baseline/prisma.config.ts'],'baseline')
 const source=fs.readFileSync(path.join(c.root,'.codex-tmp/af16-tests/AF12.postgres.test.ts'),'utf8')
 const adapted=source.replaceAll(c.url('af12'),url).replaceAll(path.relative(c.root,path.join(c.output,'AF12')).replaceAll('\\','/'),path.relative(c.root,out).replaceAll('\\','/'))
 const test=path.join(c.root,'.codex-tmp/af16-tests/upgrade.postgres.test.ts');fs.writeFileSync(test,adapted)
 run(['node_modules/jest/bin/jest.js','--config','jest.af16-postgres.config.cjs','--runInBand','--runTestsByPath',test,'--json','--outputFile',path.join(out,'baseline-jest.json')],'baseline-scenarios')
 const client=new Client({connectionString:url});await client.connect()
 async function snapshot(){const rows={};for(const table of ['journal_entries','journal_entry_lines','inventory_transactions','inventory_levels','customer_ledger_entries','customer_receivable_documents','supplier_ledger_entries','customers','suppliers','firm_advisory_revisions','accountant_access_grants','firm_engagements'])rows[table]=(await client.query(`SELECT count(*)::integer AS count, md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' ORDER BY id), '')) AS digest FROM "${table}" t`)).rows[0];return rows}
 try{await c.guard(client);const before=await snapshot();assert.ok(before.journal_entries.count>0);assert.ok(before.firm_advisory_revisions.count>0)
 const migrationsBefore=(await client.query('SELECT count(*)::integer AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL')).rows[0].n
 for(const label of ['upgrade','replay'])run(['node_modules/prisma/build/index.js','migrate','deploy','--config','.codex-tmp/af16-prisma/prisma.config.ts'],label)
 const after=await snapshot();assert.deepEqual(after,before)
 const migrationsAfter=(await client.query('SELECT count(*)::integer AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL')).rows[0].n
 assert.equal(migrationsAfter,migrationsBefore+2)
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({database:c.database('upgrade'),before,after,migrationsBefore,migrationsAfter,equal:true,replayPassed:true,limitation:'AF12-to-current additive upgrade; not a populated pre-AF03 upgrade.'},null,2))
 console.log('AF16 populated predecessor upgrade/replay passed.')
 }finally{await client.end()}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1})
