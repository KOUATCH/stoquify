---
name: aqstoqflow-module-surface-inventory-gate
description: "Build or run a report-mode module surface inventory gate for AqStoqFlow. Use when mapping routes, server actions, API routes, reports, exports, jobs, proof surfaces, and navigation entries to canonical module slugs before subscription packaging or entitlement enforcement."
---

# AqStoqFlow Module Surface Inventory Gate

## Purpose

Expose unmapped module surfaces and slug drift before package enforcement can become safe.

## Source Context

Before acting, inspect:

- `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
- `what-next/module-surface-registry-baseline-2026-07-12.json`
- `what-next/module-surface-inventory.json`
- `scripts/module-surface-inventory.js`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `config/sidebar.ts`
- `package.json`

Prefer current code over stale reports when they conflict.

## Operating Rules

- Preserve service ownership, tenant isolation, RBAC, module entitlement, audit evidence, redaction, and release gates.
- Keep changes surgical and do not touch unrelated lint warnings, broad refactors, or unrelated modules.
- Prefer report mode and observe mode until coverage, slug drift, and dependency gaps are understood.
- Do not enable hard enforcement or destructive migrations without explicit approval.
- Save execution evidence under what-next/ when implementation, audit, or planning work is performed.

## Workflow

1. Read canonical slugs and catalog route prefixes.
2. Scan navigation, App Router pages, server actions, API routes, reports, exports, jobs, proof surfaces, and scripts.
3. Classify each surface as mapped, inferred, unmapped, unknown slug, dependency gap, missing permission, dashboard-only risk, module unavailable state missing, or enforcement-pilot candidate.
4. Write JSON and markdown evidence under what-next/.
5. Keep report mode exit code zero until active critical gaps reach zero.

## Required Checks

- Include exact file paths.
- Distinguish active findings from allowed or inferred findings.
- Keep hard enforcement disabled.

## Avoid

- Fail mode before a reviewed baseline.
- Editing unrelated modules while inventorying.
- Assuming hidden navigation is authorization.

## Expected Artifacts

- module surface inventory JSON
- module surface inventory markdown summary
- next cleanup prompts

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
