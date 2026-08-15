# Offline POS Fiscal Replay Readiness Gate

Generated: 2026-08-15T16:52:13.752Z
Mode: fail
Status: ready

## Summary

- Checks ready: 16/16
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
- ready: durable_offline_schema_migration
- ready: active_cashier_session_scope
- ready: cryptographic_device_signature_verification
- ready: policy_expiry_and_reference_snapshot_quarantine
- ready: stable_offline_action_discriminant
- ready: expired_policy_operator_visibility

## Blockers

- None

## Safety

- This gate is static and read-only.
- It does not replay sales or mutate stock, cash, ledger, receipts, or fiscal documents.
- It verifies internal replay controls, not hardware, connectivity, authority, or statutory certification.
