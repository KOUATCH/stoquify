# AqStoqFlow Enterprise HRIS/Payroll Execution Roadmap

Date: 2026-07-12

## Executive Decision

AqStoqFlow should move to a **payroll-grade HRIS-first architecture**.

The current payroll work should be preserved. It already contains a real payroll kernel, payroll-specific Prisma models, RBAC-gated dashboard routes, service-owned payroll actions, payment evidence, payslips, registers, declaration workflows, immutability gates, policy gates, and close-pack evidence.

The next move is not a rewrite. The next move is to make HRIS the authoritative people/source-data layer and make payroll consume certified HRIS snapshots.

Target chain:

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

Current release posture:

- Controlled pilot / limited release is appropriate for implemented and evidence-gated payroll workflows.
- Unrestricted production HR/payroll is still blocked by statutory breadth, live authority/payment proof, production migration/backfill signoff, full browser certification, and incomplete HRIS source-data breadth.

## Evidence Base

This roadmap is grounded in the current workspace evidence:

- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PILOT_CERTIFICATION_FINAL_READINESS_CLOSE_PACK_REPORT_2026-07-02.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_STATUTORY_REVIEW_TOPICS_EVIDENCE_CHAIN_REPORT_2026-07-01.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_19_BROWSER_SMOKE_WARMUP_GATE_REPORT_2026-07-02.md`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-regulatory-hardcode-gate.md`
- `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_PLATFORM_ROADMAP_AND_HYBRID_RECONSTRUCTION_2026-06-25.md`
- `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`
- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `prisma/schema.prisma`
- `services/payroll/`
- `actions/payroll/`
- `components/payroll/`
- `app/[locale]/(dashboard)/dashboard/payroll/`
- `config/permissions.ts`
- `config/sidebar.ts`
- `lib/security/rbac-permissions.ts`
- `package.json`
- `graphify-out/GRAPH_REPORT.md`

## Current-State Assessment

### What Is Already Strong

The current payroll module is much more than a dashboard:

- Dedicated payroll models exist in `prisma/schema.prisma` for employees, contracts, rubriques, salary changes, payment destination changes, periods, attendance snapshots, runs, run lines, payslips, payslip lines, declarations, declaration evidence, payment batches, allocations, employee balance cases, and employee balance events.
- Payroll state machines exist for employee status, contract status, rubrique status, period status, attendance snapshot status, run status, payslip status, declaration status, payment batch status, and employee balance case/event status.
- Service-owned workflows exist in `services/payroll/` for employee source data, contracts, compensation, payment evidence, payroll control, registers, payslip self-service, declaration lifecycle, authority adapters, payment reconciliation, proof backfill, pilot certification, final readiness, setup readiness, and statutory scenario coverage.
- Server actions in `actions/payroll/` enforce permission checks, module entitlement, structured errors, and fresh auth on sensitive mutation paths.
- Dashboard routes under `app/[locale]/(dashboard)/dashboard/payroll/` render role-aware workbenches and denial states.
- Payroll permissions exist in `config/permissions.ts`; risk classification exists in `lib/security/rbac-permissions.ts`.
- `package.json` includes payroll immutability runtime, regulatory hardcode, policy gates, e2e payroll smoke, and UI smoke scripts.
- `what-next/payroll/payroll-immutability-runtime-check.md` currently reports status `ready`, 14/14 forbidden mutation checks blocked, and 0 blockers.
- `what-next/payroll/payroll-regulatory-hardcode-gate.md` reports status `pass` while preserving the rule that statutory values must come from versioned country packs or reviewed configuration.

### What Is Pilot-Ready Only

The controlled pilot evidence is meaningful, but it is not an unrestricted production certificate:

- The July 2 pilot certification report passed its readiness slice and preserved redacted pilot-cycle evidence in close-pack metadata.
- The July 11 style release evidence previously showed broad gates passing for that slice, including Jest/build/typecheck/policy gates.
- The payroll kernel is acceptable for implemented controlled-pilot workflows.

### What Blocks Full Enterprise HRIS/Payroll

Current blockers:

- Full statutory payroll breadth is not ready. Country-pack formulas, legal references, effective dates, golden fixtures, source hashes, and expert signoff are still required.
- Authority declaration automation is not fully production-proven. Real payload mappings, response mappings, rejection/amendment handling, credential policy, retries, audit, and close-impact rules remain required.
- Payment provider production evidence is incomplete. Live provider credentials, settlement receipts, webhook proof, replay protection, and outage drills remain required.
- Production seed/backfill mutation is still blocked until tenant migration plans, redacted dry-run evidence, idempotency proof, rollback/correction strategy, and signoff exist.
- Browser production certification is still blocked until a live authenticated run completes all configured payroll routes and viewports without timeout, redirect, connection refusal, or screenshot failures.
- HRIS breadth is incomplete. Employee master data, organization structure, leave/time/attendance, benefits, documents, approvals, manager workflows, and employee self-service need to become source-of-truth systems rather than payroll-adjacent panels.

## Target Architecture

### Ownership Chain

| Domain | Owns | Must Not Own |
| --- | --- | --- |
| HRIS | Employee identity, employment lifecycle, contracts, compensation source data, benefits, payment destination evidence, documents, attendance/leave/overtime, approvals, HR audit | Payroll calculation totals, ledger postings, statutory filing status |
| Payroll | Payroll periods, input snapshots, run calculation, run approval/posting, payslips, registers, payment batches, declarations, payroll corrections | Mutable employee truth, unsupported legal formulas, ledger truth |
| Accounting | Journal entries, source links, ledger balances, SYSCOHADA posting proof, close impact | HR employee records, payroll formulas |
| Assurance | Release gates, proof packs, close evidence, certification, audit trail, blocker status | Business source data mutation |
| Compliance/Country Packs | Legal/statutory configuration, source hashes, expert review state, effective-date rules | UI-only statutory constants or unreviewed legal claims |

### Service Boundary

The service boundary should become:

- `services/hris/`: employee truth, org structure, contracts, compensation source data, leave/time/attendance, documents, approvals, readiness scoring.
- `services/payroll/`: payroll snapshots, calculation, runs, payslips, registers, payment batches, declarations, corrections, statutory consumption.
- `services/accounting/`: source links, posting rules, close impact, ledger reconciliation.
- `services/assurance/`: proof packs, release readiness, close-pack certification, policy gates.
- `services/regulatory/`: country packs, statutory rule provenance, expert review state.

The current payroll services can remain in `services/payroll/`. New HRIS work should avoid pushing more employee-source truth into payroll services unless the existing names are preserved temporarily behind compatibility read models.

### State Model

HRIS state is mutable only through audited workflows.

Payroll state is derived from frozen input snapshots.

Accounting state is derived from posted, balanced, source-linked financial events.

Assurance state is derived from evidence, hashes, gates, and signoffs.

## Domain Ownership Map

| Capability | Source Of Truth | Consumer | Required Gate |
| --- | --- | --- | --- |
| Employee identity | HRIS | Payroll, self-service, manager views | Duplicate-risk and tenant/user mapping gate |
| Employment status | HRIS | Payroll readiness, access, reporting | Approved lifecycle transition |
| Org unit/branch/department | HRIS | Payroll cost allocation, analytics, manager scope | Tenant-scoped hierarchy validation |
| Manager relationship | HRIS | Manager approvals, team views | Manager-scope RBAC |
| Contract | HRIS | Payroll snapshot, payslip/register | Signed/approved contract evidence |
| Compensation package | HRIS | Payroll calculation | Maker-checker salary/benefit approval |
| Rubriques | HRIS plus country pack boundary | Payroll calculation/payslip/register | Statutory/provenance classification |
| Payment destination | HRIS | Payroll payment batch | Fresh-auth maker-checker plus evidence hash |
| Documents | HRIS | Payroll readiness, audit, self-service | Redaction/retention/evidence gate |
| Attendance | HRIS time/attendance | Payroll snapshot | Approved/frozen attendance gate |
| Leave/overtime | HRIS time/attendance | Payroll snapshot | Approved policy calculation gate |
| Country-pack rules | Regulatory | Payroll | Expert-reviewed source hash and fixtures |
| Payroll input snapshot | Payroll | Payroll calculation, assurance | HRIS readiness pass |
| Payroll run | Payroll | Register, payslip, accounting | Calculation proof and approval |
| Payment batch | Payroll | Provider, accounting, assurance | Approved payment evidence and SoD |
| Declaration | Payroll/compliance | Authority, close assurance | Statutory payload proof and evidence lifecycle |
| Journal/source link | Accounting | Close, analytics, auditor pack | Balanced posting and source-link proof |
| Close evidence | Assurance | Auditor/accountant | Release/close-pack gate |

