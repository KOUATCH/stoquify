# AqStoqFlow HRIS/Payroll Skill System Blueprint

Date: 2026-07-12
Mode: blueprint-only run
Decision: design the HRIS-first skill system now; do not install or overwrite skills in this run.

## Executive Recommendation

Create a new HRIS-first skill suite that coordinates with the existing payroll skills instead of replacing them.

The existing payroll skill work is valuable, but much of it starts from payroll execution, country-pack proof, payment proof, declaration proof, and final release evidence. The missing system-level protection is the upstream HRIS command chain that proves people, roles, contracts, compensation, time, leave, attendance, documents, and approvals before payroll can calculate.

The new suite must enforce this operating law:

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

The safest path is to make the suite dependency-aware. Each skill should either close one prerequisite gate, produce a saved status/report, or stop with a precise blocker. Payroll calculation must fail closed when HRIS readiness is absent, stale, unapproved, unsupported by evidence, or not tenant-scoped.

## Evidence From The Codebase And Project Documents

The blueprint is based on these existing project artifacts and conventions:

- `docs/HR-Payroll/README.md`
- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_PROMPT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_NEXT_STEPS_2026-07-12.md`
- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/install_hr_payroll_skill_suite.py`
- `what-next/payroll/install_hr_payroll_expert_skill_suite.py`
- Prior payroll reports under `what-next/payroll/`, especially the phase, wave, browser-smoke, country-pack, proof-backfill, and final-readiness reports.

The inspected evidence shows a mature payroll/control direction with country-pack proof, browser validation, correction proof, provider proof, statutory review, and release-gate reporting. It also shows why the next skill system should begin one level upstream: without a canonical HRIS spine, payroll skills are forced to validate or reconstruct employee truth late in the flow.

## Relationship To Existing Payroll Skills

This suite should not duplicate the existing payroll suite.

The existing payroll skill assets remain the downstream execution base for payroll kernel, statutory country packs, payments, declarations, accounting close, browser evidence, and final release gates. The new HRIS/payroll suite should become the upstream orchestration and readiness layer that decides when those payroll skills are safe to run.

Use existing payroll skills when:

- Payroll kernel, country-pack, statutory formula, provider, declaration, payslip, or final-release code already has a focused skill.
- A downstream proof report already exists and only needs revalidation.
- Browser smoke or accessibility evidence already has a reusable payroll route validation path.

Create or run HRIS-first skills when:

- Employee identity, org scope, manager scope, contract lifecycle, compensation truth, document evidence, attendance truth, input readiness, or snapshot correction is unclear.
- Payroll is consuming mutable UI state, direct form state, or reconstructed service state instead of a certified snapshot.
- Existing reports are stale, superseded, pilot-only, or unclear about unrestricted production readiness.

## Suite-Level Non-Negotiables

- Do not allow UI-derived payroll truth.
- Do not let payroll invent employee, contract, compensation, attendance, payment destination, or statutory truth.
- Do not run payroll without a certified HRIS input readiness gate.
- Do not accept country-pack formulas without source, provenance, expert review, fixture coverage, and source hash.
- Do not release payments without approved destination evidence and maker-checker approval.
- Do not submit declarations without authority proof and settlement/declaration traceability.
- Do not mutate backfilled payroll/HRIS data without dry-run diff, signoff, idempotency, and rollback/correction evidence.
- Do not broaden refactors outside the active slice.
- Do not treat stale reports as current truth.
- Do not install or overwrite skills unless the user explicitly requests installation.

## Standard Evidence Pack

Every skill must save a report that includes:

- Scope and date.
- Files inspected.
- Current blockers split into open, closed, superseded, and controlled-pilot-only.
- Data ownership decision.
- Tenant isolation and RBAC decision.
- Audit/redaction decision.
- Tests or gates run.
- What remains unverified.
- Next handoff skill.

## Standard Gates

Every implementation skill should run only the smallest honest verification set for the slice, then record results.

Typical gates include:

- Focused unit/service/action tests for the changed surface.
- Permission/RBAC negative tests where access behavior changes.
- Route smoke tests when authenticated dashboard routes change.
- Browser or Playwright evidence when layout, responsive behavior, workflow affordances, or visual regressions are plausible.
- Typecheck only when shared contracts, routes, services, or schema-level changes are touched.
- Regulatory hardcode/provenance checks for statutory/country-pack work.
- Redaction checks for employee, payslip, payment, declaration, document, and audit exports.

## Dependency Chain

```text
00 Orchestrator
  -> 01 Status Register
  -> 02 Source Truth Map
  -> 03 Employee Identity
  -> 04 Org Structure And Manager Scope
  -> 05 Contract Lifecycle
  -> 06 Compensation Controls
  -> 07 Document Evidence And Redaction
  -> 08 Time Leave Attendance
  -> 09 Input Readiness Gate
  -> 10 Snapshot Correction
  -> 11 Payroll Engine Integration
  -> 12 Country Pack Provenance
  -> 13 Payments Declarations Proof
  -> 14 Accounting Close Assurance
  -> 15 Self Service
  -> 16 Browser Accessibility Release
  -> 17 Migration Backfill Pilot
  -> 18 Final Readiness
```

## Skill Specifications

### `aqstoqflow-hris-payroll-00-orchestrator`

Purpose: Select the next safe HRIS/payroll slice and keep execution in dependency order.

Trigger/use cases: Use when the user asks what to do next, asks to execute the roadmap, or asks to continue HRIS/payroll work after a report.

Prerequisites: Current roadmap and status register must be readable, or this skill must hand off to `01-status-register`.

Evidence to inspect: `docs/HR-Payroll/`, `what-next/payroll/`, existing skill installers, recent git status, and the active prompt/report.

Files/surfaces likely touched: planning reports only unless a downstream skill is selected.

What the skill may change: saved orchestration report and, if needed, an updated next-step report.

What the skill must not change: production code, database schema, installed skills, or payroll business logic.

Required tests or gates: report consistency grep and no-production-code-change check.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ORCHESTRATOR_REPORT_<date>.md`

Handoff conditions: hand off to the earliest incomplete prerequisite skill.

Stop/blocker conditions: stop if required roadmap/status documents conflict, are missing, or are too stale to trust.

Success criteria: one next skill is selected with clear prerequisites, verification, and stop conditions.

### `aqstoqflow-hris-payroll-01-status-register`

Purpose: Create the canonical HRIS/payroll status register.

Trigger/use cases: Use before implementation, after long gaps, after many reports, or when readiness is disputed.

Prerequisites: Access to `docs/HR-Payroll/` and `what-next/payroll/`.

Evidence to inspect: all HRIS/payroll blueprint, roadmap, phase, wave, final-readiness, browser-smoke, country-pack, payment, declaration, and backfill reports.

Files/surfaces likely touched: `docs/HR-Payroll/` and `what-next/payroll/` reports.

What the skill may change: a canonical status register and a supersession map.

What the skill must not change: service code, Prisma schema, routes, installed skills, or test fixtures.

Required tests or gates: `rg` evidence checks proving every major blocker class is represented.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_STATUS_REGISTER_<date>.md`

Handoff conditions: hand off to `02-source-truth-map`.

Stop/blocker conditions: stop if reports contradict each other and cannot be reconciled without user decision.

Success criteria: blockers are classified as open, closed, superseded, pilot-only, or ready for implementation.

### `aqstoqflow-hris-payroll-02-source-truth-map`

Purpose: Map ownership across HRIS, payroll, accounting, assurance, compliance, and country packs.

Trigger/use cases: Use before schema, service, or API changes involving employee, payroll, accounting, or statutory data.

Prerequisites: Current status register.

Evidence to inspect: Prisma schema, HR/payroll services, payroll setup/config services, accounting posting services, assurance/proof-pack services, permission definitions, and existing reports.

Files/surfaces likely touched: source-truth map report; optionally service boundary docs.

What the skill may change: documentation and narrow service-boundary TODO reports.

What the skill must not change: payroll calculations or HRIS schema in this mapping pass.

