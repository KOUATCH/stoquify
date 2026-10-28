# AqStoqFlow HR/Payroll Orchestration Report

Date: 2026-06-25

Prompt name and phase: Prompt 00, Expert Program Orchestrator.

Expert lenses applied: enterprise software architecture, SaaS modularity, cybersecurity/RBAC, finance controls, OHADA/SYSCOHADA platform safety.

## Gate Result

Decision: passed for orchestration.

The source prompt suite is readable at `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`.

The ordered roadmap source copy is readable under `HR-payroll/what-next/payroll/`.

The installed skill suite is validated in `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_SKILL_INSTALL_VALIDATE_REPORT_2026-06-25.md`.

## Skills Installed

22 ordered skills were installed under `C:\Users\J COMPUTER\.codex\skills` using the `aqstoqflow-hrpayroll-XX-*` naming convention. The numbering preserves the source prompt sequence and avoids overwriting older payroll skills.

## Files Inspected

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_SKILL_INSTALL_VALIDATE_REPORT_2026-06-25.md`
- `HR-payroll/what-next/payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`
- `HR-payroll/what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PREREQUISITE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `prisma/schema.prisma`
- `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql`
- `services/payroll/`
- `actions/payroll/`
- `components/payroll/`
- `app/[locale]/(dashboard)/dashboard/payroll/`
- `lib/security/`
- `services/modules/`
- `services/accounting/`
- `services/regulatory/`
- `services/assurance/`

## Dependency Ledger

| Prompt | Skill | Status | Handoff |
|---|---|---|---|
| 00 | `aqstoqflow-hrpayroll-00-orchestrator` | Passed | Prompt 01 selected |
| 01 | `aqstoqflow-hrpayroll-01-governance-map` | Running next | Produce source-of-truth ownership map |
| 02 | `aqstoqflow-hrpayroll-02-immutability-boundary` | Not started | May run only after Prompt 01 report exists |
| 03-21 | Remaining ordered skills | Deferred | Must wait for predecessor gates |

## Security And Privacy Decisions

- Do not run downstream product skills unless Prompt 01 ownership and Prompt 02 immutability gates pass.
- Do not allow UI-first payroll expansion.
- Preserve server-derived tenant/actor context, RBAC, module entitlement, fresh-auth, maker-checker, salary-read audit, and redaction.

## Accounting And Finance Decisions

- Do not release payment, declaration, posting, register, or close assurance work until matching finance gates pass.
- Payroll truth must tie to service-owned payroll records, SYSCOHADA posting evidence, source links, and close evidence.

## UI/UX Decisions

- Current UI may be inspected, but no dashboard or component is a truth owner.
- Later UI work must render trusted server read models only.

## Validation Run

- Skill install validation report reviewed.
- Route/service/action/security/accounting/regulatory/assurance surfaces inspected by focused file scan.
- No production code changed.

## Handoff Decision

Decision: proceed to Prompt 01.

The next safe implementation slice is Prompt 01, the governance/source-of-truth inventory. It is documentation-only and can run without modifying production code.
