# Stoquify Enterprise Sales-to-Cash Readiness

Artifact date: 2026-08-16  
Executed at: 2026-08-17T05:17:00+02:00  
Scope: Repository audit and target-state design only  
Overall status: **BLOCKED**  
Confidence: HIGH_FOR_LOCAL_REPOSITORY_TRUTH_LOW_FOR_PRODUCTION

## Verdict

The immediate online cash-sale kernel is materially implemented and locally verified, but the enterprise sales-to-cash system is not production-ready.

### Strengths

- The authoritative POS commit transaction owns sale completion, payment rows, stock issue, cash-session totals, accounting postings, audit, events, and outbox creation in one database transaction.
- Accounting posting kernels are source-linked, balanced, idempotent, open-period aware, and connected to close invalidation.
- Inventory stock events are organization- and location-scoped, idempotent, version-checked, valuation-aware, and source-linked.
- Refund and void paths preserve history through compensating records.
- Offline ingestion and replay have device, signature, ordering, payload-conflict, idempotency, provisional-receipt, and operator-resolution controls.
- Provider-event ingestion, statement import, suspense, matching, and reconciliation infrastructure exists independently of POS.

### Release blockers

1. Electronic POS tenders are marked PAID from operator-entered references without a provider-authoritative authorization, capture, unknown, settlement, reversal, dispute, or chargeback lifecycle.
2. Online POS has no tenant-scoped clientCommitId result registry, so a response-loss retry cannot deterministically return the original committed result.
3. A completed sale does not synchronously bind an immutable receipt/fiscal-source document; fiscal materialization is asynchronous and production worker, authority, and delivery proof are absent.
4. Delivery/on-account order-to-cash lacks authoritative reservation, fulfillment, goods-issue, partial-delivery, invoice, AR, and correction state machines.
5. POS route, navigation, read actions, write actions, offline actions, and seeded roles use inconsistent permission and module-entitlement contracts.
6. Business-day statement, blind tender declaration, manager sign-off, X/Z reporting, statement posting, and accounting-close handoff are not complete authoritative aggregates.
7. PostgreSQL concurrency, provider sandbox/live, fiscal authority, hardware, browser, multi-terminal, and operational recovery evidence is absent or incomplete.

## Evidence boundary

### Local evidence

- Current dirty worktree source and Prisma schema
- Existing repository audit and evidence artifacts
- Graphify component, action, app, hook, type, and service graphs
- Focused TypeScript, Prisma, Jest, and static/runtime gate results
- Dated official product and security documentation

### Not production proof

- No production database, logs, traces, provider credentials, or provider statements were inspected.
- No production receipt signing secret or fiscal authority was exercised.
- No legal or statutory conclusion was made for a country pack.
- No PCI DSS assessment, penetration test, accessibility audit, disaster recovery exercise, or load test was performed.
- No browser/hardware/offline multi-device field test was performed.
- The audited worktree contained user-owned uncommitted changes and therefore is not a release commit certification.

## Authoritative owners

| Transition | Current owner | Status | Risk/notes |
| --- | --- | --- | --- |
| Immediate online POS sale finalization | services/pos/pos.service.ts::commitPOSSale | IMPLEMENTED_NOT_PRODUCTION_PROVEN |  |
| Offline POS replay into the online finalizer | services/pos/offline-sync.service.ts -> commitPOSSale | IMPLEMENTED_NOT_PRODUCTION_PROVEN |  |
| POS stock issue and valuation | services/inventory/inventory-stock-event.service.ts::postPOSStockIssue | IMPLEMENTED_NOT_PRODUCTION_PROVEN |  |
| Sale, payment, refund, and void ledger posting | services/accounting/postings | IMPLEMENTED_NOT_PRODUCTION_PROVEN |  |
| Fiscal document materialization | services/compliance/fiscalization-outbox.service.ts -> createFiscalDocumentFromPostedSource | PARTIAL_ASYNC_AND_NOT_AUTHORITY_PROVEN | services/pos/pos.service.ts also contains an unused createPOSFiscalDocumentInTx helper, creating ownership ambiguity. |
| Electronic tender authorization and capture | None | MISSING_FROM_POS |  |
| Delivery/on-account reservation and fulfillment | None | MISSING |  |
| Business-day retail statement posting | None | MISSING |  |

