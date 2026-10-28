# AqStoqFlow Enterprise SMB OS Architecture Inspection

Date: 2026-06-23  
Repository: `E:\ohada saas\newStockFlow\aqstoqflow`  
Prompt source: `C:\Users\J COMPUTER\.codex\attachments\8c3af0ec-761d-47d1-a746-7fb7b6d066b4\pasted-text.txt`  
Mode: Safe, local, evidence-based architecture inspection. No application code was modified.

## Executive Summary

Verdict: **credible enterprise SMB operating-system foundation, ready for hardening into enforced trust operations.**

AqStoqFlow is no longer a loose module collection. The current codebase has the main components of a single-source-of-truth business platform: tenant-scoped RBAC, service-owned database boundaries, inventory kernels, ledger posting, payment reconciliation, close assurance, statutory evidence, business-event outbox, snapshots, manager action center, owner war room, and workflow assurance gates.

The most important finding is that the core hygiene gates are now green:

- `npm run service:boundary`: 0 active service-boundary violations.
- `npm run inventory:boundary`: 0 active stock mutation violations.
- `npm run policy:gates`: passed in fail mode.
- `npm run prisma:validate`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 5 warnings, 0 errors.
- Focused architecture tests: 25 suites passed, 172 tests passed.

This changes the architectural posture. The main work is no longer "stop direct Prisma and unsafe mutations everywhere." The main work is now to turn the system into a fully enforced, production-operating control plane: hard module entitlements, signed public access, explicit API permissions, canonical purchase order receive semantics, complete close-certification invalidation, external authority/payment/payroll adapters, freshness/observability, and product-grade daily action loops.

## Evidence Baseline

### System Shape

- The existing graph report identifies the system's core architecture themes: `Tenant Defence In Depth`, `Ledger-First Operational Posting`, `Ledger-First OHADA Operating Spine`, `Server Action Security Stack`, `Enterprise RBAC Control Plane`, `Ledger-Backed Compliance Control Plane`, `Enterprise POS Delivery Flow`, and `Fraud-Resistant RBAC Authorization System` in `graphify-out/GRAPH_REPORT.md:176-196`.
- The Prisma schema includes the broad SMB operating-system model: identity and organization at `prisma/schema.prisma:101`, `prisma/schema.prisma:203`, `prisma/schema.prisma:229`; inventory at `prisma/schema.prisma:585` and `prisma/schema.prisma:729`; purchasing/AP at `prisma/schema.prisma:963`, `prisma/schema.prisma:1057`, `prisma/schema.prisma:1250`; POS/offline at `prisma/schema.prisma:2538`, `prisma/schema.prisma:2598`, `prisma/schema.prisma:2744`; payments/reconciliation at `prisma/schema.prisma:2964`, `prisma/schema.prisma:3410`, `prisma/schema.prisma:3466`, `prisma/schema.prisma:3608`, `prisma/schema.prisma:3664`, `prisma/schema.prisma:3720`; close/accounting at `prisma/schema.prisma:4189`, `prisma/schema.prisma:4309`, `prisma/schema.prisma:4392`, `prisma/schema.prisma:4696`, `prisma/schema.prisma:4794`, `prisma/schema.prisma:4840`; events/compliance/audit at `prisma/schema.prisma:5027`, `prisma/schema.prisma:5075`, `prisma/schema.prisma:5157`, `prisma/schema.prisma:5318`, `prisma/schema.prisma:5409`, `prisma/schema.prisma:5877`.
- Release scripts are centralized in `package.json:12-29`, including lint, typecheck, Prisma validation, service-boundary, inventory-boundary, hard-delete, demo-trust, raw-error, policy gates, `verify:repo`, and `verify:release`.

### Verification Run

The sandbox helper failed before local `npm`/`node` commands could start, so verification commands were rerun through the approved local escalation path. They remained non-destructive local checks.

| Command | Result |
| --- | --- |
| `npm run service:boundary` | Passed. 0 active service-boundary violations. |
| `npm run inventory:boundary` | Passed. 0 active inventory boundary violations. |
| `npm run hard-delete` | Passed. 0 active unsafe hard-delete findings. |
| `npm run demo:trust` | Passed. 0 active production-visible demo/report trust findings. |
| `npm run error:boundary` | Passed. 0 active unsafe raw-error findings. |
| `node scripts\workflow-assurance-release-gate.js --mode report` | Passed. 33/33 checks ready, 6/6 indexes ready, 0 blockers. |
| `npm run prisma:validate` | Passed. Prisma schema valid, `prisma.config.ts` detected. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed with 5 warnings, 0 errors. |
| `npm run policy:gates` | Passed. Service-boundary ratchet baseline 76, current 0, delta -76. |
| Focused Jest architecture suite | Passed. 25 suites, 172 tests. |