Required tests or gates: ownership matrix grep for HRIS, payroll, accounting, assurance, compliance, and country pack.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SOURCE_TRUTH_MAP_<date>.md`

Handoff conditions: hand off to `03-employee-identity`.

Stop/blocker conditions: stop if a data field has multiple write owners and no safe owner can be inferred.

Success criteria: every critical field has exactly one owner, consumers, audit requirements, redaction rules, and mutation rules.

### `aqstoqflow-hris-payroll-03-employee-identity`

Purpose: Build employee identity, tenant scope, duplicate-risk, and user-to-employee mapping boundaries.

Trigger/use cases: Use when employee master data, employee self-service, manager access, payslip access, or payroll run eligibility is in scope.

Prerequisites: Source-truth map and permission model review.

Evidence to inspect: employee models, user models, tenant/org relations, RBAC permissions, payroll employee services, self-service routes, and duplicate detection reports.

Files/surfaces likely touched: employee services, identity mapping services, tests, and reports.

What the skill may change: identity service contracts, duplicate checks, user-to-employee mapping checks, and focused tests.

What the skill must not change: payroll calculation logic, country-pack formulas, or unrelated auth flows.

Required tests or gates: tenant isolation, duplicate prevention, user-to-employee access denial, and redacted employee payload tests.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_EMPLOYEE_IDENTITY_<date>.md`

Handoff conditions: hand off to `04-org-structure-manager-scope`.

Stop/blocker conditions: stop if employee identity can be created or read outside tenant scope.

Success criteria: employee identity is service-owned, tenant-scoped, deduplicated, auditable, and safe for downstream payroll snapshots.

### `aqstoqflow-hris-payroll-04-org-structure-manager-scope`

Purpose: Build org unit, branch, position, manager, and scoped access rules.

Trigger/use cases: Use before manager self-service, approvals, branch-level payroll, or department reporting work.

Prerequisites: Employee identity boundary.

Evidence to inspect: org/location/branch models, manager relationships, permissions, navigation, HR/payroll dashboards, and approval services.

Files/surfaces likely touched: org-scope services, permission checks, approval queries, and tests.

What the skill may change: scoped query helpers, manager access checks, and approval scope tests.

What the skill must not change: global admin permissions unless the active slice requires it.

Required tests or gates: manager can see only assigned scope; cross-branch and cross-tenant denial tests.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ORG_MANAGER_SCOPE_<date>.md`

Handoff conditions: hand off to `05-contract-lifecycle`.

Stop/blocker conditions: stop if manager scope cannot be proven from durable relationships.

Success criteria: org and manager scope is explicit, testable, and not inferred from UI navigation.

### `aqstoqflow-hris-payroll-05-contract-lifecycle`

Purpose: Build contract lifecycle, evidence, approvals, termination, amendments, and readiness blockers.

Trigger/use cases: Use when onboarding, contract amendment, termination, compensation activation, or payroll eligibility is in scope.

Prerequisites: Employee identity and org scope.

Evidence to inspect: contract models, employee onboarding flows, approval services, document services, audit logs, and payroll eligibility checks.

Files/surfaces likely touched: contract services, approval actions, readiness checks, and tests.

What the skill may change: contract state machine, evidence references, readiness blockers, and maker-checker checks.

What the skill must not change: payroll run finalization or statutory formulas.

Required tests or gates: cannot activate payroll without approved effective contract; amendment and termination create audit evidence.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_CONTRACT_LIFECYCLE_<date>.md`

Handoff conditions: hand off to `06-compensation-controls`.

Stop/blocker conditions: stop if active compensation can exist without an approved contract.

Success criteria: contract state is effective-dated, approved, auditable, and contributes clear payroll readiness blockers.

### `aqstoqflow-hris-payroll-06-compensation-controls`

Purpose: Build compensation/rubrique source truth, salary-change maker-checker, and benefit/deduction boundaries.

Trigger/use cases: Use before salary changes, benefits, deductions, employee balances, or payroll run input generation.

Prerequisites: Contract lifecycle and country-pack source-truth map.

