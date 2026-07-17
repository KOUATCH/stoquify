# Kontava Offline POS Replay Assurance Run Report

Date: 2026-06-21
Skill: `kontava-offline-pos-replay-assurance`
Mode: implementation, observe-mode only

## Objective

Run the offline POS replay assurance slice so accepted offline envelopes are continuously classified as pending within SLA, replayed with proof, blocked/quarantined with conflict evidence, or visible as manager-actionable replay anomalies.

## Implementation Summary

The existing check `offline_pos.replay_sla.visible` already covered stale pending replay events and unresolved serious conflicts.

This run added four scheduled, observe-mode checks:

1. `offline_pos.accepted_event_business_event.required`
   - Verifies accepted offline events retain captured business-event proof and a pending-replay blocker.
   - Uses `pos_offline_events` and `business_events`.

2. `offline_pos.sequence_hash_conflict.visible`
   - Warns when active sequence, hash-chain, signature, or idempotency conflicts require manager review.
   - Uses `pos_offline_sync_conflicts`.
   - Covers `IDEMPOTENCY_PAYLOAD_MISMATCH`, `SEQUENCE_GAP`, `SEQUENCE_DUPLICATE_MISMATCH`, `HASH_CHAIN_FORK`, and `SIGNATURE_INVALID`.

3. `offline_pos.quarantined_event_conflict.required`
   - Verifies blocked, quarantined, or conflict-status offline events retain blocker code, blocker message, and linked conflict evidence.
   - Uses `pos_offline_events` and `pos_offline_sync_conflicts`.

4. `offline_pos.replayed_event_proof.required`
   - Verifies replayed or duplicate-replay events retain replay business-event proof, posting batch proof, and receipt document-hash proof.
   - Uses `pos_offline_events`, `business_events`, and `ledger_posting_batches`.

All checks use:

- `workflow: "offline_pos"`
- `executionMode: "scheduled_scan"`
- `enforceMode: false`
- `requiredPermission: "pos.transactions.read"`
- `ownerRole: "operations_lead"`
- `actionRoute: "/dashboard/pos"`
- tenant-scoped source predicates
- source hashes for incident dedupe

## Additional Type Safety Fix

`npm run typecheck` surfaced that three previously added payment reconciliation definitions were missing `enabled: true`.

Fixed:

- `payment_reconciliation.unmatched_provider_event.visible`
- `payment_reconciliation.unsigned_run_sla.visible`
- `payment_reconciliation.certificate_source_hash.current`

This was a registry contract completion fix, not an enforce-mode change.

## Files Touched

- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/assurance-registry.service.ts`
- `services/assurance/__tests__/assurance-registry.service.test.ts`

Generated reports:

- `what-next/WORKFLOW_ASSURANCE_OFFLINE_POS_REPLAY_RELEASE_GATE_STATIC_REPORT_2026-06-21.md`
- `what-next/WORKFLOW_ASSURANCE_OFFLINE_POS_REPLAY_RELEASE_GATE_STATIC_REPORT_2026-06-21.json`

## Verification

Passed:

- `npm test -- services/assurance/__tests__/assurance-registry.service.test.ts --runInBand`
  - 1 suite passed
  - 32 tests passed
- `npm test -- services/pos/__tests__/offline-sync.service.test.ts --runInBand`
  - 1 suite passed
  - 16 tests passed
- `npx eslint services/assurance/assurance-registry-contracts.ts services/assurance/assurance-registry.service.ts services/assurance/__tests__/assurance-registry.service.test.ts`
- `npm run typecheck`
- `git diff --check -- services\assurance\assurance-registry-contracts.ts services\assurance\assurance-registry.service.ts services\assurance\__tests__\assurance-registry.service.test.ts`
- `node scripts\workflow-assurance-release-gate.js --mode report --out what-next\WORKFLOW_ASSURANCE_OFFLINE_POS_REPLAY_RELEASE_GATE_STATIC_REPORT_2026-06-21.md --json-out what-next\WORKFLOW_ASSURANCE_OFFLINE_POS_REPLAY_RELEASE_GATE_STATIC_REPORT_2026-06-21.json`
  - Checks ready: 29/29
  - Indexes ready: 6/6
  - Engine-health gates ready: 2/2
  - Blockers: 0

## Enforce-Mode Status

Enforce-mode was not enabled.

Offline replay checks must remain observe-mode until seeded replay failure fixtures cover device sequence gaps, hash-chain forks, idempotency payload mismatch, duplicate replay, replay rollback, scope mismatch, stale device evidence, and receipt-to-fiscal-document traceability.

## Next Recommended Slice

Run `kontava-purchasing-ap-assurance` next, because purchasing/AP is the next major cash, stock, supplier-balance, and ledger-truth workflow after POS and offline replay.
