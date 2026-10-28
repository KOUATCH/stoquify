# AqStoqFlow HRIS/Payroll Source Truth Map

Date: 2026-07-12
Skill: `aqstoqflow-hris-payroll-02-source-truth-map`
Scope: documentation and service-boundary mapping only. No payroll calculation, HRIS schema, Prisma schema, service, route, or UI code was changed.
Next handoff: `aqstoqflow-hris-payroll-03-employee-identity`

## Executive Decision

The current codebase can keep its existing payroll kernel, proof services, accounting close integrations, and country-pack guardrails. The missing architectural foundation is not another payroll calculation pass. It is a canonical HRIS source-truth boundary that makes employee identity, contracts, compensation, payment destination, documents, org scope, and time/attendance the certified upstream facts that payroll consumes.

Decision: proceed to employee identity hardening next. Unrestricted production HRIS/payroll remains `NO-GO` until the HRIS-first chain in the status register is closed with evidence.

## Evidence Inspected

- Prerequisite status register: `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_STATUS_REGISTER_2026-07-12.md`.
- HRIS/payroll roadmap and blueprint: `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`, `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`.
- Prisma payroll and accounting models: `PayrollEmployee`, `PayrollContract`, `PayrollRubrique`, `PayrollEmployeeRubriqueAssignment`, `PayrollSalaryChangeRequest`, `PayrollPaymentDestinationChangeRequest`, `PayrollPeriod`, `PayrollAttendanceSnapshot`, `PayrollRun`, `PayrollRunLine`, `PayrollPayslip`, `PayrollDeclaration`, `PayrollDeclarationEvidence`, `PayrollPaymentBatch`, `PayrollEmployeeBalanceCase`, `PayrollEmployeeBalanceEvent`, `OrganizationAccountingSettings`, and `AuditLog`.
- Payroll actions and services under `actions/payroll/` and `services/payroll/`.
- Accounting close and data-trust consumers under `services/accounting/close-assurance-pack.service.ts`, `services/accounting/close-assurance.service.ts`, and `services/accounting/data-trust.service.ts`.
- Permission and risk maps in `config/permissions.ts` and `lib/security/rbac-permissions.ts`.
- Existing payroll readiness, statutory, proof-backfill, browser, and final-readiness reports under `what-next/payroll/`.

## Source Truth Matrix

