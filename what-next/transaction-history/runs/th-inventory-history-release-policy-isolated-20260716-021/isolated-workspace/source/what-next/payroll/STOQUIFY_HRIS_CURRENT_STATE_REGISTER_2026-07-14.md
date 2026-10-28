# Stoquify HRIS Current State Register

Date: 2026-07-14
Skill: `stoquify-hris-01-current-state-register`
Status: Completed
Next handoff: `stoquify-hris-02-people-boundary-facade`

## Overall Decision

Stoquify is ready for the first HRIS People Core implementation slice, but it is not ready to claim unrestricted enterprise HRIS/payroll production readiness.

Current posture:

- Controlled pilot / limited release remains valid only for implemented, evidence-gated payroll workflows.
- Full HRIS/payroll production remains NO-GO until People Core, HRIS boundary, time/leave, document governance, self-service, migration, browser/accessibility/RBAC, and release attestation are complete.

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.

## Current Confirmed Evidence

| Area | Current Status | Evidence |
| --- | --- | --- |
| Strategic HRIS proposal | Present | `docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md` |
| Implementation analysis | Present | `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md` |
| Skill-system blueprint | Present | `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md` |
| Prompt artifact | Present | `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_PROMPT_2026-07-14.md` |
| People Core skill suite | Created and installed | `stoquify-hris-00-orchestrator` through `stoquify-hris-20-extended-hris` |
| Payroll domain models | Present | `PayrollEmployee`, `PayrollContract`, compensation, payment destination, attendance snapshot, run, payslip, declaration, payment batch, balance, and audit models in `prisma/schema.prisma` |
| Payroll services/actions/components | Present | `services/payroll/`, `actions/payroll/`, `components/payroll/`, payroll dashboard routes |
| Payroll readiness and snapshot proof | Present | 2026-07-12 input readiness, snapshot correction, and engine integration reports |
| Payment/declaration proof | Present | `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PAYMENTS_DECLARATIONS_PROOF_2026-07-14.md` |
| Accounting close assurance proof | Present | `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ACCOUNTING_CLOSE_ASSURANCE_2026-07-14.md` |
| Browser/payroll smoke assets | Present | `scripts/payroll-browser-smoke.js`, `tests/e2e/payroll-authenticated-smoke.spec.ts`, `what-next/payroll/screenshots/` |

## Open Blockers

| Blocker | Status | Required Next Skill |
| --- | --- | --- |
| First-class HRIS service boundary | Open | `stoquify-hris-02-people-boundary-facade` |
| HRIS action boundary | Open | `stoquify-hris-02-people-boundary-facade` |
| Dedicated People route family | Open | `stoquify-hris-03-permissions-and-route-shell` |
| `hris.*` permission taxonomy | Open | `stoquify-hris-03-permissions-and-route-shell` |
| Employee directory/profile as HRIS-owned read model | Open | `stoquify-hris-04-employee-identity-profile` |
| Lifecycle workflow breadth | Open | `stoquify-hris-05-lifecycle-workflows` |
| True org/position/reporting-line scope | Open | `stoquify-hris-06-org-position-manager-scope` |
| HR document retention, legal hold, and access boundary | Open | `stoquify-hris-07-contract-document-evidence` |
| Employee-level compensation/benefits HRIS ownership | Open | `stoquify-hris-08-compensation-benefits-control` |
| Payment destination as HRIS sensitive workflow | Open / partial | `stoquify-hris-09-payment-destination-privacy` |
| Full time, leave, attendance, overtime source engine | Open | `stoquify-hris-10-time-leave-attendance-engine` |
| Approval inbox across HRIS workflows | Open | `stoquify-hris-11-approval-inbox` |
| Movement history across HRIS and payroll source changes | Open | `stoquify-hris-12-movement-history` |
| HRIS-to-payroll readiness contract | Open / partial | `stoquify-hris-13-payroll-readiness-contract` |
| Employee self-service beyond payslips | Open | `stoquify-hris-14-employee-self-service` |
| Manager self-service beyond location scope | Open | `stoquify-hris-15-manager-self-service` |
| Finance/accounting proof bridge from People Core | Open / partial | `stoquify-hris-16-accounting-finance-assurance-bridge` |
| Full People/Payroll browser, accessibility, and RBAC negative evidence | Open / partial | `stoquify-hris-17-browser-accessibility-rbac-release` |
| Tenant migration, backfill, idempotency, rollback, and pilot signoff | Open | `stoquify-hris-18-migration-backfill-pilot` |
| Final unrestricted production decision | Open | `stoquify-hris-19-final-readiness` |
| Extended HRIS modules | Deferred | `stoquify-hris-20-extended-hris` |

## Live Boundary Check

The current repo check did not find these first-class HRIS boundaries:

- `services/hris`
- `actions/hris`
- `components/hris`
- `app/[locale]/(dashboard)/dashboard/people`

This confirms `stoquify-hris-02-people-boundary-facade` is the correct next skill.

## Data Ownership Decision

- Keep current payroll tables as compatibility storage during the first HRIS slice.
- Add HRIS services as the new people-truth writer/read-model boundary.
- Do not create a duplicate employee master.
- Do not rename payroll tables during the facade slice.
- Payroll must continue to consume certified proof and fail closed on missing or stale readiness evidence.

## Tenant/RBAC Decision

- Add `hris.*` permissions in the next route/access slice, not by reusing broad payroll management permissions.
- Every HRIS read/write must remain organization-scoped.
- Employee self-service must resolve the employee server-side from the authenticated user.
- Manager self-service must use tested scope and must not show salary, identifiers, payment destination data, or raw documents by default.

## Audit/Redaction Decision

- Keep salary, identifiers, bank/mobile-money destination, tax/social identifiers, raw document content, provider payloads, and authority payloads out of default list payloads.
- HRIS movement/history should use redacted event payloads, proof hashes, actor, tenant, source, and reason.
- Document access must be short-lived, authorized, audited, and retention/legal-hold aware before raw downloads are exposed.

## Gates Run

- Installed skill validation passed for all 21 `stoquify-hris-*` skills.
- Boundary check confirmed missing first-class HRIS folders/routes.
- Evidence grep confirmed the HRIS roadmap and reports name `stoquify-hris-02-people-boundary-facade` as next handoff.

## Skipped Checks

- No production Jest, Prisma, typecheck, Playwright, or policy gates were run in this status-register skill because no production code was changed.

## Residual Risk

The broad dirty worktree remains. This register should be treated as current for the HRIS skill suite creation and first handoff, not as a clean full-repo release certification.

## Next Handoff

Run `stoquify-hris-02-people-boundary-facade` next.

Required first implementation shape:

- Create the HRIS facade over current payroll source storage.
- Keep current payroll tests and payroll proof chain intact.
- Add focused tenant isolation, redaction, duplicate mapping, and payroll compatibility tests.
- Save `what-next/payroll/STOQUIFY_HRIS_PEOPLE_BOUNDARY_FACADE_2026-07-14.md`.