Lint warnings remaining:

- `components/auth/EmailVerificationForm.tsx:71`: missing hook dependencies.
- `components/dashboard/items/ModernItemFormForEditing.tsx:514`: `<img>` warning.
- `components/frontend/custom-carousel.tsx:62`: `<img>` warning.
- `components/ui/groups/inventory/ItemManagement.tsx:173`: `<img>` warning.
- `config/permissions.ts:501`: anonymous default export warning.

## Architecture Map

### 1. Experience And Entry Layer

The app has a small API surface:

- `app/api/auth/[...all]/route.ts`
- `app/api/me/permissions/route.ts`
- `app/api/receipts/[receiptId]/route.ts`
- `app/api/uploads/[...path]/route.ts`
- `app/api/uploadthing/*`
- `app/api/v1/organisations/[id]/items/route.ts`
- `app/api/v1/organisations/[id]/briefItems/route.ts`
- `app/api/v1/organisations/route.ts`
- `app/api/security-txt/route.ts`

This is a positive architectural sign. A small API perimeter is easier to harden, document, test, and monitor.

### 2. Authorization And Tenant Boundary

Core protection is service-side, not UI-only:

- `services/_shared/protect.ts:43-53` supports fresh-auth options, permission checks, and tenant guard behavior.
- `services/_shared/protect.ts:134` calls organization access enforcement.
- `lib/security/rbac.ts:250` exports `requirePermission`.
- `lib/security/rbac.ts:365` exports `assertCanUseOrganization`.

The remaining concern is not RBAC itself. It is module entitlement enforcement:

- `services/modules/module-control-contracts.ts:1` sets `MODULE_CONTROL_MODE = "observe"`.
- `services/modules/module-entitlement.service.ts:86-87` allows access in observe mode and records `would_block`.
- `services/modules/module-entitlement.service.ts:111` and `services/modules/module-entitlement.service.ts:175` still report `hardEnforcementEnabled: false`.

Interpretation: user/RBAC permissions can block access, but commercial/module entitlement is still an observability layer rather than a hard gate.

### 3. Service-Owned Data Boundary

The strongest current signal is the boundary gate:

- `npm run service:boundary`: 0 active direct Prisma or action-owned mutation violations.
- `npm run service:boundary:ratchet` inside `npm run policy:gates`: baseline 76, current 0, ratchet passed.

The item API has moved to DTO services:

- `app/api/v1/organisations/[id]/items/route.ts:2` imports `listItemApiDTOs`.
- `app/api/v1/organisations/[id]/briefItems/route.ts:2` imports `listBriefItemApiDTOs`.
- `services/item/item.service.ts:585` exports `listItemApiDTOs`.
- `services/item/item.service.ts:613` exports `listBriefItemApiDTOs`.

This is the correct pattern for App Router/API read paths.

### 4. Business Events, Ledger, And Source Links

The system has a durable event and ledger spine:

- `services/events/business-event.service.ts:97` records business events in transactions.
- `services/events/business-event.service.ts:106-117` checks organization/event/idempotency and detects payload conflicts.
- `services/events/business-event.service.ts:151-152` stores outbox message idempotency and payload hashes.
- `services/accounting/posting.service.ts:164` creates ledger posting batches.
- `services/accounting/posting.service.ts:168-169` supports posting idempotency.
- `services/accounting/posting.service.ts:221` links posting batches to accounting source links.
- `services/accounting/posting.service.ts:248-249` asserts open periods and balanced journal entries.
- `services/accounting/source-link.service.ts:114` creates accounting source links.

This is the system's central truth spine. It is the right backbone for OHADA/SYSCOHADA, auditability, reconciliation, close assurance, and BI trust.

### 5. Inventory Truth

Inventory has moved toward service-owned stock effects:

