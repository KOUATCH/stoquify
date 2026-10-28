# Payroll Immutability Runtime Check

Generated: 2026-08-22T14:24:26.391Z
Mode: `fail`
Status: `ready`

## Safety

- Database: `stockflow_immutability_test`
- Host: `localhost`
- Secret URL values are not printed.

## Summary

- Required triggers present: 9/9
- Forbidden mutation checks blocked: 14/14
- Allowed lifecycle checks passed: 3/3
- Blockers: 0

## Trigger Catalog

- present: payroll_runs.payroll_runs_prevent_finalized_mutation_trigger
- present: payroll_run_lines.payroll_run_lines_prevent_posted_mutation_trigger
- present: payroll_payslips.payroll_payslips_prevent_emitted_mutation_trigger
- present: payroll_payslip_lines.payroll_payslip_lines_prevent_emitted_mutation_trigger
- present: payroll_payment_batches.payroll_payment_batches_prevent_released_mutation_trigger
- present: payroll_payment_allocations.payroll_payment_allocations_prevent_released_mutation_trigger
- present: payroll_declarations.payroll_declarations_prevent_payload_mutation_trigger
- present: payroll_declaration_evidence.payroll_declaration_evidence_prevent_mutation_trigger
- present: payroll_employee_balance_events.payroll_employee_balance_events_prevent_mutation_trigger

## Forbidden Mutation Checks

- blocked: block_run_update - 23000: error: Cannot modify immutable payroll evidence: payroll run payroll_immut_run_1787408666138_g7rp6yw
- blocked: block_run_delete - 23000: error: Cannot delete immutable payroll evidence: payroll run payroll_immut_run_1787408666138_g7rp6yw
- blocked: block_run_line_update - 23000: error: Cannot modify immutable payroll evidence: payroll run line payroll_immut_run_line_1787408666138_g7rp6yw
- blocked: block_payslip_update - 23000: error: Cannot modify immutable payroll evidence: payslip payroll_immut_payslip_1787408666138_g7rp6yw
- blocked: block_payslip_line_update - 23000: error: Cannot modify immutable payroll evidence: payslip line payroll_immut_payslip_line_1787408666138_g7rp6yw
- blocked: block_payment_batch_update - 23000: error: Cannot modify immutable payroll evidence: payment batch payroll_immut_batch_1787408666138_g7rp6yw
- blocked: block_payment_batch_status_reversal - 23000: error: Cannot change immutable payroll payment lifecycle status from RELEASED to DRAFT for payment batch payroll_immut_batch_1787408666138_g7rp6yw
- blocked: block_payment_allocation_update - 23000: error: Cannot modify immutable payroll evidence: payment allocation payroll_immut_allocation_1787408666138_g7rp6yw
- blocked: block_declaration_update - 23000: error: Cannot modify immutable payroll evidence: declaration payroll_immut_declaration_1787408666138_g7rp6yw
- blocked: block_declaration_delete - 23000: error: Cannot delete immutable payroll evidence: declaration payroll_immut_declaration_1787408666138_g7rp6yw
- blocked: block_declaration_evidence_update - 23000: error: Cannot modify immutable payroll evidence: declaration evidence payroll_immut_declaration_evidence_1787408666138_g7rp6yw
- blocked: block_declaration_evidence_delete - 23000: error: Cannot delete immutable payroll evidence: declaration evidence payroll_immut_declaration_evidence_1787408666138_g7rp6yw
- blocked: block_employee_balance_event_update - 23000: error: Cannot modify immutable payroll evidence: employee balance event payroll_immut_balance_event_1787408666138_g7rp6yw
- blocked: block_employee_balance_event_delete - 23000: error: Cannot delete immutable payroll evidence: employee balance event payroll_immut_balance_event_1787408666138_g7rp6yw

## Allowed Lifecycle Checks

- allowed: allow_run_metadata - Allowed lifecycle metadata mutation succeeded.
- allowed: allow_declaration_status - Allowed lifecycle metadata mutation succeeded.
- allowed: allow_payment_reconciliation_status - Allowed lifecycle metadata mutation succeeded.

## Blockers

No payroll immutability runtime blockers detected.

## Safety Notes

- Requires a dedicated non-production DB URL.
- Applies Prisma migrations to the selected DB unless `--skip-migrate` is supplied.
- Creates synthetic payroll rows inside a transaction that is deliberately rolled back.
