const f = require('./statement-recipient-fixtures.cjs');
const {fs,path,crypto,assert,db,root,helper} = f;
const stamp = crypto.randomUUID();
const sourceFiles = ['services/cash-command/cash-command-sources.service.ts','services/modules/module-entitlement.service.ts','services/modules/module-access-batch.service.ts'].filter(file=>fs.existsSync(path.join(root,file)));
const hashes = ()=>Object.fromEntries(sourceFiles.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const receipt={at:new Date().toISOString(),sourceBefore:hashes(),samples:[],environment:'Owned local database; direct service process; query logging disabled; not Next request latency'};
let operations=[];
const measured=db.$extends({query:{$allModels:{$allOperations:async({model,operation,args,query})=>{operations.push(model+'.'+operation);return query(args);}}}});
const dbModule=require(path.join(root,'prisma/db.ts')); const original=dbModule.db; dbModule.db=measured;
const {getCashCommandSources}=require(path.join(root,'services/cash-command/cash-command-sources.service.ts'));
async function main(){
  await helper.withClient(f.target,helper.assertOwned);
  const org=await db.organization.findFirstOrThrow({where:{name:{startsWith:helper.prefix+'Cash visibility presentation'}},orderBy:{createdAt:'desc'}});
  const role=await db.role.findFirstOrThrow({where:{organizationId:org.id,code:'administrator'}});assert.equal(role.nameEn,'Owned cash accessibility reader');
  const actor=await db.user.findFirstOrThrow({where:{organizationId:org.id,roles:{some:{id:role.id}}}});
  const input={organizationId:org.id,actorId:actor.id,actorPermissions:role.permissions,currency:org.currency,now:new Date('2026-09-30T12:00:00Z')};
  let resultHash;
  for(let sample=0;sample<3;sample++){
    operations=[];const start=performance.now();const result=await getCashCommandSources(input);const elapsed=performance.now()-start;
    const counts=Object.fromEntries([...new Set(operations)].sort().map(key=>[key,operations.filter(value=>value===key).length]));
    const hash=crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');resultHash??=hash;assert.equal(hash,resultHash);
    const row={sample,milliseconds:elapsed,counts,resultHash:hash,restrictionCount:result.restrictions.length};receipt.samples.push(row);console.log(JSON.stringify(row));
  }
  receipt.passed=true;
}
main().catch(error=>{receipt.passed=false;receipt.error=f.safe(error);process.exitCode=1;}).finally(async()=>{dbModule.db=original;receipt.sourceAfter=hashes();receipt.sourceStable=JSON.stringify(receipt.sourceBefore)===JSON.stringify(receipt.sourceAfter);receipt.passed=!!receipt.passed&&receipt.sourceStable;const file='cash-authority-reads-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:receipt.passed,error:receipt.error}));await db.$disconnect();});