- `npm run inventory:boundary`: 0 active direct stock mutation violations.
- `services/inventory/inventory-stock-event.service.ts:190` requires an open accounting period before posting stock events.
- `services/inventory/inventory-stock-event.service.ts:204` posts ledger impact.
- `services/inventory/inventory-stock-event.service.ts:595` records business-event evidence.
- `services/inventory/inventory-adjustment.service.ts:316` requires an open accounting period before inventory adjustments.
- `services/inventory/inventory-adjustment.service.ts:663` creates ledger posting batches.
- `services/inventory/inventory-adjustment.service.ts:877` owns `createStockAdjustment`.
- `services/inventory/inventory-adjustment.service.ts:973` owns `requestManualItemStockAdjustment`.
- `services/inventory/inventory-reconciliation.service.ts:78` owns inventory class 3 reconciliation.
- `services/inventory/inventory-read.service.ts:512` owns stock movement summary reads.

The old post-Priority-004 target has materially improved. Movement reads and stock mutations are now service-owned.

### 6. POS And Offline POS

POS has an enterprise-grade economic transaction pattern:

- `services/pos/pos.service.ts:1195` owns `commitPOSSale`.
- `services/pos/pos.service.ts:1349` posts POS stock issue.
- `services/pos/pos.service.ts:1547` creates fiscal documents.
- `services/pos/pos.service.ts:1602-1606` records finalized sale business events.
- `services/pos/pos.service.ts:2038` owns refunds.
- `services/pos/pos.service.ts:2176-2180` records refund events.
- `services/pos/pos.service.ts:2223` owns voids.
- `services/pos/pos.service.ts:2339-2343` records void events.
- `actions/pos/tender.actions.ts:17-21` protects sale commit with `pos.use`.
- `actions/pos/tender.actions.ts:28-36` protects refund with `pos.transactions.refund`.
- `actions/pos/tender.actions.ts:43-51` protects void with `pos.transactions.void`.

Offline POS is also meaningful, not superficial:

- `services/pos/offline-sync.service.ts:489` enrolls offline devices.
- `services/pos/offline-sync.service.ts:693-695` records accepted offline events.
- `services/pos/offline-sync.service.ts:1069` replays pending offline sale envelopes.
- `services/pos/offline-sync.service.ts:1141` funnels replay through `commitPOSSale`.
- `services/pos/offline-sync.service.ts:1606-1608` exposes offline sync blockers for close/certification.

### 7. Purchasing And AP

Purchasing/AP is partially consolidated and materially stronger than a CRUD module:

- `services/purchase-order/purchase-order.service.ts:457` owns purchase-order listing.
- `services/purchase-order/purchase-order.service.ts:479` owns creation.
- `services/purchase-order/purchase-order.service.ts:716` owns submit.
- `services/purchase-order/purchase-order.service.ts:724-739` owns approval and maker-checker rejection.
- `services/purchase-order/purchase-order.service.ts:775` owns cancel.
- `services/purchase-order/purchase-order.service.ts:794` owns close.
- `services/purchase-order/purchase-order.service.ts:801` owns receive behavior.
- `services/purchase-order/purchase-order.service.ts:622-690` archives purchase orders with business-event evidence rather than unsafe hard delete.
- `services/purchasing/ap-control.service.ts:414` can create blocked AP posting batches when rules are missing.
- `services/purchasing/ap-control.service.ts:736` creates AP ledger posting batches.
- `services/purchasing/ap-control.service.ts:1129-1160` validates received goods evidence, PO match, item match, uninvoiced quantity, and unit-cost match.
- `services/purchasing/ap-control.service.ts:1708-1715` records supplier invoice business events.
- `services/purchasing/ap-control.service.ts:1909-2021` owns supplier bank approval and maker-checker evidence.
- `services/purchasing/ap-control.service.ts:2054-2325` owns supplier payment release, idempotency, approved bank destination, invoice allocations, and event evidence.

Remaining architectural point: make `purchases.orders.receive` the single canonical permission and product contract for purchase-order receiving. Keep legacy method names as internal implementation only, or retire them. Do not allow a parallel receive permission or workflow.

### 8. Payments And Reconciliation

Payment reconciliation is a strong truth-system component:

- `services/payments/provider-event.service.ts:101` captures provider events.
- `services/payments/provider-event.service.ts:149` computes provider inbox idempotency.
- `services/payments/statement-import.service.ts:77` imports provider statements.
- `services/payments/statement-import.service.ts:94` hashes statement content.
- `services/reconciliation/payment-reconciliation-run.service.ts:117` creates exceptions and suspense.
- `services/reconciliation/payment-reconciliation-run.service.ts:219` runs reconciliation.
- `services/reconciliation/payment-reconciliation-run.service.ts:511` proposes manual matches.
- `services/reconciliation/payment-reconciliation-run.service.ts:557` approves manual matches.
- `services/reconciliation/payment-reconciliation-certification.service.ts:388` signs reconciliation runs.
- `services/reconciliation/payment-reconciliation-certification.service.ts:612` exports reconciliation certificates.

