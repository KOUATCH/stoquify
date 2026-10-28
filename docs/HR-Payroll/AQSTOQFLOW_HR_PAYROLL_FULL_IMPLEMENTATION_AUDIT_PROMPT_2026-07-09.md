# AqStoqFlow HR/Payroll Full Implementation Audit Prompt - 2026-07-09

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Project:
AqStoqFlow / Kontava platform.

Workspace:
`E:\ohada saas\newStockFlow\aqstoqflow`

Preflight:
Confirm the current repo is the AqStoqFlow workspace above. If the active cwd is `stoquify` or another repo, do not audit the wrong codebase; report the mismatch first.

Domain:
HR/payroll.

Mission:
Perform an evidence-led HR/payroll workflow diagnosis. Inspect the current implementation, explain what is completed, partial, missing, risky, or intentionally deferred, identify the pros and cons of the current design, and propose the practical solution path required to reach a full enterprise-grade HR/payroll implementation.

Domain lens:
Act as a senior enterprise HR/payroll architecture team:
- Senior enterprise software architect: preserve payroll boundaries, service ownership, dependency order, platform modularity, and integration contracts.
- Structural UI/UX design expert: assess workflow-first, role-aware payroll surfaces only against service-owned read models and state contracts.
- Cybersecurity and RBAC specialist: enforce tenant isolation, RBAC, module entitlement, fresh auth, maker-checker controls, audit trails, redaction, and safe error handling.
- HR/payroll business logic expert: protect employee source data, contracts, compensation approvals, payroll run lifecycle, statutory calculations, declarations, payment evidence, payslips, corrections, and proof history.
- Enterprise finance and controls expert: assess ledger posting, deduction/recovery mapping, reconciliation, close assurance, data-trust exports, and release gates.
- OHADA/SYSCOHADA-aware platform architect: keep statutory, country-pack, tax, accounting, and regulatory configuration separated from code, with expert-reviewed provenance.
- SaaS modularity specialist: ensure payroll is tenant-safe, module-entitled, observable, scalable, and not a dashboard-only feature.

Evidence to inspect:
- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- Recent reports under `what-next/payroll/`
- Payroll code under `services/payroll/`, `actions/payroll/`, `components/payroll/`, `hooks/`, `app/[locale]/(dashboard)/dashboard/payroll/`, `lib/`, `config/`, `prisma/`, `scripts/`, and focused payroll tests
- `prisma/schema.prisma` and payroll-related migrations/seeds
- Relevant `graphify-out/` reports if present
- Existing gates and reports for service boundary, policy gates, regulatory hardcode, payroll immutability, browser smoke, and close assurance

Tasks:
1. Map the current HR/payroll workflow end to end.
2. Classify each area as completed, partial, missing, risky, blocked, or deferred.
3. Diagnose pros and cons of the current architecture, workflow UX, data model, services, security controls, statutory logic, accounting integration, and release readiness.
4. Identify gaps across employee source data, contracts, compensation, payroll runs, statutory country packs, declarations, payslips, payment reconciliation, accounting close, proof packs, self-service, command center UX, observability, and enterprise release gates.
5. Propose a phased solution plan that brings the system to full HR/payroll implementation standard.
6. Separate quick wins, required architecture repairs, release blockers, and longer-term product improvements.
7. Save a concise report at `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_FULL_IMPLEMENTATION_GAP_AUDIT_2026-07-09.md`.

Verification:
Run only checks needed for audit evidence. Prefer:

```powershell
npm run prisma:validate
npm run typecheck
npm run service:boundary:fail
npm run regulatory:hardcode:fail
npm run policy:gates
```

Use focused payroll Jest tests and route smoke checks where relevant. If a command is noisy or blocked by environment state, rerun narrowly and document the blocker honestly.

Risk controls:
- Do not implement broad code changes during the audit unless explicitly asked.
- Do not touch unrelated lint warnings or unrelated modules.
- Do not trust UI-derived payroll truth; verify service-owned sources.
- Do not expose payroll PII, salary details, provider secrets, or raw proof artifacts in reports.
- Keep recommendations tenant-scoped, entitlement-safe, redacted, auditable, and release-gate aware.

Success criteria:
The final report clearly explains the current HR/payroll situation, the completed and uncompleted aspects, the pros and cons, the true blockers, and a concrete phased path to full enterprise-grade HR/payroll implementation.