Evidence to inspect: compensation models, payroll component/rubrique services, approval services, balance services, country-pack mappings, and prior proof reports.

Files/surfaces likely touched: compensation services, payroll component source adapters, tests, and reports.

What the skill may change: compensation approval workflow, effective dating, readiness blockers, and mapping tests.

What the skill must not change: expert-reviewed statutory formulas without a country-pack provenance skill.

Required tests or gates: salary change requires maker-checker approval; benefit/deduction mapping is traceable; stale compensation fails readiness.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_COMPENSATION_CONTROLS_<date>.md`

Handoff conditions: hand off to `07-document-evidence-redaction`.

Stop/blocker conditions: stop if payroll can read mutable compensation drafts.

Success criteria: payroll consumes approved, effective, traceable compensation records only.

### `aqstoqflow-hris-payroll-07-document-evidence-redaction`

Purpose: Build HR document/evidence handling, redaction, retention, and audit rules.

Trigger/use cases: Use when employee documents, contract files, identity documents, payslip proof, audit exports, or manager/employee self-service access is in scope.

Prerequisites: Employee identity and permission model review.

Evidence to inspect: document storage services, audit/proof-pack exports, redaction helpers, attachment routes, payslip exports, and employee profile APIs.

Files/surfaces likely touched: document services, redaction helpers, export mappers, tests.

What the skill may change: redaction policies, evidence metadata, retention flags, and access tests.

What the skill must not change: raw document storage provider behavior without a migration plan.

Required tests or gates: unauthorized users receive no document; authorized users receive role-appropriate redaction; audit records include purpose.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_DOCUMENT_EVIDENCE_REDACTION_<date>.md`

Handoff conditions: hand off to `08-time-leave-attendance`.

Stop/blocker conditions: stop if sensitive employee documents are returned by public, cross-employee, or cross-tenant paths.

Success criteria: document evidence is tenant-scoped, role-redacted, audited, and safe for proof packs.

### `aqstoqflow-hris-payroll-08-time-leave-attendance`

Purpose: Build schedules, leave, absences, overtime, corrections, approvals, and freeze contracts.

Trigger/use cases: Use before attendance affects payroll or when leave/overtime corrections are requested.

Prerequisites: Employee identity, org scope, and contract lifecycle.

Evidence to inspect: time/attendance models, leave services, schedule services, approval flows, payroll attendance adapters, and prior attendance readiness reports.

Files/surfaces likely touched: attendance services, leave approval actions, payroll input adapters, tests.

What the skill may change: attendance approval/freeze logic, correction evidence, payroll readiness blockers.

What the skill must not change: payroll run finalization without snapshot correction rules.

Required tests or gates: unapproved attendance fails readiness; approved freeze creates immutable input evidence; correction creates diff evidence.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_TIME_LEAVE_ATTENDANCE_<date>.md`

Handoff conditions: hand off to `09-input-readiness-gate`.

Stop/blocker conditions: stop if payroll can consume unapproved attendance or mutable leave state.

Success criteria: payroll consumes approved, frozen, traceable time/leave/attendance inputs only.

### `aqstoqflow-hris-payroll-09-input-readiness-gate`

Purpose: Make payroll fail closed when HRIS inputs are missing, stale, unapproved, unsupported, or untraceable.

Trigger/use cases: Use before payroll run creation, recalculation, release, or migration pilot.

Prerequisites: identity, contract, compensation, documents, and attendance readiness rules.

Evidence to inspect: payroll run services, input validation services, readiness reports, Prisma models, action routes, and UI run request flows.

Files/surfaces likely touched: payroll readiness services, run creation actions, tests, and reports.

What the skill may change: readiness evaluator, fail-closed run gates, error codes, and focused tests.

What the skill must not change: payroll formulas or downstream payment/declaration release.

Required tests or gates: missing contract, stale compensation, unapproved attendance, missing payment destination, and unsupported country pack all block payroll.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_INPUT_READINESS_GATE_<date>.md`

Handoff conditions: hand off to `10-snapshot-correction`.

Stop/blocker conditions: stop if readiness is only checked in UI or can be bypassed by API/action calls.

