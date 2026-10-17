const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const tasks = require('./roadmap-data.cjs');
const root = path.resolve(__dirname, '../../..');
const out = path.join(root, 'docs/prompt-execution');
const audit = 'what-next/platform-correctness-audit/2026-09-30-run-01';
const run = 'what-next/platform-correctness-roadmap/2026-09-30-run-01';
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const link = (label,p) => `[${label}](<${path.join(root,p).replaceAll('\\','/')}>)`;
const tbl = (heads,rows) => `| ${heads.join(' | ')} |\n| ${heads.map(()=> '---').join(' | ')} |\n${rows.map(row=>'| '+row.map(x=>String(x).replaceAll('|','/').replaceAll('\n',' ')).join(' | ')+' |').join('\n')}\n`;
const bands = {S:[2,4],M:[5,8],L:[9,15],XL:[16,25]};
const find = [
 ['F01','P1','Risky / reproduced','Incorrect FX base amounts and mixed nominal statement totals','R02 R09 R27','Independent nominal/base/rate fixtures; corrected source/report tie-outs; historical impact disposition.'],
 ['F02','P1','Risky / reproduced','Generic reversal bypasses source-owned POS correction','R03 R09 R12 R13 R14','Generic bypass denied; owner correction reconciles all source, stock, cash and GL effects exactly once.'],
 ['F03','P1','Risky / reproduced','Concurrent local queue writes lose acknowledged events; corrupt JSON can reset facts','R04 R32','Multi-tab atomic persistence, quarantine and safe migration; real-device conservation evidence.'],
 ['F04','P1','Risky / reproduced','Restart strands persisted SYNCING events','R05 R24 R32','Interrupted-send/commit/restart resolves using original identities with no duplicate economic effects.'],
 ['F05','P1','Intentionally restricted','Offline replay is test-authorized only','R32 R33','Qualified devices/tenders/fiscal scope, controlled admission, observed pilot and obligation-preserving rollback.'],
 ['F06','P1','Risky / reproduced','Period close omits broader assurance readiness','R07 R12 R31','Shared eligibility and concurrency proof; explicit lock-only/qualified-close states and invalidation.'],
 ['F07','P1','Risky / reproduced','Locked accounting functional currency remains mutable','R02 R09','History-aware server policy blocks relabeling; affected-data review and safe correction disposition.'],
 ['F08','P2','Risky / reproduced','Fiscal period can precede partial-month year start','R06 R09 R20','Boundary policy, no out-of-year intervals, safe disposition of any existing anomalous periods.'],
 ['F09','P2','Risky / reproduced','General-ledger running balance omits opening balance','R06 R09 R27','Opening + movement = closing across cutoff, currency and paginated views.'],
 ['F10','P2','Partial / defense gap','Older ledger database protections, tenant-reference and retention evidence incomplete','R08 R09 R10 R16','Valid writer inventory, adversarial SQL/tenant tests, safe upgrade and approved retention/legal holds.'],
 ['F11','P1','Blocked qualification','Country and external provider/authority readiness incomplete','R18 R19 R17 R33','Dated expert-reviewed capability versions, accepted integration evidence and bounded release claims.'],
 ['F12','P2','Partial / missing capability','Financial BI and several optional professional/decision-support capabilities incomplete','R20 R25 R26 R27 R28 R34 R35 R36 R37','KPI source contracts and independent totals; optional scope either accepted and implemented or explicitly deferred.'],
 ['F13','P2','Partial / verification blocked','Runner/typecheck limitations, stale tests and unresolved readiness clauses','R00 R01 R13 R22 R31','Ordinary completed verification; each gate clause resolved with behavior evidence, no control weakening.'],
 ['F14','P2','Partial / operations unverified','Stale runbooks and missing current recovery/deployment proof','R23 R30 R31 R33','Current isolated restore/upgrade, deployed schedules/alerts, workload/SLO evidence and trained owners.']
];
const caps = [
 ['CAP01','Offline sales and replay'],['CAP02','Online POS and shifts'],['CAP03','Orders, fulfillment and customer credit'],['CAP04','Returns, refunds and credits'],['CAP05','Stock, transfer, reservation, count and loss'],['CAP06','Lot, serial, expiry and unit conversion'],['CAP07','Supplier and purchasing'],['CAP08','AP matching, allocation and correction'],['CAP09','Landed cost'],['CAP10','Cash, bank and mobile-money payments'],['CAP11','Reconciliation and suspense'],['CAP12','Professional accounting and source posting'],['CAP13','Close assurance, exports and accountant access'],['CAP14','Expense, accrual, year-end and assets'],['CAP15','HR identity, organization and contracts'],['CAP16','Compensation, documents, time and leave'],['CAP17','Payroll calculation and transitions'],['CAP18','Payroll payment, declaration and close'],['CAP19','Country packs and fiscal compliance'],['CAP20','BI, dashboards and decision support'],['CAP21','Identity, tenant, RBAC and privacy'],['CAP22','Modules, packages and billing'],['CAP23','Events, outboxes and workers'],['CAP24','AI and agent governance'],['CAP25','Customer/accountant network and communications'],['CAP26','Master data, media, history and onboarding'],['CAP27','End-of-day and leakage/exception control'],['CAP28','Release, recovery, observability and performance'],['CAP29','Frontend, accessibility, localization and training']
];
const kpis = [
 ['K01','Completed-sale activity','R26','Essential','Order/line population, statuses and original-versus-corrected activity agree.'],
 ['K02','Realized net sales, COGS and gross margin','R27','Essential','Recognized net sales less source-frozen, return-adjusted cost; margin null at zero denominator.'],
 ['K03','Basket, product and branch performance','R26','Essential','Correct population/grain and branch scope; not a substitute for posted profit.'],
 ['K04','Order activity and commitments','R26','Essential','Draft, committed, fulfilled and cancelled states remain distinct.'],
 ['K05','Cash position and drawer variance','R26','Essential','Counts, ledger movements and provider-settled money remain distinct.'],
 ['K06','Settlement lag, fees and cash in transit','R26','Qualified-rail addition','R19 provider evidence; gross-to-net fee bridge and pending aging.'],
 ['K07','Reconciliation exceptions and suspense aging','R26','Essential','Owned unresolved balances and as-of aging tie to reconciliation source records.'],
 ['K08','Low stock and inventory coverage','R26','Essential','Available, reserved and on-hand definitions; actionable location scope.'],
 ['K09','Inventory turnover, aging and replenishment','R34','Conditional extension','Cost/lead-time/lot data first; descriptive ratios before forecasts.'],
 ['K10','Shrinkage, stock loss and adjustment variance','R26','Valuable core addition','Approved loss/count/correction sources and valuation policy.'],
 ['K11','Supplier delivery reliability and commitments','R26','Valuable core addition','Promised-date and accepted-receipt denominators; unavailable if missing.'],
 ['K12','AR/AP aging and working capital','R27','Essential','Outstanding as-of amounts agree to source allocations and GL.'],
 ['K13','Income statement, balance sheet and trial balance','R27','Essential','Correct base currency, openings and whole-population independent statement tie-outs.'],
 ['K14','Cash-flow statement','R27','Essential professional suite','Approved method, noncash/FX bridge and beginning-to-ending cash reconciliation.'],
 ['K15','Payroll cost and headcount','R28','Essential people suite','Effective population and approved/paid/posted cost states separated.'],
 ['K16','Attendance, leave and workforce trends','R28','Valuable people addition','Policy-based denominators, effective manager scope and privacy controls.'],
 ['K17','Close progress, evidence freshness and integration reliability','R26','Essential','Versioned source readiness, actual worker lag and independently owned exceptions.'],
 ['K18','Budget versus actual and scenario cash forecast','R36','Conditional extension','Trusted actuals, versioned assumptions and measured forecast quality.'],
 ['K19','Customer retention and repeat-purchase cohorts','R37','Conditional extension','Identity/consent quality, anonymous transactions and correction-aware populations.']
];
const lenses = [
 ['Platform architecture','R00 R03 R07 R21 R31'],['Backend / domain integration','R03 R05 R12 R13 R14 R15 R17 R23'],['Database / migrations','R08 R09 R30'],['Security / IAM / privacy','R08 R10 R16 R22 R29'],['Frontend / design systems','R24 R26 R27 R28'],['Workflow / accessibility / localization','R05 R07 R24 R33'],['Product / business processes','R00 R20 R32 R33 R34 R35 R36 R37'],['QA / release assurance','R01 R31'],['SRE / DevSecOps / performance / cost','R23 R29 R30'],['SaaS packaging / billing / customer operations','R19 R21 R33'],['Finance / internal controls','R02 R03 R06 R07 R09 R20 R27'],['Statutory / country compliance','R18 R19'],['Audit / evidence / data quality','R08 R09 R25 R31'],['POS / inventory / offline','R04 R05 R12 R32 R34'],['Purchasing / AP','R14 R34'],['HRIS / payroll','R16 R17 R18 R28'],['Payments / reconciliation','R15 R19'],['Accounting close','R06 R07 R20 R31'],['BI / data governance','R25 R26 R27 R28 R34 R36 R37'],['AI safety / evaluation / human approval','R29'],['API / events / provider boundaries','R05 R19 R23'],['Rollout / support / training','R24 R30 R32 R33']
];
const commands = [
 ['V01','npm run prisma:validate','Schema syntax/configuration only; does not prove migration or runtime correctness.'],
 ['V02','npm test -- --runInBand --runTestsByPath <existing-test-paths>','Use the normal repository config. Placeholder is deliberate: substitute verified paths for the package; new tests are planned, not claimed present.'],
 ['V03','npm run typecheck','Must complete; timeout is not a pass. Diagnose config/input scope before altering it.'],
 ['V04','npm run build:app','Safe application-build wrapper; inspect configuration and use the isolated test environment. Do not substitute npm run build: it chains migration deployment.'],
 ['V05','node scripts/service-boundary-gate.js --mode fail','The service:boundary npm script defaults to report; release verification must explicitly fail.'],
 ['V06','npm run inventory:boundary','Structural boundary evidence only.'],
 ['V07','npm run inventory:valuation:truth:gate','Structural/readiness evidence; also require real inventory/valuation tests.'],
 ['V08','npm run ledger:close-truth:gate','Does not replace close concurrency and source-readiness evidence.'],
 ['V09','npm run payment:cash-truth:gate','Does not prove external settlement or actual cash finality.'],
 ['V10','npm run purchasing:ap:gate','Requires finalized PO-to-payment proof in addition.'],
 ['V11','npm run offline:pos:replay:gate','Cannot authorize production offline merely because the scanner passes.'],
 ['V12','npm run payroll:presence:gate','Presence does not prove qualified statutory behavior.'],
 ['V13','npm run payroll:trust-spine:gate','Resolve literal marker mismatch and all other conjuncts with behavior evidence.'],
 ['V14','npm run report:trust:export:gate','Resolve five blocked clauses individually; do not blanket-label them false positives.']
];

