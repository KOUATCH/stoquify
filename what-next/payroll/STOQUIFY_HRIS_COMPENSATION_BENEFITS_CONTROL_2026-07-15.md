# Stoquify HRIS Compensation and Benefits Control

Date: 2026-07-15
Skill: `stoquify-hris-08-compensation-benefits-control`
Decision: READY FOR CONTROLLED INTEGRATION; NOT YET AN UNRESTRICTED PRODUCTION CLAIM

## Scope

This slice moved employee-level compensation assignment commands behind HRIS scope, maker-checker, evidence, effective-date, and redaction controls while preserving existing payroll component, country-pack, and accounting ownership.

The implementation remained limited to compensation services, HRIS actions, focused tests, and this report. No Prisma schema migration, payroll formula change, accounting posting-map change, or broad UI redesign was made.

## Evidence Inspected

- `docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md`
- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md`
- `what-next/payroll/STOQUIFY_HRIS_CONTRACT_DOCUMENT_EVIDENCE_2026-07-15.md`
- `services/payroll/compensation.service.ts`
- `services/payroll/payroll-control.service.ts`
- `actions/payroll/payroll-compensation.actions.ts`
- HRIS people-scope and action protection patterns
- Current Prisma payroll contract, assignment, and salary-change models
- Current code graph and focused compensation/readiness tests

## Changes Implemented

### Compensation assignment control

- Direct creation of an `ACTIVE` employee rubrique assignment is rejected.
- Assignment requests are always persisted as `DRAFT` with evidence and a traceable request business event.
- A separate approval command requires a different actor, tenant-and-employee binding, request evidence, approval evidence, and an approved effective contract covering the assignment period.
- Approval produces a separate business event and only then publishes `ACTIVE` status and `approvalBusinessEventId`.
- New assignments expose `REQUESTED` or `APPROVED` HRIS approval status; pre-existing active records without the new metadata are labelled `LEGACY_ACTIVE` by the read model.

### Salary-change separation

- Requester cannot approve.
- Requester cannot apply.
- Approver cannot apply their own approval.
- The successful path therefore requires three distinct actors for request, approval, and application.
- Approval/rejection business-event metadata now records a reason hash instead of the raw decision reason.

### HRIS compensation boundary

- Added an employee-scoped HRIS compensation service and fresh-authenticated HRIS server actions.
- The action boundary derives organization, actor, and permissions from the authenticated RBAC context; submitted authority values are ignored.
- The service resolves HRIS people scope before read or mutation delegation.
- Salary amounts, rates, and quantities stay redacted unless the actor already has an explicit salary permission.
- HRIS output omits requester/approver/applier identities, country-pack resolution hashes, statutory parameter paths, and accounting debit/credit mappings.
- Salary approval/application IDs are bound to the scoped employee before delegation, preventing cross-employee request-ID use.

## Data Ownership

| Truth | Owner | Current implementation |
|---|---|---|
| Employee compensation and benefit assignment | HRIS compensation service | HRIS facade over existing payroll storage |
| Payroll component catalog | Payroll | Not mutable through the HRIS facade |
| Statutory meaning and provenance | Payroll country pack | Safe provenance summary only in HRIS output |
| Debit/credit posting map | Accounting | Not exposed or mutable through HRIS |
| Payroll calculation | Payroll engine | Consumes effective active assignments and blocks stale salary changes |
| Evidence and assurance | Business events, audit, hash references | Request and approval evidence/events remain separate |

## Tenant, RBAC, and Policy Decision

- Read gate: `hris.people.read`, followed by employee-scoped HRIS authority resolution.
- Mutation gate: fresh authentication plus `hris.people.manage`.
- Payroll permissions are delegated internally only for the compatibility storage command being executed.
- Tenant and employee IDs are checked at the service query boundary before decisions or application.
- The underlying payroll service independently enforces maker-checker and evidence rules, so direct server-side calls cannot bypass the action gate's business controls.

## Audit and Redaction Decision

- Request and approval events contain hashes for person-level compensation values.
- Raw decision reasons are excluded from business-event metadata.
- Audit records contain status, proof-presence, scope, and control outcomes rather than raw salary values.
- Read models redact amount, rate, and quantity together and preserve `null` when no value exists.
- HRIS component views disclose safe ownership/provenance status, not formulas, parameter paths, resolution hashes, or accounting mappings.

## Verification

Passed:

- Payroll compensation service: 15 tests.
- HRIS compensation service and HRIS compensation action policy gates: 6 tests.
- Existing stale compensation readiness blocker: 1 focused test; payroll calculation rejects open effective salary changes with `PAYROLL_INPUT_COMPENSATION_STALE`.
- Focused ESLint across all six changed implementation/test files.
- Full TypeScript: `tsc --noEmit --pretty false`.
- Scoped tracked diff hygiene: `git diff --check`.
- New-file trailing-whitespace scan: no findings.

One initial full typecheck invocation timed out without diagnostics; the direct compiler rerun completed successfully. Windows sandbox helper setup failures required the same local commands to be rerun outside that helper and are not application failures.

## Residual Risks and Skipped Checks

- Existing active assignments created by the old one-step flow are labelled `LEGACY_ACTIVE`, but no backfill or payroll rejection migration was added in this slice. They require explicit review/backfill before an unrestricted production claim.
- Existing payroll compensation UI/actions remain compatibility ingress. Their underlying commands are hardened, but UI migration to the HRIS action boundary is still pending.
- Salary-change application still versions the payroll contract using the salary approval evidence already present in the existing workflow; a dedicated compensation-amendment document UX is not added here.
- No broad full Jest suite, production build, browser smoke, accessibility run, or migration rehearsal was performed because this was a focused service/control slice.
- No new Prisma table was added; approval provenance is stored in existing metadata and business-event fields.

## Files Changed

- `services/payroll/compensation.service.ts`
- `services/payroll/__tests__/payroll-compensation.service.test.ts`
- `services/hris/compensation.service.ts`
- `services/hris/__tests__/compensation.service.test.ts`
- `actions/hris/compensation.actions.ts`
- `actions/hris/__tests__/compensation.actions.test.ts`
- `what-next/payroll/STOQUIFY_HRIS_COMPENSATION_BENEFITS_CONTROL_2026-07-15.md`

## Handoff

Next skill: `stoquify-hris-09-payment-destination-privacy`.

Before final HRIS/payroll release certification, schedule a migration gate that inventories every `LEGACY_ACTIVE` compensation assignment and either proves/backfills independent approval evidence or blocks it from payroll consumption.
