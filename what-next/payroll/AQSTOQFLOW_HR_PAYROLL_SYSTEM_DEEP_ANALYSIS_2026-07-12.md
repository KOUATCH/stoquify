# AqStoqFlow HR/Payroll System Deep Analysis

Date: 2026-07-12

Scope: detailed repo-grounded analysis of the current HR/payroll system in this workspace, including what works, what does not yet work, why it is not complete, what is holding it back from full enterprise HR/payroll status, and what must be done to make it secure, professional, modern, and production-grade.

## Executive Decision

The HR/payroll system is no longer a prototype or a simple payroll screen. It has a real payroll kernel, dedicated Prisma models, service-owned workflows, RBAC and module-gated routes, fresh-auth-protected mutation actions, payment evidence, register and payslip surfaces, declaration lifecycle services, immutability triggers, policy gates, and close-pack evidence.

The correct current label is:

**Controlled pilot / limited-release payroll platform for implemented and evidence-gated workflows.**

The system should **not** yet be called a full unrestricted HR/payroll platform. The remaining gap is not mainly cosmetic. It is statutory breadth, production-grade country-pack proof, live authority/payment integrations, migration/backfill signoff, full browser certification, and a broader HRIS product surface around the payroll kernel.

The fastest safe path is not another broad dashboard expansion. It is a gated completion program:

1. Canonicalize the current status and remove stale contradictions.
2. Finish statutory country-pack proof with expert-reviewed formulas and golden fixtures.
3. Complete HR source-of-truth workflows around employees, contracts, compensation, attendance, leave, documents, and user mapping.
4. Certify payment, authority, declaration, register, payslip, and close flows with real provider/authority evidence.
5. Run full browser, accessibility, security, migration, and chaos gates before unrestricted production.

## Evidence Reviewed

This analysis inspected the current repo surfaces with static code search and existing saved release reports. It did not rerun the full Jest/build/browser gate suite in this turn.

Key evidence surfaces:

- `prisma/schema.prisma`: dedicated payroll enums and models for employees, contracts, rubriques, salary changes, payment destination changes, periods, attendance snapshots, runs, run lines, payslips, payslip lines, declarations, declaration evidence, payment batches, allocations, employee balance cases, and employee balance events.
- `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql`: database-level immutability triggers for finalized payroll runs, posted run lines, emitted payslips, released payment batches, released allocations, and declaration payloads.
- `services/payroll/*`: service-owned payroll command, register, payslip, declaration, payment, adapter, setup, statutory, proof-backfill, pilot certification, and readiness services.
- `actions/payroll/*`: server actions with RBAC and fresh-auth controls around sensitive payroll mutations and exports.
- `app/[locale]/(dashboard)/dashboard/payroll/*`: route-level module entitlement, organization context, and permission gates.
- `components/payroll/*`: command center, setup plane, workbenches, declaration execution, payslip self-service, register tie-out, payment reconciliation, and source-data workbenches.
- `config/permissions.ts`, `config/sidebar.ts`, `lib/security/rbac-permissions.ts`: payroll permission taxonomy, sidebar exposure, and risk classification.
- `package.json`: release/policy gates include payroll immutability runtime checks and broader policy gates.
- `what-next/payroll/*`: current and historical payroll readiness, statutory, browser-smoke, pilot-certification, and release evidence.
- `docs/domains/hr-payroll/*`: enterprise readiness assessment, hybrid reconstruction roadmap, and ordered prerequisite implementation roadmap.

## Current System Map

### Data And Persistence

The schema is payroll-specific rather than generic accounting metadata. It contains:

- Employee source records with organization ownership.
- Contract lifecycle records.
- Rubrique and employee assignment records.
- Salary change and payment destination change approval records.
- Payroll periods and attendance snapshots.
- Payroll runs and run lines.
- Payslips and payslip lines.
- Declarations and declaration evidence.
- Payment batches and allocations.
- Employee balance case/event records.
- Cameroon statutory supporting enums such as CNPS family allowance and risk group classifications.

This is a serious foundation. The data model is able to represent a real payroll lifecycle and not just a monthly amount.

### Service Ownership

The payroll domain has a broad service layer:

