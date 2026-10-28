# Daily Truth Cash Command Tenant-Authority Slice 418 Report

Date: 2026-08-01
Skill: `stoquify-daily-truth-command-center`
Orchestrator: `stoquify-referral-war-room-orchestrator`

## Scope

Slice 418 closes Cash Command's tenant-wide authorization boundary before another consumer feed is considered.

## Before State

- The dashboard route accepted either `finance.read` or `dashboard.read`.
- The route passed organization, actor, and permissions only.
- `getCashCommandData` constructed tenant scope and started Tenant Operating, Payment Truth, Inventory Cash, Close Readiness, cash-drawer, and module-control reads before any tenant-wide authority decision.
- Four proof-source queries followed signal and action-queue composition.
- Existing tests covered only pure composition and the rendered component.
- The pre-existing `inventory_loss_review` module mapping was already present and remains outside this slice's authorship.

## Implemented Boundary

- `getCashCommandData` now calls `requireCashCommandTenantAuthority` as its first statement.
- The guard requires a non-empty trimmed actor ID, either `finance.read` or `dashboard.read`, and super-user state or normalized `admin`, `administrator`, or `super_admin` authority.
- Every denial audits resource `KontavaCashCommand` and throws `RbacError` with code `FORBIDDEN` and status 403.
- The route now passes server-resolved role codes and super-user state.
- The service invocation is inside the route's RBAC error boundary, so service-layer denial renders the established permission state.
- Output contracts, cards, component rendering, and business-data composition remain unchanged.

## Focused Tests

The service test proves whitespace-only actor identity, missing base permission, `manager`, literal `owner`, and `org_admin` are denied. Every denied case performs zero snapshot, drawer, module-control, signal, action-queue, and proof-source calls and records the expected audit decision. Normalized administrator and super-user inputs still load Cash Command.

The exact route test proves server role codes and super-user state reach the service and service-layer 403 denial renders `permission_denied`.

## Verification

- Pre-edit baseline: 2 suites / 4 tests passed.
- Final Cash Command service suite: 1 suite / 10 tests passed.
- Exact bracketed route suite: 1 suite / 2 tests passed.
- Final related regression bundle: 9 suites / 63 tests passed.
- Full `npm run typecheck`: passed.
- Scoped ESLint for service, route, and focused tests: passed with 0 errors.
- Pre-read ordering scan: guard line 88 precedes scope line 90, first tenant source line 101, and proof-source dispatch line 135.
- Sole production caller scan: only the Cash Command dashboard route invokes the loader.
- Activation, trailing-whitespace, and patch-reject scans: passed.

## Preserved Controls

- Shared tenant-wide role vocabulary was not expanded.
- No Cash Command contract, dashboard component, entitlement policy, schema, migration, action, write, notification, incident, sharing, AI/copilot, WhatsApp, or production-activation behavior changed.
- No Inventory Loss snapshot was added to Cash Command.

## Residual Risks

- Cash Command navigation remains permission-aware but not tenant-authority-aware. Direct route access is safe because the service denies before data reads; navigation filtering remains a usability hardening candidate.
- Literal `accountant` access remains unresolved. Demo-seed presence is insufficient authority evidence; provisioning and product policy must be decided separately.
- Manager and location-responsibility users need a separately designed location-scoped Cash Command if that workflow is desired.

## Decision

Slice 418 is certified. Cash Command now proves established tenant-wide authority before any business-data read while preserving existing administrator and super-user access.

No Slice 419 is selected. Return to `stoquify-referral-war-room-orchestrator` for a fresh evidence and risk audit.