Success criteria: every payroll run starts from a service-owned, tenant-scoped, auditable readiness verdict.

### `aqstoqflow-hris-payroll-10-snapshot-correction`

Purpose: Build payroll input snapshots, diffing, correction planning, and post-finalization safety.

Trigger/use cases: Use when payroll inputs can change after run calculation or when corrections/backfills are needed.

Prerequisites: input readiness gate.

Evidence to inspect: payroll run snapshot models, correction services, finalization services, audit logs, proof reports, and migration/backfill reports.

Files/surfaces likely touched: snapshot services, correction planners, audit/proof services, tests.

What the skill may change: snapshot persistence, diff generation, correction blockers, and post-finalization guards.

What the skill must not change: finalized ledger/payment records without approved correction flow.

Required tests or gates: snapshot immutability, correction diff, post-finalization block, and approved correction path tests.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SNAPSHOT_CORRECTION_<date>.md`

Handoff conditions: hand off to `11-payroll-engine-integration`.

Stop/blocker conditions: stop if payroll can recalculate from live mutable HRIS data after snapshot creation.

Success criteria: payroll inputs are immutable snapshots with controlled correction evidence.

### `aqstoqflow-hris-payroll-11-payroll-engine-integration`

Purpose: Reconnect payroll calculation to certified HRIS snapshots without weakening the existing payroll kernel.

Trigger/use cases: Use when the readiness/snapshot layer is complete and payroll calculation needs to consume it.

Prerequisites: input readiness and snapshot correction.

Evidence to inspect: payroll calculation services, country-pack adapters, run services, payroll kernel tests, and statutory fixture reports.

Files/surfaces likely touched: payroll run orchestration, snapshot input adapters, focused tests.

What the skill may change: the adapter between certified snapshots and the existing payroll engine.

What the skill must not change: core calculation formulas except through country-pack provenance work.

Required tests or gates: existing payroll kernel tests plus new snapshot-adapter tests and negative readiness tests.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ENGINE_INTEGRATION_<date>.md`

Handoff conditions: hand off to `12-country-pack-provenance`.

Stop/blocker conditions: stop if calculation reads directly from mutable HRIS tables instead of certified snapshots.

Success criteria: payroll calculation input is deterministic, certified, traceable, and backward compatible with existing kernel proof.

### `aqstoqflow-hris-payroll-12-country-pack-provenance`

Purpose: Enforce expert-reviewed statutory country-pack formulas, golden fixtures, source hashes, and legal provenance.

Trigger/use cases: Use for OHADA/SYSCOHADA, Cameroon, tax, social security, employer charge, declaration, or statutory formula work.

Prerequisites: payroll engine integration and current country-pack status.

Evidence to inspect: country-pack services, statutory fixture reports, authority proof reports, regulatory hardcode gates, and formula source documents.

Files/surfaces likely touched: country-pack registry, fixtures, provenance metadata, tests.

What the skill may change: provenance metadata, fixture coverage, fail-closed formula gates, and reports.

What the skill must not change: formulas without expert-reviewed source evidence.

Required tests or gates: regulatory hardcode gate, golden fixture tieout, unsupported country fail-closed, source hash verification.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_COUNTRY_PACK_PROVENANCE_<date>.md`

Handoff conditions: hand off to `13-payments-declarations-proof`.

Stop/blocker conditions: stop if statutory formulas lack source, review, fixture, or provenance.

Success criteria: country-pack calculations are evidence-backed, fixture-proven, and safe to expose to payroll runs.

### `aqstoqflow-hris-payroll-13-payments-declarations-proof`

Purpose: Certify payment provider proof, authority declaration proof, settlement receipts, callbacks, and reconciliation.

Trigger/use cases: Use before payment release, declaration submission, provider callback handling, or authority proof lifecycle work.

Prerequisites: payroll run outputs, country-pack provenance, and approved payment destination evidence.

Evidence to inspect: payment provider services, declaration services, authority adapter reports, reconciliation reports, callback handlers, and proof drawers.

Files/surfaces likely touched: payment/declaration proof services, reconciliation workers, tests.

What the skill may change: proof envelope validation, callback idempotency, settlement/declaration tieout checks.

What the skill must not change: employee bank/mobile-money data without HRIS document/evidence approval.

Required tests or gates: approved destination required, provider callback dedupe, declaration authority proof, settlement tieout.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PAYMENTS_DECLARATIONS_PROOF_<date>.md`

