# Referral War Room Phase 3 Slice 418 Selection Report

Date: 2026-08-01
Orchestrator: `stoquify-referral-war-room-orchestrator`
Implementation skill: `stoquify-daily-truth-command-center`

## Selected Slice

Phase 3 / Slice 418: Cash Command Tenant-Authority Pre-Read Gate.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/DAILY_TRUTH_OWNER_WAR_ROOM_TENANT_AUTHORITY_SLICE_417_REPORT_2026-08-01.md`
- `what-next/skills-life-cycle/STOQUIFY_SLICE_417_RELEASE_EVIDENCE_REPORT_2026-08-01.md`
- `services/cash-command/cash-command.service.ts`
- `services/cash-command/__tests__/cash-command.service.test.ts`
- `app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx`
- `services/operating-access/operating-access-scope-contracts.ts`
- `config/permissions.ts`
- `prisma/comprehensive-seed.ts`

## Decision

Cash Command currently accepts either `finance.read` or broad `dashboard.read`, then starts six tenant-wide business-data reads and later proof-source queries without proving tenant-wide operating authority. This is the highest-severity unresolved consumer boundary after Slice 417.

The service will require all of the following before constructing a read scope or calling any source:

- a non-empty server-resolved actor ID;
- either existing Cash Command permission, `finance.read` or `dashboard.read`;
- the certified shared tenant-wide authority: super-user state or normalized `admin`, `administrator`, or `super_admin` role.

Every denial must record an explicit `KontavaCashCommand` RBAC decision and throw the canonical 403 `RbacError`. The dashboard route must pass server-owned role and super-user evidence and render its existing controlled permission-denied state for service-layer denial.

## Policy Boundary

- The shared tenant-wide role vocabulary is not expanded.
- `manager`, literal `owner`, and `org_admin` remain unauthorized for tenant-wide Cash Command reads.
- `accountant` is not added from demo-seed evidence alone. A broader accountant access policy requires a separate provisioning and product-policy decision.
- The existing `inventory_loss_review` signal-to-module mapping in Cash Command is preserved but no new Inventory Loss source or consumer feed is added.

## Expected Product Files

- `services/cash-command/cash-command.service.ts`
- `services/cash-command/__tests__/cash-command.service.test.ts`
- `app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx`
- `app/[locale]/(dashboard)/dashboard/finance/cash-command/__tests__/page.test.tsx`

## Focused Verification Plan

- Denial matrix proving zero tenant snapshot, drawer, module-control, signal, action-queue, and proof-source calls for missing actor, missing permission, manager, literal `owner`, and `org_admin`.
- Administrator and super-user success cases.
- Route propagation of role codes and super-user state.
- Route-controlled 403 rendering for service-layer denial.
- Existing composition and component regression.
- Full typecheck and scoped ESLint.
- Static ordering, authority-vocabulary, direct-source, sensitive-field, activation, whitespace, and patch-reject scans.

## Baseline

Pre-edit Cash Command service and component tests passed: 2 suites / 4 tests.

## Non-Goals

- No output-contract, component, card, strip, navigation, schema, migration, entitlement, write, notification, incident, resolution, sharing, AI/copilot, WhatsApp, or production-activation change.
- No per-location Cash Command variant and no new Inventory Loss consumer feed.
