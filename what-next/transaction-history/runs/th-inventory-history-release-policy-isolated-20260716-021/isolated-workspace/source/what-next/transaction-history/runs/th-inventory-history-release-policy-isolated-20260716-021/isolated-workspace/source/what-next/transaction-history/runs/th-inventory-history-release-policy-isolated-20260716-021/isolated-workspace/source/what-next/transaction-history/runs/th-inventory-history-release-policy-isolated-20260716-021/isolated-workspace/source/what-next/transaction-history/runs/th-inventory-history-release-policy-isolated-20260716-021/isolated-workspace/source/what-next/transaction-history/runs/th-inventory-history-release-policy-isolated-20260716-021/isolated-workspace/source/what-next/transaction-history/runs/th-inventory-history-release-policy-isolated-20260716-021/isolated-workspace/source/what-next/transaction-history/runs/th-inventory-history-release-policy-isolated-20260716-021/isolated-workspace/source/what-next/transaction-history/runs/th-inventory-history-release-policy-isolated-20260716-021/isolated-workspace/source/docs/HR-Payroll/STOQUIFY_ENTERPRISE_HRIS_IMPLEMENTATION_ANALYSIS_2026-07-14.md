# Stoquify Enterprise HRIS Implementation Analysis

Date: 2026-07-14
Source proposal: `docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
Status: architecture and execution-planning artifact only. No production code, schema, or installed skill folder was changed by this analysis.

## Executive Recommendation

Stoquify should continue toward a full enterprise HRIS/payroll platform, but the next product should be a payroll-ready People Core, not a broad generic HR suite and not a payroll rewrite.

The codebase already has a serious payroll-grade HR source foundation: employee master records, contracts, compensation controls, payment-destination evidence, attendance snapshots, payslip self-service, payroll readiness, certified payroll input proof, payment/declaration proof, and accounting close-assurance hooks. The missing move is to create a first-class HRIS/People boundary that owns people truth and makes payroll consume certified HRIS snapshots.

Final decision: proceed with HRIS-first implementation in controlled phases. Unrestricted production HRIS/payroll remains NO-GO until the HRIS boundary, time/leave source engine, document retention/access controls, manager/employee self-service, production provider/statutory evidence, tenant migration/backfill, browser/RBAC/accessibility evidence, and final readiness attestation are complete.

## Evidence Base

The analysis used the new proposal and verified it against repo evidence:

- `docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_STATUS_REGISTER_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SOURCE_TRUTH_MAP_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_INPUT_READINESS_GATE_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SNAPSHOT_CORRECTION_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ENGINE_INTEGRATION_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PAYMENTS_DECLARATIONS_PROOF_2026-07-14.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ACCOUNTING_CLOSE_ASSURANCE_2026-07-14.md`

Live repo checks found:

- Payroll domain models exist in `prisma/schema.prisma`: `PayrollEmployee`, `PayrollContract`, `PayrollEmployeeRubriqueAssignment`, `PayrollSalaryChangeRequest`, `PayrollPaymentDestinationChangeRequest`, `PayrollAttendanceSnapshot`, `PayrollRun`, `PayrollPayslip`, `PayrollDeclaration`, `PayrollPaymentBatch`, and `AuditLog`.
- Payroll services/actions/components/routes are extensive under `services/payroll`, `actions/payroll`, `components/payroll`, and `app/[locale]/(dashboard)/dashboard/payroll`.
- No first-class `services/hris`, `actions/hris`, or `components/hris` boundary was present.
- `config/sidebar.ts` already has a People section, but the active workforce surfaces are still payroll routes.
- `config/permissions.ts` and `lib/security/rbac-permissions.ts` define many payroll permissions and critical/high risk classifications, but no separate HRIS permission taxonomy was observed.
- `services/security/redaction-policy.service.ts` contains payroll-sensitive redaction rules and can be extended for HRIS.
- The repo has real verification assets: Jest, Playwright, payroll route smoke tests, `scripts/payroll-browser-smoke.js`, `tests/e2e/payroll-authenticated-smoke.spec.ts`, policy gates, Prisma validation, and payroll immutability runtime checks.

## Language Locked

- HRIS means the people system of record: employee identity, employment lifecycle, organization assignment, contracts, documents, time/leave, approvals, profile history, and employee/manager self-service.
- People Core means the first safe HRIS product wedge: employee, org, contract, compensation, document, payment-destination, attendance input, and payroll readiness truth.
- Payroll means calculation, runs, run lines, payslips, corrections, payments, declarations, and statutory/payroll evidence built from certified HRIS input.
- Certified HRIS snapshot means immutable, tenant-scoped, evidence-hashed, approved input for a payroll period.
- Enterprise-grade means service-owned truth, tenant isolation, RBAC, maker-checker, fresh auth, redaction, audit, retention, browser evidence, migration signoff, and release attestation. It should not be described as literally bulletproof.

## What Is Working

1. Payroll is a real domain, not a UI convenience.
   The system has service-owned payroll flows, Prisma persistence, action-level controls, command read models, proof drawers, payment/declaration proof, and accounting close hooks.

2. Employee source data exists.
   `PayrollEmployee` already stores organization scope, user mapping, employee number, names, status, dates, country, location, department, job title, cost center, masked/hash identifiers, masked/hash payment destination data, and relations to contracts, compensation, attendance, run lines, payslips, allocations, and balances.

3. Contracts and compensation have useful control shape.
   Contract lifecycle and compensation services already handle effective dates, evidence, overlap/eligibility concerns, salary changes, maker-checker behavior, fresh auth, and audit-friendly hashes.

4. Payment destination evidence is stronger than a typical payroll MVP.
   The system uses masked/hash destination fields, request/approve/apply actors, reasons, evidence hashes, and business events. That can become an HRIS-owned payment-destination workflow.

5. Payroll readiness, snapshots, payments/declarations, and close assurance now carry certified input proof.
   The 2026-07-12 and 2026-07-14 reports show progression from input readiness through snapshot correction, engine integration, payment/declaration proof, and accounting close assurance.

6. Security posture is credible for controlled pilot behavior.
   Existing payroll permissions, module-aware sidebar exposure, risk-classified RBAC, fresh-auth-protected actions, redaction policy, route smoke tests, and policy gates provide a strong base.

7. The UI direction is already compatible with enterprise HRIS.
   Command center panels, proof drawers, workbenches, readiness badges, and route smoke evidence fit a role-aware People workspace.

## What Is Not Working Yet

1. HRIS does not yet own people truth.
   People facts are currently payroll-owned or payroll-named. That creates long-term risk because payroll is forced to validate or reconstruct HR truth late in the chain.

2. There is no first-class HRIS service/action/component boundary.
   The proposal recommends `services/hris/*`, `/dashboard/people/*`, and HRIS permissions. The live repo check did not find those boundary folders yet.

3. Time, leave, and attendance are not full HRIS source engines.
   Payroll attendance snapshots exist, but a full system needs schedules, calendars, holidays, leave policies, balances, requests, approvals, overtime, anomalies, imports, corrections, and certified period snapshots.

4. Manager scope is still location-based.
   `org-manager-scope` is useful, but it is not yet an effective-dated reporting-line, position, delegation, and manager-history model.

5. Employee self-service is narrow.
   Payslip self-service exists. Full HRIS self-service still needs own profile, documents, leave/time, payment-destination requests, correction requests, and controlled employment history.

6. Document governance is incomplete.
   Metadata/hashes are not enough for enterprise document handling. Raw files require secure storage, short-lived access, malware scanning, legal hold, retention classes, deletion proof, and redacted exports.

7. HRIS permissions are not separated from payroll permissions.
   Payroll permissions are mature, but HRIS needs its own taxonomy for employees, lifecycle, documents, time/leave, org structure, manager scope, and self-service.

8. Production evidence remains bounded.
   Controlled pilot evidence exists. Unrestricted production still needs live provider/authority evidence, statutory/country-pack expert review coverage, migration/backfill signoff, browser/accessibility/RBAC negative evidence, and final release attestation.

## Why The System Is Held Back

The blocker is not lack of payroll effort. The blocker is ownership order.

If payroll owns or invents people truth, the platform risks duplicate employee records, wrong payslips, untraceable salary changes, weak statutory declarations, unclear approvals, cross-tenant leaks, unsafe corrections, and accounting close exceptions. The correct chain is:

```text
HRIS People Truth
  -> Approved Time, Leave, Attendance
  -> Certified Payroll Input Readiness
  -> Payroll Run, Payslip, Register, Corrections
  -> Payments, Declarations, Reconciliation
  -> Accounting Posting And Close Assurance
  -> Redacted Auditor/Owner Proof
```

Every link must be tenant-scoped, permission-gated, evidence-hashed, redacted, and auditable.

## Target Architecture

### Boundary Model

| Boundary | Owns | Must Not Own |
| --- | --- | --- |
| HRIS / People | Employee identity, lifecycle, org assignments, contracts, documents, time/leave approval, payment-destination approval, HR approvals | Payroll calculations, statutory formula meaning, ledger posting |
| Payroll | Readiness verdicts, certified input snapshots, runs, run lines, payslips, corrections, payment batches, declarations | Mutable employee master truth |
| Accounting / Finance | Ledger posting, reconciliation, close, data trust, financial reporting | HR profile mutation |
| Auth / RBAC | User identity, tenant membership, session, permissions, fresh auth | Business truth |
| Security / Privacy | Redaction, sensitive access audit, export controls, retention, legal hold, secret/key controls | Operational HR decisions |
| Country Pack / Compliance | Statutory formula provenance, legal references, golden fixtures, authority capability state | Employee-specific HR decisions |

### Data Strategy

Phase 1 should be facade-first, not schema-big-bang.

- Add `services/hris/*` facades over existing payroll source tables.
- Keep `PayrollEmployee` as compatibility storage during transition.
- Make HRIS services the only new writer for people-source facts.
- Make payroll consume HRIS-certified snapshots instead of live mutable HR data.
- Introduce dedicated HRIS models only where the payroll naming becomes misleading or insufficient.
- Use expand/contract migrations, dry-run backfills, tenant-batched reconciliation, and rollback/correction scripts.

### UI Strategy

Create `/dashboard/people` as a real workspace beside payroll.

Initial screens:

- People overview: workforce state, risk, pending approvals, readiness by period.
- Employee directory: redacted list payloads with status, job, department, location, readiness, and risk.
- Employee profile: overview, employment, contracts, time/leave, documents, compensation, payroll, history.
- Team workspace: location/team scope first, reporting lines later after org model exists.
- Time and leave: policy, balance, request, approval, correction, payroll impact.
- Document evidence: metadata, expiry, retention, access decision, proof hash.
- Self-service: profile, documents, leave/time, payment destination requests, payslips.

Do not copy raw payroll workbenches into HRIS. HRIS should manage people truth; payroll should display certified calculation and proof state.

## Implementation Roadmap

| Phase | Goal | Main Work | Acceptance Criteria |
| --- | --- | --- | --- |
| 0. Status and boundary | Establish current truth before code churn | Refresh status register, source-truth map, HRIS route/service boundary plan, permission matrix | No conflicting blocker status; HRIS/payroll/accounting ownership is explicit |
| 1. HRIS facade | Create People Core owner without risky schema split | `services/hris/*` read models over payroll source tables; `actions/hris/*`; route access contracts | Payroll still works; new people-source mutations go through HRIS services |
| 2. Employee identity and lifecycle | Make employee profile and status authoritative | Employee profile, user mapping, duplicate detection, lifecycle timeline, starter/leaver workflows | Tenant/RBAC/redaction tests pass; payroll readiness sees HRIS employee truth |
| 3. Org, position, manager scope | Stop overstating location scope as reporting line truth | Org units, positions, effective assignments, manager delegation, location-scope compatibility | Managers cannot see out-of-scope employees; scope history is auditable |
| 4. Contracts, documents, compensation | Move payroll-affecting HR facts behind approvals | Contract approval, document evidence register, compensation assignment approvals, payment-destination workflow | Draft/unapproved/stale facts fail payroll readiness |
| 5. Time, leave, attendance | Build the upstream work-time truth engine | Leave policies, balances, requests, schedules, attendance imports, overtime, corrections, freeze | Payroll cannot run from mutable or uncertified time/leave data |
| 6. Payroll snapshot contract | Lock HRIS-to-payroll handoff | Certified input snapshots, source hashes, diffing, correction planning | Payroll uses snapshots only; later HRIS edits create corrections |
| 7. Self-service | Open safe human workflows | Employee and manager portals, own-record resolvers, document/leave/payment requests | Own-record and manager-scope negative tests pass; no sensitive DOM leaks |
| 8. Finance/accounting assurance | Keep money truth and close truth aligned | Register-to-ledger tieout, payment/declaration proof, close blockers, redacted auditor packs | Accounting close fails closed on missing payroll/HRIS proof |
| 9. Migration and pilot | Move real tenants safely | Data quality audit, backfill dry runs, idempotency, reconciliation hashes, pilot close signoff | No destructive production backfill without tenant signoff |
| 10. Release certification | Decide go/no-go honestly | Full gate replay, browser/mobile/a11y/RBAC negative evidence, final attestation | Launch decision tied to commit SHA, scope, evidence freshness, and owner signoff |
| 11. Extended HRIS | Add broader HR modules | Recruitment, performance, training, disciplinary, surveys, workforce planning | Each extension reuses HRIS boundary, RBAC, redaction, audit, and release governance |

## Security And Control Gates

Minimum gates before any production HRIS/payroll claim:

- Tenant isolation: every HRIS/payroll read and write includes organization scope; add negative cross-tenant tests.
- RBAC separation: HR admin, payroll admin, manager, employee, accountant, auditor, and owner roles are distinct.
- Fresh auth: salary, contract, payment destination, termination, retroactive attendance, document reveal/download, export, payment release, declaration management, backfill, and certification require step-up.
- Maker-checker: high-impact HRIS/payroll changes require requester and approver separation.
- Redaction: list payloads never include raw salary, identifiers, bank/mobile-money details, tax/social identifiers, raw documents, or provider/authority payloads.
- Audit: HRIS and payroll evidence streams are append-only where legally relevant, with actor, tenant, before/after risk class, source hash, and purpose.
- Retention: documents and audit proof have retention class, legal hold, deletion policy, and export proof.
- Browser evidence: authenticated desktop/tablet/mobile smoke for People and Payroll routes.
- Accessibility: keyboard flow, labels, focus, contrast, and no-overlap checks for core forms and workbenches.
- Migration: tenant-batched dry runs, reconciliation hashes, idempotency reruns, rollback/correction proof.
- Release: final readiness attestation tied to commit SHA, tenant/country scope, environment, evidence freshness, and owner signoff.

## Immediate Next Implementation Slices

1. Refresh the canonical HRIS/payroll status register against the new 2026-07-14 proposal and the 2026-07-14 accounting close evidence.
2. Add a narrow HRIS facade design doc or code spike for `services/hris/employee.service.ts`, `services/hris/movement-history.service.ts`, and `actions/hris/*` without migrating schema yet.
3. Add `hris.*` permission taxonomy and risk classification beside existing `payroll.*` permissions.
4. Add `/dashboard/people` route shell and route-access tests using existing dashboard primitives.
5. Build employee directory/profile read models over current payroll employee storage with default redaction.
6. Build movement-history read model from audit/business events before adding broad new HR screens.
7. Design document storage/retention/legal-hold model before raw document downloads are exposed.
8. Design time/leave contracts before leave request UI is built.
9. Keep payroll running only from certified HRIS input proof and fail closed when proof is absent, stale, or mismatched.

## Final Go/No-Go

Go for: controlled implementation of payroll-ready People Core, facade-first HRIS boundary, HRIS permissions, redacted People workspace, and service-owned certified payroll input.

No-go for: calling the platform a full unrestricted enterprise HRIS/payroll product, rewriting the payroll kernel, adding a broad generic HR suite before People Core, or exposing self-service/manager flows without own-record and scope-negative tests.

The strategy is sound because it preserves the strong payroll, payment, declaration, accounting, and close-assurance work already present while moving people truth to the correct upstream owner.