Handoff conditions: hand off to `14-accounting-close-assurance`.

Stop/blocker conditions: stop if payments or declarations can be released without proof evidence and maker-checker approval.

Success criteria: every payment and declaration is traceable from certified payroll run to external proof and reconciliation.

### `aqstoqflow-hris-payroll-14-accounting-close-assurance`

Purpose: Connect payroll to ledger posting, source links, close assurance, proof packs, and audit exports.

Trigger/use cases: Use when payroll results affect accounting, close packs, ledgers, reconciliations, or auditor exports.

Prerequisites: payroll output proof and payment/declaration proof.

Evidence to inspect: ledger posting services, close assurance services, proof-pack exports, payroll register tieout, accounting reports, and redaction rules.

Files/surfaces likely touched: ledger bridge, close assurance adapters, proof-pack exports, tests.

What the skill may change: posting source links, close blockers, proof-pack aggregation, redacted audit exports.

What the skill must not change: posted ledger entries except through approved reversal/correction flows.

Required tests or gates: register-to-ledger tieout, close blocker for unresolved payroll proof, redacted auditor export.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ACCOUNTING_CLOSE_ASSURANCE_<date>.md`

Handoff conditions: hand off to `15-self-service` or `16-browser-accessibility-release`.

Stop/blocker conditions: stop if payroll money truth cannot be reconciled to ledger and proof-pack evidence.

Success criteria: payroll accounting is traceable, close-aware, redacted, and audit-ready.

### `aqstoqflow-hris-payroll-15-self-service`

Purpose: Build employee and manager self-service only after identity, scope, redaction, and readiness gates are safe.

Trigger/use cases: Use for profile updates, document requests, leave requests, manager approvals, payslip access, and employee-facing payroll views.

Prerequisites: employee identity, org scope, document redaction, input readiness, and proof access model.

Evidence to inspect: self-service routes, employee profile APIs, manager approval components, payslip routes, navigation, and permission config.

Files/surfaces likely touched: self-service components, route handlers, actions, permission tests, browser smoke tests.

What the skill may change: self-service access guards, scoped read models, redacted payloads, and UI route smoke coverage.

What the skill must not change: payroll source truth or approvals from client state.

Required tests or gates: employee sees only own data; manager sees only scoped data; sensitive fields are redacted; route smoke passes.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SELF_SERVICE_<date>.md`

Handoff conditions: hand off to `16-browser-accessibility-release`.

Stop/blocker conditions: stop if self-service can bypass HRIS approvals or cross employee/tenant boundaries.

Success criteria: self-service is useful, scoped, redacted, auditable, and does not become a source of payroll truth.

### `aqstoqflow-hris-payroll-16-browser-accessibility-release`

Purpose: Run route smoke, accessibility, visual validation, RBAC negative checks, and release gates.

Trigger/use cases: Use after dashboard, route, workflow, navigation, sidebar, responsive, or release-candidate changes.

Prerequisites: implemented slice with focused tests passing.

Evidence to inspect: Playwright/browser scripts, route smoke reports, screenshots, accessibility reports, RBAC configs, and package scripts.

Files/surfaces likely touched: smoke scripts, browser evidence reports, screenshots, accessibility reports.

What the skill may change: focused browser smoke scripts and saved validation evidence.

What the skill must not change: production code unless fixing a verified browser/accessibility defect in the active slice.

