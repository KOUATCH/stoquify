---
name: aqstoqflow-module-enforcement-pilot
description: Plan and run bounded AqStoqFlow module hard-enforcement pilots only after explicit approval. Use when selecting low-risk modules, proving direct URL/action/API/report/export/job denial, unavailable UI states, audit evidence, rollback flags, and cohort rollout while avoiding broad hard enforcement.
---

# AqStoqFlow Module Enforcement Pilot

## Governing Evidence

Read `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md` first, then reverify its findings against current code and generated evidence.

## Purpose

Move from observe mode to hard enforcement only through explicit, bounded, reversible pilots.

This skill executes one focused lane of the AqStoqFlow module control-plane roadmap. It should be used through `aqstoqflow-module-control-plane-orchestrator` when possible.

## Required Sources

Inspect current code before relying on older reports. Start with:

- `docs/modules/AQSTOQFLOW_COMPLETE_MODULE_SYSTEM_ENTERPRISE_ROADMAP_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_FULL_ARCHITECTURE_AUDIT_AND_REMEDIATION_REPORT_2026-07-12.md`
- `docs/architecture/decisions/0004-kontava-module-vocabulary-and-ownership.md`
- `docs/architecture/decisions/0007-kontava-module-entitlement-observe-mode.md`
- `docs/architecture/decisions/0011-kontava-module-ownership-inventory.md`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `services/_shared/protect.ts`
- `lib/security/server-authz.ts`
- `lib/security/auth-session.ts`
- `config/sidebar.ts`
- `prisma/schema.prisma`
- `scripts/module-surface-inventory.js`

Read `references/lane-reference.md` after the source scan for lane-specific details.

## Operating Rules

- Keep module control in observe/report mode unless the user explicitly approves a bounded enforcement pilot.
- Do not treat sidebar hiding as module security.
- Do not treat `Organization.requestedModules` as durable entitlement truth.
- Keep RBAC and module entitlement separate.
- Preserve tenant isolation, service ownership, auditability, redaction, safe errors, release gates, and rollback paths.
- Prefer service-owned state and read models before UI surfaces.
- Keep changes surgical and ignore unrelated dirty-worktree changes.
- Save a report when producing architecture, implementation, or verification evidence.

## Lane

Pilot enforcement planning and execution

## Workflow

1. Inspect the required sources and current implementation anchors.
2. Confirm prerequisites and current observe/report-mode posture.
3. Execute only this lane's scope: Select pilot candidate, check prerequisites, define rollback, verify all surfaces, and record deny/audit evidence. Never enable broad enforcement by default.
4. Produce or update the expected artifacts.
5. Run the smallest honest verification set.
6. Save findings, blockers, and next-step handoff.

## Expected Artifacts

docs/modules/AQSTOQFLOW_MODULE_ENFORCEMENT_PILOT_PLAN_2026-07-12.md

## Verification

Baseline verification:

~~~powershell
npm run module:surface:inventory
~~~

When module services, guards, or inventory logic are changed, also run the focused tests named by the roadmap:

~~~powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "services/modules/__tests__/module-entitlement.service.test.ts"
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "actions/modules/__tests__/module-control.actions.test.ts"
npm test -- --runInBand scripts/__tests__/module-surface-inventory.test.js
~~~

Run broader gates only when this lane changes application behavior.

## Stop Conditions

Stop and save a blocker report when:

- hard enforcement would be required without explicit approval;
- a source-of-truth service or schema owner cannot be identified;
- the work would become a broad unrelated refactor;
- the path relies on sidebar hiding for security;
- the path treats `Organization.requestedModules` as durable entitlement truth;
- verification failures are unrelated and block an honest result.

## Completion Report

When work is performed, save a concise report with:

- skill name and lane;
- source files and documents inspected;
- current status and blockers;
- decisions or changes made;
- security, RBAC, tenant, entitlement, audit, redaction, and release-gate controls;
- verification commands and results;
- next orchestrator handoff.