## Workflow readiness

### WF-POS-IMMEDIATE: Immediate online POS cash sale

Status: **PARTIAL**

Implemented:

- Scoped draft cart
- Terminal, session, and drawer validation
- Exact monetary calculation
- Transactional sale completion
- Payment row creation
- Stock issue and valuation
- Sale and payment postings
- Audit, business event, notification, and fiscalization outbox
- Compensating refund and void

Gaps:

- No clientCommitId result replay
- No PostgreSQL race proof
- Receipt/fiscal source remains pending after commit
- Browser, hardware, and live operational proof absent

### WF-POS-ELECTRONIC: Immediate POS electronic tender

Status: **RISKY**

Gaps:

- Manual reference validation is treated as successful payment
- POS Payment rows are created as PAID without provider-owned capture truth
- PaymentTransaction and ProviderEvent state are not connected to POS commit
- Unknown, declined, reversed, disputed, chargeback, and settlement states are incomplete

### WF-POS-ON-ACCOUNT: Immediate POS on-account sale

Status: **PARTIAL**

Implemented:

- Customer requirement
- Receivable document and customer-ledger creation
- Sale, tax, COGS, and inventory posting

Gaps:

- This is an immediate goods issue with AR, not delivery/on-account order fulfillment
- No promise, reservation, partial shipment, delivery evidence, or shipment-based invoicing

### WF-OTC-DELIVERY: Delivery/on-account order-to-cash

Status: **MISSING**

Gaps:

- SalesOrder status names exist but no authoritative confirm, reserve, pick, ship, deliver, or partial-fulfillment commands were found
- No fulfillment aggregate or delivery document
- No reservation consumption contract
- No fulfillment-triggered COGS and inventory posting
- No delivery-triggered invoice and AR orchestration
- No linked return, credit-note, and goods-issue reversal lifecycle

### WF-CLOSE: Shift close, business-day statement, reconciliation, and accounting close

Status: **PARTIAL**

Implemented:

- POS session close and variance evidence
- Offline replay/conflict close blockers
- End-of-day readiness read model
- Provider statement import, matching, suspense, and reconciliation
- Accounting close assurance and invalidation

Gaps:

- No authoritative business-day aggregate
- No blind tender declaration aggregate
- Branch payment reconciliation is explicitly unsupported in end-of-day readiness
- Manager sign-off is explicitly unsupported in end-of-day readiness
- No governed X/Z report and statement-posting lifecycle

## Capability matrix

