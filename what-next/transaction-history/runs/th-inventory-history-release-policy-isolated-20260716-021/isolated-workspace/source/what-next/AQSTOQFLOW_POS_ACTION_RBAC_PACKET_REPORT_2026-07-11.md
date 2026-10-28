# AqStoqFlow POS Action RBAC Packet Report

Date: 2026-07-11
Mode: surgical implementation packet under the Enterprise Agent Upgrade roadmap.

## Packet Scope

Selected surfaces:

- `actions/pos/catalog.actions.ts`
- `actions/pos/drawer-dashboard.actions.ts`
- `actions/pos/terminal-management.actions.ts`

Objective: close a focused Phase 2 tenant/RBAC invariant gap for POS action reads and terminal-management writes by replacing raw organization-only guards with explicit RBAC checks, carrying resource evidence into audit decisions, and proving denied callers cannot reach validation or POS services.

Owning agents/skills:

- `agents-orchestrator`: bounded this packet to POS action RBAC surfaces.
- `better-auth-rbac-ohada`: supplied server-side tenant/RBAC/OHADA control criteria.
- `security-architect` and `application-security-engineer`: reviewed authorization order, cross-organization behavior, and safe-denial behavior.
- `backend-architect`: preserved service-owned POS read/write methods and DTOs.
- `minimal-change-engineer`: approved adding focused action tests instead of refactoring POS services or UI.
- `test-results-analyzer`: required focused action tests plus full release gates.

## Evidence Reviewed

- Active sprint brief from `C:\Users\J COMPUTER\.codex\attachments\d4300d6a-93c0-47d2-88d3-143976652de1\pasted-text-1.txt`, especially Phase 2 tenant/RBAC invariant closure and mandatory guard order.
- `better-auth-rbac-ohada` skill references:
  - `auth-rbac-implementation.md`: one server-side authorization entrypoint, no UI-only trust, no cross-tenant reads/inference.
  - `ohada-operations-controls.md`: POS/cash controls must bind user, terminal, location, drawer, and active organization.
  - `chaos-test-matrix.md`: denied access must not reach business service work or leak cross-tenant existence.
- `actions/pos/catalog.actions.ts` previously used `requireOrg()` before this worktree packet; now it uses `requirePermission("pos.use")` with POS resource evidence.
- `actions/pos/drawer-dashboard.actions.ts` previously used `requireOrg()`; now it uses `requireAnyPermission(["finance.cash-drawer.read", "finance.read"])`.
- `actions/pos/terminal-management.actions.ts` previously used `requireOrg()` and local permission inspection; now it uses `requirePermission`, `isSuperUser`, resource IDs, and audited POS write permission checks.
- `what-next/module-surface-inventory.md` currently maps these action surfaces:
  - `pos/catalog.actions.ts | pos | pos.use | requirePermission | mapped, enforcement candidate`
  - `pos/drawer-dashboard.actions.ts | pos | finance.cash-drawer.read | finance.read | requireAnyPermission | mapped, enforcement candidate`
  - `pos/terminal-management.actions.ts | pos | pos.session.start | requirePermission | mapped, enforcement candidate`
- The active brief names `docs/product/innovation/AQSTOQFLOW_ENTERPRISE_AGENT_UPGRADE_REPORT_2026-07-02.md` and `what-next/AQSTOQFLOW_WAVE1_ENTERPRISE_UPGRADE_REPORT_2026-07-02.md`, but both exact files are absent in this checkout.

## Implementation Summary

- Kept all POS services and schemas unchanged.
- Hardened POS catalog/location/terminal listing actions to require `pos.use` before parsing request input or calling POS services.
- Added `resource` and optional `resourceId` evidence for POS catalog and terminal listing decisions.
- Hardened cash drawer dashboard access with `finance.cash-drawer.read` or `finance.read` before dashboard input parsing or service calls.
- Hardened terminal management actions with explicit `pos.read` for reads and audited `pos.session.start` for create/update/archive.
- Preserved superuser cross-organization behavior only after an explicit RBAC context is returned.
- Moved terminal update/archive blank-terminal responses behind RBAC, preventing unauthorized callers from probing local validation/error branches.
- Added focused tests for allowed paths, denied-before-validation paths, denied-before-service paths, cross-org denial, and audited write resource evidence.

## Changed Files

Packet-owned code and tests:

