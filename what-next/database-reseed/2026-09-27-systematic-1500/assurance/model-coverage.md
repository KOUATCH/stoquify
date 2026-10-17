# Model and dependency coverage

Coverage decisions and source dependencies are not proof that rows are meaningful or workflows pass. Baseline counts are from baseline-profile.json; row thresholds are not quality tests. Candidate counts: 2026-09-27T11:31:29.734Z. Source after execution counts: 2026-09-27T11:40:59.784Z.

Models: 211. Enums: 207. Generic coverage models: 64.

Per-field checks, SQL declarations and implicit joins: schema-coverage.json. Other physical tables: _UserRoles (99), _prisma_migrations (87), legacy_production_batches (0), legacy_recipe_ingredients (0), legacy_recipes (0). Legacy production tables are intentionally retained without adding retired functionality.

| Model / table | Domain | Baseline / candidate / source count | Population decision | Generic generator |
|---|---|---|---|---|
| PictureAsset / `picture_assets` | reference data and inventory | 5 / 5 / 5 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| Account / `accounts` | identity | 30 / 111 / 111 | PRESERVE_EXISTING_AND_ADD_MISSING_SUPPORTED_SCENARIOS | no |
| Session / `sessions` | identity | 61 / 69 / 64 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| Verification / `verifications` | identity | 24 / 24 / 24 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | YES: review semantics |
| User / `users` | identity | 99 / 180 / 180 | PRESERVE_EXISTING_AND_ADD_MISSING_SUPPORTED_SCENARIOS | no |
| Role / `roles` | identity | 95 / 174 / 174 | PRESERVE_EXISTING_AND_ADD_MISSING_SUPPORTED_SCENARIOS | no |
| Organization / `organizations` | organization and modules | 3 / 3 / 3 | PRESERVE_EXISTING_AND_ADD_MISSING_SUPPORTED_SCENARIOS | no |
| Invite / `invites` | identity | 24 / 24 / 24 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| Location / `locations` | organization and modules | 27 / 27 / 27 | PRESERVE_EXISTING_AND_ADD_MISSING_SUPPORTED_SCENARIOS | no |
| BranchDailyCloseRun / `branch_daily_close_runs` | sales POS and delivery | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| BranchDailyCloseSignOff / `branch_daily_close_sign_offs` | sales POS and delivery | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| Category / `categories` | reference data and inventory | 15 / 15 / 15 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| Brand / `brands` | reference data and inventory | 15 / 15 / 15 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| Unit / `units` | reference data and inventory | 14 / 22 / 22 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| TaxRate / `tax_rates` | reference data and inventory | 4 / 4 / 4 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| Item / `items` | reference data and inventory | 41 / 41 / 41 | PRESERVE_EXISTING_AND_ADD_MISSING_SUPPORTED_SCENARIOS | no |
| InventoryLevel / `inventory_levels` | reference data and inventory | 540 / 541 / 541 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| InventoryTransaction / `inventory_transactions` | reference data and inventory | 94 / 709 / 709 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| SerialNumber / `serial_numbers` | reference data and inventory | 24 / 5106 / 5106 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| Supplier / `suppliers` | purchasing and AP | 24 / 24 / 24 | PRESERVE_EXISTING_AND_ADD_MISSING_SUPPORTED_SCENARIOS | no |
| ItemSupplier / `item_suppliers` | reference data and inventory | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| Customer / `customers` | customer receivables and external access | 26 / 26 / 26 | PRESERVE_EXISTING_AND_ADD_MISSING_SUPPORTED_SCENARIOS | no |
| CustomerLocation / `customer_locations` | customer receivables and external access | 0 / 29 / 29 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| OnboardingImportMapping / `onboarding_import_mappings` | master data onboarding | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| OnboardingImportBatch / `onboarding_import_batches` | master data onboarding | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| OnboardingImportRow / `onboarding_import_rows` | master data onboarding | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| OnboardingImportIssue / `onboarding_import_issues` | master data onboarding | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| OnboardingReadinessMilestone / `onboarding_readiness_milestones` | master data onboarding | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| PurchaseOrder / `purchase_orders` | purchasing and AP | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| PurchaseOrderLine / `purchase_order_lines` | purchasing and AP | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| SupplierPoEnvelope / `supplier_po_envelopes` | purchasing and AP | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| SupplierPoAccessToken / `supplier_po_access_tokens` | purchasing and AP | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| SupplierPoAccessLog / `supplier_po_access_logs` | purchasing and AP | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| SupplierPoProposal / `supplier_po_proposals` | purchasing and AP | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| SupplierPoProposalLine / `supplier_po_proposal_lines` | purchasing and AP | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| SupplierPoProposalState / `supplier_po_proposal_states` | purchasing and AP | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| GoodsReceipt / `goods_receipts` | purchasing and AP | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| DocumentSequence / `document_sequences` | accounting and close | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| GoodsReceiptLine / `goods_receipt_lines` | purchasing and AP | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| GoodsReceiptInspection / `goods_receipt_inspections` | purchasing and AP | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| GoodsReceiptInspectionResolution / `goods_receipt_inspection_resolutions` | purchasing and AP | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| SupplierBankAccount / `supplier_bank_accounts` | purchasing and AP | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| SupplierBankChangeRequest / `supplier_bank_change_requests` | purchasing and AP | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| SupplierInvoice / `supplier_invoices` | purchasing and AP | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| SupplierInvoiceLine / `supplier_invoice_lines` | purchasing and AP | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| ThreeWayMatch / `three_way_matches` | purchasing and AP | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| SupplierInvoiceMatchException / `supplier_invoice_match_exceptions` | purchasing and AP | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| SupplierPayment / `supplier_payments` | purchasing and AP | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| SupplierPaymentAllocation / `supplier_payment_allocations` | purchasing and AP | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PurchaseReturn / `purchase_returns` | purchasing and AP | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| PurchaseReturnLine / `purchase_return_lines` | purchasing and AP | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| SupplierCreditNote / `supplier_credit_notes` | purchasing and AP | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| SupplierCreditNoteLine / `supplier_credit_note_lines` | purchasing and AP | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| PayrollEmployee / `payroll_employees` | HRIS and payroll | 118 / 144 / 144 | PRESERVE_EXISTING_AND_ADD_MISSING_SUPPORTED_SCENARIOS | YES: review semantics |
| HrisOrgUnit / `hris_org_units` | HRIS and payroll | 14 / 14 / 14 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| HrisPosition / `hris_positions` | HRIS and payroll | 94 / 94 / 94 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| HrisEmploymentAssignment / `hris_employment_assignments` | HRIS and payroll | 94 / 94 / 94 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| HrisReportingRelationship / `hris_reporting_relationships` | HRIS and payroll | 92 / 92 / 92 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| HrisManagerDelegation / `hris_manager_delegations` | HRIS and payroll | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| PayrollContract / `payroll_contracts` | HRIS and payroll | 118 / 118 / 118 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PayrollRubrique / `payroll_rubriques` | HRIS and payroll | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PayrollEmployeeRubriqueAssignment / `payroll_employee_rubrique_assignments` | HRIS and payroll | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PayrollSalaryChangeRequest / `payroll_salary_change_requests` | HRIS and payroll | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PayrollPaymentDestinationChangeRequest / `payroll_payment_destination_change_requests` | HRIS and payroll | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PayrollPeriod / `payroll_periods` | HRIS and payroll | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PayrollAttendanceSnapshot / `payroll_attendance_snapshots` | HRIS and payroll | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| HrisWorkCalendar / `hris_work_calendars` | HRIS and payroll | 2 / 4 / 4 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| HrisPublicHoliday / `hris_public_holidays` | HRIS and payroll | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| HrisWorkSchedule / `hris_work_schedules` | HRIS and payroll | 94 / 94 / 94 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| HrisLeavePolicy / `hris_leave_policies` | HRIS and payroll | 0 / 2 / 2 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| HrisLeaveBalanceEntry / `hris_leave_balance_entries` | HRIS and payroll | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| HrisTimeRequest / `hris_time_requests` | HRIS and payroll | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| HrisTimeImportBatch / `hris_time_import_batches` | HRIS and payroll | 0 / 2 / 2 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| HrisTimeEntry / `hris_time_entries` | HRIS and payroll | 0 / 120 / 120 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| HrisAttendanceAnomaly / `hris_attendance_anomalies` | HRIS and payroll | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| PayrollRun / `payroll_runs` | HRIS and payroll | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PayrollRunTransition / `payroll_run_transitions` | HRIS and payroll | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| PayrollRunLine / `payroll_run_lines` | HRIS and payroll | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PayrollPayslip / `payroll_payslips` | HRIS and payroll | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PayrollPayslipLine / `payroll_payslip_lines` | HRIS and payroll | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PayrollDeclaration / `payroll_declarations` | HRIS and payroll | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PayrollDeclarationEvidence / `payroll_declaration_evidence` | HRIS and payroll | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PayrollPaymentBatch / `payroll_payment_batches` | HRIS and payroll | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PayrollPaymentAllocation / `payroll_payment_allocations` | HRIS and payroll | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PayrollEmployeeBalanceCase / `payroll_employee_balance_cases` | HRIS and payroll | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| PayrollEmployeeBalanceEvent / `payroll_employee_balance_events` | HRIS and payroll | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| SalesOrder / `sales_orders` | sales POS and delivery | 34 / 34 / 34 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| PublicReceiptAccessToken / `public_receipt_access_tokens` | sales POS and delivery | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| SalesOrderLine / `sales_order_lines` | sales POS and delivery | 56 / 56 / 56 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| DeliveryReservation / `delivery_reservations` | sales POS and delivery | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| DeliveryReservationLine / `delivery_reservation_lines` | sales POS and delivery | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| DeliveryGoodsIssue / `delivery_goods_issues` | sales POS and delivery | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| DeliveryGoodsIssueLine / `delivery_goods_issue_lines` | sales POS and delivery | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| DeliveryBillingOutcome / `delivery_billing_outcomes` | sales POS and delivery | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| DeliveryBillingLine / `delivery_billing_lines` | sales POS and delivery | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| DailySalesReport / `daily_sales_reports` | sales POS and delivery | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| DailySalesReportItem / `daily_sales_report_items` | sales POS and delivery | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| DailySalesReportCashEvent / `daily_sales_report_cash_events` | sales POS and delivery | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| StockAdjustment / `stock_adjustments` | reference data and inventory | 24 / 119 / 119 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| StockAdjustmentLine / `stock_adjustment_lines` | reference data and inventory | 24 / 119 / 119 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| StockCountSession / `stock_count_sessions` | reference data and inventory | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| StockCountLine / `stock_count_lines` | reference data and inventory | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| StockTransfer / `stock_transfers` | reference data and inventory | 25 / 25 / 25 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| StockTransferLine / `stock_transfer_lines` | reference data and inventory | 26 / 26 / 26 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| POSStation / `pos_terminals` | sales POS and delivery | 25 / 25 / 25 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| POSSession / `pos_sessions` | sales POS and delivery | 31 / 31 / 31 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| POSCheckoutWorkspace / `pos_checkout_workspaces` | sales POS and delivery | 5 / 5 / 5 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| POSCommitResult / `pos_commit_results` | sales POS and delivery | 6 / 6 / 6 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| CashDrawer / `cash_drawers` | sales POS and delivery | 25 / 25 / 25 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| CashDrawerTransaction / `cash_drawer_transactions` | sales POS and delivery | 41 / 41 / 41 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| POSOfflineDevice / `pos_offline_devices` | sales POS and delivery | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| POSOfflineSyncBatch / `pos_offline_sync_batches` | sales POS and delivery | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| POSOfflineEvent / `pos_offline_events` | sales POS and delivery | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| POSOfflineSyncConflict / `pos_offline_sync_conflicts` | sales POS and delivery | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| POSOfflineSyncCertificate / `pos_offline_sync_certificates` | sales POS and delivery | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| Payment / `payments` | payments and reconciliation | 30 / 30 / 30 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| PaymentRefund / `payment_refunds` | payments and reconciliation | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| PaymentRail / `payment_rails` | payments and reconciliation | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| ProviderAccount / `provider_accounts` | payments and reconciliation | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| SettlementAccount / `settlement_accounts` | payments and reconciliation | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| ProviderEvent / `provider_events` | payments and reconciliation | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| StatementFile / `statement_files` | payments and reconciliation | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| StatementLine / `statement_lines` | payments and reconciliation | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PaymentTransaction / `payment_transactions` | payments and reconciliation | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| MatchRecord / `match_records` | payments and reconciliation | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| SuspenseItem / `suspense_items` | payments and reconciliation | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| ReconciliationRun / `reconciliation_runs` | payments and reconciliation | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PaymentException / `payment_exceptions` | payments and reconciliation | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PaymentReconciliationInboxItem / `payment_reconciliation_inbox_items` | payments and reconciliation | 25 / 25 / 25 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| ExpenseCategory / `expense_categories` | accounting and close | 14 / 14 / 14 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| Expense / `expenses` | accounting and close | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| CustomerLedgerEntry / `customer_ledger_entries` | customer receivables and external access | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| CustomerReceivableDocument / `customer_receivable_documents` | customer receivables and external access | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| CustomerReceivableDocumentState / `customer_receivable_document_states` | customer receivables and external access | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| CustomerStatementSnapshot / `customer_statement_snapshots` | customer receivables and external access | 2 / 2 / 2 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| CustomerStatementAccessToken / `customer_statement_access_tokens` | customer receivables and external access | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| CustomerStatementAccessLog / `customer_statement_access_logs` | customer receivables and external access | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| CustomerStatementRecipientAction / `customer_statement_recipient_actions` | customer receivables and external access | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| CustomerStatementRecipientActionState / `customer_statement_recipient_action_states` | customer receivables and external access | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| ReferralAttribution / `referral_attributions` | customer receivables and external access | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| ReferralAttributionEvent / `referral_attribution_events` | customer receivables and external access | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| AccountantClientInvite / `accountant_client_invites` | customer receivables and external access | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| AccountantClientInviteState / `accountant_client_invite_states` | customer receivables and external access | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| CustomerStatementDelivery / `customer_statement_deliveries` | customer receivables and external access | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| CustomerStatementDeliveryState / `customer_statement_delivery_states` | customer receivables and external access | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| CustomerSettlement / `customer_settlements` | customer receivables and external access | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| CustomerSettlementAllocation / `customer_settlement_allocations` | customer receivables and external access | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| SupplierLedgerEntry / `supplier_ledger_entries` | purchasing and AP | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| OrganizationAccountingSettings / `organization_accounting_settings` | organization and modules | 2 / 2 / 2 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| FiscalYear / `fiscal_years` | accounting and close | 2 / 2 / 2 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| AccountingPeriod / `accounting_periods` | accounting and close | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| CloseRun / `close_runs` | accounting and close | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| CloseChecklistItem / `close_checklist_items` | accounting and close | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| CloseAssuranceFinding / `close_assurance_findings` | accounting and close | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| CloseEvidenceItem / `close_evidence_items` | accounting and close | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| ClosePackExport / `close_pack_exports` | accounting and close | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| AccountantReview / `accountant_reviews` | accounting and close | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| AccountantComment / `accountant_comments` | accounting and close | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| AccountantAccessGrant / `accountant_access_grants` | accounting and close | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| ChartOfAccount / `chart_of_accounts` | accounting and close | 36 / 36 / 36 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| Journal / `journals` | accounting and close | 16 / 16 / 16 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| JournalEntry / `journal_entries` | accounting and close | 44 / 143 / 141 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| JournalEntryLine / `journal_entry_lines` | accounting and close | 174 / 372 / 368 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| LedgerPostingBatch / `ledger_posting_batches` | accounting and close | 36 / 135 / 133 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| AccountingSourceLink / `accounting_source_links` | accounting and close | 36 / 135 / 133 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| PostingRule / `posting_rules` | accounting and close | 30 / 32 / 32 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| PostingRuleLine / `posting_rule_lines` | accounting and close | 152 / 156 / 156 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| LedgerAuditEvent / `ledger_audit_events` | accounting and close | 50 / 151 / 149 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| BusinessEvent / `business_events` | business events and workflow assurance | 46 / 665 / 663 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| BusinessEventOutbox / `business_event_outbox` | business events and workflow assurance | 46 / 143 / 143 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| BusinessEventAudit / `business_event_audits` | business events and workflow assurance | 38 / 1276 / 1272 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| BusinessEventAnomaly / `business_event_anomalies` | business events and workflow assurance | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| FiscalDocument / `fiscal_documents` | fiscal compliance | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| FiscalDocumentLine / `fiscal_document_lines` | fiscal compliance | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| FiscalSequence / `fiscal_sequences` | fiscal compliance | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| ComplianceSubmission / `compliance_submissions` | fiscal compliance | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| ComplianceAdapterConfig / `compliance_adapter_configs` | fiscal compliance | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| ComplianceEvidence / `compliance_evidence` | fiscal compliance | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| WorkflowAssuranceCheckDefinition / `workflow_assurance_check_definitions` | business events and workflow assurance | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| WorkflowAssuranceCheckRun / `workflow_assurance_check_runs` | business events and workflow assurance | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| WorkflowAssuranceCheckFinding / `workflow_assurance_check_findings` | business events and workflow assurance | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| WorkflowAssuranceIncident / `workflow_assurance_incidents` | business events and workflow assurance | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| WorkflowAssuranceIncidentEvent / `workflow_assurance_incident_events` | business events and workflow assurance | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| WorkflowAssuranceAlertDelivery / `workflow_assurance_alert_deliveries` | business events and workflow assurance | 24 / 24 / 24 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | YES: review semantics |
| PosCashShortageWorkerCheckpoint / `pos_cash_shortage_worker_checkpoints` | business events and workflow assurance | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| WorkflowAssuranceWaiver / `workflow_assurance_waivers` | business events and workflow assurance | 24 / 24 / 24 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | YES: review semantics |
| TenantModuleConfiguration / `tenant_module_configurations` | organization and modules | 0 / 2 / 2 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| TenantModuleGrant / `tenant_module_grants` | organization and modules | 0 / 22 / 22 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| TenantModuleConfigurationCommand / `tenant_module_configuration_commands` | organization and modules | 0 / 2 / 2 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| TenantModuleLifecycleOperation / `tenant_module_lifecycle_operations` | organization and modules | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| TenantModuleLifecycleStep / `tenant_module_lifecycle_steps` | organization and modules | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| TenantModuleLifecycleEvent / `tenant_module_lifecycle_events` | organization and modules | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| AuditLog / `audit_logs` | business events and workflow assurance | 9990 / 10176 / 10161 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| PublicIdentityAbuseBucket / `public_identity_abuse_buckets` | identity | 2 / 2 / 2 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| PasswordHistory / `password_history` | identity | 29 / 29 / 29 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| CashShortagePolicy / `cash_shortage_policies` | sales POS and delivery | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| AgentDefinition / `agent_definitions` | AI governance | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| AgentSkillDefinition / `agent_skill_definitions` | AI governance | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| AgentToolDefinition / `agent_tool_definitions` | AI governance | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| AgentRun / `agent_runs` | AI governance | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| AgentStep / `agent_steps` | AI governance | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| AgentEvidenceLink / `agent_evidence_links` | AI governance | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| AgentFeedback / `agent_feedback` | AI governance | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| AgentCostLedger / `agent_cost_ledger` | AI governance | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| AgentPolicyIncident / `agent_policy_incidents` | AI governance | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| AiActionProposal / `ai_action_proposals` | AI governance | 0 / 0 / 0 | POPULATE_WITH_DOMAIN_SCENARIOS; DO_NOT_GENERATE_COUNT_ONLY_ROWS | no |
| AgentReconcilerInvocation / `agent_reconciler_invocations` | AI governance | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| AgentActivationPackage / `agent_activation_packages` | AI governance | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| AgentActivationApproval / `agent_activation_approvals` | AI governance | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| AgentActivationOwner / `agent_activation_owners` | AI governance | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
| AgentPilotCertification / `agent_pilot_certifications` | AI governance | 0 / 0 / 0 | PRESERVE_EXISTING; EMPTY_ALLOWED_UNTIL_AUTHENTIC_LOCAL_WORKFLOW_CREATES_RECORD | no |
