'use strict';
// Assemble retained evidence only: no application imports or database connection.
const fs=require('node:fs'),path=require('node:path');
const {OUT}=require('./disposable-business-dataset.cjs');
const read=n=>JSON.parse(fs.readFileSync(path.join(OUT,n),'utf8'));
const optional=n=>fs.existsSync(path.join(OUT,n))?read(n):null;
const manifest=read('manifest.json'),inventory=read('table-inventory.json'),verification=read('verification.json'),before=read('verification-before-replay.json'),seed=read('seed-results.json'),types=read('typecheck.json'),history=read('history-results.json'),additional=read('additional-scenarios.json');
const coreOrganizations=['synth12_douala','synth12_yaounde','synth12_bafoussam'];
const lanes=['commerce','people','firm-close','platform','stock-pos'];
const remainingBaseline=read('remaining-table-baseline.json'),remainingAssessment=read('remaining-table-assessment.json'),pictureTests=read('picture-unit-summary.json');
const remainingVerification=verification.remaining;
const remainingAll=optional('remaining-all-results.json');
const laneEvidence=lanes.map(lane=>{
 const candidates=[optional(`remaining-${lane}-results.json`),remainingAll].filter(result=>result?.scenarios?.some(row=>row.lane===lane));
 candidates.sort((a,b)=>Date.parse(b.generatedAt)-Date.parse(a.generatedAt));
 const result=candidates[0];
 return {lane,generatedAt:result?.generatedAt??null,source:result?.lane==='all'?'remaining-all-results.json':`remaining-${lane}-results.json`,
  scenarios:(result?.scenarios??[]).filter(row=>row.lane===lane),issues:(result?.issues??[]).filter(row=>!row.lane||row.lane===lane)};
});
const count=n=>verification.counts.find(r=>r.table===n)?.count||0;
const expectedBlockers=history.issues.filter(x=>x.scenario==='invoice-country-prerequisite');
const unexpectedIssues=[...history.issues.filter(x=>x.scenario!=='invoice-country-prerequisite'),...additional.issues];
if(!pictureTests.success||pictureTests.testsFailed!==0||pictureTests.testsPassed<1)unexpectedIssues.push({scenario:'picture-mocked-unit-tests',message:'Focused picture-service tests did not pass'});
const baselineNames=remainingBaseline.tables.map(row=>row.table),assessmentNames=remainingAssessment.tables.map(row=>row.table);
if(baselineNames.length!==131||new Set(baselineNames).size!==131||assessmentNames.length!==131||new Set(assessmentNames).size!==131
 ||assessmentNames.some(table=>!baselineNames.includes(table)))throw Error('Reports require an exact, unique assessment of the original 131 pending tables');
if(inventory.tableCount!==247)unexpectedIssues.push({scenario:'remaining-schema-scope',message:'Expected 247 physical tables; inspect schema change before publishing'});
if(!remainingVerification||remainingVerification.baselineTables!==131)unexpectedIssues.push({scenario:'remaining-verification',message:'Missing real database verification for the original 131 tables'});
const remainingRows=remainingBaseline.tables.map(base=>{
 const assessment=remainingAssessment.tables.find(row=>row.table===base.table),live=verification.counts.find(row=>row.table===base.table);
 const prerequisite=assessment.remainingPrerequisite||assessment.requiredPrerequisite||assessment.blocker||assessment.reason||null;
 const source=assessment.source||assessment.sources||assessment.sourceEvidence;
 if(!live||!assessment.status||!assessment.scenario||!source||(live.count===0&&!prerequisite))unexpectedIssues.push({table:base.table,message:'Incomplete live count, scenario, status, source or empty-table prerequisite'});
 return {...assessment,count:live?.count??null,remainingPrerequisite:prerequisite,source};
});
for(const evidence of laneEvidence){
 for(const organizationId of coreOrganizations)if(evidence.scenarios.filter(row=>row.organizationId===organizationId).length!==1)unexpectedIssues.push({lane:evidence.lane,organizationId,message:'Expected exactly one retained organization execution for this lane'});
 unexpectedIssues.push(...evidence.issues.map(issue=>({lane:evidence.lane,...issue})));
}
const expectedScenarios=['catalog-and-partner-master-data','organization-branch-units','hris-structure-and-access-scopes','cash-payment-independent-evidence-review','leave-entitlements-and-time-requests','pending-future-salary-review','bank-payment-statement-reconciliation','delivery-order-fulfillment-and-billing','customer-credit-and-collections','warehouse-transfer-complete','physical-count-and-approved-variance','supplier-return-and-credit'];
for(const organizationId of ['synth12_douala','synth12_yaounde','synth12_bafoussam'])for(const scenario of expectedScenarios){
 if(additional.scenarios.filter(x=>x.organizationId===organizationId&&x.scenario===scenario).length!==1)unexpectedIssues.push({organizationId,scenario,message:'Expected exactly one successful retained scenario result'});
}
if(additional.scenarios.length!==36)unexpectedIssues.push({message:'Expected exactly 36 additional scenario results'});
const historyAttempt=read('history.json'),scenarioAttempt=read('scenarios.json'),remainingAttempt=optional('remaining.json');
const replayExecuted=historyAttempt.exitCode===0&&scenarioAttempt.exitCode===0&&remainingAttempt?.exitCode===0
 &&Date.parse(historyAttempt.startedAt)>=Date.parse(before.generatedAt)
 &&Date.parse(scenarioAttempt.startedAt)>=Date.parse(historyAttempt.finishedAt)
 &&Date.parse(remainingAttempt.startedAt)>=Date.parse(scenarioAttempt.finishedAt)
 &&Date.parse(verification.generatedAt)>=Date.parse(remainingAttempt.finishedAt)
 &&Date.parse(remainingAll?.generatedAt)>=Date.parse(remainingAttempt.startedAt)
 &&Date.parse(remainingAll?.generatedAt)<=Date.parse(remainingAttempt.finishedAt)
 &&remainingAll?.scenarios?.length===15&&!remainingAll?.issues?.length;
