---
name: priority-006-hard-delete-immutability
description: "Remediate AqStoqFlow priority 006 by classifying and eliminating unsafe hard deletes for evidence-bearing records. Use when executing the ordered priority remediation suite, hardening delete/immutability policy, adding hard-delete gates, migrating legacy delete paths into service-owned cancellation, reversal, soft-delete, draft cleanup, or forbidden-operation errors, and saving the required completion report."
---

# Hard Delete Immutability

## Purpose

Make every delete path intentional. Evidence-bearing, economic, fiscal, audit, ledger, close, compliance, payment, inventory, purchasing, POS, payroll, and certification records must not be physically erased by active application workflows. Replace hard deletes with draft-only cleanup, cancellation, reversal, soft delete, or explicit forbidden-operation errors, and ratchet the codebase with a scanner.

## Source Reports

Read the relevant sections before editing:

- `what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md`
- `what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md`
- `what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md`
- `graphify-out/GRAPH_REPORT.md`

Prefer current code over stale report lines when they conflict.

## Language Lock

- Hard delete: a Prisma `delete` or `deleteMany` that removes a persisted row.
- Draft cleanup: physical removal allowed only for non-posted, non-received, non-invoiced, non-certified draft/detail rows with no external evidence and only inside the owning service.
- Soft delete: set `deletedAt`, `isActive`, archive/cancel status, or equivalent retention marker without removing the row.
- Cancellation or reversal: status or compensating workflow that preserves source and counter-evidence.
- Forbidden delete: a typed user-safe error for posted, final, received, invoiced, paid, reconciled, certified, closed-period, or audit/evidence records.

## Architecture Spine

Use the statutory service pattern:

```text
services/<domain>/*.schemas.ts
services/<domain>/*.errors.ts
services/<domain>/*.service.ts
services/<domain>/__tests__/*.test.ts

actions/<domain>/*.actions.ts     -> thin validation/orchestration only
hooks/<domain>/*.ts               -> data fetching/cache only
components/...                    -> UI only
scripts/*-gate.js                 -> static/reporting ratchets
```

Protected business truth must not be owned directly by actions, App Router pages, route handlers, hooks, UI components, mock/demo helpers, or direct Prisma calls outside approved services.

## First Slice

Start with the highest-risk purchasing and evidence-bearing paths:

- `services/purchase-order/purchase-order.service.ts`
- `actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts`
- `hooks/useRecentPurchaseOrderQueries.ts`
- `services/purchasing/*`
- `actions/purchasing/*`
- `actions/itemsShow/deleteItem.ts`
- `actions/item/items.ts`
- `actions/locations/deleteLocation.ts`
- `actions/users/deleteUser.ts`
- `actions/suppliers/itemSupplierActions.ts`
- `services/unit/unit.service.ts`
- `services/tax-rate/tax-rate.service.ts`
- `services/accounting/posting-rules.service.ts`
- `services/auth/password-policy.ts`
- `services/pos/pos.service.ts`
- `prisma/schema.prisma`

Do not widen into unrelated UI redesign or domain refactors.

## Classification Policy

Classify each `delete` and `deleteMany` finding before changing it:

| Classification | Allowed? | Required owner | Required proof |
| --- | --- | --- | --- |
| `DRAFT_CLEANUP` | Yes | Owning service | Guard proves draft/non-evidence state, focused test covers allowed cleanup |
| `CONFIG_RETENTION_CLEANUP` | Yes | Owning service | Non-economic retention cleanup, scoped by tenant/user/time, focused test or documented policy |
| `TEST_OR_SEED_ONLY` | Yes | Tests/seeds/scripts | Path is not runtime application workflow |
| `SOFT_DELETE_REQUIRED` | No until fixed | Owning service | `deletedAt`/archive marker and audit evidence |
| `CANCELLATION_REQUIRED` | No until fixed | Owning service | status transition, actor, reason, audit/business event |
| `REVERSAL_REQUIRED` | No until fixed | Owning service | compensating entry/event, source link, ledger/close blocker as applicable |
| `FORBIDDEN_EVIDENCE_DELETE` | No | Owning service | typed user-safe error and regression test |
| `ACTION_OWNED_DELETE` | No | Service | action delegates to service after validation/RBAC |
| `UNKNOWN_REVIEW` | No | TBD | stop or report blocker if ownership/evidence cannot be determined |

