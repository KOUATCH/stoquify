# AqStoqFlow Module Surface Registry Ratchet

Date: 2026-07-12
Updated: 2026-07-14
Lane: Full surface registry and inventory ratchets
Mode: observe/report only; no hard enforcement enabled
Skill: `aqstoqflow-module-surface-registry-ratchet`

## Executive Verdict

AqStoqFlow has a useful report-mode module inventory, but it is not yet a complete enterprise surface registry. The current scanner covers navigation, dashboard pages/layouts, server actions, module services, API routes, and API guard evidence. It does not yet fully own reports, exports, jobs, webhooks, proof surfaces, BI cards, public token flows, scheduled processors, or source-module leakage policy.

The next maturity step is not broad hard enforcement. It is a registry-plus-ratchet model: every surface becomes visible, owned, classified, and regression-tested, while the current known gaps are treated as baseline debt. New gaps should stop merging before old debt is fully burned down.

This report began as design-only and is now updated with Gate 1/Gate 2 implementation plus the first coverage expansion: API route and API guard-evidence records are now merged into the module surface registry. It still does not enable hard module entitlement enforcement, schema changes, guard behavior changes, or `policy:gates` wiring.

## Source Evidence

- `scripts/module-surface-inventory.js` writes `what-next/module-surface-inventory.md` and `.json` in report mode.
- `package.json` exposes `module:surface:inventory` as report mode and does not include it in `policy:gates`.
- `package.json` now also exposes `module:surface:baseline`, `module:surface:ratchet`, and `module:surface:fail`; none are wired into `policy:gates`.
- `scripts/module-surface-inventory.js` now supports `--baseline` and `--mode warn|fail` for no-new-gap comparison against a saved baseline.
- Current module inventory source coverage is `sidebar`, `moduleCatalog`, `dashboardRoot`, `actionsRoot`, `apiRoutes`, and `apiGuardInventory`.
- Current inventory baseline before this lane: generated `2026-07-12T05:30:36.281Z`.
- Current record count after API integration: 318.
- Current surface types: action 112, page 109, navigation 72, layout 10, module_service 3, api 10, api_evidence 2.
- Current classifications after API integration: mapped 271, unmapped 34, missing permission 16, enforcement candidate 305, delegated_uploadthing_core 1, not_applicable_public 4, not_applicable_public_service 1, not_applicable_session_claims 1.
- Current guard distribution: sidebar-permission-filter 72, requirePermission 76, checkPermission 59, protect 34, requireAnyPermission 22, FinanceRouteAccess 13, requireApiSessionForCurrentOrg 3, requireApiSessionForOrg 2, requireRbacContext 2, getOptionalRbacContext 1, assertPublicReceiptAccessToken 1, module-observe 1, delegated-re-export 1, none 31.
- API route guard inventory is now integrated into module surface inventory and remains independently clean in fail mode with 10 API routes, 2 guard-evidence records, 0 active issues, 5 required module-applicability routes, and 5 module-enforced route/evidence records.
- Simple filesystem counts show approximately 10 API route files, 170 action files, 120 dashboard page/layout files, 49 scripts, and 38 script tests.

## Current Scanner Coverage

The current scanner is useful but heuristic:

| Area | Current coverage | Gap |
|---|---|---|
| Navigation | Scans `config/sidebar.ts` and `moduleSlug` metadata | Navigation remains permission-filtered and cannot be treated as security |
| Pages/layouts | Scans dashboard `page.tsx` and `layout.tsx` | Does not yet encode unavailable/read-only behavior or source-module registry |
| Actions | Scans `actions/**` and infers guard/permission/module | Several legacy actions remain unmapped or missing permission |
| Module services | Scans `services/modules` | Internal module services need explicit not-applicable vs governance classification |
| APIs | Integrated through `scripts/api-route-guard-inventory.js` into module surface inventory as `api` and `api_evidence` records | Further coverage should add report/export/job/webhook/proof/BI/public token source-module policies |
| Reports | Partially visible through pages/actions | Needs report id, source modules, export policy, retention policy |
| Exports | Partially visible in report/export actions | Needs first-class export surface type and source-module guard contract |
| Jobs/scripts | Not covered as module surfaces | Scheduled processors and release jobs need module ownership and data-impact classification |
| Webhooks | Not covered as module surfaces | Provider inputs need module owner, tenant scope, idempotency, and data class |
| Proof/evidence surfaces | Partially visible through actions/services | Needs proof-surface type, source modules, redaction, retention, certification state |
| BI/cards/widgets | Not covered as module surfaces | Needs source-module and aggregation/redaction policy |
| Public token flows | Some routes classified by API inventory | Need public/token-bound module applicability and leakage policy in registry |

## Registry Record Contract

Every registered surface should eventually have a durable record with these fields:

| Field | Required | Purpose |
|---|---:|---|
| `surfaceId` | yes | Stable id, for example `page:dashboard/accounting/reports/trial-balance` |
| `surfaceType` | yes | `navigation`, `layout`, `page`, `action`, `api_route`, `report`, `export`, `job`, `webhook`, `proof_surface`, `bi_card`, `public_token_flow`, `scheduled_processor`, `module_service` |
| `file` | yes | Source file path |
| `routeOrName` | yes | Route path, action name, job name, report id, export id, or webhook id |
| `owner` | yes | Service/module owner |
| `moduleSlug` | yes unless not applicable | Primary canonical module |
| `sourceModules` | yes for reports/analytics/exports/jobs/proof | Source modules whose data can appear |
| `permission` | yes for protected user surfaces | RBAC permission or explicit not-applicable reason |
| `accessIntent` | yes | `read`, `write`, `operate`, `export`, `job`, `webhook`, `proof`, `administer` |
| `guard` | yes | Current guard: `protect`, `requirePermission`, `checkPermission`, `requireApiModuleAccess`, etc. |
| `moduleGuard` | yes | `none`, `observe`, `enforce`, `not_applicable`, or future wrapper |
| `moduleApplicability` | yes | `required`, `not_applicable_public`, `not_applicable_internal`, `not_applicable_platform`, `token_bound`, `source_inherited` |
| `dataClass` | yes | `none`, `public`, `tenant_operational`, `financial`, `payroll_sensitive`, `compliance`, `proof`, `aggregate` |
| `tenantScope` | yes | How tenant scope is established |
| `redactionPolicy` | yes for sensitive surfaces | Public/internal redaction rule |
| `retentionBehavior` | yes for downgrade-sensitive surfaces | Active/read-only/suspended/expired behavior |
| `unavailableBehavior` | yes | Normal-user and owner/admin unavailable state |
| `riskLevel` | yes | Low, medium, high, critical |
| `classification` | generated | mapped, unmapped, missing permission, guard none, not applicable, etc. |
| `lastSeenAt` | generated | Inventory timestamp |
| `evidence` | optional | Notes, tests, source references, or release evidence |

## Not-Applicable Contract

Not-applicable must be explicit and narrow. Acceptable values:

- `not_applicable_public`: truly public route or page, no tenant data.
- `not_applicable_token_bound`: public but token-bound, signed, scoped, and redacted.
- `not_applicable_auth_provider`: external/auth framework handler.
- `not_applicable_session_claims`: session/claims endpoint that has separate security gate.
- `not_applicable_internal_module_governance`: internal module-control helper, not tenant business data.
- `not_applicable_internal_display_helper`: UI helper without protected tenant data.
- `not_applicable_release_gate`: local release/readiness script.
- `not_applicable_test_fixture`: test-only artifact.

Anything that reads tenant business data, produces an export, runs a job, posts evidence, receives provider data, or returns analytics must not use a vague not-applicable classification.

## Ratchet Strategy

### Phase 0: Preserve report mode

Keep `npm run module:surface:inventory` in report mode while the registry shape is implemented.

Current baseline:

| Metric | Count |
|---|---:|
| Records | 306 |
| Mapped | 266 |
| Unmapped | 34 |
| Missing permission | 16 |
| Guard none | 26 |
| Enforcement candidates | 300 |

### Phase 1: Add explicit baseline snapshot

Create a committed baseline JSON for current known debt:

```text
what-next/module-surface-registry-baseline-2026-07-12.json
```

The baseline should store:

- record identity;
- surface type;
- module slug;
- permission;
- guard;
- classification;
- reason for any not-applicable entry;
- source hash or stable source reference;
- generated timestamp.

### Phase 2: No-new-gap ratchet

Add a fail-mode command that fails only on net-new:

- unmapped protected surfaces;
- missing permission on protected pages/actions/APIs;
- `guard: none` on protected user or tenant-data surfaces;
- unknown module slug;
- report/export/job/webhook/proof surface without source modules;
- public/token-bound surface without explicit not-applicable and redaction policy.

Existing baseline debt may remain temporarily but must not grow.

### Phase 3: Expand coverage

Extend registry/scanner coverage in this order:

1. API routes by integrating existing `api-route-guard-inventory` output.
2. Reports and report actions.
3. Exports and export helpers.
4. Jobs, scheduled processors, and operational scripts.
5. Webhooks/provider events.
6. Proof/evidence surfaces.
7. BI cards, dashboards, analytics widgets, and cross-module aggregates.
8. Public token flows and signed external access.

### Phase 4: Burn down existing debt

Burn down current debt by risk and clarity:

| Priority | Debt cluster | Reason |
|---|---|---|
| 1 | Mapped but missing permission analytics/payroll actions | Easy permission evidence wins without broad enforcement |
| 2 | Dashboard root missing permission | High-traffic page, clean contract needed |
| 3 | Legacy inventory/item actions unmapped | Many have inventory permissions but no module slug |
| 4 | Customer/supplier/category/brand/unit legacy actions | Likely sales, purchasing, inventory, or settings ownership |
| 5 | Evidence/proof-trail actions | Proof surfaces need source-module policy before enforcement |
| 6 | Internal module services | Classify as internal governance or map ownership explicitly |
| 7 | Guard-none protected actions | Hardest risk cluster; fix guard/permission before module enforcement |

### Phase 5: Zero-baseline gate

When unmapped, missing-permission, and protected guard-none counts reach zero or approved not-applicable classifications, switch from no-new-gap to fail-on-any-gap.

### Phase 6: Enforcement readiness gate

Only after durable entitlements, guard contract, module UX states, report/export/job leakage controls, and rollback evidence exist, allow bounded module enforcement pilots.

## Scanner Expansion Design

Recommended implementation shape:

- Keep `scripts/module-surface-inventory.js` as the report generator initially.
- Add a reusable registry reader, either:
  - `services/modules/module-surface-registry.service.ts` for application/runtime use later, and
  - `scripts/module-surface-registry.js` for CI/report generation; or
  - a single `config/module-surface-registry.ts` that can be consumed by both.
- Merge scanner-discovered records with explicit registry records.
- Treat explicit registry records as the source of intended classification, and scanner output as drift detection.
- Emit both Markdown and JSON evidence.
- Add `--mode report`, `--mode warn`, and `--mode fail`.
- Add `--baseline` support for no-new-gap comparison.

Proposed commands:

```json
{
  "module:surface:inventory": "node scripts/module-surface-inventory.js --mode report --out what-next/module-surface-inventory.md --json-out what-next/module-surface-inventory.json",
  "module:surface:baseline": "node scripts/module-surface-inventory.js --mode report --out what-next/module-surface-registry-baseline-2026-07-12.md --json-out what-next/module-surface-registry-baseline-2026-07-12.json",
  "module:surface:ratchet": "node scripts/module-surface-inventory.js --mode warn --baseline what-next/module-surface-registry-baseline-2026-07-12.json --out what-next/module-surface-inventory.md --json-out what-next/module-surface-inventory.json",
  "module:surface:fail": "node scripts/module-surface-inventory.js --mode fail --baseline what-next/module-surface-registry-baseline-2026-07-12.json --out what-next/module-surface-inventory.md --json-out what-next/module-surface-inventory.json"
}
```

Do not add `module:surface:fail` to `policy:gates` until the no-new-gap logic and baseline file have focused tests.

## Report, Export, Job, And Webhook Rules

Reports:

- Declare primary module and source modules.
- Declare whether missing source-module access causes deny, partial/redacted report, or aggregate-only view.
- Record generated-at, source period, source modules, and known blockers.

Exports:

- Treat export as its own access intent.
- Require explicit permission and fresh auth for sensitive exports.
- Deny or redact inactive-source-module data.
- Record export evidence and actor.

Jobs:

- Declare owner module, source modules, write target modules, and allowed states.
- Suspended/expired module jobs should stop, quarantine, or run retention-only tasks explicitly.
- Jobs must not infer access from old tenant data alone.

Webhooks:

- Treat provider webhooks as inputs to internal services.
- Declare module owner and data class.
- Require signature/idempotency evidence where applicable.
- Never use provider payload alone as runtime entitlement truth.

Proof surfaces:

- Declare proof source modules.
- Declare certification/internal evidence state.
- Preserve redaction, retention, and stale-proof policy.

BI/analytics:

- Declare every source module.
- Use aggregate-only or redacted mode when source access is absent.
- Avoid source-module leakage through dashboard cards.

## Data Model Alignment

The entitlement schema lane proposed `CommercialModule`, `CommercialModuleDependency`, package records, tenant subscriptions, tenant entitlements, and entitlement events. The surface registry should add either:

```prisma
model ModuleSurfaceRegistryRecord {
  id                  String   @id @default(cuid())
  surfaceId           String   @unique
  surfaceType         String
  file                String
  routeOrName         String
  owner               String
  moduleSlug          String?
  sourceModules       String[]
  permission          String?
  accessIntent        String
  guardContract       String
  moduleApplicability String
  dataClass           String
  riskLevel           String
  retentionBehavior   Json?
  unavailableBehavior Json?
  redactionPolicy     Json?
  metadata            Json?
  enabled             Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([moduleSlug, enabled])
  @@index([surfaceType, enabled])
  @@index([accessIntent, enabled])
}
```