const replay={database:manifest.target.database,checkedAt:new Date().toISOString(),passed:replayExecuted&&before.passed&&verification.passed&&before.database===verification.database&&verification.database===manifest.target.database&&!!before.businessStateFingerprint&&before.businessFingerprint===verification.businessFingerprint,before:before.businessFingerprint,after:verification.businessFingerprint,scope:verification.fingerprintTables,execution:{history:historyAttempt,scenarios:scenarioAttempt,remaining:remainingAttempt,orderedAfterBaseline:replayExecuted},excludes:'Authentication/read-audit records may grow. Comparison covers listed business counts, posted ledger totals and retained inventory, sales, invoice, delivery, HR, payment, reconciliation, certificates and remaining-table business states.',remainingExclusions:remainingVerification?.fingerprintExclusions??null};
fs.writeFileSync(path.join(OUT,'replay-result.json'),JSON.stringify(replay,null,2)+'\n');
const populated=inventory.rows.filter(r=>r.count>0).length,pending=inventory.rows.filter(r=>r.disposition==='PENDING_BUSINESS_SCENARIO').length;
const remainingPopulated=remainingRows.filter(row=>row.count>0).length,remainingEmpty=remainingRows.filter(row=>row.count===0).length;
const remainingStatusCounts=remainingRows.reduce((totals,row)=>{totals[row.status]=(totals[row.status]||0)+1;return totals;},{});
const remainingChecks=verification.checks.filter(row=>row.name.startsWith('remaining-'));
const historicalChecks=verification.checks.filter(x=>x.name.startsWith('historical-'));
const historyComplete=history.months.length===36&&!history.issues.some(x=>x.scenario!=='invoice-country-prerequisite')&&historicalChecks.length===6&&historicalChecks.every(x=>x.passed);
const result={status:'SYNTHETIC_SCENARIOS_WITH_REGULATORY_BLOCKERS',fullSystemReady:false,database:manifest.target.database,historyStart:manifest.historyStart,historyEnd:manifest.historyEnd,monthlyTradingComplete:historyComplete,organizationMonths:history.months.length,historicalPurchases:history.months.reduce((n,m)=>n+m.purchases.length,0),historicalSales:history.months.reduce((n,m)=>n+m.sales.length,0),historicalInvoiceBlockers:expectedBlockers.length,additionalScenarioCount:additional.scenarios.length,unexpectedIssues,models:inventory.modelCount,tables:inventory.tableCount,populatedTables:populated,pendingTables:pending,counts:Object.fromEntries(verification.counts.map(r=>[r.table,r.count])),integrity:{passed:verification.passed,checks:verification.checkCount},replay,sourceTypecheck:types,payrollIssues:seed.issues,
 pictureUnitTests:{passed:pictureTests.success,testsPassed:pictureTests.testsPassed,testsFailed:pictureTests.testsFailed,evidenceClass:pictureTests.evidenceClass},
 baseline:{populatedTables:111,pendingBusinessScenarioTables:131,physicalTables:247},
 organizationScope:{core:coreOrganizations,auxiliary:['synth12_opening_aux','synth12_close_aux'],monthlyHistoryAppliesTo:'Three core organizations only; auxiliary capability tenants have no claimed twelve-month trading history.'},
 remaining:{baselineTables:131,populated:remainingPopulated,empty:remainingEmpty,statusCounts:remainingStatusCounts,assessment:remainingAssessment.summary??null,checks:remainingChecks.length,passed:remainingChecks.length>0&&remainingChecks.every(row=>row.passed),lanes:laneEvidence.map(row=>({lane:row.lane,source:row.source,organizationExecutions:row.scenarios.length,issues:row.issues.length})),verification:remainingVerification}};
