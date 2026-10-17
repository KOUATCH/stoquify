# Source business integrity audit

Read-only snapshot of stoquify_replay_next_20260830. Counts concern invariant failures, never arbitrary table-size thresholds.

| Check | Result | Findings |
|---|---|---|
| receipt_movement_source_tieout | FAIL | 24 |
| posted_journal_balance | PASS | 0 |
| journal_line_sides | PASS | 0 |
| journal_currency_consistency | PASS | 0 |
| sales_header_arithmetic | PASS | 0 |
| sales_line_arithmetic | FAIL | 24 |
| sales_header_line_tax | FAIL | 24 |
| supplier_invoice_header_arithmetic | PASS | 0 |
| supplier_invoice_line_arithmetic | PASS | 0 |
| supplier_invoice_line_totals | PASS | 0 |
| payroll_run_arithmetic | PASS | 0 |
| payroll_run_line_arithmetic | PASS | 0 |
| payroll_run_line_totals | PASS | 0 |
| payslip_run_line_totals | PASS | 0 |
| payment_refund_bounds | PASS | 0 |
| signed_reconciliation_proof | PASS | 0 |
| posted_stock_count_line_variance | PASS | 0 |

## Generic payload findings

- PayrollRunLine.calculationSnapshot: 24 generic seed-only payloads.
- PayrollRunLine.ruleProvenance: 24 generic seed-only payloads.
- POSOfflineEvent.payload: 24 generic seed-only payloads.
- ProviderEvent.rawPayload: 24 generic seed-only payloads.
- BusinessEvent.payload: 24 generic seed-only payloads.
- BusinessEventOutbox.payload: 24 generic seed-only payloads.
- FiscalDocument.canonicalPayload: 24 generic seed-only payloads.
- WorkflowAssuranceCheckDefinition.sourceTables: 24 generic seed-only payloads.

## Diagnostics

- nullable_base_amount_snapshots: 120. Base-balance check derives missing base amounts from debit/credit times exchangeRate; NULL values are not silently omitted from aggregation.
