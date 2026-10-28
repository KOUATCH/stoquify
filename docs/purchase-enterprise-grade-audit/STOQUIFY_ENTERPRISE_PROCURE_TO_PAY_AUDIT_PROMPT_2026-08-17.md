# Stoquify Enterprise Procure-to-Pay Audit Prompt

Date: 2026-08-17  
Workspace: E:\ohada saas\Focused projects\stoquify  
Mode: evidence-first audit and modernization planning; no runtime implementation  
Output override: save the prompt and resulting reports as Markdown and PDF under docs/purchase-enterprise-grade-audit

## Role

Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise and platform architecture; backend, API, database, data-integrity, concurrency, and distributed-systems engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend, design-system, workflow UX, accessibility, localization, and content design; product strategy and business-process analysis; purchasing, supplier governance, inventory, accounts payable, treasury, reconciliation, accounting, close, and internal controls; OHADA/SYSCOHADA and country-pack governance; quality engineering, SRE, DevSecOps, observability, resilience, performance, and cost; event, outbox, offline, provider, and integration boundaries; analytics, evidence, and data governance; AI safety and human approval; and SaaS modularity, packaging, billing, support, and product operations.

Operate as one coordinated review board. Make evidence-backed recommendations, expose disagreements and trade-offs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening the request into an unrelated rewrite. Mark immaterial lenses not applicable with one short reason. Never claim legal, tax, accounting, security, privacy, accessibility, or release certification without the required expert-reviewed evidence.

## Project and mission

Project: Stoquify / AqStoqFlow.

Domain: enterprise purchasing, supplier management, inventory receiving, accounts payable, payment reconciliation, and purchase accounting.

Study the current purchase process in detail and design a secure, professional, accounting-backed, inventory-integrated procure-to-pay target architecture. Benchmark the design against Oracle Fusion Cloud Procurement, SAP S/4HANA, Microsoft Dynamics 365, and Odoo, adapting useful principles to Stoquify’s OHADA SMB context instead of copying any product wholesale.

Determine precisely:

1. What is implemented and operational.
2. What exists only as a schema, service, action, read model, UI, gate, test, or report fragment.
3. What is missing.
4. What is unsafe, misleading, concurrency-sensitive, or incomplete.
5. What belongs in independently releasable P0, P1, and P2 phases.
6. What must remain blocked pending qualified accounting, OHADA/SYSCOHADA, country-pack, tax, banking, security, privacy, accessibility, or operational review.

## Review roster

Require an explicit finding or not-applicable disposition for:

- enterprise/platform architecture;
- backend, domain, API, integration, and distributed systems;
- database integrity, concurrency, migrations, backup, recovery, and rollback;
- security, tenant isolation, RBAC, sensitive actions, privacy, fraud, and abuse resistance;
- frontend, responsive workflow, design system, accessibility, localization, and content;
- product strategy and business-process design;
- supplier governance, purchasing, AP, maker-checker, and payment controls;
- inventory receiving, valuation, batch, serial, expiry, inspection, quarantine, and offline operations;
- accounting, treasury, reconciliation, close, and internal controls;
- OHADA/SYSCOHADA, country-pack, tax, fiscal-document, and statutory governance;
- audit evidence, records retention, document governance, and data quality;
- payment providers, settlement, suspense, and reconciliation;
- quality engineering, browser verification, accessibility testing, and release assurance;
- SRE, DevSecOps, observability, queues, performance, and incident recovery;
- API, webhook, outbox, business events, imports, exports, and third-party boundaries;
- supplier performance, spend analytics, and metric definitions;
- SaaS modularity, entitlement, packaging, billing, training, support, and product operations;
- AI safety where OCR, anomaly detection, or recommendations are proposed.

## Repository hypotheses to verify

