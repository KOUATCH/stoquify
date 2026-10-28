# Stoquify Referral-Worthy Execution Roadmap

Source proposal: `docs/referrals/referral-worthy-platform-features-report.md`

## Executive Thesis

Stoquify should not compete as another accounting, inventory, POS, or payroll tool. It should become the **daily operating truth system** for African/OHADA SMBs: the place where an owner can see whether cash, stock, staff, compliance, and customer obligations are under control today.

The product moat should come from a combination of:

- Service-owned operational truth across POS, inventory, accounting, payroll, and compliance.
- Evidence-backed controls that reduce leakage, fraud, penalty risk, and accountant friction.
- Collaboration surfaces that pull accountants, employees, suppliers, customers, and financing partners into the same business proof network.
- Daily, weekly, and monthly habit loops that make the product difficult to abandon.

The copilot and WhatsApp automation should be treated as experience layers on top of trusted workflows, not as the core product. The core product promise is: **Stoquify helps SMB owners prove what happened, know what matters, and act before money is lost.**

## 1. Strategic North Star

### What Stoquify Should Become

Stoquify should become the control room for cash-heavy, inventory-sensitive, compliance-exposed SMBs. The platform should give owners and accountants a trusted picture of:

- What was sold.
- What cash and mobile money were actually collected.
- What stock moved, disappeared, expired, or needs reorder.
- What customers owe and what suppliers expect.
- What payroll, tax, and compliance obligations are coming.
- Which staff actions require approval or investigation.
- Whether the business is lender-ready and professionally documented.

### Positioning

Recommended positioning:

**Stoquify is the daily business truth and control platform for African SMBs, combining POS, inventory, accounting, payroll, compliance, leakage detection, accountant collaboration, and financing readiness in one trusted operating system.**

This positioning separates Stoquify from:

- Accounting tools that only record transactions after the fact.
- POS tools that stop at selling and receipts.
- Inventory tools that do not connect stock to cash and accountability.
- Payroll tools that do not connect labor cost to operational trust.
- ERP tools that are too heavy for owner-led SMBs.

### Market Thesis

The winning SMB platform in OHADA and similar African markets will be the one that solves trust problems, not merely data-entry problems. The real pain is not "I need software." It is:

- I do not know if cash collected matches what was sold.
- I do not know if stock loss is normal or theft.
- I cannot close the month cleanly for my accountant.
- I cannot prove my business quality to a lender.
- I am afraid of tax, payroll, or compliance mistakes.
- I rely on WhatsApp, notebooks, screenshots, and memory.

Stoquify should replace that uncertainty with daily confidence.

## 2. Feature Pillars

### Pillar 1: Daily Business Truth Dashboard

**User pain:** Owners do not have one reliable daily answer for sales, cash, stock, debts, and risks.

**Target users:** Owners, managers, accountants, multi-location operators.

**Business value:** Drives daily usage, reduces blind spots, and creates the main product habit.

**Technical requirements:**

- Daily operating snapshot service.
- POS sales, cash drawer, payment, inventory, expense, customer, supplier, payroll, and compliance rollups.
- Alert classification: critical, attention, informational.
- Action queue with ownership, due dates, and resolution status.
- Tenant-safe RBAC and audit trail.

**Retention/referral effect:** Owners return every morning because the dashboard answers, "Am I safe today?"

### Pillar 2: Cash Leakage And Fraud Radar

**User pain:** Cash, stock, discounts, refunds, voids, and mobile money payments often disagree, but owners find out too late.

**Target users:** Owners, branch managers, finance leads, auditors.

**Business value:** Directly protects money and justifies premium pricing.

**Technical requirements:**

- Reconciliation engine for POS sales, cash drawer, mobile money, bank deposits, refunds, voids, discounts, and inventory movements.
- Exception model with severity, amount at risk, owner, evidence links, and resolution workflow.
- Suspicious pattern detection by staff, location, terminal, product, and time period.
- Immutable audit events for overrides and approvals.

**Retention/referral effect:** Users recommend what saves them money. Leakage prevention is the highest-emotion value proposition.

### Pillar 3: Accountant Collaboration And Close Pack

**User pain:** Accountants spend too much time chasing receipts, explaining missing records, and cleaning up month-end books.

**Target users:** Accountants, accounting firms, SMB owners, finance/admin staff.

**Business value:** Creates multi-client distribution and accountant-led referrals.