| ID | Capability | Status | Risk | Evidence |
| --- | --- | --- | --- | --- |
| CAP-01 | Single authoritative online sale finalizer | IMPLEMENTED | MEDIUM | services/pos/pos.service.ts::commitPOSSale; actions/pos/tender.actions.ts; services/pos/offline-sync.service.ts |
| CAP-02 | Atomic sale, payment, stock, cash, ledger, audit, and outbox commit | IMPLEMENTED_NOT_PRODUCTION_PROVEN | MEDIUM | services/pos/pos.service.ts; services/pos/__tests__/pos.service.test.ts |
| CAP-03 | Tenant-scoped request idempotency and original-result replay | MISSING | CRITICAL | services/pos/pos.schemas.ts has no clientCommitId; commitPOSSale result is not stored in a client-result registry |
| CAP-04 | Provider-authoritative electronic payment lifecycle | RISKY | CRITICAL | POS creates legacy Payment rows as PAID; ProviderEvent and PaymentTransaction infrastructure exists but is not used by POS commit |
| CAP-05 | Provider webhook signature, replay, and redaction controls | IMPLEMENTED_NOT_LIVE_PROVEN | MEDIUM | services/payments/provider-event.service.ts; services/payments/__tests__/provider-event.service.test.ts |
| CAP-06 | Provider statement matching, suspense, and reconciliation | IMPLEMENTED_NOT_POS_INTEGRATED | HIGH | services/payments; services/reconciliation; payment:cash-truth:gate passed |
| CAP-07 | Immutable receipt and fiscal-source evidence for every completed sale | PARTIAL | CRITICAL | Fiscalization outbox and FiscalDocument model exist; commitPOSSale returns fiscalDocument null with PENDING watermark; services/pos/pos.service.ts::createPOSFiscalDocumentInTx is unused |
| CAP-08 | Receipt delivery independent from financial completion | IMPLEMENTED_PARTIAL_CHANNELS | MEDIUM | Post-commit delivery failure does not roll back sale; WhatsApp outbox is durable; Print, email, and SMS providers remain placeholders or unavailable |
| CAP-09 | Public receipt token security | LOCAL_READY_RELEASE_BLOCKED | HIGH | Signed, expiring, scoped, revocable tokens; receipt:token:config-gate passed with release enforcement off; Production signing secret not configured in the audited environment |
| CAP-10 | Inventory quantity and COGS at physical goods issue | IMPLEMENTED_FOR_IMMEDIATE_POS | MEDIUM | postPOSStockIssue; inventory:valuation:truth:gate passed; inventory stock-event tests passed |
| CAP-11 | Delivery reservation, partial fulfillment, and goods issue | MISSING | CRITICAL | Generic reserved quantity fields exist; No sales fulfillment aggregate or authoritative workflow found |
| CAP-12 | Balanced, source-linked sale, payment, AR, tax, COGS, inventory, refund, and void postings | IMPLEMENTED_NOT_MAPPING_CERTIFIED | MEDIUM | services/accounting/postings; ledger:close-truth:gate passed; No SYSCOHADA or jurisdiction-specific mapping certification performed |
| CAP-13 | Provider fees, settlement clearing, and chargeback accounting | PARTIAL | HIGH | Payment reconciliation models include fees, suspense, and settlement evidence; POS electronic tender does not create the provider transaction lifecycle |
| CAP-14 | Compensating refund, void, and return evidence | PARTIAL | HIGH | POS full refund and void create linked compensating stock/payment/ledger evidence; Partial refund, delivery return disposition, credit-note, and chargeback lifecycles are incomplete |
| CAP-15 | Offline signed, ordered, replay-safe, conflict-aware events | IMPLEMENTED_NOT_FIELD_PROVEN | HIGH | offline:pos:replay:gate passed 16/16; offline-sync tests passed; No multi-device field or authority proof |
| CAP-16 | Shift close and counted-cash variance | IMPLEMENTED_NOT_COMPLETE_EOD | HIGH | POS session and drawer close services; shift-close tests passed |
| CAP-17 | Business-day statements, blind declarations, X/Z reports, and sign-off | MISSING_OR_UNSUPPORTED | CRITICAL | End-of-day readiness explicitly reports branch reconciliation and manager sign-off as UNSUPPORTED; No BusinessDay, TenderDeclaration, RetailStatement, XReport, or ZReport aggregate found |
| CAP-18 | Consistent RBAC, module entitlement, fresh authentication, and separation of duties | PARTIAL | CRITICAL | Refund and void require fresh authentication; POS route uses OPERATE_POS while commands use pos.use; Cart and sync actions lack consistent module enforcement; Module inventory reported 408 surfaces, 292 enforcement candidates, and 79 missing-permission classifications |
| CAP-19 | Cashier workflow, offline, hardware, privacy, and accessibility UX | PARTIAL | HIGH | ProfessionalPOSSystem.tsx is 2493 lines; Offline readiness is not connected to checkout; Hardware readiness is synthetic; Mobile cart layout, touch target, focus, privacy, inactivity lock, and handover gaps remain |
| CAP-20 | Delivery/on-account order-to-cash | MISSING | CRITICAL | Sales dashboard is analytical; SalesOrder status enum contains lifecycle labels without command owners; No delivery, fulfillment, partial invoice, or linked correction orchestration found |

