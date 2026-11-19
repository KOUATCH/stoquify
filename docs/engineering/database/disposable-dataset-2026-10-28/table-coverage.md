# Table coverage — current execution evidence

Nonzero counts do not certify every workflow. The original 131 pending tables have explicit scenario or prerequisite dispositions in [the detailed assessment](remaining-table-assessment.json).

| Table | Model | Rows | Disposition | Dependencies |
|---|---|---:|---|---|
| _UserRoles | (SQL/join) | 38 | POPULATED_REQUIRES_SCENARIO_VALIDATION | roles, users |
| _prisma_migrations | (SQL/join) | 120 | SYSTEM_MANAGED |  |
| access_requests | AccessRequest | 3 | POPULATED_SCENARIO_VERIFIED | users |
| accountant_access_grants | AccountantAccessGrant | 8 | POPULATED_SCENARIO_VERIFIED | organizations |
| accountant_client_invite_states | AccountantClientInviteState | 3 | POPULATED_SCENARIO_VERIFIED | accountant_client_invites, organizations |
| accountant_client_invites | AccountantClientInvite | 3 | POPULATED_SCENARIO_VERIFIED | business_event_outbox, business_events, organizations, referral_attributions |
| accountant_comments | AccountantComment | 23 | POPULATED_SCENARIO_VERIFIED | accountant_reviews, accounting_periods, close_assurance_findings, close_evidence_items, close_runs, organizations |
| accountant_reviews | AccountantReview | 15 | POPULATED_SCENARIO_VERIFIED | accounting_periods, close_runs, organizations |
| accounting_periods | AccountingPeriod | 86 | POPULATED_REQUIRES_SCENARIO_VALIDATION | fiscal_years, organizations |
| accounting_source_links | AccountingSourceLink | 1421 | POPULATED_REQUIRES_SCENARIO_VALIDATION | journal_entries, ledger_posting_batches, organizations |
| accounts | Account | 38 | POPULATED_REQUIRES_SCENARIO_VALIDATION | users |
| agent_activation_approvals | AgentActivationApproval | 12 | POPULATED_SCENARIO_VERIFIED | agent_activation_packages |
| agent_activation_owners | AgentActivationOwner | 18 | POPULATED_SCENARIO_VERIFIED | agent_activation_packages |
| agent_activation_packages | AgentActivationPackage | 6 | POPULATED_SCENARIO_VERIFIED | organizations |
| agent_cost_ledger | AgentCostLedger | 6 | POPULATED_SCENARIO_VERIFIED | agent_runs, organizations |
| agent_definitions | AgentDefinition | 2 | POPULATED_SCENARIO_VERIFIED |  |
| agent_evidence_links | AgentEvidenceLink | 33 | POPULATED_SCENARIO_VERIFIED | agent_runs, agent_steps |
| agent_feedback | AgentFeedback | 3 | POPULATED_SCENARIO_VERIFIED | agent_runs, organizations |
| agent_pilot_certifications | AgentPilotCertification | 3 | POPULATED_SCENARIO_VERIFIED | agent_activation_packages |
| agent_policy_incidents | AgentPolicyIncident | 3 | POPULATED_SCENARIO_VERIFIED | agent_runs, organizations |
| agent_reconciler_invocations | AgentReconcilerInvocation | 6 | POPULATED_SCENARIO_VERIFIED |  |
| agent_runs | AgentRun | 9 | POPULATED_SCENARIO_VERIFIED | agent_definitions, organizations |
| agent_skill_definitions | AgentSkillDefinition | 2 | POPULATED_SCENARIO_VERIFIED |  |
| agent_steps | AgentStep | 18 | POPULATED_SCENARIO_VERIFIED | agent_runs |
| agent_tool_definitions | AgentToolDefinition | 2 | POPULATED_SCENARIO_VERIFIED |  |
| ai_action_proposals | AiActionProposal | 3 | POPULATED_SCENARIO_VERIFIED | agent_runs, organizations |
| audit_logs | AuditLog | 9344 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, users |
| balance_sheet_evidence | BalanceSheetEvidence | 50 | POPULATED_SCENARIO_VERIFIED | accounting_periods, chart_of_accounts |
| bank_balance_evidence | BankBalanceEvidence | 1 | POPULATED_SCENARIO_VERIFIED | accounting_periods, provider_accounts, statement_files |
| branch_daily_close_runs | BranchDailyCloseRun | 4 | POPULATED_SCENARIO_VERIFIED | locations, organizations, users |
| branch_daily_close_sign_offs | BranchDailyCloseSignOff | 1 | POPULATED_SCENARIO_VERIFIED | branch_daily_close_runs, branch_daily_close_sign_offs, organizations, users |
| brands | Brand | 9 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| business_event_anomalies | BusinessEventAnomaly | 3 | POPULATED_SCENARIO_VERIFIED | business_events, organizations |
| business_event_audits | BusinessEventAudit | 7523 | POPULATED_REQUIRES_SCENARIO_VALIDATION | business_events, organizations |
| business_event_outbox | BusinessEventOutbox | 4965 | POPULATED_REQUIRES_SCENARIO_VALIDATION | business_events, organizations |
| business_events | BusinessEvent | 4071 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| cash_drawer_transactions | CashDrawerTransaction | 636 | POPULATED_REQUIRES_SCENARIO_VALIDATION | cash_drawers, pos_sessions, users |
| cash_drawers | CashDrawer | 84 | POPULATED_REQUIRES_SCENARIO_VALIDATION | locations, pos_terminals |
| cash_shortage_policies | CashShortagePolicy | 3 | POPULATED_SCENARIO_VERIFIED | organizations, users |
| categories | Category | 9 | POPULATED_REQUIRES_SCENARIO_VALIDATION | categories, organizations |
| chart_of_accounts | ChartOfAccount | 107 | POPULATED_REQUIRES_SCENARIO_VALIDATION | chart_of_accounts, organizations |
| close_assurance_findings | CloseAssuranceFinding | 236 | POPULATED_SCENARIO_VERIFIED | accounting_periods, close_checklist_items, close_runs, organizations |
| close_checklist_items | CloseChecklistItem | 130 | POPULATED_SCENARIO_VERIFIED | accounting_periods, close_runs, organizations |
| close_evidence_items | CloseEvidenceItem | 576 | POPULATED_SCENARIO_VERIFIED | accounting_periods, close_assurance_findings, close_checklist_items, close_runs, organizations |
| close_evidence_notifications | CloseEvidenceNotification | 9 | POPULATED_SCENARIO_VERIFIED | business_event_outbox |
| close_pack_exports | ClosePackExport | 13 | POPULATED_SCENARIO_VERIFIED | accounting_periods, close_runs, organizations |
| close_runs | CloseRun | 13 | POPULATED_SCENARIO_VERIFIED | accounting_periods, organizations |
| close_source_changes | CloseSourceChange | 26781 | POPULATED_REQUIRES_SCENARIO_VALIDATION |  |
| close_source_revisions | CloseSourceRevision | 5 | POPULATED_REQUIRES_SCENARIO_VALIDATION |  |
| command_center_events | CommandCenterEvent | 6 | POPULATED_SCENARIO_VERIFIED | command_center_occurrences, organizations |
| command_center_notices | CommandCenterNotice | 3 | POPULATED_SCENARIO_VERIFIED | command_center_occurrences, organizations |
| command_center_occurrences | CommandCenterOccurrence | 3 | POPULATED_SCENARIO_VERIFIED | organizations |
| command_center_preferences | CommandCenterPreference | 3 | POPULATED_SCENARIO_VERIFIED | organizations |
| command_center_review_receipts | CommandCenterReviewReceipt | 3 | POPULATED_SCENARIO_VERIFIED | command_center_review_states, organizations |
| command_center_review_states | CommandCenterReviewState | 3 | POPULATED_SCENARIO_VERIFIED | organizations |
| compliance_adapter_configs | ComplianceAdapterConfig | 3 | POPULATED_SCENARIO_VERIFIED | organizations |
| compliance_evidence | ComplianceEvidence | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | compliance_submissions, fiscal_documents, organizations |
| compliance_submissions | ComplianceSubmission | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | compliance_adapter_configs, fiscal_documents, organizations |
| customer_ledger_entries | CustomerLedgerEntry | 15 | POPULATED_REQUIRES_SCENARIO_VALIDATION | customers, organizations |
| customer_locations | CustomerLocation | 72 | POPULATED_REQUIRES_SCENARIO_VALIDATION | customers, locations, organizations |
| customer_receivable_document_states | CustomerReceivableDocumentState | 15 | POPULATED_REQUIRES_SCENARIO_VALIDATION | customer_receivable_documents, organizations |
| customer_receivable_documents | CustomerReceivableDocument | 9 | POPULATED_REQUIRES_SCENARIO_VALIDATION | customer_receivable_documents, customers, financial_opening_revisions, organizations, sales_orders |
| customer_settlement_allocations | CustomerSettlementAllocation | 6 | POPULATED_REQUIRES_SCENARIO_VALIDATION | customer_ledger_entries, customer_receivable_documents, customer_settlements, organizations, sales_orders |
| customer_settlements | CustomerSettlement | 6 | POPULATED_REQUIRES_SCENARIO_VALIDATION | customers, organizations |
| customer_statement_access_logs | CustomerStatementAccessLog | 30 | POPULATED_SCENARIO_VERIFIED | customer_statement_access_tokens, customer_statement_snapshots, organizations |
| customer_statement_access_tokens | CustomerStatementAccessToken | 3 | POPULATED_SCENARIO_VERIFIED | customer_statement_snapshots, organizations, referral_attributions |
| customer_statement_deliveries | CustomerStatementDelivery | 3 | POPULATED_SCENARIO_VERIFIED | business_event_outbox, business_events, customer_statement_access_tokens, customer_statement_snapshots, organizations, referral_attributions |
| customer_statement_delivery_states | CustomerStatementDeliveryState | 3 | POPULATED_SCENARIO_VERIFIED | customer_statement_deliveries, organizations |
| customer_statement_recipient_action_states | CustomerStatementRecipientActionState | 3 | POPULATED_SCENARIO_VERIFIED | customer_statement_recipient_actions, organizations |
| customer_statement_recipient_actions | CustomerStatementRecipientAction | 3 | POPULATED_SCENARIO_VERIFIED | customer_receivable_documents, customer_statement_access_tokens, customer_statement_snapshots, organizations |
| customer_statement_snapshots | CustomerStatementSnapshot | 3 | POPULATED_SCENARIO_VERIFIED | customer_statement_snapshots, customers, organizations |
| customers | Customer | 39 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| daily_sales_report_cash_events | DailySalesReportCashEvent | 576 | POPULATED_SCENARIO_VERIFIED | daily_sales_reports |
| daily_sales_report_items | DailySalesReportItem | 864 | POPULATED_SCENARIO_VERIFIED | daily_sales_reports, items |
| daily_sales_reports | DailySalesReport | 72 | POPULATED_SCENARIO_VERIFIED | locations, organizations, users |
| delivery_billing_lines | DeliveryBillingLine | 6 | POPULATED_REQUIRES_SCENARIO_VALIDATION | delivery_billing_outcomes, sales_order_lines |
| delivery_billing_outcomes | DeliveryBillingOutcome | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | sales_orders |
| delivery_goods_issue_lines | DeliveryGoodsIssueLine | 6 | POPULATED_REQUIRES_SCENARIO_VALIDATION | delivery_goods_issues, sales_order_lines |
| delivery_goods_issues | DeliveryGoodsIssue | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | delivery_goods_issues, sales_orders |
| delivery_reservation_lines | DeliveryReservationLine | 6 | POPULATED_REQUIRES_SCENARIO_VALIDATION | delivery_reservations, sales_order_lines |
| delivery_reservations | DeliveryReservation | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | sales_orders |
| document_sequences | DocumentSequence | 9 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| expense_categories | ExpenseCategory | 6 | POPULATED_SCENARIO_VERIFIED | organizations |
| expenses | Expense | 216 | POPULATED_SCENARIO_VERIFIED | expense_categories, locations, organizations, suppliers, users |
| financial_opening_executions | FinancialOpeningExecution | 1 | POPULATED_SCENARIO_VERIFIED | financial_opening_revisions, organizations |
| financial_opening_operations | FinancialOpeningOperation | 1 | POPULATED_SCENARIO_VERIFIED | financial_opening_executions |
| financial_opening_revisions | FinancialOpeningRevision | 1 | POPULATED_SCENARIO_VERIFIED | organizations |
| firm_advisory_revisions | FirmAdvisoryRevision | 4 | POPULATED_SCENARIO_VERIFIED | accounting_periods, firm_engagements, users |
| firm_engagement_assignments | FirmEngagementAssignment | 8 | POPULATED_SCENARIO_VERIFIED | firm_engagements, users |
| firm_engagement_grant_links | FirmEngagementGrantLink | 8 | POPULATED_SCENARIO_VERIFIED | accountant_access_grants, firm_engagements, users |
| firm_engagement_transitions | FirmEngagementTransition | 4 | POPULATED_SCENARIO_VERIFIED | firm_engagements, users |
| firm_engagements | FirmEngagement | 4 | POPULATED_SCENARIO_VERIFIED | organizations, users |
| firm_obligation_revisions | FirmObligationRevision | 3 | POPULATED_SCENARIO_VERIFIED | accounting_periods, organizations |
| firm_practice_revisions | FirmPracticeRevision | 9 | POPULATED_SCENARIO_VERIFIED | accounting_periods, firm_engagements, users |
| fiscal_document_lines | FiscalDocumentLine | 6 | POPULATED_REQUIRES_SCENARIO_VALIDATION | fiscal_documents, organizations |
| fiscal_documents | FiscalDocument | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | accounting_source_links, fiscal_documents, fiscal_sequences, journal_entries, ledger_posting_batches, organizations |
| fiscal_sequences | FiscalSequence | 3 | POPULATED_SCENARIO_VERIFIED | organizations |
| fiscal_years | FiscalYear | 8 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| goods_receipt_inspection_resolutions | GoodsReceiptInspectionResolution | 3 | POPULATED_SCENARIO_VERIFIED | goods_receipt_inspections, goods_receipts, organizations, users |
| goods_receipt_inspections | GoodsReceiptInspection | 120 | POPULATED_REQUIRES_SCENARIO_VALIDATION | goods_receipts, organizations, users |
| goods_receipt_lines | GoodsReceiptLine | 1407 | POPULATED_REQUIRES_SCENARIO_VALIDATION | goods_receipts, items, purchase_order_lines |
| goods_receipts | GoodsReceipt | 120 | POPULATED_REQUIRES_SCENARIO_VALIDATION | locations, organizations, purchase_orders, users |
| hris_attendance_anomalies | HrisAttendanceAnomaly | 3 | POPULATED_SCENARIO_VERIFIED | hris_time_entries, hris_time_import_batches, organizations, payroll_employees |
| hris_employee_documents | HrisEmployeeDocument | 3 | POPULATED_SCENARIO_VERIFIED | hris_employee_documents, payroll_employees |
| hris_employment_assignments | HrisEmploymentAssignment | 36 | POPULATED_REQUIRES_SCENARIO_VALIDATION | hris_org_units, hris_positions, organizations, payroll_employees |
| hris_leave_balance_entries | HrisLeaveBalanceEntry | 39 | POPULATED_REQUIRES_SCENARIO_VALIDATION | hris_leave_policies, organizations, payroll_employees |
| hris_leave_policies | HrisLeavePolicy | 6 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| hris_lifecycle_tasks | HrisLifecycleTask | 12 | POPULATED_SCENARIO_VERIFIED | payroll_employees |
| hris_manager_delegations | HrisManagerDelegation | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | hris_manager_delegations, hris_org_units, organizations, payroll_employees |
| hris_org_units | HrisOrgUnit | 15 | POPULATED_REQUIRES_SCENARIO_VALIDATION | hris_org_units, organizations |
| hris_payroll_handoff_packages | HrisPayrollHandoffPackage | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | hris_payroll_handoff_packages, organizations, payroll_periods |
| hris_payroll_handoff_receipts | HrisPayrollHandoffReceipt | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | hris_payroll_handoff_packages, organizations |
| hris_personal_correction_cases | HrisPersonalCorrectionCase | 3 | POPULATED_SCENARIO_VERIFIED | payroll_employees |
| hris_positions | HrisPosition | 18 | POPULATED_REQUIRES_SCENARIO_VALIDATION | hris_org_units, locations, organizations |
| hris_public_holidays | HrisPublicHoliday | 3 | POPULATED_SCENARIO_VERIFIED | hris_work_calendars, organizations |
| hris_reporting_relationships | HrisReportingRelationship | 33 | POPULATED_REQUIRES_SCENARIO_VALIDATION | hris_employment_assignments, hris_reporting_relationships, organizations, payroll_employees |
| hris_setup_reviewer_grants | HrisSetupReviewerGrant | 3 | POPULATED_SCENARIO_VERIFIED | organizations, payroll_employees, users |
| hris_time_entries | HrisTimeEntry | 13035 | POPULATED_REQUIRES_SCENARIO_VALIDATION | hris_time_import_batches, organizations, payroll_employees |
| hris_time_import_batches | HrisTimeImportBatch | 39 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| hris_time_requests | HrisTimeRequest | 12 | POPULATED_REQUIRES_SCENARIO_VALIDATION | business_events, hris_leave_policies, organizations, payroll_employees |
| hris_work_calendars | HrisWorkCalendar | 6 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| hris_work_schedules | HrisWorkSchedule | 36 | POPULATED_REQUIRES_SCENARIO_VALIDATION | hris_work_calendars, hris_work_schedules, organizations, payroll_employees |
| inventory_levels | InventoryLevel | 111 | POPULATED_REQUIRES_SCENARIO_VALIDATION | items, locations |
| inventory_transactions | InventoryTransaction | 2853 | POPULATED_REQUIRES_SCENARIO_VALIDATION | inventory_transactions, items, locations, organizations, users |
| invites | Invite | 3 | POPULATED_SCENARIO_VERIFIED | organizations, roles |
| item_suppliers | ItemSupplier | 72 | POPULATED_REQUIRES_SCENARIO_VALIDATION | items, suppliers |
| items | Item | 39 | POPULATED_REQUIRES_SCENARIO_VALIDATION | brands, categories, organizations, tax_rates, units |
| journal_entries | JournalEntry | 1421 | POPULATED_REQUIRES_SCENARIO_VALIDATION | accounting_periods, journal_entries, journals, ledger_posting_batches, organizations |
| journal_entry_lines | JournalEntryLine | 3802 | POPULATED_REQUIRES_SCENARIO_VALIDATION | chart_of_accounts, journal_entries, organizations |
| journals | Journal | 40 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| ledger_audit_events | LedgerAuditEvent | 4292 | POPULATED_REQUIRES_SCENARIO_VALIDATION | journal_entries, ledger_posting_batches, organizations |
| ledger_posting_batches | LedgerPostingBatch | 1421 | POPULATED_REQUIRES_SCENARIO_VALIDATION | accounting_periods, organizations |
| legacy_production_batches | (SQL/join) | 0 | INTENTIONALLY_EMPTY | legacy_recipes, locations, organizations, users |
| legacy_recipe_ingredients | (SQL/join) | 0 | INTENTIONALLY_EMPTY | items, legacy_recipes |
| legacy_recipes | (SQL/join) | 0 | INTENTIONALLY_EMPTY | items, organizations |
| locations | Location | 10 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, users |
| match_records | MatchRecord | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | ledger_posting_batches, organizations, payment_transactions, provider_accounts, provider_events, reconciliation_runs, statement_lines, users |
| onboarding_import_batches | OnboardingImportBatch | 6 | POPULATED_SCENARIO_VERIFIED | onboarding_import_mappings, organizations |
| onboarding_import_issues | OnboardingImportIssue | 3 | POPULATED_SCENARIO_VERIFIED | onboarding_import_batches, onboarding_import_rows, organizations |
| onboarding_import_mappings | OnboardingImportMapping | 3 | POPULATED_SCENARIO_VERIFIED | organizations |
| onboarding_import_rows | OnboardingImportRow | 6 | POPULATED_SCENARIO_VERIFIED | onboarding_import_batches, organizations |
| onboarding_readiness_milestones | OnboardingReadinessMilestone | 3 | POPULATED_SCENARIO_VERIFIED | organizations |
| organization_accounting_settings | OrganizationAccountingSettings | 5 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| organizations | Organization | 5 | POPULATED_REQUIRES_SCENARIO_VALIDATION |  |
| password_history | PasswordHistory | 0 | WORKFLOW_GENERATED | users |
| payment_exceptions | PaymentException | 8 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, payment_transactions, provider_accounts, provider_events, reconciliation_runs, statement_lines, suspense_items, users |
| payment_rails | PaymentRail | 4 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| payment_reconciliation_inbox_items | PaymentReconciliationInboxItem | 15 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, provider_accounts |
| payment_refunds | PaymentRefund | 3 | POPULATED_SCENARIO_VERIFIED | payments, users |
| payment_transactions | PaymentTransaction | 6 | POPULATED_REQUIRES_SCENARIO_VALIDATION | ledger_posting_batches, organizations, payments, provider_accounts, provider_events |
| payments | Payment | 477 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, purchase_orders, sales_orders, users |
| payroll_attendance_snapshots | PayrollAttendanceSnapshot | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | organizations, payroll_attendance_snapshots, payroll_employees, payroll_periods |
| payroll_contracts | PayrollContract | 36 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, payroll_employees |
| payroll_declaration_evidence | PayrollDeclarationEvidence | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | organizations, payroll_declarations |
| payroll_declarations | PayrollDeclaration | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | organizations, payroll_runs |
| payroll_employee_balance_cases | PayrollEmployeeBalanceCase | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | organizations, payroll_employees, payroll_payslips, payroll_runs |
| payroll_employee_balance_events | PayrollEmployeeBalanceEvent | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | organizations, payroll_employee_balance_cases |
| payroll_employee_rubrique_assignments | PayrollEmployeeRubriqueAssignment | 3 | POPULATED_SCENARIO_VERIFIED | organizations, payroll_employees, payroll_rubriques |
| payroll_employees | PayrollEmployee | 36 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| payroll_payment_allocations | PayrollPaymentAllocation | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | organizations, payroll_employees, payroll_payment_batches, payroll_payslips |
| payroll_payment_batches | PayrollPaymentBatch | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | organizations, payroll_runs |
| payroll_payment_destination_change_requests | PayrollPaymentDestinationChangeRequest | 36 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, payroll_employees |
| payroll_payslip_lines | PayrollPayslipLine | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | organizations, payroll_payslips |
| payroll_payslips | PayrollPayslip | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | business_events, organizations, payroll_employees, payroll_run_lines, payroll_runs |
| payroll_periods | PayrollPeriod | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | organizations |
| payroll_rubriques | PayrollRubrique | 3 | POPULATED_SCENARIO_VERIFIED | organizations |
| payroll_run_lines | PayrollRunLine | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | organizations, payroll_attendance_snapshots, payroll_contracts, payroll_employees, payroll_runs |
| payroll_run_transitions | PayrollRunTransition | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | business_events, organizations, payroll_runs |
| payroll_runs | PayrollRun | 0 | BLOCKED_SOURCE_CONFIRMED_PREREQUISITE | business_events, organizations, payroll_periods, payroll_runs |
| payroll_salary_change_requests | PayrollSalaryChangeRequest | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, payroll_contracts, payroll_employees |
| period_control_events | PeriodControlEvent | 1 | POPULATED_SCENARIO_VERIFIED | accounting_periods |
| picture_assets | PictureAsset | 6 | POPULATED_SCENARIO_VERIFIED |  |
| pos_cash_shortage_worker_checkpoints | PosCashShortageWorkerCheckpoint | 3 | POPULATED_SCENARIO_VERIFIED | organizations |
| pos_checkout_workspaces | POSCheckoutWorkspace | 84 | POPULATED_REQUIRES_SCENARIO_VALIDATION | pos_sessions |
| pos_commit_results | POSCommitResult | 477 | POPULATED_REQUIRES_SCENARIO_VALIDATION | locations, organizations, pos_sessions, pos_terminals, sales_orders, users |
| pos_offline_devices | POSOfflineDevice | 6 | POPULATED_SCENARIO_VERIFIED | locations, organizations, pos_terminals |
| pos_offline_events | POSOfflineEvent | 12 | POPULATED_SCENARIO_VERIFIED | business_events, locations, organizations, pos_offline_devices, pos_offline_sync_batches, pos_sessions, pos_terminals |
| pos_offline_sync_batches | POSOfflineSyncBatch | 12 | POPULATED_SCENARIO_VERIFIED | organizations, pos_offline_devices |
| pos_offline_sync_certificates | POSOfflineSyncCertificate | 6 | POPULATED_SCENARIO_VERIFIED | locations, organizations, pos_offline_devices, pos_terminals |
| pos_offline_sync_conflicts | POSOfflineSyncConflict | 9 | POPULATED_SCENARIO_VERIFIED | organizations, pos_offline_devices, pos_offline_events, pos_offline_sync_batches |
| pos_sessions | POSSession | 84 | POPULATED_REQUIRES_SCENARIO_VALIDATION | locations, pos_terminals, users |
| pos_terminals | POSStation | 87 | POPULATED_REQUIRES_SCENARIO_VALIDATION | locations, organizations, pos_sessions |
| posting_rule_lines | PostingRuleLine | 331 | POPULATED_REQUIRES_SCENARIO_VALIDATION | chart_of_accounts, organizations, posting_rules |
| posting_rules | PostingRule | 66 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| provider_accounts | ProviderAccount | 4 | POPULATED_REQUIRES_SCENARIO_VALIDATION | chart_of_accounts, organizations, payment_rails |
| provider_events | ProviderEvent | 1 | POPULATED_SCENARIO_VERIFIED | organizations, provider_accounts |
| public_identity_abuse_buckets | PublicIdentityAbuseBucket | 3 | POPULATED_SCENARIO_VERIFIED |  |
| public_receipt_access_tokens | PublicReceiptAccessToken | 3 | POPULATED_SCENARIO_VERIFIED | organizations, sales_orders |
| purchase_order_authoring_drafts | PurchaseOrderAuthoringDraft | 3 | POPULATED_SCENARIO_VERIFIED | purchase_orders, users |
| purchase_order_lines | PurchaseOrderLine | 1410 | POPULATED_REQUIRES_SCENARIO_VALIDATION | items, purchase_orders |
| purchase_orders | PurchaseOrder | 123 | POPULATED_REQUIRES_SCENARIO_VALIDATION | locations, organizations, suppliers, users |
| purchase_return_lines | PurchaseReturnLine | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | goods_receipt_lines, organizations, purchase_order_lines, purchase_returns |
| purchase_returns | PurchaseReturn | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | goods_receipts, organizations, purchase_orders, purchase_returns, suppliers |
| reconciliation_no_activity_evidence | ReconciliationNoActivityEvidence | 3 | POPULATED_SCENARIO_VERIFIED | accounting_periods, provider_accounts |
| reconciliation_runs | ReconciliationRun | 4 | POPULATED_REQUIRES_SCENARIO_VALIDATION | accounting_periods, organizations, payment_rails, provider_accounts, users |
| referral_attribution_events | ReferralAttributionEvent | 6 | POPULATED_SCENARIO_VERIFIED | organizations, referral_attributions |
| referral_attributions | ReferralAttribution | 6 | POPULATED_SCENARIO_VERIFIED | customer_statement_snapshots, organizations |
| roles | Role | 41 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| sales_order_lines | SalesOrderLine | 1419 | POPULATED_REQUIRES_SCENARIO_VALIDATION | items, sales_orders |
| sales_orders | SalesOrder | 480 | POPULATED_REQUIRES_SCENARIO_VALIDATION | customers, locations, organizations, pos_sessions, pos_terminals, users |
| serial_numbers | SerialNumber | 6 | POPULATED_SCENARIO_VERIFIED | items, locations, organizations |
| sessions | Session | 1907 | POPULATED_REQUIRES_SCENARIO_VALIDATION | users |
| settlement_accounts | SettlementAccount | 4 | POPULATED_REQUIRES_SCENARIO_VALIDATION | chart_of_accounts, organizations, provider_accounts |
| statement_files | StatementFile | 4 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, provider_accounts, users |
| statement_lines | StatementLine | 4 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, provider_accounts, statement_files |
| stock_adjustment_lines | StockAdjustmentLine | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | items, stock_adjustments |
| stock_adjustments | StockAdjustment | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | locations, organizations, stock_adjustments, users |
| stock_count_lines | StockCountLine | 6 | POPULATED_REQUIRES_SCENARIO_VALIDATION | items, locations, stock_count_sessions |
| stock_count_sessions | StockCountSession | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | locations, organizations, users |
| stock_transfer_lines | StockTransferLine | 6 | POPULATED_REQUIRES_SCENARIO_VALIDATION | items, stock_transfers |
| stock_transfers | StockTransfer | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | locations, organizations, users |
| supplier_bank_accounts | SupplierBankAccount | 9 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, suppliers |
| supplier_bank_change_requests | SupplierBankChangeRequest | 9 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, supplier_bank_accounts, suppliers |
| supplier_credit_note_lines | SupplierCreditNoteLine | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | goods_receipt_lines, organizations, purchase_return_lines, supplier_credit_notes, supplier_invoice_lines |
| supplier_credit_notes | SupplierCreditNote | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | goods_receipts, organizations, purchase_orders, purchase_returns, supplier_credit_notes, supplier_invoices, suppliers |
| supplier_invoice_lines | SupplierInvoiceLine | 1407 | POPULATED_REQUIRES_SCENARIO_VALIDATION | goods_receipt_lines, items, organizations, purchase_order_lines, supplier_invoices |
| supplier_invoice_match_exceptions | SupplierInvoiceMatchException | 3 | POPULATED_SCENARIO_VERIFIED | organizations, supplier_invoices, three_way_matches |
| supplier_invoices | SupplierInvoice | 120 | POPULATED_REQUIRES_SCENARIO_VALIDATION | financial_opening_revisions, organizations, purchase_orders, suppliers |
| supplier_ledger_entries | SupplierLedgerEntry | 108 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, suppliers |
| supplier_payment_allocations | SupplierPaymentAllocation | 12 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, supplier_invoices, supplier_payments |
| supplier_payments | SupplierPayment | 12 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations, supplier_bank_accounts, suppliers |
| supplier_po_access_logs | SupplierPoAccessLog | 33 | POPULATED_SCENARIO_VERIFIED | organizations, supplier_po_access_tokens, supplier_po_envelopes |
| supplier_po_access_tokens | SupplierPoAccessToken | 3 | POPULATED_SCENARIO_VERIFIED | organizations, supplier_po_envelopes |
| supplier_po_envelopes | SupplierPoEnvelope | 3 | POPULATED_SCENARIO_VERIFIED | organizations, purchase_orders, suppliers |
| supplier_po_proposal_lines | SupplierPoProposalLine | 3 | POPULATED_SCENARIO_VERIFIED | organizations, supplier_po_proposals |
| supplier_po_proposal_states | SupplierPoProposalState | 6 | POPULATED_SCENARIO_VERIFIED | organizations, supplier_po_proposals |
| supplier_po_proposals | SupplierPoProposal | 3 | POPULATED_SCENARIO_VERIFIED | organizations, supplier_po_access_tokens, supplier_po_envelopes |
| suppliers | Supplier | 21 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| suspense_items | SuspenseItem | 2 | POPULATED_SCENARIO_VERIFIED | chart_of_accounts, ledger_posting_batches, organizations, payment_transactions, provider_accounts, reconciliation_runs, users |
| tax_rates | TaxRate | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| tenant_module_configuration_commands | TenantModuleConfigurationCommand | 6 | POPULATED_SCENARIO_VERIFIED | organizations, tenant_module_configurations |
| tenant_module_configurations | TenantModuleConfiguration | 3 | POPULATED_SCENARIO_VERIFIED | organizations |
| tenant_module_grants | TenantModuleGrant | 45 | POPULATED_SCENARIO_VERIFIED | organizations, tenant_module_configurations |
| tenant_module_lifecycle_events | TenantModuleLifecycleEvent | 24 | POPULATED_SCENARIO_VERIFIED | tenant_module_lifecycle_operations |
| tenant_module_lifecycle_operations | TenantModuleLifecycleOperation | 3 | POPULATED_SCENARIO_VERIFIED | tenant_module_configuration_commands, tenant_module_configurations |
| tenant_module_lifecycle_steps | TenantModuleLifecycleStep | 15 | POPULATED_SCENARIO_VERIFIED | tenant_module_lifecycle_operations |
| three_way_matches | ThreeWayMatch | 120 | POPULATED_REQUIRES_SCENARIO_VALIDATION | goods_receipts, organizations, purchase_orders, supplier_invoices |
| units | Unit | 3 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| users | User | 38 | POPULATED_REQUIRES_SCENARIO_VALIDATION | organizations |
| verifications | Verification | 0 | WORKFLOW_GENERATED |  |
| workflow_assurance_alert_deliveries | WorkflowAssuranceAlertDelivery | 9 | POPULATED_SCENARIO_VERIFIED | organizations, workflow_assurance_incidents |
| workflow_assurance_check_definitions | WorkflowAssuranceCheckDefinition | 39 | POPULATED_SCENARIO_VERIFIED |  |
| workflow_assurance_check_findings | WorkflowAssuranceCheckFinding | 9 | POPULATED_SCENARIO_VERIFIED | organizations, workflow_assurance_check_runs, workflow_assurance_incidents |
| workflow_assurance_check_runs | WorkflowAssuranceCheckRun | 24 | POPULATED_SCENARIO_VERIFIED | organizations, workflow_assurance_check_definitions |
| workflow_assurance_incident_events | WorkflowAssuranceIncidentEvent | 15 | POPULATED_SCENARIO_VERIFIED | organizations, workflow_assurance_incidents |
| workflow_assurance_incidents | WorkflowAssuranceIncident | 3 | POPULATED_SCENARIO_VERIFIED | organizations, workflow_assurance_check_definitions, workflow_assurance_check_runs |
| workflow_assurance_waivers | WorkflowAssuranceWaiver | 3 | POPULATED_SCENARIO_VERIFIED | organizations, workflow_assurance_incidents |