This is essential for the "truth system" because cash truth is where sales, POS, provider statements, refunds, settlement delays, fees, and ledger reality meet.

### 9. Close Assurance

Close assurance is the system's strongest trust-product candidate:

- `services/accounting/periods.service.ts:187` builds period close preflight.
- `services/accounting/periods.service.ts:303-334` converts failures into close blockers, including draft journals, unresolved posting batches, missing source links, open payment exceptions, open suspense, unsigned reconciliation runs, and unbalanced trial balance.
- `services/accounting/periods.service.ts:337-348` blocks period close when preflight failures exist.
- `services/accounting/close-assurance.service.ts:1237` runs close assurance.
- `services/accounting/close-assurance.service.ts:1576-1631` builds evidence graph data.
- `services/accounting/close-assurance.service.ts:1672` assigns findings.
- `services/accounting/close-assurance.service.ts:1838-1839` blocks waiver approval by the same requester.
- `services/accounting/close-assurance-pack.service.ts:599-616` records certification invalidation events.
- `services/accounting/close-assurance-pack.service.ts:643` owns `recordCloseCertificationInvalidation`.
- `services/accounting/close-assurance-pack.service.ts:711` exports close packs.
- `services/accounting/close-assurance-pack.service.ts:827-830` records certified export evidence.

The next maturation step is universal invalidation: any workflow that changes the economic truth after certification must invalidate the close pack or block mutation.

### 10. Payroll And Compliance

Payroll has a strong internal control structure:

- `services/payroll/payroll-control.service.ts:1151` freezes attendance snapshots.
- `services/payroll/payroll-control.service.ts:1232-1237` records attendance freeze events.
- `services/payroll/payroll-control.service.ts:1294-1314` guards payroll run idempotency.
- `services/payroll/payroll-control.service.ts:1331` resolves country-pack status.
- `services/payroll/payroll-control.service.ts:1459-1501` hashes attendance and country-pack evidence into payroll run metadata.
- `services/payroll/payroll-control.service.ts:1763-1782` records payroll posting events with country-pack evidence.
- `services/payroll/payroll-control.service.ts:2045` validates released payment totals against net payable.
- `services/payroll/payroll-control.service.ts:2144-2149` records payroll payment release events.
- `services/payroll/payroll-control.service.ts:2430-2458` prepares payroll declarations and records evidence.

Compliance has statutory evidence foundations:

- `services/compliance/fiscal-document.service.ts:230-233` blocks production tax-authority certification until an official adapter is reviewed and registered.
- `services/compliance/fiscal-document.service.ts:318` links fiscal documents to accounting source links.
- `services/compliance/fiscal-document.service.ts:419-423` records fiscal document business events.
- `services/compliance/certification-outbox.service.ts:147-153` records certification queue business events.

Interpretation: internal evidence is strong; external production readiness is intentionally gated.

### 11. BI, Snapshots, Manager Action Center, Owner War Room

The system is becoming a daily operating platform:

- `services/snapshots/payment-truth-snapshot.service.ts:234` grades payment evidence.
- `services/snapshots/inventory-cash-snapshot.service.ts:167` grades inventory/cash evidence.
- `services/snapshots/close-readiness-snapshot.service.ts:183` grades close-readiness evidence.
- `services/manager-action-center/manager-action-center.service.ts:48-83` composes tenant, payment, inventory, and close snapshots into manager actions.
- `services/owner-war-room/owner-war-room.service.ts:50-88` composes owner-facing evidence cards and operating signals.
- `services/assurance/assurance-registry.service.ts:143-173` registers business-event, payment reconciliation, purchasing/AP, inventory, payroll, and close evidence checks.

This is the architectural bridge from "ERP data entry" to "daily go-to SMB operating system."

## What Works

