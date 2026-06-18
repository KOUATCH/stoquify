# AqStoqFlow Deep Product, Market, UX, and Stakeholder Proposal

Date: 2026-06-18

Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

Prepared for: product, design, engineering, sales, partnerships, and leadership.

Status: proposal and implementation blueprint. No code changes are included in this document.

## 1. Purpose

This report evaluates AqStoqFlow as an OHADA-zone SMB operating system. It reviews the core product modules, market opportunity, stakeholder messaging, landing page, register flow, login experience, and the UI/UX changes needed to make the product feel world-class, enterprise-grade, secure, modern, robust, battle-tested, and locally relevant.

The goal is not only to make the product look better. The goal is to make every public and onboarding surface communicate the same strategic truth:

> AqStoqFlow turns daily business activity into trusted OHADA-ready business evidence.

## 2. Source Basis

### Local Product Sources Reviewed

- `graphify-out/GRAPH_REPORT.md`
- `app/[locale]/(home)/page.tsx`
- `components/landing/landing-header.tsx`
- `components/landing/hero.tsx`
- `components/landing/module-grid.tsx`
- `components/landing/connected-workflow.tsx`
- `components/landing/module-deep-dives.tsx`
- `components/landing/pricing-section.tsx`
- `components/landing/trust-section.tsx`
- `components/auth/auth-copy.ts`
- `components/auth/AuthLayout.tsx`
- `components/auth/EnhancedLoginForm.tsx`
- `components/auth/BeautifulRegisterForm.tsx`
- Existing saved proposal: `moat proposals/AQSTOQFLOW_STAKEHOLDER_MARKETING_AND_UX_CHANGE_PROPOSAL_2026-06-18.md`

### External Market and Compliance Sources