- `employee.service.ts`: employee source-data profile and evidence handling.
- `contract.service.ts`: contract workflow, create/update/terminate paths, employee resolution.
- `compensation.service.ts`: rubriques, employee assignments, salary change request/approve/reject/apply paths.
- `payment-evidence.service.ts`: payment destination changes and approved payment evidence assertions.
- `payroll-control.service.ts`: period creation, attendance snapshot freeze, payroll calculation, approve/post, payment release, declaration preparation, workbench read models.
- `payroll-register.service.ts`: payroll register read/export preparation.
- `payslip-self-service.service.ts`: payslip self-service read/export preparation.
- `declaration-lifecycle.service.ts`: declaration workbench and declaration evidence recording.
- `authority-adapter-execution.service.ts` and `authority-adapter-worker.service.ts`: authority adapter queue and worker processing.
- `payment-reconciliation.service.ts`: settlement evidence and reconciliation.
- `payroll-proof-backfill-executor.service.ts` and `payroll-proof-backfill-reconciliation.service.ts`: controlled proof backfill planning/execution/reconciliation.
- `payroll-pilot-cycle-certification.service.ts` and `payroll-final-release-readiness.service.ts`: release/certification evidence.
- `payroll-statutory-scenario-coverage.service.ts` and `payroll-tax-rule-evaluator.ts`: statutory coverage and rule evaluation surfaces.

The strongest architectural trait is that payroll truth is service-owned. The UI is not meant to calculate payroll by itself.

### Actions And Routes

Sensitive payroll mutations are server-action based and generally protected with:

- Organization context.
- Module entitlement checks.
- RBAC permission checks.
- Fresh auth on high-risk operations.
- Structured error responses.

The dashboard routes are organized around payroll work areas:

- Overview command center.
- Setup.
- Runs.
- Register.
- Payslips.
- Payments.
- Employees.
- Declarations.
- Contracts.
- Compensation.
- Attendance.

This route map is close to a real operator product, although it is not yet a complete HRIS.

### UI And Operator Experience

The UI includes a payroll command center and specialized workbenches, not only a table dump. It has:

- Readiness rails.
- Blocker flows.
- Proof/evidence drawers.
- Adapter operations panel.
- Final release readiness panels.
- Country-pack review intake.
- Pilot certification actions.
- Payslip self-service.
- Register tie-out.
- Payment reconciliation.
- Employee source data, contract, compensation, and attendance workbenches.

The system has moved in the right direction: from "payroll page" to "payroll command surface."

### Gates And Evidence

The saved reports show important control maturity:

- The July 2 pilot certification close-pack report marks the slice as passed, but keeps release posture at controlled pilot / limited release.
- The July 1 statutory review topics evidence-chain report passes the reviewed evidence slice while explicitly refusing to claim full statutory readiness.
- The July 2 browser smoke warmup gate report passes smoke-gate infrastructure hardening but keeps unrestricted production browser certification blocked until all payroll routes/viewports pass live authenticated browser smoke.
- The July 11 prompt-suite index stabilization report records full Jest, build, typecheck, lint, policy gates, and release gates passing for that slice, while preserving the browser-smoke residual risk.
- The current immutability runtime check report says payroll immutability is ready with zero blockers.
- The current regulatory hardcode gate report passes and reports no production regulatory hardcodes.

One important interpretation rule: older readiness documents that say database immutability was missing are historical. The current migration and runtime-check evidence supersede that blocker for the current workspace, assuming the migration is applied in the target database.

## What Is Working

### 1. Payroll Is A Real Domain, Not A UI Convenience

The system has a dedicated payroll schema, services, action layer, UI, route tree, tests, scripts, and reports. This is the foundation of a professional payroll product.

Why it matters:

- Payroll can be audited.
- Payroll can be protected by service rules.
- Payroll can be tied to accounting, payment, declarations, and close.
- Payroll state can be made immutable after critical transitions.

### 2. The Security Boundary Is Strong For A Pilot

The codebase has payroll permissions, module entitlements, route-level checks, action-level checks, fresh auth on sensitive operations, redaction patterns, and release gates.

Working examples:

- Payroll permission taxonomy exists in `config/permissions.ts`.
- Payroll sidebar exposure is module and permission aware in `config/sidebar.ts`.
- Payroll permissions are risk-classified in `lib/security/rbac-permissions.ts`.
- Payroll actions call permission/fresh-auth gates on high-risk mutations.
- Dashboard pages deny missing organization, module, or permission access before rendering workbench data.

This is one of the best parts of the current architecture. It already behaves like a control system, not just a CRUD module.