| Data domain | Current storage or surface | Source-truth owner | Consumers | Audit rule | Redaction rule | Mutation rule |
| --- | --- | --- | --- | --- | --- | --- |
| Tenant, organization, membership, and permissions | `User`, `Organization`, memberships, RBAC helpers, permission maps | Platform Auth/RBAC | HRIS, payroll, accounting, assurance, compliance, country pack flows | Audit role, membership, permission, and tenant-context changes | No cross-tenant payloads; permission exports must avoid secrets and session detail | Mutate only through auth/org/RBAC services and guarded admin actions |
| Employee master profile | Currently `PayrollEmployee`; target logical owner is HRIS employee master | HRIS | Payroll input readiness, payroll snapshots, payslips, manager/self-service, accounting aggregates | Audit create/update/deactivate, duplicate decisions, user mapping, and eligibility changes | Mask/hash tax id, social id, payment destination, and person-level payroll facts | HRIS is the writer. Payroll may consume certified snapshots only |
| User-to-employee mapping | `PayrollEmployee.userId` with tenant-scoped uniqueness | HRIS plus Auth/RBAC boundary | Self-service payslip access, employee profile, manager scope, payroll eligibility | Audit link, unlink, stale-user resolution, and denied access | Never expose another employee identity through self-service | Mutate through employee identity workflow only; validate tenant scope and duplicate risk next |
| Org, branch, department, location, position, manager scope | Partial fields on `PayrollEmployee` plus org/location models | HRIS organization structure | Manager access, approval routing, readiness, reports, accounting dimensions | Audit effective-dated org and manager changes | Manager views receive only scoped and redacted employee data | HRIS org-structure workflow owns writes; payroll must not infer manager scope |
| Contract eligibility and employment terms | `PayrollContract` | HRIS contract lifecycle | Payroll readiness, payroll snapshots, declarations, accounting dimensions | Audit signed document hash, activation event, termination, amendment, and effective dates | Salary and contract attachments are role-redacted | Mutate through HRIS contract workflow with approval/evidence; payroll consumes approved effective contract |
| Compensation source data | `PayrollRubrique`, `PayrollEmployeeRubriqueAssignment`, `PayrollSalaryChangeRequest` | HRIS compensation controls for employee amounts; Country Pack/Compliance for statutory meaning; Accounting for posting account mapping | Payroll engine, payslips, declarations, accounting ledger, assurance | Audit request, approval, rejection, application, effective date, and evidence hash | Person-level salary and component amounts are redacted outside authorized payroll/HR views | Maker-checker only. No client-side compensation truth. Split owner by field meaning |
| Payment destination | `PayrollEmployee` masked/hash fields plus `PayrollPaymentDestinationChangeRequest` | HRIS document/evidence and payment-destination approval | Payroll payment release, provider settlement, reconciliation, assurance | Audit request, approval, rejection, application, evidence hash, and business event | Store and expose masked/hash destination only; no raw bank, phone, credential, or provider payload in reports | HRIS owns approved destination; payroll uses approved hash for payment release |
| Time, leave, attendance, overtime | `PayrollAttendanceSnapshot` and attendance readiness services | HRIS time/leave/attendance | Payroll period readiness, payroll run snapshots, correction workflows | Audit freeze, approval, correction, and source period | Person-level absence/attendance detail should be scoped and redacted in reports | Payroll consumes immutable approved snapshots; corrections are diffed and re-certified |
| Payroll period and input readiness | `PayrollPeriod` | Payroll operations consuming HRIS readiness | Payroll run calculation, approval, posting, close assurance | Audit lock, approval, close, and reopen decisions | Period status may be visible; person-level blockers remain scoped | Payroll can lock and approve readiness, but cannot rewrite upstream HRIS facts |
| Payroll run and run lines | `PayrollRun`, `PayrollRunLine` | Payroll | Payslips, payment batches, declarations, ledger posting, assurance | Audit calculation, review, approval, posting, correction, status transition, and source hashes | Person-level run lines are restricted to payroll/authorized HR and self-owned payslip contexts | Payroll owns immutable certified payroll snapshots after calculation; corrections use controlled run/delta paths |
| Payslips and payslip lines | `PayrollPayslip`, `PayrollPayslipLine`, payslip self-service actions | Payroll | Employee self-service, HR/payroll operators, auditors, assurance | Audit emit, view/export, archive hash, watermark, and source link | Self-service is own-employee only; export requires fresh auth and redaction metadata | Payslip artifacts are emitted from approved payroll run output only |
| Declarations and statutory evidence | `PayrollDeclaration`, `PayrollDeclarationEvidence`, authority adapter services | Payroll plus Compliance/Country Pack and authority adapter | Compliance, close assurance, data-trust, auditors | Audit lifecycle transitions, authority proof, source register hash, country-pack register hash | No raw authority payload, employee identity, salary line, credential secret, or legal payload in proof rows | Declare only from certified payroll register and country-pack evidence; authority lifecycle changes require proof |
| Payment batches and settlement | `PayrollPaymentBatch`, `PayrollPaymentAllocation`, provider adapter and settlement services | Payroll payments plus provider/reconciliation boundary | Treasury, accounting, close assurance, data-trust | Audit request, release, provider proof, settlement proof, callback, and reconciliation | Mask destination and provider payloads; report only ids, hashes, statuses, attempts, and totals | Release only with approved payroll run and approved destination; settlement is evidence-backed and idempotent |
| Employee balances, advances, recoveries, corrections | `PayrollEmployeeBalanceCase`, `PayrollEmployeeBalanceEvent` | Payroll corrections and settlement controls | Payroll runs, payslips, payment reconciliation, accounting close | Audit open, plan, apply, settle, write off, and close-impacting event | Person-level recovery detail stays in payroll; accounting receives aggregate/source-linked proof | Append-only event model; settlement and write-off require controlled permissions and proof |
| Country-pack and statutory rule provenance | Country pack registry/services, statutory fixture reports, `PayrollRubrique` country-pack fields, `OrganizationAccountingSettings` statutory setup | Country Pack/Compliance | Payroll engine, declarations, setup readiness, accounting close, assurance | Audit source hash, legal reference, expert review, fixture coverage, capability status | No invented statutory formulas or raw legal payload leaks in UI reports | Country-pack owner controls statutory formulas and capability state; payroll fails closed on missing provenance |
| Accounting posting and ledger truth | Ledger/accounting services, `OrganizationAccountingSettings`, source-link and close services | Accounting | Payroll finalization, assurance, auditors, reports | Audit posting, source link, reversal, close invalidation, certification | Close packs expose aggregate payroll forecast and proof only; person-level amounts redacted | Accounting owns ledger truth; payroll supplies source-linked proof, not ledger rewrites |
| Assurance, data trust, and proof packs | `AuditLog`, close-assurance pack, data-trust blockers, proof reports | Assurance | Release gates, auditors, accounting close, security review | Audit proof generation, blocker state, certification, invalidation, and export | Proof packs are redacted and hash/evidence oriented | Assurance consumes domain proof and blocks close/release on missing evidence |

## Ambiguous Multi-Domain Fields

No unresolvable multi-writer conflict was found that requires stopping this slice. The following fields have dual-domain responsibilities and need explicit downstream implementation discipline:

| Field or concept | Safe ownership decision | Risk if ignored |
| --- | --- | --- |
| `PayrollEmployee` as current storage for employee master data | Logical owner is HRIS even while current storage is payroll-named | Payroll continues to invent HR truth and self-service scope becomes fragile |
| `PayrollEmployee.userId` | HRIS employee identity owns mapping; Auth/RBAC verifies actor and tenant | Wrong employee sees payslip, manager sees out-of-scope employee, or duplicate user links pass |
| Compensation rubriques | HRIS owns employee assignment and amount; Country Pack/Compliance owns statutory meaning; Accounting owns posting-map validation | Wrong payslip, wrong statutory declaration, or wrong ledger posting |
| Payment destination hash/masked fields | HRIS owns approved destination evidence; Payroll owns payment use of the approved destination | Payment release could bypass maker-checker or proof of destination ownership |
| Attendance snapshots | HRIS owns source and approval; Payroll owns frozen consumption | Payroll could calculate from mutable attendance data |
| Declaration country-pack proof | Country Pack/Compliance owns statutory provenance; Payroll owns declaration lifecycle | Declarations could be filed from unreviewed formulas |

