const fs=require("node:fs"),crypto=require("node:crypto");
const lane="what-next/workflow-modernization/2026-09-05-run-01/lanes/purchasing-ap/";
const sourceFiles=["services/purchase-order/purchase-order.service.ts","actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts","components/purchase-orders/ModernPurchaseOrderDetailPage.tsx","components/purchase-orders/PurchaseOrderCloneNotice.tsx","hooks/usePurchaseOrderClone.ts","messages/en.json","messages/fr.json"];
const testFiles=["services/purchase-order/__tests__/purchase-order-clone-scope.service.test.ts","services/purchase-order/__tests__/purchase-order.service.test.ts","actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts","hooks/__tests__/usePurchaseOrderClone.test.tsx","components/purchase-orders/__tests__/PurchaseOrderCloneNotice.test.tsx"];
const binding=paths=>paths.map(path=>({path,sha256:crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex")}));
const en=JSON.parse(fs.readFileSync("messages/en.json","utf8")).purchaseOrderClone;
const fr=JSON.parse(fs.readFileSync("messages/fr.json","utf8")).purchaseOrderClone;
if(JSON.stringify(Object.keys(en).sort())!==JSON.stringify(Object.keys(fr).sort()))throw Error("Clone translation key mismatch");
const result = filename => {
 const data=JSON.parse(fs.readFileSync(lane+"evidence/"+filename,"utf8"));
 return {artifact:lane+"evidence/"+filename,success:data.success,suites:data.numTotalTestSuites,passed:data.numPassedTests,failed:data.numFailedTests,total:data.numTotalTests,startTime:data.startTime};
};
const receipt={
schemaVersion:1,recordedAt:new Date().toISOString(),lane:"purchasing-ap",workflowId:"PA-007",findingIds:["PA-F06","PA-F11"],status:"implemented-focused-verification-passed-browser-pending",
sourceFiles:binding(sourceFiles),testFiles:binding(testFiles),
baseline:result("jest-clone-before.json"),
attempts:[{...result("jest-clone-after-01.json"),reason:"Strict hook test found TanStack mutation context passed as a second server-action argument. Production mutationFn now explicitly forwards only the declared payload."}],
tests:{...result("jest-clone-final.json"),command:"node node_modules/jest/bin/jest.js --runInBand --runTestsByPath "+testFiles.join(" ")+" --json --outputFile "+lane+"evidence/jest-clone-final.json",exitCode:0},
lint:{status:"passed",exitCode:0,artifact:lane+"evidence/lint-clone.log",paths:[...sourceFiles.filter(p=>!p.endsWith(".json")),...testFiles.filter(p=>!p.endsWith("/purchase-order.service.test.ts"))]},
localization:{status:"EN/FR namespace parses and key parity passed",namespace:"purchaseOrderClone",keys:Object.keys(en)},
verificationBoundaries:{database:"No live/database operations in this receipt; service transactions mocked. Shared verifier owns genuine isolated persistence proof.",browser:"Not yet asserted by this receipt.",typecheck:"Parent combined check pending; prior editor aggregate check passed before clone changes.",release:"No migration, production deployment, supplier message, provider call, real payment, posting or approval performed."},
remaining:["No cross-session durable clone-command idempotency or explicit clone source relation; uncertain local result blocks further submission and requires inspection.","Current source/reference concurrent changes not independently serialized beyond current transaction checks; broader workflow concurrency batch remains required.","AP interactive writes, held-inspection resolution and bulk status UI still require implementation.","Current new controls localized; legacy purchase detail labels remain outside this correction."],
};
fs.writeFileSync(lane+"evidence/clone-correction-receipt.json",JSON.stringify(receipt,null,2)+"\n");
const regPath=lane+"WORKFLOW_REGISTER.json";const reg=JSON.parse(fs.readFileSync(regPath,"utf8"));const clone=reg.workflows.find(x=>x.id==="PA-007");clone.reviewStatus="source-and-focused-tests-passed";clone.evidence.push("evidence/jest-clone-final.json","evidence/clone-correction-receipt.json");fs.writeFileSync(regPath,JSON.stringify(reg,null,2)+"\n");
fs.appendFileSync(lane+"FINDINGS_AND_REMEDIATION.md",`
## Final clone focused verification

Six baseline scope tests reproduced the original defect before correction. The first post-check passed52 cases and failed2 strict mutation-boundary cases: the query library's second mutation-context argument was being passed to the server action. The explicit one-payload adapter corrected that real transport issue; the assertion was retained.

Final result: **5 suites / 54 tests passed**, including current tenant/reference checks, preserved amounts and notes, module stop, protected action authority, safe error transport, duplicate local triggers, actual returned draft navigation and EN/FR focused recovery alerts. Changed-file lint passed for9 source/test files. EN/FR clone dictionaries parse with matching keys. Exact current source/test hashes and commands are in \`evidence/clone-correction-receipt.json\`. No genuine browser or database-persistence claim is made by this receipt; the shared verifier records those separately.

PA-F11 (high, corrected): both old clone controls navigated to an unconsumed new-form query parameter instead of executing the real clone workflow, and the quick-action control did not use the server-projected capability. Both now share the protected controller and current capability.
`);
console.log(JSON.stringify({receipt:lane+"evidence/clone-correction-receipt.json",sourceFiles:receipt.sourceFiles,tests:receipt.tests,translationKeys:receipt.localization.keys.length,workflowCount:reg.workflows.length}));
