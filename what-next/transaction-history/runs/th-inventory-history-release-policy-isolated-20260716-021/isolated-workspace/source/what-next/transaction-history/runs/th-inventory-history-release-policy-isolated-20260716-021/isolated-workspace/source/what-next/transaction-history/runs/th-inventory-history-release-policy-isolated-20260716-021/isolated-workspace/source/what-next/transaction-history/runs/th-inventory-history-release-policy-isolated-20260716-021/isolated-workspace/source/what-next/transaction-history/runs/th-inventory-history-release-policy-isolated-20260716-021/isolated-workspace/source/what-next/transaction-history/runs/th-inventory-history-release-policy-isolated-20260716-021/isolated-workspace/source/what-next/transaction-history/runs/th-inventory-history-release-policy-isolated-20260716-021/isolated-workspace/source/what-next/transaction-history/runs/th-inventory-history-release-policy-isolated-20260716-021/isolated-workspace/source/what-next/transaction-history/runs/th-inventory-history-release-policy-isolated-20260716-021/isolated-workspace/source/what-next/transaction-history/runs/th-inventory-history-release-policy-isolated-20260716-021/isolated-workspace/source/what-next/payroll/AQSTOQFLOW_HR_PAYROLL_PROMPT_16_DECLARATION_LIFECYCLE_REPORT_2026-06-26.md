# Aqstoqflow HR/Payroll Prompt 16 Declaration Lifecycle Execution Report

Date: 2026-06-26
Skill: aqstoqflow-hrpayroll-16-declaration-lifecycle
Status: Implemented for the safe manual authority-evidence slice

## Source Documents Read

- docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md
- what-next/payroll/AQSTOQFLOW_HR_PAYROLL_DECLARATION_LIFECYCLE_UNBLOCK_DOSSIER_2026-06-26.md
- what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_16_RERUN_AFTER_UNBLOCK_DOSSIER_2026-06-26.md

## Prerequisite Gate Outcome

Prompt 16 is no longer blocked for the reviewed manual evidence lifecycle slice. The system now has enough reviewed rules to capture authority portal evidence manually, preserve immutable evidence, move declaration statuses through a controlled lifecycle, and stale certified close evidence when payroll declaration evidence changes.

Production authority adapter automation remains blocked. The system still lacks expert-reviewed or regulator-confirmed electronic declaration payload mappings, authority response mappings, amendment/legal close-impact rules, and production submission provenance. No production submission adapter was implemented.

## Implemented Scope

- Added an append-only `PayrollDeclarationEvidence` model and `PayrollDeclarationEvidenceTransition` enum.
- Added migration `20260626133000_payroll_declaration_lifecycle_evidence` with an immutable database trigger for declaration lifecycle evidence.
- Added `recordPayrollDeclarationEvidence` service for manual declaration lifecycle capture.
- Supported controlled manual transitions: submit, accept, reject, mark payment due, mark paid, reconcile, archive, and amend.
- Enforced evidence hashes, idempotency keys, transition order, manual-only authority environments, maker-checker for submission/amendment, and sensitive-action controls.
- Added protected server action `recordPayrollDeclarationEvidenceAction` with tenant-derived organization, actor-derived user, fresh auth, RBAC, and payroll module entitlement.
- Added `payroll.declarations.manage` permission and critical risk classification/legacy compatibility.
- Added sensitive action policy `payroll.declaration.lifecycle`.
- Expanded close-certification invalidation source catalog for payroll declaration lifecycle events.
- Extended payroll immutability runtime proof to include `payroll_declaration_evidence` trigger checks.

## Files And Systems Involved

- prisma/schema.prisma
- prisma/migrations/20260626133000_payroll_declaration_lifecycle_evidence/migration.sql
- services/payroll/declaration-lifecycle.service.ts
- actions/payroll/payroll-control.actions.ts
- services/controls/sensitive-action.service.ts
- config/permissions.ts
- lib/security/rbac-permissions.ts
- services/accounting/close-assurance-pack.service.ts
- scripts/payroll-immutability-runtime-check.js
- services/payroll/__tests__/declaration-lifecycle.service.test.ts
- services/payroll/__tests__/payroll-immutability-migration.test.ts
- actions/payroll/__tests__/payroll-control.actions.test.ts
- lib/security/__tests__/rbac-permissions.test.ts
- what-next/payroll/payroll-immutability-runtime-check.md
- what-next/payroll/payroll-immutability-runtime-check.json

## Single Source Of Truth Controls

- Services own payroll declaration lifecycle truth.
- Server actions only expose protected workflows and derive tenant/actor context from the authenticated session.
- No client-computed payroll declaration truth was added.
- No dashboard-specific shadow service was added.
- No production statutory automation was added without reviewed authority mappings.
- Immutable evidence is append-only at the database trigger layer.
- Declaration lifecycle changes emit business events, audit logs, and close invalidation evidence.
- Certified close evidence is marked stale through the close assurance source catalog instead of ad hoc UI state.

## Validation Results

- `npm run prisma:validate`: passed.
- `npm run prisma:generate`: passed after stopping the local Next dev processes that were locking Prisma's Windows query engine DLL. An intermediate `--no-engine` generation was used only to recover type generation, then the normal Prisma client was regenerated successfully.
- `npm test -- --runTestsByPath services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/payroll-immutability-migration.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts lib/security/__tests__/rbac-permissions.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand`: passed, 5 suites / 43 tests.
- `npm run payroll:immutability:runtime`: passed. Required triggers present 8/8, forbidden mutations blocked 11/11, allowed lifecycle checks passed 3/3, blockers 0.
- `npm run policy:gates`: passed end to end.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 5 pre-existing warnings and 0 errors.

## Runtime Evidence

The live PostgreSQL immutability proof was generated against the dedicated local database `stockflow_immutability_test` without printing secret URL values.

Evidence files:

- what-next/payroll/payroll-immutability-runtime-check.md
- what-next/payroll/payroll-immutability-runtime-check.json

Latest runtime summary:

- Status: ready
- Required triggers present: 8/8
- Forbidden mutation checks blocked: 11/11
- Allowed lifecycle checks passed: 3/3
- Blockers: 0

## Blockers And Deferred Items

No blocker remains for the manual evidence lifecycle implementation slice.

The following remain intentionally blocked or deferred:

- Production electronic authority submission adapters.
- Regulator/API payload and response mapping automation.
- Legal/statutory amendment automation beyond manual evidence recording.
- Country-specific declaration filing claims that do not have expert-reviewed or regulator-confirmed provenance.
- Broader data-trust/accountant portal projections for declaration lifecycle visibility; this belongs in later data trust/readiness prompts.
- UI-first declaration workflow expansion; future UI must consume trusted server-provided lifecycle data only.

## Recommended Next Action

Proceed to `aqstoqflow-hrpayroll-17-payment-reconciliation` only within the proven manual-evidence and payment-control boundaries. Do not introduce production declaration adapter automation until reviewed mappings and legal amendment/close-impact rules are available.

Operational note: a local Next dev server was stopped to release Prisma's locked Windows query engine DLL before normal Prisma client regeneration. Restart the dev server when interactive browser testing is needed.
