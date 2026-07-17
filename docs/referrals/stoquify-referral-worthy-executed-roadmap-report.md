# Stoquify Roadmap Blueprint

Source proposal: `docs/referrals/referral-worthy-platform-features-report.md`

## 1. Strategic North Star

Stoquify should become the **daily operating truth system for African/OHADA SMBs**: the place where owners know, every day, whether cash, stock, staff, compliance, customers, suppliers, payroll, and accountant readiness are under control.

Positioning: **not another POS/accounting tool**, but the control room that proves what happened, detects leakage, prepares the business for accountants/lenders, and makes the company look professionally run.

Market thesis: SMBs do not only need software; they need trust. They need to know cash was collected, stock did not disappear, payroll is credible, taxes are not becoming a penalty, and the business can prove itself to accountants, suppliers, banks, and customers.

## 2. Feature Pillars

1. **Daily Business Truth Dashboard**
   Owner-facing morning control room: sales, cash, stock alerts, unpaid customers, supplier pressure, payroll/compliance reminders, and action queue.

2. **Cash Leakage & Fraud Radar**
   Reconcile POS, cash drawer, mobile money, bank deposits, refunds, discounts, voids, stock movement, and staff actions. This is the premium "protect my money" feature.

3. **Accountant Portal & Close Pack**
   Multi-client accountant workspace, missing evidence queue, OHADA/SYSCOHADA-ready exports, monthly close readiness, client notes, and review trail.

4. **Customer/Supplier Statement Hub**
   Signed share links for customer balances, supplier statements, invoices, purchase orders, delivery proof, payment reminders, disputes, and promise-to-pay.

5. **Business Health Score / Financing Passport**
   Lender-ready trust pack: revenue trend, stock value, payment discipline, data quality, compliance state, payroll consistency, leakage controls, and evidence completeness.

6. **Inventory Anti-Theft & Loss Control**
   Cycle counts, variance approvals, write-offs, expiry/damage tracking, transfer controls, loss analytics by product/location/person.

7. **Compliance Calendar**
   Country-pack reminders for tax, payroll, social contributions, OHADA close, declarations, licenses, and filing readiness.

## 3. Execution Phases

- **Phase 0, Foundation, 2-4 weeks:** business event spine, evidence model, action queue schema, RBAC/redaction rules, audit primitives.
- **Phase 1, Daily Habit, 4-8 weeks:** Daily Truth Dashboard, end-of-day close, action center, cash/payment/stock rollups.
- **Phase 2, Money Protection, 6-10 weeks:** leakage radar, deterministic mismatch rules, inventory variance controls, refund/discount/void monitoring.
- **Phase 3, Accountant Engine, 6-12 weeks:** accountant portal, close readiness, missing evidence queue, OHADA/SYSCOHADA close pack.
- **Phase 4, External Proof Network, 6-10 weeks:** customer/supplier statement hub, signed links, disputes, WhatsApp/email delivery.
- **Phase 5, Financing Readiness, 8-16 weeks:** business health score, financing passport, lender view, consent-based sharing.
- **Phase 6, Network Effects, later:** benchmarking, loyalty, customer campaigns, supplier performance scoring.

## 4. Product Architecture

Core platform capabilities should be:

- **Business Event Spine:** sales, payments, stock movements, payroll events, approvals, evidence, close tasks, external shares.
- **Evidence Layer:** every claim links to receipts, payment proof, stock movement, approval, audit log, payroll record, or export.
- **Action Center:** one queue for exceptions, approvals, missing proof, close blockers, compliance deadlines, and collection tasks.
- **Read Models:** daily truth, leakage summary, inventory loss, close readiness, statement balances, financing readiness.
- **RBAC + Redaction:** owner, manager, cashier, accountant, payroll operator, external recipient, lender viewer.
- **Notification Layer:** in-app first; WhatsApp/email/SMS as delivery channels, not sources of truth.
- **Copilot Layer:** explain, summarize, draft reminders, guide resolution; never invent numbers or bypass approvals.

## 5. UX Design

The product should feel like a calm, serious control room.

- **Daily owner loop:** open dashboard, review cash/stock/debt/compliance, resolve exceptions, approve risky actions.
- **Manager loop:** close day, reconcile cash/payment, explain differences, submit evidence.
- **Accountant loop:** review client close status, request missing evidence, export close pack.
- **Supplier/customer loop:** receive statement link, confirm, dispute, or pay.
- **Payroll loop:** review attendance/advances/deductions, approve run, release payslips, feed close pack.