// Verify scope and dependency completeness before producing reports.
assert.equal(tasks.length,38);
const ids = new Set(tasks.map(t=>t.id));
assert.equal(ids.size,38);
const required = ['id','title','parent','phase','priority','effort','deps','owner','reviewer','findings','caps','objective','state','steps','paths','data','controls','verify','gate','blocker','done'];
for (const t of tasks) {
 for (const k of required) assert.ok(t[k] !== undefined && t[k] !== '', `${t.id} missing ${k}`);
 assert.ok(bands[t.effort]);
 for(const d of t.deps) assert.ok(ids.has(d), `${t.id}: unknown dependency ${d}`);
 for(const p of t.paths) assert.ok(fs.existsSync(path.join(root,p)), `${t.id}: missing inspection path ${p}`);
}
const visited = new Set(), stack = new Set(), ordered = [];
function visit(id) { if (visited.has(id)) return; assert.ok(!stack.has(id),`Dependency cycle ${id}`); stack.add(id); tasks.find(t=>t.id===id).deps.forEach(visit); stack.delete(id); visited.add(id); ordered.push(id); }
tasks.forEach(t=>visit(t.id));
for(const [id] of find) assert.ok(tasks.some(t=>t.findings.includes(id)),`Uncovered ${id}`);
for(const [id] of caps) assert.ok(tasks.some(t=>t.caps.includes(id)),`Uncovered ${id}`);
for(const [, ,id] of kpis) assert.ok(ids.has(id));
for(const [, refs] of lenses) refs.split(' ').forEach(id=>assert.ok(ids.has(id)));
for(const [, , , ,refs] of find) refs.split(' ').forEach(id=>assert.ok(ids.has(id)));
const sources = ['executive-assessment.md','findings.md','schema-assessment.md','capability-coverage.csv','architecture-and-workflows.md','bi-capability-matrix.md','review-lens-register.md','verification-summary.md','concurrent-changes-and-rechecks.md','remediation-roadmap.md','evidence-index.md'];
const baselineFile = path.join(__dirname,'source-baseline.json');
const sourceHashes = Object.fromEntries(sources.map(p=>[`${audit}/${p}`,sha(fs.readFileSync(path.join(root,audit,p)))]));
if (fs.existsSync(baselineFile)) assert.deepEqual(sourceHashes,JSON.parse(fs.readFileSync(baselineFile)).hashes,'Original audit changed');
else fs.writeFileSync(baselineFile,JSON.stringify({capturedAt:new Date().toISOString(),hashes:sourceHashes},null,2));
const auditHash = sha(fs.readFileSync(path.join(__dirname,'roadmap-data.cjs')));
const validation = {checkedAt:new Date().toISOString(),status:'PASS',packages:38,findings:14,capabilities:29,kpis:19,lenses:22,acyclic:true,requiredFields:true,inspectionPathsExist:true,originalAuditUnchanged:true,topologicalOrder:ordered,planningDataSha256:auditHash};
fs.writeFileSync(path.join(__dirname,'plan-validation.json'),JSON.stringify(validation,null,2));
const published = fs.existsSync(path.join(__dirname,'publication-validation.json')) && JSON.parse(fs.readFileSync(path.join(__dirname,'publication-validation.json'))).status==='PASS';
const total = items => items.reduce((a,t)=>[a[0]+bands[t.effort][0],a[1]+bands[t.effort][1]],[0,0]);
const core = total(tasks.filter(t=>!t.priority.includes('conditional'))), optional=total(tasks.filter(t=>t.priority.includes('conditional')));
const sourceList = sources.map(p=>`- ${link(p,`${audit}/${p}`)}`).join('\n');
const baseline = `The source assessment is the **30 September 2026 audit**, with baseline commit \`62a56036a5ac9b37236a20c9b148052199069479\` plus its captured dirty working tree. The audit observed 15 concurrent file changes and performed bounded rechecks. Findings are historical evidence to revalidate in R00/R01, not a fresh assessment of every current file. This roadmap is **planning completed; remediation not executed in this publication**.`;
const evidence = `Initial audit: **3,173 passed / 23 failed assertions across 326 suites**, using an audit-specific adapter. Later overlapping rechecks: people 552 passed / 15 failed; finance 677 / 3; supplement 112 / 0; changed UI 8 / 0. Thus **18 failed assertions remained in the last affected-cohort rechecks**; these results must not be added to the initial totals. Eight structural gates passed and two were blocked. Typecheck timed out after 420 seconds; the browser could not connect. None of those commands was rerun as part of this roadmap publication.`;
const prelude = `Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses \`not applicable\` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.`;
const prompt = `${prelude}

# Refined execution prompt: complete remediation roadmap

**Request:** “Could you establish a comprehensive roadmap for the complete execution of these proposals?”

**Classification:** planning/documentation with read-only repository inspection and local report publication. Execute this planning task now. Do not confuse execution of the planning prompt with execution of the future remediation packages.

## Mission and scope

Create a dependency-ordered, evidence-backed roadmap for all F01–F14 findings, CAP01–CAP29 capabilities and K01–K19 proposals in the September 30 platform audit. Cover offline/online POS, sales, stock, purchasing/AP, cash/payments/reconciliation, professional accounting/close, HRIS/payroll, country packs, BI, access/privacy, modules/billing, event workers, AI, frontend, recovery and operations. Activate all 22 review lenses listed in the source audit; these are role lenses, not assertions that separate human experts have approved the work.

## Execution checklist

1. Read the original audit, bounded rechecks and existing high-level W00–W11 roadmap. Preserve their evidence and all unrelated work.
2. Inspect current command definitions and relevant knowledge-graph/source ownership paths. Use graphs as navigation; confirm current code before implementation.
3. Expand each proposal into a package with objective, current state, priority, dependencies, paths, data impact, controls, verification, rollout gate, owner/reviewer, assumptions, effort and definition of done.
4. Separate core defect fixes, missing lifecycle evidence, external qualification and optional scope. Start independent work in parallel without assigning unrequested autonomous agents.
5. Define deployment/data safety, decision ownership, acceptance journeys, first-sprint actions, capacity assumptions and the status/evidence contract.
6. Validate complete finding/capability/KPI/lens coverage and an acyclic dependency graph. Preserve the older publication before updating the fixed report destination.
7. Publish exactly five Markdown/PDF pairs using the repository publisher. Verify source preservation, PDF headers, sizes, names and absence of intermediate files.

## Evidence to inspect

${sourceList}

Also inspect \`AGENTS.md\`, \`package.json\`, Jest/TypeScript/Next configuration, the existing report publisher and relevant \`graphify-out/\` entries. Domain source paths in each package identify the next implementation inspection targets; they do not imply that every source line was freshly re-audited during roadmap drafting.

## Expected artifacts

Publish these pairs under \`docs/prompt-execution/\`: 01_REFINED_PROMPT; 02_EXECUTION_REPORT; 03_EXECUTION_FINDINGS_AND_RISKS; 04_IMPLEMENTATION_ROADMAP; 05_ROADMAP_EXECUTIVE_SUMMARY. Keep source hashes, planning validation and the previous publication in \`${run}/\` outside the publication directory.

## Verification commands

Run \`node ${run}/build-roadmap.cjs\` for required-field, path, coverage and dependency validation. Run \`node .agents/skills/docs-report-publisher/scripts/publish_reports.mjs prompt-execution\` to publish. Run \`node ${run}/validate-publication.cjs\` to verify the exact five-pair invariant and unchanged Markdown. Application verification commands are a future-execution catalog in the roadmap, not commands to run during this planning-only task.

## Risk controls and non-goals

Preserve prior reports and dirty-worktree changes. Do not change application code, schema, live data, feature flags, payroll rules, provider configuration or deployment. No use of secrets or sensitive tenant records is needed for this task. Do not send external messages or claim expert/regulatory approval. Keep production offline and draft statutory restrictions intact. Do not treat a scanner pass as runtime proof, or missing metric data as zero. Manufacturing, legal-entity consolidation and employee performance prediction are not inferred requirements.

## Success criteria

All 14 findings, 29 capabilities, 19 KPIs and 22 lenses have traceable work/decision coverage; every work package has all required execution fields; hard dependencies contain no cycle; the original audit and older publication are preserved; five verified report pairs exist; effort and timeline assumptions are explicit; the next action is executable; current planning results are distinguished from historic tests and future implementation.

## Follow-on implementation prompt template

“Execute package [Rxx] from the published roadmap. Re-read its source finding, verify current source and predecessors, preserve unrelated changes, and confirm the package's explicit operating scope. Implement only the necessary change. Add the stated failure/concurrency/financial tests in the owning suite and run relevant current commands. Save exact revision, hashes, results, migrations, unresolved decisions and reviewer requirements in a new evidence folder. Do not mark the package complete until its definition of done and rollout gate are met. Prepare any sensitive or external action as a concrete reviewable final step before seeking authority.”
`;