1. **Service boundary is clean.** Runtime app/actions/components/hooks no longer show active direct Prisma/action-owned mutation violations.
2. **Inventory mutation ownership is clean.** Direct stock mutation outside the inventory kernel is at zero active findings.
3. **The ledger/event/source-link spine is real.** Business events, outbox messages, idempotency keys, payload hashes, ledger posting batches, balanced journal assertions, open-period checks, and source links are all present.
4. **Payment reconciliation and close assurance are deep enough to be product moats.** They already model exceptions, suspense, signoff, certificate hashes, close blockers, findings, waivers, and evidence graph concepts.
5. **POS economic flow is transactionally mature.** Commit, payment posting, stock issue, fiscal document creation, receipt, refund, void, and business events are service-owned.
6. **Offline POS is not just sync storage.** It includes sequence/hash/idempotency concepts, conflicts, certification blockers, and replay through the normal POS finalization path.
7. **AP controls are serious.** Supplier invoices require received-goods evidence, three-way checks, AP posting, approved bank destination, allocation controls, and release evidence.
8. **Payroll has evidence-grade controls.** Attendance freeze, country-pack hashes, payment batch evidence, and declarations are modeled.
9. **Workflow assurance is ready for enforcement planning.** Static readiness is 33/33 with 0 blockers.
10. **Release hygiene is much better than the older baseline.** Policy gates pass, Prisma validates, typecheck passes, lint has warnings only, and focused architecture tests passed.

## What Does Not Work Yet

1. **Module entitlement is observe-mode.** It records `would_block` but still allows access. This is fine for rollout, not for paid module enforcement or production tenancy packaging.
2. **Public receipt lookup is ID-based.** `app/api/receipts/[receiptId]/route.ts:13` calls `getPublicSalesReceipt({ salesOrderId: receiptId })`, and `services/pos/receipt.service.ts:522-529` exposes a redacted public receipt. Redaction is good, but public access should be signed, expiring, and optionally revocable.
3. **Item API authorization is membership-scoped, not explicitly permission-scoped.** The item API routes call `requireApiSessionForOrg`, but no explicit item read permission is visible in the route. For enterprise RBAC, membership should not automatically mean item catalog API access.
4. **PO receive still needs canonical contract harmonization.** The service owns receive behavior, but the product should standardize on one permission and capability name: `purchases.orders.receive`. No parallel receive permission should remain.
5. **Close certification invalidation is not visibly universal.** The invalidation service exists, but the architecture should require hooks from inventory, ledger, payments, payroll, purchasing, permissions, and country-pack changes.
6. **External readiness is intentionally incomplete.** Fiscal adapter production submission, payment provider ingestion at scale, payroll authority filing, credential lifecycle, outage monitoring, and country-pack expert review workflows are not yet mature enough to treat as complete enterprise readiness.
7. **Full release command was not run in this pass.** `npm run verify:repo` was not executed because this was an inspection pass and the targeted gate/test suite already covered the architectural focus. A final release pass should still run build and full tests.
8. **Lint warnings remain.** They are not architecture blockers, but they should be cleaned so lint is a fully boring release signal.
9. **Freshness and performance budgets need productization.** Snapshots and assurance exist, but the next enterprise step is explicit freshness SLA, stale-data UX, materialized read models, index review, and background job monitoring.

## What Could Work Better

### Single Source Of Truth

The system already has the right primitives:

- Business event = what happened.
- Ledger posting batch = financial effect.
- Accounting source link = trace from ledger to workflow.
- Inventory event/projection = stock effect.
- Payment reconciliation = cash truth.
- Close assurance = trust/certification truth.
- Snapshot/action center = daily operating truth.

The opportunity is to make this a declared contract across every module:

```
User action
  -> protect/RBAC/fresh auth/module entitlement
  -> service-owned command
  -> domain validation
  -> transaction
  -> business event
  -> ledger/source link when economic
  -> evidence/audit
  -> snapshot invalidation
  -> close certification invalidation when close-impacting
  -> manager/owner action if unresolved
```

This should be written as the AqStoqFlow operating truth contract and enforced with tests and static gates.

### Product Architecture

The system should make the manager action center and owner war room the daily entry points, not just dashboards:

- Manager sees today's cash, stock, purchasing, payroll, payment exceptions, close blockers, and urgent actions.
- Owner sees trust-grade business truth, margin leaks, blocked money, stock-to-cash velocity, and audit/certification status.
- Accountant sees close assurance, source links, reconciliations, tax/fiscal documents, and certification blockers.
- Cashier sees POS only within session/device/tender permissions.
- Inventory manager sees count variance, adjustments, transfers, and valuation trust.

This is more profitable than building module dashboards in isolation because it increases daily usage, reduces support confusion, and turns controls into business value.

