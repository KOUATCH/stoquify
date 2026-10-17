# Stoquify comprehensive execution roadmap

**Version:** 1.0 | **Planning date:** 30 September 2026 | **Status:** proposed execution baseline, not implementation completion.

The source assessment is the **30 September 2026 audit**, with baseline commit `62a56036a5ac9b37236a20c9b148052199069479` plus its captured dirty working tree. The audit observed 15 concurrent file changes and performed bounded rechecks. Findings are historical evidence to revalidate in R00/R01, not a fresh assessment of every current file. This roadmap is **planning completed; remediation not executed in this publication**.

The roadmap expands W00–W11 into **38 packages**: 34 core/qualification/rollout packages and four conditional extension packages. It covers **14 findings, 29 platform capabilities, 19 BI proposals and 22 review lenses**. First restore trustworthy verification, then run financial correctness and offline durability in parallel. Start country/provider review early. Complete source lifecycles before promoting financial BI or enabling broader release claims.

## 1. How to execute this plan

Use one backlog with R00–R37 as stable parent tickets. Break a package into smaller implementation tickets where needed, preserving its acceptance contract. Assign a named owner and a separate qualified reviewer for material financial, privacy and release decisions. Do not reimplement working domains simply because runtime evidence is missing: prove them, then fix the specific failing behavior.

**Status lifecycle:** PROPOSED → READY → IN_PROGRESS → IN_REVIEW → VERIFIED → RELEASED. BLOCKED and DEFERRED require a reason, accountable owner and next review point. VERIFIED means the definition of done and evidence are met for the named environment; RELEASED additionally requires the applicable release gate. No percentage-complete estimate substitutes for evidence. All packages begin PROPOSED in this publication; existing code is a starting state, not completed remediation credit.

**Dependency semantics:** listed dependencies are hard predecessors for package completion. Discovery, contract preparation and isolated fixture development can start earlier when they do not depend on unresolved behavior. Country/provider qualification and offline activation are additional conditional release gates explicitly stated in each package; a passing local test cannot bypass them. Role names are responsibility proposals, not staffing commitments or evidence that those people approved the work.

## 2. Evidence baseline and limits

Initial audit: **3,173 passed / 23 failed assertions across 326 suites**, using an audit-specific adapter. Later overlapping rechecks: people 552 passed / 15 failed; finance 677 / 3; supplement 112 / 0; changed UI 8 / 0. Thus **18 failed assertions remained in the last affected-cohort rechecks**; these results must not be added to the initial totals. Eight structural gates passed and two were blocked. Typecheck timed out after 420 seconds; the browser could not connect. None of those commands was rerun as part of this roadmap publication.

The local audit found 211 Prisma models and 87 matching migration checksums. Table/column-name parity was observed, not a complete type/index/privilege or production drift certificate. All 541 sampled stock levels matched physical movements; sampled AP, payroll and reconciliation records were all DRAFT, so their finalized-lifecycle denominator was zero. These facts guide the work but cannot close its release gates.

Architecture navigation includes the August 9 knowledge graphs. For example, action node `accounting_accountant_access_actions_ts` and its grant/register actions are in community 58. This points R10/R22 to delegated accountant access; graph age means the current action/service contract must be checked before editing. Existing graph report counts differ from older instruction summaries and are not used as a live architecture certification.

## 3. Delivery sequence and gates

| Wave / gate | Focus | Packages | Exit outcome |
| --- | --- | --- | --- |
| 0 / G0 | Immediate unblockers | R00–R01; begin R18/R19 review preparation | Versioned scope and reproducible checks; domain blockers remain visible. |
| 1 / G1 | Correctness foundations | R02–R08 and R10; R04/R05 run independently of finance | Financial meaning, source correction, durable offline facts and access/DB contracts. |
| 2 / G2 | Complete domain workflows | R11–R17, R20–R22; start R23/R24/R25 as inputs stabilize | Final-state domain, permission and UI evidence; no draft-only substitutes. |
| 3 / G3 | BI and release hardening | R09, R26–R31; complete applicable R18/R19 | Independent financial/operational BI, historical disposition, restore and candidate dossier. |
| 4 / G4–G5 | Controlled pilot and rollout | R32–R33 | Qualified capability/cohort activation with monitoring, training and safe recovery. |
| 5 / decision gate | Conditional extensions | R34–R37 after their source prerequisites | Implement accepted needs or document explicit deferral; promote to mandatory if promised. |


| Gate | Decision | Required evidence | Accountable review |
| --- | --- | --- | --- |
| G0 | Execution baseline | Current source manifest, assigned roles/decisions, complete backlog and ordinary verification commands that complete. | Delivery + QA |
| G1 | Core truth | No acknowledged offline event loss/stranding in the defined storage scope; correct FX/settings, source correction, fiscal/GL and close behavior. | Domain owners + independent QA/accountant |
| G2 | Technical workflow readiness | Finalized source-to-stock/cash/payroll/GL workflows, tenant/RBAC checks, scoped UI and defined KPI contracts. | Domain owners + QA/AppSec |
| G3 | Qualified candidate | Exact revision/migrations, historical data disposition, current restore/operations proof, independent totals and required country/provider qualification. | Release assurance + relevant experts |
| G4 | Pilot acceptance | Agreed volume/cycle/device coverage; zero silent loss, duplicate economic effects or unexplained ledger/subledger mismatch; objectives met. | Pilot operations + release owner |
| G5 | Cohort release and handover | Approved capability matrix, rollback/incident procedures, trained owners, monitored stability and known-limit disclosure. | Release owner + product + SRE |


**Likely finance critical path:** R00 → R01 → R02 → R03 → R07/R08 → final domain workflows → R27 → R31 → R33. R06 feeds R07; R09 must establish historical-data disposition before release. **Offline path:** R00/R01 → R04 → R05, joined with R12/R15/R24/R30/R31 → R32 → offline activation within R33. **External path:** R18/R19 starts early and joins only the capabilities needing that qualification. Exact critical-path duration is unknown until R00/R01 sizes the work and reviewer/provider availability is established.

No broad production-offline enablement, professional mixed-currency readiness claim or unqualified statutory capability should be approved while its blocking finding remains unresolved. These are roadmap recommendations; this publication did not change live feature flags or release configuration.

## 4. Ownership, staffing and planning effort

An illustrative delivery team has five engineering contributors across accounting/backend, POS/offline, people/integrations, data/BI and frontend; two QA contributors for automation and workflow evidence; and shared SRE/AppSec capacity. Product/delivery owns scope and coordination. Independent accounting/payroll/country reviewers and representative operators are additional scarce dependencies. Adapt this structure to actual staff; it is not a hiring or budget commitment. Limit work in progress to two major implementation lanes plus verification/qualification until integration capacity is proved.

Effort bands are **planning assumptions with low confidence**, measured in combined engineering/QA person-days per package: S = 2–4, M = 5–8, L = 9–15, XL = 16–25. They include implementation and focused verification but exclude external reviewer/provider waiting, long pilot observation, production access lead time and unknown historical repair volumes. Re-estimate after reproduction and design; packages may need splitting.

The 34 core packages total approximately **263–436 person-days** by these bands; four conditional packages add **39–63 person-days**. These are additive planning ranges, not measured estimates or calendar commitments. At an illustrative effective throughput of 25 combined engineering/QA person-days per week, the core arithmetic is about **11–18 working weeks**, before dependency bottlenecks, expert waiting, production constraints or contingency. Re-estimate instead of publishing a fixed completion date from this arithmetic. Partial qualified cohorts may ship sooner under R33; “all proposed capabilities” includes any optional items explicitly accepted under D06.

## 5. Decisions to resolve

| ID | Decision | Decision owner | Needed by |
| --- | --- | --- | --- |
| D01 | Initial segment, locations, currencies, enabled modules and capability promises | Product owner + delivery lead | R00; before release-scope baseline |
| D02 | Functional currency, rate/rounding, partial-year, close and year-end policies | Accounting owner + qualified accountant | R02/R06/R07/R20; before financial implementation acceptance |
| D03 | Offline devices, storage/eviction, supported tenders, fiscal limits and recovery | POS/product + security + country owner | R04/R05 design; before R32 admission |
| D04 | Role matrix, legal holds, retention and HR/workforce disclosure | Privacy/records + HR + AppSec | R08/R10/R16/R28; before enforcement and sensitive launch |
| D05 | Named country experts, rule versions, providers and submission authority | Country/integration leads + business approvers | R18/R19; begin at R00, complete per capability |
| D06 | Which optional lot/landed-cost/assets/budget/cohort features are required | Product + actual customer + domain owner | R34–R37; before committing implementation capacity |
| D07 | Deployment workload, latency, error, backlog, cost, RPO/RTO and alert objectives | SRE + product + finance | R23/R30; before measuring operational acceptance |
| D08 | Pilot cohorts, minimum volume, business-cycle coverage and observation window | Release owner + pilot operations | Before R32/R33; criteria cannot be invented after results |


Existing instructions authorize this roadmap, not a blanket live-data repair or external payment/submission. During implementation, complete local preparation and the reviewable plan before asking for any genuinely missing authority. Do not repeatedly ask for permission already granted.

## 6. Work-package register

| ID | Package | Priority / effort | Hard predecessors |
| --- | --- | --- | --- |
| R00 | Establish the execution baseline and release scope | P0 / S | None |
| R01 | Restore a reproducible test, typecheck and policy-gate baseline | P0 / M | R00 |
| R02 | Correct currency authority, FX conversion and locked settings | P0 / L | R00, R01 |
| R03 | Enforce source-owned corrections and compensating effects | P0 / L | R02 |
| R04 | Make the offline queue durable and migrate existing records safely | P0 / L | R00, R01 |
| R05 | Recover interrupted sync and reconcile uncertain outcomes | P0 / L | R04 |
| R06 | Correct fiscal boundaries and general-ledger balances | P1 / M | R02 |
| R07 | Unify period close, assurance, invalidation and certified exports | P0 / L | R03, R06 |
| R08 | Strengthen database integrity and records retention | P1 / L | R03 |
| R09 | Assess and correct historical data without rewriting evidence | P1 / L | R02, R03, R06, R08 |
| R10 | Prove access, tenant isolation and privacy across entry points | P1 / L | R00, R01 |
| R11 | Validate master data, onboarding, imports and media lifecycle | P1 / M | R01, R10 |
| R12 | Prove online POS, inventory and end-of-day control | P1 / L | R03, R07, R08, R11 |
| R13 | Complete order-to-cash, customer credit and returns evidence | P1 / L | R03, R08, R10 |
| R14 | Complete purchasing, three-way match and AP finalization | P1 / L | R03, R08, R11 |
| R15 | Prove payment finality, reconciliation and suspense clearance | P1 / L | R03, R08, R10 |
| R16 | Prove HRIS source records, effective scope and employee service | P1 / L | R01, R08, R10 |
| R17 | Complete payroll calculation, payment, declaration and close proof | P1 / L | R03, R07, R08, R15, R16 |
| R18 | Qualify versioned country, payroll, tax and fiscal capabilities | P0 / L | R00 |
| R19 | Qualify payment, billing and authority integrations | P1 / L | R00 |
| R20 | Complete expenses, accruals and year-end accounting workflow | P1 / L | R02, R03, R06, R07 |
| R21 | Verify entitlement, deactivation, billing and package behavior | P1 / M | R01, R10 |
| R22 | Complete customer/accountant access, consent and delivery evidence | P1 / M | R10, R13, R21 |
| R23 | Prove event, outbox and worker recovery in deployment | P1 / L | R01, R10 |
| R24 | Validate complete EN/FR, accessible and mobile user journeys | P1 / L | R01, R10, R11 |
| R25 | Create versioned BI metric contracts and source lineage | P1 / M | R02, R03, R10 |
| R26 | Complete operational commerce, cash and control BI | P1 / L | R12, R13, R14, R15, R23, R25 |
| R27 | Complete financial statements, margin, aging and cash-flow BI | P1 / L | R07, R12, R13, R14, R15, R20, R25 |
| R28 | Complete privacy-scoped workforce and payroll BI | P1 / M | R16, R17, R25 |
| R29 | Validate AI assistance, security posture and cost controls | P1 / M | R10, R21, R25 |
| R30 | Rehearse recovery, refresh runbooks and measure service limits | P1 / L | R01, R08, R23 |
| R31 | Assemble independent end-to-end release evidence | P1 / L | R04, R05, R07, R08, R10, R11, R12, R13, R14, R15, R16, R17, R20, R21, R22, R23, R24, R26, R27, R28, R29, R30 |
| R32 | Run a controlled offline POS pilot and validate recovery | P1 / L | R04, R05, R12, R15, R24, R30, R31 |
| R33 | Release by qualified cohort and transfer ongoing ownership | P1 / M | R09, R31 |
| R34 | Qualify inventory extensions, landed cost and replenishment | P2 conditional / XL | R12, R14, R25, R26 |
| R35 | Add a fixed-asset subledger when professional scope requires it | P2 conditional / L | R07, R20, R25, R27 |
| R36 | Add governed budgets and scenario cash forecasting | P2 conditional / L | R25, R27 |
| R37 | Add consent-aware customer retention and cohort analytics | P2 conditional / M | R13, R22, R25, R26 |