**Technical requirements:**

- Accountant portal with multi-client workspace.
- Close checklist by month and country pack.
- Missing evidence queue: receipts, payment proof, supplier invoices, payroll approvals, tax documents.
- OHADA/SYSCOHADA-ready exports and review notes.
- Redacted client sharing and role-based accountant access.

**Retention/referral effect:** Accountants invite more clients because Stoquify reduces their monthly chaos.

### Pillar 4: Customer And Supplier Statement Hub

**User pain:** Debt, supplier balances, purchase orders, delivery proof, and statement disagreements live in chats and notebooks.

**Target users:** Owners, sales/admin staff, suppliers, customers, accountants.

**Business value:** Improves collections, supplier trust, and external professionalism.

**Technical requirements:**

- Customer statements, supplier statements, invoices, reminders, receipts, purchase orders, delivery acknowledgements.
- Shareable signed links with redaction and expiry.
- Dispute notes and promise-to-pay workflows.
- WhatsApp/email/SMS delivery adapters.

**Retention/referral effect:** External parties see Stoquify-branded professional proof and ask about it.

### Pillar 5: Business Health Score And Financing Passport

**User pain:** SMBs struggle to access credit because records are incomplete, informal, or not lender-ready.

**Target users:** Owners, lenders, MFIs, accountants, suppliers offering trade credit.

**Business value:** Creates premium upgrade pressure and partner channels.

**Technical requirements:**

- Health score service based on revenue trend, gross margin, stock turnover, payment discipline, expense ratio, payroll consistency, compliance readiness, and leakage controls.
- Lender-ready proof pack with redacted financial summaries and evidence links.
- Consent-based sharing with banks, MFIs, suppliers, investors, or accountants.
- Data-quality scoring so the product does not overstate weak evidence.

**Retention/referral effect:** Businesses share Stoquify because it helps them look bankable and serious.

### Pillar 6: Inventory Loss And Anti-Theft Controls

**User pain:** Stock is money, but losses are hard to isolate by product, person, location, or workflow.

**Target users:** Owners, warehouse staff, store managers, purchasing teams.

**Business value:** Strengthens POS/inventory adoption and creates a daily/weekly operating habit.

**Technical requirements:**

- Cycle counts and variance approval.
- Write-off, expiry, damage, transfer, and adjustment workflows.
- Loss analytics by product, location, employee, supplier, and time period.
- Reorder suggestions and dead-stock alerts.

**Retention/referral effect:** Owners remember the product that found where stock was leaking.

### Pillar 7: Compliance Calendar And Filing Readiness

**User pain:** Tax, payroll, social contribution, licensing, and accounting deadlines are anxiety-inducing and penalty-prone.

**Target users:** Owners, accountants, payroll operators, compliance/admin staff.

**Business value:** Adds trust and country-pack differentiation.

**Technical requirements:**

- Country-pack compliance calendar.
- Filing readiness state by obligation.
- Evidence requirements and missing-proof queues.
- Role-based reminders and accountant review.

**Retention/referral effect:** Compliance confidence creates loyalty because switching tools risks losing institutional memory.

## 3. Execution Phases

### Phase 0: Foundation Alignment, 2-4 Weeks

**Goal:** Prepare shared primitives before building visible features.

**Features/work:**

- Define unified business event taxonomy for sales, payments, stock movements, payroll events, approvals, evidence, close tasks, and exceptions.
- Standardize action queue and alert severity model.
- Create evidence object model: source, owner, timestamp, redaction level, linked transaction, linked workflow.
- Define RBAC boundaries for owner, manager, cashier, accountant, payroll operator, supplier/customer external link, and lender viewer.

**Dependencies:** Existing POS, inventory, payroll, accounting, receipt, and permission services.

**Success criteria:**

- Every roadmap feature can attach to event, evidence, alert, and action primitives.
- No roadmap surface depends on UI-derived truth.
- Access and redaction rules are clear before external sharing begins.

**Risks:** Overbuilding platform abstractions. Keep primitives minimal and tied to the first dashboard/leakage use cases.

### Phase 1: Daily Truth And End-of-Day Control, 4-8 Weeks

**Goal:** Create the daily habit loop.

**Features:**

- Daily Business Truth Dashboard.
- End-of-day close checklist.
- Cash drawer and payment collection summary.
- Low-stock, unpaid customer, overdue supplier, and compliance reminders.
- Action queue for owner/manager follow-up.

