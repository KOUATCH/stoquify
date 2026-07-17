# AqStoqFlow POS Module Observe Packet Report

Date: 2026-07-11
Mode: surgical implementation packet under the Enterprise Agent Upgrade roadmap.

## Packet Scope

Selected POS action surfaces:

- `actions/pos/catalog.actions.ts`
- `actions/pos/drawer-dashboard.actions.ts`
- `actions/pos/terminal-management.actions.ts`

Objective: move the already RBAC-hardened POS action surfaces from module-inventory-only evidence toward report-mode module entitlement observation, without enabling hard enforcement or changing POS service behavior.

Release-gate addendum:

- `docs/skills-life-cycle/skills/stoquify-settings-surface-inventory-classifier/scripts/classify-settings-surfaces.test.js`

This generated skill lifecycle test was discovered by full Jest and used Node's `node:test` runner directly, which made Jest report `Your test suite must contain at least one test.` The fix keeps Node runner compatibility while letting Jest register the same test through `global.test`.

Owning agents/skills:

- `agents-orchestrator`: kept the packet bounded to POS action observe-mode evidence plus one release-gate blocker fix.
- `aqstoqflow-module-surface-inventory-gate`: required report/observe mode, refreshed inventory evidence, and avoided hard enforcement.
- `better-auth-rbac-ohada`: required server-side RBAC/tenant control and bypass tests.
- `security-architect` and `application-security-engineer`: verified that RBAC denial skips module observation and service work, and wildcard RBAC is only evidence for observe decisions.
- `backend-architect`: preserved existing POS service contracts and DTOs.
- `minimal-change-engineer`: limited code changes to already-touched POS action files, focused tests, and the single generated test compatibility blocker.
- `test-results-analyzer`: required focused tests, module entitlement service coverage, inventory refresh, release gates, and `verify:repo`.

## Evidence Reviewed

- Active sprint brief from `C:\Users\J COMPUTER\.codex\attachments\d4300d6a-93c0-47d2-88d3-143976652de1\pasted-text-1.txt`, especially Phase 3 module entitlement observe-to-enforce guidance and the mandatory guard order.
- `aqstoqflow-module-surface-inventory-gate` skill: keep report/observe mode until coverage, slug drift, and dependency gaps are understood.
- `better-auth-rbac-ohada` references:
  - `auth-rbac-implementation.md`: one server-side authorization entrypoint, no UI-only trust, safe tenant isolation.
  - `chaos-test-matrix.md`: denied callers must not reach service work or leak hidden records.
  - `ohada-operations-controls.md`: POS and cash controls must bind user, terminal, location, drawer, and active organization.
- `services/modules/module-entitlement.service.ts`: `observeModuleAccess` allows in observe mode while recording would-block evidence and preserving `rbacWildcardBypassedEntitlement: false`.
- `services/_shared/protect.ts`: existing module gate caller pattern uses `observeModuleAccess`, with explicit `mode` and module metadata.
- `actions/owner-war-room/owner-war-room.actions.ts`: existing action-level observe-mode pattern.
- `actions/pos/receipt-token.actions.ts`: existing POS module gate pattern, currently hard-enforced for receipt-token management.
- `what-next/module-surface-inventory.md`: refreshed at `2026-07-11T10:13:25.774Z`; POS action surfaces remain mapped to `pos` and classified as enforcement candidates.
- The active brief names `docs/product/innovation/AQSTOQFLOW_ENTERPRISE_AGENT_UPGRADE_REPORT_2026-07-02.md` and `what-next/AQSTOQFLOW_WAVE1_ENTERPRISE_UPGRADE_REPORT_2026-07-02.md`, but both exact files remain absent in this checkout.

## Implementation Summary

- Added audited `observeModuleAccess` calls to POS catalog/location/terminal listing after RBAC and before service execution.
- Added audited POS module observation to the cash drawer dashboard action after finance RBAC and before parsing/service execution.
- Added audited POS module observation to terminal-management reads and writes.
- Preserved report-only behavior by using `mode: "observe"` everywhere in this packet.
- Preserved existing service-owned POS logic; no POS service, schema, Prisma, route, or UI files were changed.
- Preserved non-superuser cross-organization denial before module observation and service execution.
- Ensured superuser cross-organization reads observe the target organization, not merely the actor's home organization.
- Added focused tests proving wildcard permissions are passed to module observation as evidence while observe-mode would-block decisions remain non-denying.
- Stabilized the generated skill lifecycle test by changing `const test = require("node:test")` to `const test = global.test || require("node:test")`.

## Changed Files

Packet-owned POS code and tests:

- `actions/pos/catalog.actions.ts`
- `actions/pos/drawer-dashboard.actions.ts`
- `actions/pos/terminal-management.actions.ts`
- `actions/pos/__tests__/catalog.actions.test.ts`
- `actions/pos/__tests__/drawer-dashboard.actions.test.ts`
- `actions/pos/__tests__/terminal-management.actions.test.ts`

Release-gate compatibility addendum:

- `docs/skills-life-cycle/skills/stoquify-settings-surface-inventory-classifier/scripts/classify-settings-surfaces.test.js`

Packet evidence artifacts:

- `what-next/pos-module-observe-focused-tests-2026-07-11.log`
- `what-next/pos-module-observe-inventory-2026-07-11.log`
- `what-next/pos-module-observe-release-gates-2026-07-11.log`
- `what-next/pos-module-observe-verify-repo-2026-07-11.log`
- `what-next/AQSTOQFLOW_POS_MODULE_OBSERVE_PACKET_REPORT_2026-07-11.md`

Verification commands refreshed existing generated artifacts:

- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `what-next/api-route-guard-inventory.md`
- `what-next/api-route-guard-inventory.json`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

Pre-existing dirty worktree items outside this packet remain present and were not reverted.

## Focused Verification

Command:

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath actions\pos\__tests__\catalog.actions.test.ts actions\pos\__tests__\drawer-dashboard.actions.test.ts actions\pos\__tests__\terminal-management.actions.test.ts services\modules\__tests__\module-entitlement.service.test.ts docs\skills-life-cycle\skills\stoquify-settings-surface-inventory-classifier\scripts\classify-settings-surfaces.test.js
```

Result: passed.

Evidence:

- `Test Suites: 5 passed, 5 total`
- `Tests: 24 passed, 24 total`
- Log: `what-next/pos-module-observe-focused-tests-2026-07-11.log`

Focused assertions added or preserved:

- POS catalog actions emit `moduleSlug: "pos"`, `surfaceType: "action"`, `mode: "observe"`, and `audit: true` before service execution.
- Cash drawer dashboard action emits POS module observe evidence before dashboard service execution.
- Terminal management reads/writes emit read/write POS module observe evidence with the RBAC actor context.
- Non-superuser cross-org terminal reads stop before module observation and service execution.
- Superuser cross-org terminal reads observe the target organization.
- Wildcard RBAC permissions are passed to `observeModuleAccess`, and observe-mode would-block decisions remain report-only.
- The module entitlement service test continues to prove wildcard RBAC does not bypass entitlement decisions.
- The generated skill lifecycle classifier test now passes under Jest.

## Inventory Result

Command:

```powershell
npm run module:surface:inventory
```

Result: passed.

Evidence:

- Log: `what-next/pos-module-observe-inventory-2026-07-11.log`
- Refreshed records: `306`
- `mapped: 260`
- `missing permission: 26`
- `unmapped: 46`
- POS action rows remain mapped and enforcement candidates:
  - `pos/catalog.actions.ts | pos | pos.use | requirePermission`
  - `pos/drawer-dashboard.actions.ts | pos | finance.cash-drawer.read | finance.read | requireAnyPermission`
  - `pos/terminal-management.actions.ts | pos | pos.session.start | requirePermission`

## Release Gate Results

Logged in `what-next/pos-module-observe-release-gates-2026-07-11.log`:

- `npm run prisma:validate`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 0 errors and 4 pre-existing warnings.
- `npm run policy:gates`: passed.
- `node scripts/workflow-assurance-release-gate.js --mode fail`: passed.
- `node scripts/kontava-moat-release-gate.js --mode fail`: passed.
- `npm test -- --runInBand`: passed, `291` suites and `1521` tests.
- `npm run build:app`: passed.

Meta-gate:

- `npm run verify:repo`: passed.
- Log: `what-next/pos-module-observe-verify-repo-2026-07-11.log`
- `Test Suites: 294 passed, 294 total`
- `Tests: 1531 passed, 1531 total`

## Controls Preserved Or Strengthened

- Tenant isolation: service calls still use server-resolved RBAC organization context or explicitly validated superuser target scope.
- RBAC: denied RBAC callers cannot reach module observation, validation, or POS services.
- Module entitlement: these POS action surfaces now emit observe-mode module entitlement evidence instead of only appearing in static inventory.
- Auditability: observe calls include stable surface names, user IDs, actor permissions, module slug, action surface type, access intent, and audit flag.
- Redaction: no POS receipt/customer/payment payload shape was changed.
- Safe errors: terminal blank-ID safe errors now remain behind RBAC and module observe evidence for authorized callers only.
- Release gates: focused tests, module inventory, full release ladder, and `verify:repo` are green.

## Residual Risks

- POS module access is still observe/report mode for these three actions; hard enforcement was intentionally not enabled.
- The module surface inventory still reports `46` unmapped surfaces and `26` missing-permission classifications outside this packet.
- The POS terminal-management write permission remains `pos.session.start`; a future domain permission review should decide whether terminal administration needs a more precise permission.
- Public receipt token config gate remains ready but warns that the production receipt token secret is not configured in this local environment.
- Lint/build still report 4 pre-existing warnings: 3 `<img>` warnings and 1 anonymous default export warning.
- The worktree remains broadly dirty with unrelated pre-existing changes and generated artifacts outside this packet.

## Next Safe Implementation Task

Run a module surface cleanup packet for one high-confidence non-POS cluster from `what-next/module-surface-inventory.md`, preferably the settings/roles/users surfaces already blocking clean full-suite governance:

1. Classify whether each selected surface is public/token-bound, helper-only, settings-owned, administration-owned, or unresolved.
2. Add or correct report-mode module metadata only where the source evidence is clear.
3. Add focused tests for any changed classifier, action, or guard surface.
4. Keep hard entitlement enforcement disabled until unmapped and missing-permission counts are reduced and reviewed.
5. Rerun `npm run module:surface:inventory`, focused tests, `npm run policy:gates`, and `npm run verify:repo`.
