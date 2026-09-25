const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../../..');
function edit(file,changes){const p=path.join(root,file);let text=fs.readFileSync(p,'utf8');for(const [old,value] of changes){if(!text.includes(old))throw Error('Missing anchor in '+file+': '+old);text=text.replace(old,value)}fs.writeFileSync(p,text)}
edit('services/purchasing/invoice-match-exception.service.ts',[
['blockers: [...new Set(blockers)], requiresFreshAuth:', 'blockers: [...new Set(blockers)], sourceVerified, archivedSource: !!invoice.deletedAt, requiresFreshAuth:'],
['currency: p.invoice.currency })','currency: p.invoice.currency, ...(draft.kind === "review" ? { sourceVerification: p.preview.sourceVerified ? "VERIFIED" : "UNVERIFIED" } : {}) })'],
['deletedAt: null, status: "DISPUTED", ...(query.kind === "request" ? { createdById: scope.actorId } : {})','...(query.kind === "request" ? { deletedAt: null, status: "DISPUTED", createdById: scope.actorId } : { OR: [{ deletedAt: null, status: "DISPUTED" }, { matchExceptions: { some: { organizationId: scope.organizationId, status: "OPEN" } } }] })'],
['select: { id: true, invoiceNumber: true, total: true','select: { id: true, deletedAt: true, invoiceNumber: true, total: true'],
['currency: invoice.currency, independentReviewerRequired:', 'currency: invoice.currency, archivedSource: !!invoice.deletedAt, independentReviewerRequired:']
]);
edit('services/purchasing/invoice-match-exception-contracts.ts',[
['sourceEventId: id, expiresAt:', 'sourceEventId: id, sourceVerification: z.enum(["VERIFIED", "UNVERIFIED"]).optional(), expiresAt:'],
['if((v.kind === "request") !== (v.status === "OPEN"))','if(v.sourceVerification === "UNVERIFIED" && v.status !== "REJECTED")c.addIssue({code:z.ZodIssueCode.custom,message:"Unverified source cannot authorize an exception."});if((v.kind === "request") !== (v.status === "OPEN"))']
]);
edit('components/purchasing/InvoiceMatchExceptionWorkbench.tsx',[
['{kind===\'review\'&&invoice.independentReviewerRequired', '{invoice.archivedSource&&<span className="block text-sm text-[var(--dash-warning)]">{t("archivedSource")}</span>}{kind===\'review\'&&invoice.independentReviewerRequired'],
['{t("currentStatus")}: {status(row.observedStatus)}</p>', '{t("currentStatus")}: {status(row.observedStatus)}</p>{row.decision.sourceVerification===\'UNVERIFIED\'&&<p className="text-[var(--dash-warning)]">{t("refusedUnverified")}</p>}'],
['{preview&&<div className="space-y-3">', '{preview&&<div className="space-y-3">{reviewedDraft?.kind===\'review\'&&reviewedDraft.decision===\'REJECT\'&&!preview.sourceVerified&&<p role="alert" className="text-[var(--dash-warning)]"><AlertTriangle className="mr-2 inline h-4 w-4" aria-hidden="true"/>{t("refusalWarning")}</p>}'],
['{t("decisionEffect")}</p>', '{t("decisionEffect")}</p>{decision.sourceVerification===\'UNVERIFIED\'&&<p className="text-[var(--dash-warning)]">{t("refusedUnverified")}</p>}']
]);
for(const locale of ['en','fr']){const file='messages/'+locale+'.json',p=path.join(root,file),t=fs.readFileSync(p,'utf8'),start=t.indexOf('  "invoiceMatchException": {');if(start<0)throw Error('Namespace missing');const values=locale==='en'?{
archivedSource:'Archived invoice — retained exception review only',
refusalWarning:'The invoice or original request evidence has changed or cannot be verified. You may refuse this request with a reason. Refusal does not approve the variance, repair the original evidence, or create a payable, journal or payment.',
refusedUnverified:'Refusal recorded. The original source evidence remains unverified; no variance approval was granted.'
}:{archivedSource:'Facture archivée — examen de la dérogation conservée uniquement',refusalWarning:'La facture ou les justificatifs de la demande initiale ont changé ou ne peuvent pas être vérifiés. Vous pouvez refuser cette demande en précisant le motif. Le refus ne valide pas l’écart, ne répare pas les justificatifs et ne crée ni dette fournisseur, ni écriture comptable, ni paiement.',refusedUnverified:'Refus enregistré. Les justificatifs initiaux restent non vérifiés ; aucune dérogation n’a été approuvée.'};const lines=Object.entries(values).map(([k,v])=>'    '+JSON.stringify(k)+': '+JSON.stringify(v)+',').join('\n');fs.writeFileSync(p,t.slice(0,start)+t.slice(start).replace('  "invoiceMatchException": {','  "invoiceMatchException": {\n'+lines))}
console.log('Refusal read models, evidence contract and EN/FR interface connected');
