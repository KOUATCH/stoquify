const fs=require('node:fs');function update(f,fn){let s=fs.readFileSync(f,'utf8');fs.writeFileSync(f+'.hr10-candidate',fn(s))}
update('services/payroll/payment-evidence.service.ts',s=>s.replace('import { validateHrisTimeLeaveAttendanceCertification }','import { lockOperationalEmployeeInTx } from "@/services/hris/attendance-correction"\nimport { validateHrisTimeLeaveAttendanceCertification }').replace('assertPermission(parsed.actorPermissions, APPLY_PERMISSIONS, "approved payment destination application")\n\n  return inTransaction(client, async (tx) => {',`assertPermission(parsed.actorPermissions, APPLY_PERMISSIONS, "approved payment destination application")
  return inTransaction(client, async (tx) => {
    const target = await findPaymentDestinationChangeForDecision(tx, parsed.organizationId, parsed.paymentDestinationChangeRequestId)
    await lockOperationalEmployeeInTx(tx, parsed.organizationId, target.employeeId)
    await tx.$queryRaw\`SELECT id FROM payroll_employees WHERE id = \${target.employeeId} AND "organizationId" = \${parsed.organizationId} FOR UPDATE\`
`));
update('services/payroll/__tests__/payroll-payment-evidence.service.test.ts',s=>s.replace('function buildTx() {\n  return {','function buildTx() {\n  return {\n    $queryRaw: jest.fn().mockResolvedValue([{isolationLevel:"read committed"}]),'));
update('services/hris/people-authoring-read.service.ts',s=>s.replace('documentRequests: docs.map(c => ({contractId: c.id, pending: pendingHrisContractDocumentEvidenceFromMetadata(c.metadata), updatedAt: c.updatedAt}))',`documentRequests: docs.map(c => {
        const pending = pendingHrisContractDocumentEvidenceFromMetadata(c.metadata)
        return {contractId: c.id, pending: pending ? {artifactHash: pending.artifactHash, malwareScanEvidenceHash: pending.malwareScanEvidenceHash, malwareScanProvider: pending.malwareScanProvider, malwareScannedAt: pending.malwareScannedAt, signedAt: pending.signedAt, retentionPolicyCode: pending.retentionPolicyCode, retentionBasis: pending.retentionBasis, retainUntil: pending.retainUntil, legalHold: pending.legalHold} : null}
      })`));
update('components/hris/HrisPeopleAuthoring.tsx',s=>{
 s=s.replace('status=useRef<HTMLDivElement>(null)','status=useRef<HTMLDivElement>(null), navigation=useRef(0)');
 const start=s.indexOf('  async function send('),end=s.indexOf('\n  const reason=',start);if(start<0||end<0)throw Error('Missing send');
 s=s.slice(0,start)+`  async function load(employeeId?:string){
    const generation=++navigation.current
    try{const next=await reload(employeeId);if(generation!==navigation.current)return;setView(next);setMessage(t("Status refreshed", "Statut actualisé"))}
    catch{if(generation===navigation.current)setMessage(t("Could not refresh. Retry.", "Actualisation impossible. Réessayez."))}
  }
  async function send(request:AuthoringRequest){
    const generation=navigation.current;setMessage("")
    try{
      const result=await execute(request)
      if(generation!==navigation.current)return
      if(!result.success)throw new Error(result.error??"Unavailable")
      const id=result.data?.payrollEmployee?.id??employee?.id
      try{
        const next=await reload(id);if(generation!==navigation.current)return;setView(next)
        setMessage(result.data?.applied===false?t("Approved and scheduled; today's employment is unchanged. Apply when due.","Approuvé et planifié ; la situation actuelle reste inchangée. Appliquez à l’échéance."):t("Saved. Review the current status before the next step.","Enregistré. Vérifiez le statut avant l’étape suivante."))
      }catch{if(generation===navigation.current)setMessage(t("Saved, but refresh failed. Reload status before submitting again.","Enregistré, mais l’actualisation a échoué. Actualisez le statut avant de renvoyer."))}
    }catch(error){if(generation===navigation.current)setMessage((error instanceof Error?error.message+" — ":"")+t("Could not save. Your entries remain. Review the error and refresh stale records before retrying.","Enregistrement impossible. Vos saisies restent disponibles. Vérifiez l’erreur et actualisez les dossiers modifiés avant de réessayer."))}
    finally{if(generation===navigation.current)setTimeout(()=>status.current?.focus(),0)}
  }`+s.slice(end);
 s=s.replace(/onClick=\{async\(\)=>\{try\{setView\(await reload\(employee\?\.id\)\).*?\}\}\}>/,'onClick={()=>load(employee?.id)}>');
 s=s.replace(/onChange=\{async e=>\{try\{setView\(await reload\(e.target.value\|\|undefined\)\).*?\}\}\}>/,'onChange={e=>load(e.target.value||undefined)}>');return s;
});
update('services/hris/__tests__/people-authoring.postgres.test.ts',s=>s.replaceAll('hireDate:today','hireDate:new Date(today)').replaceAll('effectiveAt:today','effectiveAt:new Date(today)').replaceAll('effectiveAt:later','effectiveAt:new Date(later)').replaceAll('malwareScannedAt:today','malwareScannedAt:new Date(today)').replaceAll('signedAt:today','signedAt:new Date(today)').replaceAll('retainUntil:end','retainUntil:new Date(end)'));
