# Current runtime gate evidence

Read-only source snapshot: 2026-09-27T12:44:55.455Z. Connection default and transaction are both read-only; isolation is repeatable read.

- 24 receipt/source mismatches; same source keys as reseed audit.
- 24 sales have both line arithmetic and header-tax failures; same IDs.
- 48 movements lack matching source events (24 receipts, 24 sales); same IDs.
- 192 generic field findings across 8 families and 168 distinct records.
- All 41 items remain at least 1500 aggregate on hand. All 572 foreign keys and tenant links pass.
- Inventory projections, movement valuation and class-3 ledger agree at XAF 57,620,125 and XAF 56,858,075; zero drift.

Local synthetic repairs can continue as engineering work with current truthful provenance and normal controls. Real production source claims and authority approvals require actual source evidence and authorized reviewers. The registry placeholders are observe-only and must not be represented as 24 enforced failures.

Exact IDs, records, owners, inputs, consumer paths/lines and stage effects are in runtime-issues.json. All executed business SQL is in queries.json; comprehensive current query/FK results are in current-runtime-report.json.

| Issue | Findings | Proposed owner |
|---|---:|---|
| RECEIPT_SOURCE_MISMATCH | 24 | Warehouse/receiving manager with purchasing controller; inventory engineering implements and independent accountant verifies |
| SALES_LINE_AND_HEADER_TAX_MISMATCH | 24 | Sales/POS manager with accountant; POS engineering implements validated synthetic corrections |
| MISSING_STOCK_EVENT | 48 | Inventory integration engineer with inventory controller and independent accountant |
| GENERIC_PayrollRunLine_calculationSnapshot | 24 | Payroll engineer; payroll preparer and independent payroll reviewer |
| GENERIC_PayrollRunLine_ruleProvenance | 24 | Payroll engineer; payroll rule owner and independent reviewer |
| GENERIC_POSOfflineEvent_payload | 24 | Offline POS engineer; POS supervisor |
| GENERIC_ProviderEvent_rawPayload | 24 | Payment integration engineer; treasury/reconciliation operator |
| GENERIC_BusinessEvent_payload | 24 | Business-event integration engineer; owning source-domain controller |
| GENERIC_BusinessEventOutbox_payload | 24 | Event-delivery engineer; operations owner |
| GENERIC_FiscalDocument_canonicalPayload | 24 | Fiscal document engineer; accounting/compliance preparer and independent reviewer |
| GENERIC_WorkflowAssuranceCheckDefinition_sourceTables | 24 | Assurance platform engineer; internal-controls owner |
| COUNTRY_ADAPTER_SYNTHETIC_REVIEW_GAPS | 24 | Compliance adapter engineer/configurator and a different qualified country reviewer for real approval |
