# Stoquify Full HRIS Architecture Analysis

Date: 2026-07-19
Mode: repo-grounded architecture and implementation planning
Scope: HRIS, Payroll, Accounting/Finance, Assurance, RBAC, module packaging, migration, and release readiness
Production code changed: no

## Executive Decision

Stoquify should become a full HRIS, but not by building a broad generic HR suite on top of the current payroll UI. The strongest path is to finish a payroll-grade People Core first, then add extended HRIS modules as governed product packages.

The core product law remains correct:

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

The repo is no longer in the purely rudimentary HRIS state described by the older 2026-07-14 implementation analysis. Current code now includes first-class HRIS services, actions, components, People routes, browser/RBAC evidence, migration/backfill pilot reports, and a versioned HRIS-to-payroll readiness export. However, it is still not a full enterprise HRIS because most durable storage is still payroll-named compatibility storage, the HRIS module entitlement is not fully normalized, the permission taxonomy is still small, full typecheck remains blocked by V8 out-of-memory in the latest final-readiness report, and extended HR functions are explicitly deferred until People Core is stable.

Decision: proceed, but keep the next implementation sequence disciplined:

1. Stabilize current People Core release evidence and typecheck.
2. Refresh status/blocker records so July 12 and July 14 "open" labels do not hide July 15-17 landed work.
3. Architect schema evolution for HRIS-owned people, org, position, time/leave, documents, approvals, and extended modules.
4. Keep payroll as the certified calculation and statutory/payments engine.
5. Do not hand off to extended HRIS modules until People Core final readiness is clean.

## Evidence Inspected

Architecture and strategy:

- `docs/HR-Payroll/README.md`
- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md`
- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md`

Current HRIS and payroll reports:

- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_STATUS_REGISTER_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SOURCE_TRUTH_MAP_2026-07-12.md`
- `what-next/payroll/STOQUIFY_HRIS_CURRENT_STATE_REGISTER_2026-07-14.md`
- `what-next/payroll/STOQUIFY_HRIS_PEOPLE_BOUNDARY_FACADE_2026-07-14.md`
- `what-next/payroll/STOQUIFY_HRIS_PERMISSIONS_ROUTE_SHELL_2026-07-14.md`
- `what-next/payroll/STOQUIFY_HRIS_PAYROLL_READINESS_CONTRACT_2026-07-15.md`
- `what-next/payroll/STOQUIFY_HRIS_BROWSER_ACCESSIBILITY_RBAC_RELEASE_2026-07-16.md`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_SIGNOFF_READY_GATE_2026-07-17.md`
- `what-next/payroll/STOQUIFY_HRIS_FINAL_READINESS_2026-07-17.md`
- `what-next/payroll/stoquify-hris-skill-suite-drafts-2026-07-14/stoquify-hris-20-extended-hris/SKILL.md`

Repo surfaces:

- `services/hris/`
- `actions/hris/`
- `components/hris/`
- `app/[locale]/(dashboard)/dashboard/people/`
- `services/payroll/`
- `actions/payroll/`
- `components/payroll/`
- `app/[locale]/(dashboard)/dashboard/payroll/`
- `prisma/schema.prisma`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `docs/modules/`
- `what-next/module-surface-inventory.md`
- `graphify-out/GRAPH_REPORT.md`
- `services/graphify-out/GRAPH_REPORT.md`
- `actions/graphify-out/GRAPH_REPORT.md`
- `components/graphify-out/GRAPH_REPORT.md`
- `app/graphify-out/GRAPH_REPORT.md`

## Current State

### What Is Now Real

The repo now has an HRIS People Core boundary:

