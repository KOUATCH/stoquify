# AqStoqFlow Enterprise System Examination Report

Date: 2026-06-16

Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

Audit mode: enterprise codebase examination, no broad refactor performed.

Selected audit skills:

- `stockflow-ohada-saas-backbone`
- `ohada-compliance-chaos-auditor`
- `review`

## 1. Executive Summary

AqStoqFlow is no longer a simple demo application. The repository now contains a large Next.js App Router SaaS platform with real Prisma persistence, service modules, RBAC, typed action wrappers, business-event evidence, accounting controls, inventory valuation work, AP/payroll/payment/compliance/offline-sync foundations, and a Close & Assurance Center.

The current build is technically healthy: Prisma validation, TypeScript, lint, the inventory boundary fail gate, the full Jest suite, and the production build all passed during this examination. That is a strong signal that the recent hardening work is internally coherent.

The platform is not yet release-ready for a production accountant-certified or statutory OHADA deployment. The main risk is architectural unevenness: newer enterprise kernels are controlled and tested, while older server actions, API routes, CRUD paths, reporting components, and legacy services still use direct Prisma access, raw errors, mock/demo data, hard deletes, or split domain ownership.

Recommended next move: stabilization and cleanup before expanding more modules. Continue feature work only as controlled vertical slices that also retire the legacy bypasses around the same domain.

Readiness verdict:

- Continued backend feature work: ready, if gated and service-owned.
- Internal QA/stabilization: ready and recommended now.
- Production pilot with real tenants: not yet, unless scoped to audited modules only.
- External statutory certification claim: not ready.
- Full release hardening: blocked by legacy path migration, provider/country-pack production readiness, and missing CI ratchets.

## 2. Verification Snapshot

The following checks were run during the examination.

| Gate | Result | Notes |
| --- | --- | --- |
| `npm run prisma:validate` | Passed | Prisma schema validates. Warning: `package.json#prisma` config is deprecated for Prisma 7. |
| `npm run typecheck` | Passed | `tsc --noEmit --pretty false` completed successfully. |
| `npm run inventory:boundary:fail` | Passed | Active violations: 0. Allowed kernel/test findings: 22. Total stock mutation callsites scanned: 22. |
| `npm run lint` | Passed with warnings | Warnings only: missing React hook deps in email verification form, image optimization warnings, and `next lint` deprecation for Next.js 16. |
| `npm test -- --runInBand` | Passed | 54 suites, 253 tests. |
| `npm run build` | Passed on rerun | First run timed out at 304s; rerun with a 600s timeout passed in about 429s. Build script uses `next build --no-lint`, so lint is not part of build. |

Important package script evidence:

- `package.json:11` uses `npx prisma generate && next build --no-lint`.
- `package.json:14` uses deprecated `next lint`.
- `package.json:15` defines the TypeScript gate.
- `package.json:18-19` define inventory boundary report and fail modes.
- `package.json:21` defines Jest.

## 3. Repository Shape And Maturity

Observed surface area:

- 1054 non-ignored repository files.
- 99 App Router pages.
- 9 App Router API route handlers.
- 98 action files.
- 155 service files.
- 33 hook files.
- 165 component files.
- About 600 TypeScript source files under `services`, `actions`, `app`, `components`, and `hooks`.

Graph evidence:

- `graphify-out/GRAPH_REPORT.md` reports a full repository graph rebuilt on 2026-06-14.
- The graph contains 4121 nodes, 5321 edges, and 135 communities.
- Major graph themes include tenant defense, ledger-first operational posting, auth/RBAC hardening, enterprise error handling, POS delivery, business events, and accounting spine.

This confirms a broad and real system, but also a high-risk maintenance profile: the system is large enough that policy must be enforced by ratchets, not by convention alone.

## 4. Completed Work

The following areas are implemented enough to be treated as real foundations. Some still have listed limitations.

### Platform Foundation

Status: mostly complete.

Evidence:

- App Router, services, actions, hooks, dashboard components, Prisma schema, migrations, Jest, TypeScript, and lint infrastructure exist.
- `package.json` includes build, lint, typecheck, Prisma validation, Jest, and inventory boundary gates.
- Current build and test gates pass.

Remaining risk:

- The build script skips lint with `--no-lint`, so CI can pass a build while lint issues remain.
- The lint command itself uses `next lint`, which is deprecated for Next.js 16.

### Auth, RBAC, And Tenant Context

Status: mostly complete, uneven adoption.

Evidence:

- `lib/security/rbac.ts:211` exports `requireRbacContext`.
- `lib/security/rbac.ts:248` exports `requirePermission`.
- `lib/security/rbac.ts:216` records RBAC decisions through `auditRbacDecision`.
- `lib/security/rbac.ts:322` exposes `assertCanUseOrganization`.
- `lib/security/server-authz.ts:39` exports `requireApiSessionForOrg`.
- `services/_shared/protect.ts:31` calls `requirePermission` inside service protection helpers.
- Role, payroll, purchasing, accounting, inventory, and POS actions/tests use these patterns in several newer surfaces.

Remaining risk:

- Some API routes and server pages still import Prisma directly.
- Some legacy actions accept or pass caller-supplied `organizationId` instead of deriving all scope from RBAC context.
- The RBAC foundation is good, but enforcement is not yet universal.

### Enterprise Error Handling Foundation

Status: mostly complete, uneven adoption.

Evidence:

- `lib/error-handling/types.ts:185` defines `ServerActionResult`.
- `lib/error-handling/server-action-wrapper.ts:65` normalizes action errors.
- `lib/error-handling/server-action-wrapper.ts:252` defines `createStockFlowActionWrapper`.
- `lib/error-handling/server-action-wrapper.ts:327` defines `inventoryAction`.
- `lib/error-handling/server-action-wrapper.ts:345` defines `financialAction`.
- Many newer actions use `inventoryAction`, `financialAction`, `posAction`, or `protect`.

Remaining risk:

- Static scans still found many `throw new Error` and `console.error` callsites in services/actions.
- Legacy services such as `services/purchase-order/purchase-order.service.ts` expose raw error strings across many paths.
- Some route handlers log internals or rethrow raw exceptions.

### Business Event Gateway

Status: mostly complete as a shared foundation.

Evidence:

- `services/events/business-event.service.ts:97` defines `recordBusinessEventInTx`.
- `services/events/business-event.service.ts:119` rejects idempotency replay with a different payload hash.
- `services/events/business-event.service.ts:145-151` creates outbox messages with deterministic idempotency keys.
- `services/events/__tests__/business-event.service.test.ts` covers append-only event creation, idempotent replay, and mismatched replay rejection.
- Historical report `AQSTOQFLOW_000_SUITE_004_010_GATE_REPORT_2026-06-14.md` confirms POS, compliance, and payment adoption started.

Remaining risk:

- Not every old economic workflow emits the universal `BusinessEvent` envelope.
- Legacy CRUD/actions still need migration or explicit "non-economic" classification.

### Accounting, Ledger, And Close Assurance

Status: mostly complete for system evidence and internal assurance.

Evidence:

- Prisma contains accounting settings, fiscal years, accounting periods, close runs, checklist items, findings, evidence items, close exports, journals, journal lines, ledger posting batches, source links, posting rules, and ledger audit events.
- `AQSTOQFLOW_CLOSE_ASSURANCE_CENTER_IMPLEMENTATION_REPORT_2026-06-16.md` confirms:
  - Close routes exist at `/dashboard/accounting/close` and `/dashboard/accounting/close/[periodId]`.
  - The route is protected and tenant-scoped.
  - The readiness engine composes period close preflight, ledger reconciliation, payment reconciliation, source links, and audit events.
  - Certified close pack export blocks on non-ready runs, open high/critical findings, missing evidence, stale fresh auth, missing permissions, or same-actor SoD.
  - Focused close assurance tests passed.

Remaining risk:

- Statutory certification remains out of scope.
- Automatic recertification triggers are still a limitation.
- Deeper inventory valuation certification remains future hardening.

### Inventory Valuation Kernel

Status: mostly complete for the recent 010 kernel, with legacy adjacency still requiring cleanup.

Evidence:

- `AQSTOQFLOW_010_ADJUSTMENT_WRITEOFF_COUNT_KERNEL_REPORT_2026-06-15.md` confirms:
  - `stock.adjustment.posted`
  - `stock.write_off.posted`
  - physical count freeze and variance generation
  - evidence hashes for sensitive stock events
  - maker-checker controls
  - ledger posting or explicit posting blockers
  - durable business-event and notification outbox records
- `services/inventory/inventory-adjustment.service.ts:1129` exports `postStockAdjustment`.
- `services/inventory/inventory-adjustment.service.ts:1208` records business events.
- `services/inventory/inventory-adjustment.service.ts:1239-1249` emits ledger-blocked notification evidence when posting is blocked.
- `services/inventory/__tests__/inventory-adjustment.service.test.ts:285` covers explicit ledger blockers.
- `services/inventory/__tests__/inventory-adjustment.service.test.ts:331` covers write-off evidence failure.
- `services/inventory/__tests__/inventory-adjustment.service.test.ts:352` covers maker-checker violation.
- The current `npm run inventory:boundary:fail` gate passed with 0 active stock mutation violations.