## 7. Detailed execution packages

### R00 — Establish the execution baseline and release scope

**Lane:** Immediate unblockers | **Original package:** W00 | **Priority:** P0 | **Indicative effort:** S (2–4 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Delivery lead. **Reviewer:** Product owner and QA lead. **Hard predecessors:** None. **Traceability:** F13, CAP28.

**Objective / outcome:** Create one versioned backlog and an explicit capability-by-country, provider, module and customer-cohort release contract.

**Current state:** The September 30 audit captured a dirty and concurrently changing worktree; no complete customer acceptance dossier or single releasable revision was established.

**Execution:**

1. Fingerprint the current commit, relevant uncommitted files, migrations, toolchain and evidence timestamps. Reproduce findings before marking them current.
2. Assign named people to the roles below; record decisions D01–D08, scope, severity, dependencies and evidence links. Preserve other work.
3. Choose the first supported online, offline, accounting and HR/payroll cohorts separately. Keep unsupported capability labels explicit.

**Impacted paths / modules:** `what-next/platform-correctness-audit/2026-09-30-run-01`; `package.json`; `prisma/schema.prisma`; `.github/workflows`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** No business-data changes. Retain immutable audit evidence and source fingerprints; use anonymized fixtures for later execution.

**Security / controls:** A roadmap status cannot authorize production changes or serve as accountant, payroll expert or release-owner approval.

**Verification:** Compare current hashes to audit evidence, record changed-file triage, and validate every package dependency and all F/CAP/K coverage.

**Rollout / release gate:** G0: scope, owners, baseline and decision register recorded.

**Blocker / assumption:** Named delivery staff, target customer segment and deployment ownership are not yet supplied; roles here are assignments to fill, not accepted staffing.

**Definition of done:** Every in-scope capability has an owner, release boundary, acceptance scenario and evidence location; no critical finding is silently dropped.

### R01 — Restore a reproducible test, typecheck and policy-gate baseline

**Lane:** Immediate unblockers | **Original package:** W00 | **Priority:** P0 | **Indicative effort:** M (5–8 combined engineering/QA person-days; low-confidence planning band).

**Owner:** QA/platform engineer. **Reviewer:** Domain maintainers. **Hard predecessors:** R00. **Traceability:** F13, CAP28.

**Objective / outcome:** Make ordinary repository verification complete and produce trustworthy failures.

**Current state:** Audit adapter passed 3,173 assertions initially with 23 failures; later overlapping rechecks retained 18 failures. Normal Jest startup and typecheck did not complete; two structural gates were blocked.

**Execution:**

1. Diagnose Next/Jest configuration discovery and TypeScript input scope before changing either; prove the root cause rather than assume old build directories caused the timeout.
2. Repair stale manual-journal and payroll/backfill mocks; reconcile statutory and permission contracts without weakening draft-country restrictions.
3. Replace brittle marker-only checks with behavior-backed assertions where appropriate; resolve all five report-trust clauses individually. Preserve historical failed outputs.

**Impacted paths / modules:** `jest.config.ts`; `tsconfig.json`; `next.config.mjs`; `services/accounting/__tests__/manual-journal.test.ts`; `services/payroll/__tests__`; `services/analytics/__tests__/business-pulse-links.test.ts`; `scripts/payroll-trust-spine-readiness-gate.js`; `scripts/report-trust-export-gate.js`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** No production data. Any DB-dependent command must point at an explicitly isolated disposable database.

**Security / controls:** Do not skip failing safety tests, relax permissions, replace unavailable facts with zero, or change CNPS to READY to obtain a green run.

**Verification:** V01–V04 and V05–V14. Complete normal Jest, typecheck and isolated application build; retain exact commands, durations and failure classifications.

**Rollout / release gate:** G0 verification gate: reproducible normal runner and completed typecheck/build; all remaining blockers assigned to their actual domain package.

**Blocker / assumption:** Current runtime/configuration and resource limits must be measured. Structural gate repair may depend on R13/R22 behavior; baseline closure does not pre-approve those domains.

**Definition of done:** Every historical failure is reproduced, fixed or superseded with evidence; normal commands complete; unresolved domain gates remain visible and blocking for their scope.

### R02 — Correct currency authority, FX conversion and locked settings

**Lane:** Foundations | **Original package:** W01 | **Priority:** P0 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Accounting engineer. **Reviewer:** Independent accountant and data architect. **Hard predecessors:** R00, R01. **Traceability:** F01, F07, CAP12, CAP20.

**Objective / outcome:** Preserve transaction denomination and produce correct functional-currency amounts and statements.

**Current state:** The audit reproduced nominal amounts copied into base fields, mixed nominal sums in statements and mutable base currency after setup lock.

**Execution:**

1. Agree rate direction, rate date/source/version, decimal scale, rounding and functional-currency policy across organization and accounting settings.
2. Repair posting and aggregation so nominal and base amounts stay distinct; reject missing/invalid rates and historical relabeling.
3. Block unsupported currency changes after economic activity; specify a separately reviewed conversion process if a real customer requires it.

**Impacted paths / modules:** `services/accounting/journals.service.ts`; `services/accounting/financial-statements.service.ts`; `services/accounting/accounting-settings.service.ts`; `prisma/schema.prisma`; `services/analytics`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Inventory existing rate/base fields before adding columns. Version provenance where missing; historical correction is R09, never an automatic rewrite.

**Security / controls:** Server-owned currency policy, decimal arithmetic, permission checks and audited setup transitions. Accountants approve economic treatment, not just balanced totals.

**Verification:** V01–V03, V05–V14 as affected; add independent fixtures: 100 EUR at illustrative 655.957 produces 65,595.70 base units; mixed 100 EUR + 100 base units totals 65,695.70. Include rounding, negative corrections, missing rates and locked-setting attempts.

**Rollout / release gate:** G1 finance: no mixed-currency professional statement until fixture and current-data impact review pass.

**Blocker / assumption:** Functional-currency transition and FX source policies need owner approval; the illustrative test rate is not a current-rate recommendation.

**Definition of done:** Posting, reversal and reporting agree with independent expected base amounts; historical currency cannot be silently relabeled.

### R03 — Enforce source-owned corrections and compensating effects

**Lane:** Foundations | **Original package:** W03 | **Priority:** P0 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Accounting/domain integration lead. **Reviewer:** POS, inventory, AP and payroll owners. **Hard predecessors:** R02. **Traceability:** F02, CAP04, CAP12.

**Objective / outcome:** Ensure correction of a business transaction also corrects every affected stock, cash, obligation and ledger fact exactly once.

**Current state:** Generic journal reversal allowed a POS_SALE journal to become a MANUAL reversal without corresponding business-source correction.

**Execution:**

1. Inventory every journal source and its authorized correction owner; define draft cancellation, reversal, refund, return and repost semantics separately.
2. Deny generic reversal for source-owned entries; route through existing owner workflows with stable correction identity and linked effects.
3. Test partial and repeated corrections, closed periods, failed external refunds, FX, and correction-driven evidence invalidation.

**Impacted paths / modules:** `services/accounting/posting.service.ts`; `services/pos`; `services/inventory`; `services/purchasing`; `services/payroll`; `services/reconciliation`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Append correction links/evidence if necessary; retain original postings and source documents. Scan earlier generic reversals under R09.

**Security / controls:** Maker-checker where required, fresh authority, tenant scope and idempotent compensation; never assert provider refund success from a local journal.

**Verification:** V01–V03 and affected truth gates; PostgreSQL tests for duplicate correction, mid-transaction failure, concurrent reversal and source/GL tie-outs.

**Rollout / release gate:** G1 corrections: source-owned reversal bypass denied and approved compensation lifecycle proved.

**Blocker / assumption:** All source owners must agree obligations and irreversible external steps. Local compensation is not proof a provider returned money.

**Definition of done:** Every journal source has an explicit tested correction policy; no supported correction strands inventory, cash or subledger balances.

### R04 — Make the offline queue durable and migrate existing records safely

**Lane:** Foundations | **Original package:** W02 | **Priority:** P0 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Offline/browser-storage engineer. **Reviewer:** QA and data-integrity lead. **Hard predecessors:** R00, R01. **Traceability:** F03, CAP01.

**Objective / outcome:** Conserve every acknowledged offline sale across concurrent writes and storage failures.

**Current state:** Two concurrent enqueue calls could both return sequence 1 while retaining only the second record; malformed JSON could reset the queue.

**Execution:**

1. Choose transactional browser storage after evaluating supported devices; IndexedDB is the preferred candidate, with a documented cross-tab transaction design.
2. Atomically allocate identity/sequence and persist the complete event before acknowledging capture; quarantine corruption instead of silently replacing it.
3. Implement resumable old-queue migration preserving event IDs, hashes and sequence lineage; exercise quota, denied storage, corrupt input and interrupted upgrade.

**Impacted paths / modules:** `lib/pos/offline-local-queue.ts`; `lib/pos/__tests__/offline-local-queue.test.ts`; `hooks/posHooks/useOfflineSync.ts`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Local device migration only in this package. Keep recoverable old data until the new store is verified; never clear uncertain events.

**Security / controls:** Tenant/device separation, bounded retention and safe recovery export. Do not claim storage survives browser eviction or disk loss; define those supported-device limits.

**Verification:** V02 focused queue tests plus real-browser multi-tab transactions and restart/quota migration tests. N successful enqueue acknowledgements must correspond to N durable unique events.

**Rollout / release gate:** G1 offline durability; production replay stays disabled pending R32.

**Blocker / assumption:** Supported browser/device matrix and storage/eviction policy require product decision D03.

**Definition of done:** Concurrent capture, corrupt storage and interrupted migration cannot silently lose acknowledged events; recovery limitations are visible to operators.

### R05 — Recover interrupted sync and reconcile uncertain outcomes

**Lane:** Foundations | **Original package:** W02 | **Priority:** P0 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Offline/distributed-systems engineer. **Reviewer:** Payments and QA leads. **Hard predecessors:** R04. **Traceability:** F04, CAP01, CAP23.

**Objective / outcome:** Recover in-flight events after restart without duplicate economic effects.

**Current state:** Persisted SYNCING events were excluded from pending replay after reload; transport errors did not reliably return them to recoverable state.

**Execution:**

1. Define persisted attempts, bounded leases, retry eligibility and server outcome lookup using the original event identity.
2. Handle lost responses, timeout after commit, tab termination, expired lease, reordering, duplicate replay and revoked-device conflict explicitly.
3. Expose pending, uncertain, rejected and resolved states with operator recovery and redacted diagnostics.

**Impacted paths / modules:** `hooks/posHooks/useOfflineSync.ts`; `lib/pos/offline-local-queue.ts`; `services/pos/offline-sync.service.ts`; `components`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Version queue state transitions alongside R04 migration. Retain attempt evidence until server resolution is confirmed.

**Security / controls:** Retry transport safely; never create a replacement payment or sale identity because an acknowledgement was lost. External payment finality remains provider-owned.

**Verification:** V02, V11; kill browser after send and after server commit, then restart. Assert eventual classified resolution and one server sale/stock/journal effect.

**Rollout / release gate:** G1 replay recovery and later G4 offline pilot.

**Blocker / assumption:** Requires a stable server idempotency/outcome contract and accessible failure-injection environment.

**Definition of done:** No event remains permanently stranded solely because it was SYNCING at restart; duplicate/uncertain responses cannot multiply effects.

### R06 — Correct fiscal boundaries and general-ledger balances

**Lane:** Foundations | **Original package:** W04 | **Priority:** P1 | **Indicative effort:** M (5–8 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Accounting engineer. **Reviewer:** Independent accountant. **Hard predecessors:** R02. **Traceability:** F08, F09, CAP12.

**Objective / outcome:** Make fiscal periods and opening/movement/closing balances economically correct.

**Current state:** A June 15 fiscal-year start generated a June 1 period; a range ledger balance omitted the opening 100 and showed 25 after a 25 movement.

**Execution:**

1. Choose whether partial-month fiscal years are supported and clip intervals or reject unsupported inputs consistently.
2. Calculate approved opening balances before the requested range and distinguish period movement from closing balance.
3. Exercise year boundaries, inclusive/exclusive timestamps, adjustments, multiple currencies and pagination independent of totals.

**Impacted paths / modules:** `services/accounting/periods.service.ts`; `services/accounting/financial-statements.service.ts`; `services/accounting/__tests__/periods.service.test.ts`; `actions/accounting`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Read-only scan existing fiscal intervals first; repair anomalous populated periods only through R09 with posting references preserved.

**Security / controls:** Explicit business timezone, rate policy and permissions; period display must match posting eligibility.

**Verification:** V02, V03, V08, V14; fixtures show opening 100 + movement 25 = closing 125, and no generated interval precedes or exceeds its fiscal year.

**Rollout / release gate:** G1 accounting reports and calendar invariants.

**Blocker / assumption:** Partial fiscal-year policy and year-end carry-forward treatment need accounting sign-off.

**Definition of done:** Period bounds are valid and opening/movement/closing tie to independently selected journal populations.

### R07 — Unify period close, assurance, invalidation and certified exports

**Lane:** Foundations | **Original package:** W04 | **Priority:** P0 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Accounting/assurance lead. **Reviewer:** Controller and QA. **Hard predecessors:** R03, R06. **Traceability:** F06, CAP13, CAP27.

**Objective / outcome:** Make close state accurately reflect source readiness and supported assurance meaning.

**Current state:** A synthetic BLOCKED inventory finding did not prevent period CLOSED; certified exports had a separate gate and posting/close locks had improved independently.

**Execution:**

1. Define lock-only versus qualified close and the exact source-readiness contract for each enabled module.
2. Use one service-owned eligibility decision under concurrency-safe locks; recheck readiness at transition time.
3. Link evidence versions to close/export; invalidate stale packs after corrections and permission changes; provide blocked and reopen recovery flows.

**Impacted paths / modules:** `services/accounting/periods.service.ts`; `services/accounting/journal-close-invalidation.service.ts`; `services/assurance`; `services/end-of-day-close`; `components`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Preserve prior close evidence and append supersession/invalidation records. Inventory already CLOSED periods before changing semantics.

**Security / controls:** Maker-checker, tenant scope, qualified disclosure and current access at export. Do not imply certification merely because a period is locked.

**Verification:** V02, V08, V14 and PostgreSQL posting-versus-close races; each material source blocker must block qualified close and stale export while legitimate lock-only behavior remains explicit.

**Rollout / release gate:** G1 close truth; G2 requires all in-scope source lifecycles.

**Blocker / assumption:** Controller must approve readiness obligations and any justified, audited exception policy; unresolved blocking evidence cannot be hidden.

**Definition of done:** Close, reopen, correction and export share documented semantics and pass concurrent/failure-path tests.

### R08 — Strengthen database integrity and records retention

**Lane:** Foundations | **Original package:** W05 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Database engineer. **Reviewer:** AppSec, records owner and accountant. **Hard predecessors:** R03. **Traceability:** F10, CAP12, CAP21, CAP28.

**Objective / outcome:** Protect posted evidence and tenant-consistent references at the appropriate database boundary.

**Current state:** Local catalog showed 211 models, 87 matching migration checksums, 55 noninternal triggers and 147 CHECK constraints; older ledger paths lacked general immutability defenses. Full drift and retention were unverified.

**Execution:**

1. Inventory all writers, privileges, correction transitions, cascade paths and same-tenant reference invariants using the 211-model ownership register.
2. Add targeted posted-evidence protections and composite constraints after orphan scans; prove valid application transitions before enforcement.
3. Complete type/default/index/constraint/privilege drift checks and a retention/legal-hold matrix, including HRIS documents, media, logs and device evidence.

**Impacted paths / modules:** `prisma/schema.prisma`; `prisma/migrations`; `services/accounting`; `services/hris`; `services/security`; `what-next/platform-correctness-audit/2026-09-30-run-01/model-ownership-register.csv`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Use expand/validate/enforce migrations and measured lock budgets; backfill only approved missing references. Preserve originals and legal holds; no blanket deletion or ledger rewrite.

**Security / controls:** Least privilege and adversarial direct-SQL tests; separate deployment role from application role; retention policy requires qualified ownership.

**Verification:** V01 plus disposable PostgreSQL negative writes, valid correction paths, fresh replay and populated upgrade. Compare catalog, privileges and constraints before/after.

**Rollout / release gate:** G2 database integrity; schema rollout only after upgrade and recovery evidence.

**Blocker / assumption:** Production role/catalog access, retention policy and legacy orphan assessment are required before production enforcement.

**Definition of done:** Illegal writes are rejected, legitimate workflows pass, tenancy and retention rules are documented and migration behavior is demonstrated.

### R09 — Assess and correct historical data without rewriting evidence

**Lane:** Verification and hardening | **Original package:** W01 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Data/accounting remediation lead. **Reviewer:** Independent accountant and release owner. **Hard predecessors:** R02, R03, R06, R08. **Traceability:** F01, F02, F07, F08, F09, F10, CAP12, CAP13.

**Objective / outcome:** Determine whether past facts are affected and repair only confirmed defects through reviewable, reversible procedures.

**Current state:** Local read-only samples mostly tied out; 12 non-unit FX lines showed no stored conversion mismatch and four posted/reversed journals lacked postingBatchId. These observations do not establish production impact or authorized repair.

**Execution:**

1. Run bounded read-only scans by tenant/currency/source/period with denominators, expected totals and provenance. Separate fixture artifacts from genuine anomalies.
2. Prepare a dry-run manifest with affected IDs in restricted storage, proposed append-only corrections, impact on reports/tax/close and before/after totals.
3. Rehearse on a restored disposable copy; approve each real repair batch, checkpoint/resume safely, invalidate/rebuild derived snapshots and independently reconcile results.

**Impacted paths / modules:** `services/accounting`; `prisma/migrations`; `scripts`; `services/analytics`; `services/assurance`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Potential historical repair is explicitly conditional on discovered impact. Original journals and statutory evidence stay intact; restricted manifests may contain sensitive IDs and must not enter public reports.

**Security / controls:** Two-person financial approval, dry-run first, least privilege, idempotency and stop-on-mismatch; no automated mass correction from a synthetic repro alone.

**Verification:** Restricted dry-run totals, replay-once/replay-twice invariance, failure-resume and independent subledger/GL/close comparisons on a restored environment.

**Rollout / release gate:** G3 data-impact disposition: verified no impact, approved restriction, or completed reconciled repair for each release cohort.

**Blocker / assumption:** Actual affected-data population and authorized tenant access are unknown; effort excludes potentially large repair operations.

**Definition of done:** Each suspected anomaly has an evidence-backed disposition; any approved correction is traceable and all affected reports are rebuilt with versions.

### R10 — Prove access, tenant isolation and privacy across entry points

**Lane:** Foundations | **Original package:** W05 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Application security engineer. **Reviewer:** Privacy and domain owners. **Hard predecessors:** R00, R01. **Traceability:** F10, CAP21, CAP15, CAP25.

**Objective / outcome:** Prove users, workers and delegated actors can access only authorized tenant and effective-role data.

**Current state:** Protected actions, fresh authentication and effective HR scopes exist; the audit did not establish full adversarial or retention execution.

**Execution:**

1. Build a role/tenant/module/action matrix for browser routes, actions, APIs, exports, uploads, workers and delegated accountant access.
2. Exercise revoked sessions/grants, same-user different tenant, historical manager scope, stale signed links, bulk APIs and aggregate/drill-through leakage.
3. Resolve findings in their owning boundary and retain safe error/redaction behavior; coordinate data retention with R08.

**Impacted paths / modules:** `services/security`; `services/hris`; `services/modules`; `services/agents`; `actions`; `app`; `lib/security`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Synthetic multi-tenant fixtures only by default. Do not copy payroll/customer records into test evidence.

**Security / controls:** Deny by default, current server-derived authority, least privilege, fresh auth for sensitive changes and auditable delegation.

**Verification:** V02 including tenant-boundary and module-admission suites; negative browser/API/worker cases and export redaction checks using at least two tenants and conflicting roles.

**Rollout / release gate:** G2 access/privacy matrix complete for release scope; critical bypasses block all affected cohorts.

**Blocker / assumption:** An approved role/scope matrix and supported external entry-point inventory are required.

**Definition of done:** Every public or delegated entry point has positive and negative authorization evidence and no unresolved critical tenant/privacy bypass.

### R11 — Validate master data, onboarding, imports and media lifecycle

**Lane:** Domain implementation | **Original package:** W07 | **Priority:** P1 | **Indicative effort:** M (5–8 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Catalog/onboarding engineer. **Reviewer:** Operations and privacy owners. **Hard predecessors:** R01, R10. **Traceability:** CAP26.

**Objective / outcome:** Ensure transactional workflows start from valid, tenant-owned and traceable master data.

**Current state:** Item, unit, tax, category, location, media and history services are represented; complete import, privacy and performance workflows were not proved.

**Execution:**

1. Validate setup completeness, unique external identities, versioned tax/unit references and location ownership before admitting transactions.
2. Exercise import preview, duplicate/retry, partial invalid rows and interrupted processing; preserve rejected-row evidence without silently dropping accepted records.
3. Verify upload authorization, file validation, expiring access, retention/legal holds and history/redaction.

**Impacted paths / modules:** `services/item`; `services/unit`; `services/tax-rate`; `services/location`; `services/media`; `services/history`; `services/onboarding`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Imports require explicit dry-run and row-level outcome manifest; historic references remain valid when master data is edited or deactivated.

**Security / controls:** Tenant-derived references, restricted media, safe file handling and immutable transaction snapshots of required master attributes.

**Verification:** Focused service/action suites and browser setup/import tests; duplicate imports do not duplicate items; invalid references cannot cross tenants.

**Rollout / release gate:** G2 onboarding and master-data readiness for the chosen cohort.

**Blocker / assumption:** Import formats, allowed file types and tenant starting-data quality need bounded product decisions.

**Definition of done:** A new tenant can reach a valid operational configuration and reconcile every import row to accepted/rejected status.

### R12 — Prove online POS, inventory and end-of-day control

**Lane:** Domain implementation | **Original package:** W07 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** POS/inventory lead. **Reviewer:** Operations controller and QA. **Hard predecessors:** R03, R07, R08, R11. **Traceability:** F02, F06, CAP02, CAP05, CAP27.

**Objective / outcome:** Demonstrate complete sale, stock, shift and daily-close conservation under concurrency and correction.

**Current state:** Commerce tests and 541 local stock tie-outs support a substantial implementation; authenticated final journeys and database races remain unproved.

**Execution:**

1. Run shift open, sale, stock issue, tender, return/disposition, refund status, drawer count and daily-close flows.
2. Exercise reservations, oversell races, transfer dispatch/receipt, counts, losses, backdated movements, costing and cancel/retry behavior.
3. Tie daily cash and leakage exceptions to owners, evidence and period-close obligations without hiding unresolved variances.

**Impacted paths / modules:** `services/pos`; `services/inventory`; `services/end-of-day-close`; `services/leakage`; `services/controls`; `services/evidence`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Use a finalized synthetic fixture with independently computed quantities, valuation, tender and journals; production adjustments require their normal approvals.

**Security / controls:** One stock writer, stable sale identity, approved loss/write-off and scoped branch access. Cash count is distinct from provider-confirmed cash.

**Verification:** V02, V05–V09 and V11; PostgreSQL simultaneous last-unit sales, repeated return and transfer failure tests; browser shift-to-close walkthrough.

**Rollout / release gate:** G2 online operations: no unexplained stock/cash/GL mismatch or orphan transaction.

**Blocker / assumption:** Disposition policies, inventory costing and permitted negative stock must be explicit for the selected cohort.

**Definition of done:** Every supported sale/stock/daily-close path has final-state tie-outs, exception ownership and tested recovery.

### R13 — Complete order-to-cash, customer credit and returns evidence

**Lane:** Domain implementation | **Original package:** W07 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Order-to-cash engineer. **Reviewer:** Credit controller and QA. **Hard predecessors:** R03, R08, R10. **Traceability:** F02, F13, CAP03, CAP04.

**Objective / outcome:** Prove fulfillment, receivables, settlement and corrections agree with inventory, cash and the ledger.

**Current state:** Implemented order/customer flows lack completed source-to-cash evidence; customer-settlement reversal readiness remains an unresolved report-gate clause.

**Execution:**

1. Exercise order approval, partial fulfillment, delivery, invoice/credit, customer settlement allocation and overdue balance.
2. Prove partial returns, customer credits, failed refund recovery, settlement reversal and unapplied amounts preserve obligations.
3. Resolve the settlement compensating-reversal clause with explicit behavior evidence, including closed-period and duplicate cases.

**Impacted paths / modules:** `services/order-to-cash`; `services/customer`; `services/pos`; `services/accounting`; `scripts/report-trust-export-gate.js`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Preserve invoice/credit identity and source links; backfill only after R09 impact review. Do not write off balances to force a tie-out.

**Security / controls:** Credit limits, approval separation, tenant/customer ownership and current permissions at statement generation.

**Verification:** V02, V08, V09, V14; finalized order-to-cash fixtures, partial settlement and reversal races, independent AR and GL aging totals.

**Rollout / release gate:** G2 receivables and returns ready; external statement access additionally needs R22.

**Blocker / assumption:** Customer credit, return disposition and refund rail rules require a documented operating policy.

**Definition of done:** Delivered, returned, billed, settled and outstanding amounts reconcile with clear exception and correction histories.

### R14 — Complete purchasing, three-way match and AP finalization

**Lane:** Domain implementation | **Original package:** W07 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Purchasing/AP engineer. **Reviewer:** Procurement and AP controller. **Hard predecessors:** R03, R08, R11. **Traceability:** F02, CAP07, CAP08.

**Objective / outcome:** Prove supplier commitment through receipt, invoice, payment allocation and correction.

**Current state:** Matching, maker-checker and correction infrastructure exists; the local audit found 24 consistent draft allocations and no posted AP lifecycle sample.

**Execution:**

1. Run PO approval, supplier acknowledgement, partial/over receipt, invoice matching, approved exceptions, credit/return and payment allocation.
2. Prove duplicate supplier document detection, destination changes, price/tax variance, partial payment and cancellation after receipt.
3. Reconcile goods received not invoiced, stock valuation, AP, cash and source journals; link unmatched exceptions to close readiness.

**Impacted paths / modules:** `services/supplier`; `services/purchase-order`; `services/purchasing`; `services/inventory`; `services/accounting`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Create final-state isolated fixtures rather than upgrading arbitrary drafts. Preserve supplier-document identity and allocation lineage.

**Security / controls:** Maker-checker, verified bank/destination changes, match tolerances and tenant/supplier/currency consistency.

**Verification:** V02, V05–V10; PostgreSQL approval/payment allocation races, repeated receipt and partial return fixtures with independent AP/stock/GL totals.

**Rollout / release gate:** G2 AP: complete posted and corrected lifecycle; live payment readiness additionally requires R19.

**Blocker / assumption:** Tolerance, supplier-risk and payment-destination operating policies are needed.

**Definition of done:** Every receipt, invoice, credit and payment allocation reconciles; no over-allocation, duplicate liability or unexplained valuation difference.

### R15 — Prove payment finality, reconciliation and suspense clearance

**Lane:** Domain implementation | **Original package:** W07 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Payments/reconciliation lead. **Reviewer:** Treasury controller and QA. **Hard predecessors:** R03, R08, R10. **Traceability:** F01, CAP10, CAP11.

**Objective / outcome:** Separate initiated payment, verified settlement, cash movement and reconciled evidence throughout recovery.

**Current state:** Provider authority, HMAC, imports and reconciliation boundaries exist; all 24 sampled reconciliation runs were DRAFT with no sign-off/certificate.

**Execution:**

1. Exercise cash/bank/mobile-money initiation, pending/failed/uncertain states, authenticated callbacks, imports, matching and explicit suspense.
2. Test gross/net/fee and multi-currency settlement, split/merged/partial match, duplicated statements, reversals and conflicting evidence.
3. Run maker-checker sign-off/certificate, source correction and certificate invalidation; age exceptions with assigned owners.

**Impacted paths / modules:** `services/payments`; `services/reconciliation`; `services/accounting`; `services/pos`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Use synthetic statements and provider fixtures for local proof. Preserve immutable raw-evidence hashes, parser version and normalized lineage.

**Security / controls:** Signature verification, replay defense, least-privilege provider accounts, no success inference from redirect/UI and no silent suspense write-off.

**Verification:** V02, V08, V09; final signed reconciliation with independent opening + movements = closing, matching totals and fee/FX postings; concurrent duplicate callback and sign-off tests.

**Rollout / release gate:** G2 local cash/reconciliation truth; real rail claims require R19 acceptance.

**Blocker / assumption:** Rail-specific statement semantics and qualification environment are unresolved until R19.

**Definition of done:** Money states and reconciled balances are explainable by verified evidence; every unmatched or uncertain amount remains visible and owned.

### R16 — Prove HRIS source records, effective scope and employee service

**Lane:** Domain implementation | **Original package:** W07 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** HRIS engineer. **Reviewer:** HR operations and privacy owner. **Hard predecessors:** R01, R08, R10. **Traceability:** F10, F13, CAP15, CAP16.

**Objective / outcome:** Deliver reliable employee lifecycle and payroll-ready source inputs with privacy by role and effective date.

**Current state:** Employee, organization, contract, compensation, document, attendance/leave and self-service services exist; complete browser/retention and historical-scope evidence is absent.

**Execution:**

1. Run joiner, contract change, transfer, manager change, compensation approval, leave/attendance correction and leaver journeys.
2. Validate effective-dated manager access and source snapshots; gate payroll inputs on missing/overlapping contracts, unapproved compensation and incomplete time evidence.
3. Prove employee document/payslip access, redaction, payment-destination change approval and legal-hold behavior.

**Impacted paths / modules:** `services/hris`; `services/payroll`; `actions`; `components`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Rehearse source-data backfill with validation and reconciliation; frozen payroll snapshots must not change when current HR data changes.

**Security / controls:** No broad manager fallback for historical access; restrict compensation/document fields and sensitive exports; segregation of duties.

**Verification:** V02, V12, V13; existing HRIS suites plus multi-tenant effective-date, source readiness, correction and self-service browser cases.

**Rollout / release gate:** G2 HRIS source readiness and privacy; payroll-specific qualification is R17/R18.

**Blocker / assumption:** HR lifecycle, retention, leave and attendance policies require the relevant country/employer review.

**Definition of done:** HR changes are effective-dated, approved where needed and traceable; payroll consumes an immutable, validated source snapshot.

### R17 — Complete payroll calculation, payment, declaration and close proof

**Lane:** Domain implementation | **Original package:** W07 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Payroll engineer. **Reviewer:** Payroll expert and accountant. **Hard predecessors:** R03, R07, R08, R15, R16. **Traceability:** F11, F13, CAP17, CAP18.

**Objective / outcome:** Demonstrate an entire finalized payroll lifecycle with immutable inputs and balanced obligations.

**Current state:** Substantial transition/snapshot controls exist, but sampled payroll runs were all DRAFT and country/legacy test-contract gaps remain.

**Execution:**

1. Run input readiness, calculation, review, approval, frozen payslips, payment preparation/allocation, declaration evidence and accounting close.
2. Exercise corrections after approval/payment, retroactive inputs, rejected/reversed payouts, employee balances and re-opened reconciliation.
3. Independently tie gross, deductions, employer charges, net pay, declarations, clearing accounts and GL; record rule-version provenance.

**Impacted paths / modules:** `services/payroll`; `services/hris`; `services/reconciliation`; `services/accounting`; `services/regulatory`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Use synthetic staff and reviewed golden cases; production payroll corrections are append-only/versioned and require normal approvals.

**Security / controls:** Maker-checker, least-privilege payslips and destination evidence; do not change draft country status to unblock calculation or submission.

**Verification:** V02, V08, V09, V12, V13; current PostgreSQL transition retries, frozen snapshots, duplicate approval/payout and final register/subledger tie-outs.

**Rollout / release gate:** G2 technical payroll proof; production payroll/declaration requires exact R18 capability and R19 rail/authority evidence.

**Blocker / assumption:** Qualified country rules and accepted payment/declaration adapters remain external dependencies. Local fixtures can run while review proceeds.

**Definition of done:** Finalized synthetic payroll is internally reconciled and recoverable; enabled production scope is no broader than separately qualified country/provider support.

### R18 — Qualify versioned country, payroll, tax and fiscal capabilities

**Lane:** External qualification | **Original package:** W09 | **Priority:** P0 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Country-pack lead. **Reviewer:** Independent qualified accountant, payroll/tax expert. **Hard predecessors:** R00. **Traceability:** F11, CAP19.

**Objective / outcome:** Publish only capabilities backed by current provenance, reviewed rules and bounded operational support.

**Current state:** CM is the registered country. CM-2026.1 PUBLISHED is not blanket qualification: CNPS is SUPPORTED_DRAFT, IRPP lacks production calculation support and e-invoicing needs review.

**Execution:**

1. Refresh official 2026 sources and record effective dates, versions, applicability and reviewer decisions without presuming existing rates are wrong.
2. Separate accounting, CNPS, IRPP, labor inputs, fiscal numbering/e-invoice and declaration capabilities; build expert-reviewed boundary and exception cases.
3. Version approved calculations/forms, retain historical rule selection, disclose blocked capabilities and define the process for later country expansion.

**Impacted paths / modules:** `services/regulatory`; `services/compliance`; `services/payroll`; `config`; `what-next/platform-correctness-audit/2026-09-30-run-01/external-source-register.md`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Rule-version migrations must not retroactively reinterpret already approved payroll/fiscal documents. Retain provenance and superseded rules.

**Security / controls:** Qualified independent review with dated sources and evidence; no self-certification or blanket OHADA-wide support claim.

**Verification:** Versioned golden calculations, rounding/boundary/retroactive cases and capability refusal tests. External authority acceptance is recorded separately in R19.

**Rollout / release gate:** G3 by country and capability: only explicitly reviewed statuses advance.

**Blocker / assumption:** Named qualified reviewers, official source access and authority specifications. Engineering effort excludes expert/authority waiting time.

**Definition of done:** Each claimed country capability has dated provenance, approved cases, explicit limits and an accountable support owner; others remain visibly restricted.

### R19 — Qualify payment, billing and authority integrations

**Lane:** External qualification | **Original package:** W09 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Integration lead. **Reviewer:** Treasury, compliance and security owners. **Hard predecessors:** R00. **Traceability:** F11, CAP10, CAP18, CAP19, CAP22.

**Objective / outcome:** Obtain explicit evidence for each external rail, billing provider and regulatory adapter claimed by the release.

**Current state:** Local authority and signature boundaries exist; no current provider/authority sandbox acceptance or deployed receipts were proved by the audit.

**Execution:**

1. Build an integration matrix of country, provider, account, capability, environment, limits, credentials owner and acceptance evidence.
2. Prepare contract tests and sandbox scenarios early; execute only with the required access and authority, including timeout-after-accept, duplicate callbacks, signature rotation and rejection.
3. Reconcile external accepted/settled/submitted outcomes to R15/R17/R21 and distinguish test acceptance from live qualification.

**Impacted paths / modules:** `services/payments`; `services/reconciliation`; `services/compliance`; `services/regulatory`; `services/modules`; `scripts`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Provider/authority payloads and secrets belong in restricted evidence storage; sanitize reports. Sandbox effects must be bounded and understood.

**Security / controls:** Explicit authorization before external submissions or live financial effects, verified signatures, idempotency, revocation and credential rotation.

**Verification:** Provider-specific contract suite, approved sandbox receipts and reconciliation; deployment checks include endpoints, schedules, access and alerts.

**Rollout / release gate:** G3 per integration. Contract preparation can start now; final acceptance depends on the corresponding R15/R17/R21 workflow.

**Blocker / assumption:** Accounts, sandbox availability, provider/authority permission and external acceptance lead time are not known.

**Definition of done:** Every enabled integration has supported-version evidence, failure recovery, a named operator and an honest sandbox/live status; unavailable ones stay disabled.

### R20 — Complete expenses, accruals and year-end accounting workflow

**Lane:** Domain implementation | **Original package:** W07 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Accounting product engineer. **Reviewer:** Independent accountant. **Hard predecessors:** R02, R03, R06, R07. **Traceability:** F01, F08, F09, F12, CAP14.

**Objective / outcome:** Define and prove the professional accounting tasks required by the chosen customers beyond daily transactions.

**Current state:** Expense and journal structures exist; automatic accruals, year-end carry-forward and a full fixed-asset subledger were not established.

**Execution:**

1. Confirm supported expense approval, accrual/prepayment, periodic reversal, adjusting entry, closing and opening-balance workflows.
2. Implement missing essential behavior in existing owners; document supported accountant-controlled manual steps where product accepts them.
3. Tie year-end opening/closing, retained result and cash-flow classifications to the approved accounting policy; treat asset automation as R35 unless mandatory for launch.

**Impacted paths / modules:** `services/finance`; `services/accounting`; `prisma/schema.prisma`; `components`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Potential schedule/classification additions require versioned migrations; preserve source documents, posted entries and prior fiscal reports.

**Security / controls:** Maker-checker on material adjustments, controlled period access, source evidence and qualified accounting policy.

**Verification:** V01–V03, V08, V14; independent expense/accrual, reversal, year-end and next-year opening fixtures including FX and closed-period attempts.

**Rollout / release gate:** G2 professional accounting scope explicitly accepted; unsupported automation is disclosed.

**Blocker / assumption:** Professional-suite definition, year-end policy and need for automated assets are decisions D02/D06.

**Definition of done:** Every promised expense/year-end task has a supported, tested workflow and independently balanced output.

### R21 — Verify entitlement, deactivation, billing and package behavior

**Lane:** Domain implementation | **Original package:** W07 | **Priority:** P1 | **Indicative effort:** M (5–8 combined engineering/QA person-days; low-confidence planning band).

**Owner:** SaaS platform engineer. **Reviewer:** Billing/product operations. **Hard predecessors:** R01, R10. **Traceability:** CAP22.

**Objective / outcome:** Align sold capabilities, server admission, module changes and safe completion of existing obligations.

**Current state:** Control-plane admission and completion/correction policies are implemented; commercial provider execution was not verified.

**Execution:**

1. Exercise activate, upgrade, downgrade, suspend, resume and deactivation across UI/action/API/worker entry points.
2. Prove stop-new-work does not strand already admitted payments, payroll, corrections or export/evidence obligations.
3. Test duplicate/out-of-order provider billing events, provisioning reconciliation and truthful capability/pricing disclosure; use R19 for external acceptance.

**Impacted paths / modules:** `services/modules`; `services/operating-access`; `services/governance`; `components`; `app`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Version package/grant decisions and keep an audit trail of effective entitlement changes; do not erase obligations on deactivation.

**Security / controls:** Server-side admission locks, tenant scope, provider authority and separation of billing fact from entitlement policy.

**Verification:** V02 with module-entitlement/module-admission suites; browser access-state and worker completion tests under concurrent suspension.

**Rollout / release gate:** G2 internal packaging proof; live billing gate is R19.

**Blocker / assumption:** Initial package catalog, grace policy and customer support commitments require product approval.

**Definition of done:** Every paid capability maps to enforced scope and disclosed availability; account changes cannot silently abandon financial obligations.

### R22 — Complete customer/accountant access, consent and delivery evidence

**Lane:** Domain implementation | **Original package:** W07 | **Priority:** P1 | **Indicative effort:** M (5–8 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Customer/network engineer. **Reviewer:** Privacy and accountant-access owners. **Hard predecessors:** R10, R13, R21. **Traceability:** F13, CAP25, CAP13.

**Objective / outcome:** Prove scoped external statements, accountant delegation and consented referral/delivery workflows.

**Current state:** Signed access, consent and communication foundations exist, but two report-trust launch clauses remain unresolved.

**Execution:**

1. Exercise statement generation, signed access, expiry/revocation, recipient scope and accountant grant changes.
2. Verify referral attribution only with required consent, withdrawal and duplicate handling; ensure delivery status follows provider evidence.
3. Resolve signed-statement and consented-referral gate obligations by behavior, not by adding a matching source-code phrase.

**Impacted paths / modules:** `services/customer`; `services/referrals`; `services/communication`; `services/accounting`; `scripts/report-trust-export-gate.js`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Store only necessary consent and delivery evidence; retain financial history separately from optional marketing consent.

**Security / controls:** No unauthorized contact; scoped expiring links, current grants, redaction and privacy-reviewed retention.

**Verification:** V02, V14; multi-tenant revoked-link and changed-grant tests; use local delivery stubs until authorized sandbox/recipient tests are available.

**Rollout / release gate:** G2 statement/delegation/referral scope; optional referral launch may remain restricted independently of financial reporting.

**Blocker / assumption:** External delivery evidence requires authorized test recipients/provider access; referral activation depends on consent policy.

**Definition of done:** Access cannot outlive its authority; every enabled referral/delivery action has consent and evidence or a clearly blocked state.

### R23 — Prove event, outbox and worker recovery in deployment

**Lane:** Verification and hardening | **Original package:** W08 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Backend/SRE engineer. **Reviewer:** Domain owners and operations. **Hard predecessors:** R01, R10. **Traceability:** F14, CAP23, CAP28.

**Objective / outcome:** Demonstrate reliable asynchronous completion with bounded retry, leases, dead letters and observable ownership.

**Current state:** Lease/retry/dead-letter logic exists; deployed schedules, recovery and alert delivery were not verified.

**Execution:**

1. Inventory each worker/outbox producer, event version, schedule, authorization, ordering and idempotency contract.
2. Inject crash-before/after-side-effect, lease expiry, duplicate delivery, poison event and provider outage; prove recovery without multiplying effects.
3. Deploy to the controlled validation environment with lag/dead-letter alerts, redacted traces, rate limits, backpressure and operator recovery runbooks.

**Impacted paths / modules:** `services/events`; `services/communication`; `services/compliance`; `services/agents`; `scripts`; `.github/workflows`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Preserve pending work during deploy/rollback and version event payloads compatibly; quarantine poison records instead of deleting them.

**Security / controls:** Least-privilege workers, tenant-derived context, authenticated schedules, bounded retries and protected operational replay.

**Verification:** Focused worker suites plus real PostgreSQL process-kill/lease tests; measured backlog recovery and actual alert receipt in the approved test environment.

**Rollout / release gate:** G2 async correctness and G3 deployed-operational evidence.

**Blocker / assumption:** Known deployment topology, worker scheduling owner and SLO decisions D07.

**Definition of done:** Every deployed worker has demonstrated scheduling, idempotent recovery, bounded failure behavior and an operator-owned alert path.

### R24 — Validate complete EN/FR, accessible and mobile user journeys

**Lane:** Verification and hardening | **Original package:** W08 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Frontend/workflow engineer. **Reviewer:** Accessibility specialist and domain users. **Hard predecessors:** R01, R10, R11. **Traceability:** F04, F06, F13, CAP29.

**Objective / outcome:** Make corrected service behavior understandable and operable by each intended persona.

**Current state:** Routes, shared components and state contracts exist; the audit browser connection failed and no current authenticated/a11y/mobile proof was obtained.

**Execution:**

1. Create a route/persona/locale/device matrix; verify loading, empty, error, denied, partial, stale, offline, uncertain and recovery states.
2. Check keyboard focus/order, screen-reader labels/announcements, contrast, zoom, touch targets, dense tables and EN/FR currency/date/time wording.
3. Walk completed domain workflows as cashier, stock manager, purchaser, accountant, HR/payroll, employee and owner; validate corrective actions and support instructions.

**Impacted paths / modules:** `app`; `components`; `hooks`; `config/sidebar.ts`; `services/bi`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Use isolated synthetic accounts and screenshots with no personal or tenant-sensitive data.

**Security / controls:** UI must reflect server capability/permission state; do not expose implementation jargon or claim financial success from optimistic UI.

**Verification:** Real authenticated browser scenarios plus automated accessibility checks and manual keyboard/screen-reader/mobile testing; save route, role, locale, build and evidence.

**Rollout / release gate:** G2 UI shell/state checks can start early; full acceptance waits for each relevant domain package and is consolidated in R31.

**Blocker / assumption:** Running isolated application, test accounts, supported-device matrix and representative user availability.

**Definition of done:** All release-critical personas can complete and recover their workflows in supported locales/devices, with accessibility issues triaged and critical barriers closed.

### R25 — Create versioned BI metric contracts and source lineage

**Lane:** BI implementation | **Original package:** W10 | **Priority:** P1 | **Indicative effort:** M (5–8 combined engineering/QA person-days; low-confidence planning band).

**Owner:** BI/data engineer. **Reviewer:** Finance and product owners. **Hard predecessors:** R02, R03, R10. **Traceability:** F12, CAP20.

**Objective / outcome:** Provide one authoritative definition and evidence contract per released metric.

**Current state:** Provenance/freshness/redaction foundations exist, but financial-metrics.v2 explicitly reports PARTIAL and FINANCIAL_SOURCES_NOT_CONNECTED.

**Execution:**

1. Adopt the K01–K19 definitions from the audit and resolve owners, grain, source events, denomination, business timezone and as-of/known-at cutoffs.
2. Specify included statuses, returns/corrections, null/zero/empty behavior, data completeness, drill-through permissions and definition version.
3. Implement lineage and correction-driven invalidation in existing read models; add a warehouse only if measured requirements justify it.

**Impacted paths / modules:** `services/analytics`; `services/bi`; `services/snapshots`; `services/signals`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Derived snapshots may be rebuilt from authoritative facts with versioned backfill manifests; never turn a missing financial source into a fabricated zero.

**Security / controls:** Distinguish operational, posted, reconciled, certified and forecast values. Aggregate and drill-through must enforce identical tenant and scope rules.

**Verification:** Contract tests for population/grain, late correction, DST/cutoff, multi-currency, stale sources and revoked permissions; independent whole-population tie-outs.

**Rollout / release gate:** G2 semantic contract; each metric additionally waits for its own source qualification.

**Blocker / assumption:** Metric definitions and materiality tolerances need named business owners. Existing graphs/read models may be reused after current-source validation.

**Definition of done:** Every released KPI has a versioned definition, source lineage, freshness policy, owner and independent reconciliation method.

### R26 — Complete operational commerce, cash and control BI

**Lane:** BI implementation | **Original package:** W10 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** BI/product engineer. **Reviewer:** Operations, procurement and treasury. **Hard predecessors:** R12, R13, R14, R15, R23, R25. **Traceability:** F12, CAP20, CAP27.

**Objective / outcome:** Give operators reliable sales, orders, cash, stock, supplier and exception decisions.

**Current state:** Operational evidence is substantial; some reports describe original activity rather than net corrected outcomes, and deployed freshness remains unproved.

**Execution:**

1. Deliver K01/K03/K04/K05/K07/K08/K10/K11/K17 with explicit activity/correction meaning, scoped drill-through and actionable exceptions.
2. Add K06 settlement lag/fees/cash-in-transit for qualified rails only, retaining unavailable status for others.
3. Connect owner/manager/cash-command/daily-habit surfaces to these same definitions and permission-aware actions; avoid independent dashboard arithmetic.

**Impacted paths / modules:** `services/analytics`; `services/bi`; `services/cash-command`; `services/owner-war-room`; `services/manager-action-center`; `services/daily-habit`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Backfill derived views from corrected source facts with population counts, completeness and version evidence.

**Security / controls:** No unsupported employee scoring; cash counted, cash recorded and cash settled remain distinct. Supplier OTIF requires promised-date and accepted-receipt definitions.

**Verification:** Golden operational dataset, correction/late-event/freshness and permission tests; dashboard totals equal independent source queries and actionable rows resolve correctly.

**Rollout / release gate:** G2 operational BI; rail-specific K06 needs R19. Missing supplier/date sources block that metric alone.

**Blocker / assumption:** Supplier promised dates, exception aging SLAs and operational freshness thresholds must be defined.

**Definition of done:** Each enabled operational KPI ties to source facts and an authorized action; stale or incomplete evidence is visibly qualified.

### R27 — Complete financial statements, margin, aging and cash-flow BI

**Lane:** BI implementation | **Original package:** W10 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Financial reporting engineer. **Reviewer:** Independent accountant. **Hard predecessors:** R07, R12, R13, R14, R15, R20, R25. **Traceability:** F01, F09, F12, CAP12, CAP20.

**Objective / outcome:** Deliver K02/K12/K13/K14 from corrected economic facts with accountant-verifiable results.

**Current state:** Statement FX/opening defects and disconnected financial sources prevent reliable complete professional financial analytics.

**Execution:**

1. Implement net realized sales, frozen COGS and margin including disposition-aware returns; connect AR/AP aging and working capital.
2. Complete trial balance, income statement and balance sheet using approved functional-currency and close/as-of rules.
3. Define and implement the supported cash-flow method/classifications, beginning-to-ending cash bridge and noncash/FX reconciliation; retain limitations where sources are incomplete.

**Impacted paths / modules:** `services/accounting/financial-statements.service.ts`; `services/analytics/financial-reports.service.ts`; `services/analytics/financial-analytics.service.ts`; `services/bi`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Rebuild financial snapshots only after R09 disposition for affected populations; retain old report versions and source/definition lineage.

**Security / controls:** Independent accountant review; no mixed nominal currencies, current catalog cost substitution, or certification labels without qualified close evidence.

**Verification:** Independent accountant-prepared dataset: trial balance debits=credits, assets=liabilities+equity, AR/AP=subledgers, opening cash+cash movements+defined FX bridge=closing cash, margin reflects corrections.

**Rollout / release gate:** G2 financial BI plus R09 population disposition and applicable country/close qualification for production claims.

**Blocker / assumption:** Cash-flow classification/method, account mappings and source completeness require accounting decisions.

**Definition of done:** Financial reports reconcile independently across statements, subledgers and source documents; incomplete populations remain blocked or clearly qualified.

### R28 — Complete privacy-scoped workforce and payroll BI

**Lane:** BI implementation | **Original package:** W10 | **Priority:** P1 | **Indicative effort:** M (5–8 combined engineering/QA person-days; low-confidence planning band).

**Owner:** HR analytics engineer. **Reviewer:** HR, payroll and privacy owners. **Hard predecessors:** R16, R17, R25. **Traceability:** F12, CAP16, CAP17, CAP20.

**Objective / outcome:** Deliver K15/K16 with effective-date definitions and appropriately restricted detail.

**Current state:** Payroll analytics and HRIS records exist, but full metric definitions, finalized-population evidence and privacy validation remain partial.

**Execution:**

1. Define headcount/FTE inclusion, approved payroll cost, employer charges, attendance/leave denominators and effective organization scope.
2. Separate draft estimate, approved payroll, paid amount and accounting cost; include corrections and historical assignment changes.
3. Apply small-population suppression or other approved privacy controls, export restrictions and drill-through role checks.

**Impacted paths / modules:** `services/hris`; `services/payroll`; `services/analytics`; `services/bi`; `components`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Version snapshots and retain only permitted aggregates; no unnecessary employee details in broad management dashboards.

**Security / controls:** No inferred performance ranking from attendance, sales or cash variance. Historical access follows effective authorized scope.

**Verification:** Reviewed HR/payroll golden fixtures, changed-manager and small-group privacy tests; cost totals reconcile to approved payroll and GL where that label is used.

**Rollout / release gate:** G2 workforce BI; production statutory payroll cost follows R18 support.

**Blocker / assumption:** Headcount/FTE, attendance and privacy disclosure policy needs HR ownership.

**Definition of done:** Workforce metrics are defined, permission-safe and tied to the correct effective population and payroll status.

### R29 — Validate AI assistance, security posture and cost controls

**Lane:** Verification and hardening | **Original package:** W08 | **Priority:** P1 | **Indicative effort:** M (5–8 combined engineering/QA person-days; low-confidence planning band).

**Owner:** AI/AppSec engineer. **Reviewer:** Model-risk and product owner. **Hard predecessors:** R10, R21, R25. **Traceability:** CAP24, CAP21.

**Objective / outcome:** Keep assistance grounded in authorized evidence and prove resistance to unsafe tool use and cross-tenant disclosure.

**Current state:** Read-only tool risk checks, proposal hashes/expiry and activation controls exist; adversarial model evaluation and deployed cost budgets were not established.

**Execution:**

1. Test prompt injection in business documents/tool output, stale authority, forged proposal evidence, denied tools and cross-tenant retrieval.
2. Require current permissions, evidence citations, uncertainty and human-approved workflows for any supported consequential action.
3. Measure model/tool latency, error and cost; apply budgets, redaction, emergency suspension and versioned evaluation gates.

**Impacted paths / modules:** `services/agents`; `services/ai`; `services/security`; `scripts`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Use synthetic/redacted evaluation cases; record model, prompt/tool-policy versions and permitted retention.

**Security / controls:** Untrusted content cannot grant authority. Assistance cannot self-certify legal/accounting conclusions or invent final financial states.

**Verification:** Versioned adversarial evaluation corpus with required refusal/denial cases, tenant data-canary checks, audit evidence and budget-exhaustion behavior.

**Rollout / release gate:** G2 AI safety; optional AI can stay disabled without blocking core commerce if its boundaries are isolated.

**Blocker / assumption:** Enabled model/provider, use cases, quality threshold and monthly budget need explicit product decisions.

**Definition of done:** Enabled AI has no unresolved critical authorization/tool-use finding, measurable quality/cost limits and a tested suspension path.

### R30 — Rehearse recovery, refresh runbooks and measure service limits

**Lane:** Verification and hardening | **Original package:** W08 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** SRE/DevSecOps lead. **Reviewer:** Database, security and support leads. **Hard predecessors:** R01, R08, R23. **Traceability:** F14, CAP28.

**Objective / outcome:** Make deployment, backup, restore, incident response and operational capacity demonstrable for the release candidate.

**Current state:** Runbook SQL referenced User/Account/Session instead of mapped users/accounts/sessions and misstated restore history; a current full-chain restore and deployed RPO/RTO were unproved.

**Execution:**

1. Update runbooks against current mappings, deployment topology and actual prior evidence; rehearse login/session, worker, queue and financial recovery.
2. Replay the current migration chain (87 at audit time; recount at execution) fresh and as a populated upgrade; restore and verify app access plus business invariants.
3. Measure latency/error/backlog/cost under an agreed workload and test alerts, secrets rotation, rollback, backup isolation and approved RPO/RTO targets.

**Impacted paths / modules:** `docs/operations/runbooks/RUNBOOK.md`; `scripts/prisma-local-restore-rehearsal.js`; `prisma/migrations`; `.github/workflows`; `scripts`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Restore only into a verified isolated target; inspect destructive flags and credentials before executing restore scripts. Preserve backups and source environments.

**Security / controls:** Least-privilege access, sensitive-data handling, backup encryption/access and independent recovery verification; local restore is not deployed PITR proof.

**Verification:** Fresh/upgrade migration logs, measured restore with counts and selected cross-domain invariants, authentication smoke, worker catch-up and load/alert evidence against agreed targets.

**Rollout / release gate:** G3 operational readiness; unknown or missed RPO/RTO/performance targets stay open.

**Blocker / assumption:** Target environment, backup access, workload model, service objectives and incident owners are not yet supplied.

**Definition of done:** Operators can execute current runbooks, recover the exact release/data version and demonstrate agreed operational objectives.

### R31 — Assemble independent end-to-end release evidence

**Lane:** Verification and hardening | **Original package:** W07 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Release assurance lead. **Reviewer:** Independent domain reviewers. **Hard predecessors:** R04, R05, R07, R08, R10, R11, R12, R13, R14, R15, R16, R17, R20, R21, R22, R23, R24, R26, R27, R28, R29, R30. **Traceability:** F13, F14, CAP28, CAP29.

**Objective / outcome:** Prove the selected candidate as one integrated system using non-draft workflows and fresh evidence.

**Current state:** Unit and read-only aggregate evidence does not establish finalized domain operation, real database concurrency or authenticated journeys.

**Execution:**

1. Freeze an exact release candidate and migration/toolchain manifest; rerun required commands without the audit-only adapter.
2. Execute the six acceptance journeys below with synthetic fixtures, concurrent/failure cases, independent totals and browser evidence. Offline replay here remains isolated and test-authorized; the production admission pilot follows in R32.
3. Collect unresolved defects, restrictions, country/provider qualification, historical-data disposition and operator training evidence; invalidate affected proof when code changes.

**Impacted paths / modules:** `services`; `actions`; `app`; `components`; `prisma`; `scripts`; `.github/workflows`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Use known fixture denominators and independently calculated expected values; preserve raw command results and sanitized screenshots.

**Security / controls:** Builder cannot be the sole reviewer of material financial/security conclusions. A passing scanner cannot substitute for behavioral or external evidence.

**Verification:** V01–V14 plus integration/browser/restore/evaluation evidence. Critical cases include concurrent postings/close, duplicate financial events, uncertain provider result, revoked access and corrections.

**Rollout / release gate:** G3 candidate evidence assembled; final qualification and pilot decisions remain R32/R33.

**Blocker / assumption:** All listed technical packages must close for full-platform scope. A smaller candidate may only exclude a module through an explicit scope amendment with enforced restrictions.

**Definition of done:** Every in-scope promise has fresh independent acceptance evidence tied to the same candidate; no unresolved critical correctness or privacy defect.

### R32 — Run a controlled offline POS pilot and validate recovery

**Lane:** Rollout and operations | **Original package:** W06 | **Priority:** P1 | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Offline/product rollout lead. **Reviewer:** Release owner and pilot operations. **Hard predecessors:** R04, R05, R12, R15, R24, R30, R31. **Traceability:** F03, F04, F05, CAP01.

**Objective / outcome:** Qualify offline operation on the supported device, tender and fiscal scope before activation.

**Current state:** Replay is deliberately authorized only under test conditions; this is a release boundary, not a flag to remove for convenience.

**Execution:**

1. Specify explicit device enrollment, revocation, queue limits, tender policy, fiscal obligations, conflict review and support procedures.
2. Replace test-only admission only after the gate is met with scoped server-side production authorization, feature control and auditability.
3. Rehearse power/network loss, offline restart, long disconnect, revoked device, out-of-order replay, clock skew, uncertain tender and fiscal failure; reconcile pilot capture through final GL.

**Impacted paths / modules:** `services/pos/offline-sync.service.ts`; `lib/pos/offline-local-queue.ts`; `hooks/posHooks/useOfflineSync.ts`; `components`; `docs/operations`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Enroll a bounded approved cohort; preserve local pending facts and migration lineage. Rollback stops new admissions while existing uncertain work is reconciled.

**Security / controls:** No automatic offline mobile-money finality or fiscal validity claim; exact country/rail scope needs R18/R19 where applicable.

**Verification:** Real-device pilot with capture/event/server/stock/cash/ledger counts and recovery evidence. Proposed non-negotiable tolerances: zero silent loss, zero duplicate economic effects, zero unexplained tie-out mismatch.

**Rollout / release gate:** G4 offline: approved technical evidence plus applicable R18/R19 and agreed pilot duration/volume (D08).

**Blocker / assumption:** Pilot devices/users, offline business policy, country/fiscal scope and observation thresholds must be agreed before admission.

**Definition of done:** Pilot results meet agreed coverage and objectives; all events are accounted for, operators can recover exceptions, and rollback preserves pending obligations.

### R33 — Release by qualified cohort and transfer ongoing ownership

**Lane:** Rollout and operations | **Original package:** W08 | **Priority:** P1 | **Indicative effort:** M (5–8 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Release/delivery lead. **Reviewer:** Product, domain approvers and SRE. **Hard predecessors:** R09, R31. **Traceability:** F05, F11, F14, CAP28, CAP29, CAP22.

**Objective / outcome:** Activate only the reviewed capability set, then prove support and monitoring ownership.

**Current state:** No complete-platform release or production certification has been established by the audit or this planning work.

**Execution:**

1. Approve a capability-by-country/provider/tenant matrix; require R32 for offline, R18 for regulated functions and R19 for real external integrations.
2. Roll out to a bounded cohort, then expand only after agreed transaction volume, business-cycle coverage and service objectives pass.
3. Train operators, publish known limits/runbooks, assign on-call and domain owners, review incidents and conduct a post-pilot acceptance review.

**Impacted paths / modules:** `docs/operations`; `.github/workflows`; `services/modules`; `services/governance`; `app`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Deploy approved migrations and any reviewed R09 batches only under the release plan; verify post-deploy invariants and retain recoverable snapshots.

**Security / controls:** Explicit release-owner approval; restrict unsupported capabilities in server admission and product messaging. Rollback preserves completed and in-flight financial truth.

**Verification:** Candidate manifest, migration/rollback evidence, cohort smoke and reconciliation, alert receipt, support drill and complete signed decision log.

**Rollout / release gate:** G5 release: zero unaccepted critical defects, required qualified reviews, training and sustained cohort metrics.

**Blocker / assumption:** Named signatories, production authority, pilot thresholds and observation windows are not supplied; R18/R19/R32 are conditional activation gates, never bypassed.

**Definition of done:** Each enabled capability is qualified for its actual cohort and handed to accountable operations; remaining restrictions have owners and review dates.

### R34 — Qualify inventory extensions, landed cost and replenishment

**Lane:** Conditional extensions | **Original package:** W11 | **Priority:** P2 conditional | **Indicative effort:** XL (16–25 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Inventory/procurement product lead. **Reviewer:** Operations and accountant. **Hard predecessors:** R12, R14, R25, R26. **Traceability:** F12, CAP06, CAP09, CAP20.

**Objective / outcome:** Implement K09 and advanced inventory workflows only where the selected customer requires them.

**Current state:** Lot/serial/expiry/unit fields do not prove complete traceability; landed-cost allocation and predictive replenishment were not established.

**Execution:**

1. Decide requirements independently for lot/serial/expiry, unit conversion, landed cost and replenishment; split accepted work into bounded tickets.
2. Prove receipt-to-sale/return recall traceability, exact conversions, cost allocation across partial receipts/returns and valuation consequences.
3. Deliver descriptive turnover/aging first; add reorder suggestions only with measured lead time, demand quality, review controls and forecast evaluation.

**Impacted paths / modules:** `services/inventory`; `services/purchasing`; `services/unit`; `services/analytics`; `prisma/schema.prisma`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Potential lot/cost/lead-time schema and historical backfill; legacy quantities or costs must not be invented to make new features appear complete.

**Security / controls:** Human approval for purchasing suggestions, tenant/location isolation and accountant-reviewed cost allocation.

**Verification:** Trace/recall and conversion fixtures, allocation conservation, correction/cutoff tests; forecast backtest against a simple baseline when forecasting is actually in scope.

**Rollout / release gate:** D06 product need and source quality before engineering; becomes mandatory before release for any cohort promised these capabilities.

**Blocker / assumption:** Customer demand, reliable lead-time/lot/cost source data and bounded feature scope are not established.

**Definition of done:** Each accepted extension has its own tested workflow and metric contract; rejected/deferred extensions remain explicit and unadvertised.

### R35 — Add a fixed-asset subledger when professional scope requires it

**Lane:** Conditional extensions | **Original package:** W11 | **Priority:** P2 conditional | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Accounting product lead. **Reviewer:** Independent accountant. **Hard predecessors:** R07, R20, R25, R27. **Traceability:** F12, CAP14.

**Objective / outcome:** Provide asset acquisition, depreciation, disposal and reconciliation if needed by target customers.

**Current state:** A complete asset register/subledger was not established; manual journals alone must not be marketed as automated asset management.

**Execution:**

1. Decide material asset needs, accounting methods, categories, useful lives, opening assets and required reports.
2. Design a bounded asset register, schedule, approval, disposal/impairment and source-journal workflow using approved policy.
3. Reconcile asset cost/accumulated depreciation/net book value and preserve changes as effective-dated evidence.

**Impacted paths / modules:** `services/accounting`; `services/finance`; `prisma/schema.prisma`; `services/analytics`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** New asset/schedule schema and reviewed opening-data import may be needed; retain original acquisition and depreciation evidence.

**Security / controls:** Qualified policy, segregation of duties, period locks, currency correctness and reviewed opening balances.

**Verification:** Independent accountant golden schedules, partial-period cases, disposal/correction, year-end and asset-to-GL tie-outs.

**Rollout / release gate:** D06 required for chosen segment or explicitly deferred; no asset automation claim until complete.

**Blocker / assumption:** Customer asset portfolio, methods and opening evidence are unknown; estimate excludes data reconstruction.

**Definition of done:** Accepted asset scope is fully reconciled and maintainable, or formally deferred with supported manual accounting boundaries.

### R36 — Add governed budgets and scenario cash forecasting

**Lane:** Conditional extensions | **Original package:** W11 | **Priority:** P2 conditional | **Indicative effort:** L (9–15 combined engineering/QA person-days; low-confidence planning band).

**Owner:** FP&A/BI product lead. **Reviewer:** Finance owner. **Hard predecessors:** R25, R27. **Traceability:** F12, CAP20.

**Objective / outcome:** Deliver K18 for planning decisions after actual financial data is trustworthy.

**Current state:** No complete budget or scenario cash-forecast capability was established; it must not be inferred from chart surfaces.

**Execution:**

1. Define budget grain, versions, approval, currencies and ownership; connect actuals to the same account/period basis.
2. Model scenario cash from due receivables/payables, payroll, commitments and reviewed assumptions with uncertainty ranges.
3. Evaluate forecast error against a simple baseline and distinguish forecasts from available cash or certified statements.

**Impacted paths / modules:** `services/analytics`; `services/bi`; `services/accounting`; `prisma/schema.prisma`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Potential versioned budget/scenario tables; historical actuals stay immutable and forecast assumptions remain separate.

**Security / controls:** Approved assumptions, role-scoped edits, version audit, sensitivity disclosure and no automatic payment decisions.

**Verification:** Budget/actual mapping tie-outs, scenario arithmetic, forecast backtest and permission/version tests.

**Rollout / release gate:** D06 confirmed planning need, stable R27 actuals and data quality threshold.

**Blocker / assumption:** Planning cadence, budget owners and forecast horizon/accuracy requirements need discovery.

**Definition of done:** Users can compare approved budget to trusted actuals and evaluate reproducible scenarios with clear uncertainty.

### R37 — Add consent-aware customer retention and cohort analytics

**Lane:** Conditional extensions | **Original package:** W11 | **Priority:** P2 conditional | **Indicative effort:** M (5–8 combined engineering/QA person-days; low-confidence planning band).

**Owner:** Commercial analytics lead. **Reviewer:** Privacy and product owner. **Hard predecessors:** R13, R22, R25, R26. **Traceability:** F12, CAP20, CAP25.

**Objective / outcome:** Deliver K19 only where identity quality and permitted use support useful repeat-purchase decisions.

**Current state:** Retention/cohort analytics is optional; anonymous sales, returns and changing customer identity complicate reliable denominators.

**Execution:**

1. Define repeat customer, cohort membership, observation window, identity merge/split and treatment of returns/anonymous transactions.
2. Use only approved identity/consent sources, disclose incomplete attribution and permit scoped drill-through.
3. Validate a bounded retention use case with customers before adding campaigns or automated outreach.

**Impacted paths / modules:** `services/customer`; `services/referrals`; `services/analytics`; `services/bi`. These are inspection/ownership boundaries, not a mandate to edit every file.

**Data / migration impact:** Version identity resolution and derived cohorts; enforce retention and withdrawal policy without deleting required financial records.

**Security / controls:** Privacy-approved use, minimum needed identifiers and no unauthorized messages or sensitive profiling.

**Verification:** Synthetic repeat/anonymous/merged-identity and return cases, permission/consent withdrawal tests, independent cohort denominators.

**Rollout / release gate:** D06 useful business decision and approved identity/consent quality; otherwise defer.

**Blocker / assumption:** Target use case, identity coverage and lawful/consented analytics policy are not established.

**Definition of done:** Each published cohort has a defensible population and privacy contract, or the feature stays explicitly deferred.

## 8. Complete finding and capability coverage

Finding severity remains the audit's P1/P2 scale. Roadmap P0 means first execution priority; it does not silently reclassify audit severity.

| Finding / audit severity | Remediation packages | Closure evidence |
| --- | --- | --- |
| F01 / P1 | R02 R09 R27 | Independent nominal/base/rate fixtures; corrected source/report tie-outs; historical impact disposition. |
| F02 / P1 | R03 R09 R12 R13 R14 | Generic bypass denied; owner correction reconciles all source, stock, cash and GL effects exactly once. |
| F03 / P1 | R04 R32 | Multi-tab atomic persistence, quarantine and safe migration; real-device conservation evidence. |
| F04 / P1 | R05 R24 R32 | Interrupted-send/commit/restart resolves using original identities with no duplicate economic effects. |
| F05 / P1 | R32 R33 | Qualified devices/tenders/fiscal scope, controlled admission, observed pilot and obligation-preserving rollback. |
| F06 / P1 | R07 R12 R31 | Shared eligibility and concurrency proof; explicit lock-only/qualified-close states and invalidation. |
| F07 / P1 | R02 R09 | History-aware server policy blocks relabeling; affected-data review and safe correction disposition. |
| F08 / P2 | R06 R09 R20 | Boundary policy, no out-of-year intervals, safe disposition of any existing anomalous periods. |
| F09 / P2 | R06 R09 R27 | Opening + movement = closing across cutoff, currency and paginated views. |
| F10 / P2 | R08 R09 R10 R16 | Valid writer inventory, adversarial SQL/tenant tests, safe upgrade and approved retention/legal holds. |
| F11 / P1 | R18 R19 R17 R33 | Dated expert-reviewed capability versions, accepted integration evidence and bounded release claims. |
| F12 / P2 | R20 R25 R26 R27 R28 R34 R35 R36 R37 | KPI source contracts and independent totals; optional scope either accepted and implemented or explicitly deferred. |
| F13 / P2 | R00 R01 R13 R22 R31 | Ordinary completed verification; each gate clause resolved with behavior evidence, no control weakening. |
| F14 / P2 | R23 R30 R31 R33 | Current isolated restore/upgrade, deployed schedules/alerts, workload/SLO evidence and trained owners. |


| Capability | Scope | Packages |
| --- | --- | --- |
| CAP01 | Offline sales and replay | R04, R05, R32 |
| CAP02 | Online POS and shifts | R12 |
| CAP03 | Orders, fulfillment and customer credit | R13 |
| CAP04 | Returns, refunds and credits | R03, R13 |
| CAP05 | Stock, transfer, reservation, count and loss | R12 |
| CAP06 | Lot, serial, expiry and unit conversion | R34 |
| CAP07 | Supplier and purchasing | R14 |
| CAP08 | AP matching, allocation and correction | R14 |
| CAP09 | Landed cost | R34 |
| CAP10 | Cash, bank and mobile-money payments | R15, R19 |
| CAP11 | Reconciliation and suspense | R15 |
| CAP12 | Professional accounting and source posting | R02, R03, R06, R08, R09, R27 |
| CAP13 | Close assurance, exports and accountant access | R07, R09, R22 |
| CAP14 | Expense, accrual, year-end and assets | R20, R35 |
| CAP15 | HR identity, organization and contracts | R10, R16 |
| CAP16 | Compensation, documents, time and leave | R16, R28 |
| CAP17 | Payroll calculation and transitions | R17, R28 |
| CAP18 | Payroll payment, declaration and close | R17, R19 |
| CAP19 | Country packs and fiscal compliance | R18, R19 |
| CAP20 | BI, dashboards and decision support | R02, R25, R26, R27, R28, R34, R36, R37 |
| CAP21 | Identity, tenant, RBAC and privacy | R08, R10, R29 |
| CAP22 | Modules, packages and billing | R19, R21, R33 |
| CAP23 | Events, outboxes and workers | R05, R23 |
| CAP24 | AI and agent governance | R29 |
| CAP25 | Customer/accountant network and communications | R10, R22, R37 |
| CAP26 | Master data, media, history and onboarding | R11 |
| CAP27 | End-of-day and leakage/exception control | R07, R12, R26 |
| CAP28 | Release, recovery, observability and performance | R00, R01, R08, R23, R30, R31, R33 |
| CAP29 | Frontend, accessibility, localization and training | R24, R31, R33 |


## 9. BI delivery and governance

Every KPI inherits R25's definition contract: owner and decision; population/grain; source lineage/version; tenant/location/role; currency/rate; business timezone and [start,end) period; as-of/known-at cutoff; included states and corrections; freshness/completeness; null/zero/empty semantics; permission-safe drill-through; independent whole-population reconciliation; and published limitations. Operational, posted, reconciled, certified and forecast labels must remain distinct.

| KPI | Capability | Package / stage | Acceptance focus |
| --- | --- | --- | --- |
| K01 | Completed-sale activity | R26 / Essential | Order/line population, statuses and original-versus-corrected activity agree. |
| K02 | Realized net sales, COGS and gross margin | R27 / Essential | Recognized net sales less source-frozen, return-adjusted cost; margin null at zero denominator. |
| K03 | Basket, product and branch performance | R26 / Essential | Correct population/grain and branch scope; not a substitute for posted profit. |
| K04 | Order activity and commitments | R26 / Essential | Draft, committed, fulfilled and cancelled states remain distinct. |
| K05 | Cash position and drawer variance | R26 / Essential | Counts, ledger movements and provider-settled money remain distinct. |
| K06 | Settlement lag, fees and cash in transit | R26 / Qualified-rail addition | R19 provider evidence; gross-to-net fee bridge and pending aging. |
| K07 | Reconciliation exceptions and suspense aging | R26 / Essential | Owned unresolved balances and as-of aging tie to reconciliation source records. |
| K08 | Low stock and inventory coverage | R26 / Essential | Available, reserved and on-hand definitions; actionable location scope. |
| K09 | Inventory turnover, aging and replenishment | R34 / Conditional extension | Cost/lead-time/lot data first; descriptive ratios before forecasts. |
| K10 | Shrinkage, stock loss and adjustment variance | R26 / Valuable core addition | Approved loss/count/correction sources and valuation policy. |
| K11 | Supplier delivery reliability and commitments | R26 / Valuable core addition | Promised-date and accepted-receipt denominators; unavailable if missing. |
| K12 | AR/AP aging and working capital | R27 / Essential | Outstanding as-of amounts agree to source allocations and GL. |
| K13 | Income statement, balance sheet and trial balance | R27 / Essential | Correct base currency, openings and whole-population independent statement tie-outs. |
| K14 | Cash-flow statement | R27 / Essential professional suite | Approved method, noncash/FX bridge and beginning-to-ending cash reconciliation. |
| K15 | Payroll cost and headcount | R28 / Essential people suite | Effective population and approved/paid/posted cost states separated. |
| K16 | Attendance, leave and workforce trends | R28 / Valuable people addition | Policy-based denominators, effective manager scope and privacy controls. |
| K17 | Close progress, evidence freshness and integration reliability | R26 / Essential | Versioned source readiness, actual worker lag and independently owned exceptions. |
| K18 | Budget versus actual and scenario cash forecast | R36 / Conditional extension | Trusted actuals, versioned assumptions and measured forecast quality. |
| K19 | Customer retention and repeat-purchase cohorts | R37 / Conditional extension | Identity/consent quality, anonymous transactions and correction-aware populations. |


K09/K18/K19 and asset automation are staged proposals, not silently removed work. D06 must decide each independently. If a promised customer cohort requires landed costs, expiry traceability or assets, its package becomes a release prerequisite for that cohort. Manufacturing/BOM, multi-entity consolidation and employee performance prediction remain outside this assessed requirement set; add them only after a separate evidence-backed product decision.

## 10. End-to-end acceptance journeys

| Journey | Required final-state evidence | Lead packages |
| --- | --- | --- |
| Sale-to-cash-to-close | Onboard tenant/item → shift → sale → stock/cost → tender → return/refund if relevant → bank/cash reconciliation → daily close → GL/period close. Independent stock, cash, receivable and revenue/COGS totals. | R11 R12 R13 R15 R07 |
| Offline capture-to-qualified-close | Concurrent capture → storage migration/restart → lost server response → replay/conflict → verified tender/fiscal result → source/stock/GL → close. Every acknowledged event has one classified final outcome. | R04 R05 R32 |
| Purchase-to-payment-to-close | PO → receipt → invoice/match exception → approval → payment/allocation → statement match → supplier credit/return → stock/AP/cash/GL tie-out. | R14 R15 R07 |
| Hire-to-payroll-to-close | Employee/contract/time/compensation → readiness → reviewed calculation → immutable approval/payslip → payment/reconciliation → declaration evidence → correction → payroll register/GL/close. | R16 R17 R18 R19 |
| Correct-and-reclose | Posted source → authorized correction → compensation → invalidated report/certificate → recomputed evidence → approved close/export. Include concurrency and closed-period policy. | R03 R06 R07 R09 R27 |
| Restore-and-operate | Restore exact candidate/data chain → login/grants → recover worker/offline queues → verify domain balances → alerts/support actions → qualified read-only or operational reopening. | R08 R23 R24 R30 R31 |


For each journey retain at least one fully completed nominal case, every stated material failure case and an independent denominator/count. Zero draft mismatches is insufficient. Test cases must include two tenants and relevant role conflicts, duplicate events, interrupted transactions, corrections, period boundaries and revoked authority. External proofs are separate from local mocks. Evidence should identify environment, revision, migration chain, locale, role and device without exposing secrets or personal data.

## 11. Verification command catalog

The following commands were inspected as planning references, **not run as remediation verification in this publication**. Review scripts before running them, select the isolated environment explicitly and capture exit code, duration, stdout/stderr, source hashes and result files. Some gates write fixed report paths: preserve prior output and copy the new result to an immutable package evidence folder. The package verification clauses define additional tests to add; no new integration/browser suite is claimed to already exist.

| ID | Command | Meaning / limit |
| --- | --- | --- |
| V01 | npm run prisma:validate | Schema syntax/configuration only; does not prove migration or runtime correctness. |
| V02 | npm test -- --runInBand --runTestsByPath <existing-test-paths> | Use the normal repository config. Placeholder is deliberate: substitute verified paths for the package; new tests are planned, not claimed present. |
| V03 | npm run typecheck | Must complete; timeout is not a pass. Diagnose config/input scope before altering it. |
| V04 | npm run build:app | Safe application-build wrapper; inspect configuration and use the isolated test environment. Do not substitute npm run build: it chains migration deployment. |
| V05 | node scripts/service-boundary-gate.js --mode fail | The service:boundary npm script defaults to report; release verification must explicitly fail. |
| V06 | npm run inventory:boundary | Structural boundary evidence only. |
| V07 | npm run inventory:valuation:truth:gate | Structural/readiness evidence; also require real inventory/valuation tests. |
| V08 | npm run ledger:close-truth:gate | Does not replace close concurrency and source-readiness evidence. |
| V09 | npm run payment:cash-truth:gate | Does not prove external settlement or actual cash finality. |
| V10 | npm run purchasing:ap:gate | Requires finalized PO-to-payment proof in addition. |
| V11 | npm run offline:pos:replay:gate | Cannot authorize production offline merely because the scanner passes. |
| V12 | npm run payroll:presence:gate | Presence does not prove qualified statutory behavior. |
| V13 | npm run payroll:trust-spine:gate | Resolve literal marker mismatch and all other conjuncts with behavior evidence. |
| V14 | npm run report:trust:export:gate | Resolve five blocked clauses individually; do not blanket-label them false positives. |


Verified existing focused test entry points include:

- `lib/pos/__tests__/offline-local-queue.test.ts`
- `services/pos/__tests__/offline-sync.service.test.ts`
- `services/accounting/__tests__/manual-journal.test.ts`
- `services/accounting/__tests__/periods.service.test.ts`
- `services/accounting/__tests__/accounting-settings.service.test.ts`
- `services/payroll/__tests__/payroll-run-approval-transition.service.test.ts`
- `services/payroll/__tests__/payroll-tenant-boundary.service.test.ts`
- `services/modules/__tests__/module-entitlement.service.test.ts`
- `services/modules/__tests__/module-admission.service.test.ts`
- `services/inventory/__tests__/inventory-stock-event.service.test.ts`

Example: `npm test -- --runInBand --runTestsByPath lib/pos/__tests__/offline-local-queue.test.ts services/pos/__tests__/offline-sync.service.test.ts`. Extend the appropriate existing suites with the package's missing behaviors; use real PostgreSQL/browser tests for transaction/storage claims. Keep the old audit adapter only as historical evidence.

Do not blindly execute aggregate `build`, migration/deployment, seed/backfill, restore or policy commands that chain DB setup. Root `build` invokes migration deployment. `prisma:migrate:status` is a read-only status reference only after the target is known; it is not migration rehearsal. Safe isolated migration/concurrency commands must be derived from the inspected current scripts and recorded in R08/R30, rather than inventing a production-safe invocation here.

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

For each package, create a versioned evidence folder such as `what-next/platform-remediation/Rxx/<run-id>/` at execution time (template path, not yet created). Record: package/status/owner/reviewer; original finding; exact source and migration fingerprints; scope/assumptions/decisions; changed files; executed commands and raw sanitized results; expected and observed invariants; fixture denominators; browser/DB/external evidence class; data/migration/rollback outcomes; unresolved risks; approval references; and next gate. Do not place credentials or personal data in ordinary reports.

Completion means each accepted proposal is either VERIFIED/RELEASED for an explicit scope or formally DEFERRED/BLOCKED with owner and restriction. “Full platform complete” requires all promised domains, required optional features, country/provider qualification, historical impact disposition and operational handover. Merely documenting a blocker is not implementing its remedy.

## 15. Multidisciplinary responsibility coverage

| Review lens | Execution packages |
| --- | --- |
| Platform architecture | R00 R03 R07 R21 R31 |
| Backend / domain integration | R03 R05 R12 R13 R14 R15 R17 R23 |
| Database / migrations | R08 R09 R30 |
| Security / IAM / privacy | R08 R10 R16 R22 R29 |
| Frontend / design systems | R24 R26 R27 R28 |
| Workflow / accessibility / localization | R05 R07 R24 R33 |
| Product / business processes | R00 R20 R32 R33 R34 R35 R36 R37 |
| QA / release assurance | R01 R31 |
| SRE / DevSecOps / performance / cost | R23 R29 R30 |
| SaaS packaging / billing / customer operations | R19 R21 R33 |
| Finance / internal controls | R02 R03 R06 R07 R09 R20 R27 |
| Statutory / country compliance | R18 R19 |
| Audit / evidence / data quality | R08 R09 R25 R31 |
| POS / inventory / offline | R04 R05 R12 R32 R34 |
| Purchasing / AP | R14 R34 |
| HRIS / payroll | R16 R17 R18 R28 |
| Payments / reconciliation | R15 R19 |
| Accounting close | R06 R07 R20 R31 |
| BI / data governance | R25 R26 R27 R28 R34 R36 R37 |
| AI safety / evaluation / human approval | R29 |
| API / events / provider boundaries | R05 R19 R23 |
| Rollout / support / training | R24 R30 R32 R33 |


All 22 lenses apply to this plan. No separate independent expert review is claimed. A lens becomes not applicable only for a specific scoped release with a recorded reason; this does not remove its platform obligation.

## 16. Source and publication evidence

- [executive-assessment.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/executive-assessment.md>)
- [findings.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/findings.md>)
- [schema-assessment.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/schema-assessment.md>)
- [capability-coverage.csv](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/capability-coverage.csv>)
- [architecture-and-workflows.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/architecture-and-workflows.md>)
- [bi-capability-matrix.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/bi-capability-matrix.md>)
- [review-lens-register.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/review-lens-register.md>)
- [verification-summary.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification-summary.md>)
- [concurrent-changes-and-rechecks.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/concurrent-changes-and-rechecks.md>)
- [remediation-roadmap.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/remediation-roadmap.md>)
- [evidence-index.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/evidence-index.md>)

Planning checks: [plan-validation.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-roadmap/2026-09-30-run-01/plan-validation.json>). Publication checks: [publication-validation.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-roadmap/2026-09-30-run-01/publication-validation.json>). The previous September 12 skill-creation publication is preserved under [previous-publication](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-roadmap/2026-09-30-run-01/previous-publication>). Current report content replaces that older fixed-directory publication without deleting its archive.