const decisions = [
 ['D01','Initial segment, locations, currencies, enabled modules and capability promises','Product owner + delivery lead','R00; before release-scope baseline'],
 ['D02','Functional currency, rate/rounding, partial-year, close and year-end policies','Accounting owner + qualified accountant','R02/R06/R07/R20; before financial implementation acceptance'],
 ['D03','Offline devices, storage/eviction, supported tenders, fiscal limits and recovery','POS/product + security + country owner','R04/R05 design; before R32 admission'],
 ['D04','Role matrix, legal holds, retention and HR/workforce disclosure','Privacy/records + HR + AppSec','R08/R10/R16/R28; before enforcement and sensitive launch'],
 ['D05','Named country experts, rule versions, providers and submission authority','Country/integration leads + business approvers','R18/R19; begin at R00, complete per capability'],
 ['D06','Which optional lot/landed-cost/assets/budget/cohort features are required','Product + actual customer + domain owner','R34–R37; before committing implementation capacity'],
 ['D07','Deployment workload, latency, error, backlog, cost, RPO/RTO and alert objectives','SRE + product + finance','R23/R30; before measuring operational acceptance'],
 ['D08','Pilot cohorts, minimum volume, business-cycle coverage and observation window','Release owner + pilot operations','Before R32/R33; criteria cannot be invented after results']
];
const waves = [
 ['0 / G0','Immediate unblockers','R00–R01; begin R18/R19 review preparation','Versioned scope and reproducible checks; domain blockers remain visible.'],
 ['1 / G1','Correctness foundations','R02–R08 and R10; R04/R05 run independently of finance','Financial meaning, source correction, durable offline facts and access/DB contracts.'],
 ['2 / G2','Complete domain workflows','R11–R17, R20–R22; start R23/R24/R25 as inputs stabilize','Final-state domain, permission and UI evidence; no draft-only substitutes.'],
 ['3 / G3','BI and release hardening','R09, R26–R31; complete applicable R18/R19','Independent financial/operational BI, historical disposition, restore and candidate dossier.'],
 ['4 / G4–G5','Controlled pilot and rollout','R32–R33','Qualified capability/cohort activation with monitoring, training and safe recovery.'],
 ['5 / decision gate','Conditional extensions','R34–R37 after their source prerequisites','Implement accepted needs or document explicit deferral; promote to mandatory if promised.']
];
const milestones = [
 ['G0','Execution baseline','Current source manifest, assigned roles/decisions, complete backlog and ordinary verification commands that complete.','Delivery + QA'],
 ['G1','Core truth','No acknowledged offline event loss/stranding in the defined storage scope; correct FX/settings, source correction, fiscal/GL and close behavior.','Domain owners + independent QA/accountant'],
 ['G2','Technical workflow readiness','Finalized source-to-stock/cash/payroll/GL workflows, tenant/RBAC checks, scoped UI and defined KPI contracts.','Domain owners + QA/AppSec'],
 ['G3','Qualified candidate','Exact revision/migrations, historical data disposition, current restore/operations proof, independent totals and required country/provider qualification.','Release assurance + relevant experts'],
 ['G4','Pilot acceptance','Agreed volume/cycle/device coverage; zero silent loss, duplicate economic effects or unexplained ledger/subledger mismatch; objectives met.','Pilot operations + release owner'],
 ['G5','Cohort release and handover','Approved capability matrix, rollback/incident procedures, trained owners, monitored stability and known-limit disclosure.','Release owner + product + SRE']
];

