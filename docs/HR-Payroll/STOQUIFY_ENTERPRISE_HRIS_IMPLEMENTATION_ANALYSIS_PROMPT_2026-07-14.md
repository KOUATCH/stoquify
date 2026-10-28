# Stoquify Enterprise HRIS Implementation Analysis Prompt

Date: 2026-07-14
Intended workspace: `E:\ohada saas\Focused projects\stoquify`
Primary source document: `docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`

## Refined Professional Prompt

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, SaaS growth advisor, HRIS domain architect, payroll compliance architect, accounting/finance controls specialist, data/privacy officer, workflow/approval architect, QA/release engineer, and Codex skill-system architect.

Go through `STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14` and carry out a detailed, evidence-led analysis of how to implement a complete HRIS inside Stoquify so that it blends smoothly with the existing accounting, finance, payroll, close assurance, RBAC, audit, redaction, document evidence, self-service, and dashboard systems.

The goal is to move the platform toward a professional, modern, enterprise-grade, secure, robust, mature HRIS/payroll system without weakening what is already working.

Use all competent specialist agents or specialist lenses needed for this class of work, including:

- Enterprise system architecture
- HRIS and payroll domain architecture
- Accounting, finance, ledger, reconciliation, and close assurance
- Cybersecurity, tenant isolation, RBAC, privacy, redaction, and audit
- Prisma/data-modeling, migration, backfill, and evidence integrity
- Workflow, approvals, maker-checker, lifecycle, and operational controls
- UI/UX for dashboard-heavy SaaS products
- Product strategy and commercial packaging
- Testing, browser validation, accessibility, release gates, and production readiness
- Codex skill-system design and orchestration

## Required Analysis

Inspect and synthesize:

1. What the current HRIS/payroll foundation already does well.
2. What is incomplete, unsafe, overclaimed, duplicated, or still payroll-owned when it should become HRIS-owned.
3. Why the current system is held back from becoming a full enterprise HRIS/payroll platform.
4. How HRIS should become the owner of people truth while payroll consumes certified HRIS snapshots.
5. How the HRIS boundary should integrate with:
   - Payroll input readiness
   - Payroll calculation and correction workflows
   - Payments and declarations
   - Accounting posting and close assurance
   - Finance dashboards and forecasts
   - RBAC, fresh auth, and module entitlements
   - Audit logs, redaction, document evidence, retention, and legal hold
   - Employee and manager self-service
   - Browser, mobile, accessibility, and release validation
6. Which existing models, services, actions, routes, reports, and skills should be reused.
7. Which new HRIS-specific services, permissions, routes, tests, and skills should be introduced.
8. Which work should be deferred so the team does not overbuild broad generic HR before payroll-ready People Core is stable.

## Evidence To Inspect

Inspect the real repository before producing conclusions. At minimum inspect:

- `docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
- `docs/HR-Payroll/`
- `what-next/payroll/`
- `prisma/schema.prisma`
- `services/payroll/`
- `actions/payroll/`
- `components/payroll/`
- `app/[locale]/(dashboard)/dashboard/payroll/`
- `config/sidebar.ts`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `services/security/redaction-policy.service.ts`
- `services/accounting/`
- `services/finance/`
- Existing Jest, Playwright, route smoke, browser smoke, policy gate, and Prisma validation scripts
- Existing installed HRIS/payroll skills and draft skill-suite artifacts where available

Confirm whether the repo already has:

- `services/hris/`
- `actions/hris/`
- `components/hris/`
- `/dashboard/people`
- `hris.*` permissions
- HRIS-specific tests
- HRIS-specific route smoke or browser evidence

## Expected Deliverables

Save the outputs as real files, not chat-only drafts:

1. Detailed implementation analysis under `docs/HR-Payroll/`.
2. Targeted HRIS skill-system blueprint under `docs/HR-Payroll/`.
3. Run report under `what-next/payroll/`.
4. Save this execution prompt under `docs/HR-Payroll/` as a prompt artifact.

Recommended file names:

- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md`
- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md`
- `docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_PROMPT_2026-07-14.md`
- `what-next/payroll/STOQUIFY_ENTERPRISE_HRIS_ANALYSIS_RUN_REPORT_2026-07-14.md`

## Required Output Structure

For the implementation analysis, include:

- Executive recommendation
- Evidence from the codebase
- Language locked
- What is working
- What is not working yet
- What is holding the system back
- Target HRIS/payroll/accounting architecture
- Data strategy
- UI strategy
- Implementation roadmap
- Security and control gates
- Immediate next implementation slices
- Final go/no-go decision

For the skill-system blueprint, include:

- Executive decision
- Operating law
- Relationship to existing skills
- Standard skill contract
- Skill chain with purpose, gates, handoffs, and report paths
- Minimal installation path
- Validation commands
- Non-goals
- Final skill-system decision

For the run report, include:

- Prompt run
- Files created
- Skills or specialist lenses used
- Evidence inspected
- Key findings
- Worktree note
- Verification performed or planned
- Next safe handoff

## Risk Controls

- Do not rewrite the payroll kernel.
- Do not create a duplicate employee master before the HRIS facade and migration strategy are approved.
- Do not install or overwrite skills unless explicitly asked.
- Do not touch unrelated dirty-worktree files.
- Do not claim unrestricted production readiness from controlled-pilot evidence.
- Do not expose employee salary, tax identifiers, social identifiers, bank/mobile-money details, raw documents, or provider/authority payloads in broad payloads or reports.
- Do not build self-service before own-record, manager-scope, RBAC-negative, and redaction tests exist.
- Do not let UI routes derive or satisfy payroll readiness. Readiness must be service-owned and evidence-backed.

## Verification Commands

Run focused checks for saved documents:

```powershell
rg -n "Final Skill-System Decision|Final Go/No-Go|Files created|NO-GO|People Core" docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md what-next/payroll/STOQUIFY_ENTERPRISE_HRIS_ANALYSIS_RUN_REPORT_2026-07-14.md
rg -n "[ \t]+$" docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_PROMPT_2026-07-14.md what-next/payroll/STOQUIFY_ENTERPRISE_HRIS_ANALYSIS_RUN_REPORT_2026-07-14.md
git diff --check -- docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_2026-07-14.md docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_TARGETED_SKILL_SYSTEM_2026-07-14.md docs/HR-Payroll/STOQUIFY_ENTERPRISE_HRIS_IMPLEMENTATION_ANALYSIS_PROMPT_2026-07-14.md what-next/payroll/STOQUIFY_ENTERPRISE_HRIS_ANALYSIS_RUN_REPORT_2026-07-14.md
```

Only run broader tests such as `npm run typecheck`, `npm run policy:gates`, Playwright, or browser smoke when a code-changing implementation slice is active and failures can be interpreted against a clean enough worktree.

## Success Criteria

The run is successful when:

- The HRIS implementation analysis is saved under `docs/HR-Payroll/`.
- The HRIS skill-system blueprint is saved under `docs/HR-Payroll/`.
- This prompt is saved under `docs/HR-Payroll/`.
- The run report is saved under `what-next/payroll/`.
- The documents identify a practical People Core-first path.
- The documents preserve the operating law: HRIS owns people truth, payroll consumes certified HRIS snapshots, accounting records money truth, and assurance proves the chain.
- Focused document whitespace and diff checks pass for the newly created files.
