# Stoquify HRIS Orchestrator Report

Date: 2026-07-14
Skill: `stoquify-hris-00-orchestrator`
Status: Completed

## Scope

Selected the next safe HRIS People Core skill after installing and validating the new `stoquify-hris-*` skill suite.

## Files Inspected

- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md`
- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md`
- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_PROMPT_2026-07-14.md`
- `docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
- `docs/HR-Payroll/`
- `what-next/payroll/`
- Installed `stoquify-hris-*` skills
- Installed `aqstoqflow-hris-payroll-*` skills

## Files Changed

- `what-next/payroll/STOQUIFY_HRIS_ORCHESTRATOR_REPORT_2026-07-14.md`
- `what-next/payroll/STOQUIFY_HRIS_CURRENT_STATE_REGISTER_2026-07-14.md`
- `what-next/payroll/STOQUIFY_HRIS_SKILL_INSTALLATION_AND_VALIDATION_REPORT_2026-07-14.md`

## Decision

Run order is valid:

1. `stoquify-hris-00-orchestrator`
2. `stoquify-hris-01-current-state-register`
3. `stoquify-hris-02-people-boundary-facade`

The first two are now complete as saved reports. The next executable implementation skill is `stoquify-hris-02-people-boundary-facade`.

## Data Ownership

- HRIS remains the target owner of people truth.
- Payroll remains the owner of certified payroll calculations, payslips, runs, payment batches, declarations, and correction proof.
- Accounting remains the owner of ledger and close assurance truth.
- The newly installed skill suite must not invert these boundaries.

## Tenant/RBAC Decision

The orchestrator did not change RBAC or production code. It preserves the required next work: create `hris.*` permissions only after or alongside the People boundary facade, and keep payroll permissions separate.

## Audit/Redaction Decision

No sensitive data was introduced. The suite requires redacted reports and forbids leaking salary, legal identifiers, payment destination values, raw documents, provider payloads, and authority payloads.

## Gates Run

- Draft skill validation passed for all 21 skills.
- Installed skill validation passed for all 21 skills.
- Required-section and placeholder checks passed.
- Live boundary check confirmed the next implementation blocker: no `services/hris`, `actions/hris`, `components/hris`, or `/dashboard/people` route family exists yet.

## Skipped Checks

- No Jest, Prisma, typecheck, Playwright, or policy gates were run because this was a skill creation/install/orchestration pass, not a production code implementation slice.

## Residual Risk

The repo has a broad dirty worktree from prior HR/payroll, module, policy-gate, and report work. This orchestrator report only claims the skill suite lifecycle and ordered handoff.

## Next Handoff

Run `stoquify-hris-02-people-boundary-facade` next.

Stop condition for the next skill: do not create a duplicate employee master or rename payroll tables. The first implementation should be facade-first over current payroll source storage.