or a code-owned registry first, with Prisma persistence later. The safer sequence is code-owned registry first, then persistence after the scanner and tests settle.

## Security And RBAC Controls

- Surface registry is not authorization by itself.
- Sidebar hiding is never module security.
- Module entitlement is tenant-level; RBAC remains user-level.
- Wildcard RBAC must not bypass module entitlement.
- Reports, exports, jobs, webhooks, proof surfaces, and BI surfaces must inherit source-module access.
- Public token flows must be signed, scoped, expiring, and redacted.
- Not-applicable classifications must be reviewable and tested.

## Tests For Implementation

Add focused tests before enabling a ratchet:

- scanner keeps current mapped records stable;
- scanner classifies APIs through merged API inventory;
- reports without source modules are flagged;
- exports without `export` access intent are flagged;
- jobs without owner/source/write target are flagged;
- webhooks without owner/idempotency/signature policy are flagged;
- public token flows without redaction policy are flagged;
- no-new-gap ratchet passes when only timestamps change;
- no-new-gap ratchet fails on a new unmapped protected surface;
- no-new-gap ratchet fails on a new missing-permission surface;
- no-new-gap ratchet fails on new protected `guard: none`;
- baseline debt can be reduced without failing.

Suggested command once implementation starts:

```powershell
npm test -- --runInBand scripts/__tests__/module-surface-inventory.test.js
npm run module:surface:inventory
```

## Release-Gate Sequence

1. Keep report mode.
2. Add baseline snapshot.
3. Add tested no-new-gap ratchet command.
4. Run ratchet in CI as report-only evidence.
5. Promote no-new-gap to fail mode.
6. Burn down existing unmapped, missing-permission, and protected guard-none debt.
7. Expand scanner to reports, exports, jobs, webhooks, proof, BI, and public token flows.
8. Promote zero-baseline gate only after debt is resolved or explicitly classified.

## Blockers Before Hard Enforcement

1. Surface registry is not complete.
2. Existing inventory still has 34 unmapped records.
3. Existing inventory still has 16 missing-permission records.
4. Existing inventory still has 31 `guard: none` records, including 20 module-required records.
5. Reports, exports, jobs, webhooks, proof surfaces, BI, and public token flows are not yet fully registered.
6. Central guard contract is not implemented across all surface types.
7. Durable tenant entitlements are not yet implemented.

## Verification Result

API integration verification after this update:

```powershell
npm test -- --runInBand scripts/__tests__/module-surface-inventory.test.js
```

Result: passed, 1 suite, 10 tests. Coverage now includes API route registry records, API guard issues as module-surface ratchet findings, no-new-gap ratchet pass/fail behavior, active gap extraction, and baseline requirements for warn/fail modes.

```powershell
npm test -- --runInBand scripts/__tests__/api-route-guard-inventory.test.js
```

Result: passed, 1 suite, 16 tests.

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "services/modules/__tests__/module-entitlement.service.test.ts"
```

Result: passed, 1 suite, 6 tests.

```powershell
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "actions/modules/__tests__/module-control.actions.test.ts"
```

Result: passed, 1 suite, 3 tests.

```powershell
npm run api:guard:inventory:fail
```

Result: passed. API route guard inventory generated at `2026-07-14T13:33:32.321Z` with 10 API routes, 2 supporting guard evidence records, 12 total evidence records, 0 active issues, 5 required module-applicability records, and 5 module-enforced route/evidence records.

```powershell
npm run module:surface:inventory
```

Result: passed. The report-mode scanner now writes 318 records after adding API route and API guard-evidence records.

```powershell
npm run module:surface:baseline
```

Result: passed. API-integrated baseline snapshot generated at `2026-07-14T13:33:54.676Z` with 20 catalog modules and 318 surfaces.

```powershell
npm run module:surface:ratchet
```

Result: passed in warn mode. Final evidence generated at `2026-07-14T13:34:23.077Z` with 318 surfaces, 271 mapped records, 34 unmapped records, 16 missing-permission records, and 305 enforcement candidates. Baseline ratchet status: passed, baseline active gaps 55, current active gaps 55, active gap delta 0, new gaps 0, resolved gaps 0.

```powershell
npm run module:surface:fail
```

Result: passed against the saved API-integrated baseline. This verifies fail-mode script wiring only; it is not wired into `policy:gates` in this lane.

No hard module entitlement enforcement was enabled.

## Next Handoff

Return to `aqstoqflow-module-control-plane-orchestrator`.

Recommended next lane: expand registry coverage to reports and exports, still in report/warn mode and still outside `policy:gates`.

Reason: the registry now covers navigation, dashboard pages/layouts, server actions, module services, API routes, and API guard evidence. The next high-risk leakage class is report/export output because inactive module data can leak through generated financial, analytics, proof, and export payloads even when pages and actions are registered.