- PurchaseOrder supports DRAFT, SUBMITTED, APPROVED, PARTIALLY_RECEIVED, RECEIVED, COMPLETED, and CANCELLED.
- PO approval prevents creator self-approval.
- Receiving creates GoodsReceipt and GoodsReceiptLine records and posts tenant/location-scoped stock movements with batch, serial, and expiry support.
- Goods receipt accounting creates a ledger blocker indicating that AP/stock ledger configuration is required; verify whether authoritative GRNI posting exists elsewhere.
- Supplier invoice preparation and posting use persisted maker-checker, duplicate protection, idempotency, open-period checks, country-pack resolution, ledger evidence, and AP source links.
- Invoice matching requires received-goods evidence, prevents invoicing above uninvoiced received quantity, and enforces exact unit-cost matching with zero tolerance.
- The source refers operators to a match exception, but a complete creation, approval, evidence, expiry, and UI flow might not exist.
- AP mutation actions exist, while the main AP workbench appears read-oriented; verify usable operator mutation surfaces.
- Supplier bank changes and payment approval/release use maker-checker and fresh authentication.
- Supplier PO acknowledgement and change proposals use token-scoped supplier access.
- PO and goods-receipt numbers use last-record-plus-one generation and might collide under concurrency.
- No authoritative runtime model has been identified for requisitions, RFQs, quote comparison, inspections, quarantines, purchase returns, supplier credit notes, landed cost, or service acceptance.

## Official benchmark sources

- Oracle procurement and invoice matching: https://docs.oracle.com/en/cloud/saas/procurement/26c/oaprc/using-procurement.pdf
- Oracle two-, three-, and four-way matching: https://docs.oracle.com/en/cloud/saas/procurement/26a/oapro/match-approval-level-options.html
- Oracle invoice-to-PO/receipt matching: https://docs.oracle.com/en/cloud/saas/financials/25c/fappp/matching-invoice-lines.html
- SAP flexible purchasing workflow: https://help.sap.com/docs/SAP_S4HANA_CLOUD/adbae5bcd5994f159bf2847a11397b61/fbc1a9b4600745c1939276a0d9ce62ec.html
- SAP goods receipt / invoice receipt accounting: https://help.sap.com/docs/SAP_S4HANA_ON-PREMI-SE/af9ef57f504840d2b81be8667206d485/be5eb6531de6b64ce10000000a174cb4.html
- Dynamics 365 procurement overview: https://learn.microsoft.com/en-us/dynamics365/supply-chain/procurement/procurement-sourcing-overview
- Dynamics 365 vendor invoices: https://learn.microsoft.com/en-us/dynamics365/finance/accounts-payable/vendor-invoices-overview
- Odoo RFQ and purchasing: https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/purchase/manage_deals/rfq.html
- Odoo bill controls and three-way matching: https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/purchase/manage_deals/control_bills.html

Use official evidence only for benchmark assertions. Identify each principle as adopted, adapted, deferred, or rejected.

## Required lifecycle analysis

### 1. Supplier governance

Assess onboarding, identity, duplicates, risk/sanctions placeholders, tax identity, bank-destination approval, lifecycle suspension, and controlled reactivation. Do not invent supplier, bank, tax, or authority evidence.

### 2. Purchase requisition

Define requester, purpose, location, cost center, project, budget, requested date, item/service classification, attachments, spending authority, approval routing, failure, withdrawal, rejection, correction, and immutable approval evidence.

### 3. Sourcing and RFQ

Define RFQ issuance, secure supplier response, quotation evidence, quote comparison, commercial/delivery scoring, conflicts of interest, award decision, approval, quotation expiry, and blanket agreements.

### 4. Purchase order

Cover draft, submit, approve, issue, supplier acknowledgement, change request, reapproval, cancellation, closure, delivery schedules, tax/currency/terms, immutable approved versions, and amount-, risk-, supplier-, category-, and location-aware policies.

Keep requester, buyer, approver, receiver, inspector, AP maker, AP checker, payment approver, and payment releaser distinct.

### 5. Receiving and service acceptance

Cover arrival registration, partial/over/under receipt, damage, rejection, quarantine, inspection, accepted quantity, batch/serial/expiry, delivery-note reference, evidence attachments, and service acceptance. Support governed two-, three-, and four-way matching policies. Stock availability must depend on acceptance/quarantine policy; physical arrival alone is not automatically usable stock.

### 6. Purchase document semantics

Resolve “receipt issuing” into:

- purchase requisition: internal request;
- RFQ: buyer-issued sourcing request;
- supplier quotation: supplier-issued evidence captured by Stoquify;
- purchase order: buyer-issued commercial commitment;
- GRN/purchase receipt: Stoquify-issued operational evidence of received quantities;
- inspection/rejection report: Stoquify-issued acceptance evidence;
- supplier invoice: supplier-issued commercial evidence captured and verified by Stoquify;
- supplier credit note: supplier-issued correction evidence unless a legally reviewed self-billing policy applies;
- remittance advice: Stoquify-issued payment notification after a truthful controlled release;
- accounting voucher/posting batch: system-generated internal accounting evidence;
- sales fiscal receipt: outside the purchase-document flow.

