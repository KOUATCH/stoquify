# Offline POS Fiscal Replay Readiness Gate

Generated: 2026-07-16T15:39:49.391Z
Mode: fail
Status: ready

## Summary

- Checks ready: 10/10
- Blockers: 0

## Checks

- ready: provisional_receipt_only_client_policy
- ready: deterministic_device_hash_chain
- ready: tenant_terminal_device_scope
- ready: inactive_device_ingestion_quarantine
- ready: inactive_device_replay_revalidation
- ready: sequence_hash_idempotency_quarantine
- ready: accepted_event_pending_replay_proof
- ready: exact_once_pos_finalization_and_recovery
- ready: receipt_fiscal_and_replay_evidence
- ready: assurance_and_policy_wiring

## Blockers

- None

## Safety

- This gate is static and read-only.
- It does not replay sales or mutate stock, cash, ledger, receipts, or fiscal documents.
- It verifies internal replay controls, not hardware, connectivity, authority, or statutory certification.
