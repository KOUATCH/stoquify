// Local preparation only: generated client and fresh, explicitly synthetic database.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{Client}=require('pg')
const root=path.resolve(__dirname,'..'),dir=path.join(root,'.codex-tmp/af13-prisma')
const out=path.join(root,'docs/accounting-firms/roadmap-2026-10-19/execution/AF13/2026-10-25-run-03')
const cluster='C:/Users/J COMPUTER/.codex/visualizations/2026/10/19/01a1542f-53bc-7513-b68f-4bce330ca993/af13-postgres'
const name='stoquify_local_af13_20261025_r1',url=`postgresql://af01@127.0.0.1:55450/${name}`
function run(args,label){const result=spawnSync(process.execPath,args,{cwd:root,env:{...process.env,DATABASE_URL:url,DIRECT_URL:url,SHADOW_DATABASE_URL:url},windowsHide:true,encoding:'utf8',timeout:300000});fs.writeFileSync(path.join(out,label+'.log'),(result.stdout||'')+(result.stderr||''));if(result.status!==0)throw Error(label+' failed; inspect retained log')}
async function main(){
  if(process.env.NODE_ENV==='production')throw Error('Production forbidden')
  fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(out,{recursive:true})
  const schema=fs.readFileSync(path.join(root,'prisma/schema.prisma'),'utf8').replace(/generator client \{([\s\S]*?)\n\}/,(_,body)=>`generator client {${body.replace(/\s*output\s*=\s*[^\n]+/g,'')}\n  output = ${JSON.stringify(path.join(dir,'client').replaceAll('\\','/'))}\n}`)
  if(process.argv.includes('--database-only')){
    if(!fs.existsSync(path.join(dir,'client/index.js'))||fs.readFileSync(path.join(dir,'schema.prisma'),'utf8')!==schema)throw Error('Generate the exact current schema first')
  }else{
    fs.writeFileSync(path.join(dir,'schema.prisma'),schema)
    fs.writeFileSync(path.join(dir,'prisma.config.ts'),'import { defineConfig } from "prisma/config"; export default defineConfig('+JSON.stringify({schema:path.join(dir,'schema.prisma'),migrations:{path:path.join(root,'prisma/migrations')}})+')')
    run(['node_modules/prisma/build/index.js','validate','--config','.codex-tmp/af13-prisma/prisma.config.ts'],'schema-validation')
    run(['node_modules/prisma/build/index.js','generate','--config','.codex-tmp/af13-prisma/prisma.config.ts'],'client-generation')
  }
  if(process.argv.includes('--client-only'))return
  const admin=new Client({connectionString:'postgresql://af01@127.0.0.1:55450/postgres',connectionTimeoutMillis:5000});await admin.connect()
  try {if(fs.realpathSync((await admin.query('SHOW data_directory')).rows[0].data_directory).toLowerCase()!==fs.realpathSync(cluster).toLowerCase())throw Error('Wrong cluster')
    const exists=(await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount
    if(exists&&!process.argv.includes('--replay-migrations'))throw Error('Refusing existing database')
    if(!exists&&process.argv.includes('--replay-migrations'))throw Error('Expected the already-created synthetic database')
    if(!exists)await admin.query(`CREATE DATABASE "${name}"`)
  }finally{await admin.end()}
  run(['node_modules/prisma/build/index.js','migrate','deploy','--config','.codex-tmp/af13-prisma/prisma.config.ts'],process.argv.includes('--replay-migrations')?'migration-replay-'+Date.now():'clean-migration')
  console.log('AF13 schema/client and fresh guarded synthetic database prepared.')
}
main().catch(error=>{console.error(error.message);process.exitCode=1})
