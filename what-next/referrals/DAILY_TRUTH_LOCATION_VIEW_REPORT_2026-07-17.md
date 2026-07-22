# Daily Truth Location View Report

Generated: 2026-07-17
Skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`
Program phase: Phase 2, Slice 4
Decision: complete

## Slice Objective

Consume the unified Manager Action Center query at the protected action and server-page boundaries, preserve the existing tenant dashboard, and add one dedicated responsive view for managers whose verified operating authority is limited to assigned locations.

The slice was intentionally limited to read-only consumer wiring and presentation. It added no schema, migration, write workflow, notification, AI, or WhatsApp behavior.

## Before State

- `getManagerActionCenterQuery()` already resolved operating access once and returned a discriminated `TENANT` or `LOCATIONS` result.
- The protected action still called the tenant-only service and returned `ManagerActionCenterData`.
- The server page still called the tenant-only service and rendered only `ManagerActionCenterDashboard`.
- Location-managed users therefore received a safe unavailable state even though separate service-owned location bundles existed.
- No product component rendered branch identity, branch snapshot trust, branch-only metrics, hidden-work count, blockers, redactions, or permission-filtered action links.

## After State

### Protected Consumer

- `getManagerActionCenterAction()` now returns `ManagerActionCenterQueryResult`.
- The action continues to use `protect()` with `dashboard.read`, audit enabled, and dashboard module observation.
- Parsed dates and freshness inputs are passed to `getManagerActionCenterQuery()` with the trusted protected context.
- Client-supplied organization identity remains ignored.

### Server Page

- The page calls `requirePermission("dashboard.read")` before any read.
- It invokes `getManagerActionCenterQuery()` exactly once with the trusted RBAC context.
- `TENANT` renders the existing `ManagerActionCenterDashboard` with its original data contract.
- `LOCATIONS` renders the new `ManagerLocationActionCenterDashboard`.
- A denied or inconsistent operating scope still fails closed through the shared dashboard error surface without revealing tenant or branch evidence.

### Managed-Location View

- Radix tabs provide familiar, keyboard-operable location navigation.
- Each tab renders one service-owned bundle; no cross-location KPI, total, ranking, queue, or inferred comparison is computed.
- Branch identity includes location name, code, and source identifier.
- Each active branch exposes snapshot status, UI state, evidence grade, source modules, generated time, source observation time, freshness threshold, and stale reason.
- Blocked, stale, partial, empty, building, failed, permission/module-unavailable, and redacted states are explicit.
- Blockers and redactions remain inspectable with source gate, reason, policy, and next safe action where supplied.
- All supported `BranchOperatingMetrics` are displayed only inside the selected bundle.
- Monetary values have no currency symbol or currency label because the branch contract does not provide currency; the interface explicitly says that source values are shown and no currency is inferred.
- Action links come only from the permission-filtered branch queue. Hidden-work count and the no-visible-action state are explicit.
- English and French copy covers empty, blocked, redacted, hidden-work, and no-action states.

## Control Preservation

| Control | Evidence |
|---|---|
| Service-owned truth | UI consumes `ManagerLocationActionCenterData` and performs no source queries or business recomputation. |
| Single access resolution | Product consumers use `getManagerActionCenterQuery()`; resolved tenant/location builders remain behind that boundary. |
| Tenant isolation | Trusted `ctx.orgId` and the query service's identity checks remain authoritative. |
| RBAC | Both action and page require `dashboard.read`; action links were already filtered against actor permissions in the service. |
| Audit | Protected action keeps `auditResource: KontavaManagerActionCenter` and `auditAllowed: true`; page keeps audited `requirePermission()`. |
| Module entitlement observation | Protected action retains the dashboard module surface declaration in observe mode. |
| Redaction | Snapshot and action redactions are displayed, not reconstructed or bypassed. |
| Scope honesty | Location bundles remain separate; blocked evidence for one branch does not relabel or suppress another branch. |
| Safe failure | Forbidden scope decisions render a non-enumerating error state. |

## Files Changed

- `actions/manager-action-center/manager-action-center.actions.ts`
- `actions/manager-action-center/__tests__/manager-action-center.actions.test.ts`
- `app/[locale]/(dashboard)/dashboard/manager-action-center/page.tsx`
- `app/[locale]/(dashboard)/dashboard/manager-action-center/__tests__/page.test.tsx`
- `components/manager-action-center/ManagerLocationActionCenterDashboard.tsx`
- `components/manager-action-center/__tests__/ManagerLocationActionCenterDashboard.test.tsx`

The existing tenant dashboard component was not changed.

## Verification Evidence

### Focused Regression Set

Command:

```text
npx --no-install jest --runInBand --testPathPatterns "ManagerLocationActionCenterDashboard.test.tsx$|ManagerActionCenterDashboard.test.tsx$|manager-action-center.*page.test.tsx$|manager-action-center.actions.test.ts$|manager-action-center-query.service.test.ts$|manager-location-action-center.service.test.ts$|manager-action-center.service.test.ts$|operating-access-scope.service.test.ts$"
```

Result: 8 suites passed, 37 tests passed, 0 failed.

Coverage includes:

- trusted action-context passthrough;
- discriminated action result preservation;
- one unified page query;
- unchanged tenant rendering branch;
- dedicated location rendering branch;
- fail-closed page state;
- accessible location tabs and branch switching;
- blocked branch isolation;
- English and French state copy;
- empty location-scope presentation;
- existing unified-query, builder, tenant, location, and operating-scope regressions.

### Static And Release Checks

- `npm run typecheck`: passed.
- Focused ESLint for all touched action, page, component, and test files: passed.
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers.

The role-cockpit gate explicitly certifies the Daily Digest cockpit rather than every role surface, so it is supporting evidence and not a standalone certification of this page.

### Browser Verification

A temporary local-only locale route mounted the real `ManagerLocationActionCenterDashboard` with deterministic service-contract fixtures. The route and server logs were removed after verification.

Playwright evidence:

- desktop viewport: 1440 x 1000;
- mobile viewport: 390 x 844;
- desktop document width: 1440 / content width: 1440;
- mobile document width: 390 / content width: 390;
- mobile tab rail: `overflow-x: auto`;
- keyboard activation changed the active bundle from `location-central` to `location-coastal`;
- blocked branch state was visible on desktop;
- fresh no-action branch state was visible after switching on mobile.

Artifacts:

- `what-next/referrals/manager-location-action-center-desktop.png`
- `what-next/referrals/manager-location-action-center-mobile.png`
- `what-next/referrals/manager-location-action-center-visual-check.json`

Compact viewport previews were also inspected for hierarchy, wrapping, branch identity, tab readability, and trust-state presentation. The previews were temporary and were removed after inspection.

## Non-Goals Honored

- No dashboard state became a source of truth.
- No tenant-wide fallback was shown to a location-managed account.
- No branch currency was guessed.
- No multi-location totals, rankings, comparisons, or flattened queues were introduced.
- No writes, assignment lifecycle, sign-off workflow, notification, automation, AI, or WhatsApp behavior was added.
- No unrelated application code was changed.

## Residual Risks

- Branch amounts remain currency-unlabelled until a trusted currency field is added to the branch read contract.
- Business signals and action items still do not carry an explicit location field; safety currently depends on keeping them inside the bundle built from one branch snapshot.
- The page is read-only. It links to existing operational surfaces but does not itself resolve, assign, waive, or sign off work.
- Phase 2 still lacks the roadmap's end-of-day close checklist and durable manager sign-off.
- POS shift close is a cashier/terminal transaction and accounting `CloseRun` is an accounting-period assurance workflow. Neither can be relabelled as branch end-of-day sign-off without a dedicated contract and evidence boundary.

## War-Room Handoff

Phase 2 remains active.

Selected next slice: **Phase 2 / Slice 5 - branch end-of-day close readiness contract and service evidence**.

Next skill:

```text
/stoquify-daily-truth
```

The next slice must begin with a read-only, location-honest readiness contract backed by existing POS session, cash drawer, branch snapshot, and available reconciliation evidence. It must not create a sign-off UI or reuse accounting-period `CloseRun` as daily-close truth. Durable sign-off state, audit events, and lifecycle transitions belong to a later slice after the evidence contract is proven.
