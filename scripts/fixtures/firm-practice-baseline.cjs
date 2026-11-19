// Prepare an AF12-schema baseline in the fresh AF13-only cluster; no retained cluster dependency.
const fs=require('node:fs'),path=require('node:path'),{Client}=require('pg'),{spawnSync}=require('node:child_process')
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'.codex-tmp/af13-baseline')
const cluster='C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993/af13-postgres'
const name='stoquify_local_af13_baseline_20261025_r1',url=`postgresql://af01@127.0.0.1:55450/${name}`
async function main(){
  if(process.env.NODE_ENV==='production')throw Error('Production forbidden')
  fs.mkdirSync(path.join(dir,'migrations'),{recursive:true})
  for(const entry of fs.readdirSync(path.join(root,'prisma/migrations'),{withFileTypes:true})){
    if(['20261025180000_firm_practice_records','20261025180100_firm_practice_integrity'].includes(entry.name))continue
    fs.cpSync(path.join(root,'prisma/migrations',entry.name),path.join(dir,'migrations',entry.name),{recursive:entry.isDirectory()})
  }
  fs.writeFileSync(path.join(dir,'prisma.config.ts'),'import { defineConfig } from "prisma/config"; export default defineConfig('+JSON.stringify({schema:path.join(root,'.codex-tmp/af13-prisma/schema.prisma'),migrations:{path:path.join(dir,'migrations')}})+')')
  const admin=new Client({connectionString:'postgresql://af01@127.0.0.1:55450/postgres'});await admin.connect()
  try{
    if(fs.realpathSync((await admin.query('SHOW data_directory')).rows[0].data_directory).toLowerCase()!==fs.realpathSync(cluster).toLowerCase())throw Error('Wrong cluster')
    if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount)throw Error('Refusing existing baseline')
    await admin.query(`CREATE DATABASE "${name}"`)
  }finally{await admin.end()}
  const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy','--config','.codex-tmp/af13-baseline/prisma.config.ts'],{cwd:root,env:{...process.env,DATABASE_URL:url,DIRECT_URL:url,SHADOW_DATABASE_URL:url},windowsHide:true,encoding:'utf8',timeout:300000})
  fs.writeFileSync(path.join(root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF13/2026-10-25-run-03/baseline-migration.log'),(result.stdout||'')+(result.stderr||''))
  if(result.status!==0)throw Error('Baseline migration failed')
  console.log('AF12-schema baseline created for synthetic populated upgrade.')
}
main().catch(error=>{console.error(error.stack);process.exitCode=1})
