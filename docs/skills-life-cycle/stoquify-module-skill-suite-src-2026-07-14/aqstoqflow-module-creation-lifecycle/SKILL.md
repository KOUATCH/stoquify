---
name: aqstoqflow-module-creation-lifecycle
description: "Create or review AqStoqFlow modules so each module has a canonical slug, owner, status, risk level, permissions, dependencies, route prefixes, package eligibility, service-owned read model, audit/redaction rules, and release-gate readiness. Use before a module becomes sellable or entitlement-enforced."
---

# AqStoqFlow Module Creation Lifecycle

## Purpose

Make each new or existing module package-ready without creating dashboard-only business truth.

## Source Context

Before acting, inspect:

- `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
- `docs/modules/AQSTOQFLOW_COMPLETE_MODULE_SYSTEM_ENTERPRISE_ROADMAP_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_CANONICAL_MODULE_VOCABULARY_2026-07-12.md`
- `docs/modules/AQSTOQFLOW_MODULE_DEPENDENCY_MATRIX_2026-07-12.md`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `what-next/module-surface-inventory.json`
- `what-next/module-system/execution-status.md`

Prefer current code over stale reports when they conflict.

## Operating Rules

- Preserve service ownership, tenant isolation, RBAC, module entitlement, audit evidence, redaction, and release gates.
- Keep changes surgical and do not touch unrelated lint warnings, broad refactors, or unrelated modules.
- Prefer report mode and observe mode until coverage, slug drift, and dependency gaps are understood.
- Do not enable hard enforcement or destructive migrations without explicit approval.
- Save execution evidence under what-next/ when implementation, audit, or planning work is performed.

## Workflow

1. Extract the module domain, surfaces, service owner, and business purpose.
2. Compare the desired module against the canonical catalog and slug aliases.
3. Define or update lifecycle metadata: slug, name, owner, status, risk, core flag, route prefixes, permissions, dependencies, package eligibility, availability policy, enforcement readiness.
4. Confirm service-owned read models, DTOs, audit events, and redaction rules exist before UI.
5. Save a module lifecycle checklist and catalog delta plan under what-next/.

## Required Checks

- Define canonical slug and owner.
- Define required and recommended dependencies.
- Map permissions and route prefixes.
- Identify service/read-model owner before UI.

## Avoid

- UI-only modules.
- Slug drift.
- Permissions hidden only in navigation.
- Hard enforcement before inventory coverage.

## Expected Artifacts

- module lifecycle checklist
- catalog delta plan
- permission and dependency map
- package eligibility decision
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
