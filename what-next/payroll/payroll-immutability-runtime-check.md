# Payroll Immutability Runtime Check

Generated: 2026-06-26T17:57:46.786Z
Mode: `fail`
Status: `ready`

## Safety

- Database: `stockflow_immutability_test`
- Host: `localhost`
- Secret URL values are not printed.

## Summary

- Required triggers present: 8/8
- Forbidden mutation checks blocked: 12/12
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

## Forbidden Mutation Checks

- blocked: block_run_update - P2010: PrismaClientKnownRequestError
- blocked: block_run_delete - P2010: PrismaClientKnownRequestError
- blocked: block_run_line_update - P2010: PrismaClientKnownRequestError
- blocked: block_payslip_update - P2010: PrismaClientKnownRequestError
- blocked: block_payslip_line_update - P2010: PrismaClientKnownRequestError
- blocked: block_payment_batch_update - P2010: PrismaClientKnownRequestError
- blocked: block_payment_batch_status_reversal - P2010: PrismaClientKnownRequestError
- blocked: block_payment_allocation_update - P2010: PrismaClientKnownRequestError
- blocked: block_declaration_update - P2010: PrismaClientKnownRequestError
- blocked: block_declaration_delete - P2010: PrismaClientKnownRequestError
- blocked: block_declaration_evidence_update - P2010: PrismaClientKnownRequestError
- blocked: block_declaration_evidence_delete - P2010: PrismaClientKnownRequestError

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