Remaining risk:

- Historical 010 reports identify adjacent legacy producers needing follow-up migration.
- The current boundary gate proves direct final stock mutations are controlled, but it does not prove every action is thin or every inventory read/report path is service-owned.

### POS And Offline POS

Status: POS core mostly complete; offline POS foundation partial by design.

Evidence:

- POS service tests pass in the full Jest suite.
- `AQSTOQFLOW_014_OFFLINE_POS_SYNC_ARCHITECT_BUILDER_EXECUTION_REPORT_2026-06-15.md` confirms:
  - offline devices, sync batches, events, conflicts, and certificates exist.
  - accepted offline envelopes are captured as immutable evidence.
  - sync validates sequence continuity, hash-chain continuity, duplicate replay, idempotency conflicts, and revoked devices.
  - accepted events remain `PENDING_REPLAY` with explicit close/certification blockers.
  - offline sync does not directly write final sales, stock, drawer, payment, ledger, or fiscal truth.
  - focused offline sync tests passed.

Remaining risk:

- The safe replay slice is still not complete.
- Provisional receipts are not yet final legal/fiscal artifacts.
- Manager conflict resolution, offline tender reconciliation, and device key rotation remain deferred.

### Purchasing And AP

Status: AP control kernel mostly complete; legacy purchase-order service remains a split-brain risk.

Evidence:

- `AQSTOQFLOW_011_AP_FINALIZER_CLOSURE_REPORT_2026-06-15.md` confirms:
  - AP default SYSCOHADA posting recipes exist.
  - AP creates ledger postings when valid rules resolve.
  - Missing/unbalanced rules create truthful blockers.
  - Supplier invoice posting and payment release have idempotency checks.
  - VAT provenance resolves through country-pack resolver.
  - outbound supplier payments create payment reconciliation evidence.
  - focused AP tests passed.

Remaining risk:

- `services/purchase-order/purchase-order.service.ts` still contains legacy raw errors, direct Prisma orchestration, hard deletes for purchase orders/lines, and many workflows outside the newer AP control style.
- `components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx:771` still has a TODO using `approvedBy: 'system-user'`.

### Payment Reconciliation

Status: mostly complete for durable in-app reconciliation infrastructure; external production certification not complete.

Evidence:

- Prisma contains provider accounts, provider events, statement files/lines, payment transactions, match records, suspense items, reconciliation runs, payment exceptions, and inbox items.
- Historical payment reports indicate durable provider event and statement ingestion, matching/suspense infrastructure, dashboards, and certification controls were added and tested.

Remaining risk:

- Production provider credentials/channels, export signing/watermark policy, external statement feeds, and real-world certification remain outside the current local verification.
- Suspense posting and provider-account completeness must remain close gates.

### Compliance And Country Packs

Status: partial by design.

Evidence:

- Prisma contains fiscal documents, fiscal document lines, compliance submissions, adapter configs, compliance evidence, and audit logs.
- Compliance service tests pass in the full Jest suite.
- Country-pack services and Cameroon pack exist.
- `services/compliance/adapters/registry.ts:20` routes to a fake sandbox adapter when appropriate.
- `services/compliance/adapters/cameroon-dgi-sandbox.ts` explicitly refuses production automation in sandbox conditions.
- Many country-pack values are explicitly marked `REQUIRES_EXPERT_REVIEW`.

Remaining risk:

- Legal/statutory production adapters and expert-validated country values remain incomplete.
- The system must not claim production legal certification while `REQUIRES_EXPERT_REVIEW` remains in active country-pack capability paths.

### Payroll And Presence

Status: partial to mostly complete for the first backend kernel.

Evidence:

- Prisma contains employee, contract, period, attendance snapshot, payroll run, payslip, declaration, and payment batch structures.
- Payroll action and service tests pass in the full Jest suite.
- Historical 012 reports indicate payroll/presence foundations and immutability/completion work were implemented.

Remaining risk:

- Real statutory payroll country parameters, filing adapters, and production payroll expert validation remain incomplete.
- UI and operational workflows need continued hardening and broader coverage.

### Reporting And Data Trust

Status: partial to mostly complete depending on module.

Evidence:

- Close Assurance and Data Trust reports/routes exist.
- Payment and accounting reports carry provenance/status in newer work.
- `components/reports/cash-flow-report.tsx:8` still has a TODO about a missing or moved `financial-reports` import.

Remaining risk:

- Some report components may render as present in the UI while not yet tied to complete service evidence.
- Reporting should be audited module by module for provenance, period status, source status, row count, filter hash, and export audit records.

## 5. Incomplete Work