## The Execution Spine

### State

HRIS owns employee truth. Payroll consumes certified HRIS snapshots. Accounting records money truth. Assurance proves the chain.

### Data Model And Invariants

Required invariants:

- No payroll run without a valid payroll input snapshot.
- No input snapshot without complete HRIS readiness.
- No employee in payroll without tenant-scoped HRIS identity.
- No salary, contract, payment destination, termination, retroactive attendance, or payroll-affecting compensation change without approval evidence.
- No statutory amount without country-pack provenance and review state.
- No finalized payroll artifact can be silently mutated.
- No payroll payment release without approved destination evidence.
- No declaration close certification without register and authority evidence.

### Contract

The HRIS-to-payroll contract should expose service-owned read models:

- `getHrisEmployeeTruthProfile`
- `getHrisEmployeePayrollReadiness`
- `getPayrollInputReadiness`
- `freezePayrollInputSnapshot`
- `getPayrollInputSnapshotDiff`
- `getPayrollCorrectionInputPlan`
- `getManagerPayrollExceptionQueue`
- `getEmployeeSelfServicePayrollProfile`

Names can be adjusted to match local conventions during implementation, but the contract must remain service-owned and testable.

### Trust Boundary

All HRIS and payroll mutation paths must enforce:

- Tenant isolation.
- Module entitlement.
- RBAC permission.
- Fresh auth for sensitive operations.
- Maker-checker where financial, legal, or identity risk exists.
- Structured safe errors.
- Audit events.
- Redacted outputs by default.

### Sync Model

Use request/approval workflows for HRIS changes.

Use frozen snapshots for payroll calculation.

Use correction runs, adjustment events, or append-only evidence for changes after finalization.

Use provider/authority callbacks as audited external evidence, not as silent state mutation.

### Failure Handling

Fail closed:

- Missing HRIS data blocks payroll.
- Missing approval blocks payroll.
- Missing statutory review blocks statutory claims.
- Missing payment evidence blocks payment release.
- Missing register/authority evidence blocks close certification.
- Missing browser certification blocks unrestricted production readiness.

## Phase 0: Canonical Status And Preservation Gate

### Goal

Create one current decision surface that preserves what works and stops stale reports from confusing the execution program.

### Work

- Create a canonical HRIS/payroll status register.
- Mark older DB immutability blockers as superseded by current runtime immutability evidence.
- Keep statutory breadth, browser smoke, live provider/authority proof, and production backfill as open blockers.
- Classify the current payroll kernel as controlled-pilot ready only.
- Freeze "do not weaken" constraints: RBAC, module entitlement, fresh auth, service ownership, immutability, redaction, policy gates, close evidence.

### Acceptance Criteria

- One status register lists open, closed, superseded, and controlled-pilot-only items.
- No roadmap step implies unrestricted production readiness.
- Existing payroll services/routes/gates are preserved.

### Verification

- Static document check under `docs/HR-Payroll` and `what-next/payroll`.
- `rg` confirms "controlled pilot", "unrestricted production", "immutability", and "statutory" language is explicit.

## Phase 1: HRIS Core Foundation

### Goal

Make HRIS the source of truth for employees and payroll-affecting people data.

### Work

- Define HRIS core models or strengthen existing payroll-adjacent models:
  - Employee identity.
  - User-to-employee mapping.
  - Duplicate-risk detection.
  - Employment lifecycle status.
  - Organization/branch/department/position.
  - Manager hierarchy.
  - Contract lifecycle.
  - Compensation package.
  - Payment destination evidence.
  - Documents and evidence references.
  - HR approval events.
  - HR audit events.
- Add service-owned read models for HRIS profile and payroll readiness.
- Add cross-employee access denial tests.
- Add redaction behavior for salary, payment, identifier, and document fields.

### Acceptance Criteria

- Every payroll employee can be traced to a tenant-scoped HRIS employee identity.
- Employee-user mapping is explicit and tested.
- Duplicate employee risk is surfaced before payroll.
- HRIS can explain employee readiness blockers.
- Payroll cannot consume missing or unapproved employee/contract/payment data.

### Non-Goals