let roadmap = `# Stoquify comprehensive execution roadmap

**Version:** 1.0 | **Planning date:** 30 September 2026 | **Status:** proposed execution baseline, not implementation completion.

${baseline}

The roadmap expands W00–W11 into **38 packages**: 34 core/qualification/rollout packages and four conditional extension packages. It covers **14 findings, 29 platform capabilities, 19 BI proposals and 22 review lenses**. First restore trustworthy verification, then run financial correctness and offline durability in parallel. Start country/provider review early. Complete source lifecycles before promoting financial BI or enabling broader release claims.

## 1. How to execute this plan

Use one backlog with R00–R37 as stable parent tickets. Break a package into smaller implementation tickets where needed, preserving its acceptance contract. Assign a named owner and a separate qualified reviewer for material financial, privacy and release decisions. Do not reimplement working domains simply because runtime evidence is missing: prove them, then fix the specific failing behavior.

**Status lifecycle:** PROPOSED → READY → IN_PROGRESS → IN_REVIEW → VERIFIED → RELEASED. BLOCKED and DEFERRED require a reason, accountable owner and next review point. VERIFIED means the definition of done and evidence are met for the named environment; RELEASED additionally requires the applicable release gate. No percentage-complete estimate substitutes for evidence. All packages begin PROPOSED in this publication; existing code is a starting state, not completed remediation credit.

**Dependency semantics:** listed dependencies are hard predecessors for package completion. Discovery, contract preparation and isolated fixture development can start earlier when they do not depend on unresolved behavior. Country/provider qualification and offline activation are additional conditional release gates explicitly stated in each package; a passing local test cannot bypass them. Role names are responsibility proposals, not staffing commitments or evidence that those people approved the work.

## 2. Evidence baseline and limits

${evidence}

The local audit found 211 Prisma models and 87 matching migration checksums. Table/column-name parity was observed, not a complete type/index/privilege or production drift certificate. All 541 sampled stock levels matched physical movements; sampled AP, payroll and reconciliation records were all DRAFT, so their finalized-lifecycle denominator was zero. These facts guide the work but cannot close its release gates.

Architecture navigation includes the August 9 knowledge graphs. For example, action node \`accounting_accountant_access_actions_ts\` and its grant/register actions are in community 58. This points R10/R22 to delegated accountant access; graph age means the current action/service contract must be checked before editing. Existing graph report counts differ from older instruction summaries and are not used as a live architecture certification.

## 3. Delivery sequence and gates

${tbl(['Wave / gate','Focus','Packages','Exit outcome'],waves)}

${tbl(['Gate','Decision','Required evidence','Accountable review'],milestones)}

**Likely finance critical path:** R00 → R01 → R02 → R03 → R07/R08 → final domain workflows → R27 → R31 → R33. R06 feeds R07; R09 must establish historical-data disposition before release. **Offline path:** R00/R01 → R04 → R05, joined with R12/R15/R24/R30/R31 → R32 → offline activation within R33. **External path:** R18/R19 starts early and joins only the capabilities needing that qualification. Exact critical-path duration is unknown until R00/R01 sizes the work and reviewer/provider availability is established.

No broad production-offline enablement, professional mixed-currency readiness claim or unqualified statutory capability should be approved while its blocking finding remains unresolved. These are roadmap recommendations; this publication did not change live feature flags or release configuration.

## 4. Ownership, staffing and planning effort

An illustrative delivery team has five engineering contributors across accounting/backend, POS/offline, people/integrations, data/BI and frontend; two QA contributors for automation and workflow evidence; and shared SRE/AppSec capacity. Product/delivery owns scope and coordination. Independent accounting/payroll/country reviewers and representative operators are additional scarce dependencies. Adapt this structure to actual staff; it is not a hiring or budget commitment. Limit work in progress to two major implementation lanes plus verification/qualification until integration capacity is proved.

Effort bands are **planning assumptions with low confidence**, measured in combined engineering/QA person-days per package: S = 2–4, M = 5–8, L = 9–15, XL = 16–25. They include implementation and focused verification but exclude external reviewer/provider waiting, long pilot observation, production access lead time and unknown historical repair volumes. Re-estimate after reproduction and design; packages may need splitting.

The 34 core packages total approximately **${core[0]}–${core[1]} person-days** by these bands; four conditional packages add **${optional[0]}–${optional[1]} person-days**. These are additive planning ranges, not measured estimates or calendar commitments. At an illustrative effective throughput of 25 combined engineering/QA person-days per week, the core arithmetic is about **${Math.ceil(core[0]/25)}–${Math.ceil(core[1]/25)} working weeks**, before dependency bottlenecks, expert waiting, production constraints or contingency. Re-estimate instead of publishing a fixed completion date from this arithmetic. Partial qualified cohorts may ship sooner under R33; “all proposed capabilities” includes any optional items explicitly accepted under D06.

## 5. Decisions to resolve

${tbl(['ID','Decision','Decision owner','Needed by'],decisions)}

Existing instructions authorize this roadmap, not a blanket live-data repair or external payment/submission. During implementation, complete local preparation and the reviewable plan before asking for any genuinely missing authority. Do not repeatedly ask for permission already granted.

## 6. Work-package register

${tbl(['ID','Package','Priority / effort','Hard predecessors'],tasks.map(t=>[t.id,t.title,`${t.priority} / ${t.effort}`,t.deps.join(', ')||'None']))}

## 7. Detailed execution packages

`;
for(const t of tasks) {
 roadmap += `### ${t.id} — ${t.title}

**Lane:** ${t.phase} | **Original package:** ${t.parent} | **Priority:** ${t.priority} | **Indicative effort:** ${t.effort} (${bands[t.effort].join('–')} combined engineering/QA person-days; low-confidence planning band).

**Owner:** ${t.owner}. **Reviewer:** ${t.reviewer}. **Hard predecessors:** ${t.deps.join(', ')||'None'}. **Traceability:** ${[...t.findings,...t.caps].join(', ')}.

**Objective / outcome:** ${t.objective}

**Current state:** ${t.state}

**Execution:**

${t.steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}

**Impacted paths / modules:** ${t.paths.map(p=>'`'+p+'`').join('; ')}. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** ${t.data}

**Security / controls:** ${t.controls}

**Verification:** ${t.verify}

**Rollout / release gate:** ${t.gate}

**Blocker / assumption:** ${t.blocker}

**Definition of done:** ${t.done}

`;
}
roadmap += `## 8. Complete finding and capability coverage

Finding severity remains the audit's P1/P2 scale. Roadmap P0 means first execution priority; it does not silently reclassify audit severity.

${tbl(['Finding / audit severity','Remediation packages','Closure evidence'],find.map(f=>[`${f[0]} / ${f[1]}`,f[4],f[5]]))}

${tbl(['Capability','Scope','Packages'],caps.map(([id,title])=>[id,title,tasks.filter(t=>t.caps.includes(id)).map(t=>t.id).join(', ')]))}

## 9. BI delivery and governance

Every KPI inherits R25's definition contract: owner and decision; population/grain; source lineage/version; tenant/location/role; currency/rate; business timezone and [start,end) period; as-of/known-at cutoff; included states and corrections; freshness/completeness; null/zero/empty semantics; permission-safe drill-through; independent whole-population reconciliation; and published limitations. Operational, posted, reconciled, certified and forecast labels must remain distinct.

${tbl(['KPI','Capability','Package / stage','Acceptance focus'],kpis.map(k=>[k[0],k[1],`${k[2]} / ${k[3]}`,k[4]]))}

K09/K18/K19 and asset automation are staged proposals, not silently removed work. D06 must decide each independently. If a promised customer cohort requires landed costs, expiry traceability or assets, its package becomes a release prerequisite for that cohort. Manufacturing/BOM, multi-entity consolidation and employee performance prediction remain outside this assessed requirement set; add them only after a separate evidence-backed product decision.

## 10. End-to-end acceptance journeys

${tbl(['Journey','Required final-state evidence','Lead packages'],[
 ['Sale-to-cash-to-close','Onboard tenant/item → shift → sale → stock/cost → tender → return/refund if relevant → bank/cash reconciliation → daily close → GL/period close. Independent stock, cash, receivable and revenue/COGS totals.','R11 R12 R13 R15 R07'],
 ['Offline capture-to-qualified-close','Concurrent capture → storage migration/restart → lost server response → replay/conflict → verified tender/fiscal result → source/stock/GL → close. Every acknowledged event has one classified final outcome.','R04 R05 R32'],
 ['Purchase-to-payment-to-close','PO → receipt → invoice/match exception → approval → payment/allocation → statement match → supplier credit/return → stock/AP/cash/GL tie-out.','R14 R15 R07'],
 ['Hire-to-payroll-to-close','Employee/contract/time/compensation → readiness → reviewed calculation → immutable approval/payslip → payment/reconciliation → declaration evidence → correction → payroll register/GL/close.','R16 R17 R18 R19'],
 ['Correct-and-reclose','Posted source → authorized correction → compensation → invalidated report/certificate → recomputed evidence → approved close/export. Include concurrency and closed-period policy.','R03 R06 R07 R09 R27'],
 ['Restore-and-operate','Restore exact candidate/data chain → login/grants → recover worker/offline queues → verify domain balances → alerts/support actions → qualified read-only or operational reopening.','R08 R23 R24 R30 R31']
])}

For each journey retain at least one fully completed nominal case, every stated material failure case and an independent denominator/count. Zero draft mismatches is insufficient. Test cases must include two tenants and relevant role conflicts, duplicate events, interrupted transactions, corrections, period boundaries and revoked authority. External proofs are separate from local mocks. Evidence should identify environment, revision, migration chain, locale, role and device without exposing secrets or personal data.

## 11. Verification command catalog

The following commands were inspected as planning references, **not run as remediation verification in this publication**. Review scripts before running them, select the isolated environment explicitly and capture exit code, duration, stdout/stderr, source hashes and result files. Some gates write fixed report paths: preserve prior output and copy the new result to an immutable package evidence folder. The package verification clauses define additional tests to add; no new integration/browser suite is claimed to already exist.

${tbl(['ID','Command','Meaning / limit'],commands)}

Verified existing focused test entry points include:

- \`lib/pos/__tests__/offline-local-queue.test.ts\`
- \`services/pos/__tests__/offline-sync.service.test.ts\`
- \`services/accounting/__tests__/manual-journal.test.ts\`
- \`services/accounting/__tests__/periods.service.test.ts\`
- \`services/accounting/__tests__/accounting-settings.service.test.ts\`
- \`services/payroll/__tests__/payroll-run-approval-transition.service.test.ts\`
- \`services/payroll/__tests__/payroll-tenant-boundary.service.test.ts\`
- \`services/modules/__tests__/module-entitlement.service.test.ts\`
- \`services/modules/__tests__/module-admission.service.test.ts\`
- \`services/inventory/__tests__/inventory-stock-event.service.test.ts\`

Example: \`npm test -- --runInBand --runTestsByPath lib/pos/__tests__/offline-local-queue.test.ts services/pos/__tests__/offline-sync.service.test.ts\`. Extend the appropriate existing suites with the package's missing behaviors; use real PostgreSQL/browser tests for transaction/storage claims. Keep the old audit adapter only as historical evidence.

Do not blindly execute aggregate \`build\`, migration/deployment, seed/backfill, restore or policy commands that chain DB setup. Root \`build\` invokes migration deployment. \`prisma:migrate:status\` is a read-only status reference only after the target is known; it is not migration rehearsal. Safe isolated migration/concurrency commands must be derived from the inspected current scripts and recorded in R08/R30, rather than inventing a production-safe invocation here.

## 12. Migration, rollout and rollback rules

1. Discover: inventory data/writers and read-only anomaly counts before selecting a schema or historical fix.
2. Design: define source ownership, versioned contracts, valid transitions, decimal/currency policy and expand/validate/enforce sequencing.
3. Rehearse: use isolated fresh and populated-upgrade environments; prove repeatability, lock/runtime limits and restore.
4. Approve: financial/data owners review impact, dry-run manifest and precise deployment/repair action; external/live authority is distinct from local implementation.
5. Apply in bounded cohorts: record before/after totals, checkpoints, errors and versioned evidence; stop on unexplained mismatch.
6. Recover: disable new admissions where needed, preserve acknowledged/in-flight work and reconcile uncertain outcomes. Prefer forward corrections for posted facts; application rollback must remain compatible with expanded schema and event versions. Never erase a ledger/payment history to simulate rollback.

Non-negotiable proposed tolerances are zero silent acknowledged-event loss, zero duplicate economic effects, zero unauthorized cross-tenant access and zero unexplained ledger/subledger mismatches. Performance, latency, recovery time, queue age, error-rate, workload and cost thresholds must be agreed in D07/D08 before testing; this plan does not invent measured service levels.

## 13. First execution cycle and continuing cadence

**First working day:** execute R00: confirm current revision and active changes, open the package register, nominate accountable owners, preserve source evidence and agree initial cohort/capability boundaries. Begin R18/R19 source/access requests through authorized channels.

**First planning week:** execute R01 and reproduce F01–F04/F07 against the current isolated baseline. Draft currency/source-correction policy and offline storage/recovery design. Prepare the synthetic PostgreSQL/browser fixture and decide D01–D03. This is an initial work plan, not a promise that all gates close in five days.

**Next cycle:** start the two high-priority implementation lanes R02/R03 and R04/R05 after their decisions and verification prerequisites are ready. Move completed contracts into R06–R08 and the relevant domain proofs. Maintain a dedicated verification/reviewer queue so feature work cannot outrun acceptance.

At each weekly delivery review, examine the dependency register, new defects, evidence freshness, external waiting and changes to scope/effort. Reproduce before closing a finding and re-open packages if changed contracts invalidate evidence. End a cycle with demonstrations of real final states and independent totals, not a count of added files or green markers. No recurring automation or notifications are created by this document.

## 14. Evidence and completion contract

For each package, create a versioned evidence folder such as \`what-next/platform-remediation/Rxx/<run-id>/\` at execution time (template path, not yet created). Record: package/status/owner/reviewer; original finding; exact source and migration fingerprints; scope/assumptions/decisions; changed files; executed commands and raw sanitized results; expected and observed invariants; fixture denominators; browser/DB/external evidence class; data/migration/rollback outcomes; unresolved risks; approval references; and next gate. Do not place credentials or personal data in ordinary reports.

Completion means each accepted proposal is either VERIFIED/RELEASED for an explicit scope or formally DEFERRED/BLOCKED with owner and restriction. “Full platform complete” requires all promised domains, required optional features, country/provider qualification, historical impact disposition and operational handover. Merely documenting a blocker is not implementing its remedy.

## 15. Multidisciplinary responsibility coverage

${tbl(['Review lens','Execution packages'],lenses)}

All 22 lenses apply to this plan. No separate independent expert review is claimed. A lens becomes not applicable only for a specific scoped release with a recorded reason; this does not remove its platform obligation.

## 16. Source and publication evidence

${sourceList}

Planning checks: ${link('plan-validation.json',`${run}/plan-validation.json`)}. Publication checks: ${link('publication-validation.json',`${run}/publication-validation.json`)}. The previous September 12 skill-creation publication is preserved under ${link('previous-publication',`${run}/previous-publication`)}. Current report content replaces that older fixed-directory publication without deleting its archive.
`;

