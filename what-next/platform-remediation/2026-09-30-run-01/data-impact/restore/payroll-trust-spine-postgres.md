# Payroll trust spine — restored local PostgreSQL evidence

Result: PASS
Target: stoquify_restore_local_remediation_20260930_run01

- PASS: concurrent_approval_has_one_atomic_winner
- PASS: duplicate_evidence_is_rejected_without_partial_commit
- PASS: failure_injection_rolls_back_run_event_outbox_audit_and_transition

SQL concurrency/rollback evidence; not application workflow, payroll calculation, country qualification or production certification.

Synthetic trust_cert_* seed and winning transaction evidence are retained on this disposable clone. Failed/duplicate transactions were rolled back. Existing restored rows were not targeted. No source writes or reset/prepare wrappers.
