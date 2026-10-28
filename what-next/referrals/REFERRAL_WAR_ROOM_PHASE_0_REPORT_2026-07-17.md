# Stoquify Referral War Room - Phase 0 Execution Report

Date: 2026-07-17
Status: complete
Operating skill: `stoquify-referral-war-room-orchestrator`
Trigger: `/stoquify-referral-war-room`

## Executive Decision

Phase 0 is complete. The live codebase already contains much of the planned Daily Truth foundation, so the first implementation slice will not rebuild snapshots, action queues, dashboards, or UI.

The selected Phase 1 slice is a server-only **operating access-scope contract and resolver** for location-managed Daily Truth. It will establish when an authenticated actor has tenant-wide operating authority and when the actor is restricted to active locations assigned through `Location.managerId`. The slice ends at the service contract and focused tests; it does not wire a dashboard or change existing product behavior.

This is the safest first move because location authority is a dependency for trustworthy manager views, branch comparisons, leakage detection, inventory-loss controls, and future referral-visible proof. A polished surface built before this contract could disclose tenant-wide aggregates to a location manager or label tenant-wide figures as location-scoped.

## Phase 0 Outcomes

- Refreshed the roadmap status register from live implementation evidence.
- Reclassified Phase 1 as in progress because service-owned operating foundations exist.
- Recorded Phase 2 as evidence discovered but blocked from promotion until operating scope is certified.
- Selected one narrow implementation slice with explicit dependencies, risks, files, tests, and verification commands.
- Identified `/stoquify-daily-truth` as the next skill.
- Changed no application, service, action, route, component, schema, or configuration code.

## Evidence Reviewed

### Strategy And Program Evidence

- `docs/referrals/stoquify-referral-worthy-war-plan-report.md`
- `docs/referrals/stoquify-referral-worthy-execution-roadmap-report.md`
- `docs/referrals/referral-worthy-platform-features-report.md`
- `docs/referrals/stoquify-referral-worthy-skill-suite-installation-report.md`
- `docs/referrals/stoquify-referral-worthy-skill-suite-validation.json`
- `docs/referrals/agents/`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

The installed suite validation reports all ten referral-roadmap skills as valid. Strategy evidence consistently sequences service-owned truth, action/evidence contracts, RBAC, audit, and redaction before dashboards, external proof, AI, or WhatsApp automation.

### Architecture And Graph Evidence

- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/ORDERED_GRAPHIFY_RUN_2026-07-14.md`
- `services/graphify-out/GRAPH_REPORT.md`
- `services/graphify-out/ordered-code-graph.json`

The service graph places snapshots, evidence, and actions in a connected foundation and identifies `getTenantOperatingSnapshot()` as a cross-community bridge. The current Daily Truth surface is therefore shared infrastructure with a broad blast radius; the first change should be a narrow boundary contract, not a broad refactor.

### Live Service Evidence

Existing foundations include:

- `services/snapshots/snapshot-contracts.ts`: normalized scope, freshness, evidence grade, blockers, redactions, and snapshot UI states.
- `services/snapshots/tenant-operating-snapshot.service.ts`: tenant operating composition.
- `services/snapshots/branch-operating-snapshot.service.ts`: tenant-validated, location-filtered branch aggregates and explicit blocked state when location is absent.
- `services/snapshots/payment-truth-snapshot.service.ts`, `inventory-cash-snapshot.service.ts`, and `close-readiness-snapshot.service.ts`.
- `services/signals/`: deterministic signal rules and permission-filtered action queue.
- `services/daily-habit/`, `services/owner-war-room/`, `services/manager-action-center/`, and `services/cash-command/`.
- `services/events/`: durable business-event foundation.
- `services/evidence/`: evidence and proof-trail contracts.
- `services/_shared/protect.ts` and `lib/security/rbac.ts`: authenticated organization, user, roles, permissions, super-user flag, tenant guard, module gate, and action audit context.

### Reusable Security Precedent

`services/payroll/org-manager-scope.service.ts` already demonstrates the relevant pattern:

- resolves active, non-deleted managed locations using organization and authenticated actor;
- derives authority from `Location.managerId`;
- filters payroll data to those location IDs;
- fails closed outside assigned scope;
- records allowed and denied audit evidence; and
- tests tenant validation, managed scope, denied access, and cross-tenant isolation.

The selected slice should extract the operating-level contract from this proven behavior without weakening or rewriting the payroll boundary.

## Multidisciplinary Findings

### System Architecture

The codebase is ahead of the previous roadmap register. Snapshot, signal, action-queue, digest, owner, and manager capabilities exist and have focused tests. The architectural gap is a shared operating authority contract between authenticated RBAC context and location-aware read models.

### Cyber Security

`getManagerActionCenterAction()` protects the action with `dashboard.read` and passes organization plus permissions to the service. The service then composes organization-wide snapshots. It does not receive actor identity, roles, super-user status, or server-resolved managed locations. Permission filtering hides actions a user cannot open, but it does not make the underlying metrics location-scoped.

The resolver must use authenticated context, tenant-constrained database lookups, an explicit tenant-wide authority allowlist, fail-closed defaults, and auditable decisions. A client-provided `locationId` or broad `dashboard.read` permission is not authority evidence.

### Business Logic And Data Trust

`SnapshotScopeInput` includes optional `locationId`. Inventory and branch snapshots apply location filters, but tenant operating, payment truth, and close readiness do not consistently do so. A non-null scope value can therefore be semantically stronger than the data behind it. Consumers must use only read models whose queries prove the declared scope.

The branch snapshot is the current trustworthy location read model. Multi-location composition is not yet a certified behavior and is outside Slice 1.

### Frontend And UI/UX

No UI work is justified in the first slice. The existing Manager Action Center and daily digest may remain unchanged, but their labels and rollout status must not claim branch-scoped truth until a location-aware consumer is verified. Later UI should expose scope, freshness, evidence grade, blockers, and redactions from service results rather than infer them.

### Product Strategy And Growth

Trustworthy delegated management is a prerequisite for stickiness: owners need confidence that managers see and act on the correct branch, while managers need a focused operating rhythm. The same authority contract later enables safe branch comparisons, accountable action assignment, leakage alerts, and shareable proof. Shipping surface-level novelty before this boundary would create trust debt and referral risk.

## Inventory State: Before And After

### Before Phase 0

- Phase 0: ready.
- Phase 1: pending, described as defining snapshot and action-center contracts.
- Phase 2: pending.
- First recommended work: begin Daily Truth generally.
- Live implementation maturity: not reflected in the register.

### After Phase 0

- Phase 0: complete and documented.
- Phase 1: in progress; core snapshot, signal, evidence, action, and digest foundations confirmed.
- Phase 2: implementation evidence exists, but promotion is blocked by the operating-scope dependency.
- First work: one server-only access-scope contract and resolver with tests.
- No existing surface is declared complete solely because code exists.

## Selected Implementation Slice

### Name

Phase 1 / Slice 1 - Operating Access Scope For Location-Managed Daily Truth

### Purpose

Create one reusable service-owned decision that answers:

- Is this authenticated actor authorized for tenant-wide operating truth?
- Otherwise, which active locations in this tenant are assigned to the actor?
- If neither is true, what explicit blocked decision and audit evidence must be returned?

### In Scope

- A typed operating access-scope contract.
- A server-only resolver using authenticated `orgId`, `userId`, roles, permissions, and `isSuperUser` inputs.
- Explicit authority variants such as tenant-wide authority, location responsibility, and denied/blocked.
- Tenant-constrained `Location.managerId` resolution for active, non-deleted locations.
- Explicit, tested allowlisting of tenant-wide role/authority semantics; `dashboard.read` alone is insufficient.
- Allowed and denied audit evidence with minimal, non-sensitive metadata.
- Focused unit tests.

### Out Of Scope

- Manager Action Center integration.
- Changes to owner war room, daily digest, snapshots, routes, actions, components, or navigation.
- Multi-location metric aggregation.
- New UI, dashboard cards, selectors, or explanatory banners.
- Prisma schema changes.
- AI, copilot, WhatsApp, external sharing, or referral artifacts.
- Refactoring the payroll manager-scope service.

### Expected Files

The Daily Truth skill should confirm local naming before editing, but the narrow expected footprint is:

- `services/operating-access/operating-access-scope-contracts.ts` - new typed authority and decision contract.
- `services/operating-access/operating-access-scope.service.ts` - new server-only resolver and audit behavior.
- `services/operating-access/__tests__/operating-access-scope.service.test.ts` - new focused tests.

No existing product file should need modification in Slice 1 unless live inspection proves a minimal shared type import is necessary. Any wider footprint requires returning to the war room before editing.

### Acceptance Criteria

1. The resolver accepts only trusted server context and never trusts a client-owned organization, actor, role, or location assignment.
2. Tenant-wide scope requires explicit authenticated authority, with role/permission semantics documented and tested.
3. Location responsibility is derived from active, non-deleted `Location` rows matching both organization and actor.
4. One and multiple managed locations are represented deterministically and in stable order.
5. No assignment, unknown role, or inadequate authority returns or throws an explicit fail-closed decision.
6. Cross-tenant locations cannot enter the result, including when IDs collide in caller input.
7. Allowed and denied decisions create audit evidence containing authority basis and location IDs only; no payroll, customer, employee, or financial detail is logged.
8. The contract is suitable for later propagation into snapshot scope, evidence metadata, blockers, and UI labels without making AI or UI a source of truth.
9. Existing Daily Truth and manager UI behavior remains unchanged in this slice.

### Focused Tests

- administrator/super-user resolves tenant-wide authority from authenticated context;
- `dashboard.read` without allowlisted tenant-wide authority does not resolve tenant-wide scope;
- manager with one location resolves one tenant-owned location;
- manager with multiple locations resolves a deterministic location list;
- manager with no active assignment fails closed;
- deleted or inactive assignments are excluded;
- unknown/ordinary roles do not receive a broad fallback;
- cross-tenant locations are excluded by the database predicate;
- allowed and denied outcomes write the expected audit evidence;
- no sensitive business detail appears in audit metadata.

### Verification Commands

```powershell
npm test -- --runInBand services/operating-access/__tests__/operating-access-scope.service.test.ts services/payroll/__tests__/org-manager-scope.service.test.ts
npm run typecheck
npm run role:cockpit:gate
git diff --check
git diff -- services/operating-access what-next/referrals
```

The payroll test is a regression guard for the precedent being generalized. The role cockpit gate must remain green, but its current green state does not certify location scope by itself.

## Dependencies

- Authenticated `RbacContext` from `lib/security/rbac.ts`.
- Tenant/action protections in `services/_shared/protect.ts`.
- Durable `Location.managerId`, organization, active, and soft-delete fields.
- Existing audit-log model and action-error conventions.
- Existing payroll manager-scope service as behavioral precedent.
- Existing branch snapshot as the future location-filtered consumer candidate.

## Risks And Controls

| Risk | Control |
|---|---|
| Role names or custom roles accidentally grant tenant-wide truth | Use an explicit authenticated authority policy; test wildcard, administrator, manager, and unknown roles. |
| Permission filtering is mistaken for row-level scope | Keep scope resolution separate from action permission filtering and document both in the contract. |
| Cross-tenant location leakage | Constrain every location query by organization and actor; test the exact predicate. |
| The new contract is wired into broad UI too early | End Slice 1 at contract, service, and tests; select a consumer only in the next war-room review. |
| Multi-location managers produce misleading totals | Do not aggregate in Slice 1; require a later read-model design with explicit evidence semantics. |
| Duplicate or excessive audit logs | Use a narrow event vocabulary and minimal metadata consistent with current audit conventions. |
| Existing location-capable snapshot scope is over-trusted | Require query-level proof before a snapshot can claim location scope. |

## Baseline Verification Result

The following existing suites were run before writing this report:

```powershell
npm test -- --runInBand services/payroll/__tests__/org-manager-scope.service.test.ts services/snapshots/__tests__/branch-operating-snapshot.service.test.ts services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts services/manager-action-center/__tests__/manager-action-center.service.test.ts services/daily-habit/__tests__/daily-habit-digest.service.test.ts services/signals/__tests__/business-signal-rules.service.test.ts
```

Result: **6 suites passed, 28 tests passed, 0 failed**.

## Promotion Gate And Next Handoff

Run `stoquify-daily-truth-command-center` with:

```text
/stoquify-daily-truth
```

That run should implement only Phase 1 / Slice 1 as specified here. After its tests and verification pass, return to `/stoquify-referral-war-room` to inspect the evidence and select one location-aware consumer. The likely candidate is Manager Action Center backed by the existing branch snapshot, but that choice is intentionally not approved in Phase 0.