### Legacy Server Actions Still Own Too Much Business Logic

Confirmed examples:

- `actions/inventory/inventoryMovementActions.ts:126-189` generates transfer numbers, validates stock, and creates stock transfers directly in an action.
- `actions/inventory/inventoryMovementActions.ts:319-389` reads stock transfers and inventory transactions directly.
- `actions/inventory/inventoryMovementActions.ts:443-472` reserves inventory through an action-owned path.
- `actions/item/items.ts:66-131` performs item reads/lists directly through Prisma.
- `actions/item/items.ts:131-259` updates item fields directly.
- `actions/item/items.ts:274-343` contains stock update orchestration inside an action, even though permission checks were added.
- `actions/item/items.ts:377-398` deletes an item directly.
- `actions/itemsShow/deleteItem.ts:12-44` finds and hard-deletes an item directly.

Impact:

- The service layer is not yet the sole owner of entity invariants.
- Action wrappers protect some error handling, but direct action mutation remains a control bypass risk.

### API Routes And Server Pages Still Bypass Service Boundaries

Confirmed examples:

- `app/api/v1/organisations/route.ts:2` imports `db`.
- `app/api/v1/organisations/route.ts:8` reads organization context from `(session?.user as any)?.organizationId`.
- `app/api/v1/organisations/route.ts:14-30` queries `db.organization.findFirst` directly.
- `app/api/v1/organisations/[id]/items/route.ts:37-47` directly queries items/count.
- `app/api/v1/organisations/[id]/items/route.ts:67-75` directly queries items again.
- `app/api/v1/organisations/[id]/items/route.ts:91-93` logs and rethrows the raw error.
- `app/api/v1/organisations/[id]/briefItems/route.ts:64-83` directly queries items.
- `app/api/v1/organisations/[id]/briefItems/route.ts:104-122` directly queries items again.
- `app/[locale]/(auth)/user-invite/[organisationId]/page.tsx:15` reads invites directly by token.
- `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/Page.tsx:18-23` queries items directly from a page.

Impact:

- Route handlers and pages can drift from service-owned tenant/RBAC/error/audit patterns.
- The invite route has a route `organisationId` parameter but primarily trusts the token lookup; this is not necessarily exploitable, but the route contract is misleading and should be service-owned.

### Mock Or Demo Paths Still Exist

Confirmed examples:

- `actions/inventory/inventoryActions.ts:120` says "Mock implementation - replace with actual database query".
- `actions/inventory/inventoryActions.ts:121` defines `mockItems`.
- `actions/inventory/inventoryActions.ts:567` defines `mockTransactions`.
- `actions/inventory/inventoryActions.ts:771` defines `mockAdjustments`.
- `actions/inventory/inventoryActions.ts:858` defines `mockTransfers`.
- `app/[locale]/(dashboard)/dashboard/items/new/page.tsx:4` identifies itself as a duplicate/demo route.
- `lib/error-handling/monitoring.ts:877` and `lib/error-handling/monitoring.ts:882` contain mock monitoring calculations.

Impact:

- Demo code can be mistaken for production behavior.
- Enterprise dashboards must not show mock stock or financial data without a visible demo boundary.

### Hard Deletes And Historical Evidence Risk

Confirmed examples:

- `actions/itemsShow/deleteItem.ts:44` calls `db.item.delete`.
- `actions/item/items.ts:392` calls `db.item.delete`.
- `services/purchase-order/purchase-order.service.ts:454` deletes purchase order lines during update.
- `services/purchase-order/purchase-order.service.ts:492-493` deletes purchase order lines and the purchase order.
- Other CRUD services include direct delete patterns for unit, tax-rate, location, users, and item-supplier relationships.

Impact:

- Some deletes may be safe for drafts or configuration values, but the policy is not uniform.
- Economic records should prefer soft delete, cancellation, reversal, or immutable status transitions with audit evidence.
- A hard-delete ratchet is needed so future code cannot erase evidence-bearing records accidentally.

### Split Domain Ownership

Confirmed examples:

- New purchasing/AP controls exist under `services/purchasing`.
- Legacy purchase order workflows remain under `services/purchase-order`.
- Inventory has modern `services/inventory/*` kernels, but old action modules still expose inventory read/mock/transfer/reservation functions.
- Item management exists in both `actions/item` and `actions/itemsShow`, with overlapping create/update/delete/read responsibilities.

Impact:

- Developers can pick the wrong path and bypass newer controls.
- Tests tend to cover the new kernels, while legacy paths remain under-tested.

### CI And Tooling Gaps

Confirmed examples:

- `package.json:11` runs production build with `--no-lint`.
- `package.json:14` uses deprecated `next lint`.
- Full build passed, but only after a long run; first audit attempt timed out at 304s.