- [OHADA AUDCIF official page](https://www.ohada.org/acte-uniforme-relatif-au-droit-comptable-et-a-linformation-financiere-audcif/): confirms the 2017 accounting uniform act, SYSCOHADA revised framework, and its entry into force for personal accounts from 2018 and consolidated/combined/IFRS statements from 2019.
- [BCEAO PI-SPI official page](https://pispi.bceao.int/): confirms the UEMOA direction toward interoperable, instant, secure, 24/7 digital payments, QR payments, alias-based payments, and financial inclusion.
- [IFC MSME Finance](https://www.ifc.org/en/what-we-do/sector-expertise/financial-institutions/msme-finance): frames MSMEs as over 90 percent of firms, about 70 percent of employment, and about 50 percent of GDP worldwide, with a major financing gap.

## 3. Market Thesis

### 3.1 The Real Market Problem

OHADA-zone SMBs do not only have an accounting problem. They have a trust problem across daily operations.

The same business may run:

- POS sales in one place.
- Inventory in spreadsheets or memory.
- Purchases through phone calls and paper.
- Mobile money in provider portals.
- Bank records elsewhere.
- Payroll in spreadsheets.
- Tax and accounting with an external accountant.
- Approvals through WhatsApp.
- Reports manually reconstructed after the fact.

That creates predictable pain:

- Owners do not know whether reported cash is true.
- Accountants rebuild books from incomplete evidence.
- Stock values do not match physical stock.
- Supplier and customer balances become disputed.
- Payroll liabilities are unclear.
- Fraud is discovered late.
- Compliance work becomes stressful and expensive.
- Banks and lenders cannot easily trust business records.

### 3.2 Why This Moment Matters

OHADA accounting gives the region a shared accounting and financial reporting foundation through AUDCIF/SYSCOHADA. This means a serious SMB platform can build a repeatable compliance and accounting spine across multiple countries while still supporting country-specific configuration.

BCEAO PI-SPI also signals the direction of payments in UEMOA: interoperable, instant, secure, QR-capable, and usable across banks, e-money issuers, microfinance institutions, and payment institutions. That makes payment reconciliation a strategic wedge. As payments become more digital and interoperable, merchants will need operational systems that can connect POS, payment evidence, statement lines, settlements, suspense, and accounting.

IFC's MSME framing confirms the size and importance of the segment. The strategic implication is simple: a platform that improves MSME record quality, operational control, and trusted reporting can become useful not only to merchants, but also to accountants, banks, mobile money providers, auditors, and implementation partners.

### 3.3 Recommended Category

AqStoqFlow should be positioned as:

> The OHADA SMB Operating System

Supporting phrases:

- Ledger-first business operating system.
- POS-to-ledger control platform.
- Source-linked operations and accounting platform.
- Compliance-ready SMB operating spine.
- Business evidence platform for OHADA-zone growth.

Avoid leading with:

- "POS app."
- "Inventory software."
- "Accounting software."
- "ERP."
- "Management system."

Those are secondary explanations, not the category-defining promise.

## 4. Product Thesis

AqStoqFlow should present itself around one core operating chain:

`sale -> stock movement -> payment evidence -> reconciliation -> journal entry -> report -> close evidence`

This chain should become the product's main marketing, onboarding, demo, and UX logic.

Every module should be explained by its contribution to that chain:

- POS captures the commercial event.
- Inventory proves quantity and value.
- Payments prove cash movement.
- Reconciliation proves money truth.
- Accounting converts events into OHADA-ready records.
- Compliance governs legal artifacts.
- Payroll turns people operations into liabilities and journals.
- RBAC protects who can do what.
- Audit logs prove who did what and why.
- Reports tell leaders what can be trusted.

## 5. Current Architecture Signal

The graph report shows the system already wants to be this product. Notable graph concepts include:

- Ledger-First OHADA Operating Spine.
- Connected SMB Operations Story.
- Ledger-First Operational Posting.
- Ledger-Backed Compliance Control Plane.
- Enterprise POS Delivery Flow.
- Enterprise RBAC Control Plane.
- Fraud-Resistant RBAC Authorization System.
- Payment Reconciliation Workbench Blueprint.

This means the product strategy should not invent a new direction. It should make the existing architectural direction visible to buyers.

## 6. Strategic Positioning

### 6.1 One-Sentence Positioning

AqStoqFlow helps OHADA-zone SMBs run sales, stock, purchases, payments, payroll, accounting, compliance, and reporting from one secure, ledger-first operating workspace.

### 6.2 Buyer-Facing Promise

"Your business should not depend on disconnected spreadsheets, cash guesses, and month-end reconstruction. AqStoqFlow connects daily operations to accountant-ready evidence."

### 6.3 Enterprise Promise

"AqStoqFlow combines tenant isolation, RBAC, audit trails, source-linked accounting, payment reconciliation, inventory integrity, and compliance-ready reporting so growing SMBs can operate with discipline."

### 6.4 Proof Promise

For every important business event, the system should answer:

- What happened?
- Who did it?
- Which branch, customer, supplier, item, employee, payment, or document was involved?
- Which stock movement resulted?
- Which payment evidence supports it?
- Which journal entry recorded it?
- Which report changed?
- Which close blocker or compliance state was affected?

## 7. Module-by-Module Business Value

### 7.1 POS and Sales

#### Business Role

POS is the front door of business truth. A sale is not only a receipt. It affects revenue, stock, tender, cash drawer, customer balance, tax posture, receipt delivery, audit evidence, and accounting.

#### Business Message

"Every sale becomes payment evidence, stock truth, drawer control, and accounting proof."

#### What To Show

- Sale finalized.
- Tender captured.
- Stock reduced.
- Cash drawer updated.
- Customer ledger updated when applicable.
- Journal entry created.
- Receipt delivered.
- Audit trail stored.

#### Why It Matters

Owners do not simply want faster checkout. They want fewer disputes, less leakage, and cleaner daily close.

#### Proposed UX Component

Replace generic POS cards with a "Sale-to-Ledger Proof Chain."

Expected effect:

- Higher confidence from owners.
- Stronger accountant buy-in.
- Clearer demo narrative.

### 7.2 Inventory and Stock Control

#### Business Role

Inventory protects working capital. For many SMBs, stock is cash sitting on shelves. Wrong stock quantities and wrong stock values directly damage profit.

#### Business Message

"Know what exists, where it is, what it cost, who moved it, and which ledger value proves it."

#### What To Show

- Stock by location.
- Movement history.
- Transfer evidence.
- Count variance.
- Write-off reason.
- Valuation method.
- Inventory-to-ledger tie-out.

#### Why It Matters

Stock control is both operational and financial. The system should present inventory as business capital under control, not just item records.

#### Proposed UX Component

Replace isolated inventory cards with a "Stock Truth Control Panel."

Expected effect:

- Makes inventory feel financially serious.
- Helps owners and accountants understand why stock value matters.

### 7.3 Purchasing and Supplier/AP

#### Business Role

Purchasing controls commitments before cash leaves the business. Supplier/AP controls should connect request, approval, purchase order, receipt, supplier invoice, payable, and payment.

#### Business Message

"Control each purchase from request to supplier payment, with stock and accounting updated at the right step."

#### What To Show

- Purchase request.
- Approval status.
- Purchase order.
- Goods received.
- Supplier invoice.
- Payable due date.
- Payment release.
- Supplier ledger.

#### Why It Matters

Uncontrolled purchasing creates hidden liabilities, stock errors, and cash pressure.

#### Proposed UX Component

Use a "Request-to-Payment Control Board."

Expected effect:

- Stronger multi-branch control story.
- More credible enterprise positioning.

### 7.4 Customers and Receivables

#### Business Role

Customer records should become revenue memory and credit discipline. They should help the business understand who buys, who owes, who pays late, and who deserves credit.

#### Business Message

"Know who buys, who owes, who pays, and where cash is stuck."

#### What To Show

- Customer sales history.
- Balance due.
- Credit limit.
- Aging buckets.
- Payment history.
- Statement export.
- Source-linked ledger entries.

#### Why It Matters

Sales without receivables discipline becomes cash stress.

#### Proposed UX Component

Use "Customer Risk and Relationship Cards."

Expected effect:

- Turns customer data into action.
- Helps managers see cash recovery opportunities.

### 7.5 Suppliers and Payables

#### Business Role

Supplier data should explain obligations, delivery performance, purchase costs, and cash commitments.

#### Business Message

"Keep supplier orders, receipts, invoices, balances, and payments aligned."

#### What To Show

- Supplier order history.
- Open purchase orders.
- Received-not-invoiced goods.
- Payables due.
- Payment terms.
- Supplier statement.
- Supplier ledger tie-out.

#### Why It Matters

The owner needs to know what the business owes before approving new spending.

#### Proposed UX Component

Use "Supplier Obligation Timelines."

Expected effect:

- Better cash planning.
- Better procurement discipline.

### 7.6 Finance and Cash Control

#### Business Role

Finance is the owner's command center. It should explain cash, obligations, receivables, payables, payment exceptions, profitability, and trust status.

#### Business Message

"See what cash is confirmed, what is pending, what is disputed, and what needs attention."

#### What To Show

- Confirmed cash.
- Pending settlements.
- Cash drawer variance.
- Receivables aging.
- Payables due.
- Suspense items.
- Profitability indicators.
- Close blockers.

#### Why It Matters

SMB owners do not only need charts. They need decisions and exceptions.

#### Proposed UX Component

Use a "Financial Confidence Meter" plus "Exception Queue."

Expected effect:

- More useful than generic dashboards.
- Stronger perception of control.

### 7.7 Payment Reconciliation

#### Business Role

Payment reconciliation can become one of AqStoqFlow's strongest moats. Modern merchants receive money through cash, card, bank transfer, mobile money, QR, mixed tenders, and on-account balances. Without reconciliation, sales numbers and actual money diverge.

#### Business Message

"Match every payment to the sale, provider event, statement line, settlement, suspense item, and ledger impact."

#### What To Show

- Internal payment.
- Provider event.
- Statement line.
- Match status.
- Suspense queue.
- Settlement.
- Reconciliation certificate.
- Ledger posting.

#### Why It Matters

BCEAO PI-SPI's emphasis on interoperable instant payments reinforces the need for merchant systems that can handle payment evidence and reconciliation across providers.

#### Proposed UX Component

Use a "Payment Evidence Workbench."

Expected effect:

- Premium enterprise perception.
- Strong bank/mobile money partnership story.
- Clear accountant value.

### 7.8 Accounting and OHADA Reports

#### Business Role

Accounting is the trust core. It should not be presented as a module at the end of the chain. It is the operating spine that records and proves financial consequences.

#### Business Message

"Your daily operations generate source-linked OHADA accounting records instead of month-end reconstruction."

#### What To Show

- Chart of accounts.
- Posting rules.
- Journal entries.
- Source links.
- Trial balance.
- Close blockers.
- Close pack.
- Export readiness.

#### Why It Matters

AUDCIF/SYSCOHADA gives the region a serious accounting framework. AqStoqFlow should show that its operating events can feed controlled accounting outputs.

#### Proposed UX Component

Use an "OHADA Close Pack Preview."

Expected effect:

- Strong accountant interest.
- Higher trust with auditors, lenders, and serious business owners.

### 7.9 Compliance and Country Packs

#### Business Role

Compliance should be treated as a managed lifecycle, not a static settings page. Country packs can become a moat if they are versioned, evidence-backed, expert-reviewed, and honest about readiness status.

#### Business Message

"Configure country rules, fiscal documents, statutory workflows, and evidence without breaking operational truth."

#### What To Show

- Country pack.
- VAT/report settings.
- Fiscal document lifecycle.
- Authority adapter status.
- Submission queue.
- Rejection handling.
- Evidence archive.
- Expert review status.

#### Why It Matters

Trust increases when the product does not overclaim. A clear status model is better than pretending all countries are fully certified.

#### Proposed UX Component

Use "Country Pack Status Cards":

- Planned.
- Configured.
- Expert-reviewed.
- Sandbox-tested.
- Production-ready.

Expected effect:

- Credible compliance story.
- Lower legal and reputational risk.

### 7.10 Payroll and Presence

#### Business Role

Payroll connects employees, contracts, attendance, leave, gross pay, deductions, employer contributions, net pay, liabilities, payslips, and journal postings.

#### Business Message

"Turn attendance and contracts into controlled payroll, payslips, liabilities, and accounting evidence."

#### What To Show

- Employee profile.
- Attendance/presence.
- Payroll run.
- Approval.
- Payslip.
- Payment.
- Statutory liability.
- Payroll journal.

#### Why It Matters

Payroll mistakes create employee disputes, hidden liabilities, and accounting gaps.

#### Proposed UX Component

Use a "Payroll Control Timeline."

Expected effect:

- Stronger HR and accountant appeal.
- Better explanation of payroll as a controlled event chain.

### 7.11 RBAC, Tenant Isolation, and Security

#### Business Role

Security is not only IT protection. It is anti-fraud business control.

#### Business Message

"Every user sees and does only what their role, branch, module, and authority allow."

#### What To Show

- Tenant workspace.
- Role.
- Permission.
- Branch/location scope.
- Module gate.
- Sensitive action step-up.
- Audit log.

#### Why It Matters

Owners want delegation without losing control.

#### Proposed UX Component

Use a "Role Control Matrix" and "Sensitive Action Gate" preview.

Expected effect:

- Makes security concrete.
- Supports enterprise-grade perception.

### 7.12 Offline POS and Replay

#### Business Role

Offline POS is not just "works without internet." The real value is controlled continuity with safe replay into stock, payments, compliance, and accounting.

#### Business Message

"Keep selling during network interruptions, then replay every event safely into business truth."

#### What To Show

- Device identity.
- Offline queue.
- Signed event envelope.
- Reconnection.
- Replay validation.
- Conflict review.
- Ledger/report update.

#### Why It Matters

Connectivity interruptions are practical business risks. A serious SMB platform should reduce revenue interruption without hiding risk.

#### Proposed UX Component

Use an "Offline Continuity Strip."

Expected effect:

- Strong regional fit.
- Better operational resilience story.

### 7.13 Analytics and Reporting

#### Business Role

Analytics should not be decorative. It should tell owners what is profitable, what is leaking, what is delayed, what is risky, and what is ready to close.

#### Business Message

"Turn daily operations into decisions you can trust."

#### What To Show

- Margin risk.
- Stock drift.
- Payment exceptions.
- Aging receivables.
- Payables due.
- Payroll liabilities.
- Close readiness.
- Branch comparisons.

#### Why It Matters

The best analytics surface should become the owner's daily operating brief.

#### Proposed UX Component

Use "Decision Cards" with "Trust Badges."

Expected effect:

- Better executive value.
- Clearer difference from generic BI charts.

## 8. Stakeholder Message Matrix

### 8.1 Owner / CEO / Founder

#### What They Need To Hear

"AqStoqFlow helps you stop discovering business problems too late. You can see sales, stock, cash, debts, obligations, payroll, and accounting readiness while the business is running."

#### What They Need To See

- Daily command center.
- Sale-to-ledger chain.
- Cash confidence.
- Stock exceptions.
- Receivables and payables.
- Branch comparison.
- Close readiness.

#### What They Need To Understand

This is not only software. It is control over money, stock, people, and reporting.

#### Best Channels

- Chambers of commerce.
- SMB owner communities.
- WhatsApp business groups.
- Retail/restaurant/pharmacy associations.
- Bank SME programs.
- Accountant referrals.
- POS reseller networks.

#### Primary CTA

"Book a business control review."

### 8.2 Accountant / Bookkeeper / Accounting Firm

#### What They Need To Hear

"AqStoqFlow gives you source-linked journals, trial balance, reconciliation status, close blockers, and client-ready evidence instead of scattered records."

#### What They Need To See

- Accountant portal.
- Journal source links.
- Trial balance.
- Close pack.
- Reconciliation certificate.
- Inventory-to-ledger tie-out.
- Report export.

#### What They Need To Understand

The product can reduce cleanup work and turn them into higher-value advisors.

#### Best Channels

- Accounting firm partner program.
- OHADA/SYSCOHADA webinars.
- Professional training.
- Client cleanup checklists.
- Accountant portfolio dashboard demos.

#### Primary CTA

"Join the accountant partner program."

### 8.3 Cashier / Store Operator

#### What They Need To Hear

"Sell quickly, accept the correct payment, close your shift clearly, and avoid disputes."

#### What They Need To See

- Fast checkout.
- Tender clarity.
- Receipt confirmation.
- Offline indicator.
- Shift close.
- Drawer expected vs counted.

#### What They Need To Understand

The system protects them from confusion and blame by preserving evidence.

#### Best Channels

- In-store demos.
- POS hardware bundles.
- Short training videos.
- Implementation workshops.

#### Primary CTA

"Try a guided POS demo."

### 8.4 Stockkeeper / Inventory Manager

#### What They Need To Hear

"Every stock movement has a reason, location, actor, quantity, and value impact."

#### What They Need To See

- Stock by branch.
- Transfer status.
- Count variance.
- Write-off approval.
- Movement timeline.
- Stock valuation.

#### What They Need To Understand

Stock control becomes provable, not personal argument.

#### Best Channels

- Distributor networks.
- Warehouse/retail operations groups.
- Inventory control workshops.
- Industry-specific demos.

#### Primary CTA

"Run a stock control assessment."

### 8.5 Procurement / Supplier Manager

#### What They Need To Hear

"Control purchases before they become liabilities, and know exactly what was ordered, received, invoiced, and paid."

#### What They Need To See

- Approval queue.
- Purchase order lifecycle.
- Goods receipt.
- Invoice match.
- Supplier payable.
- Supplier performance.

#### What They Need To Understand

Procurement control protects cash and stock accuracy.

#### Best Channels

- Distributor and wholesaler ecosystems.
- Procurement webinars.
- Operations consultants.
- Supplier network partnerships.

#### Primary CTA

"Map your request-to-payment workflow."

### 8.6 HR / Payroll Manager

#### What They Need To Hear

"Connect employee records, attendance, payroll, approvals, payslips, payments, and liabilities."

#### What They Need To See

- Employee profile.
- Attendance summary.
- Payroll run state.
- Approval flow.
- Payslip preview.
- Liability summary.

#### What They Need To Understand

Payroll becomes controlled and explainable.

#### Best Channels

- Employer associations.
- HR communities.
- Accountant-led payroll clinics.
- Payroll compliance webinars.

#### Primary CTA

"Review payroll readiness."

### 8.7 Auditor / Tax Advisor / Compliance Consultant

#### What They Need To Hear

"AqStoqFlow preserves source-linked evidence, audit trails, controlled corrections, and report traceability."

#### What They Need To See

- Audit log.
- Fiscal document lifecycle.
- Source-linked report lines.
- Reversals instead of destructive edits.
- Period close state.
- Country pack status.

#### What They Need To Understand

The product is designed around evidence, not only data entry.

#### Best Channels

- Audit firm relationships.
- Tax advisor networks.
- Compliance workshops.
- Institutional pilots.

#### Primary CTA

"Review a sample close evidence pack."

### 8.8 Bank / Mobile Money / Fintech Partner

#### What They Need To Hear

"AqStoqFlow helps merchants convert payment activity into reconciled business evidence, creating cleaner merchant records and stronger financial-service opportunities."

#### What They Need To See

- Provider event ingestion.
- Statement import.
- Payment matching.
- Suspense resolution.
- Settlement tracking.
- Merchant financial confidence indicators.

#### What They Need To Understand

The product can improve merchant data quality and enable better SME services.

#### Best Channels

- Bank SME units.
- Mobile money merchant teams.
- Fintech API partnership programs.
- Co-marketing pilots.

#### Primary CTA

"Explore a merchant reconciliation pilot."

### 8.9 Software Integrator / Implementation Partner

#### What They Need To Hear

"AqStoqFlow gives you a repeatable OHADA SMB platform with country-aware setup, role templates, module gates, and rollout packages."

#### What They Need To See

- Implementation checklist.
- Role templates.
- Country pack setup.
- Branch rollout plan.
- Import/migration path.
- Support diagnostics.

#### What They Need To Understand

They can build services around deployment, training, support, and customization without creating chaos.

#### Best Channels

- Local IT services firms.
- POS installers.
- ERP consultants.
- Accounting software implementers.

#### Primary CTA

"Become an implementation partner."

## 9. Landing Page Analysis and Proposal

### 9.1 Current Composition

The landing page currently composes:

- Hero.
- Operations map.
- Disconnect problem.
- Connected workflow.
- Product gallery.
- Module grid.
- Module deep dives.
- Automation section.
- Trust section.
- Use cases.
- Pricing.
- Final CTA.

This is a strong foundation. The issue is not missing sections. The issue is that the page should be reorganized around proof, stakeholders, and operating workflows.

### 9.2 Header and Navigation

Current header uses generic anchors:

- Product.
- Workflow.
- Trust.
- Pricing.

It also displays "StockFlow" while auth surfaces display "AQSTOQFLOW." This brand split can confuse buyers.

#### Proposed Header

Recommended nav:

- Workflows.
- Owners.
- Accountants.
- Trust.
- Partners.
- Rollout.

Recommended CTAs:

- Primary: "Book readiness review."
- Secondary: "Start guided setup."

#### Expected Effect

- Visitors self-identify faster.
- Accountants and partners feel invited.
- Pricing becomes less commodity-like.
- Brand consistency improves perceived maturity.

### 9.3 Hero

Current hero is visually strong, but its CTAs and metrics should become more evidence-led. The current secondary CTA uses a play icon but points to pricing, which creates intent mismatch.

#### Proposed Hero

Headline:

"Run your OHADA business from sale to ledger truth."

Supporting copy:

"AqStoqFlow connects POS, inventory, purchases, payments, payroll, accounting, compliance, and reports so every important business event becomes trusted evidence."

Primary CTA:

"Book an OHADA readiness review"

Secondary CTA:

"See the sale-to-ledger workflow"

Proof strip:

- Sale-to-ledger traceability.
- Payment reconciliation evidence.
- Stock value tie-out.
- Role-based controls.
- Close-ready reports.

#### Expected Effect

- Stronger first impression.
- More credible enterprise positioning.
- Clearer distinction from POS-only or accounting-only tools.

### 9.4 Hero Visual

Replace the hero dashboard emphasis with a workflow proof visual:

`Sale finalized -> Stock reduced -> Payment matched -> Journal posted -> Report updated -> Close evidence ready`

The current `HeroDashboard` can still exist, but it should be reframed as evidence of the workflow rather than a decorative dashboard.

#### Expected Effect

- The first viewport explains the moat.
- Sales teams can repeat the story easily.
- Non-technical buyers understand the product faster.

### 9.5 Module Grid

Current `ModuleGrid` lists many modules: POS, inventory, purchasing, suppliers, customers, finance, accounting, compliance, reconciliation, payroll, transfers, locations, security, analytics.

That proves breadth, but it can feel overwhelming.

#### Proposed Replacement

Use a three-layer module story:

1. Operating workflows:
   - Sell and close shift.
   - Buy and receive stock.
   - Reconcile payments.
   - Pay employees.
   - Close the accounting period.

2. Stakeholder views:
   - Owner command center.
   - Accountant portal.
   - Cashier POS.
   - Stock control.
   - Finance and reconciliation.
   - Compliance center.

3. Evidence artifacts:
   - Receipt.
   - Inventory movement.
   - Payment match.
   - Journal entry.
   - Audit log.
   - Close pack.

#### Expected Effect

- Reduces cognitive load.
- Makes the modules feel connected.
- Helps each buyer find themselves.

### 9.6 Connected Workflow

Current `ConnectedWorkflow` uses a horizontal carousel of module cards with progress bars. The concept is right, but the visual should become a real operating chain.

#### Proposed Replacement

Use a "Workflow Evidence Timeline" with selectable examples:

- Retail sale.
- Supplier purchase.
- Mobile money settlement.
- Payroll approval.
- Inventory count.
- Period close.

Each example should show:

- Trigger.
- Operational records.
- Financial records.
- Evidence.
- Exception handling.
- Report impact.

#### Expected Effect

- Stronger educational value.
- Better demo readiness.
- More convincing enterprise story.

### 9.7 Module Deep Dives

Current `ModuleDeepDives` uses percentage bars with hardcoded values. That is risky because visitors may ask what the percentages mean.

#### Proposed Replacement

Use proof cards instead of arbitrary percentages:

- Source document.
- Approval.
- Ledger posting.
- Reconciliation status.
- Exception state.
- Export artifact.

#### Expected Effect

- Builds trust.
- Avoids fake-looking metrics.
- Aligns with auditability.

### 9.8 Trust Section

Current trust cards are a good start, but should be more concrete.

#### Proposed Trust Cards

- Tenant isolation.
- Role-based access and step-up.
- Ledger-first postings.
- Immutable journals and reversals.
- Source-linked reports.
- Country-pack readiness.
- Payment evidence.
- Offline replay controls.

#### Expected Effect

- Makes security practical.
- Helps enterprise buyers justify interest.
- Reinforces compliance without overclaiming.

### 9.9 Pricing Section

Current pricing uses Starter, Growth, and Enterprise cards with "choose" CTA to register. For this product, a simple pricing card risks making AqStoqFlow feel like a commodity SaaS tool.

#### Proposed Replacement

Use rollout packages:

##### Starter Shop

For single-location businesses needing POS, stock, cash drawer, and basic reports.

CTA: "Start guided setup."

##### Growth Operations

For multi-branch SMBs needing POS, stock, purchasing, finance, accounting, and RBAC.

CTA: "Book rollout planning."

##### Accountant Portfolio

For accounting firms setting up and managing multiple client workspaces.

CTA: "Join accountant partner program."

##### Enterprise / Regulated Rollout

For businesses needing integrations, compliance adapters, advanced RBAC, audit evidence, and implementation support.

CTA: "Request solution review."

#### Expected Effect

- Better lead qualification.
- Higher perceived value.
- More realistic for implementation-heavy buyers.

## 10. Register Flow Analysis and Proposal

### 10.1 Current Register Strengths

The current register form already has:

- Multi-step flow.
- Personal, company, and security steps.
- Password strength.
- Company size.
- Industry.
- Country, state, address.
- Currency, timezone, default locale.
- Tenant workspace messaging.

This is a useful base.

### 10.2 Current Register Weaknesses

Key issues:

- The flow starts with personal identity instead of business context.
- The phone placeholder uses a non-regional `+1` style example.
- Currency options include many non-core currencies while OHADA focus should prioritize XAF and XOF.
- Country is a free text field instead of a country-pack decision point.
- The register flow does not ask who is setting up the workspace.
- The form does not route accountant, owner, partner, and fintech evaluator differently.
- The copy uses terms like "tenant" and "module gates" that are accurate but not always buyer-friendly.

### 10.3 Proposed Register Flow

#### Step 1: Business Context

Fields:

- Country.
- Currency.
- Business type.
- Number of branches.
- Main operational pain.

Pain options:

- POS and cash control.
- Stock control.
- Accounting cleanup.
- Payment reconciliation.
- Payroll.
- Multi-branch control.
- Full operating system.

#### Step 2: Setup Role

Question:

"Who are you setting this up for?"

Options:

- I own or manage the business.
- I am the accountant/bookkeeper.
- I am an implementation partner.
- I am evaluating for a bank, mobile money provider, or fintech.

#### Step 3: Company Identity

Fields:

- Company name.
- Trade name.
- Industry.
- Business address.
- Tax identifier when available.
- First branch/location.

#### Step 4: Admin User

Fields:

- Full name.
- Work email.
- Country-aware phone.
- Password.
- Terms.

#### Step 5: Recommended Setup

Show recommended modules:

- POS.
- Inventory.
- Accounting.
- Payment reconciliation.
- Payroll.
- Compliance.
- RBAC roles.

Give two CTAs:

- "Create workspace."
- "Book assisted setup."

### 10.4 Register Copy Recommendations

Replace:

"Create the tenant that will run your operations."

With:

"Create your business workspace."

Replace:

"Capture the organization context used for modules, country packs, branch controls, and administrator access."

With:

"Set up your country, business type, first branch, admin user, and recommended modules. AqStoqFlow will guide the rest."

Replace:

"AqStoqFlow prepares tenant scope, module gates, and evidence-ready defaults."

With:

"AqStoqFlow prepares a secure workspace where your team can manage sales, stock, payments, accounting, and reports with the right permissions."

### 10.5 Register UI Recommendations

- Convert country to a country-pack selector.
- Prioritize XAF and XOF currencies.
- Use country-aware phone examples.
- Add setup role cards.
- Add assisted setup CTA.
- Add "accountant setting this up for a client" path.
- Add regional trust note.
- Add explanation of what happens after registration.

### 10.6 Expected Effects

- Higher conversion because the form feels locally relevant.
- Better sales segmentation.
- Better onboarding data.
- Lower confusion for accountants and partners.
- Stronger enterprise perception from the first interaction.

## 11. Login Experience Analysis and Proposal

### 11.1 Current Login Strengths

The current login form has:

- Modern visual treatment.
- Email/password access.
- Locale-aware routing.
- Forgot password.
- Success/error notifications.
- Disabled SSO/passkey affordances.
- Security language.
- Auth method section.

### 11.2 Current Login Weaknesses

Key issues:

- Login has too much marketing density for returning users.
- SSO and passkey buttons appear even though they are unavailable.
- The side panel lists many modules, which can distract from access.
- The copy is accurate but heavy.
- Returning cashiers and managers need speed more than education.

### 11.3 Proposed Login Positioning

Headline:

"Sign in to your workspace."

Supporting copy:

"Access your business operations, reports, approvals, and close evidence."

Security note:

"Your access is protected by workspace scope, role permissions, and audit trails."

### 11.4 Proposed Login Layout

Keep:

- Email.
- Password.
- Forgot password.
- Remember me if actually respected by auth.
- Locale switch.
- Theme switch.

Change:

- Remove unavailable SSO/passkey buttons until enabled.
- Replace module-heavy side panel with trust/status panel.
- Add workspace selector when users belong to multiple organizations.
- Add invite/verification help path.
- Add support link for locked accounts.

### 11.5 Proposed Trust Panel

Show:

- Protected workspace.
- Role-based access.
- Audit trails.
- Sensitive actions protected.
- Offline POS replay after reconnect.
- Reports generated from source-linked events.

### 11.6 Expected Effects

- Faster login.
- Less cognitive load.
- Better trust.
- More professional enterprise daily-use experience.
- Fewer support questions around disabled auth methods.

## 12. UI/UX Component Replacement Plan

### 12.1 Replace Feature Grid With Stakeholder Tabs

Current issue:

Feature grids make visitors work to understand relevance.

Replacement:

Tabs for Owner, Accountant, Cashier, Stockkeeper, Payroll/HR, Bank/Partner.

Expected effect:

- Faster self-identification.
- Better emotional relevance.
- Better sales demo path.

### 12.2 Replace Progress Bars With Evidence Cards

Current issue:

Hardcoded percentages can look artificial.

Replacement:

Evidence cards for receipt, stock movement, payment match, journal entry, audit log, close pack.

Expected effect:

- Higher trust.
- Better audit/compliance perception.

### 12.3 Replace Generic Dashboard Metrics With Trust Metrics

Current issue:

Generic metrics are easy to ignore.

Replacement:

Trust metrics:

- Payments unreconciled.
- Stock variance.
- Close blockers.
- Pending approvals.
- Source-linked reports.
- Open suspense.

Expected effect:

- Better business credibility.
- More useful product storytelling.

### 12.4 Replace Pricing Cards With Rollout Packages

Current issue:

Simple pricing may commoditize the product.

Replacement:

Starter Shop, Growth Operations, Accountant Portfolio, Enterprise / Regulated Rollout.

Expected effect:

- Stronger premium positioning.
- Better lead qualification.
- More realistic sales motion.

### 12.5 Replace Register Stepper With Guided Workspace Setup

Current issue:

The current stepper is useful but starts from the user, not the business.

Replacement:

Business context -> setup role -> company identity -> admin user -> recommended setup.

Expected effect:

- Better segmentation.
- Better onboarding.
- Better regional fit.

### 12.6 Replace Login Marketing Panel With Trust and Workspace Panel

Current issue:

Returning users need confidence and speed.

Replacement:

Workspace status, role, security, last access, help, and support.

Expected effect:

- Faster daily use.
- Stronger enterprise feel.
- Less distraction.

## 13. Go-To-Market Strategy

### 13.1 Wedge 1: Accountant-Led Adoption

Why:

Accountants see the pain across many SMBs and can repeatedly recommend the product.

Offer:

- Accountant portal.
- Client workspace setup.
- Close pack.
- Trial balance.
- Source-linked reports.
- Reconciliation status.

Channels:

- Accounting firms.
- OHADA/SYSCOHADA webinars.
- Professional training.
- Accountant partner program.

### 13.2 Wedge 2: POS and Inventory Control

Why:

Owners feel sales, cash, and stock pain every day.

Offer:

- POS.
- Cash drawer.
- Stock movements.
- Offline continuity.
- Daily close.

Channels:

- POS hardware resellers.
- Retail associations.
- Store demos.
- Implementation partners.

### 13.3 Wedge 3: Payment Reconciliation

Why:

Digital and interoperable payments increase the need to match internal records with external payment evidence.

Offer:

- Provider event ingestion.
- Statement import.
- Matching.
- Suspense.
- Settlement.
- Certification.

Channels:

- Banks.
- Mobile money providers.
- Fintech API partnerships.
- Merchant acquisition teams.

### 13.4 Wedge 4: Multi-Branch Control

Why:

Growing SMBs lose control as branches multiply.

Offer:

- Branch comparison.
- Role controls.
- Stock transfers.
- Cash visibility.
- Central accounting.

Channels:

- Retail chains.
- Distributors.
- Pharmacies.
- Restaurants.
- Schools.
- Service groups.

## 14. Practical Roadmap

### Phase 1: Messaging and Brand Alignment

Owners:

- Product leadership.
- Marketing.
- Design.

Deliverables:

- Decide public brand naming: AqStoqFlow vs StockFlow.
- Rewrite hero copy.
- Rewrite core positioning.
- Define stakeholder-specific messages.
- Create source-of-truth message guide.

Success criteria:

- Every page can explain the product in one sentence.
- Brand name is consistent across landing and auth.
- Sales can repeat the same story.

### Phase 2: Landing Page Restructure

Owners:

- Design.
- Frontend.
- Product marketing.

Deliverables:

- New hero workflow visual.
- Stakeholder tabs.
- Evidence artifact cards.
- Workflow evidence timeline.
- Trust controls section.
- Rollout package section.
- Partner/accountant CTA.

Success criteria:

- Visitor can understand the sale-to-ledger chain without a demo.
- Stakeholders can find their section in under 10 seconds.
- Pricing no longer makes the product feel commodity.

### Phase 3: Register Flow Upgrade

Owners:

- Product.
- Frontend.
- Auth/backend.
- Sales operations.

Deliverables:

- Business context first.
- Setup role cards.
- Country-pack selector.
- XAF/XOF-first currency setup.
- Country-aware phone input.
- Assisted setup path.
- Recommended modules screen.

Success criteria:

- Better completion rate.
- Better lead segmentation.
- Better country/module setup quality.

### Phase 4: Login Experience Upgrade

Owners:

- Frontend.
- Auth.
- Support.

Deliverables:

- Simplified login copy.
- Remove unavailable SSO/passkey buttons or clearly mark as disabled roadmap.
- Trust/status panel.
- Workspace selector.
- Invite/verification help.
- Locked-account support path.

Success criteria:

- Faster login.
- Fewer auth support issues.
- Better enterprise confidence.

### Phase 5: Sales and Partner Collateral

Owners:

- Sales.
- Partnerships.
- Product marketing.

Deliverables:

- Owner one-pager.
- Accountant partner one-pager.
- Bank/mobile money reconciliation pilot brief.
- POS reseller brief.
- Implementation partner checklist.
- Demo script by stakeholder.

Success criteria:

- Repeatable sales conversations.
- Partner-ready material.
- Clear pilot offers.

### Phase 6: Measurement and Iteration

Owners:

- Product analytics.
- Marketing.
- Sales operations.

Metrics:

- Hero CTA click-through.
- Stakeholder tab engagement.
- Readiness review bookings.
- Register completion rate.
- Assisted setup requests.
- Demo-to-pilot conversion.
- Accountant partner signups.
- Payment partner pilot conversations.

## 15. Engineering and Compliance Guardrails

Marketing and UX changes must not weaken the product's operating guarantees.

Non-negotiables:

- Tenant scope on every workspace and report.
- RBAC and module gates for sensitive actions.
- Service boundary ownership for business rules.
- Ledger-first accounting for money and stock events.
- Immutable journal lines and correction by reversal.
- Decimal money handling for XAF/XOF.
- Audit logs for mutations and sensitive actions.
- Country-pack versioning for tax, payroll, fiscal, and reporting rules.
- French-first regional content with English as secondary where applicable.
- No production certification claims unless country pack and authority integration status supports them.

## 16. Risks and Controls

### Risk: Overclaiming Compliance

Control:

Use country-pack status levels and avoid saying "certified" unless verified.

### Risk: Product Feels Too Complex

Control:

Use stakeholder tabs and workflow examples instead of module overload.

### Risk: Public Pricing Undervalues Platform

Control:

Use rollout packages and guided review CTAs.

### Risk: Auth Screens Feel Heavy

Control:

Simplify login and move education to landing/register.

### Risk: Register Creates Low-Quality Workspaces

Control:

Capture business context first and recommend setup paths.

### Risk: Sales Message Differs From Product Reality

Control:

Tie every message to visible proof artifacts and real system controls.

## 17. Recommended Copy Bank

### Main Headline

"Run your OHADA business from sale to ledger truth."

### Supporting Copy

"AqStoqFlow connects POS, inventory, purchases, payments, payroll, accounting, compliance, and reports so every important business event becomes trusted evidence."

### Owner Pitch

"Stop discovering missing cash, missing stock, and messy reports after the damage is done. AqStoqFlow gives you daily control over sales, stock, cash, debts, payroll, and accounting readiness."

### Accountant Pitch

"Stop reconstructing books from scattered records. AqStoqFlow gives you source-linked journals, reconciliation status, trial balance, close blockers, and report exports."

### Cashier Pitch

"Sell faster, accept payments clearly, and close your shift with evidence."

### Stockkeeper Pitch

"Know what moved, who moved it, where it went, and what value it carries."

### Bank / Fintech Pitch

"Help merchants turn payment activity into reconciled business evidence that can support better financial services."

### Register CTA

"Create workspace"

### Assisted CTA

"Book assisted setup"

### Login Headline

"Sign in to your workspace."

### Login Trust Note

"Your access is protected by workspace scope, role permissions, and audit trails."

## 18. Final Recommendation

AqStoqFlow's biggest near-term opportunity is to make its true architecture visible. The product already points toward a ledger-first OHADA operating spine. The landing page, register flow, login experience, stakeholder pitches, and sales collateral should all present the same idea:

> AqStoqFlow helps OHADA SMBs trust their business while it is running.

The most important changes are:

1. Reframe the product around sale-to-ledger evidence.
2. Replace feature grids with stakeholder and workflow storytelling.
3. Replace arbitrary metrics with proof artifacts.
4. Replace generic pricing with rollout packages.
5. Turn registration into guided workspace setup.
6. Turn login into a calm, fast, trusted workspace entry.
7. Equip sales and partners with stakeholder-specific pitch assets.

Blueprint ready.
