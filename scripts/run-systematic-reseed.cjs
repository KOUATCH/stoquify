#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const {ROOT,OUT,PRIVATE,RUN,sourceUrl,candidateUrl,save}=require('./systematic-reseed-local.cjs');

async function main(){
 if(!process.argv.includes('--apply')) throw new Error('Explicit --apply and --candidate or --source required.');
 const source=process.argv.includes('--source');
 if(source===process.argv.includes('--candidate')) throw new Error('Choose exactly one target.');
 const stage=process.argv[process.argv.indexOf('--stage')+1];
 if(!['reference','scenarios','inventory','financial'].includes(stage)) throw new Error('Choose --stage reference, scenarios, inventory, or financial.');
 const backup=JSON.parse(fs.readFileSync(path.join(OUT,'backup-restore.json'),'utf8'));
 if(!backup.tableCountsMatch||!backup.preservedIdentityMatches||!backup.backupRetained) throw new Error('Verified backup/restore evidence required.');
 const url=source?sourceUrl():candidateUrl();
 if(source&&url.pathname.slice(1)!==backup.source.database) throw new Error('Source target differs from backed-up database.');
 if(source&&!fs.existsSync(path.join(OUT,`candidate-${stage}.json`))) throw new Error('Candidate rehearsal required before source apply.');
 process.env.DATABASE_URL=url.toString();
 process.env.NODE_ENV='test';
 process.env.TS_NODE_COMPILER_OPTIONS=JSON.stringify({module:'CommonJS',moduleResolution:'node'});
 require('ts-node/register/transpile-only');
 require('./register-server-only-shim.js');
 require('tsconfig-paths/register');
 const {db}=require('../prisma/db.ts');
 const target=source?'source':'candidate';
 const credentialPath=path.join(PRIVATE,target+'-new-credentials.json');
 const startedAt=new Date().toISOString();
 try{
  let result;
  if(stage==='reference'){
   const {seedSystematicReferenceData}=require('../prisma/systematic-reseed-reference-data.ts');
   const {buildVerifiedCredentialHandoff}=require('./systematic-reseed-credentials.cjs');
   const before=await buildVerifiedCredentialHandoff(db,target,{write:false});
   result=await seedSystematicReferenceData({prisma:db,referenceDate:'2026-09-27',syntheticOrganizationIds:['rds_org_001','rds_org_002'],ensurePersonaCredentialsForRoleCodes:['owner','accountant','external_accountant','support','auditor','payroll_administrator','hris_user','manager','inventory_controller','pos_user','cashier'],knownCredentialUserIds:before.knownCredentialUserIds,onCredential:async credential=>{
    const existing=fs.existsSync(credentialPath)?JSON.parse(fs.readFileSync(credentialPath,'utf8')):[];
    const match=existing.findIndex(x=>x.userId===credential.userId||x.email===credential.email);
    if(match<0)existing.push(credential);else existing[match]=credential;
    save(credentialPath,existing);
   }});
   await buildVerifiedCredentialHandoff(db,target);
  }else if(stage==='scenarios'){
   const {seedSystematicScenarios}=require('../prisma/systematic-reseed-scenarios.ts');
   result=await seedSystematicScenarios({prisma:db,runId:RUN,outputDirectory:OUT});
  }else if(stage==='financial'){
   const repair=require('../prisma/systematic-reseed-financial-repair.ts');
   const actorByOrganization={};
   for(const organizationId of ['rds_org_001','rds_org_002']){
    const actor=await db.user.findFirst({where:{organizationId,isActive:true,isLocked:false,roles:{some:{permissions:{hasSome:['*','data.migrate']}}}},orderBy:{id:'asc'},select:{id:true}});
    if(!actor)throw new Error('No authorized repair actor for '+organizationId);
    actorByOrganization[organizationId]=actor.id;
   }
   const options={actorByOrganization,expectedDatabase:url.pathname.slice(1)};
   const preview=await repair.repairDraftSyntheticSupplierInvoices(db,{...options,apply:false});
   save(path.join(OUT,`${target}-financial-preview.json`),preview);
   result=await repair.repairDraftSyntheticSupplierInvoices(db,{...options,apply:true});
  }else{
   const inventory=require('../prisma/systematic-reseed-inventory.ts');
   const {verifyUserCredentialPassword}=require('../lib/security/auth-credentials.ts');
   const credentials=JSON.parse(fs.readFileSync(credentialPath,'utf8'));
   const verifiedActorAuth={};
   for(const credential of credentials.filter(x=>['inventory_adjustment_maker','inventory_adjustment_checker'].includes(x.roleCode))){
    if(!await verifyUserCredentialPassword(credential.userId,credential.password))throw new Error('Synthetic stock actor credential verification failed.');
    verifiedActorAuth[credential.userId]=new Date().toISOString();
   }
   save(path.join(OUT,`${target}-inventory-actor-verification.json`),{method:'verifyUserCredentialPassword',verifiedActorAuth,secretValuesPrinted:false});
   const options={datasetVersion:RUN,referenceDate:new Date('2026-09-27T11:00:00.000Z'),minimum:'1500.000',organizationIds:['rds_org_001','rds_org_002'],verifiedActorAuth};
   result={};
   for(const [step,fn,opts] of [
    ['history','reconstructSyntheticInventoryHistory',options],
    ['postingRules','ensureSyntheticInventoryPostingRule',options],
    ['minimum','reseedInventoryMinimum',{...options,organizationIds:undefined}],
    ['serials','completeSyntheticInventorySerials',options],
    ['ledger','reconcileSyntheticInventoryLedger',options],
   ]){
    console.log('Inventory step: '+step);
    result[step]=await inventory[fn](db,opts);
    save(path.join(OUT,`${target}-inventory-${step}.json`),result[step]);
   }
  }
  const report={startedAt,finishedAt:new Date().toISOString(),target:url.pathname.slice(1),stage,result};
  save(path.join(OUT,`${target}-${stage}.json`),report);
  console.log(JSON.stringify({startedAt,finishedAt:report.finishedAt,target:report.target,stage,resultKeys:Object.keys(result),reportFile:path.join(OUT,`${target}-${stage}.json`)}));
 }finally{await db.$disconnect();}
}
main().catch(e=>{console.error(String(e.message).replace(/postgres(?:ql)?:\/\/\S+/gi,'[REDACTED_URL]'));process.exitCode=1;});