## Target decisions

### ADR-SALES-01

Decision: Keep commitPOSSale as the only immediate-sale finalizer and make offline replay call it.

Rationale: Prevents divergent accounting, inventory, receipt, audit, and reconciliation kernels.

### ADR-SALES-02

Decision: Introduce a separate delivery/on-account orchestration aggregate that reuses inventory, accounting, receipt, payment, and reconciliation kernels.

Rationale: Delivery sales require promise, reservation, fulfillment, goods issue, invoice, AR, and partial-state semantics that do not belong in immediate POS.

### ADR-SALES-03

Decision: Add a tenant-scoped POS client-result registry keyed by organizationId, terminalId, and clientCommitId with a canonical request hash and immutable result envelope.

Rationale: A retry after an unknown response must return the original outcome and reject a conflicting payload.

### ADR-SALES-04

Decision: Require provider-authoritative state before an electronic tender can complete a sale; UNKNOWN and PENDING are non-success states.

Rationale: Operator-entered references cannot prove authorization or capture.

### ADR-SALES-05

Decision: Bind an immutable fiscal-source snapshot and idempotency key at sale commit, while legal-number assignment and authority submission remain country-pack-governed asynchronous steps.

Rationale: Receipt delivery may fail independently, but completed-sale source truth must never depend on mutable catalog or customer data.

### ADR-SALES-06

Decision: Model session close, tender declaration, business-day statement, provider settlement reconciliation, and accounting period close as distinct observable lifecycles.

Rationale: Operational count, retail posting, external cash proof, and period certification have different evidence and authority.

## Accounting events

| Event | Debits | Credits | Condition |
| --- | --- | --- | --- |
| Immediate cash sale | Cash on hand; COGS | Revenue; Tax payable; Inventory |  |
| Electronic capture | Provider clearing | Revenue; Tax payable | Only after provider-authoritative captured/confirmed state |
| Provider settlement | Bank; Provider fee expense where applicable | Provider clearing |  |
| On-account invoice | Accounts receivable | Revenue; Tax payable |  |
| Physical goods issue | COGS | Inventory |  |
| Customer payment | Cash, bank, or provider clearing | Accounts receivable |  |
| Refund, void, return, fee, dispute, or chargeback | Configured correction accounts | Configured correction accounts | Always source-linked compensating records; never mutation of the original journal |

## Priority backlog

### P0

#### P0-01: Tenant-scoped POS clientCommitId result replay

Done when:

- Same key and same canonical request hash returns the immutable original result
- Same key with a different request hash is rejected and audited
- Concurrent PostgreSQL attempts produce one sale, one stock issue, one payment consequence set, and one result
- No destructive migration is used

#### P0-02: Provider-authoritative electronic tender bridge

Depends on: P0-01

Done when:

- POS creates or references PaymentTransaction rather than trusting an operator reference
- Pending and unknown never complete the sale
- Signed webhooks are idempotent and state-monotonic
- Captured, settled, fee, reversal, dispute, chargeback, and suspense evidence tie to ledger and reconciliation

#### P0-03: Immutable receipt/fiscal-source materialization

Depends on: P0-01

Done when:

- Every completed sale has an immutable source snapshot and hash before the commit result is returned
- Legal numbering remains asynchronous and country-pack-authorized
- Delivery retries cannot alter financial truth
- The unused synchronous fiscal helper is removed or formally adopted so there is one owner

#### P0-04: POS access-boundary normalization

Done when:

- Navigation, page, read, write, offline, receipt, refund, void, and close surfaces share documented permission and module contracts
- Fresh authentication and maker-checker rules are explicit for material actions
- Cross-tenant and cross-location negative tests pass
- Cashier seed roles are least privilege

#### P0-05: Release proof for concurrency, secrets, provider, fiscal worker, and offline close

