# Stoquify Enterprise HRIS Analysis Run Report

Date: 2026-07-14
Prompt run: analyze `STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14`, propose implementation roadmap for a complete HRIS integrated with accounting, finance, payroll, close assurance, RBAC, audit, redaction, and self-service, and design a targeted skill system to execute it.

## Result

Completed as a documentation and architecture pass.

Files created:

- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md`
- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md`
- `what-next/payroll/STOQUIFY_ENTERPRISE_HRIS_ANALYSIS_RUN_REPORT_2026-07-14.md`

No production code, Prisma schema, package file, test file, installed skill folder, or generated artifact outside these reports was intentionally changed by this run.

## Skills Used

- `aqstoqflow-hris-payroll-00-orchestrator`: used to preserve the HRIS-first law, report contract, and no-production-code-change planning posture.
- `architect`: used to inspect repo context before recommending the implementation spine.
- `aqstoqflow-prompt-architect`: used to preserve the evidence-led, artifact-producing prompt structure.

## Specialist Review Lenses

The synthesis applied these lenses:

- Enterprise software architecture
- HRIS/payroll domain architecture
- Security, RBAC, privacy, redaction, and tenant isolation
- Workflow, approvals, maker-checker, and audit
- Accounting, finance, payments, declarations, and close assurance
- UI/UX for a dashboard-heavy SaaS People workspace
- Testing, browser validation, migration, release gates, and skill-system governance

Five sidecar agents were also launched for read-only review: Software Architect, Security Architect, Workflow Architect, UX Architect, and Multi-Agent Systems Architect. Their first wait window had not returned completed final messages before the initial artifact drafting, so the saved artifacts rely on direct repo inspection plus the specialist lenses above.

## Evidence Inspected

Primary source:

- `docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`

Existing HR/payroll documents:

- `docs/HR-Payroll/README.md`
- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md`

Recent proof reports:

- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_STATUS_REGISTER_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SOURCE_TRUTH_MAP_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_INPUT_READINESS_GATE_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SNAPSHOT_CORRECTION_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ENGINE_INTEGRATION_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PAYMENTS_DECLARATIONS_PROOF_2026-07-14.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ACCOUNTING_CLOSE_ASSURANCE_2026-07-14.md`

Repo surfaces:

- `prisma/schema.prisma`
- `services/payroll/*`
- `actions/payroll/*`
- `components/payroll/*`
- `app/[locale]/(dashboard)/dashboard/payroll/*`
- `config/sidebar.ts`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `services/security/redaction-policy.service.ts`
- `services/accounting/*`
- `package.json`

## Key Findings

- The current codebase has payroll-grade HR source data, but not a first-class HRIS boundary.
- `PayrollEmployee`, `PayrollContract`, compensation, payment-destination requests, attendance snapshots, payroll runs, payslips, declarations, payment batches, and audit logs provide a strong compatibility base.
- No `services/hris`, `actions/hris`, or `components/hris` boundary was observed.
- Payroll permissions are mature, but a separate `hris.*` permission taxonomy was not observed.
- The People sidebar section exists, but HRIS work is still represented through payroll routes.
- Existing verification assets include Jest, Playwright, payroll browser smoke, route smoke, Prisma validation, policy gates, and payroll immutability runtime checks.
- The safest next implementation shape is facade-first People Core, then certified HRIS snapshots, then self-service and release certification.

## Worktree Note

`git status --short` shows a broad dirty worktree with many staged and unstaged changes predating this analysis, including HR/payroll docs, module docs, policy-gate scripts, payroll service/test changes, accounting data-trust changes, and untracked `docs/new ideas/` plus 2026-07-14 payroll proof reports.

This run did not attempt to revert, stage, or normalize that existing worktree. Commit readiness for the broader tree still needs a separate staging decision.

## Verification Planned For This Run

After saving the reports, run focused document checks:

```powershell
rg -n "Final Skill-System Decision|Final Go/No-Go|Files created|NO-GO|People Core" docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md what-next/payroll/STOQUIFY_ENTERPRISE_HRIS_ANALYSIS_RUN_REPORT_2026-07-14.md
rg -n "[ \t]+$" docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md what-next/payroll/STOQUIFY_ENTERPRISE_HRIS_ANALYSIS_RUN_REPORT_2026-07-14.md
git diff --check -- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md what-next/payroll/STOQUIFY_ENTERPRISE_HRIS_ANALYSIS_RUN_REPORT_2026-07-14.md
```

## Next Safe Handoff

Run `stoquify-hris-01-current-state-register` as a draft skill or use the existing `aqstoqflow-hris-payroll-01-status-register` to refresh the status register against the new 2026-07-14 proposal.

The first code slice should be a narrow HRIS facade/route-shell pass:

- `services/hris/employee.service.ts` read model facade over current payroll employee storage
- `services/hris/movement-history.service.ts` read model from audit/business events
- `actions/hris/*` guarded server actions
- `hris.*` permissions and RBAC risk classifications
- `/dashboard/people` route shell using existing dashboard primitives
- focused permission, route, tenant, and redaction tests
