# ADR 0007: Kontava Module Entitlement Observe Mode

Date: 2026-06-20

Status: Accepted for Phase 0 governance

## Context

Kontava currently has permission-based navigation and `Organization.requestedModules`. That field is useful registration intent, but it is not a durable subscription entitlement system.

The platform must evolve into a module-oriented SaaS safely. Existing tenants must not suddenly lose access. Normal users should eventually see only subscribed modules, while owners/admins should get controlled upgrade surfaces. This cannot be implemented as sidebar hiding only.

## Decision

Module entitlements will be introduced in observe mode before hard enforcement.

Definitions:

- Entitlement: tenant-level right to access a module or module feature.
- Permission: user or role-level right to perform an action or view a resource.
- Observe mode: a non-breaking mode that records what would be blocked without denying access.
- Hard enforcement: server-side denial after observe reports are clean and approved.

## Entitlement Decision Contract

Later services should converge on:

```ts
type ModuleEntitlementDecision = {
  organizationId: string
  moduleSlug: string
  featureKey?: string
  mode: "observe" | "enforce"
  result: "allowed" | "would_block" | "blocked" | "trial" | "read_only" | "suspended" | "dependency_missing"
  reasonCode: string
  requiredModules: string[]
  source: "legacy_default" | "requested_modules" | "plan" | "manual_grant" | "trial" | "suspension"
}
```

## Guard Order

Server-side guards must evaluate:

1. Session.
2. Tenant scope.
3. Module entitlement.
4. RBAC permission.
5. Fresh auth for sensitive actions.
6. Maker-checker where required.
7. Consent where partner/export data is involved.
8. Redaction before response.
9. Audit of allow, deny, observe, export, consent, and redaction decisions.

RBAC wildcard can satisfy RBAC permission checks only. It must not bypass entitlement, consent, fresh auth, maker-checker, certification, or evidence rules.

## Rollout Rules

1. Keep existing access behavior unchanged in the first pass.
2. Derive legacy/default entitlements for existing tenants.
3. Use `Organization.requestedModules` only as input to entitlement migration, not as the source of truth.
4. Add observe-mode would-block logs before denial.
5. Apply server-side checks to routes, actions, APIs, reports, exports, and jobs.
6. Use owner/admin upgrade surfaces only after product language is approved.
7. Hard enforcement requires clean observe reports and explicit release approval.

## UX Rules

Normal users:

- Non-subscribed modules should eventually be invisible in normal navigation.
- Direct URL access should show safe unavailable states.
- Upgrade marketing should not distract users who cannot buy.

Owners/admins:

- See subscribed, trial, suspended, read-only, unavailable, and dependency-missing modules.
- Request upgrades through controlled surfaces.
- See observe-mode diagnostics during rollout.

## Phase 0 Gate

This ADR passes Phase 0 when later module-control-plane work can implement observe mode without debating terminology or guard order.