## Module Readiness Matrix

Scale: 1 = weak or mostly absent, 3 = usable but needs hardening, 5 = enterprise-ready and enforced.

| Module | Readiness | What works | Main gap | Next move |
| --- | ---: | --- | --- | --- |
| Service boundary/platform hygiene | 4.7 | 0 active service-boundary violations, policy ratchet passes | Keep ratchets hard and prevent regressions | Keep `service:boundary:ratchet` in `policy:gates` and preserve zero |
| RBAC/tenant protection | 4.1 | `protect`, `requirePermission`, tenant guard, fresh-auth support | API read surfaces need explicit permission checks everywhere | Add route-level permission requirements to item APIs and public/signed surfaces |
| Module entitlement/commercial gating | 3.2 | Observe-mode decisions and logs exist | Not enforced; `hardEnforcementEnabled` false | Pilot enforce mode module by module |
| Inventory | 4.4 | 0 active stock-boundary violations, event/ledger evidence | Release workflow and certification invalidation mesh need finalization | Implement real `releaseInventory` workflow and invalidation hooks |
| POS/offline POS | 4.1 | Atomic sale, refund, void, fiscal receipt, offline replay tests | Conflict resolution and device/key lifecycle need operational UX | Harden manager conflict workflow, key rotation, replay observability |
| Purchasing/AP | 3.9 | PO service, AP posting, three-way match, supplier bank/payment controls | Receive permission/product contract not fully canonical | Standardize on `purchases.orders.receive` only |
| Payments/reconciliation | 4.2 | Provider events, statement hashes, exceptions, suspense, signoff | Provider adapter operations and monitoring need production hardening | Build provider ingestion operations and staleness alerts |
| Accounting/close assurance | 4.3 | Preflight blockers, evidence graph, close pack, invalidation service | Invalidation hooks not universal | Wire every close-impacting workflow into invalidation |
| Payroll | 3.8 | Attendance freeze, country-pack evidence, posting, payment release, declarations | External filing adapters and privacy-grade operations need hardening | Build filing adapter contracts and redacted evidence views |
| Compliance/statutory | 3.6 | Fiscal documents, evidence, outbox, production adapter block | Real authority adapters and expert review lifecycle incomplete | Complete adapter factory, credential handling, outage monitoring |
| BI/snapshots/action center | 3.9 | Payment, inventory, close snapshots; manager and owner views | Freshness, materialized read models, and action ownership need product depth | Add snapshot SLA, stale-state UX, background rebuild metrics |
| Workflow assurance | 4.1 | 33/33 checks ready, 0 blockers | Still static/readiness, not enforced operations | Promote rings from observe to enforce after stable evidence windows |
| Release/tooling | 4.2 | Prisma, typecheck, lint, policy gates, focused tests pass | Full `verify:repo` and build not run in this pass; lint warnings remain | Clean warnings, run full `verify:repo`, keep as single gate |

## Battle-Tested Architecture Proposals

### 1. Declare The AqStoqFlow Operating Truth Contract

Create a short architecture contract that every economic workflow must satisfy:

- Tenant derived from trusted auth/RBAC context.
- Permission checked server-side.
- Fresh auth required for high-risk actions.
- Module entitlement evaluated.
- Input validated with schema.
- Mutations happen inside service-owned transaction boundaries.
- Business event recorded with idempotency key and payload hash.
- Ledger/source link created for financial impact.
- Inventory projection updated only through inventory kernel.
- Audit/evidence recorded with actor/context.
- Close certification invalidated when close-impacting.
- Snapshot/action queue refreshed or invalidated.

Why this matters: it turns the system from "many modules" into one proof-backed operating system.

### 2. Promote Module Entitlements From Observe To Enforce

Current evidence shows observe mode at `services/modules/module-control-contracts.ts:1` and allow-on-observe behavior at `services/modules/module-entitlement.service.ts:86-87`.

Recommended rollout:

1. Keep observe mode in development and free-trial tenants.
2. Add enforce-mode tests for one low-risk module.
3. Gate service commands through entitlement decisions, not just UI navigation.
4. Add owner/admin upgrade flow for denied modules.
5. Log all denied attempts as business/security events.

### 3. Harden Public And API Read Surfaces

Public receipt:

- Replace raw `salesOrderId` public lookup with signed, expiring receipt tokens.
- Store token hash, expiry, revocation status, and allowed presentation scope.
- Keep current redaction tests.
- Add brute-force resistant route behavior and rate limiting.