## Tenant, RBAC, And Policy-Gate Decision

The policy gate should remain fail-closed:

- HRIS, payroll, accounting, assurance, compliance, and country pack workflows must all carry `organizationId`.
- Critical payroll permissions are present and risk-rated, including employee management, contracts, compensation, salary changes, payment destination changes, attendance freeze, run approval/posting, payslip export, payment release/reconciliation, declarations, and export creation.
- Sensitive mutations already use fresh auth in payroll actions for salary, contracts, payment destination, run approval, payment release, employee balance settlement, declarations, payslip export, and proof backfill execution.
- Next skill must verify that employee identity creation/read/update cannot cross tenant scope and that self-service resolves only the current actor's employee record.

## Audit And Redaction Rules

- Person-level payroll values, tax/social identifiers, payment destinations, raw provider payloads, authority payloads, credential secrets, and document bodies stay outside general reports and close packs.
- Public or cross-functional proof must use masked values, hashes, counts, totals, status, timestamps, business event ids, and source links.
- Audit must record purpose, actor, organization, permission context, source model, source id, and business-event/proof hashes for sensitive employee, compensation, payment, declaration, and close actions.
- Accounting and assurance consume payroll proof through register tie-out, component proof, payment settlement proof, declaration lifecycle proof, source links, and close invalidation evidence.

## Current Blockers After This Slice

| Blocker | Status after map | Required next skill |
| --- | --- | --- |
| Canonical source-truth ownership map | Ready for review | `aqstoqflow-hris-payroll-02-source-truth-map` |
| Employee identity, duplicate risk, and user-to-employee mapping | Open | `aqstoqflow-hris-payroll-03-employee-identity` |
| Org, branch, position, and manager scope | Open | `aqstoqflow-hris-payroll-04-org-structure-manager-scope` |
| Contract lifecycle and approved eligibility evidence | Open | `aqstoqflow-hris-payroll-05-contract-lifecycle` |
| Compensation/rubrique source truth and maker-checker changes | Open | `aqstoqflow-hris-payroll-06-compensation-controls` |
| HR document evidence, retention, and redaction policy | Open | `aqstoqflow-hris-payroll-07-document-evidence-redaction` |
| Time, leave, attendance, overtime, freeze, and corrections | Open | `aqstoqflow-hris-payroll-08-time-leave-attendance` |
| Service-owned HRIS input readiness gate | Open | `aqstoqflow-hris-payroll-09-input-readiness-gate` |
| Immutable payroll input snapshots and correction diffing | Open | `aqstoqflow-hris-payroll-10-snapshot-correction` |
| Payroll engine consumption of certified HRIS snapshots | Open | `aqstoqflow-hris-payroll-11-payroll-engine-integration` |
| Broader statutory country-pack provenance and fixture breadth | Open / partial | `aqstoqflow-hris-payroll-12-country-pack-provenance` |
| Payment and declaration proof for unrestricted production | Open / partial | `aqstoqflow-hris-payroll-13-payments-declarations-proof` |
| Payroll accounting close assurance for unrestricted production | Open / partial | `aqstoqflow-hris-payroll-14-accounting-close-assurance` |
| Employee and manager self-service across HRIS/payroll | Open | `aqstoqflow-hris-payroll-15-self-service` |
| Full browser, accessibility, RBAC negative, and release evidence | Open / partial | `aqstoqflow-hris-payroll-16-browser-accessibility-release` |
| Tenant migration, backfill dry-run, rollback, and pilot signoff | Open | `aqstoqflow-hris-payroll-17-migration-backfill-pilot` |
| Final unrestricted production go/no-go | Open | `aqstoqflow-hris-payroll-18-final-readiness` |

## Gates Run

- Inspected current status register, HR/payroll roadmap, HRIS/payroll blueprint, Prisma payroll models, payroll actions/services, accounting close/data-trust consumers, permission maps, and existing payroll readiness/proof reports.
- Verified the ownership vocabulary required by the skill appears in this report: HRIS, payroll, accounting, assurance, compliance, and country pack.
- No unit tests were run because this slice made no production code changes.

## Handoff To Employee Identity

`aqstoqflow-hris-payroll-03-employee-identity` should begin with these acceptance criteria:

- Every employee identity is tenant-scoped and cannot be created, read, updated, linked, or self-served outside `organizationId`.
- `userId` to employee mapping is unique, auditable, duplicate-aware, and stale-user safe.
- Employee identity payloads are redacted by role and purpose.
- Payroll run eligibility can trace every included employee to an approved HRIS identity and active contract.
- Self-service payslip/profile access is own-employee only unless a manager scope service explicitly authorizes the read.