Impact:

- CI can miss lint regressions.
- Build performance is already heavy enough that targeted gates and caching need attention.

## 6. Current Problems

### Security And Authorization Issues

1. RBAC is not universally enforced at every service boundary.
2. Several routes/actions still perform direct Prisma access.
3. Some older paths pass organization IDs through input rather than always deriving them from trusted session/RBAC context.
4. Route handlers still use `as any`, raw logging, and direct `NextResponse` error patterns.
5. Same-actor segregation of duties is present in newer kernels, but not proven across all sensitive legacy workflows.

### Tenant Isolation Risks

1. Many queries include `organizationId`, which is positive.
2. The risk is not absence of tenant fields; it is lack of a universal enforcement layer.
3. The codebase relies on each developer remembering tenant filters.
4. Direct Prisma in pages/routes/actions makes tenant isolation a convention instead of a hard boundary.

### Audit And Evidence Risks

1. New economic kernels emit business events and ledger evidence.
2. Legacy deletes, legacy action mutations, and some CRUD workflows do not consistently emit immutable business evidence.
3. Reporting and monitoring still contain mock/TODO traces.

### Error Handling Risks

1. The typed error/action wrapper foundation exists.
2. Raw `throw new Error`, `console.error`, and direct rethrow patterns remain in older services/actions.
3. Client-facing routes can still leak internal error shape or message conventions.

### Accounting Discipline Risks

1. New AP, inventory, POS, payment, and close assurance work is ledger-aware.
2. Legacy purchase-order and item paths remain inconsistent.
3. Some posted journal update paths should receive a specific immutability audit to prove finalized entries cannot be edited except through reversal/repair workflows.

### UI And Data Consistency Risks

1. Dashboard patterns are present, but duplicate/demo routes remain.
2. Some UI components still contain TODOs or placeholder actors.
3. Some report components are present but not proven to be backed by complete data-trust evidence.

### Test Coverage Risks

1. The full Jest suite passes and covers the new kernels well.
2. Coverage is uneven: service tests concentrate in accounting, inventory, compliance, payments/reconciliation, POS, payroll, and purchasing; older CRUD/action modules have little or no test coverage.
3. Boundary gates currently focus on inventory stock mutation, not all Prisma mutation or tenant/RBAC patterns.

## 7. Root-Cause Analysis

The recurring structural problem is historical layering.

Older modules were built as direct server actions, Prisma helpers, and dashboard workflows. Later enterprise slices added typed errors, RBAC, business events, ledger posting, inventory valuation, AP controls, close assurance, and offline sync. The new slices are much stronger than the old paths, but both generations still coexist.

Repeated causes:

- Service ownership was added after many actions already owned business rules.
- Tenant isolation is mostly implemented by query filters, not by an enforced Prisma/service boundary.
- Tests were added around new kernels, not around every old action path.
- Demo and placeholder files were not retired when real services arrived.
- Domain names are split across old and new folders, such as `purchase-order` and `purchasing`, or `item` and `itemsShow`.
- CI gates verify important pieces but do not yet ratchet all enterprise policies.

The fix is not a rewrite. The fix is a sequence of boundary ratchets and vertical migrations: choose a domain, make the service the only mutating owner, thin the actions/routes, preserve behavior, add regression tests, then turn the rule into a failing gate.

## 8. Risk Matrix

