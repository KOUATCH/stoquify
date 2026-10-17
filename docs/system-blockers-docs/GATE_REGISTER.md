# Prioritized gates and action owners

[Machine-readable complete register](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/gate-register.json>) contains every identified gate, proposed roles and current named candidates, exact affected IDs, required-field references, dependencies, source guards and next actions. All 601 individual validator checks are retained in [gate-checks.csv](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/gate-checks.csv>). Passed static checks establish only what that check inspected.

## Repository validators

| Gate | Status | Stage | Proposed roles | Failed checks |
| --- | --- | --- | --- | --- |
| inventory-valuation-truth-gate | PASS | development | inventory_controller, accounting_owner | 0 |
| ledger-close-truth-gate | PASS | development | accounting_owner, qualified_accounting_reviewer, financial_controller | 0 |
| payment-cash-truth-gate | PASS | development | payments_owner, treasury_owner | 0 |
| purchasing-ap-consolidation-gate | PASS | development | inventory_controller, controller_approver, fulfillment_owner | 0 |
| role-based-operating-cockpit-gate | PASS | development | product_owner, security_owner, database_migration_operator | 0 |
| statutory-country-pack-development-gate | PASS | development/sandbox | qualified_cameroon_country_pack_reviewer, accounting_owner | 0 |
| statutory-country-pack-production-gate | BLOCKED | production statutory authority | qualified_cameroon_country_pack_reviewer, accounting_owner | 1 |
| workflow-assurance-release-gate | PASS | development | qa_owner, sre_owner, security_owner | 0 |
| payroll-payments-declarations-development-gate | PASS | development/sandbox | financial_controller, controller_approver, accounting_owner | 0 |
| payroll-accounting-close-development-gate | PASS | development/sandbox | financial_controller, controller_approver, accounting_owner | 0 |
| hris-payroll-migration-development-gate | PASS | development/sandbox | financial_controller, controller_approver, accounting_owner | 0 |
| payroll-presence-readiness-gate | PASS | development | financial_controller, controller_approver, accounting_owner | 0 |
| payroll-trust-spine-readiness-gate | BLOCKED | development | financial_controller, controller_approver, accounting_owner | 1 |
| ai-copilot-guardrails-gate | PASS | development | product_approver, security_owner, sre_owner, support_owner | 0 |
| ci-release-readiness-gate | PASS | CI configuration | qa_owner, sre_owner, security_owner | 0 |
| agent-external-input-readiness | BLOCKED | internal pilot authoritative evidence capture | product_approver, security_owner, sre_owner, support_owner | 12 |
| module-surface-inventory | BLOCKED | development regression ratchet | inventory_controller, accounting_owner | 174 |
| release-evidence-ratchet | BLOCKED | production release evidence | qa_owner, sre_owner, security_owner | 6 |
| agent-credential-rotation-gate | BLOCKED | internal pilot independent approval | product_approver, security_owner, sre_owner, support_owner | 31 |
| agent-operational-release-gate | BLOCKED | internal pilot independent approval | product_approver, security_owner, sre_owner, support_owner | 152 |
| pos-g1-contract-gate | BLOCKED | G1 architecture/control accountable approval; production promotion | pos_architect, retail_operations_owner, qa_owner | 11 |

## Data and evidence reconstruction

| Invariant | Count | Effect | Proposed engineering/operational owner |
| --- | --- | --- | --- |
| RECEIPT_SOURCE_MISMATCH | 24 | Trustworthy receipt history and stock-event reconstruction for the affected sources; unrelated synthetic development workflows may continue. | Warehouse/receiving manager with purchasing controller; inventory engineering implements and independent accountant verifies |
| SALES_LINE_AND_HEADER_TAX_MISMATCH | 24 | Affected sale completion/replay and trustworthy tax/source history; 24 line and 24 header failures concern the same 24 sales, not 48 sales. | Sales/POS manager with accountant; POS engineering implements validated synthetic corrections |
| MISSING_STOCK_EVENT | 48 | Inventory class-3 evidence reconciliation and any close-assurance check consuming it. Numeric stock-to-ledger drift is zero, but evidence continuity remains blocked. | Inventory integration engineer with inventory controller and independent accountant |
| GENERIC_PayrollRunLine_calculationSnapshot | 24 | Payroll component proof/posting and register provenance for 24 legacy payroll lines | Payroll engineer; payroll preparer and independent payroll reviewer |
| GENERIC_PayrollRunLine_ruleProvenance | 24 | Payroll rule/country-pack provenance for the same 24 lines | Payroll engineer; payroll rule owner and independent reviewer |
| GENERIC_POSOfflineEvent_payload | 24 | Replay of 24 PENDING_REPLAY legacy events | Offline POS engineer; POS supervisor |
| GENERIC_ProviderEvent_rawPayload | 24 | Verification/reconciliation of 24 RECEIVED events with signatureValid=false | Payment integration engineer; treasury/reconciliation operator |
| GENERIC_BusinessEvent_payload | 24 | Source traceability of 24 RECORDED generic events with null sourceType/sourceId | Business-event integration engineer; owning source-domain controller |
| GENERIC_BusinessEventOutbox_payload | 24 | Delivery evidence for 24 PENDING generic notification messages | Event-delivery engineer; operations owner |
| GENERIC_FiscalDocument_canonicalPayload | 24 | Legal certification/submission truth for 24 DRAFT manual synthetic invoices | Fiscal document engineer; accounting/compliance preparer and independent reviewer |
| GENERIC_WorkflowAssuranceCheckDefinition_sourceTables | 24 | Trustworthy registry definitions; these 24 global definitions are observe-only (enforceMode=false), not 24 enforced gate failures | Assurance platform engineer; internal-controls owner |
| COUNTRY_ADAPTER_SYNTHETIC_REVIEW_GAPS | 24 | Real country-adapter expert approval/certification. Local fake/sandbox testing and fixture cleanup can continue without pretending to close the production review gate. | Compliance adapter engineer/configurator and a different qualified country reviewer for real approval |

## Account and module findings

[CAPABILITY_ELIGIBILITY.md](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/CAPABILITY_ELIGIBILITY.md>) lists all 25 critical capability contracts across three tenants. In rds_org_001/rds_org_002, the full access-maintenance contract lacks users.roles.remove; this does not mean every read/assign action is blocked. Branch-close review/sign require missing permissions and valid manager/tenant scope. AI Product/Security/activation grants are missing from those tenants. All three tenants lack purchasing, so all nine AP request/approve/release tenant checks are module-blocked. No privileges or module selections were changed.

Production-only country approval and optional AI pilot requirements do not prevent unrelated development. Review source-marker failures and scanner false positives as engineering findings, not requests for extra signatures.

## Product tax and stocking units

The machine-readable register also includes PRODUCT_TAX_CLASSIFICATION_UNVERIFIED (41 item references), ZERO_TAX_REASON_PROVENANCE_GAP (two unused zero-rate rows) and STOCKING_UNIT_CONFIRMATION (four item IDs). These semantic requirements are distinct from failed foreign keys and are not presented as existing runtime gate identifiers. Exact sources/IDs are in [runtime/tax-classification-assessment.json](<E:/ohada saas/Focused projects/stoquify/what-next/development-gates/2026-09-27T123553Z/runtime/tax-classification-assessment.json>).