const findings = `# Execution findings and risks

**Planning date:** 30 September 2026. **Scope:** roadmap preparation from the saved assessment.

${baseline}

## Status interpretation

**Implemented foundations:** source-owned services, approval/evidence patterns, locks, read-model provenance and many tenant controls were observed in the audit. These support focused remediation; they are not proof every workflow is complete.

**Partial:** finalized workflow proof, professional close integration, database/retention assurance, BI connection and operational readiness. **Missing or not established:** complete cash-flow reporting, current authenticated/accessibility proof and some optional asset/planning/inventory extensions. “Not established” is an evidence limit, not proof no implementation exists anywhere.

**Risky:** reproduced financial/correction/offline defects F01–F04/F06–F09. **Intentionally deferred/restricted:** production offline replay and unsupported statutory capabilities; optional R34–R37 await an explicit product decision. **Blocked:** qualified country/provider review and release evidence unavailable at the audit cutoff. Application status was not freshly retested during this planning task.

## Findings and closure requirements

${tbl(['ID / severity','Assessment status','Issue','Packages'],find.map(f=>[`${f[0]} / ${f[1]}`,f[2],f[3],f[4]]))}

${tbl(['ID','Evidence required to close'],find.map(f=>[f[0],f[5]]))}

## Verification and evidence risk

${evidence}

Normal Jest and an audit adapter are different evidence classes. Mocked unit tests cannot establish PostgreSQL lock behavior; read-only draft-data arithmetic cannot prove payment, reconciliation or payroll finalization. Passing text scanners cannot prove runtime safety. Table/column-name parity cannot establish full schema/privilege parity. A locally restored database cannot prove deployed disaster recovery. Country pack PUBLISHED cannot establish every tax/payroll/fiscal capability is qualified.

## Execution risks and treatments

${tbl(['Risk','Consequence','Treatment / owner'],[
 ['Concurrent work changes the evidence basis','A fix or test result can be attributed to the wrong revision.','R00/R31 fingerprints, isolated evidence windows, preserve unrelated changes; delivery/QA.'],
 ['Fixing tests by weakening controls','False confidence and unauthorized or unqualified operation.','R01 behavior-led triage; statutory/RBAC restrictions remain enforced; QA/domain owners.'],
 ['Historical repair inferred from a repro','Unnecessary or incorrect changes to financial history.','R09 read-only discovery, dry-run, independent review, append-only corrections; accountant/data lead.'],
 ['Offline storage assumptions','Acknowledged data may be lost on eviction, corruption or upgrade.','R04/R05 explicit durability limits, transactional storage, recoverable migration; offline lead.'],
 ['Country/provider waiting hidden in schedule','Engineering completion mistaken for legal/operational readiness.','R18/R19 per-capability blockers and early qualified review; country/integration owners.'],
 ['BI precedes corrected sources','Attractive reports publish economically wrong results.','R25–R28 source contracts and independent tie-outs; BI/accounting owners.'],
 ['Unbounded ERP expansion','Core defects remain while unrelated features consume capacity.','D06/R34–R37 bounded customer decisions; product owner.'],
 ['Runbook/build command mutates an unintended target','Data or release impact during verification.','Inspect scripts; isolated targets; npm run build:app instead of root build for application-only validation; SRE.'],
 ['Missing staff or independent reviewers','Unrealistic dates and self-approved financial conclusions.','Assign roles in R00, re-estimate effort and reviewer capacity; delivery lead.'],
 ['Report publication overwrites older evidence','Previous skill-creation record lost.','Ten older files were copied and SHA-256 checked before publication; retained archive.']
])}

## Applicable and excluded scope

All 22 source-audit review lenses apply to the roadmap and have package mappings in the detailed plan. Actual production deployment, live provider or authority submission, legal certification and use of sensitive tenant records are **not applicable to this planning execution**. They remain scoped, separately authorized future activities where needed. Manufacturing, multi-entity consolidation and predictive employee scoring are not established requirements; they are not inserted into the core roadmap.
`;

