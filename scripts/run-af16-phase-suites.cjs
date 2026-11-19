const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{Client}=require('pg')
const c=require('./af16-verification-context.cjs')
async function seed(phase,url){
  const {PrismaClient}=require('../.codex-tmp/af16-prisma/client'),db=new PrismaClient({datasources:{db:{url}}})
  try{
    if(phase==='AF03'||phase==='AF04'){
      const prefix=phase.toLowerCase()+'-legacy'
      await db.organization.createMany({data:['firm','client'].map(k=>({id:`${prefix}-${k}`,name:`Synthetic ${k}`,slug:`${prefix}-${k}`}))})
      await db.user.create({data:{id:prefix+'-user',email:prefix+'@example.invalid',organizationId:prefix+'-firm',emailVerified:true}})
      await db.accountantAccessGrant.create({data:{id:prefix+'-grant',organizationId:prefix+'-client',accountantUserId:prefix+'-user',accountantFirmName:'Descriptive only',role:'READ_ONLY',activeScopeKey:`${prefix}-client:${prefix}-user`,consentGrantedById:'synthetic-owner',consentEvidenceHash:'sha256:'+'a'.repeat(64),effectiveFrom:new Date('2020-01-01'),expiresAt:new Date('2099-01-01')}})
    }
    if(phase==='AF06'){
      await db.organization.createMany({data:['firm','client','foreign'].map(n=>({id:'af06-'+n,name:'Synthetic '+n,slug:'af06-'+n,requestedModules:['accounting','close_assurance'],currency:'XAF',countryCode:'CM'}))})
      const permissions=['accounting.audit.read','accounting.close.read','accounting.close.accountant.invite','accounting.close.accountant.review','accounting.close.evidence.request','accounting.close.finding.comment','accounting.close.finding.assign']
      for(const role of ['manager','preparer','reviewer','owner','recipient','outsider']){
        const organizationId=['owner','recipient'].includes(role)?'af06-client':role==='outsider'?'af06-foreign':'af06-firm',id='af06-'+role
        await db.role.create({data:{id:id+'-role',organizationId,code:id,nameEn:role,permissions:role==='outsider'?['accounting.audit.read','accounting.close.read','accounting.close.accountant.review']:permissions}})
        await db.user.create({data:{id,name:role,email:id+'@example.invalid',organizationId,emailVerified:true,roles:{connect:{id:id+'-role'}}}})
      }
      await db.accountantAccessGrant.create({data:{id:'af06-manager-grant',organizationId:'af06-client',accountantUserId:'af06-manager',accountantFirmName:'Synthetic firm',role:'REVIEWER',activeScopeKey:'af06-client:af06-manager',consentGrantedById:'af06-owner',consentEvidenceHash:'sha256:'+'a'.repeat(64),effectiveFrom:new Date('2020-01-01'),expiresAt:new Date('2099-01-01')}})
    }
  }finally{await db.$disconnect()}
}
async function main(){
  const manifest=JSON.parse(fs.readFileSync(path.join(c.output,'phase-suite-adapters.json'),'utf8'))
  const selected=process.argv[2],attempt=process.argv[3],results=[]
  if(attempt&&(!selected||!/^\d+$/.test(attempt)))throw Error('A numeric attempt requires a selected phase')
  if(selected&&!manifest.some(row=>row.phase===selected))throw Error('Unknown phase')
  for(const row of manifest.filter(row=>!selected||row.phase===selected)){
    const phase=row.phase,suffix=phase.toLowerCase()+(attempt?'_attempt_'+attempt:''),url=c.url(suffix)
    let generated=row.generated,phaseOutput=row.phaseOutput
    if(attempt){
      phaseOutput=path.join(row.phaseOutput,'attempt-'+attempt);fs.mkdirSync(phaseOutput,{recursive:true})
      generated=row.generated.replace('.postgres.test.ts',`.attempt-${attempt}.postgres.test.ts`)
      const source=fs.readFileSync(path.join(c.root,row.generated),'utf8').replaceAll(c.url(phase.toLowerCase()),url)
      fs.writeFileSync(path.join(c.root,generated),source)
    }
    const admin=new Client({connectionString:'postgresql://af16@127.0.0.1:55451/postgres'});await admin.connect()
    try{await c.guard(admin);if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[c.database(suffix)])).rowCount)throw Error('Refusing existing target '+phase)
      await admin.query(`CREATE DATABASE "${c.database(suffix)}" TEMPLATE "${c.database('template')}"`)
    }finally{await admin.end()}
    await seed(phase,url)
    const env={...process.env,AF16_POSTGRES_URL:url,AF16_CLUSTER_DIR:c.cluster,RUN_AF01_POSTGRES:'1'}
    for(let n=1;n<=13;n++){const prefix='AF'+String(n).padStart(2,'0');env[prefix+'_POSTGRES_URL']=url;env[prefix+'_CLUSTER_DIR']=c.cluster;env[prefix+'_EVIDENCE_DIR']=phaseOutput;env[prefix+'_PRISMA_CLIENT']=path.join(c.root,'.codex-tmp/af16-prisma/client')}
    const result=spawnSync(process.execPath,['node_modules/jest/bin/jest.js','--config','jest.af16-postgres.config.cjs','--runInBand','--runTestsByPath',generated,'--json','--outputFile',path.join(phaseOutput,'jest.json')],{cwd:c.root,env,windowsHide:true,encoding:'utf8',timeout:600000})
    fs.writeFileSync(path.join(phaseOutput,'jest.log'),(result.stdout||'')+(result.stderr||''))
    results.push({phase,exitCode:result.status,database:c.database(suffix)});console.log(phase+': '+(result.status===0?'PASS':'FAIL (see retained receipt)'))
    fs.writeFileSync(path.join(c.output,selected?'phase-run-'+selected+(attempt?'-attempt-'+attempt:'')+'.json':'phase-runs.json'),JSON.stringify(results,null,2))
  }
  if(results.some(row=>row.exitCode!==0))process.exitCode=1
}
main().catch(error=>{console.error(error.stack);process.exitCode=1})
