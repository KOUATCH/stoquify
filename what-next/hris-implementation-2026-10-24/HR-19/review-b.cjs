const fs=require('node:fs');
const base='what-next/hris-implementation-2026-10-24/HR-19/';
function edit(path,fn){const original=fs.readFileSync(path,'utf8');fs.writeFileSync(base+path.split('/').pop()+'.before-b',original);fs.writeFileSync(path,fn(original))}
edit('services/hris/payroll-handoff-read.service.ts',s=>s.replace('export async function readHandoffInputsInTx(', 'async function projectHandoffInputsInTx(')+`
/** Full current source projection remains restricted to HR management. */
export async function readHandoffInputsInTx(tx:Prisma.TransactionClient,a:SelfServiceActor,payrollPeriodId:string){return projectHandoffInputsInTx(tx,a,payrollPeriodId)}
/** A retained recipient receives a status only, never newly collected sources. */
export async function retainedHandoffFreshnessInTx(tx:Prisma.TransactionClient,actor:SelfServiceActor,packageId:string){
 const a=await handoffActor(tx,actor);handoffPermission(a,'hris.handoff.receive')
 const rows=await tx.$queryRaw<Array<{payrollPeriodId:string;previewHash:string}>>\`SELECT "payrollPeriodId","previewHash" FROM hris_payroll_handoff_packages WHERE id=\${packageId} AND "organizationId"=\${a.organizationId} AND "recipientUserId"=\${a.actorId}\`
 if(!rows[0])throw new NotFoundError()
 const current=await projectHandoffInputsInTx(tx,a,rows[0].payrollPeriodId,packageId)
 return current.blockers.length||current.previewHash!==rows[0].previewHash?'STALE' as const:'CURRENT' as const
}
`);
edit('services/hris/payroll-handoff.service.ts',s=>s.replace('handoffActor,handoffPermission,readHandoffInputsInTx','handoffActor,handoffPermission,readHandoffInputsInTx,retainedHandoffFreshnessInTx').replace('try{const current=await readHandoffInputsInTx(tx,a,p.payrollPeriodId,manager(a)?undefined:p.id);','try{if(!manager(a))return await retainedHandoffFreshnessInTx(tx,a,p.id);const current=await readHandoffInputsInTx(tx,a,p.payrollPeriodId);'));
const prior=fs.readFileSync('prisma/migrations/20261025190000_hris_payroll_handoff/migration.sql','utf8');
const fn=prior.slice(prior.indexOf('CREATE FUNCTION'),prior.indexOf('CREATE TRIGGER')).replace('CREATE FUNCTION','CREATE OR REPLACE FUNCTION').replace(`  IF NEW."replacesPackageId" IS NOT NULL`,()=>`  IF NEW."issuedById"=NEW."recipientUserId" OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW."issuedById" AND "organizationId"=NEW."organizationId") OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW."recipientUserId" AND "organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'HRIS_HANDOFF_ACTOR_SCOPE_MISMATCH'; END IF;
  IF (NEW.version=1)<>(NEW."replacesPackageId" IS NULL) THEN RAISE EXCEPTION 'HRIS_HANDOFF_LINEAGE_MISMATCH'; END IF;
  IF NEW."replacesPackageId" IS NOT NULL`);
fs.mkdirSync('prisma/migrations/20261025190100_hris_handoff_actor_guard',{recursive:true});fs.writeFileSync('prisma/migrations/20261025190100_hris_handoff_actor_guard/migration.sql',fn);
fs.writeFileSync(base+'migrate-guard.cjs',fs.readFileSync(base+'migrate.cjs','utf8').replace('20261025190000_hris_payroll_handoff','20261025190100_hris_handoff_actor_guard'));
