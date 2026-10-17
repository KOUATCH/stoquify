# Local systematic reseed runbook

Run: `2026-09-27-systematic-1500`. Minimum quantity: **1,500**. Preserve established people/business/item/role names, identifiers, access assignments and protected history. Populate each business model for a supported scenario; empty technical models need an explicit reason rather than filler.

## Target and preservation

Applied original: `localhost:5432/stoquify_replay_next_20260830`. Validated candidate: `localhost:5432/stoquify_reseed_local_20260927_1500`. The source reference, scenarios, draft-financial and inventory stages completed; see run-root `source-*.json` and `EVIDENCE_REGISTER.md` for exact acceptance and retained exceptions. Recheck sanitized identity for every execution; never print connection secrets. The local application continues to use the original database; no target switch is implied.

Keep the original backup and tested restore until candidate verification is accepted. Existing synthetic fixture history contains invalid business arithmetic and fabricated evidence-shaped fields. Cloning it preserves identities and history but does not make that history valid. Do not disable constraints/triggers or delete protected rows to make checks pass.

## Dependency order and scenarios

| Sequence | Meaningful scenario | Canonical source / prerequisites | Acceptance |
|---|---|---|---|
| 1 | Existing organization, locations, identities, custom/canonical roles | Schema and `prisma/compliance-hris-role-seed.ts`, `prisma/seed-integrated-rbac.ts`, actual guard definitions | Preserve baseline assignments; add missing supported roles and new personas without privilege broadening |
| 2 | Domain-correct units, categories, brands, taxes and catalog | Actual item associations; country-pack resolver for configured date; no invented statutory treatment | Same-tenant references, meaningful labels, compatible unit dimensions, valid tax snapshots |
| 3 | Inventory opening/receiving adjustments | `services/inventory/inventory-stock-event.service.ts`; existing stock history and valuation | Every item has >=1,500 on hand at end; quantities/valuation/postings reconcile; replay is idempotent |
| 4 | Tenant module workspace migration | `getModuleCompositionData` -> `previewModuleComposition` -> `saveModuleCompositionDraft`/`applyModuleComposition` in `services/modules/module-composition.service.ts` | Preserve legacy active/entitled modules; supply current revision and fresh preview hash; dependencies/setup verified; no billing side effect |
| 5 | HR time policy and leave | `createTimeFoundation`, independent `approveTimeFoundation`, `assignWorkSchedule`, `approveWorkSchedule`, `requestOperationalTime`, `decideOperationalTimeRequest`, `importOperationalTime` in `services/hris/operational-time.service.ts`; `postHrisLeaveBalanceEntry` | Explicit company-policy fixture/evidence hashes, separate preparer/approver, existing employee and manager scopes, no unsupported legal-certification claim |
| 6 | Delivery order lifecycle | `createDeliveryOrder`, `confirmDeliveryOrder`, `postDeliveryGoodsIssue`, `createDeliveryBillingOutcome` in `services/order-to-cash/delivery-order.service.ts` | Stable command IDs, expectedVersion, same-tenant customer/location/items, enough available stock, open accounting period; actual reservation/movement/billing records |
| 7 | Local customer collection | `collectCustomerSettlementWithControls` in `services/accounting/customer-settlement.service.ts` | Context `{organizationId,actorId,actorPermissions,lastAuthAt,now}`; posted eligible sale, open period, CASH method for purely local scene, amount/allocation <= outstanding; SHA256 of actual labelled synthetic supporting files |
| 8 | Draft AP arithmetic cleanup | `repairDraftSyntheticSupplierInvoices` in `prisma/systematic-reseed-financial-repair.ts` | Preview first; apply only unapproved/unposted identified drafts; audit before/after; no changes to historical sales/issued docs |
| 9 | POS/receipts/reconciliation/accounting/close | Owning services and focused smoke scripts; inspect each command before execution | Actual lifecycle evidence and role-denial checks; synthetic provider evidence labelled; no outbound payment/submission/email |
| 10 | Final verification and reports | All-item stock report, read-only integrity scripts, focused tests, role browser journeys | Run after all mutating smoke scenarios; final counts are descriptive, never semantic success criteria |

For module setup, use `ModuleCompositionActor {organizationId,actorId,actorPermissions}` and preserve `data.activeModules`. Applying a configuration may need `setupInputs.payrollPeriodId` and `setupInputs.complianceAdapterId`. A failed preview is evidence of missing setup, not permission to force lifecycle status.

For HRIS time imports, source files and hashes are real local synthetic fixtures. Do not fabricate a reviewed public-holiday calendar. A company-specific synthetic calendar can have no public holidays until authoritative country-pack support exists. Requests and anomalies can intentionally remain pending as meaningful exception scenarios.

## Reproduction commands

Run from the repository root with the coordinator-selected local environment:

```powershell
node what-next/database-reseed/2026-09-27-systematic-1500/assurance/build-assurance.cjs --metadata-only
node what-next/database-reseed/2026-09-27-systematic-1500/assurance/audit-business-invariants.cjs
node what-next/database-reseed/2026-09-27-systematic-1500/assurance/audit-business-invariants.cjs --source
node node_modules/jest/bin/jest.js prisma/__tests__/systematic-reseed-financial-repair.test.ts --runInBand
```

The business audit explicitly targets the candidate database by default; `--source` selects the original local database and writes separate `source-business-invariants` artifacts. Both modes enforce PostgreSQL read-only transactions. The metadata producer records the latest available profile/audit count snapshot separately from semantic audit evidence. The full `build-assurance.cjs` runs eight inspected static gates, writing only this assurance directory. It does not migrate or seed. Its production-country-pack gate stays blocked until real expert evidence exists.

Run-root verification commands such as `seed:smoke:realistic` mutate state and must be reviewed and run only on the candidate or an isolated verification copy. `npm run seed` and `npm run reset` are not interchangeable with the preservation workflow; the existing comprehensive coverage generator manufactures generic fields and must not be blindly rerun.

## Failure and resumption

Keep independent command logs and failures. Preserve a checkpoint after each completed domain. Rerun operations using the same domain idempotency keys; do not repeatedly top up stock by 1,500. A financial repair retry recalculates the same draft totals and produces no extra audit record when unchanged. If protected evidence or an unexplained dependency appears, keep that record unchanged, report its exact reason, and continue independent scenarios.

Before a final local target switch, verify backups, baseline identity preservation and final business checks. Record whether historic fixture exceptions remain visible and whether they are excluded from trusted demonstrations. Restoring a backup must target a separately verified local database; do not erase the original as a cleanup step.
