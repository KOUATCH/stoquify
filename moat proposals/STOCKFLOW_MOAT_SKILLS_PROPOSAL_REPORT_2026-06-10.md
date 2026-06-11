# StockFlow Moat Skills Proposal Report

Date: 2026-06-10  
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`  
Purpose: propose the highest-leverage Codex skills that can help transform StockFlow/AqStoqFlow into a world-class, secured, robust, enterprise-grade OHADA SMB operating system for accounting, POS, payroll, inventory, finance, purchasing, payments, audit, and compliance.

## Executive Summary

The system already has valuable enterprise foundations: a large Next.js + Prisma + PostgreSQL SaaS codebase, BetterAuth/RBAC, accounting services, POS services, error-handling infrastructure, audit logging, seed data, and a Graphify knowledge graph. The strongest moat is not more screens. The strongest moat is a verified event-truth platform where every sale, payment, stock movement, payroll run, refund, supplier invoice, cash drawer close, and period close reconciles through the same tenant-scoped, auditable, ledger-first backbone.

The proposed skills below are not ordinary productivity prompts. They are repeatable build and review disciplines that force every future feature to protect money, stock, access, legal evidence, and OHADA/SYSCOHADA reportability. If these skills are installed and used consistently, they can make the product unusually hard to copy because competitors would need to replicate not only UI modules, but the domain correctness, regulatory memory, audit discipline, payment reconciliation, country packs, and operational workflows behind them.

Recommended first wave:

1. `ledger-first-business-events`
2. `ohada-compliance-oracle`
3. `stockflow-data-trust-certifier`
4. `ohada-payroll-engine`
5. `payment-reconciliation-moat`

These five create the core moat. The remaining skills deepen it into a defensible 10-year platform advantage.

## Evidence From The Current System

Local repo signals:

- `graphify-out/GRAPH_REPORT.md` reports 554 files, 2,221 nodes, 3,008 edges, and 72 detected communities.
- The graph's most connected nodes include `localizePath()`, `pickLocale()`, `SystemMonitor`, `useNotifications()`, `getSession()`, `ResilientDatabase`, `CircuitBreaker`, `ErrorHandler`, `scopedOrg()`, and `requireOrg()`. These are not isolated helpers; they are cross-module reliability and tenant-scope bridges.
- The Prisma schema already contains accounting backbone models such as `OrganizationAccountingSettings`, `FiscalYear`, `AccountingPeriod`, `ChartOfAccount`, `Journal`, `JournalEntry`, `JournalEntryLine`, `LedgerPostingBatch`, `AccountingSourceLink`, `PostingRule`, and `LedgerAuditEvent`.
- The schema also contains POS, inventory, purchasing, production, customer/supplier ledger, payment, refund, and audit models.
- Payroll is visible in permissions and accounting source enums, but no full payroll domain model was found in the inspected schema. That makes payroll the largest missing enterprise domain.
- `actions/analytics/financial-analytics.ts` contains estimated expenses, salary, rent, marketing, income tax, and payroll tax calculations. This is useful for early dashboards but risky for an enterprise finance product unless clearly separated from legal/accounting reporting.
- `FinancialSafety` appears as a thin graph community, while `ResilientDatabase`, `CircuitBreaker`, and `ErrorHandler` are highly connected. That suggests the error/resilience layer exists, but financial safety should become a more central enforced pattern.

External regulatory/product context:

- OHADA's AUDCIF/SYSCOHADA is the accounting and financial information framework. OHADA lists AUDCIF adoption as 26 January 2017, publication as 15 February 2017, and entry into force as 1 January 2018 for personal accounts and 1 January 2019 for consolidated, combined, and IFRS financial statements. Source: https://www.ohada.org/acte-uniforme-relatif-au-droit-comptable-et-a-linformation-financiere-audcif/
- BCEAO's PI-SPI is a regional instant payment infrastructure for UEMOA, supporting interoperable payments between banks, electronic money issuers, microfinance institutions, and payment institutions, with alias/QR oriented flows and 24/7 instant execution. Source: https://pispi.bceao.int/

## What "Moat" Means Here

For this product, a moat is not a marketing claim. A real moat is a capability that is hard to reproduce because it combines domain data, product workflow, engineering discipline, regional regulation, and accumulated operational proof.

The strongest moat candidates are:

- Event truth: every business event has one source of truth and one audit trail.
- Ledger-first design: all money and stock consequences reconcile to balanced journal entries.
- Country packs: law, tax, payroll, currency, payment rails, and report names are versioned data, not hardcoded assumptions.
- Trust evidence: users, auditors, tax advisors, and business owners can prove what happened.
- Offline and low-connectivity resilience: POS and stock workflows still work in realistic SMB environments.
- Payment reconciliation: mobile money, cash, bank, card, and PI-SPI style flows reconcile daily.
- AI under controls: assistance is useful, but cannot mutate accounting truth without deterministic checks and approvals.

## Proposed Skills

### 1. `ledger-first-business-events`

Mission: make every money, stock, or legal business event implement the same atomic contract.

It should enforce:

- One Prisma transaction for events that touch stock, cash, payment, customer/supplier ledgers, journal entries, reports, or audit logs.
- Idempotency keys for external or repeatable events.
- Source links from operational records to journal entries.
- Balanced debit/credit journal entries before commit.
- Closed-period rejection.
- Audit log creation with actor, organization, event type, reason, before/after where useful, and source reference.
- No parallel financial truth outside the ledger and subsidiary ledger projections.

Why this matters: it turns POS sale finalization, refunds, supplier payments, stock write-offs, expenses, production, and payroll into one consistent correctness pattern.

Moat created: competitors can copy screens, but they will struggle to reproduce a battle-tested event accounting engine where operational data and legal accounting agree.

First targets:

- `services/pos/pos.service.ts`
- `services/accounting/postings/*`
- `services/accounting/posting.service.ts`
- `services/accounting/invariants.ts`
- `services/purchase-order/*`
- `actions/finance/*`

### 2. `ohada-compliance-oracle`

Mission: make OHADA/SYSCOHADA compliance a build-time and review-time discipline.

It should enforce:

- SYSCOHADA account class mapping and leaf-account posting.
- Legal reportability from real data: livre-journal, grand livre, balance generale, bilan, compte de resultat, TFT, notes annexes, VAT declaration, and livre d'inventaire.
- Fiscal year and accounting period controls.
- Journal immutability after posting.
- Reversals instead of destructive edits.
- Country-specific VAT and reporting packs.
- Evidence retention and export traceability.

Why this matters: accounting software wins on trust. The moment legal reports are built from estimates or detached aggregates, the product loses enterprise credibility.

Moat created: the product becomes an OHADA-native accounting engine, not a generic inventory/POS app with finance dashboards bolted on.

First targets:

- `services/accounting/reports.service.ts`
- `services/accounting/accounts.service.ts`
- `services/accounting/journals.service.ts`
- `services/accounting/default-posting-rules.ts`
- `prisma/schema.prisma`

### 3. `stockflow-data-trust-certifier`

Mission: detect and remove trust-breaking patterns before they reach production.

It should scan for:

- Estimated finance numbers in production reporting paths.
- Mock/sample/demo data leaking into dashboard modules.
- Direct Prisma imports from UI, hooks, or page components.
- Server actions that throw raw errors instead of returning safe discriminated responses.
- Missing `organizationId` scope in tenant data access.
- `parseFloat`, `toFixed`, or Float usage in persisted money paths.
- Debug logging of sensitive data.
- Unversioned business constants for tax, payroll, or legal rates.

Why this matters: trust is lost quietly. One estimated tax dashboard, one tenant-scope leak, or one unguarded export can damage the entire product.

Moat created: every release becomes more trustworthy than the last.

First targets:

- `actions/analytics/financial-analytics.ts`
- `actions/itemsShow/*`
- `hooks/*`
- `components/inventory/*`
- `services/_shared/*`
- `lib/error-handling/*`

### 4. `ohada-payroll-engine`

Mission: build the missing payroll domain as a first-class OHADA SMB module.

It should implement:

- Employee profiles, contracts, job categories, locations, departments, and cost centers.
- Versioned country payroll packs for tax brackets, social contributions, employer charges, employee deductions, allowances, benefits, overtime, leave, advances, and loans.
- Payroll run lifecycle: draft, calculated, reviewed, approved, paid, closed.
- Immutable payslips after approval.
- Corrective payroll runs instead of destructive edits.
- Journal postings for gross salary, employee withholding, employer contributions, net pay, liabilities, and payment settlement.
- Employee self-service payslip access with privacy controls.
- Payroll reports for HR, accounting, and compliance.

Why this matters: payroll is one of the hardest SMB pain points in the OHADA zone, and it is deeply connected to accounting, cash flow, HR, compliance, and employee trust.

Moat created: the product graduates from POS/accounting into a complete SMB operating system.

First targets:

- Add payroll models to `prisma/schema.prisma`.
- Add `services/payroll/*`.
- Add `actions/payroll/*`.
- Add `hooks/payroll/*`.
- Add dashboard routes under payroll.
- Extend accounting posting rules for payroll run and payroll payment.

### 5. `payment-reconciliation-moat`

Mission: make cash, mobile money, bank, card, and PI-SPI style payments reconcile as a daily discipline.

It should implement:

- Provider transaction ingestion with idempotency.
- Webhook signature verification and replay windows.
- Mobile money provider transit accounts under treasury clearing accounts.
- Settlement workflow from provider clearing to bank.
- Cash drawer close and variance accounting.
- Bank/mobile money statement import and matching.
- Exceptions queue for unmatched, duplicate, reversed, delayed, or partial payments.
- Alias/QR payment abstractions for future PI-SPI style flows.

Why this matters: payments are where real-world SMB data becomes messy. The product that reconciles payment truth wins trust.

Moat created: operational finance becomes provable daily, not repaired at month end.

First targets:

- `Payment`
- `PaymentRefund`
- `CashDrawer`
- `CashDrawerTransaction`
- `DailySalesReport`
- `services/pos/*`
- `services/accounting/postings/post-payment.ts`
- `services/accounting/postings/post-reversal.ts`

### 6. `enterprise-fraud-and-controls`

Mission: build internal control into every high-risk workflow.

It should enforce:

- Segregation of duties.
- Step-up authentication for sensitive actions.
- Approval thresholds for discounts, refunds, voids, stock write-offs, account mappings, payroll approval, period close, and report export.
- Suspicious pattern detection for refunds, manual journals, repeated voids, cash variance, inventory shrinkage, permission changes, and after-hours actions.
- Auditor mode with read-only, export-controlled evidence trails.

Why this matters: SMB fraud is often operational, not technical. The product should help owners see and prevent it.

Moat created: the system becomes a control environment, not just a transaction recorder.

### 7. `offline-first-pos-inventory-sync`

Mission: support real-world shops where internet connectivity is imperfect.

It should design:

- Device identity and terminal authorization.
- Offline sale queue with signed local event envelopes.
- Stock reservation and oversell policy.
- Sync idempotency and conflict resolution.
- Local receipt generation with later server certification.
- Queue replay, partial failure handling, and audit logs.
- Manager override flows for offline risk.

Why this matters: an OHADA SMB solution must work in environments where connectivity and power can be inconsistent.

Moat created: competitors that assume always-online POS will fail in the field.

### 8. `regulatory-country-pack-factory`

Mission: turn each OHADA country into versioned product data.

It should generate:

- Country configuration packs for currency, fiscal defaults, VAT rules, payroll rates, statutory report labels, business registration metadata, and payment providers.
- Effective-date versioning.
- Migration and backfill plans when laws change.
- Tests proving old transactions keep old rules and new transactions use new rules.

Why this matters: regional expansion fails when legal and tax differences are hardcoded.

Moat created: country expansion becomes a product capability instead of a consulting project.

### 9. `enterprise-test-and-chaos-auditor`

Mission: generate tests that attack the system like production will.

It should create tests for:

- Double-submit sale finalization.
- Concurrent inventory sale and transfer.
- Payment webhook replay.
- Closed-period posting attempt.
- Tenant escape attempt.
- Large refund requiring step-up and approval.
- Failed journal posting rollback.
- Cash drawer variance.
- Supplier payment settlement.
- Payroll correction after approval.
- Report export with exact filter preservation.

Why this matters: enterprise quality is not proven by happy paths.

Moat created: every hard workflow accumulates regression proof.

### 10. `ai-copilot-with-accounting-guardrails`

Mission: use AI as a controlled assistant, not an uncontrolled bookkeeper.

It should support:

- Natural-language anomaly explanation.
- Draft journal suggestions with deterministic validation.
- Missing account mapping suggestions.
- Reconciliation explanations.
- Inventory shrinkage analysis.
- Payroll variance explanations.
- Owner-facing business summaries in French and English.

Hard rule: AI can suggest, explain, and draft. It cannot post, close, approve, delete, reverse, export sensitive reports, or change permissions without existing service-layer authorization, deterministic validation, and audit evidence.

Why this matters: AI becomes useful without compromising accounting truth.

Moat created: the product can feel modern and intelligent while staying audit-safe.

## Implementation Roadmap

### Phase 1: Protect The Core

Build these first:

1. `ledger-first-business-events`
2. `stockflow-data-trust-certifier`
3. `ohada-compliance-oracle`

Done means:

- Every money/stock event has a declared aggregate list.
- Financial dashboards separate estimates from accounting truth.
- Static scans catch unscoped tenant access, direct UI Prisma access, raw action errors, and unsafe money math.
- Accounting reports are traceable to ledger data.

### Phase 2: Complete The SMB Operating System

Build:

1. `ohada-payroll-engine`
2. `payment-reconciliation-moat`
3. `enterprise-fraud-and-controls`

Done means:

- Payroll is a full domain, not just permissions.
- Payments reconcile through provider, cash, bank, and ledger paths.
- High-risk actions require approvals, step-up, and audit trails.

### Phase 3: Build The Regional Advantage

Build:

1. `offline-first-pos-inventory-sync`
2. `regulatory-country-pack-factory`
3. `enterprise-test-and-chaos-auditor`

Done means:

- The product survives unreliable connectivity.
- New country support is data-driven and versioned.
- Regression tests cover the failure modes that break trust.

### Phase 4: Add Controlled Intelligence

Build:

1. `ai-copilot-with-accounting-guardrails`

Done means:

- AI can explain and draft, but all mutations remain governed by service-layer permissions, deterministic accounting validation, and audit logging.

## Skill Portfolio Priority Matrix

| Skill | Business value | Risk reduction | Moat strength | Urgency |
| --- | --- | --- | --- | --- |
| `ledger-first-business-events` | Very high | Very high | Very high | Immediate |
| `stockflow-data-trust-certifier` | High | Very high | High | Immediate |
| `ohada-compliance-oracle` | Very high | Very high | Very high | Immediate |
| `ohada-payroll-engine` | Very high | High | Very high | Next |
| `payment-reconciliation-moat` | Very high | Very high | Very high | Next |
| `enterprise-fraud-and-controls` | High | Very high | High | Next |
| `offline-first-pos-inventory-sync` | High | High | Very high | Soon |
| `regulatory-country-pack-factory` | High | High | Very high | Soon |
| `enterprise-test-and-chaos-auditor` | Medium | Very high | High | Soon |
| `ai-copilot-with-accounting-guardrails` | High | Medium | High | Later |

## Non-Negotiable Design Principles

1. Services own business rules. UI never owns accounting, inventory, payroll, or permission logic.
2. Tenant scope is mandatory on every tenant-scoped read, write, aggregate, export, and uniqueness rule.
3. Money uses Decimal and persisted two-decimal accounting precision.
4. Inventory transactions are append-only; inventory levels are projections.
5. Posted journal entries are immutable; corrections use reversals.
6. Payroll country rates, tax brackets, and social contribution rates are versioned data.
7. External payment events use idempotency and signature/replay protection.
8. Dashboards must clearly distinguish legal/accounting truth from forecasts or estimates.
9. Every high-risk action is permissioned, step-up protected, and audited.
10. AI never bypasses deterministic accounting and authorization controls.

## Suggested Next Artifact

The best next artifact is a first installed skill named `ledger-first-business-events`, followed immediately by `stockflow-data-trust-certifier`. Together they create a guardrail pair:

- one skill builds the right event architecture;
- the other audits the repo for places that violate it.

After those two are installed, the payroll and payment reconciliation skills can be created with much less risk because they will inherit the same event, ledger, audit, idempotency, tenant, and testing discipline.

## Final Recommendation

Build the moat from the inside out. Start with event truth, accounting truth, and data trust. Then add payroll, payment reconciliation, fraud controls, offline sync, country packs, chaos tests, and controlled AI. This order makes the system stronger with each layer instead of larger and more fragile.

The 10-year lead is created when StockFlow becomes the product that OHADA-zone SMBs can trust for everything that must balance: cash, stock, tax, payroll, suppliers, customers, banks, mobile money, reports, and audit evidence.
