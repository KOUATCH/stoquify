const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'../../../../..');
function edit(file,fn){const p=path.join(root,file),s=fs.readFileSync(p,'utf8'),a=fn(s);assert.notEqual(s,a,file);fs.writeFileSync(p,a)}
edit('services/purchase-order/purchase-receiving-workbench.service.ts',s=>{
 s=s.replace('throw new ConflictError("The receiving decision could not be verified.")','throw new BusinessRuleError("The receiving decision could not be verified.", "RECEIVING_EVIDENCE_UNVERIFIED")');
 s=s.replace('throw new ConflictError("An earlier receipt already uses this reference. Inspect its retained history.")','throw new BusinessRuleError("An earlier receipt already uses this reference. Inspect its retained history.", "RECEIVING_EVIDENCE_UNVERIFIED")');
 s=s.replace('throw new ConflictError("An earlier inspection decision uses this reference. Inspect its retained history.")','throw new BusinessRuleError("An earlier inspection decision uses this reference. Inspect its retained history.", "RECEIVING_EVIDENCE_UNVERIFIED")');
 return s;
});
edit('actions/purchaseOrderWorkflow/purchase-receiving.actions.ts',s=>s.replace('import { ForbiddenError, toSafeActionError }','import { BusinessRuleError, ForbiddenError, toSafeActionError }').replace('code: safe.code }','code: error instanceof BusinessRuleError && error.code === "RECEIVING_EVIDENCE_UNVERIFIED" ? error.code : safe.code }'));
edit('components/purchase-orders/PurchaseReceivingWorkbench.tsx',s=>{
 s=s.replace('import { useLocale, useTranslations }','import { z } from "zod"\nimport { useLocale, useTranslations }');
 s=s.replace('const emptyEntry =',`const localFormSchema = z.object({ entries: z.record(z.object({ quantity: z.string().max(40), batch: z.string().max(191), expiry: z.string().max(10), serials: z.string().max(960000) }).strict()).refine(value => Object.keys(value).length <= 200), outcome: z.enum(["", "PASSED", "FAILED", "INCOMPLETE"]), reason: z.string().max(2000), notes: z.string().max(2000), resolution: z.object({ id: z.string().min(1).max(191), decision: z.enum(["ACCEPT", "REJECT"]) }).strict().nullable() }).strict()
const emptyEntry =`);
 s=s.replace('  const generation = useRef(0)', '  const [hydratedScope, setHydratedScope] = useState("")\n  const generation = useRef(0)');
 s=s.replace('    sessionStorage.removeItem(key); sessionStorage.removeItem(key + ":draft")','    try { sessionStorage.removeItem(key); sessionStorage.removeItem(key + ":draft"); sessionStorage.removeItem(key + ":form") } catch { /* Clear private in-memory state even when storage is unavailable. */ }\n    setHydratedScope("")');
 s=s.replace('      const saved = sessionStorage.getItem(key + ":draft")','      const form = sessionStorage.getItem(key + ":form"), parsedForm = form && form.length <= 1200000 ? localFormSchema.safeParse(JSON.parse(form)) : null\n      if (parsedForm?.success) { setEntries(parsedForm.data.entries); setOutcome(parsedForm.data.outcome); setReason(parsedForm.data.reason); setNotes(parsedForm.data.notes); setResolution(parsedForm.data.resolution) }\n      const saved = parsedForm?.success ? null : sessionStorage.getItem(key + ":draft")');
 s=s.replace('    void loadRef.current()','    setHydratedScope(key)\n    void loadRef.current()');
 const anchor='  function draft(): PurchaseReceivingDraft {';
 assert.ok(s.includes(anchor));s=s.replace(anchor,`  useEffect(() => {
    if (hydratedScope !== key || pending || receipt || busy) return
    try { sessionStorage.setItem(key + ":form", JSON.stringify({ entries, outcome, reason, notes, resolution })) }
    catch { setError(t("draftStorage")) }
  }, [key, hydratedScope, entries, outcome, reason, notes, resolution, pending, receipt, busy, t])

`+anchor);
 s=s.replace('sessionStorage.removeItem(key); sessionStorage.removeItem(key + ":draft"); setPending(null)','sessionStorage.removeItem(key); sessionStorage.removeItem(key + ":draft"); sessionStorage.removeItem(key + ":form"); setPending(null)');
 s=s.replace('{preview.location} · {status(preview.disposition)}','{preview.location} · {t("proposed", { status: status(preview.disposition) })}');
 return s;
});
for(const [locale,add] of Object.entries({en:{proposed:'After confirmation: {status}',draftStorage:'Your entries are kept on this page, but browser storage is unavailable. Keep this page open while resolving the problem.'},fr:{proposed:'Après confirmation : {status}',draftStorage:'Vos saisies sont conservées sur cette page, mais le stockage du navigateur est indisponible. Gardez la page ouverte pendant la résolution du problème.'}}))edit('messages/'+locale+'.json',s=>{const doc=JSON.parse(s);Object.assign(doc.purchaseReceiving,add);return JSON.stringify(doc,null,2)+'\n'});
edit('what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-receiving-browser.cjs',s=>s.replace("await expect(dialog()).toContainText(t.status.REJECTED);assert.equal", "await expect(dialog().getByText(t.stock.unavailable,{exact:true})).toBeVisible();await expect(dialog()).toContainText(t.status.REJECTED);assert.equal").replace("await expect(dialog()).toContainText(t.status.HELD);await close();const held", "await expect(dialog().getByText(t.stock.unavailable,{exact:true})).toBeVisible();await expect(dialog()).toContainText(t.status.HELD);await close();const held"));
edit('what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-receiving-workbench.cjs',s=>s.replace("service.confirmPurchaseReceiving(c,x.scope),e=>e.code==='CONFLICT');return{corruptionDetected:true}","service.confirmPurchaseReceiving(c,x.scope),e=>e.code==='RECEIVING_EVIDENCE_UNVERIFIED');return{corruptionDetected:true}"));
console.log('Preserved uncertain decision recovery, partial private drafts and explicit preview wording. Browser assertions now wait for the actual decision result.');