Item APIs:

- Require explicit item/catalog read permissions in addition to organization membership.
- Use a shared API authorization helper: `requireApiPermissionForOrg(orgId, "inventory.items.read")` or the repo's canonical permission name.
- Add tests that a member without read permission is denied.

### 4. Canonicalize PO Receive

Make `purchases.orders.receive` the only permission and product capability for receiving purchase orders.

Recommended contract:

- One server action name.
- One permission.
- One service command.
- One goods-receipt event.
- One inventory posting path.
- One AP evidence path.
- Legacy aliases either removed or turned into internal wrappers that call the canonical command.

This avoids parallel authorization behavior and makes audit trails much easier to explain.

### 5. Wire Universal Close Certification Invalidation

Every close-impacting mutation should either:

- be blocked after close certification, or
- call `recordCloseCertificationInvalidation`.

Required domains:

- Inventory adjustments, transfers, release, valuation rebuild.
- Ledger postings, reversals, manual journal changes.
- Payment reconciliation match/signoff changes.
- POS refunds/voids/offline replay.
- Supplier invoice/payment release.
- Payroll approval/payment/declaration changes.
- Compliance submission/country-pack changes.
- RBAC/permission changes that affect certified evidence visibility.

### 6. Build Certified Read Models

Separate normal operational DTOs from certified report DTOs:

- Operational DTOs can be fast and current.
- Certified DTOs must carry source links, event IDs, evidence grade, freshness, and close-impact status.

This gives the product a clean way to say: "This number is usable operationally" versus "This number is certified enough for accounting/compliance."

### 7. Complete External Readiness

Internal evidence is strong, but enterprise trust requires real external channels:

- Statutory authority adapter registry with production certification workflow.
- Payment provider statement/event ingestion with credentials, rotation, outage status, and replay.
- Payroll filing adapters with redacted evidence and expert-review workflow.
- Country-pack review lifecycle with version pinning and approval evidence.
- Monitoring for stale adapters, failed submissions, delayed provider events, and credential expiry.

### 8. Productize Assurance Into Daily Work

Workflow assurance should become daily work routing:

- Convert static checks to scheduled checks.
- Create owner/role-specific action queues.
- Add SLA, escalation, suppression, reopen, and duplicate handling.
- Show proof links for every finding.
- Keep close/payment/inventory blockers visible in manager and owner views.

### 9. Add Performance And Freshness Budgets

The platform is growing into an operating system. It needs explicit data budgets:

- Snapshot freshness SLA by domain.
- Background rebuild job status.
- Query budget per dashboard.
- Index coverage for hot workflows.
- Stale-data banners in UI.
- Cache invalidation tied to business events.

### 10. Make `verify:repo` The Final Release Gate

`package.json:28` already defines `verify:repo`. The next release discipline should be:

1. Clean remaining lint warnings.
2. Run full `npm run verify:repo`.
3. Treat `verify:release` as an alias only.
4. Add build/browser smoke evidence for critical flows.
5. Keep policy gates mandatory.

## Profitability And Product Impact

This architecture can become profitable because it does more than record transactions:

- **Trust reduces accountant and owner anxiety.** Close assurance, reconciliation, source links, and evidence grades make numbers explainable.
- **Controls reduce leakage.** POS void/refund controls, AP bank approval, payment reconciliation, stock adjustment evidence, and offline replay blockers reduce fraud and operational loss.
- **Daily action loops increase retention.** Manager action center and owner war room can become daily habits for SMB users.
- **Country-pack and compliance features support premium pricing.** OHADA/SYSCOHADA trust, fiscal documents, payroll evidence, and certification packs are high-value differentiators.
- **Service-owned architecture lowers support cost.** Fewer parallel paths and fewer direct data writes mean fewer mysterious data bugs.
- **Certified read models can become accountant-facing upsell.** Accountants and owners will pay for explainable numbers, not just dashboards.

## Prioritized Roadmap

### Slice 1: API And Public Surface Hardening

Files to inspect/change:

- `app/api/receipts/[receiptId]/route.ts`
- `services/pos/receipt.service.ts`
- `app/api/v1/organisations/[id]/items/route.ts`
- `app/api/v1/organisations/[id]/briefItems/route.ts`
- `lib/security/server-authz.ts`

Work:

- Add signed expiring receipt tokens.
- Add explicit item API permissions.
- Add negative tests for member-without-permission access.