Depends on: P0-01, P0-02, P0-03, P0-04

Done when:

- PostgreSQL race evidence is green
- Release receipt-token secret gate is green
- Provider sandbox/webhook/statement evidence is green
- Fiscal worker retry and dead-letter drills are green
- Offline conflict prevents false close and has a tested operator resolution

### P1

#### P1-01: Delivery/on-account order-to-cash aggregate

Depends on: P0-01, P0-04

#### P1-02: Reservation, partial fulfillment, goods issue, and reversal contracts

Depends on: P1-01

#### P1-03: Invoice, AR, partial payment, credit-note, and return orchestration

Depends on: P1-02, P0-03

#### P1-04: Business day, blind tender declaration, X/Z report, statement posting, and sign-off

Depends on: P0-02, P0-04, P0-05

#### P1-05: Cashier recovery, inactivity lock, handover, hardware, offline checkout, privacy, and accessibility

Depends on: P0-01, P0-04, P1-04

#### P1-06: Currency minor-unit, tax-mode, UOM, batch, serial, and availability contracts

Depends on: P1-01

Note: Enable only proven combinations; do not imply unsupported capability.

### P2

#### P2-01: Decompose the oversized POS component and service after contracts are frozen

#### P2-02: Add performance budgets, queue SLOs, operational dashboards, and recovery runbooks

#### P2-03: Add non-financial analytics only after transaction-truth events are stable

### Deferred

- CRM campaigns
- Loyalty
- Forecasting
- Recommendation engines
- Generic analytics
- Unproven multi-currency
- Unproven inclusive tax
- Unproven POS serial, lot, or UOM selection
- Unproven fiscal certification
- Broad UI beautification

## Benchmark sources

