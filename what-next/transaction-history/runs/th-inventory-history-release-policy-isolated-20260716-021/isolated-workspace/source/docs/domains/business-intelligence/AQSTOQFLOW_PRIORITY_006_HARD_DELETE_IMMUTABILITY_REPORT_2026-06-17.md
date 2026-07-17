# AqStoqFlow Priority 006 Hard Delete Immutability Report

Date: 2026-06-17

## Priority Skill

- Skill: `priority-006-hard-delete-immutability`
- Priority: 006
- Status: completed for the current ordered slice
- Next priority: `priority-007-error-response-normalizer`

## Skill Refinement And Install

The priority skill was refined, staged, installed, validated, and run.

- Staged skill: `.codex-skill-drafts/priority-006-hard-delete-immutability/SKILL.md`
- Installed skill: `C:\Users\J COMPUTER\.codex\skills\priority-006-hard-delete-immutability\SKILL.md`
- Installed metadata: `C:\Users\J COMPUTER\.codex\skills\priority-006-hard-delete-immutability\agents\openai.yaml`
- Validation: `python "C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py" "C:\Users\J COMPUTER\.codex\skills\priority-006-hard-delete-immutability"` passed with `Skill is valid!`
- Staged and installed `SKILL.md` SHA-256: `7E5080D94840B5501FDD8F3597B1172CC0E7FB0DF26F03E2BDCE297672C74B7D`

