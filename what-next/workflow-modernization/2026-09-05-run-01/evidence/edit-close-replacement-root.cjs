const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'); const id=crypto.randomUUID();
function edit(file, changes) {
 const target=path.join(root,file), before=fs.readFileSync(target,'utf8'); let after=before;
 for(const [from,to] of changes) { assert.equal(after.split(from).length-1,1,'Expected unique anchor: '+file+' '+from.slice(0,90)); after=after.replace(from,to); }
 fs.writeFileSync(path.join(__dirname,'replacement-edit-before-'+id+'-'+path.basename(file)),before,{flag:'wx'});
 const temp=target+'.'+id+'.tmp'; fs.writeFileSync(temp,after,{flag:'wx'}); fs.renameSync(temp,target); console.log(file);
}
edit('services/accounting/close-assurance.service.ts',[
 ['"payroll-finance-forecast": !payrollForecastUnavailable(payrollForecastSnapshot)', '[PAYROLL_FORECAST_CHECKLIST_KEY]: !payrollForecastUnavailable(payrollForecastSnapshot)'],
 ['"ledger-reconciliation": !ledgerUnavailable,', '"period-close-preflight": !preflightResult.error,\n        "ledger-reconciliation": !ledgerUnavailable,'],
 ['  const resolvedAtTime = resolvedAt ? new Date(resolvedAt).getTime() : Number.NaN', `  const resolvedAtTime = resolvedAt ? new Date(resolvedAt).getTime() : Number.NaN
  const storedBinding = comment.metadata && typeof comment.metadata === "object" && !Array.isArray(comment.metadata)
    ? comment.metadata.replacementBinding : undefined
  const replacementBinding = parseCloseEvidenceReplacementBinding(storedBinding)
  if (storedBinding !== undefined && !replacementBinding) {
    throw new BusinessRuleError("Stored missing-proof replacement evidence is incomplete.")
  }`],
 ['    resolutionNotes: comment.body,','    resolutionNotes: comment.body,\n    replacement: replacementBinding ? closeEvidenceReplacementSelection(replacementBinding) : null,'],
 ['    acceptance.resolutionNotes !== input.resolutionNotes.trim()', '    acceptance.resolutionNotes !== input.resolutionNotes.trim() ||\n    acceptance.replacement?.checklistItemId !== input.replacement?.checklistItemId ||\n    acceptance.replacement?.bindingHash !== input.replacement?.bindingHash'],
 [`    const transition = await tx.closeAssuranceFinding.updateMany({
      where: {
        id: finding.id,
        organizationId,
        status: CloseFindingStatus.IN_REVIEW,`, `    const replacement = await getCloseEvidenceReplacementInTx(tx, organizationId, finding.id, { lock: true })
    if (replacement.status !== "AVAILABLE" || !input.replacement ||
        replacement.selection.checklistItemId !== input.replacement.checklistItemId ||
        replacement.selection.bindingHash !== input.replacement.bindingHash) {
      throw new ConflictError("Source evidence is unavailable or changed. Refresh the replacement evidence and review it before accepting this response.")
    }

    const transition = await tx.closeAssuranceFinding.updateMany({
      where: {
        id: finding.id,
        organizationId,
        status: CloseFindingStatus.IN_REVIEW,`],
 ['          acceptanceType: MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_TYPE,','          acceptanceType: MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE_TYPE,\n          replacementBinding: replacement.binding,'],
 ['      message: "Close missing-evidence response accepted",\n      metadata: jsonObject({','      message: "Close missing-evidence response accepted",\n      metadata: jsonObject({\n        replacement: replacement.selection,'],
 ['        acceptanceId: acceptance.id,','        acceptanceId: acceptance.id,\n        replacement: replacement.selection,'],
]);
edit('services/accounting/accountant-work-desk.contracts.ts',[
 ['export const ACCOUNTANT_WORK_DESK_CLIENT_LIMIT', 'import type { CloseEvidenceReplacementPreview } from "./close-evidence-replacement.service"\n\nexport const ACCOUNTANT_WORK_DESK_CLIENT_LIMIT'],
 ['  item: AccountantMissingCloseEvidenceReviewItem','  item: AccountantMissingCloseEvidenceReviewItem\n  replacement: Omit<Extract<CloseEvidenceReplacementPreview, { status: "AVAILABLE" }>, "binding"> | Extract<CloseEvidenceReplacementPreview, { status: "UNAVAILABLE" }>'],
]);
edit('services/accounting/accountant-work-desk.service.ts',[
 ['import { resolveAccountantClientAccess } from "./accountant-access.service"','import { resolveAccountantClientAccess } from "./accountant-access.service"\nimport { getCloseEvidenceReplacementInTx } from "./close-evidence-replacement.service"'],
 [`  await assertAccountantWorkClient(actor, clientOrganizationId)
  const item = queue.items.find((candidate) => candidate.request.requestId === requestId)
  if (!item) throw new NotFoundError("This response is no longer available for review. Refresh the work desk.")
  return { clientOrganizationId, generatedAt: queue.generatedAt, item }`, `  const item = queue.items.find((candidate) => candidate.request.requestId === requestId)
  if (!item) throw new NotFoundError("This response is no longer available for review. Refresh the work desk.")
  const preview = await db.$transaction(tx => getCloseEvidenceReplacementInTx(tx, clientOrganizationId, item.findingId),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  await assertAccountantWorkClient(actor, clientOrganizationId)
  const replacement = preview.status === "AVAILABLE"
    ? { status: preview.status, selection: preview.selection, checklistKey: preview.checklistKey,
      domain: preview.domain, observedAt: preview.observedAt, recoveredEvidenceCount: preview.recoveredEvidenceCount }
    : preview
  return { clientOrganizationId, generatedAt: queue.generatedAt, item, replacement }`],
]);
