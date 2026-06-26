# StockFlow Next Implementation Sequence

Date: 2026-06-11

Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

## Purpose

This report turns the current skill stack into an implementation sequence for making the platform professional, OHADA-aware, fraud-resistant, data-trustworthy, and enterprise-grade.

The goal is not to promise that fraud can never exist. The goal is to design the system so fraud-permissive paths are blocked at service and data boundaries, sensitive actions require approval and audit evidence, every financial event is traceable to source documents, and every critical control has regression tests.

## Skills Used As The Build Stack

- `ohada-compliance-oracle`: statutory and fraud-permissive design gate.
- `ohada-compliance-chaos-auditor`: audit-first backlog, P0/P1/P2 tickets, abuse tests.
- `enterprise-fraud-and-controls`: RBAC, SoD, approvals, step-up, audit trails, cases.
- `regulatory-country-pack-factory`: versioned country parameters, no hardcoded legal values.
- `ledger-first-business-events`: one event-to-ledger gateway for money and stock events.
- `stockflow-data-trust-certifier`: trusted dashboards, reports, exports, and certification states.
- `payment-reconciliation-moat`: cash, bank, card, mobile-money, suspense, and settlement tie-outs.
- `offline-first-pos-inventory-sync`: tamper-evident offline POS and inventory sync.
- `ohada-payroll-engine`: payroll rules, runs, payslips, declarations, postings, and corrections.
- `ai-copilot-with-accounting-guardrails`: AI as read/explain/draft only, never actor of record.

## Current Stage

The platform is in the early operational-ledger phase.

Already present or in progress:

- Accounting kernel models are in the active Prisma schema.
- Accounting settings, fiscal years, periods, chart accounts, journals, journal entries, posting batches, source links, posting rules, and ledger audit events exist.
- Accounting services exist under `services/accounting`.
- POS sale and payment posting modules exist.
- Refund and void posting modules are present in the current worktree.
- POS service tests indicate accounting wiring for sale, payment, refund, and void is underway.
- Jest is the current test stack.

Not yet implemented as active platform foundations:

- Regulatory country packs.
- Payroll engine schema/services.
- Offline device event sync and certification.
- Payment reconciliation moat beyond current operational payment records.
- AI copilot proposal/audit layer.
- Fully ledger-backed statutory reporting and certification surfaces.

## Build Principle

Build by invariant, not by screen:

`schema/model -> service invariant -> server action -> hook/UI -> audit/source link -> tests -> certification/report`

Do not let UI components, dashboards, copilot tools, offline devices, or operational tables become statutory financial truth. They may create source documents and proposals. The ledger, source links, posting rules, reconciliation, and certificates decide accounting truth.

## Recommended Implementation Sequence

### Phase 1: Stabilize The Current Accounting And POS Slice

Build type: checkpoint and hardening.

Primary skills:

- `ohada-compliance-chaos-auditor`
- `enterprise-fraud-and-controls`
- `ledger-first-business-events`

Method:

- Review the current dirty accounting/POS worktree.
- Confirm `commitPOSSale()`, `refundPOSSale()`, and `voidPOSSale()` call accounting posting modules inside the same Prisma transaction.
- Verify default POS posting rules and required account mappings.
- Add or complete rollback tests for sale, payment, refund, and void.
- Run focused checks before moving to new modules.

Done gate:

- `npm test -- services/accounting services/pos --runInBand` passes.
- `npm run typecheck` passes.
- `npm run prisma:validate` passes.
- Sale/payment/refund/void are atomic: failed accounting posting rolls back the operational event.
- No direct ledger mutation outside accounting services.

### Phase 2: Install The Control Plane As Shared Infrastructure

Build type: fraud-control backbone.

Primary skills:

- `enterprise-fraud-and-controls`
- `ohada-compliance-oracle`
- `stockflow-data-trust-certifier`

Method:

- Define risk tiers for sensitive actions.
- Centralize permissions, SoD, approval matrices, fresh-auth, export controls, and audit rules.
- Ensure sensitive actions are service-enforced, not UI-only.
- Add case/detector inputs for high-risk events.

Done gate:

- Self-approval is blocked.
- Critical actions require fresh auth or step-up.
- Audit logs are written in the same transaction as controlled actions.
- Exports are permission-gated and logged.
- Denied attempts are client-safe and auditable.

### Phase 3: Build Regulatory Country Packs

Build type: regulatory data foundation.

Primary skills:

- `regulatory-country-pack-factory`
- `ohada-compliance-oracle`
- `stockflow-data-trust-certifier`

Method:

- Create the country-pack schema for Cameroon first.
- Move VAT, payroll rates, CNPS/social rules, NIU/RCCM formats, filing names, deadlines, labels, holidays, and payment-provider legality into versioned pack data.
- Add provenance fields: legal reference, effective dates, verified date, verifier, version, hash.
- Add publish validation and golden-test fixtures.
- Add hardcode detection for regulatory literals.

Done gate:

- No production hardcoded legal/tax/payroll values.
- Pack values are effective-dated and legally cited.
- Consumers resolve by country/entity/date.
- Historical artifacts can pin pack version.
- Defective packs fail validation.

### Phase 4: Finish Ledger-First Business Events

Build type: operational posting expansion.

Primary skills:

- `ledger-first-business-events`
- `stockflow-accounting-backbone`
- `ohada-compliance-oracle`
- `payment-reconciliation-moat`

Method:

- Continue from POS sale/payment/refund/void.
- Add cash drawer close.
- Add goods receipt and GRNI policy.
- Add supplier invoice.
- Add supplier payment.
- Add customer settlement.
- Add approved expense.
- Add inventory adjustment.
- Add production batch after inventory valuation policy is stable.

Done gate:

- Each event has source type, source id, posting purpose, idempotency key, open period, balanced lines, source link, and audit event.
- Reports that claim accounting truth read journal lines.
- Existing customer and supplier ledgers are treated as subledger projections, not competing truth.

### Phase 5: Payment Reconciliation Moat

Build type: settlement and suspense infrastructure.

Primary skills:

- `payment-reconciliation-moat`
- `enterprise-fraud-and-controls`
- `stockflow-data-trust-certifier`

Method:

- Model bank/mobile-money/card settlement sources.
- Import statement/provider records with source hashes.
- Match POS/payment claims to external settlement.
- Route unmatched or disputed claims to suspense.
- Add manual match override with approval and audit.

Done gate:

- Mobile-money or card references do not become settled cash just because POS captured a reference.
- Suspense aging is visible.
- Reconciliation close is approval-gated.
- Duplicate settlement/replay tests pass.

### Phase 6: Offline POS And Inventory Sync

Build type: offline operational integrity.

Primary skills:

- `offline-first-pos-inventory-sync`
- `enterprise-fraud-and-controls`
- `ledger-first-business-events`
- `payment-reconciliation-moat`

Method:

- Add device registry and enrollment.
- Add signed, sequenced, hash-chained local outbox facts.
- Add server ingestion with signature, sequence, idempotency, gap, and fork checks.
- Add sync certification for device/session/day.
- Embed country-pack subsets in offline snapshots.
- Keep offline figures provisional until server ingestion and certification.

Done gate:

- Deleted local event creates detectable sequence gap.
- Duplicate/replayed batch posts once.
- Same sequence different hash quarantines device branch.
- Z/day/period close blocks on uncertified sessions.

### Phase 7: Data Trust And Statutory Reporting

Build type: trust-certified reporting layer.

Primary skills:

- `stockflow-data-trust-certifier`
- `ohada-compliance-oracle`
- `stockflow-accounting-backbone`

Method:

- Convert statutory reports to ledger-backed services.
- Label dashboard data as operational, provisional, synced, certified, or exception.
- Add source drill-down from reports to journal lines and source documents.
- Add close pack and export controls.

Done gate:

- Trial balance balances.
- Grand livre and balance generale tie out.
- Bilan and compte de resultat use ledger data.
- Exports preserve filters, scope, row counts, and audit evidence.

### Phase 8: OHADA Payroll Engine

Build type: regulated payroll subsystem.

Primary skills:

- `ohada-payroll-engine`
- `regulatory-country-pack-factory`
- `stockflow-accounting-backbone`
- `enterprise-fraud-and-controls`
- `payment-reconciliation-moat`

Method:

- Build only after country packs and accounting postings are stable.
- Add employees, contracts, rubriques, periods, runs, payslips, declarations, payroll payments, and corrective runs.
- Resolve rates/brackets/ceilings/labels from country packs.
- Post payroll expenses and liabilities through accounting gateway.
- Reconcile employee and authority payments.

Done gate:

- Run totals equal payslips.
- Payslips equal livre de paie.
- Declarations equal liabilities.
- Ledger postings equal run totals.
- Payments clear payable balances.
- Corrections preserve original history and post in allowed period.

### Phase 9: AI Copilot With Accounting Guardrails

Build type: controlled assistant layer.

Primary skills:

- `ai-copilot-with-accounting-guardrails`
- `stockflow-data-trust-certifier`
- `enterprise-fraud-and-controls`

Method:

- Start read-only.
- Then allow proposal-only workflows.
- Copilot outputs must show intent, data pulled, deterministic checks, findings, proposed action, and missing evidence.
- Copilot may create proposals and cases, never direct ledger/payroll/inventory/period mutations.

Done gate:

- No direct mutation tools.
- No fabricated figures.
- Prompt injection cannot bypass policy.
- Proposal approval re-runs deterministic checks.
- Every copilot prompt/tool/result/proposal/refusal is audited.

## First 10 Concrete Tickets

1. Verify and stabilize current POS sale/payment/refund/void accounting wiring.
2. Add rollback tests for POS accounting failures inside the operational transaction.
3. Seed and verify default POS posting rules and account mappings for all tender cases.
4. Add cash drawer close posting with cash over/short mappings.
5. Create regulatory country-pack schema and Cameroon draft pack shell.
6. Add hardcode detector for tax/payroll/regulatory literals.
7. Add payment reconciliation models for provider/bank settlement and suspense.
8. Convert accounting reports to ledger-backed certified services.
9. Design payroll schema and run lifecycle without implementing calculations yet.
10. Design AI copilot tool registry as read-only/query-only first.

## Recommended 12-Week Timeline

Weeks 1-2:

- Stabilize current accounting/POS work.
- Finish rollback tests and posting-rule verification.
- Commit a clean accounting control-plane checkpoint.

Weeks 3-4:

- Build control plane and regulatory country-pack foundation.
- Add hardcode checks and pack provenance.

Weeks 5-6:

- Expand business-event postings: cash drawer, goods receipt, supplier invoice/payment, expense, inventory adjustment.

Weeks 7-8:

- Build payment reconciliation moat and certified ledger reports.

Weeks 9-10:

- Build offline device registry, outbox, ingestion, and sync certification.

Weeks 11-12:

- Start payroll foundation and AI copilot read-only/proposal architecture.

Payroll full implementation will likely need its own follow-on cycle after the accounting, country-pack, and control-plane foundations are stable.

## Final Recommendation

The highest-value next action is to finish and verify the current POS-to-accounting transaction slice. That work is already in motion and should become the stable foundation before opening the larger country-pack, offline, payroll, reconciliation, and AI layers.

The system becomes what it is supposed to be when every module follows the same spine:

source document -> controlled business event -> idempotent posting/reconciliation -> immutable audit -> certified report -> abuse test.
