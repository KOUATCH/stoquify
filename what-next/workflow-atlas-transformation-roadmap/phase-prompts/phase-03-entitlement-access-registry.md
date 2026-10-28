Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

# Phase 03: Entitlement, Scope, And Destination Policy Foundation

## Objective

Establish the server-only access contracts required for authenticated guidance. Do not expose or alter authenticated navigation in this phase.

## Hard Prerequisites

- Module-control Stage 01 security prerequisites are complete.
- Module-control vocabulary, enforcement truth, surface registry, durable entitlement, and canonical guard stages are approved.
- Enforce decisions do not depend on `requestedModules` or legacy full-suite fallback.
- Phase 00 invariant remains signed.

If any prerequisite is missing, save a blocker report and stop.

## Required Skills

- `aqstoqflow-prompt-architect`
- `aqstoqflow-access-boundary-hardener`
- `aqstoqflow-module-control-plane-orchestrator`
- `aqstoqflow-module-access-guard-contract`
- `aqstoqflow-module-entitlement-schema`
- `aqstoqflow-module-surface-registry-ratchet`
- `aqstoqflow-module-release-gates`

## Implement

1. Create one server-only destination policy registry for all 41 current destinations.
2. Record exact route, any/all permissions, module dependencies, tenant/location/self scope, sensitivity, fresh-auth policy, and domain owner.
3. Generalize tenant/location/self scope from server-owned access context.
4. Normalize access states:
   `login_required`, `tenant_required`, `stale_session`, `permission_denied`, `scope_denied`, `module_locked`, `read_only`, `step_up_required`, and `allowed`.
5. Keep data readiness separate from access state.
6. Ensure permission denial masks entitlement details and all sensitive counts.
7. Validate registry parity with sidebar, page guards, module catalog, and action/API guards.
8. Do not accept a role, outcome, or client permission list in the projection service.

## Verification

- Session revocation and stale-organization tests.
- Unknown-permission and wildcard-risk tests.
- Cross-tenant and wrong-location negative tests.
- Suspended, expired, read-only, dependency-missing, and step-up tests.
- Registry parity for 41/41 destinations.
- Page and action/API authorization equivalence.
- `npm run module:surface:fail`
- `npm run api:guard:inventory:fail`
- Current policy and release gates.

## Evidence

Save policy snapshot, access-state matrix, negative test output, module gate output, and blockers under:

`what-next/workflow-atlas-transformation-roadmap/phase-03-access-foundation/`

## Stop Conditions

- Legacy or registration intent influences an enforce decision.
- One destination lacks a domain owner, scope rule, permission, or module mapping.
- Page-only protection is proposed without action/API reauthorization.
- A denied record includes hidden counts or sensitive state.

## Non-Goals

No visible authenticated guidance, no broad module enforcement, no new billing/package work, and no dashboard route.