- Recruitment.
- Performance reviews.
- Training.
- Large BI surfaces.
- AI HR assistant.

## Phase 2: Contract, Compensation, And Payment-Destination Control

### Goal

Make payroll-affecting HR source changes approval-driven and traceable.

### Work

- Harden contract create/update/terminate lifecycle with signed evidence references.
- Harden compensation and rubrique assignment workflows.
- Preserve maker-checker salary change flow.
- Preserve payment destination request/approve/apply flow.
- Require fresh auth for salary, payment destination, termination, and retroactive compensation changes.
- Add payroll readiness blockers for stale contract, missing contract evidence, unapproved salary change, invalid payment destination, and missing payment evidence.

### Acceptance Criteria

- Payroll cannot calculate from draft or unapproved contracts.
- Payroll cannot use unapproved compensation or payment destination changes.
- Sensitive changes are audited and fresh-auth protected.
- Read models expose blocker reasons without leaking raw sensitive details.

## Phase 3: Time, Leave, Attendance, And Overtime Source Engine

### Goal

Move beyond attendance snapshot readiness into a real HRIS time/leave/attendance source system.

### Work

- Define schedules, work calendars, public holidays, leave policies, leave balances, absences, overtime, and attendance correction workflows.
- Add manager approval and HR override boundaries.
- Add tenant and branch scope for manager views.
- Define attendance-to-payroll freeze contract.
- Add drift detection after freeze.
- Fix permission taxonomy so attendance does not rely on payment-destination access.

### Acceptance Criteria

- Payroll input readiness can distinguish missing attendance, pending leave, pending overtime, stale schedule, and unapproved correction.
- Payroll snapshots include approved attendance/leave/overtime evidence.
- Retroactive attendance changes create correction workflows instead of silent payroll mutation.

## Phase 4: Payroll Input Readiness Gate

### Goal

Make payroll refuse to run unless HRIS data is complete, approved, and traceable.

### Work

- Implement `getPayrollInputReadiness` as a service-owned gate.
- Create employee-level, period-level, and organization-level readiness summaries.
- Classify blockers:
  - Missing employee identity.
  - Duplicate employee risk.
  - Missing user mapping.
  - Missing/expired contract.
  - Pending salary change.
  - Missing payment destination approval.
  - Missing attendance snapshot.
  - Pending leave/overtime approval.
  - Unsupported country pack.
  - Missing statutory review proof.
  - Missing accounting setup.
- Expose compact, redacted readiness to UI.
- Prevent `calculatePayrollRun` from proceeding when readiness fails.

### Acceptance Criteria

- Payroll calculation fails closed with actionable blocker codes.
- The command center can show readiness without deriving business truth in the UI.
- Focused tests prove blocked and ready states.

## Phase 5: Payroll Snapshot And Correction Model

### Goal

Ensure payroll runs from immutable input snapshots and later HRIS changes become correction flows.

### Work

- Define payroll input snapshot metadata:
  - Employee profile hash.
  - Contract hash.
  - Compensation hash.
  - Attendance/leave/overtime hash.
  - Payment destination hash.
  - Country-pack hash.
  - Approval evidence hashes.
- Add snapshot diffing for payroll operators.
- Add correction plan service for post-finalization changes.
- Preserve DB immutability for finalized financial/legal artifacts.

### Acceptance Criteria

- A payroll run can be independently explained from its frozen input snapshot.
- HRIS changes after snapshot do not mutate run lines, payslips, payments, or declarations.
- Corrections are explicit, audited, and close-impact classified.

## Phase 6: Payroll Engine Integration

### Goal

Reconnect the payroll engine to certified HRIS snapshots while preserving current calculation, register, payslip, payment, declaration, accounting, and close evidence patterns.

### Work

- Refactor calculation inputs to use the snapshot contract.
- Preserve existing payroll run lifecycle: calculate, approve/post, release payment batch, prepare declarations.
- Preserve register and payslip proof.
- Preserve payroll statutory scenario coverage and country-pack boundaries.
- Preserve source-link and ledger-mapping evidence.
- Add tests showing the engine rejects live mutable HRIS reads when snapshot proof is required.

### Acceptance Criteria

- Payroll totals are derived from approved snapshot data.
- Run lines retain country-pack and HRIS source hashes.
- Payslips and registers can cite the snapshot proof.
- Accounting source links remain balanced and traceable.

