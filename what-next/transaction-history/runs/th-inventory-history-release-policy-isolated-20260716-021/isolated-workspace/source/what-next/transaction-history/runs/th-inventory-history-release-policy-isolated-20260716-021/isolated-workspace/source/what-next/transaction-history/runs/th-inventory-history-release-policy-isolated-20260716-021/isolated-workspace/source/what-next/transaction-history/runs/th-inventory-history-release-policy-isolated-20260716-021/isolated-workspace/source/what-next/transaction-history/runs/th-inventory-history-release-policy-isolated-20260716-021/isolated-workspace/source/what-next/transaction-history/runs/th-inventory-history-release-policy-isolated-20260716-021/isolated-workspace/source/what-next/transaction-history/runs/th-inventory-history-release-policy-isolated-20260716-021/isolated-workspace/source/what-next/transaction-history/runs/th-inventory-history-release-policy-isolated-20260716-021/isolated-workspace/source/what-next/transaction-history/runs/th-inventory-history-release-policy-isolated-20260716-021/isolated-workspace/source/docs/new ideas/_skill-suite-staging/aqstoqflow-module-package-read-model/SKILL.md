---
name: aqstoqflow-module-package-read-model
description: "Build service-owned AqStoqFlow read models that combine module catalog data, package definitions, tenant subscription state, entitlement decisions, dependency gaps, unknown requested modules, would-block summaries, and enforcement readiness for UI and gates."
---

# AqStoqFlow Module Package Read Model

## Purpose

Provide server-owned package and entitlement truth before Module Control Center UI or release gates consume it.

## Source Context

Before acting, inspect:

- `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
- `docs/modules/AQSTOQFLOW_MODULE_ENTITLEMENT_SCHEMA_AND_MIGRATION_PLAN_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_PACKAGE_STRATEGY_2026-07-12.md`
- `services/modules/module-entitlement.service.ts`
- `actions/modules/module-control.actions.ts`
- `app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx`
- `prisma/schema.prisma`
- `what-next/module-system/execution-status.md`

Prefer current code over stale reports when they conflict.

## Operating Rules

- Preserve service ownership, tenant isolation, RBAC, module entitlement, audit evidence, redaction, and release gates.
- Keep changes surgical and do not touch unrelated lint warnings, broad refactors, or unrelated modules.
- Prefer report mode and observe mode until coverage, slug drift, and dependency gaps are understood.
- Do not enable hard enforcement or destructive migrations without explicit approval.
- Save execution evidence under what-next/ when implementation, audit, or planning work is performed.

## Workflow

1. Inspect current Module Control Center data and module entitlement service.
2. Design read-model contracts for package membership, entitlement source, subscription state, dependency gaps, unknown requested modules, would-block history, and enforcement readiness.
3. Implement service-owned read model only after schema or static package source is available.
4. Add focused tests for tenant scoping and summary correctness.
5. Save report under what-next/.

## Required Checks

- Keep business truth server-side.
- Return DTOs suitable for UI and gates.
- Tenant-scope all reads.

## Avoid

- Client-calculated entitlement truth.
- Duplicating catalog truth in components.
- Hardcoded package pricing in UI.

## Expected Artifacts

- service/read-model contract
- focused tests
- UI integration plan if needed
- what-next report

## Verification

Run only commands relevant to the touched slice. Prefer:

```powershell
npm run typecheck
npm run policy:gates
```
## Stop Conditions

Stop and save a blocker report when:

- A required source-of-truth service or schema owner cannot be identified.
- The next step would require destructive migration, reseed, hard enforcement, or broad refactor without approval.
- A module would be implemented as UI-only business truth.
- Verification failures are unrelated and make the touched slice impossible to isolate.

## Completion Report

When work is performed, save a concise report under what-next/ containing:

- skill name and purpose
- source reports and files inspected
- current status before changes
- files changed or design decisions made
- security, RBAC, tenant, entitlement, audit, redaction, and release-gate controls
- verification commands and results
- remaining blockers and next prompt