## Implementation Workflow

1. Run `rg` for `delete`, `deleteMany`, and existing gate scripts.
2. Run or create `node scripts/hard-delete-gate.js --mode report`.
3. Classify findings before editing. Prefer report mode until the baseline is reviewed.
4. Replace evidence-bearing hard deletes with service-owned archive/cancel/reverse/soft-delete or typed forbidden errors.
5. Require tenant scope, actor identity, RBAC, reason where destructive intent is user-facing, and immutable audit/business-event evidence for economic deletes.
6. Keep draft-only physical cleanup narrow, guarded, inside services, and tested.
7. Move callers only after the service replacement exists.
8. Update the gate tests so representative unsafe and allowed paths cannot regress.
9. Run focused tests, the hard-delete gate, relevant service-boundary/inventory gates when touched, and repo verification.
10. Save the completion or blocker report under `what-next/`.

## Security And Compliance Controls

- Derive tenant and actor from trusted auth/session context; do not trust caller-supplied organization or actor identifiers.
- Enforce RBAC at the service/action boundary used by the codebase.
- Enforce maker-checker segregation for approval, posting, certification, release, and destructive economic workflows where applicable.
- Reject closed or locked fiscal periods before economic mutation or certification state changes.
- Emit audit logs and business events for cancellation, reversal, archive, posting, certification, and evidence-impacting transitions.
- Create ledger entries, source links, reversal entries, or explicit close blockers where accounting truth would otherwise be incomplete.
- Return typed, user-safe enterprise errors; do not leak internal persistence details.

## Required Tests

Add or update focused tests that prove:

- posted/final/received/invoiced/paid/certified economic deletes are rejected;
- draft cleanup remains allowed only where policy permits;
- archive/cancel/reversal/soft-delete emits audit and, where available, business-event evidence;
- action-owned delete paths delegate to services with trusted tenant/actor/RBAC context;
- hard-delete gate classifies representative allowed and forbidden paths.

## Verification Commands

Run the relevant subset while implementing, then attempt:

```powershell
node scripts/hard-delete-gate.js --mode report
npm test -- scripts/__tests__/hard-delete-gate.test.js --runInBand
npm test -- services/purchase-order actions/purchaseOrderWorkflow --runInBand
npm test -- actions services --runInBand
npm run typecheck
npm run verify:repo
```

If a full command fails due unrelated legacy debt, capture the exact failure and keep the touched-slice focused commands green where possible.

## Completion Report

Save `what-next/AQSTOQFLOW_PRIORITY_006_HARD_DELETE_IMMUTABILITY_REPORT_YYYY-MM-DD.md` with:

- priority skill name and number;
- source reports and files inspected;
- status before changes;
- files changed;
- classifications added or changed;
- services added or reused;
- actions, routes, hooks, or UI callers migrated;
- security, tenant, RBAC, maker-checker, audit, business-event, ledger, and close-blocker controls added;
- tests added or changed;
- gate and verification commands with results;
- remaining blockers and the next priority skill to run.

## Stop Conditions

Stop and save a blocker report when:

- required schema or service ownership cannot be determined;
- a migration would require deleting evidence-bearing data without an approved replacement path;
- statutory, payroll, tax, or legal claims need expert approval not present in the repo;
- lower-numbered priority dependencies are open and this slice would build on unstable ground;
- unrelated verification failures make the touched-slice result impossible to isolate.

## Success Criteria

Every scanned hard delete is classified, the highest-risk purchasing/evidence-bearing runtime delete paths are remediated or explicitly guarded, and future unsafe economic deletes are visible through `scripts/hard-delete-gate.js`.