## Source Reports And Files Inspected

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md`
- `graphify-out/GRAPH_REPORT.md`
- `services/purchase-order/purchase-order.service.ts`
- `services/purchase-order/__tests__/purchase-order.service.test.ts`
- `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts`
- `actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts`
- `hooks/useRecentPurchaseOrderQueries.ts`
- `services/events/business-event.service.ts`
- `services/events/business-event.schemas.ts`
- `services/pos/pos.service.ts`
- `services/supplier/supplier.service.ts`
- `services/accounting/posting-rules.service.ts`
- `services/auth/password-policy.ts`
- `prisma/schema.prisma`
- `scripts/service-boundary-gate.js`
- `scripts/__tests__/service-boundary-gate.test.js`

## Status Before Changes

Priority 005 and 005B had already removed the most dangerous purchase-order hard deletes from the dirty worktree: purchase order deletion was already an archive/cancel update, and draft line replacement had already been converted away from `purchaseOrderLine.deleteMany`.

The remaining priority-006 gap was that hard deletes were not yet statically classified, the hard-delete gate did not exist, and the active purchase-order archive path had audit evidence but not durable business-event evidence.

## Files Changed

- `.codex-skill-drafts/priority-006-hard-delete-immutability/SKILL.md`
- `.codex-skill-drafts/priority-006-hard-delete-immutability/agents/openai.yaml`
- `scripts/hard-delete-gate.js`
- `scripts/__tests__/hard-delete-gate.test.js`
- `services/purchase-order/purchase-order.service.ts`
- `services/purchase-order/__tests__/purchase-order.service.test.ts`
- `what-next/AQSTOQFLOW_PRIORITY_006_HARD_DELETE_GATE_REPORT_2026-06-17.md`
- `what-next/AQSTOQFLOW_PRIORITY_006_HARD_DELETE_GATE_REPORT_2026-06-17.json`

## Services Added Or Reused

- Reused `services/purchase-order/purchase-order.service.ts` as the owning service for PO archive/delete semantics.
- Reused `services/events/business-event.service.ts` for durable business-event evidence.
- Added `scripts/hard-delete-gate.js` as the static classification gate.

## Delete Classifications

The new hard-delete gate scans `actions`, `services`, `app`, `hooks`, and `components`.

Report-mode result:

- Active unsafe hard-delete findings: 0
- Allowed classified hard deletes: 7
- Total delete callsites scanned: 7

Allowed classifications:

- `DRAFT_CLEANUP`: 4
  - `services/purchase-order/purchase-order.service.ts`: guarded PO line reconciliation only before receipt/invoice evidence.
  - `services/pos/pos.service.ts`: draft POS cart line cleanup before sale/payment/fiscal evidence.
- `CONFIG_RELATIONSHIP_CLEANUP`: 1
  - `services/supplier/supplier.service.ts`: service-owned item-supplier catalog relationship removal scoped through active item/supplier ownership.
- `CONFIG_REPLACEMENT_CLEANUP`: 1
  - `services/accounting/posting-rules.service.ts`: posting-rule line replacement inside the accounting service with audit path.
- `CONFIG_RETENTION_CLEANUP`: 1
  - `services/auth/password-policy.ts`: bounded password history retention cleanup.

## Runtime Remediation

The purchase-order archive path now records a business event in the same transaction as the archive marker and audit log.

- Event type: `purchase_order.archived`
- Idempotency key: `purchase-order:archive:<organizationId>:<purchaseOrderId>`
- Source type: `PURCHASE_ORDER`
- Source id: purchase order id
- Actor: trusted RBAC actor passed by the action layer
- Metadata gate: `priority-006-hard-delete-immutability`
- Metadata classification: `SOFT_DELETE_ARCHIVE`
- Event is marked applied through `markBusinessEventAppliedInTx`.

The action layer remains thin and continues to derive tenant and actor via `scopedOrg`/RBAC before delegating to the service.

## Controls Added Or Confirmed

- Tenant: PO archive remains scoped by `organizationId` and `deletedAt: null`.
- RBAC: `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts` continues to require `purchases.delete`.
- Actor: archive rejects missing or placeholder `system-user` actor ids.
- Audit: `ARCHIVE_PURCHASE_ORDER` audit log includes before/after status and actor.
- Business event: `purchase_order.archived` records durable evidence with idempotency.
- Draft cleanup: PO line cleanup is allowed only for `DRAFT`/`SUBMITTED` and rejects receipt/invoice evidence.
- Static gate: hard-delete classifications are now executable and test-covered.

## Tests Added Or Changed

- Added `scripts/__tests__/hard-delete-gate.test.js`.
- Updated `services/purchase-order/__tests__/purchase-order.service.test.ts` to assert PO archive business-event evidence and applied marking.

Covered cases:

- action-owned delete outside service boundary is flagged;
- guarded PO draft cleanup is allowed;
- POS draft-cart cleanup is allowed;
- password retention cleanup is allowed;
- service-owned item-supplier catalog cleanup is allowed;
- unguarded evidence-bearing service delete is forbidden;
- gate markdown includes active and allowed counts;
- PO archive does not call hard delete on order or lines and emits audit/business-event evidence.

## Verification Commands

Passed:

```powershell
python "C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py" "C:\Users\J COMPUTER\.codex\skills\priority-006-hard-delete-immutability"
node scripts/hard-delete-gate.js --mode report --out what-next/AQSTOQFLOW_PRIORITY_006_HARD_DELETE_GATE_REPORT_2026-06-17.md --json-out what-next/AQSTOQFLOW_PRIORITY_006_HARD_DELETE_GATE_REPORT_2026-06-17.json
node scripts/hard-delete-gate.js --mode fail
npm test -- scripts/__tests__/hard-delete-gate.test.js --runInBand
npm test -- services/purchase-order actions/purchaseOrderWorkflow --runInBand
```

Focused test results:

- Hard-delete gate tests: 1 suite passed, 7 tests passed.
- Purchase-order/action tests: 2 suites passed, 9 tests passed.

Broad verification attempted:

```powershell
npm test -- actions services --runInBand
npm run typecheck
npm run verify:repo
```

Broad results:

- `npm test -- actions services --runInBand`: failed in an unrelated close-assurance test. 61 suites passed, 1 suite failed, 277 tests passed, 1 test failed. Failure: `services/accounting/__tests__/close-assurance.service.test.ts` expected `result.run.status` to be `READY` but received `BLOCKED`.
- `npm run typecheck`: failed on existing non-priority-006 errors:
  - `actions/inventory/inventoryActions.ts(211,76)`: missing `nameFr` and `descriptionFr` in item creation payload.
  - `services/accounting/close-assurance.service.ts(946,9)`: `Prisma.InputJsonObject` not assignable to `JsonValue | undefined`.
  - `services/inventory/inventory-read.service.ts(16,3)`: `InventoryStats` is not exported from `@/types/inventoryTypes`.
- `npm run verify:repo`: `prisma validate` passed; `typecheck` failed on the same three errors.

## Remaining Blockers

The priority-006 touched slice is green, including the new hard-delete gate in fail mode. Repo-wide verification remains blocked by unrelated close-assurance and inventory/type definition issues listed above.

The next remediation should run `priority-007-error-response-normalizer` after deciding whether to first clear the existing close-assurance/typecheck blockers as a baseline repair.
