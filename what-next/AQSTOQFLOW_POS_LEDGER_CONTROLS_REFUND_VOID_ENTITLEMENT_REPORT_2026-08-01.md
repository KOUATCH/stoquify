# AqStoqFlow POS Ledger Controls Refund/Void Entitlement Report - 2026-08-01

## Selected skill

- `007-aqstoqflow-pos-ledger-controls`

## Objective

Apply the next narrow POS ledger-control hardening pass by enforcing POS module entitlement on refund and void action boundaries. These actions reverse sale, payment, cash drawer, stock, and ledger evidence, so they should be protected by the same POS module contract already present on sale commit.

## Scope boundary

- This pass did not introduce a new payment provider.
- This pass did not expand WhatsApp behavior.
- This pass did not enable broad/global module entitlement enforcement.
- The module surface inventory was refreshed in report-only mode.
- Existing store-credit containment was inspected and left in place.

## Work completed

- Reused the existing POS tender module gate contract in `actions/pos/tender.actions.ts`.
- Added POS module entitlement enforcement to:
  - `refundPOSSaleAction`
  - `voidPOSSaleAction`
- Preserved existing RBAC permissions and fresh-auth requirements:
  - `pos.transactions.refund`
  - `pos.transactions.void`
  - `freshAuth: { maxAgeSeconds: 300 }`
- Added focused action tests proving:
  - sale commit still passes receipt requests through the service-owned workflow;
  - sale commit is denied before service execution when POS is not entitled;
  - refund checks fresh auth, RBAC, POS module entitlement, then calls the service;
  - refund is denied before service execution when POS is not entitled;
  - void checks fresh auth, RBAC, POS module entitlement, then calls the service;
  - void is denied before service execution when POS is not entitled.
- Refreshed report-only module surface inventory.
- Re-ran the offline POS fiscal replay gate after the POS action-boundary change.

## Files changed

- `actions/pos/tender.actions.ts`
- `actions/pos/__tests__/tender.actions.test.ts`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `what-next/offline-pos-fiscal-replay-readiness.md`
- `what-next/offline-pos-fiscal-replay-readiness.json`

## Verification commands and results

- `npm test -- actions/pos/__tests__/tender.actions.test.ts --runInBand`
  - Passed: 1 suite, 6 tests.
- `npm test -- services/pos/__tests__/pos.service.test.ts --runInBand`
  - Passed: 1 suite, 19 tests.
- `npm run module:surface:inventory`
  - Passed.
  - Wrote report-only inventory with 386 records.
- `npm run offline:pos:replay:gate`
  - Passed: 16/16 checks ready, 0 blockers.
- `npm test -- scripts/__tests__/module-surface-inventory.test.js --runInBand`
  - Passed: 1 suite, 14 tests.
- `git diff --check -- <scoped changed files>`
  - Passed.
  - Git reported CRLF-to-LF warnings for `actions/pos/tender.actions.ts`.

## Gate blocked

- `npm run module:surface:fail`
  - Blocked by one unrelated ratchet gap:
    - `actions/agents/agent-release-control.actions.ts`
    - Reason: module-required surface has no canonical module owner.

This blocker is outside the POS ledger-controls slice and was not changed in this pass.

## Current POS result

The critical POS tender mutation chain now has action-level POS entitlement enforcement on:

- sale commit;
- refund;
- void.

Refund and void still retain their stronger correction controls through fresh authentication and critical POS transaction permissions.

## Next recommended numbered skill

- `008-aqstoqflow-compliance-center`