- `actions/pos/catalog.actions.ts`
- `actions/pos/drawer-dashboard.actions.ts`
- `actions/pos/terminal-management.actions.ts`
- `actions/pos/__tests__/catalog.actions.test.ts`
- `actions/pos/__tests__/drawer-dashboard.actions.test.ts`
- `actions/pos/__tests__/terminal-management.actions.test.ts`

Packet evidence artifacts:

- `what-next/pos-action-rbac-focused-tests-2026-07-11.log`
- `what-next/pos-action-rbac-release-gates-2026-07-11.log`
- `what-next/pos-action-rbac-verify-repo-2026-07-11.log`
- `what-next/AQSTOQFLOW_POS_ACTION_RBAC_PACKET_REPORT_2026-07-11.md`

Verification commands also refreshed existing generated gate artifacts:

- `what-next/api-route-guard-inventory.md`
- `what-next/api-route-guard-inventory.json`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

Pre-existing dirty worktree items outside this packet remain present and were not reverted.

## Focused Verification

Command:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath actions\pos\__tests__\catalog.actions.test.ts actions\pos\__tests__\drawer-dashboard.actions.test.ts actions\pos\__tests__\terminal-management.actions.test.ts
```

Result: passed.

Evidence:

- `Test Suites: 3 passed, 3 total`
- `Tests: 14 passed, 14 total`
- Log: `what-next/pos-action-rbac-focused-tests-2026-07-11.log`

Focused assertions added:

- POS catalog denial happens before required `locationId` validation can leak request-shape details.
- POS terminal listing denial happens before invalid location input reaches service work.
- Cash drawer dashboard denial happens before invalid `period` validation or service execution.
- Terminal management read blocks non-superuser cross-org access before service execution.
- Terminal creation denial happens before validation or service execution.
- Terminal update/archive authorization happens before blank-terminal safe errors.
- Terminal update/archive pass audited POS write resource evidence to RBAC.

## Release Gate Results

Logged in `what-next/pos-action-rbac-release-gates-2026-07-11.log`:

- `npm run prisma:validate`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 0 errors and 4 pre-existing warnings.
- `npm run policy:gates`: passed.
- `node scripts/workflow-assurance-release-gate.js --mode fail`: passed.
- `node scripts/kontava-moat-release-gate.js --mode fail`: passed.
- `npm test -- --runInBand`: passed, `290` suites and `1517` tests.
- `npm run build:app`: passed.

Meta-gate:

- `npm run verify:repo`: passed.
- Log: `what-next/pos-action-rbac-verify-repo-2026-07-11.log`

## Controls Preserved Or Strengthened

- Tenant isolation: POS actions now derive organization scope from RBAC context instead of raw organization-only helpers.
- RBAC: POS action reads/writes require explicit permissions before validation or service execution.
- Auditability: RBAC checks now include stable resources and resource IDs for POS catalog, terminals, cash drawer dashboard, and terminal-management writes.
- Safe errors: unauthorized terminal-management callers do not reach validation/service branches; terminal creation keeps the existing safe fallback message.
- Redaction: no POS receipt/customer/payment payload shape was changed.
- Release gates: focused POS action tests, full Jest, build, policy gates, and `verify:repo` all passed.

## Residual Risks

- Module entitlement remains an enforcement-candidate/report-mode concern for these three POS action files. The module inventory maps them to `pos`, but this packet did not add hard module enforcement or observe events to the actions.
- `pos.session.start` is the existing permission used for terminal-management writes in this worktree; a future domain review should decide whether terminal administration needs a more precise permission.
- The active brief's exact Enterprise Agent Upgrade and Wave 1 report files are absent in this checkout, so this packet relied on the active pasted brief, current inventories, current code, and existing roadmap artifacts.
- The worktree still contains many pre-existing dirty/untracked changes outside this POS packet.
- Lint/build continue to report the same 4 pre-existing warnings about `<img>` usage and anonymous default export.

## Next Safe Implementation Task

Run the POS module-entitlement observe packet for these same action surfaces:

1. Add report/observe-mode module access evidence to `actions/pos/catalog.actions.ts`, `actions/pos/drawer-dashboard.actions.ts`, and `actions/pos/terminal-management.actions.ts`.
2. Keep hard enforcement disabled until `what-next/module-surface-inventory.md` is cleaner.
3. Add focused tests proving admin/wildcard RBAC does not bypass POS module availability once observe/enforce wiring is present.
4. Rerun `npm run module:surface:inventory`, focused POS action tests, `npm run policy:gates`, and `npm run verify:repo`.