Required tests or gates: desktop/tablet/mobile smoke where relevant, RBAC negative route checks, accessibility checks, visual no-overlap checks.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_BROWSER_ACCESSIBILITY_RELEASE_<date>.md`

Handoff conditions: hand off to `17-migration-backfill-pilot` or `18-final-readiness`.

Stop/blocker conditions: stop if authenticated route evidence cannot be produced or if RBAC negative checks fail.

Success criteria: browser-level evidence proves the route/workflow is usable, scoped, accessible, and release-ready for the active slice.

### `aqstoqflow-hris-payroll-17-migration-backfill-pilot`

Purpose: Handle tenant migration, dry-run diffs, idempotency, rollback/correction, pilot cycle, and signoff.

Trigger/use cases: Use before moving existing tenants into the new HRIS/payroll spine or before unrestricted rollout.

Prerequisites: input readiness, snapshot correction, country-pack provenance, payments/declarations proof, and close assurance.

Evidence to inspect: migration scripts, seed/backfill plans, pilot certification reports, dry-run reports, proof-backfill reports, and rollback procedures.

Files/surfaces likely touched: migration/backfill scripts, fixtures, pilot reports, idempotency tests.

What the skill may change: dry-run scripts, backfill guards, idempotency checks, pilot signoff reports.

What the skill must not change: production tenant data without explicit dry-run, signoff, and rollback plan.

Required tests or gates: dry-run diff, idempotency rerun, rollback/correction simulation, pilot close-pack signoff.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_MIGRATION_BACKFILL_PILOT_<date>.md`

Handoff conditions: hand off to `18-final-readiness`.

Stop/blocker conditions: stop if migration changes are not reversible, not idempotent, or not signed off.

Success criteria: pilot tenant migration is proven before unrestricted rollout.

### `aqstoqflow-hris-payroll-18-final-readiness`

Purpose: Produce the final go/no-go decision for unrestricted HRIS/payroll production readiness.

Trigger/use cases: Use when the team believes the HRIS/payroll chain is ready for production expansion.

Prerequisites: all prior gates complete or explicitly waived with owner, date, and risk acceptance.

Evidence to inspect: status register, source-truth map, identity/org/contract/compensation/document/attendance reports, readiness/snapshot reports, payroll proof reports, browser reports, migration pilot reports, and CI gate results.

Files/surfaces likely touched: final readiness report only.

What the skill may change: final go/no-go report and launch checklist.

What the skill must not change: production code, schema, or tenant data.

Required tests or gates: evidence completeness checklist, focused suite replay where feasible, route smoke proof, release blocker review.

Required saved report path: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_FINAL_READINESS_<date>.md`

Handoff conditions: if go, hand off to controlled rollout; if no-go, hand off to the earliest failing prerequisite skill.

Stop/blocker conditions: stop on unresolved tenant isolation, RBAC, redaction, readiness, statutory, payment, declaration, accounting, migration, or browser release blockers.

Success criteria: a defensible go/no-go decision exists with evidence, owners, residual risk, and release boundaries.

## Minimal Implementation Plan

1. Keep this blueprint as the governing document.
2. Do not install skills until the user explicitly asks for skill installation.
3. When installation is approved, generate draft skill folders under a staging location first.
4. Reuse the existing installer patterns from `what-next/payroll/install_hr_payroll_skill_suite.py` and `what-next/payroll/install_hr_payroll_expert_skill_suite.py`.
5. Preserve existing installed payroll skills; add new `aqstoqflow-hris-payroll-*` skills without overwriting unrelated skill folders.
6. Validate every generated `SKILL.md` for prerequisites, stop conditions, evidence paths, reports, and gates.
7. Save an installation report under `what-next/payroll/`.
8. Run `01-status-register` before any production implementation slice.

## Verification Commands

```powershell
rg -n "aqstoqflow-hris-payroll-00-orchestrator|input-readiness-gate|snapshot-correction|final-readiness" docs/HR-Payroll what-next/payroll
rg -n "HRIS owns people truth|Payroll consumes certified HRIS snapshots|Do not install|prerequisites|stop" docs/HR-Payroll what-next/payroll
```

## Final Decision

Yes, create the HRIS/payroll skill system as a blueprint now. Do not install it yet.

The first executable step after approval should be `aqstoqflow-hris-payroll-01-status-register`, because the project already contains many payroll reports and the next implementation cycle needs a single current truth register before code changes resume.