| Severity | Finding | Affected areas | Business impact | Technical impact | Recommended fix |
| --- | --- | --- | --- | --- | --- |
| Critical | Legacy direct mutation and hard-delete paths exist for economic records | `actions/item`, `actions/itemsShow`, `services/purchase-order` | Evidence can be removed or bypass formal reversal/cancellation discipline | Weak audit trail and inconsistent invariants | Add hard-delete policy, convert economic deletes to cancellation/soft-delete/reversal, add tests and a static gate. |
| High | Direct Prisma access remains in App Router routes/pages | `app/api/v1/*`, invite page, item edit page | Tenant/RBAC and safe error behavior can drift | Service boundary bypass | Move data access into protected services, keep routes thin, add no-Prisma-in-app gate. |
| High | Legacy action-owned business logic remains | inventory movement actions, item actions, user/role/entity CRUD | Inconsistent controls and duplicate behavior | Harder testing and higher regression risk | Migrate actions to service orchestration only; actions validate input, call service, revalidate. |
| High | Mock/demo inventory paths still exported | `actions/inventory/inventoryActions.ts`, duplicate item route | Operators may see or call non-production data paths | False confidence and hidden behavior gaps | Remove, quarantine under explicit demo namespace, or replace with service-backed implementation. |
| High | Split purchasing domain ownership | `services/purchasing`, `services/purchase-order`, purchase-order UI | AP controls can be bypassed through old PO workflows | Duplicate logic and raw errors | Consolidate PO receiving/invoicing/payment under purchasing/AP service contracts. |
| Medium | Error handling adoption is uneven | legacy services/actions/routes | Users may see inconsistent or unsafe errors | Debug and support burden | Replace raw errors with typed domain errors and safe action results. |
| Medium | CI/build gates are incomplete | `package.json` scripts | Release can pass while lint warnings remain | Deprecated Next lint path | Replace `next lint`, run linted build/CI, add policy scanners. |
| Medium | Reporting has TODO/mock traces | report components, monitoring | Report trust can be overstated | Stale placeholders | Add data-trust report audit and remove placeholder metrics. |
| Medium | Country-pack and compliance production readiness incomplete | compliance adapters, Cameroon pack | Legal certification claim would be unsafe | Adapter and validation gaps | Keep expert-review blockers, implement real adapters and legal review workflow. |
| Medium | Offline POS replay not complete | POS offline sync | Offline sales cannot become final legal/accounting truth yet | Pending replay backlog and close blockers | Build safe replay adapter through POS, inventory, payment, fiscal, and ledger services. |

## 9. Clean Solution Plan

### Priority 0 - Preserve The Current Green Baseline

Goal: do not lose the current working state.

Actions:

- Keep `npm run prisma:validate`, `npm run typecheck`, `npm test -- --runInBand`, and `npm run inventory:boundary:fail` green.
- Save this report as the baseline for stabilization.
- Avoid broad rewrites.

### Priority 1 - Add Enterprise Boundary Ratchets

Goal: stop new bypasses before migrating all old ones.

Actions:

- Add a no-direct-Prisma scanner for `app`, `components`, `hooks`, and client-facing route/action boundaries.
- Start in report mode, then fail mode after the existing findings are migrated.
- Add a hard-delete scanner that classifies deletes as allowed configuration cleanup, draft-only cleanup, soft delete, cancellation, reversal, or forbidden.
- Add an action-thinning scanner for direct `db.*` mutation in `actions`.

Success criteria:

- Every direct data access exception is documented.
- No new direct economic mutation can enter the codebase.

### Priority 2 - Migrate Legacy Inventory And Item Actions

Goal: finish the inventory/action cleanup around the already-green inventory boundary.

Actions:

- Replace mock inventory actions with service-backed reads or delete them if unused.
- Move `actions/inventory/inventoryMovementActions.ts` transfer and reservation logic into `services/inventory`.
- Thin `actions/item/items.ts` and `actions/itemsShow/*` to DTO validation, RBAC, service call, and revalidation only.
- Ensure direct item stock mutation remains impossible except through the inventory service kernel.

Success criteria:

- No stock, transfer, reservation, or item economic update is action-owned.
- Regression tests cover unauthorized actor, wrong tenant, closed period where applicable, maker-checker where applicable, and event/ledger evidence.

### Priority 3 - Consolidate Purchasing And AP

Goal: remove split-brain purchasing behavior.

Actions:

- Map all `services/purchase-order` workflows to the newer `services/purchasing` AP kernel contracts.
- Replace raw errors with typed domain errors.
- Convert hard deletes to draft cancellation or soft delete.
- Move receiving stock effects through the inventory service kernel.
- Remove placeholder `system-user` approval actors from UI/action flow.

Success criteria:

- Purchase order, receipt, supplier invoice, supplier payment, stock, ledger, and reconciliation evidence flow through one controlled service path.

### Priority 4 - Normalize Typed Errors And Safe Responses

Goal: one user-safe error model.

Actions:

- Inventory, AP, POS, close assurance, and payment patterns should become the standard.
- Replace raw `throw new Error` in economic services with typed errors carrying code, severity, user message, and safe metadata.
- Ensure route handlers never rethrow raw internal errors to clients.
- Add tests for representative safe error envelopes.

Success criteria:

- New code cannot leak raw Prisma or internal exception details.

### Priority 5 - Retire Demo And Placeholder Surfaces

Goal: prevent false operational signals.

Actions:

- Remove or clearly quarantine duplicate/demo routes.
- Replace mock monitoring calculations with real metrics or explicit "not configured" results.
- Fix report TODOs and require report provenance metadata.

Success criteria:

- No production route/action exports mock stock, finance, payment, payroll, or compliance data.

### Priority 6 - Production Compliance And External Integrations

Goal: graduate from system evidence to external certification readiness.

Actions:

- Implement real provider statement channels and credential flows.
- Add real authority adapters per country.
- Keep `REQUIRES_EXPERT_REVIEW` as a blocker until legal/accounting expert validation is complete.
- Add operational monitoring for outbox, close blockers, failed postings, provider outages, and sync conflicts.

Success criteria:

- The system can truthfully distinguish "system-ready", "provider-integrated", and "statutorily certified".

## 10. Professional Modernization Strategy

### Service Layer Normalization

Every domain should expose service methods that own:

- tenant scope;
- actor identity;
- RBAC checks or protected context requirements;
- DTO/Zod parsing;
- transactions;
- idempotency;
- maker-checker and fresh-auth checks;
- business-event evidence;
- ledger posting or explicit blocker creation;
- notification/outbox evidence;
- typed domain errors.

Actions, route handlers, and UI handlers should not mutate business truth directly.

### Action Thinning

Server actions should only:

- parse request payloads;
- derive tenant and actor from trusted auth context;
- call one service method;
- map service result into `ServerActionResult`;
- revalidate tags/paths.

### DTO And Zod Contracts

Each service boundary should have explicit schemas for:

- create/update command input;
- approval/rejection command input;
- read filters;
- export filters;
- idempotency keys;
- actor and tenant context.

### RBAC Hardening

Use a central permission catalogue and require:

- create/read/update/delete permissions by resource;
- separate approve/reject/post/export/certify permissions;
- fresh-auth for sensitive approval/export/certification;
- same-actor approval blockers for maker-checker workflows.

### Business Event And Audit Standardization

Economic workflows should always produce:

- business event id;
- source module;
- source entity id;
- payload hash;
- actor id;
- organization id;
- idempotency key;
- outbox messages when needed;
- ledger posting batch id or explicit blocker.

### Test Strategy

Each migrated workflow needs focused tests for:

- happy path;
- wrong tenant;
- unauthorized actor;
- closed/locked accounting period;
- idempotency replay;
- duplicate idempotency with different payload;
- maker-checker self approval;
- ledger posting path;
- ledger blocker path;
- action safe error mapping.

### CI Gate Recommendations

Add or modernize:

- `lint` using supported ESLint CLI instead of deprecated `next lint`.
- `build:linted` in CI, not only `build --no-lint`.
- no-direct-Prisma-in-app gate.
- no-economic-hard-delete gate.
- action-thinning gate.
- no-mock-production-data gate.
- typed-error coverage gate for services/actions.
- test shard commands for domain suites.

## 11. Next Implementation Slices

### Slice 1 - Direct Data Access Boundary Report And Gate

Scope:

- Create a scanner similar to `scripts/inventory-boundary-gate.js`.
- Report direct Prisma imports/usage under `app`, `components`, `hooks`, and `actions`.
- Classify current findings as service-boundary migration tickets.

Files to inspect:

- `app/api/v1/organisations/route.ts`
- `app/api/v1/organisations/[id]/items/route.ts`
- `app/api/v1/organisations/[id]/briefItems/route.ts`
- `app/[locale]/(auth)/user-invite/[organisationId]/page.tsx`
- `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/edit/Page.tsx`
- `actions/**/*`

Success criteria:

- Report mode produces a stable file under `what-next`.
- The scanner can run in fail mode once allowlist reaches zero.

Verification:

```powershell
node scripts/service-boundary-gate.js --mode report
npm run typecheck
npm test -- --runInBand
```

### Slice 2 - Inventory And Item Action Final Cleanup

Scope:

- Replace mock inventory action paths.
- Thin inventory movement actions.
- Thin item CRUD/stock actions.
- Keep current inventory boundary gate green.

Files to inspect:

- `actions/inventory/inventoryActions.ts`
- `actions/inventory/inventoryMovementActions.ts`
- `actions/item/items.ts`
- `actions/itemsShow/*`
- `services/inventory/*`
- `services/item/*`

Success criteria:

- No direct stock/transfer/reservation mutation remains in actions.
- Mock inventory exports are gone or quarantined.
- Existing UI callers still work.

Verification:

```powershell
npm run inventory:boundary:fail
npm test -- services/inventory actions/itemsShow --runInBand
npm run typecheck
```

### Slice 3 - Purchasing/AP Consolidation

Scope:

- Align `services/purchase-order` with the newer AP kernel.
- Remove raw hard deletes for evidence-bearing purchase records.
- Ensure goods receipt stock effects use inventory services.

Files to inspect:

- `services/purchase-order/purchase-order.service.ts`
- `services/purchasing/*`
- `actions/purchase-order*`
- `actions/purchasing/*`
- `components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx`

Success criteria:

- PO submit/approve/receive/invoice/pay flows have one canonical service owner.
- AP ledger/reconciliation/country-pack blockers remain truthful.
- No placeholder approval actor remains.

Verification:

```powershell
npm test -- services/purchasing services/purchase-order actions/purchasing --runInBand
npm run inventory:boundary:fail
npm run typecheck
```

### Slice 4 - Hard Delete And Immutability Policy

Scope:

- Classify all deletes.
- Convert economic deletes to cancellation, reversal, soft delete, or draft-only cleanup with audit.
- Add tests for forbidden delete of posted/final records.

Files to inspect:

- `actions/itemsShow/deleteItem.ts`
- `actions/item/items.ts`
- `services/purchase-order/purchase-order.service.ts`
- `services/unit/unit.service.ts`
- `services/tax-rate/tax-rate.service.ts`
- `actions/users/deleteUser.ts`
- `actions/locations/deleteLocation.ts`
- Prisma models with `deletedAt`.

Success criteria:

- Every delete is intentionally categorized.
- Forbidden economic hard deletes fail tests.

Verification:

```powershell
node scripts/hard-delete-gate.js --mode report
npm test -- --runInBand
npm run typecheck
```

### Slice 5 - Error Handling Normalization

Scope:

- Replace raw errors in top economic services first.
- Standardize route handler error envelopes.

Files to inspect:

- `services/purchase-order/purchase-order.service.ts`
- `services/pos/pos.service.ts`
- `services/accounting/posting.service.ts`
- `services/accounting/journals.service.ts`
- `actions/inventory/inventoryMovementActions.ts`
- `app/api/v1/*`

Success criteria:

- User-facing errors are typed, safe, and test-covered.
- Internal details are logged with correlation/request id only.

Verification:

```powershell
npm test -- services/_shared lib/error-handling actions --runInBand
npm run typecheck
```

### Slice 6 - Demo/Mock Cleanup And Report Trust

Scope:

- Remove production-visible mock inventory/report/monitoring paths.
- Fix missing report imports.
- Add provenance to report actions/components.

Files to inspect:

- `actions/inventory/inventoryActions.ts`
- `app/[locale]/(dashboard)/dashboard/items/new/page.tsx`
- `components/reports/cash-flow-report.tsx`
- `lib/error-handling/monitoring.ts`
- report pages/actions under `app` and `actions`.

Success criteria:

- No production route/action returns mock business data.
- Report components show real source, period, freshness, and certification status.

Verification:

```powershell
rg -n "Mock implementation|mockItems|mockTransactions|mockAdjustments|mockTransfers|demo route|TODO: Update the import path" actions app components lib services
npm run typecheck
npm test -- --runInBand
```

### Slice 7 - Offline POS Replay

Scope:

- Convert `PENDING_REPLAY` offline sale envelopes into final POS effects only through existing POS, inventory, payment, fiscal, and ledger services.

Files to inspect:

- `services/pos/offline-sync.service.ts`
- `services/pos/pos.service.ts`
- `services/inventory/*`
- `services/compliance/*`
- `services/payments/*`
- `services/accounting/*`

Success criteria:

- Replay is idempotent.
- Replay cannot bypass legal numbering, stock, ledger, payment, drawer, or fiscal controls.
- Conflicts remain quarantined.

Verification:

```powershell
npm test -- services/pos services/inventory services/compliance services/accounting --runInBand
npm run inventory:boundary:fail
npm run typecheck
```

### Slice 8 - CI Modernization

Scope:

- Replace deprecated lint command.
- Add a linted build or CI verify command.
- Add policy scanners after report-mode findings are migrated.

Files to inspect:

- `package.json`
- CI config, if present.
- `scripts/*gate*.js`

Success criteria:

- One command verifies Prisma, typecheck, lint, unit tests, build, and policy gates.
- Warnings that matter cannot be hidden by `build --no-lint`.

Verification:

```powershell
npm run verify:repo
npm run lint
npm test -- --runInBand
npm run build:linted
```

## 12. Final Recommendation

The next move should be stabilization and cleanup, not broad new feature expansion.

Recommended order:

1. Preserve green baseline and document current controls.
2. Add service-boundary and hard-delete report gates.
3. Finish inventory/item action migration.
4. Consolidate purchasing/AP.
5. Normalize typed errors and safe route responses.
6. Remove demo/mock production paths.
7. Complete offline POS replay and production compliance/provider integrations.
8. Modernize CI and release gates.

The platform has strong enterprise foundations now. The professional path forward is to make those foundations non-optional across the older code. Once the old bypasses are retired and CI ratchets enforce the rules, AqStoqFlow can move from "advanced controlled build" toward a credible enterprise SaaS release candidate.