### 3. The Payroll Kernel Has Service-Owned Lifecycle Steps

The system models the lifecycle:

- Create payroll period.
- Freeze attendance snapshot.
- Calculate payroll run.
- Approve and post payroll run.
- Release payroll payment batch.
- Prepare declarations.
- Record declaration evidence.
- Reconcile settlement evidence.
- Export register and payslip evidence.

This lifecycle is the right backbone for enterprise payroll because it creates checkpoints and audit evidence.

### 4. Immutability Has Been Moved Into The Database Layer

The migration creates database triggers that block mutation after final/payable/legal states. The runtime check report marks the current immutability slice as ready.

This is crucial. Payroll correctness cannot depend only on React state, server action conventions, or developer discipline. Once a run, payslip, declaration, or payment batch is finalized, mutation must be blocked at the persistence boundary.

### 5. Accounting, Close, And Evidence Thinking Are Present

The payroll system is not isolated from finance. Tests and services show links to:

- Posting rules.
- Register tie-out.
- Payment evidence.
- Payment reconciliation.
- Data trust and close assurance.
- Forecast and analytics fail-closed behavior.

This is exactly the right direction for AqStoqFlow: payroll should be part of operational and accounting truth, not a separate black box.

### 6. The Product Has A Strong Control-Center Shape

The command center, workbenches, proof drawers, readiness panels, blocker flows, and release panels show a mature operator philosophy.

This is better than a payroll product that only lets a user enter a salary and generate a PDF. It is closer to a governed workflow where an accountant, HR operator, manager, auditor, and employee can each receive a safer view of the truth.

### 7. The System Has Honest Gates

The reports are careful. They pass what is verified and keep production claims blocked where evidence is missing.

That honesty is a strength. It prevents the platform from prematurely selling or trusting payroll outputs that have not been legally, operationally, or browser-certified.

## What Is Not Working Yet

The phrase "not working" here does not always mean a broken function. In this system, the larger issue is incomplete certification, incomplete product breadth, and intentionally blocked production paths.

### 1. Full Statutory Payroll Is Not Production-Ready

The saved statutory reports explicitly avoid claiming full production statutory readiness. The system still needs expert-reviewed, regulator-grounded country-pack formulas, legal references, source hashes, scenario coverage, and golden outputs.

Current gaps include:

- Complete Cameroon statutory tax and social contribution breadth.
- IRPP and other required deductions across real scenarios.
- Benefits, allowances, taxable/non-taxable treatment, corrections, overtime, leave, and edge cases.
- Effective-date rule versioning with legal provenance.
- Golden fixtures reviewed by a payroll/legal expert.
- Authority-ready declaration payload validation against real-world requirements.

Why this is not working yet:

- The codebase is correctly refusing to invent or hardcode legal rules without evidence.
- Payroll law is external truth. It must come from legal/regulatory sources and qualified review, not from UI assumptions.

### 2. Authority And Payment Provider Integrations Are Not Fully Production-Proven

There are adapter registry, execution, worker, fixture, provider settlement, and reconciliation services. That is good architecture. But unrestricted production needs live credentials, callbacks, receipts, provider failure handling, authority submission proof, and operational runbooks.

Current missing proof:

- Live authority adapter certification.
- Real submission acknowledgements and rejection handling.
- Production payment provider settlement receipts.
- Webhook/callback replay safety.
- Provider outage and partial-settlement drills.
- End-to-end production-like evidence from declaration to authority response.

Why this is not working yet:

- The system has built adapter lanes before completing live external certification.
- This is safer than pretending a fixture adapter equals production readiness, but it means the product remains limited.

### 3. Browser Certification Is Still Blocked For Unrestricted Production

The browser smoke infrastructure was hardened, and screenshots exist under payroll evidence folders, but the July 2 browser smoke report still says unrestricted production browser-smoke certification is blocked until all configured payroll routes and viewports pass a live authenticated run without timeout, redirect, connection refusal, or screenshot failures.

Why this is not working yet:

- The evidence tooling improved, but the full clean live run has not been completed.
- Prior failures appear partly related to local dev server/browser load and route performance/reliability.
- Payroll has many authenticated routes; browser validation must prove the whole route matrix, not only isolated components.

### 4. Production Migration And Backfill Are Not Fully Signed Off

The repo contains seed/backfill planning and proof-backfill execution/reconciliation services, but the production mutation path is rightly conservative.

Remaining requirements:

- Tenant-by-tenant source inventory.
- Dry-run diff evidence.
- Idempotency proof.
- Rollback or correction plan.
- Approval workflow.
- Reconciliation against current accounting and payment records.
- No silent mutation of historical payroll truth.

Why this is not working yet:

- Migrating payroll is high risk. A wrong backfill can corrupt legal, payment, and accounting evidence.
- The system is designed to block unsafe production mutation until proof exists.

### 5. The Broader HRIS Product Is Still Incomplete

The payroll kernel is much further along than the whole HR product.

A full HR/payroll system should include:

- Employee master data and identity mapping.
- Organization structure, positions, grades, departments, and reporting lines.
- Recruitment and onboarding.
- Contract lifecycle and document management.
- Leave, absence, scheduling, time, attendance, and overtime.
- Benefits administration.
- Compensation review and approvals.
- Disciplinary, performance, training, and compliance records.
- Offboarding and final settlement.
- Employee self-service.
- Manager self-service.
- HR analytics and audit-ready reports.

The current system covers parts of this, especially employees, contracts, compensation, attendance snapshot readiness, payslips, and payment evidence. It does not yet look complete as a full HRIS.

Why this is not working yet:

- The build has prioritized payroll evidence, accounting close, and statutory control before HR breadth.
- That is a defensible order, but the platform should not confuse payroll-kernel maturity with complete HR-suite maturity.

### 6. Attendance And Leave Need A Complete Source Engine

Attendance appears in the payroll route map and payroll can freeze attendance snapshots, but a complete HR/payroll platform needs a stronger upstream time and leave domain:

- Work schedules.
- Public holidays and country calendars.
- Leave policies and accruals.
- Absence approvals.
- Overtime rules.
- Lateness and exception handling.
- Timesheet imports.
- Biometric or POS shift integrations where applicable.
- Audit trail for attendance corrections.

One surface to review: the sidebar maps Payroll Attendance to a payment-destination permission. That may be an intentional shortcut, but it looks like a permission taxonomy mismatch that should be tightened before production.

### 7. Product UX Is Powerful But Not Yet Complete For Daily HR Operations

The command center is strong for operators and assurance. What is still needed is a smoother day-to-day HR/payroll workflow:

- Guided payroll run wizard.
- Clear "what must I fix before running payroll" queue.
- Employee lifecycle timeline.
- Manager approval inbox.
- HR operator task queue.
- Employee self-service profile and document center.
- Country-pack review workspace with legal proof status.
- Payroll correction workflow that is easy but controlled.
- Better onboarding/demo flow for a new tenant.

Why this is not working yet:

- The UI has grown from assurance/control surfaces first.
- The next product step is not more panels; it is role-specific workflows and task completion paths.

### 8. Report And Evidence Sprawl Can Confuse Current Truth

There are many excellent reports under `what-next/payroll` and `docs/domains/hr-payroll`. But some older reports contain blockers that newer reports have partly closed. For example, older documents flagged missing database immutability; current migration and runtime reports mark immutability ready.

Why this is holding the system back:

- Decision-makers may read an older report and believe a closed blocker is still open.
- Engineers may waste time fixing old gaps instead of current gaps.
- Release signoff needs a single canonical status index.

## Maturity Matrix