- `services/hris/employee.service.ts` wraps the payroll employee source-data service and returns explicit `HRIS_PEOPLE_CORE` ownership metadata while keeping `PayrollEmployee` as compatibility storage.
- `services/hris/contract.service.ts`, `document-evidence.service.ts`, `compensation.service.ts`, `payment-destination.service.ts`, `time-leave.service.ts`, `lifecycle.service.ts`, `approval-inbox.service.ts`, `movement-history.service.ts`, `self-service.service.ts`, and `manager-self-service.service.ts` exist as HRIS service surfaces.
- `actions/hris/*` exists for employee, compensation, lifecycle, payment destination, time/leave, and approval inbox actions.
- `components/hris/*` exists for approval inbox, movement history, employee self-service, and manager self-service.
- `/dashboard/people`, `/dashboard/people/[employeeId]`, `/dashboard/people/me`, `/dashboard/people/team`, `/dashboard/people/approvals`, and `/dashboard/people/history` are present and permission-gated.
- `config/permissions.ts` defines `hris.self_service.read`, `hris.self_service.request`, `hris.people.read`, and `hris.people.manage`.
- `lib/security/rbac-permissions.ts` risk-rates HRIS people read as high and HRIS people manage as critical.
- Browser/RBAC evidence exists for the controlled People route family, with desktop/tablet/mobile positive and denied-state evidence.

The payroll integration is also no longer aspirational:

- `services/hris/payroll-readiness-contract.ts` defines `STOQUIFY_HRIS_PAYROLL_READINESS_EXPORT`.
- The readiness export certifies identity source proof, approved contract activation, approved contract document evidence, approved compensation evidence, applied payment-destination evidence, and frozen attendance certification.
- Payroll calculation fails closed when certified HRIS input proof is missing, tampered with, blocked, or stale.
- Payroll engine snapshots, correction metadata, run hashes, audit entries, payment/declaration proof, and accounting-close evidence now reference HRIS input proof.

The migration evidence is promising but bounded:

- The July 17 migration/backfill signoff-ready dry run scanned one local pilot employee, found zero blockers and zero warnings after remediation, and preserved immutable evidence hashes.
- The July 17 final readiness report still says unrestricted production is `NO-GO` because full project typecheck with 8GB heap ends in V8 out-of-memory before TypeScript diagnostics.

### What Is Still Not A Full HRIS

The current HRIS is a controlled People Core foundation, not the full product:

1. HRIS uses payroll-named compatibility storage. `PayrollEmployee`, `PayrollContract`, `PayrollAttendanceSnapshot`, payroll compensation assignments, and payroll change-request tables remain the durable source rows for many people facts.
2. HRIS permissions are too coarse. Four `hris.*` permissions are enough for a foundation, but not enough for full HRIS domains such as documents, lifecycle, time/leave, compensation, benefits, org design, manager actions, and sensitive exports.
3. Org/position/reporting-line truth is still thin. Current scope leans on location/manager compatibility and needs effective-dated org units, positions, reporting lines, delegations, and manager history.
4. Time/leave is a certification engine, not yet a full operational HR time product. It needs work schedules, calendars, holidays, accrual rules, leave requests, balances, overtime workflows, imports, anomalies, and correction workbenches.
5. Document governance is metadata-first. Approved hashes, malware scan evidence, retention metadata, and raw-download denial are present, but full document vault storage, legal hold operations, short-lived download grants, deletion proof, and access reviews still need productization.
6. Compensation and benefits are payroll-ready, not full rewards administration. Benefits enrollment, loans/advances as HR requests, allowances, eligibility rules, deductions, taxable/fringe classifications, and country-pack separation need a clearer HRIS contract.
7. Employee self-service is controlled and useful, but not complete. The platform still needs own profile correction requests, document requests, leave/time requests, payment destination requests, benefit elections, onboarding tasks, and consent/acknowledgement flows.
8. Manager self-service is a scoped workforce view, not a full manager workbench. It needs task ledgers for onboarding/offboarding, leave approvals, delegated authority, performance touchpoints, document expiries, and readiness exceptions.
9. The HRIS module slug/package decision is incomplete. `what-next/module-surface-inventory.md` shows `/dashboard/people` as `hris` with an unknown slug in one navigation row, while `/dashboard/people/me` and `/dashboard/people/team` are still mapped as payroll in the inventory.
10. Extended HRIS modules are intentionally deferred. Recruitment, performance, training, disciplinary workflows, surveys, workforce planning, analytics, and advanced benefits must wait until People Core readiness is clean.

## Target Architecture

### Domain Ownership