For each issued artifact define a tenant/location-scoped concurrency-safe number, version, immutable finalized snapshot, source links, HTML/PDF/print form, EN/FR content, hash, generation time, actor, delivery status, redaction, correction/reversal relationship, retention, and permissions for view/download/email/share.

### 7. Invoice capture and matching

Assess secure attachment upload, MIME allowlist, size limits, malware scanning, encrypted storage, signed download URLs, retention, evidence hash, and audit. Optional OCR/AI extraction must remain a proposal with deterministic validation and human confirmation; extracted values are never business or accounting truth.

Detect duplicates using supplier/number, normalized number, amount/date/currency, and document hash. Design versioned match policies for quantity, price, tax, freight, exchange rate, and invoice total. Persist exception reason, policy version, evidence, requester, independent approver, resolution, and expiry. Never force a match or mutate PO/receipt facts to make an invoice pass.

### 8. Accounting

Produce an event-to-accounting matrix for requisition approval, PO approval/issuance, physical arrival, accepted/quarantined/rejected receipt, invoice preparation/posting, match-exception approval, payment approval/release, settlement/reconciliation, purchase return before/after invoice, supplier credit note, landed-cost allocation, cancellation, and reversal.

For each event state whether it posts, its inventory quantity/availability/valuation effects, supplier subledger and GL effects, GRNI effect, input VAT/withholding posture, payment/reconciliation effect, close invalidation, source links, evidence, failure, and correction.

Evaluate a professional perpetual-inventory pattern:

- accepted goods receipt: debit inventory or the approved asset/expense policy and credit GRNI;
- supplier invoice: clear GRNI, recognize approved variance/input VAT/charges, and credit AP;
- supplier payment: debit AP and credit bank, mobile-money, or payment clearing according to the truthful provider stage;
- returns and credit notes: source-linked corrections, never destructive edits.

Never hardcode SYSCOHADA account numbers, tax rates, withholding, or legal treatment. Resolve mappings through versioned, dated, qualified-expert-reviewed country packs and accounting policies. Missing configuration creates a visible blocker.

### 9. Returns and corrections

Define return authorization, dispatch evidence, inventory reversal/quarantine release, GRNI/AP correction, supplier debit request, credit-note capture, price/short-shipment claims, and immutability of posted receipt, invoice, payment, and ledger evidence.

### 10. Payment, reconciliation, and close

Preserve bank-change controls, fresh authentication, maker-checker, approved allocations and payment destinations, and payment-release safeguards. Generate remittance only from a truthful release state. Represent pending, unknown, failed, settled, suspense, and reconciled provider states. Tie supplier open items to the AP control account. Expose unmatched GRNI, overdue receipts, match exceptions, unallocated payments, and unreconciled releases as close blockers.

### 11. UX and operations

Design role workbenches for requester requisitions, buyer sourcing, PO approvals, warehouse receipt/inspection, supplier acknowledgement, AP invoice/match, payment approval/release, and supplier history/reconciliation.

Require loading, empty, denied, stale, partial, conflict, retry, offline, blocked, and success states; responsive desktop/tablet/mobile behavior; keyboard accessibility; WCAG-oriented behavior; EN/FR copy; safe errors; and uninterrupted workflow context. Monetary calculation and business truth remain server-owned.

### 12. Reliability and security

Require server-owned tenant and actor context, RBAC plus module entitlement, fresh authentication for critical actions, segregation of duties, transactional idempotency with same-key/different-payload rejection, concurrency controls, transactional outbox events, immutable audit, exact decimal handling, supplier-portal abuse controls, bank/sensitive redaction, safe errors, and no final state without ledger, reconciliation, suspense, or explicit blocker evidence.

Require real PostgreSQL concurrency tests for numbering, receipt, invoice preparation, approval claims, and payment release.

## Architecture and migration output

Propose the smallest coherent additive model. Consider without blindly creating: PurchaseRequisition, PurchaseRequisitionLine, SourcingEvent, SupplierQuotation, SupplierQuotationLine, AwardDecision, ApprovalPolicy, ApprovalInstance, PurchaseOrderVersion, PurchaseOrderChangeRequest, GoodsInspection, ServiceAcceptance, PurchaseReturn, SupplierCreditNote, MatchPolicy, MatchException, LandedCostAllocation, and reusable DocumentArtifact/DocumentDelivery.

