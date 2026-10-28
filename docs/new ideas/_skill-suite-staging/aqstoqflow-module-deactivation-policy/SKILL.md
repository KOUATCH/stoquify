---
name: aqstoqflow-module-deactivation-policy
description: "Define or implement safe AqStoqFlow behavior when a tenant loses module access through suspension, cancellation, expiration, dependency gaps, or manual revocation. Use for navigation hiding, API/action denial, historical read-only access, export/proof redaction, job suspension, and audit evidence."
---

# AqStoqFlow Module Deactivation Policy

## Purpose

Make module loss safe, auditable, reversible, and non-destructive.

## Source Context

Before acting, inspect:

- `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
- `services/modules/module-entitlement.service.ts`
- `services/modules/module-catalog.service.ts`
- `services/_shared/protect.ts`
- `lib/security/server-authz.ts`
- `prisma/schema.prisma`
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

1. Identify the affected module, entitlement state, and surfaces.
2. Define behavior for navigation, actions, APIs, reports, exports, proof drawers, scheduled jobs, historical reads, and audit logs.
3. Ensure sensitive data redacts when entitlement would block.
4. Add tests or a report-mode design before enforcement.
5. Save policy or implementation report under what-next/.

## Required Checks

- Treat navigation hiding as usability only, not authorization.
- Preserve historical data.
- Audit grants, revocations, suspensions, and denials.

## Avoid

- Deleting tenant data on subscription loss.
- Leaking disabled module data through exports or proof drawers.
- Silent denial without safe UI state.

## Expected Artifacts

- deactivation policy report
- implementation plan or code changes
- focused tests
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
