# Stoquify Platform Source-of-Truth Map — 2026-07-28

| Business fact | Canonical owner / record | Authorized mutation path | Derived consumers | Trust gap |
| --- | --- | --- | --- | --- |
| Identity and membership | BetterAuth/User and user identity services | Auth/user lifecycle services | Session/RBAC/navigation | Invite token plaintext; audit durability |
| Tenant authorization | Organization/membership/RBAC/module services | `protect`, RBAC and entitlement checks | Pages, actions, APIs | Accepted DB org-scope ADR not implemented; module gate optional |
| Item and stock | Inventory services; InventoryTransaction; InventoryLevel projection | Stock-event and adjustment commands | POS, purchasing, stock dashboards | One production atomicity gate blocked; projection must reconcile to movements |
| Purchase and liability | PurchaseOrder, receipts, supplier invoice/match/payment | Purchase-order and AP services | AP/finance dashboards | Bulk approval bypass; release can be misread as settlement |
| Sale and tender | POS service; SalesOrder/Payment | `commitPOSSale`, refund/void commands | Receipts, dashboards, ledger | Store credit/provider truth/concurrent balance gaps |
| Provider settlement | ProviderEvent/StatementLine to PaymentTransaction/Match/Suspense | Payment ingestion and reconciliation services | Finance/accounting | Legacy Payment coexists; external authenticity unverified |
| Ledger and close | JournalEntry/lines, AccountingSourceLink, close evidence | Accounting posting/close services | Reports, certified packs | Migration/statutory prerequisites blocked |
| Employee and payroll | HRIS records; PayrollRun/payslip/declaration/payment proof | HRIS/payroll services | Self-service, accounting, compliance | External provider and statutory proof unverified |
| Statutory configuration | Versioned country-pack/regulatory services | Reviewed country-pack publication | Tax, payroll, fiscal/close | Placeholders/source hashes/expert approval blocked |
| Evidence and incidents | Audit/business events/outbox; assurance incident/events | Domain transaction/outbox/assurance engine | Control tower, exports | Generic security audit is best-effort; production alert sink unverified |
| Operational metrics | Canonical domain records plus versioned snapshot contracts | Read-model services only | Dashboards/analytics | Cash and AR definitions conflict; DailySalesReport/live aggregates coexist |
| AI proposals | AI proposal/run/evidence records | Protected proposal/decision services | Copilot UI | Caller-supplied route permission; self-approval invariant missing |

## Competing or duplicated truth

1. `Payment`, `PaymentTransaction`, provider events and statement lines coexist without a universally enforced surface-selection policy.
2. Dashboard, tenant snapshot and finance dashboard calculate cash/receivables with conflicting payment-status sets.
3. `DailySalesReport` stores precomputed facts while multiple services aggregate live sales independently; provenance/reconciliation policy was not established.
4. Customer and drawer mutable balances are read-compute-set projections vulnerable to lost updates; immutable ledger/transactions should be authoritative.
5. Duplicate/legacy action and route facades exist for customers, analytics, items, suppliers and purchase detail surfaces.
6. Purchase approval state can be produced by canonical approval or a generic bulk status update with different evidence.
7. Status vocabularies across persistence, snapshot trust, payroll authority and finance trust lack a shared mapping contract.
8. Workflow assurance coverage is strong for financial/operational flows but omits identity, entitlement, HRIS and master-data families as distinct coverage classes.

## Governance rule

Transactional services own mutation truth. Dashboards, reports and AI outputs are projections. Every projection should declare source records, semantic version, as-of time, freshness, reconciliation state, source hash and blockers. Corrections must append reversals/transitions rather than erase history. External/statutory facts remain provisional until independently verified.