const execution = `# Roadmap execution report

**Task:** establish a comprehensive roadmap for complete execution of the assessment proposals. **Workspace:** \`${root}\`. **Classification:** planning/documentation.

## Work completed in this publication

- Applied aqstoqflow-prompt-architect and the repository roadmap/report-publisher workflow.
- Read the saved audit, findings, verification/rechecks, capability and BI coverage, schema/ownership context and the earlier W00–W11 sequence.
- Inspected current verification script definitions, relevant Jest/TypeScript/Next configuration context, publisher source and graph navigation. No new complete system audit is claimed.
- Expanded the proposals into 38 packages with owners/reviewers, dependencies, acceptance evidence, data/control implications, effort bands and explicit activation gates.
- Mapped all 14 findings, 29 capabilities, 19 KPIs and 22 review lenses; added decisions, six integrated journeys, first-cycle actions, migration/rollback and evidence contracts.
- Preserved the prior September 12 publication: ten files copied into \`${run}/previous-publication/\` and hash-verified before replacement.
- Authored the five current Markdown reports and validated planning structure. PDF publication status appears below.

## Commands and actual results

${tbl(['Action / command','Result'],[
 ['PowerShell Get-Content / rg / selected package script and graph reads','Completed relevant read-only planning inspection.'],
 ['Initial sandboxed archive creation/copy','Failed with filesystem access denied before reports were overwritten. The same bounded workspace copy succeeded through the approved escalation path.'],
 ['Archive copy + SHA-256 comparison','PASS: 10 previous files preserved and matched.'],
 ['Initial planning path validation','Detected a sidebar path written as a directory; corrected to the existing config/sidebar.ts file before generating reports.'],
 ['PDF inspection runtime discovery','PyMuPDF was unavailable; bundled pypdf and pypdfium2 are available for inspection. The approved publisher remains the PDF generator.'],
 [`node ${run}/build-roadmap.cjs`,'PASS: 38 complete packages, all 14/29/19/22 coverage sets, acyclic dependencies, existing inspection paths and unchanged original audit hashes.'],
 ['node .agents/skills/docs-report-publisher/scripts/publish_reports.mjs prompt-execution',published?'PASS in recorded publication; final report revision is republished and checked against its updated hashes.':'Pending publication at this draft stage.'],
 [`node ${run}/validate-publication.cjs`,published?'PASS in recorded publication: exact five Markdown/PDF pairs, valid nonempty PDF headers, unchanged Markdown and original audit evidence, retained archive. Final revision is rechecked.':'Pending PDF generation.'],
 ['Application unit/integration/typecheck/build/browser/DB/provider verification','NOT RUN in this roadmap-only task; scheduled under R01 and subsequent packages.'],
 ['Skill quick_validate.py','NOT APPLICABLE: no skill was created or changed. Old skill-validation results were archived as history, not inherited as current blockers.']
])}

## Changed files and boundaries

Updated only the five publication Markdown reports and their generated PDFs, plus supporting planning data, generation/validation scripts, manifests, QA artifacts and preserved reports under \`${run}/\`. No application, test, configuration, schema, migration, skill or production file was intentionally changed by this planning task. No database query, data mutation, feature activation, external message, payment or regulatory submission was performed for roadmap generation.

The original audit files are protected by a source-hash baseline. The generator validates all listed impacted paths exist; those paths identify future work ownership, not files changed now. Existing unrelated work remains outside this task.

## Historical baseline, not current verification

${evidence}

The original assessment remains the source for reproduced defects and local database observations. A new implementation run must refresh it against the selected candidate before using a finding as current truth or marking it resolved.

## Current outcome and limits

Planning structure validation passed. ${published?'The publication pipeline has produced the five pairs successfully; the final manifest records the exact current source/PDF hashes after the final rerender.':'PDF publication and final pair validation remain pending in this draft.'} Remediation implementation has not started as part of this request. All 38 packages remain PROPOSED, including external qualification and conditional extensions. No delivery dates, legal/accounting approval or production readiness are asserted.

Named staffing, product/currency/offline policies, external access, expert qualification, actual historical-data impact and deployment/pilot targets remain execution prerequisites D01–D08. These did not prevent completing the requested roadmap.

## Evidence retained

- ${link('Planning validation',`${run}/plan-validation.json`)}
- ${link('Publication validation',`${run}/publication-validation.json`)}
- ${link('Original audit hash baseline',`${run}/source-baseline.json`)}
- ${link('Previous publication',`${run}/previous-publication`)}
- ${link('Planning data',`${run}/roadmap-data.cjs`)}

${sourceList}
`;