if(!historyComplete||unexpectedIssues.length||!verification.passed||!replay.passed||types.own.length||types.importedSourceDiagnosticCount)result.status='INCOMPLETE_SCENARIOS_OR_VERIFICATION';
fs.writeFileSync(path.join(OUT,'result-summary.json'),JSON.stringify(result,null,2)+'\n');
Object.assign(manifest,{seeded:true,datasetCompletion:result.status,monthlyTradingComplete:historyComplete,lastVerifiedAt:verification.generatedAt,evidence:'result-summary.json',fullSystemReady:false});
fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const rows=[['Organizations / locations','organizations','locations'],['Personas / roles','users','roles'],['Products / suppliers','items','suppliers'],['Journal entries / lines','journal_entries','journal_entry_lines'],['Purchase orders / receipts','purchase_orders','goods_receipts'],['Supplier invoices / payments','supplier_invoices','supplier_payments'],['POS commit records / stock movements','pos_commit_results','inventory_transactions'],['Supplier returns / credit notes','purchase_returns','supplier_credit_notes'],['Customer settlements / receivable documents','customer_settlements','customer_receivable_documents'],['Stock transfers / counts','stock_transfers','stock_count_sessions'],['Delivery goods issues / billings','delivery_goods_issues','delivery_billing_outcomes'],['Bank statements / reconciliation runs','statement_files','reconciliation_runs'],['Employees / contracts','payroll_employees','payroll_contracts'],['HR positions / assignments','hris_positions','hris_employment_assignments'],['Reporting relationships / delegations','hris_reporting_relationships','hris_manager_delegations'],['Daily time observations / imports','hris_time_entries','hris_time_import_batches'],['Leave-ledger entries / time requests','hris_leave_balance_entries','hris_time_requests'],['Pending salary reviews / stock adjustments','payroll_salary_change_requests','stock_adjustments']];
fs.writeFileSync(path.join(OUT,'README.md'),`# Disposable synthetic business dataset

**${result.status}**. Monthly trading: **${historyComplete?'complete':'incomplete'}**. Full-system/payroll certification remains blocked.

Database: \`${manifest.target.database}\`, localhost:5432/public. The application database and .env are unchanged. All identities and documents are fictional.

## Coverage

| Coverage | Records |
|---|---:|
${rows.map(([label,a,b])=>`| ${label} | ${count(a)} / ${count(b)} |`).join('\n')}

Wouri Distribution (Douala), Mfoundi Office Supplies (Yaoundé) and Hauts Plateaux Commerce (Bafoussam) each have two stores and a warehouse. Accounting and attendance cover November 2025 through October 28, 2026; October is partial.

Two auxiliary organizations are separate disposable capability laboratories. \`synth12_opening_aux\` has three independent personas and one location for controlled financial opening, firm review and negative bank reconciliation. Its local Africa/Douala month boundaries bind the October 1 opening to the correct period. \`synth12_close_aux\` has two personas, zero locations/providers and a minimally funded August period for independent system-evidence close certification and controlled period sealing, supported by one independently posted synthetic owner contribution. Their outcomes are in the firm/close receipt; neither claims statutory authority approval. Counts above include both auxiliaries; core employees remain 36 and historical coverage remains 36 core organization/month combinations.

Historical trading adds **${result.historicalPurchases} purchases/receipts/invoices and ${result.historicalSales} completed sales**, across ${result.organizationMonths} organization/month combinations. Each intended month has three purchasing branches and twelve sales across two stores per organization. These are monthly synthetic scenarios concentrated on the tenth, not a production-volume daily trading simulation.

Normal services perform submission, independent approval, receiving/inspection, invoicing, stock posting, checkout and shift closure. A process-isolated Date-only clock supplies historical business dates; timers, machine clock and normal application are unchanged. Additional scenarios use October 28 at 20:00 UTC. Real generation-attempt timestamps and PostgreSQL creation timestamps remain distinct. Historical authorization/session validity is not claimed.

Additional workflows include catalogue/customer-location links; cash vouchers (two CASH_REVIEWED, one PROPOSED); partial/full customer collections; completed delivery orders with reservation, goods issue and billing; warehouse transfers; stock-count variances; supplier returns/credits; leave accrual, approved/pending leave, rejected overtime and approved attendance corrections; and pending future salary reviews. Exact results: [additional scenarios](additional-scenarios.json).

Each core organization also has a synthetic bank-transfer supplier payment matched to a retained CSV statement, with independent admission and current AP reconciliation evidence. A separately posted cash-to-bank journal funds the test bank account. Each run is SIGNED through the application by an independent manager; its retained canonical certificate hash, current source coverage and replay are checked. Bank configuration is an explicitly labelled reference fixture; setup approval workflows and live provider settlement are not certified. [Bank evidence boundaries](bank-scenario-notes.md).

HR reference fixtures add six positions, twelve primary assignments, eleven reporting links and one temporary Operations read delegation per core organization. Existing read services check manager, self-service and delegated scope boundaries. Reference configuration was inserted directly with exact replay checks and provenance files; this does not demonstrate an authoring UI/API lifecycle. [HR structure evidence boundaries](hr-structure-notes.md).

HRIS preserves raw imports and separate approved corrections. One-hour approved leave reconciles to corrected 420 worked / 60 absence minutes. Eleven employees per core organization link to application personas; one deliberately unlinked employee per core organization is a self-service readiness case. Raw attendance is not certified payroll input.

## Remaining-table continuation

The retained starting inventory had **111 populated tables and 131 pending model tables**, across **247 physical tables** including implicit relation tables. All **131 originally pending tables** now have an explicit scenario/status, current source reference and exact prerequisite where they remain empty. Of that original set, **${remainingPopulated} now contain rows and ${remainingEmpty} remain empty**. These counts describe data coverage; a populated table may contain a rejected, blocked, pending or reference-only scenario.

Five lanes execute sequentially: commerce, people, firm/close, platform, and stock/POS. Together they retain ${laneEvidence.reduce((n,lane)=>n+lane.scenarios.length,0)} organization/lane execution receipts. Their actual outcomes and the complete 131-table register appear in [Remaining table scenarios](REMAINING-TABLE-SCENARIOS.md), backed by [table assessment](remaining-table-assessment.json).

Reference setup is identified explicitly. Synthetic locations can name existing synthetic managers; payroll policies and company parameters do not imply regulatory admission; agent activation can remain PROVISIONED_INACTIVE; pending invitations/alerts stay local; and negative source/permission/reconciliation cases remain visibly rejected or blocked. Neither a row count nor a test-persona approval establishes production readiness, statutory validity, external delivery or provider settlement.

## Verification

- Schema: 120 migrations applied to a fresh database; repeat deployment had no pending migrations; certification found no unexpected drift. Intentional retained schema differences are separately recorded.
- PostgreSQL: **${verification.checkCount} assertions, ${verification.passed?'PASS':'FAIL'}**, including **${remainingChecks.length} remaining-scenario checks**. Includes FKs/tenant relationships, enabled constraints/triggers, exact core/auxiliary scopes, monthly coverage/dates/baskets, balanced journals, stock/customer ledger tie-outs, required scenario outcomes and document-byte hashes.
- Chronology: cumulative quantity/value uses effective date, inbound before outbound when timestamps tie. The fixture proves constant item cost. This does not certify varying-cost valuation or original execution-order intermediate balanceAfter values.
- Replay: **${replay.passed?'PASS':'NOT ESTABLISHED / FAIL'}** for tracked counts, account totals and business-state fingerprints. Baseline is captured after all extensions, before the ordered history → additional scenarios → all five remaining lanes → verification replay. Exact read-audit exclusions are retained in the replay evidence. A real serialization interruption was recovered with the retained checkout request.
- Real DB negative probes rejected invalid FK/duplicate keys, observed locking and proved rollback preservation: [probe evidence](negative-probes.json).
- Source/unit: four focused Node guard tests passed; ${pictureTests.testsPassed} focused picture-service tests passed with mocked database/provider dependencies and no network ([unit evidence](picture-unit-summary.json)). Scoped TypeScript: ${types.own.length} owned and ${types.importedSourceDiagnosticCount} imported-source diagnostics. No full build/release certification.
- Browser: prior owner login, EN/FR dashboard and French HRIS directory/profile checks used this database. Added scenarios are verified through services/PostgreSQL; this continuation does not claim browser coverage of every scenario.

## Blockers and remaining scope

**${expectedBlockers.length} November–December 2025 supplier invoices remain pending.** The installed Cameroon pack starts January 2026. A source-backed published \`taxes.vat.standardRateBps\` envelope covering the invoice dates is required even for zero-tax fixtures. Receipts and sales remain available.

**Payroll needs authentic reviewed 2025/2026 rule envelopes and fixtures, legal-owner approval/publication, and the separate production-admission envelope.** Current CNPS/IRPP gates are not satisfied. A source-confirmed YTD/adjustment integration gap also needs engineering work and cross-month service tests. Then periods, certified attendance/frozen inputs, calculations, payslips, payments, declarations and ledger/close tie-outs can proceed. [Exact payroll requirements](PAYROLL-UNBLOCK.md).

Inventory: ${inventory.modelCount} models / ${inventory.tableCount} physical tables; ${populated} populated tables and ${pending} tables still tagged PENDING_BUSINESS_SCENARIO by the general inventory. The specific dispositions for all 131 original pending tables are authoritative in [Remaining table scenarios](REMAINING-TABLE-SCENARIOS.md). Nonempty rows do not certify every lifecycle. Live provider settlement, authentic regulatory review, certified close where blocked, and omitted production release prerequisites are not claimed complete. No arbitrary filler, invented expert approval, external transfer or regulatory submission was used.

Unexpected scenario findings: **${unexpectedIssues.length}**. Consult [summary](result-summary.json), [history](history-results.json) and [additional scenarios](additional-scenarios.json). The base seed retains payroll blockers and can exit 1; that is not full success.

## Use and rerun

Private core logins: \`.seed-artifacts/disposable-dataset-2026-10-28/credentials.json\`; auxiliary logins: \`auxiliary-credentials.json\` and \`close-auxiliary-credentials.json\` in the same ignored folder. Keep credentials, runtime secrets, invitation encryption keys and local provider HMAC keys out of version control and reports.

Run sequentially; do not overlap stock writers:

\`\`\`powershell
node scripts/disposable-business-dataset.cjs history ${manifest.target.database}
node scripts/disposable-business-dataset.cjs scenarios ${manifest.target.database}
node scripts/disposable-business-dataset.cjs remaining ${manifest.target.database}
node scripts/disposable-business-dataset.cjs inventory ${manifest.target.database}
node scripts/disposable-business-dataset.cjs verify ${manifest.target.database}
node --test scripts/__tests__/disposable-dataset-guards.node-test.cjs
node scripts/check-disposable-dataset-types.cjs
\`\`\`

Do not replace verification-before-replay.json except to establish a new baseline after an authorized extension. Connections pin host/port/database/schema and certified schema digest; bootstrap refuses an existing database.

Reruns skip unchanged product category and brand assignments so accounting source revisions and retained review evidence remain stable. The first full continuation replay exposed redundant assignment updates; its before/after evidence is retained as verification-replay-attempt-1-before.json and verification-replay-attempt-1-after.json. The reported replay result uses the subsequent ordered execution after that fixture correction.

For interactive use, run the following in separate terminals, then open http://localhost:3187/en/login:

\`\`\`powershell
node scripts/disposable-dataset-documents.cjs
node scripts/serve-disposable-dataset.cjs ${manifest.target.database}
\`\`\`

Source documents use port3188. The app uses isolated build output/test secrets and blanks provider settings. No external workers/providers launch. Ctrl+C stops helpers; the database persists. No automatic deletion is included.

## Provenance

Changes cover task-owned scripts, prisma/disposable-*.ts, focused tests, plan and evidence, plus a small optional server-side storage transport seam in services/media/picture.service.ts. Production calls retain the existing UploadThing transport and URL checks. The disposable image fixture stores actual encrypted bytes locally and exercises service upload/read/claim/delete and denial paths; ordinary application image routes do not use that test transport. Existing migrations were reused and unrelated edits preserved. No commit, PR, deployment or application-database promotion occurred.

Evidence: [manifest](manifest.json), [verification](verification.json), [replay](replay-result.json), [inventory](table-inventory.json), [remaining baseline](remaining-table-baseline.json), [remaining assessment](remaining-table-assessment.json), [source check](typecheck.json), [base seed findings](seed-results.json), [prior browser checks](browser-evidence.json).
`);
const inline=value=>String(value??'').replaceAll('|','\\|').replace(/\r?\n/g,' ').replace(/`/g,"'");
const describeSource=value=>Array.isArray(value)?value.map(describeSource).join('; '):value&&typeof value==='object'
 ?(value.path?[value.path,value.functions||value.function||value.symbol].filter(Boolean).join(' — '):JSON.stringify(value)):String(value??'SOURCE_NOT_RETAINED');
const describe=value=>typeof value==='string'?value:Array.isArray(value)?value.map(describe).join('; '):JSON.stringify(value??null);
const outcomeRows=[];
for(const lane of laneEvidence)for(const execution of lane.scenarios){
 const reported=[...(execution.result?.scenarios??[]),...(execution.result?.findings??[])];
 if(!reported.length)outcomeRows.push({organizationId:execution.organizationId,lane:lane.lane,scenario:'Retained helper result; inspect linked execution evidence',status:execution.result?.status??'COMMAND_RETURNED',source:lane.source});
 for(const row of reported)outcomeRows.push({organizationId:row.organizationId??row.detail?.organizationId??execution.organizationId,lane:lane.lane,scenario:row.scenario||row.name||'Unnamed retained scenario',
  status:row.status||row.result?.status||row.detail?.status||row.result?.decision||'COMMAND_RETURNED',source:lane.source});
}
const remainingMarkdown=`# Remaining database table scenarios

Database: \`${manifest.target.database}\`. Evidence generated by the verifier at **${verification.generatedAt}**. Assessment source: [remaining-table-assessment.json](remaining-table-assessment.json). This report assesses exactly the **131 tables** in the retained starting [baseline](remaining-table-baseline.json).

## Scope and result

The starting inventory recorded **111 populated tables and 131 pending model tables**, with **247 physical tables** including implicit relation tables. After this continuation, **${remainingPopulated} of the original 131 tables contain rows** and **${remainingEmpty} remain empty with explicit prerequisites**. Current inventory: ${populated} populated tables across ${inventory.modelCount} models / ${inventory.tableCount} physical tables. These are synthetic development/testing outcomes, not a production certification.

The three core organizations keep the twelve-month trading and HR history, nine locations and 36 employees. The separately labelled \`synth12_opening_aux\` organization exercises financially empty-client opening, firm review and negative bank reconciliation; \`synth12_close_aux\` exercises a minimally funded-period close with independent system-evidence approval and controlled sealing. Both are excluded from twelve-month historical coverage claims. Their actual statuses, synthetic users, reference setup and blocked or negative cases are identified in the retained lane evidence. Application close certification does not claim statutory authority approval.

A populated table can represent an approved business workflow, a rejected request, an honest open exception, a pending invitation, or direct synthetic reference configuration. None of those classifications is upgraded merely because a row exists. Empty tables are not filled by fabricated regulatory approval, financial postings, provider settlement, human signatures, or claimed external delivery.

## Five execution lanes

| Lane | Organization executions | Execution issues | Retained evidence |
|---|---:|---:|---|
${laneEvidence.map(row=>`| ${row.lane} | ${row.scenarios.length} / 3 | ${row.issues.length} | [${row.source}](${row.source}) |`).join('\n')}

An execution issue is an unexpected failed helper operation. A deliberate blocked/negative business state can be a successful scenario; the individual dispositions below preserve that distinction. Latest available lane evidence is selected by its real generation timestamp; a later complete all-lane replay takes precedence over earlier separate-lane attempts.

## Verification boundaries

- **Source inspection:** current schema/services and table-specific references listed below establish implemented behavior and gates. Dated graph files are discovery evidence only.
- **Source TypeScript:** ${types.own.length} owned-file diagnostics and ${types.importedSourceDiagnosticCount} imported-source diagnostics. This check does not execute business code or a database.
- **Unit/guard checks:** four focused Node guard tests and ${pictureTests.testsPassed} picture-service tests with mocked database/provider dependencies passed. No mocked test result is treated as a PostgreSQL proof; [picture test evidence](picture-unit-summary.json).
- **Real PostgreSQL:** ${verification.checkCount} total assertions, **${verification.passed?'PASS':'FAIL'}**; ${remainingChecks.length} assertions beginning \`remaining-\`, **${remainingChecks.length&&remainingChecks.every(row=>row.passed)?'PASS':'FAIL / NOT ESTABLISHED'}**. Retained coverage checks compare all 131 dispositions with actual table counts and scenario evidence.
- **Replay:** **${replay.passed?'PASS':'NOT ESTABLISHED / FAIL'}**. Verification before replay → history → additional scenarios → all five remaining lanes → final verification. This compares tracked business counts/states and ledger fingerprints. Authentication/read audits, access-use counters and the explicitly listed operational timestamp fields may change; see [replay exclusions](replay-result.json).
- **Browser/rendered checks:** prior login/dashboard/HRIS evidence is retained separately. No browser coverage of every new scenario is claimed. Rendering these reports as PDFs verifies artifact readability, not application behavior.
- **External systems:** no provider transfer, email dispatch, tax filing, statutory acknowledgement or real organization admission is claimed. Durable local queues remain distinct from delivered messages.

## Disposition totals

| Retained status | Tables |
|---|---:|
${Object.entries(remainingStatusCounts).sort(([a],[b])=>a.localeCompare(b)).map(([status,total])=>`| ${inline(status)} | ${total} |`).join('\n')}

## Table coverage index — all 131 original tables

| # | Table | Current rows | Retained disposition |
|---:|---|---:|---|
${remainingRows.map((row,index)=>`| ${index+1} | ${inline(row.table)} | ${row.count??'UNAVAILABLE'} | ${inline(row.status)} |`).join('\n')}

## Table-by-table scenarios and prerequisites

${remainingRows.map((row,index)=>`### ${index+1}. ${row.table}

**${row.status}** — current rows: **${row.count??'UNAVAILABLE'}**; baseline rows: 0.

Scenario: ${describe(row.scenario)}

Current source evidence: ${describeSource(row.source)}

${row.remainingPrerequisite?`Remaining prerequisite or boundary: ${describe(row.remainingPrerequisite)}`:'Remaining prerequisite: none recorded for this bounded synthetic scenario. This is not a claim that all lifecycle variants or production release gates passed.'}
`).join('\n')}

## Retained scenario outcomes

| Organization | Lane | Scenario | Actual recorded status |
|---|---|---|---|
${outcomeRows.map(row=>`| ${inline(row.organizationId)} | ${inline(row.lane)} | ${inline(row.scenario)} | ${inline(row.status)} |`).join('\n')}

\`COMMAND_RETURNED\` means the helper returned its documented result without a status field; inspect the linked lane receipt for assertions and state IDs. It does not mean every downstream transition completed.

## Payroll and historical AP

The exact handoff remains in [PAYROLL-UNBLOCK.md](PAYROLL-UNBLOCK.md): genuine reviewed effective-dated 2025/2026 statutory envelopes and fixtures, authentic reviewer/legal-owner approval and publication, the production-admission envelope, plus source-confirmed YTD/adjustment integration and service-level proof. Reference HRIS/payroll policies, company parameters, attendance observations and negative readiness scenarios do not satisfy those gates.

${expectedBlockers.length} historical November–December 2025 supplier invoices retain their actual COUNTRY_SETUP blocker. The current published Cameroon pack begins in 2026; a source-backed applicable VAT envelope is required for the earlier invoice/pay dates. No approval provenance is invented.

## Reproduction and evidence

Run sequentially against the owned disposable database after preserving the final authorized-extension baseline:

\`\`\`powershell
node scripts/disposable-business-dataset.cjs history ${manifest.target.database}
node scripts/disposable-business-dataset.cjs scenarios ${manifest.target.database}
node scripts/disposable-business-dataset.cjs remaining ${manifest.target.database}
node scripts/disposable-business-dataset.cjs inventory ${manifest.target.database}
node scripts/disposable-business-dataset.cjs verify ${manifest.target.database}
node scripts/check-disposable-dataset-types.cjs
node scripts/report-disposable-dataset.cjs
\`\`\`

The final report command reads retained files only; it does not connect to the database. Database write commands require the existing owned-target, manifest and schema guards. No unguarded seed or production target is implied.

Evidence: [summary](result-summary.json), [live verification](verification.json), [replay](replay-result.json), [original pending baseline](remaining-table-baseline.json), [exact table assessment](remaining-table-assessment.json), [source check](typecheck.json).
`;
fs.writeFileSync(path.join(OUT,'REMAINING-TABLE-SCENARIOS.md'),remainingMarkdown);
// Keep a distinct machine-readable rendering input for the remaining-table
// subsection, without claiming it is a second independent database run.
fs.writeFileSync(path.join(OUT,'remaining-verification.json'),JSON.stringify({generatedAt:verification.generatedAt,database:verification.database,
 source:'verification.json:remaining',passed:remainingChecks.length>0&&remainingChecks.every(row=>row.passed),checks:remainingChecks,coverage:remainingVerification??null},null,2)+'\n');
const payrollPath=path.join(OUT,'PAYROLL-UNBLOCK.md');
const payrollText=fs.readFileSync(payrollPath,'utf8').replace(/\n?<!-- REMAINING-CONTINUATION-START -->[\s\S]*?<!-- REMAINING-CONTINUATION-END -->\n?/g,'')
 .replace('The final replay created zero additional positions, assignments, reporting links or delegations, and the combined 1,081 PostgreSQL assertions passed with an unchanged business fingerprint.',
  'At the earlier HRIS-only checkpoint, its replay created zero additional positions, assignments, reporting links or delegations, and 1,081 PostgreSQL assertions passed with an unchanged business fingerprint. Those are historical checkpoint results; the current continuation totals and replay outcome appear below.')
 .trimEnd();
fs.writeFileSync(payrollPath,payrollText+`

<!-- REMAINING-CONTINUATION-START -->
## Remaining-table continuation evidence

The continuation assesses all 131 originally pending tables. At the retained verification time ${verification.generatedAt}, ${remainingPopulated} contain scenario rows and ${remainingEmpty} remain empty with explicit prerequisites. See [the complete remaining-table register](REMAINING-TABLE-SCENARIOS.md) and [its exact source-backed assessment](remaining-table-assessment.json).

Autonomous synthetic reference setup and controlled non-statutory workflows do not replace the authentic review/publication gates above. Payroll policies, rubrique/company parameters, employee evidence, lifecycle tasks, attendance anomalies and import/correction cases are classified by their actual retained state. A pending or rejected case is useful negative testing evidence and is not payroll-ready input. Any pilot, agent, opening, firm or branch approval performed by a test persona concerns that bounded synthetic workflow; it is not expert approval of Cameroon rules.

The auxiliary \`synth12_opening_aux\` tenant is a financially empty-client capability laboratory, separate from the three core trading organizations. Its opening journal and supporting workpapers do not unblock payroll for the core organizations. The separate \`synth12_close_aux\` funded-period test uses actual independent system-evidence close approval and period controls; it has no employees or payroll activity and no statutory authority approval. Other close evidence retains unresolved source findings; draft exports and a branch review signature do not imply payroll readiness or period closure.

Verification remains separated: current source inspection and ${types.own.length}/${types.importedSourceDiagnosticCount} owned/imported TypeScript diagnostics; ${verification.checkCount} actual PostgreSQL assertions (${verification.passed?'PASS':'FAIL'}); ordered business-state replay (${replay.passed?'PASS':'NOT ESTABLISHED / FAIL'}); and prior limited browser evidence. No new full payroll calculation, annual YTD correctness, live settlement, tax filing, or end-to-end browser certification is claimed.

The required handoff is unchanged: genuine reviewed effective-dated statutory rule envelopes and independent fixtures, reviewer/legal-owner evidence and runtime publication/admission, followed by the YTD/adjustment integration and real service-level proof described above. Test credentials and real-world bank or employee data are not required from the user for this disposable dataset.
<!-- REMAINING-CONTINUATION-END -->
`);
console.log(JSON.stringify({database:result.database,status:result.status,monthlyTradingComplete:historyComplete,historicalPurchases:result.historicalPurchases,historicalSales:result.historicalSales,populatedTables:populated,pendingTables:pending,integrity:result.integrity,replayPassed:replay.passed,unexpectedIssues:unexpectedIssues.length}));
if(result.status==='INCOMPLETE_SCENARIOS_OR_VERIFICATION')process.exitCode=1;