Verification:

- `npm test -- services/pos/__tests__/receipt-public.test.ts services/item/__tests__/item.service.test.ts --runInBand`
- `npm run error:boundary`
- `npm run service:boundary`
- `npm run lint`

### Slice 2: Canonical PO Receive Permission

Files to inspect/change:

- `config/permissions.ts`
- `actions/purchaseOrderWorkflow/*`
- `services/purchase-order/purchase-order.service.ts`
- `services/purchasing/ap-control.service.ts`
- `services/assurance/assurance-registry.service.ts`

Work:

- Standardize on `purchases.orders.receive`.
- Remove or wrap parallel receive permissions.
- Ensure goods receipt, inventory posting, AP evidence, and workflow assurance all point to the same capability.

Verification:

- `npm test -- services/purchase-order/__tests__/purchase-order.service.test.ts services/purchasing/__tests__/ap-control.service.test.ts actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts --runInBand`
- `npm run service:boundary`
- `npm run policy:gates`

### Slice 3: Module Entitlement Enforce Pilot

Files to inspect/change:

- `services/modules/module-control-contracts.ts`
- `services/modules/module-entitlement.service.ts`
- `actions/modules/*`
- `services/_shared/protect.ts`

Work:

- Add enforce mode behind configuration.
- Pick one low-risk module.
- Add service-side denial behavior and upgrade/action-route evidence.
- Keep audit evidence for allowed, would-block, and denied attempts.

Verification:

- `npm test -- services/modules/__tests__/module-entitlement.service.test.ts actions/modules/__tests__/module-control.actions.test.ts --runInBand`
- `npm run typecheck`
- `npm run lint`

### Slice 4: Close Invalidation Mesh

Files to inspect/change:

- `services/accounting/close-assurance-pack.service.ts`
- `services/inventory/*`
- `services/pos/*`
- `services/purchasing/*`
- `services/payroll/*`
- `services/reconciliation/*`
- `services/compliance/*`

Work:

- Define close-impacting mutation helper.
- Call invalidation after certified close impact.
- Add tests for mutation-after-certification behavior.

Verification:

- `npm test -- services/accounting/__tests__/close-assurance-pack.service.test.ts services/inventory/__tests__/inventory-adjustment.service.test.ts services/pos/__tests__/pos.service.test.ts services/purchasing/__tests__/ap-control.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
- `node scripts\workflow-assurance-release-gate.js --mode report`

### Slice 5: External Readiness

Files to inspect/change:

- `services/compliance/adapters/*`
- `services/compliance/certification-outbox.service.ts`
- `services/payments/*`
- `services/payroll/*`
- `services/regulatory/*`

Work:

- Credential lifecycle.
- Adapter status and outage monitoring.
- Statement/provider ingestion channels.
- Payroll declaration filing adapters.
- Expert-review country-pack workflow.

Verification:

- Adapter-specific contract tests.
- Provider replay tests.
- Staleness and outage tests.
- Compliance outbox processing tests.

### Slice 6: Certified Read Models And Daily Operating Cockpit

Files to inspect/change:

- `services/snapshots/*`
- `services/manager-action-center/*`
- `services/owner-war-room/*`
- `services/assurance/*`
- dashboard routes for manager/owner/accountant surfaces.

Work:

- Add certified DTO/read model contract.
- Add freshness and evidence-grade rules.
- Connect unresolved assurance findings to manager/owner action queues.
- Make daily operating truth the first-class user experience.

Verification:

- `npm test -- services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts services/manager-action-center/__tests__/manager-action-center.service.test.ts services/owner-war-room/__tests__/owner-war-room.service.test.ts services/assurance/__tests__/assurance-registry.service.test.ts --runInBand`
- Browser smoke for manager/owner/accountant routes.

## Final Recommendation

Do not rebuild the architecture. Harden and productize the architecture already emerging.

The winning direction is:

1. Keep service-boundary and inventory-boundary at zero.
2. Make every economic workflow produce event, ledger, source-link, audit, and close-impact evidence.
3. Turn module entitlement and workflow assurance from observe/readiness into controlled enforcement.
4. Make payment reconciliation and close assurance the trust backbone.
5. Make manager action center and owner war room the daily operating front door.
6. Finish external adapter readiness only after the internal evidence model stays green.

The repo is close to a real SMB operating system architecture. Its next advantage will come from consistency, enforcement, and product clarity, not from adding more disconnected features.