Reuse existing BusinessEvent, outbox, evidence, accounting-period, ledger-posting, inventory-stock-event, reconciliation, notification, sensitive-action, and audit foundations where they satisfy the invariant.

For every proposed model give owner, state machine, tenant indexes, unique constraints, migration order, backfill, rollback, and legacy compatibility. Migrations must be additive, indexed, safe, reversible, and non-destructive.

## Execution

1. Record git status --short and preserve unrelated dirty-worktree changes.
2. Inspect graphify-out architecture reports, especially purchase Community 10.
3. Inspect schema, migrations, purchase/AP/inventory/accounting/reconciliation services, actions, routes, components, permissions, tests, gates, and recent reports.
4. Trace the happy path from PO draft through receipt, invoice, payment, reconciliation, and close.
5. Trace partial receipt, duplicate invoice, price variance, bank change, payment failure, return, and correction scenarios.
6. Classify capabilities as implemented, partial, missing, risky, deferred, or not applicable.
7. Compare all four benchmark products from official evidence.
8. Produce current and target lifecycle diagrams, document taxonomy, accounting and inventory matrices, RBAC/SoD matrix, threat analysis, additive schema/migration proposal, workbench plan, and P0/P1/P2 backlog.
9. Run focused read-only verification and record exact results.
10. Do not implement runtime changes.

## Risk controls

- Preserve unrelated dirty-worktree changes.
- Do not reset, reseed, delete, or destructively migrate data.
- Do not invent supplier invoices, tax rates, withholding rules, statutory identifiers, bank confirmation, or authority certification.
- Do not treat a GRN as a sales fiscal receipt.
- Do not allow client-provided organization IDs, actors, approvers, totals, document numbers, or ledger states to become business truth.
- Do not permit posted documents to be edited; use linked change, return, credit-note, or reversal records.
- Do not implement tolerance overrides without versioned policy, permissions, reason, evidence, and independent approval.
- Do not release payments while supplier-bank changes, match exceptions, reconciliation blockers, or country-pack blockers remain unresolved.
- Do not create dashboard-only features without service-owned state and mutation contracts.
- Do not touch unrelated lint warnings or refactor unrelated modules.

## Success criteria

- Every procure-to-pay stage has an owner, state machine, permissions, evidence, inventory effect, accounting effect, failure path, and correction path.
- Existing strengths are preserved and clearly separated from proposals.
- Four benchmark systems are compared using official evidence, with applicable principles identified.
- “Receipt issuing” is resolved into controlled PO, GRN, inspection, supplier-invoice capture, remittance, and accounting-document semantics.
- GRNI, AP, inventory valuation, payment, reconciliation, returns, and close effects balance without double counting.
- High-risk actions have documented tenant, RBAC, fresh-auth, maker-checker, idempotency, concurrency, audit, notification, and rollback requirements.
- Proposed schema changes are additive, indexed, migration-safe, reversible, and compatible with current records.
- The plan is divided into independently releasable P0/P1/P2 slices with focused tests and measurable exit gates.
- No production, legal, tax, security, accounting, or accessibility certification is claimed without required evidence.

## Non-goals

- No runtime code implementation.
- No wholesale ERP clone.
- No redesign of unrelated sales, payroll, HR, or compliance modules.
- No speculative AI automation without a deterministic human-approved control path.
- No payment-provider activation or real supplier payment.
- No hardcoded country-specific accounting or statutory rules.

## Required deliverables

Save under docs/purchase-enterprise-grade-audit:

1. this executable prompt in Markdown and PDF;
2. a full enterprise procure-to-pay audit and modernization report in Markdown and PDF;
3. a concise readiness decision report in Markdown and PDF;
4. supporting machine-readable readiness evidence where useful.

The full report must contain an executive decision, repository-truth map, benchmark comparison, current and target lifecycle diagrams, document taxonomy, accounting-event matrix, inventory-effect matrix, RBAC/segregation-of-duties matrix, security and fraud threat analysis, additive data model and migration plan, UI/workbench plan, P0/P1/P2 dependency order, tests and release gates, unresolved-risk register, explicit reviewer dispositions, and implementation-ready optional next prompts.