**Required data/workflows:**

- Daily snapshot table or materialized read model.
- Sales/payment/stock rollup services.
- Close task state: open, in review, resolved, waived, blocked.
- Audit log for manager sign-off.

**Success criteria:**

- Owner can see yesterday's operational truth in under 30 seconds.
- Every critical card links to evidence and next action.
- At least 3 daily actions can be resolved without leaving the dashboard.

**Risks:** Dashboard clutter. Use compact operational cards, not marketing-style panels.

### Phase 2: Leakage Radar And Inventory Loss Control, 6-10 Weeks

**Goal:** Turn Stoquify into a money-protection tool.

**Features:**

- Cash leakage exception engine.
- POS/payment/cash drawer reconciliation.
- Refund, discount, void, and override monitoring.
- Inventory variance and write-off workflow.
- Loss by product/location/staff analytics.

**Required data/workflows:**

- Exception model with severity, amount at risk, evidence links, resolution notes.
- Staff/location/terminal attribution.
- Approval workflow for adjustments and write-offs.
- Alert subscriptions for owners and managers.

**Success criteria:**

- System flags mismatches between sales and collected money.
- Inventory variances require reason and approval.
- Owner can see weekly leakage recovered or prevented.

**Risks:** False positives. Start with deterministic rules before predictive scoring.

### Phase 3: Accountant Portal And Monthly Close Pack, 6-12 Weeks

**Goal:** Build the accountant-led referral engine.

**Features:**

- Accountant firm workspace.
- Client list with close status.
- Monthly close checklist.
- Missing evidence queue.
- OHADA/SYSCOHADA-ready reports and exports.
- Accountant review notes and client requests.

**Required data/workflows:**

- Accountant-client access grants.
- Close period model.
- Evidence completeness scoring.
- Export generation and redaction policies.

**Success criteria:**

- Accountant can identify which clients are close-ready.
- Owner can respond to missing-proof requests from one action center.
- Close pack exports are consistent, timestamped, and reviewable.

**Risks:** Accountant workflow complexity. Start with close readiness and missing evidence before full firm practice management.

### Phase 4: Statement Hub And External Collaboration, 6-10 Weeks

**Goal:** Make Stoquify visible outside the tenant and create natural referral loops.

**Features:**

- Customer statements.
- Supplier statements.
- Purchase order and delivery proof sharing.
- Debt reminder and promise-to-pay tracking.
- Signed external links with expiry and limited data exposure.
- WhatsApp/email delivery where configured.

**Required data/workflows:**

- External access token model.
- Statement generation service.
- Contact consent and delivery logs.
- Dispute/comment workflow.

**Success criteria:**

- Business can send a professional statement in one minute.
- Recipient can view only intended data.
- Collections and supplier disputes become traceable.

**Risks:** Data leakage. Signed links, expiry, redaction, and audit logs must be non-negotiable.

### Phase 5: Financing Passport And Partner Readiness, 8-16 Weeks

**Goal:** Convert operational data into financing and credibility.

**Features:**

- Business Health Score.
- Financing Passport.
- Lender-ready proof pack.
- Consent-based sharing.
- Data-quality improvement recommendations.

**Required data/workflows:**

- Health scoring rules.
- Data quality and evidence completeness checks.
- Redacted financial summary generation.
- Partner access role and sharing audit.

**Success criteria:**

- Owner understands what improves financing readiness.
- Accountant can validate the proof pack.
- Lender/partner can receive a controlled, redacted view.

**Risks:** Overpromising credit outcomes. Position as readiness and proof, not guaranteed financing.

### Phase 6: Benchmarking, Loyalty, And Network Effects, 8-20 Weeks

**Goal:** Deepen defensibility and user excitement after core trust loops work.

**Features:**

- Anonymous peer benchmarks.
- Loyalty and digital receipt campaigns.
- Customer lifecycle analytics.
- Supplier performance scoring.
- Industry-specific templates.

**Required data/workflows:**

- Anonymized benchmark cohorts.
- Privacy-preserving aggregation.
- Campaign rules and customer consent.
- Industry/category normalization.

**Success criteria:**

- Users understand where they outperform or underperform peers.
- Customer loyalty workflows create repeat purchases.
- Benchmarking does not expose tenant-identifiable information.

**Risks:** Privacy and low sample sizes. Launch only when anonymization and cohort thresholds are strong.

