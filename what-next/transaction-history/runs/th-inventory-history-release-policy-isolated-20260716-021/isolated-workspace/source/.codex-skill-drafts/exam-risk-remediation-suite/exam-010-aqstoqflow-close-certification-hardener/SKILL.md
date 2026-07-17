---
name: exam-010-aqstoqflow-close-certification-hardener
description: Exam 010 Close Certification Hardener remediates AqStoqFlow risk class 010 by harden close-pack certification readiness, automatic stale invalidation, inventory valuation annexes, and explicit statutory blockers. Use when executing the ordered exam risk-remediation suite, hardening this risk area, migrating legacy code into service-owned workflows, adding OHADA controls, or validating this remediation gate.
---

# Exam 010 Close Certification Hardener

Use this skill to harden close-pack certification readiness, automatic stale invalidation, inventory valuation annexes, and explicit statutory blockers.

## Runtime Boundary

Risk class: System evidence certification exists, but statutory certification must remain blocked while recertification triggers and deeper inventory valuation assurance are incomplete.

Use when:

- this risk class is the next open item in the exam remediation suite;
- the user asks to remediate, audit, validate, or continue this exact risk area;
- a higher-priority exam skill is complete or explicitly deferred with evidence.

Do not use when:

- a lower-numbered exam skill has unresolved blockers that this work depends on;
- the requested change would bypass tenant isolation, RBAC, audit, ledger, or OHADA evidence rules;
- the user only wants a report and not code changes, unless running report mode.

## Required First Reads

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `graphify-out/GRAPH_REPORT.md`
- `prisma/schema.prisma`
- `services/accounting/close-assurance*`
- `services/accounting/data-trust.service.ts`
- `services/inventory/inventory-valuation.service.ts`
- `services/compliance/**/*`
- `prisma/schema.prisma`
- `references/risk-brief.md`
- `references/runtime-boundary.md`

Read only the relevant files for the current slice after the initial reports. Avoid loading unrelated domains.

## Edit Boundary

May edit:

- `services/accounting/close-assurance*`
- `services/accounting/data-trust.service.ts`
- `services/inventory/inventory-valuation.service.ts`
- `services/compliance/**/*`
- `prisma/schema.prisma`
- focused tests and local policy gates needed for this risk class.

Must not edit:

- unrelated modules;
- unrelated migrations or generated files;
- historical evidence records through destructive changes;
- statutory/legal claims without real country authority prerequisites.

## Execution Workflow

1. Confirm all lower-numbered exam skills are complete, not applicable, or explicitly blocked with a saved report.
2. Read the enterprise examination report, latest scan reports, graph summary, schema, and this skill's risk brief.
3. Inventory current call sites, service owners, tests, and static gates for this risk class.
4. Build the smallest complete service-owned remediation slice.
5. Enforce tenant scope, actor identity, RBAC, typed errors, audit evidence, idempotency, and ledger/close blockers where relevant.
6. Move callers to canonical service-backed actions/hooks/UI surfaces.
7. Add focused regression tests before deleting or ratcheting old paths.
8. Delete legacy code only after usage reaches zero and behavior is covered.
9. Run focused verification and broaden only when the blast radius requires it.
10. Save a completion report under `what-next/`.

## Gate Boundary

- no legal certification claim without authority adapter and expert review.
- certified export blocked on stale inventory valuation evidence.
- business event records invalidation.
- No raw internal errors may cross a client boundary.
- No tenant-scoped read/write may omit organization scope.
- No economic mutation may skip audit/business-event evidence when applicable.

## Tests

- stale after ledger change.
- stale after inventory change.
- valuation mismatch blocker.
- authority not configured blocker.

## Verification Commands

Run the focused commands that match the touched files:

```powershell
npm test -- services/accounting services/inventory --runInBand
npm run prisma:validate
npm run typecheck
```

Always include `npm run prisma:validate`, `npm run typecheck`, and relevant policy gates when schema, service contracts, or boundary rules change.

## Report Mode

If running this skill without implementing code, create a report under `what-next/exam-suite-runs/` that lists:

- reports and files inspected;
- current status for this risk class;
- concrete first implementation slice;
- blocked dependencies;
- verification commands to run after implementation.

## Completion Report

The final report must include:

- risk class and skill name;
- files inspected and changed;
- services added or reused;
- actions/hooks/UI migrated;
- controls added;
- tests added;
- verification commands and results;
- remaining blockers;
- next exam skill to run.