| Domain | Owner | Consumes | Must not own |
| --- | --- | --- | --- |
| Employee identity and source lineage | HRIS People Core | Auth tenant/user context, legacy payroll compatibility data | Payroll calculations or ledger truth |
| Employment lifecycle | HRIS | Employee identity, contracts, org scope, payment-destination proof | Payroll run mutation |
| Org units, positions, reporting lines, delegations | HRIS | Locations, departments, cost centers, users | Payroll calculations |
| Contracts and documents | HRIS | Document vault, approval inbox, legal retention policy | Statutory formula meaning |
| Compensation and benefits assignments | HRIS for employee-specific facts; country pack for statutory meaning | Component catalog, contracts, policies | Ledger posting |
| Time, leave, attendance, overtime | HRIS | Schedules, leave policy, approvals, imports, corrections | Payroll calculations |
| Certified input snapshot | Payroll, consuming HRIS proof | HRIS readiness export | Mutable HR source truth |
| Payroll run, payslips, payments, declarations | Payroll | Certified HRIS snapshot, country pack, provider/authority proof | Mutable employee master truth |
| Ledger posting and close | Accounting/Finance | Payroll aggregates, source links, assurance proof | HR profile mutation |
| Evidence, release gates, owner signoff | Assurance | HRIS, Payroll, Accounting, Security, Browser, Migration proof | Business fact mutation |

### Architecture Layers

1. **Platform identity and entitlement**
   - Auth/session resolves user, tenant, active organization, and fresh-auth state.
   - Module entitlement decides whether the tenant may use HRIS/People Core.
   - RBAC decides what the user may do inside HRIS.
   - Entitlement must remain separate from RBAC.

2. **HRIS People Core**
   - Owns employee identity, source lineage, user-to-employee mapping, lifecycle state, org assignments, positions, contracts, compensation/benefit assignments, payment destination requests, documents, time/leave/attendance, approvals, self-service, manager scope, and movement history.
   - Produces redacted read models and evidence-hashed mutation results.

3. **Payroll**
   - Owns readiness verdicts, certified payroll input snapshots, calculations, runs, run lines, payslips, corrections, payments, declarations, payroll registers, employee balance cases, and statutory/payroll proof.
   - Consumes HRIS readiness export and fails closed on missing or stale proof.

4. **Accounting/Finance**
   - Owns ledger posting, account mappings, source links, reconciliation, finance reporting, and close.
   - Consumes payroll financial proof and redacted aggregates.
   - Does not consume raw HR person data unless an explicit finance workflow requires tightly scoped proof.

5. **Assurance and evidence**
   - Owns proof packs, final readiness, migration dry-runs, browser evidence, policy gates, owner signoff, and release decisions.
   - Blocks unrestricted production claims when evidence is stale, incomplete, local-only, or failing.

6. **Compliance and country packs**
   - Own statutory formulas, legal provenance, fixture coverage, country setup, reviewed capability status, authority mapping, and compliance evidence.
   - HRIS supplies employee/workforce facts; payroll/country packs decide statutory treatment.

## Data Model Direction

Use an expand/contract migration strategy. Do not duplicate employee master truth in one jump.

### Phase A: Current Compatibility Storage

Keep current payroll-named storage while enforcing service ownership:

- `PayrollEmployee` remains the backing row for employee profile compatibility.
- `PayrollContract` remains the backing row for employment contract compatibility.
- `PayrollEmployeeRubriqueAssignment` and `PayrollSalaryChangeRequest` remain compensation backing rows.
- `PayrollPaymentDestinationChangeRequest` remains the sensitive payment-destination workflow backing row.
- `PayrollAttendanceSnapshot` remains the certified attendance snapshot consumed by payroll.
- HRIS services remain the new owner-facing API for people-source facts.

### Phase B: Canonical HRIS Tables

Introduce HRIS-owned tables only where payroll names or field shapes limit correctness:

- `HrisEmployeeIdentity`: immutable employee number/source lineage, legal/display names, tenant scope, duplicate status, user mapping status.
- `HrisEmploymentProfile`: hire date, employment status, country, work eligibility, lifecycle status, active contract pointer, source proof.
- `HrisOrgUnit`: effective-dated departments, branches, cost centers, teams, and legal entities.
- `HrisPosition`: position catalog, job families, grades, reporting-line defaults, headcount budget links.
- `HrisEmploymentAssignment`: employee-to-org/position/reporting-line assignments with effective dates and manager history.
- `HrisLifecycleRequest`: onboarding, transfer, promotion, suspension, reinstatement, termination, offboarding, and rehire workflows.
- `HrisDocumentArtifact`: document metadata, artifact hash, storage handle, malware scan proof, retention class, legal hold, access policy, deletion proof.
- `HrisApprovalRequest`: generic request/review/apply envelope with segregation-of-duties and evidence hashes.
- `HrisTimePolicy`, `HrisWorkSchedule`, `HrisHolidayCalendar`, `HrisLeavePolicy`, `HrisLeaveBalance`, `HrisLeaveRequest`, `HrisAttendanceEvent`, `HrisOvertimeRequest`, `HrisTimeCorrection`.
- `HrisBenefitPlan`, `HrisBenefitEligibility`, `HrisEmployeeBenefitElection`, `HrisDeductionInstruction`.
- `HrisMovementEvent`: redacted, queryable movement timeline projection linked to business events and audit logs.

Payroll compatibility rows should then reference HRIS identifiers or certified snapshot hashes. Do not let payroll rows become a second mutable HR master.

### Phase C: Extended HRIS Tables

Only after People Core readiness:

- Recruitment and candidate pipeline.
- Offer letters and onboarding tasks.
- Performance goals, reviews, feedback, and improvement plans.
- Learning, certifications, training records, renewals.
- Disciplinary/grievance cases.
- Asset/equipment assignments and returns.
- Employee expenses/advances integration with Finance.
- Surveys and engagement.
- Workforce planning, headcount budgeting, succession planning.

Each extension must have owner, data model, RBAC, redaction, audit, evidence, migration, and release gates before UI exposure.

## Service Architecture

Keep the pattern already emerging in `services/hris/*`:

- `server-only` service entry points.
- Zod-validated inputs.
- `organizationId` required for all reads and writes.
- HRIS service checks scope through `resolveHrisPeopleAccessScope`.
- Sensitive mutations require `hris.people.manage` or narrower future permissions.
- Maker-checker flows record request, approval, application, actor separation, reason, and proof hashes.
- Business events are recorded and marked applied inside transactions.
- `AuditLog` records purpose, actor, organization, entity, action, and redacted changes.
- Read models deliberately omit raw salary, raw identifiers, raw payment destinations, raw documents, provider payloads, and authority payloads.

Recommended service modules:

- `services/hris/identity.service.ts`
- `services/hris/org-structure.service.ts`
- `services/hris/position.service.ts`
- `services/hris/lifecycle.service.ts`
- `services/hris/contract.service.ts`
- `services/hris/document-vault.service.ts`
- `services/hris/compensation.service.ts`
- `services/hris/benefits.service.ts`
- `services/hris/payment-destination.service.ts`
- `services/hris/time-leave.service.ts`
- `services/hris/approval-inbox.service.ts`
- `services/hris/movement-history.service.ts`
- `services/hris/self-service.service.ts`
- `services/hris/manager-self-service.service.ts`
- `services/hris/payroll-readiness-contract.ts`
- `services/hris/migration-backfill-pilot.service.ts`

## Route And UX Architecture

The first screen should be the usable People workspace, not a landing page.

Recommended route family:

- `/dashboard/people`: People command center, readiness, risk, workforce summary, pending approvals, route links.
- `/dashboard/people/directory`: dense employee directory with scoped, redacted list data.
- `/dashboard/people/[employeeId]`: profile, employment, contract, org assignment, payroll readiness, documents, movement timeline.
- `/dashboard/people/org`: org units, positions, reporting lines, delegations, manager scope.
- `/dashboard/people/time`: schedules, attendance, leave requests, overtime, corrections, certification readiness.
- `/dashboard/people/documents`: document evidence, expiry, retention, legal hold, access review.
- `/dashboard/people/approvals`: all HRIS approvals with domain filters and proof requirements.
- `/dashboard/people/history`: movement and audit timeline.
- `/dashboard/people/me`: employee self-service.
- `/dashboard/people/team`: manager self-service.

UX constraints:

- HRIS screens should be dense, operational, and evidence-oriented, matching the existing dashboard language.
- HRIS should not copy raw payroll workbenches.
- Payroll should show certified calculation/proof state, while People should show source truth, approvals, documents, time/leave, and readiness blockers.
- Manager screens must default to minimal workforce/readiness DTOs and avoid salary, payment destination, raw documents, tax identifiers, and social identifiers.
- Employee self-service must resolve own employee server-side from the authenticated user; client-provided employee IDs cannot create authority.

## Integration Contracts

### HRIS To Payroll

Contract: `STOQUIFY_HRIS_PAYROLL_READINESS_EXPORT`.

Payroll can run only when:

- Every included employee has complete HRIS identity source proof.
- Active contract is approved and document evidence is approved/scanned.
- Compensation assignments have maker-checker proof and evidence.
- Payment destination has approved/applied proof.
- Attendance/time/leave snapshot is certified.
- Export hash and employee proof hashes are current and untampered.

Payroll must never recalculate from mutable HRIS tables after a snapshot is sealed. Later HRIS changes create correction plans, not silent payroll mutation.

### HRIS To Accounting/Finance

HRIS supplies:

- Cost center, department, job/position, and workforce classification dimensions.
- Redacted event proof for employee lifecycle changes that affect payroll cost.
- Source hashes for payroll readiness and correction evidence.

Accounting consumes:

- Payroll run aggregates, register tie-out, source links, payment settlement proof, declaration proof, and close invalidation evidence.

Accounting must not:

- Mutate HRIS profiles.
- Store raw person-level payroll detail in close packs.
- Treat local pilot HRIS proof as unrestricted production evidence.

### HRIS To Compliance/Country Pack

HRIS supplies employee facts and country/policy context. Country packs own statutory meaning, legal references, reviewed formulas, fixtures, and authority capability status.

Examples:

- HRIS says employee has benefit X or contract classification Y.
- Country pack says how X/Y affects taxable base, social contribution, declaration lines, and authority payloads.

### HRIS To Notifications And Workflow

Add notification/workflow events only from service-owned state transitions:

- pending approval
- rejected request
- applied lifecycle change
- document expiring
- leave approved/rejected
- payroll readiness blocked
- backfill signoff required

Notifications should contain links and redacted summaries, not raw sensitive values.

## RBAC And Entitlement Plan

The current four HRIS permissions are too coarse for a full HRIS. Add narrower permissions before adding broader UI/actions.

Suggested HRIS permission groups:

- `hris.people.read`
- `hris.people.manage`
- `hris.identity.link`
- `hris.lifecycle.request`
- `hris.lifecycle.approve`
- `hris.lifecycle.apply`
- `hris.org.read`
- `hris.org.manage`
- `hris.documents.read`
- `hris.documents.manage`
- `hris.documents.raw_access`
- `hris.compensation.read`
- `hris.compensation.manage`
- `hris.compensation.approve`
- `hris.benefits.read`
- `hris.benefits.manage`
- `hris.time.read`
- `hris.time.manage`
- `hris.time.approve`
- `hris.self_service.read`
- `hris.self_service.request`
- `hris.manager.read`
- `hris.manager.approve`
- `hris.exports.create`
- `hris.migration.run`
- `hris.release.certify`

Entitlement actions:

- Decide whether canonical commercial module slug is `hris`, `people`, or `people-core`.
- Update module inventory so `/dashboard/people`, `/dashboard/people/me`, and `/dashboard/people/team` have the same primary module decision.
- Keep module entitlement separate from user RBAC.
- Start in observe mode before enforcement against existing tenants.

## Release Gates

Minimum gates before unrestricted production:

- `npm run typecheck` completes without V8 OOM or is partitioned into reliable bounded checks.
- `npm run policy:gates` passes on the release commit.
- `npm run prisma:validate` passes.
- Focused HRIS service/action/component/route Jest suites pass.
- Payroll control/readiness tests pass.
- Accounting close/data-trust payroll proof tests pass.
- Browser smoke covers People and Payroll desktop/tablet/mobile.
- RBAC negative browser evidence covers no-HRIS, no-payroll, employee-only, manager, payroll operator, accountant/auditor, and admin personas.
- Migration dry-run covers each pilot tenant with stable hashes, idempotency rerun, correction-only rollback, and owner signoff.
- Production/staging proof exists for provider settlement, statutory authority filing, country-pack review, and accounting close where those claims are made.
- Final readiness report names commit SHA, tenant/country scope, environment, evidence freshness, skipped checks, residual risk, and owner signoff.