const summary = `# Stoquify roadmap executive summary

**Decision:** start a controlled remediation program with verification, financial correctness and offline durability as the first priorities. **Planning date:** 30 September 2026.

The requested comprehensive roadmap is organized into **38 work packages**, with complete coverage of **14 findings, 29 capabilities, 19 BI proposals and 22 review lenses**. It defines owners/reviewers, dependencies, implementation boundaries, data/controls, acceptance tests, release gates and indicative effort for every package.

## What was executed

The planning prompt was refined and executed against the saved assessment and current command references. Five reports were authored, coverage/dependency checks passed, and the older publication was preserved. ${published?'The repository publisher generated the five PDF pairs successfully; final source/hash checks are recorded in the publication manifest.':'PDF publication is pending at this draft stage.'} No application fixes, migrations, live financial actions or feature activation were executed in this planning task.

## Recommended sequence

${tbl(['Order','Outcome','Work'],[
 ['1','Trustworthy baseline','R00/R01: select current scope/revision, reproduce defects, complete ordinary tests/typecheck/build and triage blocked gates.'],
 ['2','Correct financial meaning and durable offline facts','R02/R03/R06/R07/R08 financial/control lane; R04/R05 offline lane. Start R18/R19 qualification preparation in parallel.'],
 ['3','Complete business lifecycles','R10–R17/R20–R24: access, master data, POS/stock, sales, AP, reconciliation, HRIS/payroll, packaging, external access, workers and user journeys.'],
 ['4','Trusted BI and qualified release evidence','R09/R25–R31: historical impact disposition, operational/financial/workforce BI, AI evaluation, restore/runbooks and integrated proof.'],
 ['5','Controlled activation and handover','R32/R33: supported-device offline pilot, qualified country/provider cohorts, monitored rollout, training and operational ownership.'],
 ['6','Accepted extensions','R34–R37: lot/landed-cost/replenishment, assets, budgets/forecast and customer cohorts only after product/source-quality decisions.']
])}

## Readiness and top blockers

The assessment demonstrated useful foundations but did not establish complete-platform readiness. The priority defects involve FX/base currency, source-owned correction, lost/stranded offline events and professional-close semantics. Country/payroll/fiscal qualification, real external integration, finalized lifecycle, authenticated accessibility and deployed recovery evidence remain separate requirements.

${evidence}

These are historic audit results. **Current planning checks:** passed; **current application checks:** not run; **current skill validation:** not applicable because skills were not changed. The first archive attempt failed due to filesystem permissions, then the approved bounded copy succeeded. No unresolved report-generation failure is claimed when the final publication manifest passes.

## Capacity and decision needs

Indicative low-confidence planning ranges are **${core[0]}–${core[1]} combined engineering/QA person-days for 34 core packages**, plus **${optional[0]}–${optional[1]} for four conditional packages**. At an illustrative 25 effective person-days per week this is approximately ${Math.ceil(core[0]/25)}–${Math.ceil(core[1]/25)} core working weeks before sequencing bottlenecks, external waiting, pilot observation and contingency. These are planning assumptions to replace after R00/R01, not committed estimates or dates.

Assign named owners and independent reviewers; agree the first customer/cohort scope, accounting and offline policies, country/provider access, retention/privacy rules, service objectives and pilot acceptance thresholds. Optional features become mandatory when promised to a cohort. Do not advertise restricted capabilities as complete while awaiting those decisions.

## Next logical action

**Execute R00 and R01 first.** Establish the current revision and evidence register, resolve ordinary verification startup/typecheck limits and reproduce the critical defects. Then execute R02/R03 and R04/R05 as the two primary lanes. Begin expert country/provider review early so its waiting time does not remain hidden until release.

Use ${link('the detailed implementation roadmap','docs/prompt-execution/04_IMPLEMENTATION_ROADMAP.md')} as the execution contract. Publication evidence is in ${link('publication-validation.json',`${run}/publication-validation.json`)}. The earlier report set is retained under ${link('previous-publication',`${run}/previous-publication`)}.
`;

const reports = {'01_REFINED_PROMPT.md':prompt,'02_EXECUTION_REPORT.md':execution,'03_EXECUTION_FINDINGS_AND_RISKS.md':findings,'04_IMPLEMENTATION_ROADMAP.md':roadmap,'05_ROADMAP_EXECUTIVE_SUMMARY.md':summary};
fs.mkdirSync(out,{recursive:true});
for(const [name,content] of Object.entries(reports)) fs.writeFileSync(path.join(out,name),content.replaceAll('\r\n','\n'),'utf8');
const mdHashes = Object.fromEntries(Object.keys(reports).map(n=>[n,sha(fs.readFileSync(path.join(out,n)))]));
fs.writeFileSync(path.join(__dirname,'markdown-before-publish.json'),JSON.stringify({generatedAt:new Date().toISOString(),hashes:mdHashes},null,2));
fs.writeFileSync(path.join(__dirname,'roadmap-register.json'),JSON.stringify({status:'PROPOSED',tasks,findings:find,capabilities:caps,kpis,lenses,effort:{core,conditional:optional,bands}},null,2));
console.log(JSON.stringify({status:'PASS',reports:Object.keys(reports),coverage:validation,effort:{core,conditional:optional}},null,2));
