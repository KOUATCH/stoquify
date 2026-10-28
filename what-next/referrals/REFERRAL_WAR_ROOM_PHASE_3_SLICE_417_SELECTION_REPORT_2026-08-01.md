# Referral War Room Phase 3 Slice 417 Selection Report

Date: 2026-08-01
Program: Referral-Worthy Execution
Phase: 3, Leakage Radar And Inventory Loss
Selected slice: Owner War Room Tenant-Authority Pre-Read Gate
Status: Selected

## Decision

Select Slice 417 to require established tenant-wide operating authority before the Owner War Room starts any snapshot, module-control, tenant-operating, or proof-evidence read.

This closes the higher-priority residual risk recorded by Slice 416 before another tenant-wide consumer is added. Cash Command Inventory Loss integration remains deferred because its own base authorization and caller evidence require a separate audit.

## Live Evidence

- The Owner War Room route and action currently require only inherited `dashboard.read`.
- The service starts tenant-wide payment, inventory-cash, close-readiness, module-control, tenant-operating, and proof queries without a base tenant-authority decision.
- Only the optional Inventory Loss loader currently checks the shared tenant-wide authority resolver.
- Registration and organization provisioning assign tenant founders `admin` or `administrator`; full-system seeds also use `super_admin`.
- `owner` and `org_admin` are product/audience labels, not canonical provisioned tenant-authority roles.
- The shared resolver already normalizes and recognizes `admin`, `administrator`, and `super_admin`, plus authenticated super-user state.
- Slice 416 already propagates role codes and super-user state from both server-owned callers.
- Pre-edit service/action baseline passed: 2 suites / 13 tests. The exact page command initially used a Jest path pattern that did not resolve the bracketed route and will be rerun with a literal path invocation.

## Selected Boundary

- Fail closed before constructing or dispatching any data-source read when actor ID is missing, inherited `dashboard.read` is absent, or shared tenant-wide authority cannot be established.
- Record an explicit RBAC denial audit and raise the established forbidden error.
- Extend the route's existing RBAC error state to cover a service-layer authority denial.
- Prove authorized administrator and super-user access.
- Prove missing actor, missing permission, manager, literal `owner`, and `org_admin` denial with zero calls to snapshot, module-control, tenant-operating, entitlement, or proof sources.
- Preserve the existing Inventory Loss permission and entitlement gate for already authorized tenant-wide actors.

## Expected Files

- `services/owner-war-room/owner-war-room.service.ts`
- `services/owner-war-room/__tests__/owner-war-room.service.test.ts`
- `app/[locale]/(dashboard)/dashboard/owner-war-room/page.tsx`
- `app/[locale]/(dashboard)/dashboard/owner-war-room/__tests__/page.test.tsx`
- focused reports under `what-next/referrals/` and `what-next/skills-life-cycle/`

The protected action implementation is expected to remain unchanged because `protect` already converts service-thrown `RbacError` instances into safe 403 responses. Its focused regression test remains required.

## Verification Plan

- Focused Owner War Room service and action Jest.
- Exact bracketed dashboard-route Jest.
- Slice 413-416 consumer, operating-authority, signal, action-queue, and Inventory Loss regressions.
- Full TypeScript typecheck and scoped ESLint.
- Pre-read denial, zero-source-call, caller-propagation, role-vocabulary, output-contract, direct-source, sensitive-field, accusation-language, patch-reject, and whitespace/diff scans.

## Non-Goals

No role-vocabulary expansion, new permission, navigation schema change, card or strip change, output-contract change, Cash Command feed, standalone owner queue, direct source query, schema, migration, write, notification, persistence, incident, resolution, sharing, AI/copilot authority, WhatsApp authority, or production activation is selected.