| Area | Current Maturity | What Works | What Is Missing |
| --- | --- | --- | --- |
| Tenant/org boundary | Strong pilot-ready | Routes/actions/services require org context and module entitlement | Keep proving every new route/export/adapter repeats this pattern |
| RBAC/fresh auth | Strong pilot-ready | Permission taxonomy, risk classification, fresh auth on sensitive actions | Final SoD matrix and negative tests for every high-risk path |
| Employee source data | Partial to good | Employee service, route, workbench, evidence references | Full HR master profile, documents, identity/user mapping, lifecycle completeness |
| Contracts | Partial to good | Contract service and create/update/terminate actions | Legal templates, signatures, renewals, probation, amendments, document proof |
| Compensation | Partial to good | Rubriques, assignments, salary changes, approval flow | Full benefits, allowances, taxable treatment, compensation review cycles |
| Attendance/time/leave | Partial | Attendance snapshot freeze and readiness surfaces | Full time, leave, schedule, overtime, holiday, correction, approval engine |
| Payroll runs | Good pilot-ready | Period, snapshot, calculate, approve/post, release, workbench | More statutory breadth, correction scenarios, concurrency and chaos matrix |
| Payslips | Good pilot-ready | Self-service read/export preparation and emitted-state immutability | Final branded/legal templates, delivery, archive, employee consent/read receipts |
| Register | Good pilot-ready | Register read/export and tie-out surfaces | More finance reconciliation scenarios and production signoff bundle |
| Payments | Partial to good | Payment batches, allocations, destination evidence, reconciliation services | Live provider certification, settlement callbacks, real receipts, outage drills |
| Declarations | Partial | Declaration prep, evidence lifecycle, authority adapter lane | Real authority submissions, accepted/rejected lifecycle, statutory payload proof |
| Statutory country packs | Not full production | Hardcode gate, tax rule evaluator, scenario coverage service | Expert-reviewed formulas, legal references, golden fixtures, effective-date versions |
| Accounting close | Good pilot-ready | Posting rules, close assurance, fail-closed analytics links | Production pilot cycle evidence and final executive signoff |
| Browser route certification | Partial | Smoke tooling hardened, route tests and screenshots exist | Clean live authenticated all-route/all-viewport run |
| Migration/backfill | Partial | Dry-run and proof-backfill services exist | Production tenant backfill approval, reconciliation, rollback/correction evidence |
| Observability/runbooks | Partial to good | Payroll runbook and release gate evidence exist | Production SLOs, alerts, escalation drills, support dashboards |
| Full HRIS breadth | Incomplete | Payroll-adjacent HR source workflows exist | Recruitment, onboarding, performance, training, disciplinary, full leave/benefits |

## What Is Holding The System Back

### 1. Legal And Statutory Truth

The largest blocker is not TypeScript. It is trusted statutory knowledge.

The system needs:

- Country-specific payroll laws.
- Effective-date rule versions.
- Legal references and source hashes.
- Expert review signoff.
- Golden test fixtures for common and edge cases.
- Declaration payload requirements confirmed by authority expectations.

Without this, the platform can be technically impressive and still legally unsafe.

### 2. Production External Evidence

Payroll becomes real when money moves and declarations are accepted. The current architecture has lanes for this, but final production status requires:

- Real payment provider credentials and settlement receipts.
- Real authority submission and response evidence.
- Callback replay/idempotency tests.
- Failure and reversal handling.
- Operational monitoring around external systems.

### 3. Complete Source Data

Payroll output is only as trustworthy as its inputs. The platform still needs a full source-data program for:

- Employee identity.
- Contracts.
- Compensation.
- Attendance.
- Leave.
- Benefits.
- Payment destination.
- Evidence documents.

Each source must have ownership, approval, correction, audit, and redaction rules.

### 4. End-To-End Browser Confidence

Because this is a dashboard-heavy product with authenticated routes, RBAC visibility, sidebars, role-specific workbenches, and responsive layouts, browser validation is not optional for final certification.

Static tests can prove permissions and data contracts. They cannot prove that every payroll operator can actually use the route matrix in a real browser.

### 5. Release Status Governance

The payroll project has many useful reports. It now needs one canonical release register that marks each blocker as:

- Open.
- Superseded.
- Closed with evidence.
- Closed only for controlled pilot.
- Blocked by external/legal review.

This will prevent old blockers and new evidence from colliding.

## Required Rectification Program

### Phase 0: Canonical Payroll Status Register

Create a single source of truth under `what-next/payroll` that indexes:

- Current decision.
- Current release posture.
- Open blockers.
- Superseded historical blockers.
- Evidence file for every closed blocker.
- Owner and next action for every remaining blocker.

Acceptance criteria:

- Older immutability warnings are marked superseded by current migration/runtime evidence.
- Browser smoke remains open until a clean live authenticated run is saved.
- Statutory breadth remains open until expert-reviewed golden fixtures exist.
- Production backfill remains open until tenant approval and reconciliation evidence exist.

### Phase 1: Statutory Country-Pack Completion

Build the country-pack program as the legal heart of payroll.

Must include:

- Formula registry with effective dates.
- Legal source reference and source hash for every rule.
- Expert reviewer identity and signoff metadata.
- Golden fixtures for common employee types and edge cases.
- Tests for tax, social contribution, allowances, deductions, benefits, overtime, leave, correction, termination, and final settlement.
- Declaration payload fixture tests.

Acceptance criteria:

- No formula ships without legal provenance and reviewed fixture coverage.
- The statutory scenario coverage service can explain exactly what is covered and what is not.
- Production readiness refuses unsupported countries, unsupported periods, and unsupported employee scenarios.

### Phase 2: Complete HR Source Data Foundation

Finish the HR side of HR/payroll, not just payroll execution.

Must include:

- Employee master profile lifecycle.
- User-to-employee matching and duplicate prevention.
- Organization structure, department, role, branch, manager, and position data.
- Contract documents and amendments.
- Compensation history and approval proof.
- Payment destination evidence.
- Employee documents with redaction and retention rules.
- HR-sensitive audit events.

Acceptance criteria:

- Payroll cannot run for employees with incomplete required source data.
- Source-data changes after payroll snapshot require a correction path, not silent mutation.
- Employee PII is redacted for unauthorized roles and exports.

### Phase 3: Attendance, Leave, Time, And Overtime Engine

Move beyond attendance snapshot freeze into a complete time/leave source system.

Must include:

- Work schedules.
- Country calendars and holidays.
- Leave policies and balances.
- Absence request and approval workflow.
- Overtime rules.
- Attendance correction workflow.
- POS/shift/biometric import boundary where applicable.
- Snapshot freeze and correction proof.

Acceptance criteria:

- Payroll calculations can trace every attendance amount to approved source evidence.
- Corrections after freeze create explicit adjustment evidence.
- Payroll attendance route uses a dedicated attendance/read permission taxonomy.

### Phase 4: Payroll Run, Correction, And Register Hardening

Harden the existing run kernel for production load and edge cases.

Must include:

- Idempotency keys on high-risk run mutations.
- Double-submit and concurrency tests.
- Correction run model for finalized periods.
- Closed-period blocker behavior.
- Register export signing/hashing.
- Payslip archive retention and reissue rules.
- Negative tests for mutation after finalized states.

Acceptance criteria:

- No high-risk payroll action can be accidentally applied twice.
- A finalized period can only be corrected through explicit adjustment/correction workflows.
- Register and payslip exports are reproducible, signed or hashed, and traceable.

### Phase 5: Payment, Declaration, And Authority Production Proof

Turn the adapter lanes into production-certified integrations.

Must include:

- Payment provider sandbox and live proof.
- Settlement receipt ingestion.
- Webhook replay and signature validation.
- Authority submission payload proof.
- Accepted/rejected declaration lifecycle.
- Retry, cancellation, reversal, and outage procedures.
- Provider and authority runbooks.

Acceptance criteria:

- A payroll payment batch can be reconciled to provider settlement evidence.
- Declaration status can be reconciled to authority response evidence.
- Provider/authority failures are visible, recoverable, and audited.

### Phase 6: Employee And Manager Self-Service

Build the human-facing layer without weakening the service-owned truth.

Must include:

- Employee payslip history and secure export.
- Employee profile view with redacted controls.
- Payment destination change request.
- Document request and upload.
- Leave request/status.
- Manager approvals for attendance, leave, compensation, and employee changes.

Acceptance criteria:

- Employees can access only their own permitted payroll/HR records.
- Managers see only scoped team records.
- Sensitive exports require fresh auth and are audited.

### Phase 7: Browser, Accessibility, And UX Certification

Complete the live browser proof.

Must include:

- Isolated dev server or production build smoke run.
- Saved auth state.
- All payroll routes.
- Desktop and mobile viewports.
- Screenshot evidence.
- RBAC visibility checks.
- Sidebar/menu overflow checks.
- Accessibility checks for core forms and workbenches.

Acceptance criteria:

- The hardened browser smoke command passes for every configured payroll route and viewport.
- No route redirects unexpectedly for an authenticated permitted actor.
- No payroll route fails from timeout, connection refusal, or missing screenshot.

### Phase 8: Migration, Backfill, And Pilot-Cycle Signoff

Move current tenants safely into the complete model.

Must include:

- Tenant data inventory.
- Dry-run diff.
- Backfill execution plan.
- Reconciliation.
- Rollback/correction plan.
- Approval workflow.
- Pilot payroll cycle certification.

Acceptance criteria:

- Every migrated payroll record has traceable source evidence.
- Historical records are not silently rewritten.
- Pilot cycle closes with no unresolved blockers.

### Phase 9: Final Production Release Gate

Only after the above should the platform move from controlled pilot to unrestricted production.

Final gate must require:

- Typecheck, lint, Jest, build.
- Prisma validation and migration safety.
- Policy gates.
- Payroll immutability runtime.
- Regulatory hardcode gate.
- Statutory scenario coverage.
- Browser route smoke.
- Security diff scan for payroll and public/API surfaces.
- Release evidence pack with executive signoff.

## Security And Control Requirements For A Bulletproof System

To become enterprise-grade, the HR/payroll platform should enforce:

- Service-owned calculations and mutations.
- Tenant isolation on every read/write/export.
- RBAC and separation of duties for maker/checker flows.
- Fresh auth for exports, approvals, payment release, declarations, and production backfill.
- Database immutability for finalized financial/legal artifacts.
- Correction workflows instead of destructive edits.
- Signed or hashed evidence exports.
- PII redaction by default outside permitted HR/payroll roles.
- Audit events for sensitive reads, writes, exports, and provider callbacks.
- Provider webhook signature validation and replay protection.
- Idempotency for all high-risk mutations.
- Secret isolation for provider and authority credentials.
- Production observability: logs, metrics, alerts, SLOs, runbooks, and incident playbooks.
- Disaster recovery and restore drills for payroll data.
- Legal provenance on all statutory rules.
- Explicit unsupported-scenario blocking.

## Product Requirements For A Full HR/Payroll Platform

To meet the dream of the platform, the product should become an integrated operating system for people, payroll, compliance, and finance.

Minimum complete product surface:

- HR setup and organization structure.
- Employee master data.
- Contract lifecycle.
- Compensation and benefits.
- Attendance, leave, overtime, and schedules.
- Payroll run lifecycle.
- Payroll corrections.
- Payslip self-service.
- Payment batches and reconciliation.
- Statutory declarations.
- Accounting posting and close assurance.
- Employee and manager portals.
- HR audit and compliance reports.
- Payroll analytics and cost forecasting.
- Country-pack marketplace or governed country-pack registry.
- Implementation/onboarding tooling for new tenants.

Important product principle:

**Do not let the UI become the payroll truth.** The UI should guide, explain, and collect evidence. Services and database controls should own the payroll truth.

## Recommended Immediate Next Slices

### Slice 1: Canonical Payroll Status Register

Create `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_CANONICAL_STATUS_REGISTER_2026-07-12.md`.

Purpose:

- Convert the report sprawl into one current decision surface.
- Mark stale blockers as superseded.
- Keep true blockers visible.

Why first:

- It prevents the team from chasing obsolete blockers or overclaiming readiness.

### Slice 2: Full Browser Smoke Certification

Run the hardened browser smoke gate against an isolated current app server or production build.

Purpose:

- Close the biggest remaining product-certification gap that is not legal/external.

Why next:

- This is a dashboard-heavy authenticated system. Production claims need real route proof.

### Slice 3: Statutory Country-Pack Golden Fixtures

Pick Cameroon as the first production country pack and create expert-reviewed statutory fixtures.

Purpose:

- Move from "calculation architecture" to "legally defensible payroll output."

Why next:

- This is the main difference between a pilot payroll engine and a real statutory payroll product.

### Slice 4: Attendance/Leave Source Engine

Create a complete time/leave source-data plan and implement the first narrow service-owned slice.

Purpose:

- Make payroll inputs as trustworthy as payroll outputs.

Why next:

- Payroll is only correct if attendance, leave, overtime, and absence data are correct.

### Slice 5: Provider/Authority Production Adapter Proof

Choose one payment provider lane and one declaration/authority lane for full sandbox-to-live certification.

Purpose:

- Prove the platform can move money and submit/track compliance evidence safely.

Why next:

- Full payroll is not complete until payment and statutory submission are operationally proven.

## Final Verdict

The HR/payroll system is structurally impressive and much closer to an enterprise platform than a typical dashboard module. It has the right instincts: service-owned truth, RBAC, fresh auth, immutability, evidence, close integration, policy gates, and conservative production claims.

What is holding it back is not lack of ambition. It is the remaining hard work that separates a strong pilot from a real statutory HR/payroll platform:

- Expert-certified statutory country packs.
- Live authority and payment provider proof.
- Complete HR source-data, attendance, leave, and benefits workflows.
- Production migration/backfill signoff.
- Full live browser route certification.
- A canonical release/status register.

The safe recommendation is:

**Do not declare unrestricted production HR/payroll yet. Continue controlled pilot for verified workflows, then execute the gated completion program above.**

