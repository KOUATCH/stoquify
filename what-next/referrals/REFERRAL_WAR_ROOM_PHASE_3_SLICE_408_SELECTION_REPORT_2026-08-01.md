# Referral War Room Phase 3 / Slice 408 Selection Report

Date: 2026-08-01
Slice: 408
Name: Protected Managed-Location Inventory Loss Query
Operating skills: `stoquify-referral-war-room-orchestrator`, `stoquify-inventory-loss-control`, `aqstoqflow-release-verification-foundation`, `stoquify-release-evidence-ratchet`

## Selection Decision

Slice 408 is selected after Slice 407 certified the service-owned inventory loss analytics read model.

The read model has no protected application consumer. Existing platform contracts provide the missing trust boundary: `protect` enforces RBAC and module entitlement, while `resolveOperatingAccessScope` distinguishes tenant-wide administrators from managers assigned to active tenant locations and records minimal scope-decision audit evidence.

## Scope

Selected files:

- `services/inventory/inventory-loss-read.service.ts`
- `services/inventory/__tests__/inventory-loss-read.service.test.ts`
- `actions/inventory/inventoryLossReadActions.ts`
- `actions/inventory/__tests__/inventoryLossReadActions.test.ts`
- `what-next/referrals/INVENTORY_LOSS_CONTROL_SLICE_408_REPORT_2026-08-01.md`
- `what-next/skills-life-cycle/STOQUIFY_SLICE_408_RELEASE_EVIDENCE_REPORT_2026-08-01.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Selected implementation:

- Add a normalized internal `locationIds` filter to the read model, mutually exclusive with singular `locationId`.
- Add a protected read action requiring `inventory.levels.read`.
- Enforce and audit the `inventory` module entitlement in `mode: "enforce"`.
- Derive organization and actor only from the protected RBAC context.
- Resolve tenant-wide versus managed-location access through the established audited operating-access service.
- For managed-location actors, inject all authorized locations when no location is requested.
- Allow a managed-location actor to narrow to one authorized location.
- Reject an unassigned location and inconsistent scope evidence before reading loss data.
- Ignore caller-supplied organization, actor, permission, role, or plural location authority.
- Return the service result with explicit authorized scope metadata.

## Evidence Inputs

- `services/_shared/protect.ts`.
- `lib/security/rbac.ts` and `lib/security/rbac-permissions.ts`.
- `services/modules/module-entitlement.service.ts`.
- `services/operating-access/operating-access-scope.service.ts`.
- `actions/inventory/inventoryMovementHistoryActions.ts` and focused tests.
- Slice 406 protected command evidence.
- Slice 407 read-model evidence.

## Authority Contract

The protected action requires both:

- `inventory.levels.read` through the canonical action wrapper; and
- the operating-access resolver's existing `dashboard.read` and role/location responsibility decision.

Tenant-wide scope is available only through the resolver's established super-user or allowlisted administrator authority. Other authorized users receive only their active managed locations. The action never accepts plural location authority from the caller.

The operating-access resolver writes minimal audit evidence for allowed and denied scope decisions. The inventory read itself remains read-only.

## Explicit Non-Authority

Slice 408 adds no route, page, dashboard, component, schema, migration, new permission, stock write, adjustment approval, alert, leakage exception, daily-truth feed, AI/copilot, WhatsApp, or external-sharing behavior.

It does not infer theft, fault, or causal actor responsibility.

## Expected Verification

- Focused action Jest for tenant derivation, entitlement, operating scope, managed-location filtering, denials, malformed periods, and caller-authority stripping.
- Updated read-model Jest for normalized multi-location filtering and singular/plural conflict rejection.
- Related operating-access and Slice 407 read-model suites.
- `npm run typecheck`.
- Scoped ESLint, direct-database/write scan for the action, authority/source scan, and whitespace/diff hygiene.

## Success Criteria

Slice 408 is certified when:

- tenant and actor identity are server-derived;
- inventory permission and module entitlement are enforced before the read;
- tenant-wide and managed-location scopes follow established audited authority;
- no caller can widen managed location scope;
- the read model receives only trusted singular or plural location filters;
- denial and inconsistent scope evidence fail before service invocation;
- responses remain serialization-safe and preserve Slice 407 evidence semantics.

## Next Skill

Execute with `stoquify-inventory-loss-control`. Return to `stoquify-referral-war-room-orchestrator` after certification before selecting a product UI.