## 4. Product Architecture

### Core Platform Capabilities

1. **Business Event Spine**
   Central event model for sales, payments, stock movements, payroll changes, approvals, evidence uploads, close tasks, and external shares.

2. **Evidence Layer**
   Every important claim should link to proof: receipt, payment record, stock movement, approval, audit log, uploaded file, payroll record, or reconciliation result.

3. **Action Center**
   One queue for tasks, alerts, approvals, missing evidence, close blockers, leakage exceptions, collection reminders, and compliance deadlines.

4. **Read Model Layer**
   Service-owned daily snapshots, close readiness summaries, leakage summaries, inventory loss summaries, statement balances, and financing readiness scores.

5. **Permission And Redaction Layer**
   RBAC by tenant, role, module, location, and external sharing context. Public or external surfaces should use signed tokens, expiration, least-privilege payloads, and redaction.

6. **Notification And Automation Layer**
   In-app notifications first; WhatsApp/email/SMS as configured channels. No channel should become the source of truth.

7. **Copilot Touchpoints**
   Copilot should explain, summarize, draft reminders, suggest actions, and guide workflows. It should not invent financial facts or bypass approvals.

### Key Data Flows

- POS sale -> payment collection -> cash drawer close -> reconciliation exception -> owner action.
- Stock receipt -> sale/transfer/write-off -> variance -> approval -> loss dashboard.
- Payroll run -> approval -> payslip -> accounting posting -> close pack evidence.
- Supplier invoice -> payment -> statement -> dispute/resolution -> accountant close.
- Monthly activity -> close readiness -> accountant review -> export/proof pack.
- Clean operating data -> business health score -> financing passport -> consent-based partner share.

### Required Guardrails

- Service-owned truth for financial, stock, payroll, and compliance facts.
- Immutable audit trail for approvals, overrides, external shares, and close actions.
- Redaction for customer, employee, supplier, payroll, and financing data.
- RBAC for owners, managers, cashiers, accountants, payroll operators, external recipients, and lender viewers.
- Evidence-backed exports with generation timestamp, source scope, and actor.

## 5. User Experience Design

### Owner Daily Journey

1. Opens Daily Business Truth Dashboard.
2. Reviews cash collected, sales, stock risks, debts, and urgent alerts.
3. Resolves or assigns action items.
4. Reviews leakage or exception alerts.
5. Approves high-risk discounts, refunds, write-offs, or payments.

The experience should feel like a calm control room: dense, scannable, serious, and action-oriented.

### Manager End-of-Day Journey

1. Reviews terminal/cashier sales.
2. Counts cash and confirms mobile money/bank collections.
3. Resolves mismatches or submits explanations.
4. Closes shift/day with evidence.
5. Owner receives only exceptions, not noise.

### Cashier Journey

1. Sells quickly.
2. Issues digital receipt.
3. Records payment method accurately.
4. Cannot perform risky actions without permission.
5. Sees clear end-of-shift close status.

### Accountant Monthly Journey

1. Opens accountant portal.
2. Sees each client close status.
3. Reviews missing evidence and exceptions.
4. Sends requests to client action center.
5. Exports OHADA/SYSCOHADA-ready reports and close pack.

### Payroll Operator Journey

1. Reviews attendance, advances, deductions, and changes.
2. Submits payroll run for approval.
3. Releases payslips.
4. Ensures payroll evidence appears in close pack.

### Supplier/Customer Journey

1. Receives statement, receipt, purchase order, or debt reminder.
2. Opens signed link.
3. Reviews only intended data.
4. Confirms, disputes, or promises payment.

## 6. Differentiation And Moat

### Data Moat

Stoquify becomes stronger as it captures linked operating truth: sale, payment, stock, payroll, compliance, evidence, and close outcomes.

### Workflow Moat

Daily close, leakage resolution, monthly accountant close, and financing readiness create repeated workflows that are painful to recreate elsewhere.

### Trust Moat

Audit trails, evidence packs, redaction, and approval controls make Stoquify more credible than lightweight tools.

### Compliance Moat

OHADA/SYSCOHADA alignment, country packs, payroll compliance, and close readiness create local defensibility.

### Collaboration Moat

Accountants, suppliers, customers, employees, and lenders become participants in the Stoquify proof network.

### Referral Loop

Professional external artifacts create organic distribution:

- Digital receipts expose customers.
- Supplier statements expose suppliers.
- Accountant portals expose accounting firms.
- Financing passports expose lenders and MFIs.
- Employee self-service exposes workers.

## 7. Monetization And Packaging

### Free / Starter

- Digital receipts.
- Basic POS summary.
- Simple inventory.
- Limited customer statements.
- Basic dashboard.

Purpose: create visibility and upgrade path.

### Core Paid

- POS + inventory + basic accounting.
- Daily Business Truth Dashboard.
- Customer/supplier balances.
- Basic action center.
- Basic compliance reminders.

Purpose: become the operating base for serious SMBs.

### Professional

- Cash Leakage Radar.
- Approval workflows.
- Inventory anti-theft controls.
- Accountant collaboration.
- Monthly close pack.
- Payroll controls.

Purpose: charge for money protection and operational control.

### Premium

- Financing Passport.
- Advanced analytics.
- Multi-location controls.
- Automated reconciliation.
- Advanced compliance readiness.
- WhatsApp automation bundles.

Purpose: monetize growth, financing, and multi-site complexity.

### Accountant Firm / Enterprise

- Multi-client accountant dashboard.
- Staff roles and review workflows.
- Bulk close tracking.
- Firm branding.
- API/export integrations.
- Advanced audit logs.

Purpose: turn accountants into distribution partners.

### Add-Ons

- WhatsApp message volume.
- Advanced financing passport.
- Extra locations.
- Additional accountant seats.
- Premium compliance country packs.
- Custom export/API access.

## 8. Go-To-Market And Referral Strategy

### Launch Narrative

Primary message:

**"Know where your money, stock, and business truth stand every day."**

Secondary messages:

- Stop cash leakage before it becomes loss.
- Close your month faster with your accountant.
- Look professional to customers, suppliers, and lenders.
- Turn daily records into financing readiness.

### Accountant-Led Distribution

Offer accountants:

- Free or discounted firm workspace.
- Client close readiness dashboard.
- Referral commissions or client-seat bundles.
- Co-branded monthly close packs.

### Supplier/Customer-Led Referrals

Every shared statement, receipt, invoice, purchase order, and payment reminder should look professional and include subtle Stoquify trust branding.

### Financing Partnerships

Use the Financing Passport as a partner entry point for MFIs, banks, supplier-credit providers, and business associations.

### WhatsApp Strategy

WhatsApp should support:

- Statement sending.
- Receipt delivery.
- Close evidence requests.
- Approval nudges.
- Compliance reminders.
- Collection follow-ups.

It should not become the database of record.

## 9. Implementation Backlog

### Epic 1: Operating Truth Foundation

**User story:** As an owner, I want all critical business events summarized daily so I can know what needs attention.

**Acceptance criteria:**

- Sales, payments, stock alerts, unpaid balances, and close tasks appear in one read model.
- Every summary links back to source evidence.
- RBAC prevents unauthorized access.

### Epic 2: Action Center

**User story:** As a manager, I want one queue for approvals, missing evidence, and exceptions so I know what to resolve.

**Acceptance criteria:**

- Tasks have owner, status, due date, severity, source, and resolution note.
- Resolved tasks are auditable.
- Tasks can be filtered by role, location, workflow, and urgency.

### Epic 3: Daily Dashboard

**User story:** As an owner, I want a morning dashboard that tells me if the business is safe today.

**Acceptance criteria:**

- Dashboard loads daily truth cards.
- Critical alerts are visible above normal summaries.
- Each card has a clear next action.

### Epic 4: End-of-Day Close

**User story:** As a manager, I want to close the day with cash, payment, and shift evidence so the owner trusts the numbers.

**Acceptance criteria:**

- Cash and payment totals are compared against POS sales.
- Differences require explanation.
- Close status is locked after approval.

### Epic 5: Leakage Radar

**User story:** As an owner, I want mismatches and risky staff actions flagged automatically.

**Acceptance criteria:**

- Exceptions are created for configurable mismatch thresholds.
- Refunds, voids, discounts, and cash adjustments are tracked.
- Exceptions have evidence and resolution workflow.

### Epic 6: Inventory Loss Controls

**User story:** As an owner, I want stock variances and write-offs controlled so I can reduce loss.

**Acceptance criteria:**

- Cycle counts create variances.
- Write-offs require reason and approval.
- Loss report groups by product, location, and actor.

### Epic 7: Accountant Portal

