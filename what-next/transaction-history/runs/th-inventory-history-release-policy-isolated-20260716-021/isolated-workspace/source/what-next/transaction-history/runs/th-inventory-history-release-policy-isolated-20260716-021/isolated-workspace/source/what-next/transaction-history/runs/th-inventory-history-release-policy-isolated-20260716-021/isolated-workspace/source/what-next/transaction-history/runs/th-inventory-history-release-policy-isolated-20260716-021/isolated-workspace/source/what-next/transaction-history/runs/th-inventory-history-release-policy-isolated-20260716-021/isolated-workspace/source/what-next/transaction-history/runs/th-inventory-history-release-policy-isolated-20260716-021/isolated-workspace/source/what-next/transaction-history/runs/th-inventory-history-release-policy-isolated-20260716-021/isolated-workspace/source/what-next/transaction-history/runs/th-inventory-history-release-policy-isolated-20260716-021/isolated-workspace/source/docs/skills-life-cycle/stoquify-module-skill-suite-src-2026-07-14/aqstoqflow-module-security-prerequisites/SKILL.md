---
name: aqstoqflow-module-security-prerequisites
description: Close and verify security prerequisites for the Stoquify/AqStoqFlow module control plane. Use before privileged Module Workbench commands or entitlement enforcement when reviewing cross-tenant access, wildcard roles, invitation role assignment, step-up authentication, private tenant uploads, break-glass access, or application-layer tenant isolation.
---

# AqStoqFlow Module Security Prerequisites

## Governing Evidence

Read `docs/new ideas/STOQUIFY_MODULE_SYSTEM_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md` first, then reverify its findings against current code and generated evidence.

## Purpose

Remove confirmed security blockers that would make module administration or enforcement unsafe. Execute narrow fixes with negative tests before commercial entitlement work proceeds.

## Required Sources

1. The proposal section `Adjacent Security Blockers`
2. `actions/pos/terminal-management.actions.ts`
3. `actions/pos/__tests__/terminal-management.actions.test.ts`
4. `lib/security/rbac.ts` and `lib/security/rbac-permissions.ts`
5. `actions/users/sendInvite.ts`
6. `services/users/user-identity.service.ts`
7. `lib/security/auth-session.ts`
8. `actions/storage/photo-upload-actions.ts`
9. `app/api/uploads/[...path]/route.ts`
10. `references/security-gate-matrix.md`

## Invariants

- A tenant wildcard role is not a platform-operator identity.
- Tenant scope comes from trusted session context unless an explicit break-glass context is verified.
- An actor cannot assign a role carrying authority the actor is not allowed to grant.
- Sensitive commands require server-verifiable step-up evidence and fail closed when it is absent.
- Private tenant files do not live under a public static path and are not publicly cacheable.
- Break-glass is explicit, scoped, reason-bound, time-limited, independently approved, alerted, and audited.
- Module entitlement never substitutes for tenant isolation or RBAC.

## Workflow

1. Reproduce each confirmed finding with a focused negative test before changing implementation.
2. Remove ordinary wildcard-role cross-tenant access from POS terminal management.
3. Add a role-assignment authorization boundary and grant-ceiling check to invitation workflows.
4. Replace session-age freshness with persisted, server-verifiable step-up evidence; fail closed when absent.
5. Move sensitive uploads outside public static delivery or gate them behind authenticated tenant-scoped delivery with private caching.
6. Define break-glass as a separate platform capability; do not rename `isSuperUser` and call it complete.
7. Run focused tests after each change, then run tenant-isolation and security policy gates.
8. Save a stage report with confirmed fixes, deferred P1 items, and residual risk.

## Verification

- Cross-tenant POS read, create, update, and archive denial for tenant administrators.
- Platform-support access denial unless an explicit verified operator context is present.
- Invitation denial when the target role exceeds the actor grant ceiling.
- Stale, missing, fabricated, and cross-session step-up evidence denial.
- Direct static upload path, cross-tenant file, revoked-session, and shared-cache denial.
- Audit assertions for allowed and denied privileged actions.

## Stop Conditions

Do not proceed to broad module enforcement while any P0 gate in the matrix is open. Stop if a fix requires weakening tenant predicates, trusting caller-supplied organization IDs, accepting UI-only controls, or fabricating authentication evidence.

## Completion Report

List each finding, affected paths, tests added, commands run, result, remaining assumptions, deployment checks, and whether the security prerequisite gate is open or closed.
