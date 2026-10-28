# AqStoqFlow Enterprise HRIS/Payroll Execution Prompt

Date: 2026-07-12

## Refined Professional Prompt

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Act as a senior enterprise HRIS/payroll architecture team:

- Senior enterprise software architect: preserve HRIS/payroll boundaries, service ownership, dependency order, platform modularity, and integration contracts.
- Structural UI/UX design expert: design workflow-first, role-aware HRIS/payroll surfaces only after service-owned read models and state contracts exist.
- Cybersecurity and RBAC specialist: enforce tenant isolation, RBAC, module entitlement, fresh auth, maker-checker approvals, audit trails, redaction, and safe error handling.
- HRIS/payroll business logic expert: protect employee truth, contract history, compensation history, attendance/leave approval, payroll readiness, statutory traceability, and lifecycle state transitions.
- Enterprise finance and controls expert: ensure payroll integrates correctly with ledger posting, reconciliation, close assurance, control evidence, approval flows, and release gates.
- OHADA/SYSCOHADA-aware platform architect: keep statutory, country-pack, tax, accounting, and regulatory configuration separated from code. Require expert-reviewed provenance for legal/accounting rules.
- SaaS modularity specialist: ensure HRIS/payroll is module-entitled, tenant-safe, scalable, observable, and not implemented as a standalone dashboard-only feature.

## Mission

Using the saved blueprint at `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`, design a complete execution roadmap and implementation blueprint that moves AqStoqFlow from the current controlled-pilot payroll state to a bulletproof, modern, secure, professional, enterprise-grade HRIS/payroll system.

The strategy must preserve what already works. Do not discard the current payroll kernel, immutability work, close-pack evidence, RBAC, policy gates, payroll services, routes, or reports. Reframe the existing payroll module as a consumer of certified HRIS truth.

## Core Principle

Design the platform around this chain:

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

Payroll must not invent employee, contract, compensation, attendance, leave, payment-destination, or approval truth.

## Evidence To Inspect

Inspect and cite evidence from:

- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- Current payroll reports under `what-next/payroll/`, especially pilot readiness, statutory review, browser smoke, immutability, regulatory hardcode, and release-gate reports
- `docs/domains/hr-payroll/`
- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `graphify-out/` reports if present
- `prisma/schema.prisma`
- `services/payroll/`
- `actions/payroll/`
- `components/payroll/`
- `app/[locale]/(dashboard)/dashboard/payroll/`
- `config/permissions.ts`
- `config/sidebar.ts`
- `lib/security/rbac-permissions.ts`
- `scripts/` and focused payroll tests

## Required Output

Produce a saved roadmap and blueprint under:

- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_NEXT_STEPS_2026-07-12.md`

The roadmap must include:

1. Current-state assessment
2. Target architecture
3. Domain ownership map
4. HRIS core foundation plan
5. Time, leave, attendance plan
6. Payroll input readiness gate
7. Payroll snapshot and correction model
8. Payroll engine integration plan
9. Payments, declarations, accounting, and assurance integration
10. Employee and manager self-service plan
11. Security, RBAC, privacy, audit, and redaction plan
12. Browser, accessibility, testing, and release-gate plan
13. Migration/backfill strategy
14. Phased execution roadmap with dependencies
15. Acceptance criteria for each phase
16. Risks, blockers, and non-goals

## Execution Rules

- Do not implement production code in this run unless explicitly instructed later.
- Do not refactor unrelated payroll code.
- Do not weaken existing payroll immutability, RBAC, policy gates, or release evidence.
- Treat stale reports carefully: mark superseded blockers separately from current blockers.
- Prefer service-owned read models before UI expansion.
- Require payroll to fail closed when HRIS readiness is incomplete.
- Require fresh auth and maker-checker approval for salary, contract, payment destination, termination, retroactive attendance, declaration, payment release, and production backfill actions.
- Keep statutory and country-pack rules evidence-based and expert-reviewed.

## Verification

After writing the roadmap files, verify:

- The files exist.
- The roadmap references the saved HRIS-first blueprint.
- The phase order preserves current payroll work.
- No production code was changed.
- The output clearly separates controlled-pilot readiness from unrestricted production readiness.

Suggested focused commands:

```powershell
rg -n "HRIS owns people truth|Payroll consumes certified HRIS snapshots|Readiness gate|Phase" docs/HR-Payroll what-next/payroll
rg -n "unrestricted production|controlled pilot|statutory|browser smoke|immutability" docs/HR-Payroll what-next/payroll
```

## Success Criteria

The result is successful when the saved roadmap gives AqStoqFlow a clear, smooth execution path from the current payroll/control kernel to a complete HRIS/payroll platform without compromising existing security, evidence, auditability, statutory caution, or service-owned payroll truth.

End with a concise commit-ready summary: what was produced, what evidence was used, what remains blocked, and what the first implementation slice should be.