**User story:** As an accountant, I want a client close dashboard so I can focus on missing evidence and review.

**Acceptance criteria:**

- Accountant sees authorized clients only.
- Close readiness is visible by period.
- Missing evidence requests flow to the client's action center.

### Epic 8: Close Pack Export

**User story:** As an owner/accountant, I want a monthly close pack that proves the business records are ready.

**Acceptance criteria:**

- Export includes period scope, generation timestamp, source summaries, and evidence completeness.
- Sensitive fields are redacted where required.
- Export history is auditable.

### Epic 9: Statement Hub

**User story:** As an owner, I want to send customers and suppliers professional statements with controlled access.

**Acceptance criteria:**

- Signed links expire.
- Recipient sees only relevant statement data.
- Views, disputes, and confirmations are logged.

### Epic 10: Financing Passport

**User story:** As an owner, I want my clean operating data transformed into a lender-ready proof pack.

**Acceptance criteria:**

- Passport shows health score, data quality, and evidence completeness.
- Owner consents before sharing.
- Partner view is redacted and audit-logged.

### Top 10 First Implementation Tasks

1. Define business event and evidence primitives.
2. Define action center task schema and lifecycle.
3. Build daily operating snapshot service.
4. Build Daily Business Truth Dashboard read model.
5. Add end-of-day close workflow.
6. Add deterministic leakage exception rules.
7. Add inventory variance/write-off approval flow.
8. Build accountant access grant model.
9. Build close readiness summary and missing evidence queue.
10. Build signed external statement link foundation.

## 10. Success Metrics

### Product Usage

- Daily active owners/managers.
- Weekly active accountants.
- Dashboard open rate.
- Action center completion rate.
- End-of-day close completion rate.

### Operational Trust

- Reconciliation completion rate.
- Cash mismatch count and value.
- Leakage exceptions resolved.
- Inventory variance value.
- Approval bypass attempts blocked.

### Accountant And Compliance

- Close readiness percentage.
- Missing evidence turnaround time.
- Close pack exports per month.
- Accountant invites and accepted clients.
- Filing-readiness completion.

### Revenue

- Starter-to-core conversion.
- Core-to-professional upgrade rate.
- Premium financing passport adoption.
- Accountant firm seats.
- Add-on revenue from WhatsApp, locations, and compliance packs.

### Referral And Network

- Customer/supplier statement shares.
- Digital receipt views.
- Accountant client referrals.
- Financing partner shares.
- Referral conversion rate.

## 11. Risks And Guardrails

### Execution Risks

**Risk:** Building too many features at once.

**Guardrail:** Start with daily truth, action center, end-of-day close, and deterministic leakage detection.

### Data-Quality Risks

**Risk:** Bad source data creates misleading dashboards or financing scores.

**Guardrail:** Show data-quality scores and evidence completeness before making strong claims.

### Compliance Risks

**Risk:** Country-specific payroll/tax assumptions become stale or wrong.

**Guardrail:** Use country packs with versioning, review status, source notes, and accountant override paths.

### AI/Copilot Risks

**Risk:** Copilot invents numbers or suggests unsafe actions.

**Guardrail:** Copilot can summarize and recommend based on service-owned facts, but cannot create financial truth or bypass approvals.

### Privacy And External Sharing Risks

**Risk:** Statements, close packs, or financing passports expose sensitive information.

**Guardrail:** Signed tokens, expiry, redaction, least-privilege payloads, view logs, and revocation.

### Adoption Risks

**Risk:** Owners find the system too complex.

**Guardrail:** Use daily/weekly/monthly workflows with clear next actions, not feature-heavy menus.

## Recommended Build Order

1. Build the operating truth foundation.
2. Ship the Daily Business Truth Dashboard.
3. Ship end-of-day close and action center.
4. Add cash leakage and inventory loss controls.
5. Launch accountant portal and close pack.
6. Launch statement hub and signed external links.
7. Launch financing passport.
8. Add WhatsApp automation to proven workflows.
9. Add copilot explanations and guided resolution.
10. Add benchmarking and loyalty once data volume supports it.

## Final Product Direction

Stoquify should win by helping SMBs become visibly well-run. The platform should make the business look serious to the owner, accountant, staff, customers, suppliers, and lenders. That is the referral engine: when Stoquify makes a small business feel controlled, professional, and finance-ready, users will talk about it because it changes how others perceive their business.