| System | Reviewed | Reused invariant | Source |
| --- | --- | --- | --- |
| SAP S/4HANA | 2026-08-17 | Sales order, outbound delivery, goods issue, billing, partial fulfillment, and reversal are explicit linked process states. | [Official documentation](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/25a41481f62e469ba0e61015a0d39d20/610fb16c6f8341e0a0725eeb3abb00ed.html) |
| Microsoft Dynamics 365 Commerce | 2026-08-17 | Shift close precedes statement calculation/posting; statements create sales, invoices, payment journals, and inventory consequences. | [Official documentation](https://learn.microsoft.com/en-us/dynamics365/commerce/retail-statements) |
| Oracle NetSuite | 2026-08-17 | Sales orders are non-posting; physical fulfillment posts COGS and inventory; invoices post AR and revenue; immediate assured payment uses cash-sale semantics. | [Official documentation](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N1459773.html) |
| Odoo | 2026-08-17 | POS session, counted cash, payment method, receipt/invoice, stock movement, correction document, and accounting posting are linked but distinct. | [Official documentation](https://www.odoo.com/documentation/18.0/applications/sales/point_of_sale.html) |

## Security references

- [PCI DSS v4.0.1](https://www.pcisecuritystandards.org/document_library/) — Scope minimization, no PAN/CVV/PIN in application logs or evidence, secure payment-provider boundary, and qualified assessment requirement.
- [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS) — Verification baseline for authorization, authentication freshness, sensitive-data protection, logging, input validation, and API controls.

## Verification

| Command | Status | Result |
| --- | --- | --- |
| `git status --short` | OBSERVED_DIRTY | User-owned modified and untracked files were present before artifact creation and were preserved. |
| `npm run typecheck` | PASSED | Exit 0 |
| `npm run prisma:validate` | PASSED | Schema valid; exit 0 |
| `npx jest --runTestsByPath <8 focused suites> --runInBand` | PASSED | 8/8 suites and 99/99 tests passed in 40.351 seconds |
| `npm run workflow:assurance:runtime-check` | PASSED | 7/7 runtime tables, 3/3 migration rows, 0 blockers |
| `npm run inventory:valuation:truth:gate` | PASSED_EQUIVALENT_WITH_TEMP_OUTPUT | 6/6 checks, 0 blockers |
| `npm run payment:cash-truth:gate` | PASSED_EQUIVALENT_WITH_TEMP_OUTPUT | 14/14 checks, 0 blockers |
| `npm run ledger:close-truth:gate` | PASSED_EQUIVALENT_WITH_TEMP_OUTPUT | 10/10 checks, 0 blockers |
| `npm run offline:pos:replay:gate` | PASSED_EQUIVALENT_WITH_TEMP_OUTPUT | 16/16 checks, 0 blockers |
| `npm run receipt:token:config-gate` | PASSED_WITH_WARNING | 4/4 checks, 0 blockers, production token secret absent, release enforcement off |
| `npm run module:surface:inventory` | REPORT_COMPLETED_WITH_TEMP_OUTPUT | 408 surfaces, 367 mapped classifications, 292 enforcement-candidate classifications, 79 missing-permission classifications |

## Success-criteria assessment

| Criterion | Status |
| --- | --- |
| Every material sales transition has one authoritative owner and an explicit state contract | NOT_MET |
| Immediate POS and delivery/on-account sales are separated without duplicating kernels | PARTIAL |
| Sale retries return the original result safely | NOT_MET |
| Electronic payments have provider-owned pending, unknown, captured, and settled semantics | NOT_MET |
| Every completed sale has immutable receipt/fiscal-source evidence independent of delivery | NOT_MET |
| Inventory quantity and COGS move at the correct physical event | MET_FOR_IMMEDIATE_POS_NOT_MET_FOR_DELIVERY |
| All material accounting consequences are balanced and source-linked | PARTIAL_LOCAL_EVIDENCE_ONLY |
| Refunds, voids, and returns preserve original history | PARTIAL |
| Shift close, statement posting, reconciliation, and accounting close are distinct and observable | PARTIAL |
| Offline events are signed, ordered, replay-safe, conflict-aware, and resolvable | IMPLEMENTED_NOT_FIELD_PROVEN |
| Tenant isolation, RBAC, entitlement, fresh auth, redaction, auditability, and separation of duties are tested | PARTIAL |
| Final report distinguishes local evidence from production proof and lists unresolved blockers | MET_BY_THIS_AUDIT |
| Phased plan is executable by future Codex runs without guessing | MET_BY_THIS_AUDIT |

## Reviewer decisions required

| Reviewer | Decision |
| --- | --- |
| Product | Confirm immediate-sale versus delivery-order scope, partial fulfillment, invoice timing, and supported tender/channel combinations. |
| Accounting controller | Approve event-to-posting rules, clearing/fee/chargeback accounts, tax timing, AR timing, close gates, and correction policy. |
| Inventory controller | Approve reservation, availability, goods issue, return disposition, valuation, negative-stock, lot/serial, and UOM policy. |
| Payments and treasury | Approve provider state normalization, unknown-payment handling, settlement tolerance, suspense, fees, disputes, and chargebacks. |
| Security | Approve payment-data scope, provider webhook trust, RBAC/entitlement map, fresh-auth thresholds, maker-checker policy, redaction, and evidence retention. |
| Country-pack qualified human | Approve dated receipt fields, legal numbering, tax timing, fiscal authority workflow, retention, correction, and offline provisional-document rules. |
| Operations and support | Approve cashier recovery, offline conflict resolution, shift handover, business-day close, dead-letter ownership, and incident runbooks. |
| Accessibility | Verify keyboard, focus, screen-reader, touch-target, contrast, responsive cart, error, recovery, and receipt-delivery workflows. |
| SRE and release | Approve SLOs, alerts, provider/fiscal worker health, backups, restore evidence, load limits, rollout, rollback, and production proof. |
| AI governance | No AI decision or autonomous financial mutation is required for this sales-to-cash kernel; any future AI assistance must remain evidence-bounded and human-approved. |

## Certification boundary

This report does not certify production readiness, legal compliance, accounting correctness, PCI DSS compliance, security, or accessibility.