## Implementation Roadmap

### Phase 0: Status Reconciliation

Goal: eliminate stale blocker labels.

Tasks:

- Refresh the HRIS status register against July 15-17 landed reports.
- Mark People boundary, route shell, identity/profile, lifecycle, document evidence, compensation controls, time/leave certification, approval inbox, movement history, self-service, manager self-service, payroll readiness contract, browser/RBAC, and migration pilot according to current evidence.
- Keep unrestricted production as `NO-GO` until typecheck and production environment evidence are fixed.

### Phase 1: Release Process Repair

Goal: make current evidence trustworthy.

Tasks:

- Fix or partition full TypeScript typecheck so it completes.
- Separate existing dirty worktree changes into reviewable groups.
- Rerun focused HRIS tests, payroll readiness tests, policy gates, and report consistency greps.

### Phase 2: HRIS Module And RBAC Foundation

Goal: make HRIS a governed platform module.

Tasks:

- Decide the canonical module slug.
- Add observe-mode entitlement mapping for People routes.
- Expand HRIS RBAC taxonomy.
- Add risk classifications and alias tests.
- Prove payroll grants do not unlock HRIS and HRIS grants do not unlock payroll.

### Phase 3: Schema Evolution Design

Goal: move from payroll-named compatibility storage to HRIS-owned source truth without breaking payroll.

Tasks:

- Design `HrisEmployeeIdentity`, org/position, lifecycle, document, time/leave, benefit, approval, and movement tables.
- Add expand/contract migrations.
- Build backfill dry-runs and reconciliation hashes.
- Keep payroll compatibility adapters until all consumers are moved.

### Phase 4: Org, Position, And Manager Authority

Goal: replace location-only manager scope with effective-dated workforce authority.

Tasks:

- Add org units, positions, reporting lines, delegations, acting managers, and effective dates.
- Add manager scope negative tests.
- Make approval routing and manager self-service consume the new scope.

### Phase 5: Full Time, Leave, Attendance Engine

Goal: go beyond certification manifests.

Tasks:

- Add work schedules, holiday calendars, leave policies, balances, requests, approvals, overtime, imports, anomalies, and corrections.
- Keep payroll consumption snapshot-only.
- Add tests proving unapproved or unresolved time blocks payroll.

### Phase 6: Document Vault And Retention

Goal: make document handling enterprise-grade.

Tasks:

- Add secure storage integration or abstraction.
- Add short-lived raw-access grants, purpose logging, malware scan proof, legal hold, retention classes, deletion proof, and redacted exports.
- Add raw-access denial and audit tests.

### Phase 7: Benefits, Rewards, And Employee Requests

Goal: broaden HRIS value beyond payroll minimums.

Tasks:

- Add benefit plans, eligibility, enrollment/elections, employer/employee deductions, loans/advances requests, and salary/allowance change request UX.
- Keep statutory meaning in country packs and financial posting in accounting.

### Phase 8: Self-Service And Manager Workbench

Goal: make HRIS valuable in daily operations.

Tasks:

- Employee: profile correction, documents, leave/time, payment destination, benefits, payslips, acknowledgements.
- Manager: team readiness, approvals, onboarding/offboarding tasks, document expiries, time exceptions, workforce changes.
- Add own-record and manager-scope negative tests for every route/action.

### Phase 9: Payroll, Accounting, And Assurance Closure

Goal: prove the end-to-end chain.

Tasks:

- Bind HRIS source hashes through payroll runs, payslips, payments, declarations, and close packs.
- Add close blockers when HRIS/payroll proof is missing or stale.
- Keep proof packs aggregate/redacted.

### Phase 10: Migration, Pilot, And Production Attestation

Goal: move real tenants safely.

Tasks:

- Run tenant-batched migration/backfill dry-runs.
- Capture correction-only rollback proof.
- Get HR, payroll, accounting-controller, security/privacy, operations, and owner signoff.
- Rerun final readiness with clean typecheck and environment proof.

### Phase 11: Extended HRIS

Goal: add novelty after People Core is stable.

Deferred modules:

- Recruitment and candidate-to-employee onboarding.
- Performance goals, reviews, feedback, and improvement plans.
- Training, certifications, renewals, and learning assignments.
- Disciplinary and grievance workflows.
- Employee assets/equipment.
- Expense and advance requests integrated with Finance.
- Workforce planning, headcount budgeting, succession, and scenario planning.
- Surveys and engagement.
- HR analytics and retention risk.

Do not start this phase until People Core final readiness is clean, or until a report explicitly accepts controlled-pilot limitations for one extension.

## What Makes This HRIS Novel For Stoquify

The novelty should not be "many HR screens." It should be trust across people, payroll, money, and compliance:

- Ghost-worker prevention through HRIS identity proof and payroll readiness blockers.
- Payroll cannot run from stale or unapproved people facts.
- Salary, contract, payment destination, and attendance changes are maker-checker and evidence-backed.
- Manager and employee self-service are safe because authority is server-resolved, scoped, and redacted.
- Accounting close can prove payroll amounts without leaking person-level details.
- Country-pack and statutory provenance prevent unreviewed payroll formulas.
- Migration/backfill proof prevents "we imported HR data" from becoming an unverifiable claim.
- Every high-impact HRIS change can become a redacted business event and assurance artifact.

## Immediate Next Actions

1. Fix or partition `npm run typecheck` so HRIS final readiness is not blocked by V8 OOM.
2. Create a refreshed HRIS status register dated 2026-07-19 that supersedes the stale July 12/14 open-blocker tables.
3. Decide and document the HRIS/People module slug, then update module-surface inventory for `/dashboard/people`, `/dashboard/people/me`, and `/dashboard/people/team`.
4. Expand HRIS permissions before adding new document/time/benefits/action surfaces.
5. Draft the HRIS schema evolution plan for org/position/time/documents/approvals while preserving payroll compatibility.
6. Run focused HRIS and payroll readiness tests after each implementation slice; reserve full browser and final readiness for release-candidate points.

## Verification Performed For This Report

Commands/searches used:

- Searched current HRIS/payroll docs and reports under `docs/HR-Payroll/` and `what-next/payroll/`.
- Searched current HRIS services, actions, components, People routes, payroll services, schema, permissions, and graphify reports.
- Inspected current reports from 2026-07-14 through 2026-07-17, including final readiness and migration/backfill pilot signoff.
- Inspected `prisma/schema.prisma` payroll models and confirmed no dedicated canonical HRIS model family exists yet.
- Inspected `config/permissions.ts` and `lib/security/rbac-permissions.ts` HRIS/payroll permission separation.
- Inspected `what-next/module-surface-inventory.md` and found HRIS module-slug inconsistency for People routes.

Report consistency checks to run after save:

```powershell
rg -n "HRIS owns people truth|Payroll consumes certified HRIS snapshots|Accounting records money truth|Assurance proves the whole chain|Production code changed: no|NO-GO|typecheck|PayrollEmployee|STOQUIFY_HRIS_PAYROLL_READINESS_EXPORT|/dashboard/people|module slug" what-next/hris/STOQUIFY_FULL_HRIS_ARCHITECTURE_ANALYSIS_2026-07-19.md
git status --short -- what-next/hris/STOQUIFY_FULL_HRIS_ARCHITECTURE_ANALYSIS_2026-07-19.md
```

Skipped checks:

- No Jest, Playwright, typecheck, Prisma, build, or policy gates were run because this task produced an architecture report only.
- No internet search was performed; this was a local platform/repo analysis.
- No production code, schema, package script, or route file was changed.

Residual risk:

- The worktree already contains unrelated dirty changes from prior work; this report does not review or revert them.
- The architecture is grounded in current repo evidence but still needs a dedicated implementation sequence and code reviews.
- The latest final readiness evidence remains controlled-pilot only until typecheck and production/staging evidence are clean.