## 6. Differentiation And Moat

Stoquify becomes hard to replace through:

- **Data moat:** linked operational truth across POS, stock, payroll, accounting, compliance.
- **Workflow moat:** daily close, monthly close, leakage resolution, financing readiness.
- **Trust moat:** audit trails, evidence packs, approvals, redaction.
- **Compliance moat:** OHADA/SYSCOHADA and country-pack readiness.
- **Network moat:** accountants, customers, suppliers, employees, and lenders interact with Stoquify-generated proof.
- **Referral loop:** every receipt, statement, close pack, payslip, or financing passport makes the business look more professional.

## 7. Monetization

- **Free/Starter:** digital receipts, basic POS summary, limited inventory, limited statements.
- **Core:** POS, inventory, daily dashboard, accounting basics, customer/supplier balances.
- **Professional:** leakage radar, approvals, inventory loss controls, accountant portal, close pack, payroll controls.
- **Premium:** financing passport, advanced analytics, multi-location, automated reconciliation, WhatsApp automation.
- **Accountant Firm/Enterprise:** multi-client dashboard, staff roles, bulk close tracking, firm branding, APIs, advanced audit logs.

Upgrade drivers: leakage protection, accountant close packs, multi-location controls, financing passport, compliance readiness.

## 8. Go-To-Market And Referral Strategy

Main message: **"Know where your money, stock, and business truth stand every day."**

Channels:

- **Accountants:** firm dashboard, referral commissions, client-seat bundles.
- **Suppliers/customers:** professional statements and receipts with Stoquify trust branding.
- **Lenders/MFIs:** financing passport as partner channel.
- **WhatsApp:** statement sending, receipt delivery, approval nudges, close evidence requests, collection reminders.
- **Business associations:** "make your SMB bank-ready and accountant-ready" campaigns.

## 9. Implementation Backlog

Top 10 starting tasks:

1. Define business event and evidence primitives.
2. Build action center schema and lifecycle.
3. Build daily operating snapshot service.
4. Build Daily Truth Dashboard read model.
5. Add end-of-day close workflow.
6. Add deterministic cash leakage exception rules.
7. Add inventory variance/write-off approval flow.
8. Build accountant access grants.
9. Build close readiness and missing evidence queue.
10. Build signed external statement link foundation.

## 10. Success Metrics

Track:

- Daily active owners/managers.
- Dashboard open rate.
- End-of-day close completion.
- Reconciliation completion rate.
- Cash mismatch value detected.
- Inventory variance value.
- Leakage exceptions resolved.
- Accountant invites and accepted clients.
- Close pack exports.
- Statement shares and receipt views.
- Financing passport adoption.
- Starter-to-paid and paid-to-premium upgrades.
- Referral conversion rate.

## 11. Risks And Guardrails

- **Too much scope:** build daily truth + action center + close first.
- **Bad data:** show evidence completeness and data-quality scores.
- **False leakage alerts:** start deterministic, tune thresholds by business type.
- **Compliance drift:** versioned country packs and accountant review paths.
- **AI risk:** copilot explains service-owned facts only; no invented numbers.
- **External sharing risk:** signed tokens, expiry, redaction, revocation, view logs.
- **Adoption risk:** make workflows action-based, not menu-heavy.

## Build Order

1. Operating truth foundation
2. Daily Truth Dashboard
3. End-of-day close + action center
4. Leakage radar + inventory loss controls
5. Accountant portal + close pack
6. Statement hub + signed links
7. Financing passport
8. WhatsApp automation on proven workflows
9. Copilot-guided explanations and resolution
10. Benchmarking and loyalty once data volume supports it

## Strategic Move

The big strategic move: Stoquify should make SMBs **visibly well-run**. When the product helps a business look controlled, accountant-ready, supplier-trustworthy, customer-professional, and lender-ready, referrals stop being a marketing trick and become a natural side effect.

## Sources

- World Bank Global Findex 2025: https://www.worldbank.org/en/publication/globalfindex
- OHADA Uniform Acts: https://www.ohada.org/actes-uniformes/
- African digital payment trust research: https://arxiv.org/abs/2604.11566
