const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'../../..');
function edit(file,fn){const target=path.join(root,file);let source=fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n');const replace=(a,b)=>{assert.ok(source.includes(a),a);source=source.replace(a,b)};fn(replace,()=>source);fs.writeFileSync(target,source)}
edit('services/payroll/payroll-control.service.ts',(replace,get)=>{
 replace('import { assertPayrollCertifiedInputProofMetadata }','import { assertPayrollCertifiedInputProofMetadata, payrollCertifiedInputProofFromMetadata }');
 replace('function payrollRunNextActions(\n  run: {\n    id: string;', 'function payrollRunNextActions(\n  run: {\n    id: string;\n    metadata: unknown;');
 replace('  if (run.status === PayrollRunStatus.POSTED && run._count.declarations === 0)', '  const inputProofBlockers = payrollCertifiedInputProofFromMetadata(run.metadata) ? [] : ["PAYROLL_RUN_CERTIFIED_INPUT_PROOF_MISSING"];\n\n  if (run.status === PayrollRunStatus.POSTED && run._count.declarations === 0)');
 for(const id of ['prepare-declarations','request-payments','release-payments']){
  const source=get(),start=source.indexOf('id: "'+id+'"',source.indexOf('function payrollRunNextActions(')),end=source.indexOf('    });',start),chunk=source.slice(start,end);
  assert.ok(start>0&&end>start);replace(chunk,chunk.replace('allowed: actionAvailable(requiredPermission),','allowed: actionAvailable(requiredPermission, inputProofBlockers),').replace('blockedBy: [],','blockedBy: inputProofBlockers,'));
 }
 replace('  if (!input.run.calculationHash || !input.run.attendanceSnapshotHash) {', `  if (lockedStatus && !payrollCertifiedInputProofFromMetadata(input.run.metadata)) {
    blockers.push({
      id: "PAYROLL_RUN_CERTIFIED_INPUT_PROOF_MISSING",
      severity: "critical",
      title: "Certified payroll input proof is missing",
      detail: "Payment requests, release and declarations require the HRIS readiness and payroll engine input proof produced by calculation.",
      nextAction: "Review employee identity, approved contract documents, compensation, payment destination and certified attendance in HRIS. Use the controlled calculation or correction workflow; do not edit a posted run or insert approval hashes manually.",
    });
  }

  if (!input.run.calculationHash || !input.run.attendanceSnapshotHash) {`);
});
edit('components/payroll/PayrollRunWorkbench.tsx',(replace)=>{
 replace('function Blockers({ run }: { run: RunRow }) {', `function inputProofCopy(locale: Locale) {
  return locale === "fr" ? {
    title: "Preuves des données de paie certifiées manquantes",
    detail: "Les demandes de paiement, leur transmission et les déclarations exigent les preuves de préparation SIRH et des données du moteur de paie produites par le calcul.",
    nextAction: "Vérifiez dans le SIRH l’identité, les documents contractuels approuvés, la rémunération, la destination de paiement et la présence certifiée. Utilisez le processus contrôlé de calcul ou de correction ; ne modifiez pas une paie comptabilisée et n’insérez pas manuellement des empreintes d’approbation.",
  } : {
    title: "Certified payroll input proof is missing",
    detail: "Payment requests, release and declarations require the HRIS readiness and payroll engine input proof produced by calculation.",
    nextAction: "Review employee identity, approved contract documents, compensation, payment destination and certified attendance in HRIS. Use the controlled calculation or correction workflow; do not edit a posted run or insert approval hashes manually.",
  };
}

function Blockers({ run, locale }: { run: RunRow; locale: Locale }) {
  const proofCopy = inputProofCopy(locale);`);
 for(const key of ['title','detail','nextAction'])replace('{blocker.'+key+'}', '{blocker.id === "PAYROLL_RUN_CERTIFIED_INPUT_PROOF_MISSING" ? proofCopy.'+key+' : blocker.'+key+'}');
 replace('<Blockers run={run} />','<Blockers run={run} locale={locale} />');
 replace('{action.blockedBy.map((code) => <Badge key={code} value={code} />)}', '{action.blockedBy.map((code) => <Badge key={code} value={code === "PAYROLL_RUN_CERTIFIED_INPUT_PROOF_MISSING" ? inputProofCopy(locale).title : code} />)}');
});
