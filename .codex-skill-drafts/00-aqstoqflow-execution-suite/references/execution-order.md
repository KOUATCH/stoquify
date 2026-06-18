# AqStoqFlow Numbered Execution Order

Use this order for execution, skill creation, audits, and resumption.

## 00 Runner

`00-aqstoqflow-execution-suite`

- Purpose: orchestrate the full suite, select the next skill, enforce universal gates, and resume safely.
- Required before: all implementation runs using the suite.
- Output: selected chunk, gate result, verification result, and next skill.

## Foundation Sequence

1. `01-aqstoqflow-program-orchestrator`
   - Purpose: convert the roadmap into tracked chunks, dependency rules, and acceptance gates.
   - Prerequisite: technical spec and graph baseline.
   - Must prove: chunks are ordered, dependencies are visible, and the next slice is explicit.

2. `02-aqstoqflow-control-plane`
   - Purpose: tenant isolation, RBAC, module gating, step-up assurance, audit controls, and maker-checker policy.
   - Prerequisite: program orchestration.
   - Must prove: no sensitive workflow can bypass tenant and authorization controls.

3. `03-aqstoqflow-error-notification-foundation`
   - Purpose: typed errors, safe action results, Prisma error mapping, correlation IDs, and notification mapping.
   - Prerequisite: control-plane rules.
   - Must prove: failures are safe, visible, actionable, and not leaked as raw exceptions.

4. `04-aqstoqflow-business-event-gateway`
   - Purpose: durable business event envelope, idempotency, outbox, audit linkage, and replay-safe worker processing.
   - Prerequisite: error and notification foundation.
   - Must prove: business mutation, audit, event, and outbox can commit atomically.

5. `05-aqstoqflow-accounting-control-center`
   - Purpose: chart of accounts, fiscal periods, journal posting, close blockers, provenance, and accountant-ready controls.
   - Prerequisite: business event gateway.
   - Must prove: journals balance, closed periods reject writes, and reports have source evidence.

6. `06-aqstoqflow-country-pack-factory`
   - Purpose: country-specific OHADA, tax, payroll, fiscal-device, e-invoicing, and authority adapter rules.
   - Prerequisite: accounting control center.
   - Must prove: production-impacting values are effective-dated, verified, and never hardcoded inside domain workflows.

## Domain Sequence

7. `07-aqstoqflow-pos-ledger-controls`
   - Purpose: cashier sessions, cash drawer, sales, refunds, Z reports, stock movement, and ledger posting.
   - Depends on: 02, 03, 04, 05, 06.
   - Must prove: finalized tickets are immutable and cash/stock/ledger balances reconcile.

8. `08-aqstoqflow-compliance-center`
   - Purpose: fiscal document lifecycle, certification, sequence allocation, rejection handling, and regulatory dashboard.
   - Depends on: 04, 05, 06, 07.
   - Must prove: certified documents are immutable and authority failures surface in UI and queues.

9. `09-aqstoqflow-payment-reconciliation-moat`
   - Purpose: mobile money, bank, card, and cash reconciliation with evidence, matching, suspense, and certification.
   - Depends on: 04, 05, 07, 08.
   - Must prove: unmatched money lands in suspense and high-risk manual matches require maker-checker.

10. `10-aqstoqflow-inventory-valuation-kernel`
    - Purpose: costing, inventory valuation, stock counts, transfers, manufacturing/recipes, and class 3 ledger ties.
    - Depends on: 04, 05, 06, 07.
    - Must prove: stock projection rebuild matches movements and inventory value reconciles to ledger.

11. `11-aqstoqflow-purchasing-ap-controls`
    - Purpose: requisitions, purchase orders, receiving, supplier invoices, approvals, payments, and supplier risk controls.
    - Depends on: 02, 04, 05, 10.
    - Must prove: PO, goods receipt, AP, and payment reconcile with duplicate and bank-change controls.

12. `12-aqstoqflow-payroll-presence-engine`
    - Purpose: employees, contracts, attendance, leave, payroll runs, payslips, statutory deductions, and ghost-worker checks.
    - Depends on: 02, 03, 04, 05, 06.
    - Must prove: approved payroll is immutable and corrections happen through auditable adjustments.

13. `13-aqstoqflow-data-trust-accountant-portal`
    - Purpose: trusted dashboards, exports, accountant access, financial packs, and source-linked reporting.
    - Depends on: 05, 08, 09, 10, 11, 12.
    - Must prove: statutory reports read ledger balances and exported reports carry filters, source, period, pack version, and hash.

14. `14-aqstoqflow-offline-pos-sync`
    - Purpose: offline POS cache, device identity, queued events, conflict resolution, sync replay, and legal-numbering safety.
    - Depends on: 02, 03, 04, 07, 08.
    - Must prove: offline replay cannot duplicate sales or legal postings.

15. `15-aqstoqflow-country-adapter-pilot`
    - Purpose: first country authority adapter with sandbox fixtures, credentials, outage handling, and enable/disable controls.
    - Depends on: 06, 08, 09.
    - Must prove: official spec version, expert validation status, sandbox acceptance, and rejection fixtures are recorded.

16. `16-aqstoqflow-ai-copilot-guardrails`
    - Purpose: read-only/source-cited AI assistant, proposal mode, blocked unsafe actions, and audit trail.
    - Depends on: 05, 08, 09, 13.
    - Must prove: AI cannot post, pay, approve, reverse, certify, submit, or change credentials autonomously.

## Release Gate

17. `17-aqstoqflow-enterprise-release-gate`

- Purpose: final approval, required-fixes, or rejection for each chunk before promotion.
- Required after: every foundation or domain chunk.
- Must prove: tenant, RBAC, ledger, event, immutability, errors, notifications, tests, UI states, observability, and documentation gates are satisfied.