## Phase 7: Statutory Country-Pack Completion

### Goal

Move from narrow reviewed statutory slices to expert-reviewed production country-pack breadth.

### Work

- Use country-pack review intake to promote only reviewed statutory families.
- Add legal reference, source hash, effective date, reviewer, fixture input, fixture output, rounding, caps, allowances, deductions, benefits, leave/overtime, YTD, and correction scenarios.
- Preserve the regulatory hardcode gate.
- Keep unsupported jurisdictions and unsupported rule families blocked.

### Acceptance Criteria

- No statutory production rule ships without expert-reviewed provenance.
- Register, payslip, declaration, final readiness, and command read model all expose statutory review state.
- Unreviewed statutory families remain blockers, not warnings.

## Phase 8: Payments, Declarations, Accounting, And Assurance

### Goal

Certify money movement and compliance evidence end to end.

### Work

- Certify payment provider sandbox-to-live flow.
- Add webhook signature verification and replay protection.
- Add settlement receipt ingestion and reconciliation proof.
- Certify authority declaration payload and response mappings.
- Add accepted/rejected/amended declaration lifecycle evidence.
- Preserve close-impact classification.
- Extend accountant/auditor proof packs with redacted aggregate/hash evidence.

### Acceptance Criteria

- Payment batch total ties to approved payroll net payable or approved partial release.
- Provider settlement ties to payment allocations.
- Declaration status ties to authority evidence and register proof.
- Close assurance fails closed when evidence is missing.

## Phase 9: Employee And Manager Self-Service

### Goal

Add human-facing HRIS/payroll flows after identity, access, redaction, and snapshot boundaries are safe.

### Work

- Employee own-profile view.
- Employee payslip history and secure export.
- Employee document upload/request workflow.
- Payment destination change request.
- Leave request and approval status.
- Manager team attendance/leave/exception approval.
- Manager payroll readiness queue without broad salary visibility.

### Acceptance Criteria

- Employees can access only their own records.
- Managers can access only scoped team records.
- Exports require fresh auth and audit.
- Sensitive fields are redacted unless explicitly permitted.

## Phase 10: Browser, Accessibility, Security, Migration, And Release Certification

### Goal

Move from controlled pilot to unrestricted production only when evidence is complete.

### Work

- Run isolated live browser smoke for all payroll/HRIS routes and viewports.
- Add accessibility checks for core HRIS/payroll forms and workbenches.
- Run RBAC negative tests across employee, manager, HR, payroll, finance, and auditor roles.
- Run tenant-isolation tests.
- Run policy gates, service boundary, regulatory hardcode, payroll immutability runtime, typecheck, lint, focused Jest, build, and browser smoke.
- Approve migration/backfill with dry-run diffs, idempotency proof, rollback/correction plan, and signoff.
- Produce final production release evidence pack.

### Acceptance Criteria

- No unrestricted production claim remains blocked.
- Every route, export, adapter, and high-risk mutation has focused test evidence.
- Browser route matrix passes cleanly for authenticated permitted actors.
- Executive signoff references actual evidence files.

## Security, RBAC, Privacy, Audit, And Redaction Plan

Security requirements:

- Tenant isolation on all HRIS/payroll reads and writes.
- Module entitlement for HRIS/payroll surfaces.
- Role-based visibility for HR, payroll, manager, employee, accountant, auditor, and admin personas.
- Fresh auth for salary, contract, payment destination, termination, retroactive attendance, payslip/register export, payment release, declaration management, production backfill, and pilot/final certification.
- Maker-checker for all high-risk HRIS and payroll-affecting changes.
- Audit events for sensitive reads, writes, exports, provider callbacks, authority callbacks, and certification actions.
- Default redaction of salary, payment destination, identifiers, documents, raw payroll detail, and provider/authority payloads unless the actor has explicit permission.
- Safe error handling without raw salary/person/provider details.
- Idempotency keys for high-risk writes.
- Replay protection for provider/authority webhooks.
- Secret isolation for provider and authority credentials.

## Browser, Accessibility, Testing, And Release-Gate Plan

Minimum test layers:

- Service unit tests for HRIS readiness, duplicate detection, snapshot freeze, correction planning, statutory gates, payment/declaration evidence, and close proof.
- Action tests for RBAC, module entitlement, fresh auth, safe errors, and denied states.
- Route smoke tests for all HRIS/payroll pages.
- Browser smoke with authenticated storage state for all HRIS/payroll routes and responsive viewports.
- Accessibility checks for forms, workbenches, dialogs, tabs, and denial states.
- Policy gates:
  - `npm run prisma:validate`
  - `npm run typecheck`
  - `npm run service:boundary:fail`
  - `npm run regulatory:hardcode:fail`
  - `npm run policy:gates`
  - `npm run payroll:immutability:runtime`
  - `npm run ui:smoke:payroll`

Run full repo gates only when the slice is broad enough to justify the time. For narrow backend slices, use focused Jest plus the standard payroll gate subset and rerun `typecheck` in isolation when a combined run is noisy.

## Migration And Backfill Strategy

Migration principle: do not rewrite payroll history silently.

Required program:

- Tenant source inventory.
- Employee identity matching and duplicate-risk report.
- Contract and compensation mapping report.
- Payment destination evidence report.
- Attendance/leave source inventory.
- Payroll history import classification:
  - historical reference only
  - proof-backfill metadata
  - correction-required
  - unsupported
- Dry-run diffs.
- Idempotency proof.
- Redacted evidence pack.
- Approval workflow.
- Rollback/correction strategy.
- Pilot tenant certification.

Production mutation remains blocked until every tenant has signoff.

## Roadmap Dependency View

1. Phase 0 status register preserves current payroll and separates stale/current blockers.
2. Phase 1 HRIS core creates people truth.
3. Phase 2 contract/compensation/payment controls secure payroll-affecting HR data.
4. Phase 3 time/leave/attendance creates approved work-time truth.
5. Phase 4 readiness gate blocks payroll without complete HRIS proof.
6. Phase 5 snapshot/correction model prevents live mutable HRIS data from corrupting payroll.
7. Phase 6 payroll engine consumes certified snapshots.
8. Phase 7 statutory country packs certify legal calculation.
9. Phase 8 payments/declarations/accounting/assurance certify external and financial proof.
10. Phase 9 employee/manager self-service opens the human-facing product.
11. Phase 10 release certification closes production risk.

## Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Treating current payroll as throwaway | Rebuild wastes existing security/evidence work | Preserve payroll kernel and move source truth behind HRIS snapshots |
| Letting payroll invent HR truth | Wrong payslips, weak audit, duplicate employees | HRIS readiness gate and snapshot contract |
| Overbuilding generic HR before payroll-critical source data | Long delay without production value | Start with payroll-grade HRIS core only |
| Shipping statutory rules without expert proof | Legal and financial exposure | Country-pack provenance, expert review, golden fixtures |
| Live provider/authority mismatch | Payment/declaration failures | Sandbox-to-live adapter certification and callback proof |
| Stale reports confuse blockers | Wrong implementation order | Canonical status register |
| UI-first implementation | Pretty screens over weak truth | Service-owned read models before UI |
| Cross-tenant/role data leak | Severe privacy/security incident | Tenant isolation, RBAC, redaction, negative tests |
| Backfill corruption | Historical payroll/audit damage | Dry-run, idempotency, rollback/correction, signoff |

## Non-Goals

For the first execution wave, do not build:

- Recruitment.
- Performance reviews.
- Training.
- AI HR assistant.
- Complex HR analytics.
- Large generic HR dashboard.
- Production authority filing without reviewed payload mappings.
- Production payment automation without provider certification.
- Unreviewed statutory formulas.
- Production backfill mutation without signoff.

## First Implementation Slice

The first implementation slice should be:

**Phase 0: Canonical HRIS/payroll status register and source-of-truth ownership map.**

Why:

- It is low risk.
- It preserves current payroll work.
- It stops stale blockers from confusing the team.
- It creates the exact contract for Phase 1 HRIS core implementation.
- It gives every later slice a shared decision surface.

Deliverables:

- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_CANONICAL_STATUS_REGISTER_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PHASE_0_STATUS_REGISTER_REPORT_2026-07-12.md`
- Source-of-truth ownership table.
- Open/closed/superseded blocker table.
- First Phase 1 prompt for HRIS employee identity and readiness service.

## Blueprint Ready

This roadmap is ready for Phase 0 execution. Do not begin broad HRIS production coding until the canonical status register and source-of-truth ownership map are saved and reviewed.

