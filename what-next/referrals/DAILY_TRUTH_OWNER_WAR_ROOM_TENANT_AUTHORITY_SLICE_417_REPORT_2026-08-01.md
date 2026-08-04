# Daily Truth Owner War Room Tenant Authority Slice 417 Report

Date: 2026-08-01
Program: Referral-Worthy Execution
Phase: 3, Leakage Radar And Inventory Loss
Slice: 417
Capability: Owner War Room Tenant-Authority Pre-Read Gate
Status: Certified

## Outcome

The Owner War Room now requires a server-resolved actor with inherited `dashboard.read` and established tenant-wide operating authority before any business snapshot, module-control, tenant-operating, entitlement, or proof-subject query begins.

The boundary uses the existing normalized authority contract: authenticated super-user state or role code `admin`, `administrator`, or `super_admin`. It does not promote the `owner` persona label or `org_admin` audience alias into shared authority.

## Before

- The page and protected action required only `dashboard.read`.
- Staff, cashier, viewer, and manager permission bundles can carry `dashboard.read`.
- The service dispatched tenant-wide payment, inventory-cash, close-readiness, module-control, tenant-operating, and proof reads before any tenant-authority check.
- Card `requiredPermission` values described drill-down requirements but did not redact the aggregate card values.
- Slice 416 protected only the optional Inventory Loss feed, leaving the pre-existing War Room payload exposed to lower-scope dashboard readers.

## After

1. `getOwnerWarRoomData` calls the tenant-authority guard before it creates the read scope or dispatches any source call.
2. Missing actor identity, missing inherited dashboard permission, manager/location responsibility, literal `owner`, and `org_admin` inputs fail closed.
3. Every denial records an explicit `KontavaOwnerWarRoom` RBAC decision with a stable reason.
4. Denial raises the established `RbacError` with `FORBIDDEN` and status 403.
5. The dashboard route catches both guard-layer and service-layer RBAC denials and renders its controlled permission-denied state.
6. The protected action remains unchanged; the shared `protect` wrapper converts the same error into its structured safe 403 response.
7. Administrator and super-user access remains available.
8. The Slice 416 Inventory Loss permission and enforced audited inventory-entitlement checks remain intact after base authority succeeds.

## Files Changed

- `services/owner-war-room/owner-war-room.service.ts`
- `services/owner-war-room/__tests__/owner-war-room.service.test.ts`
- `app/[locale]/(dashboard)/dashboard/owner-war-room/page.tsx`
- `app/[locale]/(dashboard)/dashboard/owner-war-room/__tests__/page.test.tsx`
- `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_417_SELECTION_REPORT_2026-08-01.md`
- this report, the release-evidence report, and the war-room status register

The action implementation, output contract, dashboard component, cards, strips, schema, and source adapters were not changed.

## Verification

| Gate | Result |
| --- | --- |
| Focused Owner War Room service/action/exact route | PASS, 3 suites / 17 tests |
| Protected-action safe-error regression | PASS, 1 suite / 10 tests |
| Slice 413-417 consumer and authority regression | PASS, 12 suites / 88 tests |
| Full TypeScript typecheck | PASS |
| Scoped ESLint | PASS |
| Gate-before-source ordering | PASS |
| Direct Inventory Loss source coupling | PASS, 0 matches |
| Sensitive actor/hash exposure | PASS, 0 matches |
| Unsupported accusation additions | PASS, 0 matches |
| Shared role vocabulary | PASS, unchanged |
| Owner War Room contract/component diff | PASS, none |
| Trailing whitespace | PASS, 0 matches |
| Patch rejects | PASS, 0 |

## Residual Constraints

- The sidebar still advertises Owner War Room to users with `dashboard.read`; those users now receive a controlled denial without any War Room data read. Role-aware navigation is a separate UX/policy slice because the sidebar contract currently filters only by permission.
- Any future decision to authorize a literal `owner` or `org_admin` role requires an explicit provisioning and policy change. The shared operating-authority vocabulary must not be expanded incidentally.
- Cash Command still has a broad base-authorization design and must be audited before receiving Inventory Loss or another tenant-wide feed.
- AI and WhatsApp remain non-authoritative.
- POS cash-shortage production activation remains disabled.

## Certification Decision

Slice 417 is release-certified. The P1 Owner War Room tenant-scope exposure is closed at the shared service boundary, before business-data access, while existing tenant-admin and super-user behavior remains intact.
