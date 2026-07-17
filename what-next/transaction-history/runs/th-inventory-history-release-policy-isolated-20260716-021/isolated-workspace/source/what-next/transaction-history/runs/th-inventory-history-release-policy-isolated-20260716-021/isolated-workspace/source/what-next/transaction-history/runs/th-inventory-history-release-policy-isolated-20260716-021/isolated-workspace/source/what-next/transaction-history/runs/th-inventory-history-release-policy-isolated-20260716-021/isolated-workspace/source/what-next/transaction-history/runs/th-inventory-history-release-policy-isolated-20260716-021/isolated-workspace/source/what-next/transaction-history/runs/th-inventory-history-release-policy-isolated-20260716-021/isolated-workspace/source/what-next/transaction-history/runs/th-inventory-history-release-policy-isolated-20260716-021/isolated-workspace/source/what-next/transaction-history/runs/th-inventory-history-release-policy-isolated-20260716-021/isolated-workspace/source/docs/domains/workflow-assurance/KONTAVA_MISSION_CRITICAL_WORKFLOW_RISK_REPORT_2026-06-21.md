# Kontava Mission-Critical Workflow Risk Report

Date: 2026-06-21
Scope: AqStoqFlow/Kontava codebase review for workflows that can harm financial truth, statutory confidence, cash control, inventory integrity, payroll trust, or management reputation if they malfunction.
Constraint honored: this report is documentation only. No application code was changed.

## Executive Summary

Kontava is already built around many serious enterprise primitives: typed server actions, server-only services, Prisma persistence, business events, ledger posting batches, fiscal documents, reconciliation runs, payment exceptions, payroll control states, close packs, and evidence/proof trails. That is the right foundation for an OHADA-region SMB operating system.

The highest risk is not a single screen failing. The real risk is a multi-step workflow partially succeeding: cash captured but no receipt, stock moved but no ledger entry, supplier paid while bank approval is pending, payroll posted without payment reconciliation evidence, or a close pack certified while source evidence has drifted. These failures would make managers distrust the product because the system would stop being the daily reference point.

This report ranks the 10 workflows most likely to damage trust if they break, explains early warning signals, and defines the diagnosis and hardening patterns needed before the BI layer depends on them.

## Ranked Risk Register

| Rank | Workflow | Failure Impact | Existing Anchors Observed | Primary Recovery Goal |
| --- | --- | --- | --- | --- |
| 1 | POS sale, payment, receipt, stock, and ledger posting | Cash, revenue, tax, stock, and receipt truth split apart | POS sale/refund/void services, receipt legal-delivery gates, posting services, fiscal documents | Prove every sale has one payment truth, one stock truth, one receipt truth, and one journal truth |
| 2 | Offline POS sync and replay | Duplicate sales, missing sales, broken device trust, branch cash gaps | Offline device/event/conflict models, replay services, sequence/hash-chain checks | Replay exactly once or block with a visible, auditable conflict |
| 3 | Payment ingestion, reconciliation, suspense, and signoff | Bank/mobile-money truth diverges from ledger and customer/supplier balances | Provider events, statement imports, match records, suspense, exceptions, signoff actions | Explain every cash movement as matched, suspended, exception, or signed |
| 4 | Purchasing, receiving, supplier invoice, and AP posting | Inventory value, supplier debt, and expense recognition become unreliable | PO approval, goods receipt stock application, supplier invoices/payments, AP controls | Keep PO, receipt, invoice, stock, AP, and ledger evidence in one chain |
| 5 | Supplier bank change and payment release | Fraud, misdirected supplier payments, reputational loss | Supplier bank change models, self-approval tests, payment release blockers | Block risky payments until bank evidence and maker-checker approvals are clean |
| 6 | Inventory count, adjustment, write-off, and class 3 reconciliation | Stock value and gross margin become fiction | Stock count/adjustment models, write-off evidence, projection rebuild and reconciliation services | Tie every stock quantity/value change to evidence and class 3 ledger movement |
| 7 | Payroll attendance, run posting, payments, and declarations | Employee trust, statutory payroll exposure, cash planning errors | Payroll run/payment/declaration models, posting batches, country-pack provenance | Lock attendance inputs, post payroll once, release payments with reconciliation evidence |
| 8 | Fiscal document creation and compliance certification outbox | Legal receipt/invoice delivery becomes unsafe or unverifiable | Fiscal documents, compliance submissions, evidence, country-pack metadata, outbox | Certify or clearly queue/reject fiscal documents without corrupting posted ledger truth |
| 9 | Close assurance, accountant trust pack, and stale evidence invalidation | Month-end confidence collapses; managers and accountants stop trusting reports | Close runs, findings, checklist items, evidence graph, certified exports | Certify only when blockers are resolved and invalidate certification when source evidence changes |
| 10 | Accounting posting gateway, journal source links, and ledger invariants | Every BI number becomes questionable | Ledger posting batches, journal entries/lines, source links, audit events, reconciliation tests | Ensure every financial mutation is balanced, source-linked, period-valid, and auditable |

## 1. POS Sale, Payment, Receipt, Stock, And Ledger Posting

Management question: Can managers trust each completed sale as cash, revenue, tax, stock, receipt, and ledger truth?

Critical activities:
- Validate cart, item availability, customer context, terminal, cashier, shift, and tender.
- Create the POS sale and payment record.
- Move inventory out of stock and preserve cost/valuation trace.
- Update drawer/session cash expectations.
- Generate fiscal document and legal receipt evidence.
- Post the sale to accounting and link the source.
- Emit business event and outbox notifications for downstream BI and reconciliation.

What breaks if it fails:
- Sale exists without stock movement, overstating inventory.
- Payment exists without sale posting, overstating cash or hiding revenue.
- Receipt is delivered without certification or fiscal trace.
- Refund or void restores inventory but misses cash or ledger reversal.
- Manager cash, margin, inventory, tax, and close dashboards disagree.

Early warning signals:
- POS sales with no ledger posting batch or failed posting status.
- Receipt delivery attempts blocked because fiscal document status is not certified.
- Sales where payment amount, tender allocations, and drawer expected cash differ.
- Stock event count does not match sold line count.
- Voids/refunds with missing original payment trace.

How to diagnose:
- Start with the sale id and trace outward to payment transaction, inventory movement, fiscal document, journal entry, source link, business event, and outbox messages.
- Compare sale totals to posted journal debit/credit lines and fiscal document canonical payload totals.
- Check whether the failure happened before or after the transactional boundary.
- Inspect whether retry/idempotency keys were reused with a changed payload hash.
- Separate operator errors from system failures: cashier input, terminal shift, stock availability, posting rules, fiscal certification, or outbox delivery.

Hardening required:
- A sale-truth health check that classifies each sale as complete, pending certification, pending posting, blocked stock, or reconciliation-needed.
- A manager-facing exception queue linking directly to POS sale, payment trace, stock event, fiscal document, and journal proof.
- Tests for partial failures around receipt generation, posting failure, stock movement failure, duplicate tender replay, refund, and void.

## 2. Offline POS Sync And Replay

Management question: Can a branch keep selling offline without creating duplicate, missing, or unverifiable sales?

Critical activities:
- Register and authorize offline devices.
- Accept offline batches with device identity, sequence numbers, payload hash, and receipt evidence.
- Validate event order and hash-chain continuity.
- Detect duplicate idempotency keys and changed payload hashes.
- Replay accepted envelopes through the normal POS sale path.
- Block conflicts and notify operators with actionable evidence.

What breaks if it fails:
- A disconnected branch can duplicate sales during replay.
- Legitimate offline sales can be silently dropped.
- Device tampering may become indistinguishable from normal network delay.
- Receipts issued offline may not tie back to certified fiscal evidence.
- Branch manager cash counts become impossible to reconcile.

Early warning signals:
- Sequence gap, hash mismatch, replay blocker code, or duplicate payload conflict.
- Accepted offline event with no replayed sale id after expected SLA.
- Multiple completed replay attempts for the same device event or idempotency key.
- Device certificate stale, revoked, or not linked to location/terminal.
- High conflict rate from one branch, terminal, cashier, or device version.

How to diagnose:
- Trace device id, batch id, event id, sequence number, payload hash, and replay idempotency key.
- Determine whether the event is rejected, accepted-but-not-replayed, replayed, or blocked.
- Compare offline receipt hash with the eventual fiscal document and posted sale.
- Review POS offline conflict records and business events before replay.
- Inspect whether a replay blocker prevented a bad duplicate or hid a legitimate sale.

Hardening required:
- A branch offline control panel showing pending, replayed, blocked, and conflicted envelopes.
- Device risk scoring based on conflict frequency, clock drift, stale versions, and sequence anomalies.
- Replay invariant tests for duplicate sale prevention, hash-chain gaps, stale device certificates, and receipt-to-fiscal-document traceability.

## 3. Payment Ingestion, Reconciliation, Suspense, And Signoff

Management question: Does every bank, mobile money, card, and cash movement reconcile to ledger-backed business activity?

Critical activities:
- Ingest provider webhooks and signed evidence.
- Import provider statements with file hash and line fingerprints.
- Create payment transactions and provider events.
- Run automatic matching against sales, customer payments, supplier payments, payroll payments, and refunds.
- Create suspense items and payment exceptions when confidence is insufficient.
- Allow controlled manual matching and suspense posting.
- Sign reconciliation runs and export certificates.

What breaks if it fails:
- Cash balances diverge from bank or mobile money reality.
- Customer invoices stay open after payment or close without real cash.
- Supplier payments appear released but never leave the bank.
- Suspense accounts become a dumping ground instead of a controlled workflow.
- Management cash command and close readiness dashboards lose credibility.

Early warning signals:
- Provider event payload hash mismatch, stale signature, missing signature, duplicate changed payload.
- Statement file duplicate hash or duplicate line fingerprint.
- High unmatched amount, open suspense age, or open payment exceptions.
- Manual matches by the same actor who created or imported evidence.
- Signed reconciliation run with open suspense or unresolved exceptions.

How to diagnose:
- Trace provider event, statement line, payment transaction, match record, suspense item, exception, reconciliation run, and ledger posting.
- Compare provider amount/currency/date/reference to internal source document and ledger line.
- Identify whether mismatch is timing, amount, currency, duplicate, tamper, or missing source-document evidence.
- Review manual match approval actor, maker-checker boundary, and fresh-auth requirement.
- Inspect reconciliation run certificate hash and signoff status.

Hardening required:
- Reconciliation confidence scoring that distinguishes automatic match, probable match, suspicious duplicate, and blocked tamper evidence.
- A suspense-aging action queue with owner, due date, linked workflow, and required evidence.
- Tests for provider tamper attempts, stale signed events, statement import duplicates, manual match SoD, and signoff blockers.

## 4. Purchasing, Receiving, Supplier Invoice, And AP Posting

Management question: Are purchases controlled from request through supplier debt, inventory, payment, and ledger?

Critical activities:
- Create and approve purchase orders.
- Receive goods against PO lines with quantity, serial, location, and evidence checks.
- Apply inventory receipts and valuation movements.
- Register supplier invoices and prevent duplicate invoice evidence.
- Match supplier invoice to PO and goods receipt.
- Post AP liability and source link.
- Prepare supplier payment allocations.

What breaks if it fails:
- Stock appears available before goods are truly received.
- Supplier debt is understated or duplicated.
- Cost of goods and margins become wrong.
- PO approval can be bypassed or changed after receiving/invoicing evidence.
- Close assurance cannot prove inventory and AP balances.

Early warning signals:
- PO line edits attempted after receipt or invoice evidence.
- Goods receipt stock event without AP source linkage.
- Supplier invoice duplicate reference or changed idempotency payload.
- Ledger posting blocker for AP invoice.
- Received quantity, invoiced quantity, and ordered quantity drift.

How to diagnose:
- Trace PO, approval audit, goods receipt, stock event, supplier invoice, invoice lines, AP posting batch, source link, and business event.
- Compare quantity and amount across PO, receipt, invoice, inventory valuation, and journal lines.
- Check whether the failure occurred in approval, receiving, invoice registration, posting rule resolution, or payment allocation.
- Inspect whether invoice evidence was created before or after duplicate detection.

Hardening required:
- A three-way match cockpit with blocked invoices, quantity variances, price variances, missing receipts, and posting blockers.
- Immutable PO line rules once receipt or invoice evidence exists.
- Tests for duplicate invoices, partial receipts, over-receipts, posting failure atomicity, and PO edit blockers.

## 5. Supplier Bank Change And Supplier Payment Release

Management question: Can supplier payments be trusted as authorized, correctly routed, and fraud-resistant?

Critical activities:
- Capture supplier bank change request and evidence.
- Require independent approval before using a new bank account.
- Block payment release while bank changes are pending.
- Allocate supplier payments only up to outstanding invoice balances.
- Create payment transaction and reconciliation evidence.
- Post ledger movement and business event in the same controlled workflow.

What breaks if it fails:
- A malicious or mistaken bank change can redirect funds.
- Payment may be released to an unapproved bank account.
- Supplier balance can go negative from over-allocation.
- Finance manager loses confidence in the payment approval trail.
- The system becomes vulnerable to insider fraud.

Early warning signals:
- Same actor requests and approves supplier bank change.
- Payment release actor matches invoice creator, bank-change requester, or supplier master-data editor.
- Payment blocked because pending bank change exists.
- Payment amount exceeds open invoice balance.
- Payment transaction exists without ledger posting or reconciliation exception.

How to diagnose:
- Trace supplier id, bank account id, bank change request, approval actor, supplier payment, payment allocations, payment transaction, AP ledger posting, and payment exception.
- Review actor history and role permissions around supplier master data and payment release.
- Verify destination hash and evidence attachments.
- Compare payment total to invoice outstanding amounts at release time.

Hardening required:
- Supplier payment risk banner before release: new bank account, changed within N days, same-actor risk, missing evidence, unusual amount, or high supplier dependency.
- Mandatory direct links from payment exception to supplier bank evidence and AP ledger proof.
- Tests for pending bank blocker, self-approval, over-allocation, changed destination hash, and duplicate release attempts.

## 6. Inventory Count, Adjustment, Write-Off, And Class 3 Reconciliation

Management question: Does physical stock, system stock, inventory valuation, and OHADA class 3 ledger balance agree?

Critical activities:
- Freeze stock count session and count sheet evidence.
- Capture counted quantities by item/location and reconcile to snapshot hash.
- Approve and post inventory adjustments.
- Require write-off/shrinkage evidence and reason codes.
- Rebuild inventory projections from stock events.
- Reconcile stock valuation to class 3 ledger balances.

What breaks if it fails:
- Managers reorder from false stock quantities.
- Gross margin and stock value become unreliable.
- Shrinkage or theft can hide in generic adjustments.
- Class 3 OHADA accounts fail to tie to operational inventory.
- Close readiness and accountant trust pack become blocked.

Early warning signals:
- Count session snapshot hash changes after freeze.
- Adjustment has no evidence, reason, approval, or source document.
- Stock projection drift after rebuild.
- Material class 3 reconciliation variance.
- Write-offs concentrated by user, location, item category, or period end.

How to diagnose:
- Trace item/location, count session, stock count line, stock adjustment, stock event, valuation movement, journal posting, and reconciliation finding.
- Determine whether the error is physical count, projection drift, costing/valuation, ledger posting, or evidence completeness.
- Compare adjustment reason codes and approval actors.
- Review whether period lock or close certification should have blocked the change.

Hardening required:
- Inventory integrity cockpit showing projection drift, stale counts, high-risk write-offs, valuation movement, and class 3 variance.
- Mandatory evidence grade on every stock adjustment used by BI.
- Tests for frozen snapshot mutation, write-off without evidence, maker-checker violation, valuation drift, and period-locked inventory posting.

## 7. Payroll Attendance, Run Posting, Payments, And Declarations

Management question: Can owners trust payroll cash need, employee pay, statutory obligations, and accounting postings?

Critical activities:
- Freeze attendance and payroll inputs.
- Calculate payroll run with country-pack provenance.
- Approve and post payroll run to ledger.
- Emit payslips.
- Release payroll payment batch with payment transaction and reconciliation evidence.
- Prepare payroll declarations with authority, due date, country-pack hash, and expert review flags.

What breaks if it fails:
- Employees are paid wrong or late.
- Payroll liabilities are misstated.
- Statutory declarations are incomplete or based on stale country-pack rules.
- Payroll cash forecasts and runway dashboards become unreliable.
- Same workflow can affect employee trust, tax exposure, and bank reconciliation at once.

Early warning signals:
- Payroll run calculated without frozen attendance hash.
- Posted run lacks ledger posting batch, payslip emission, or business event.
- Payroll payment batch released without payment transaction or exception link.
- Declaration preparation falls back to expert review due to country-pack resolution error.
- Ledger blockers or payment exceptions remain open after pay date.

How to diagnose:
- Trace payroll period, attendance snapshot, payroll run, run lines, payslips, payment batch, payment transaction, payment exception, ledger posting batch, and declarations.
- Compare gross, deductions, employer charges, net payable, and declaration amounts.
- Inspect country-pack version, schema version, and resolution hash.
- Identify whether failure is calculation, approval, posting, payslip emission, payment release, reconciliation, or declaration preparation.

Hardening required:
- Payroll control room with run status, payment release status, declaration readiness, ledger blockers, and reconciliation exceptions.
- Fresh-auth and SoD checks for approve/post and payment release.
- Tests for idempotent payroll approval, journal failure atomicity, payment release evidence, declaration fallback, and country-pack drift.

## 8. Fiscal Document Creation And Compliance Certification Outbox

Management question: Are fiscal invoices and receipts legally safe, source-linked, certified or queued, and explainable?

Critical activities:
- Create fiscal document only from a posted ledger-backed source.
- Resolve country-pack certification metadata.
- Build canonical payload and hash it.
- Queue compliance submission through outbox instead of authority calls inside the business transaction.
- Persist request, response, rejection, retry, and artifact evidence.
- Update fiscal document status to queued, accepted, certified, rejected, or reversed.

What breaks if it fails:
- Legal documents can be delivered before certification or without posted source truth.
- Authority outage can be confused with internal posting failure.
- Certification payloads become non-reproducible.
- Sandbox or fake authority behavior may be mistaken for production legal effect.
- Compliance dashboards and receipts lose legal credibility.

Early warning signals:
- Fiscal document has no posting batch or journal entry.
- Certification policy allows authority call inside the sale transaction.
- Compliance submission idempotency key reused with different payload hash.
- Submission stuck with growing attempts and nextAttemptAt in the past.
- Rejected submission does not update fiscal document or evidence.

How to diagnose:
- Trace source document, posting batch, fiscal document, canonical payload hash, country-pack metadata hash, compliance submission, adapter response, compliance evidence, and business event.
- Separate internal validation failure from external authority retryable outage or terminal rejection.
- Verify country code, authority channel, environment, credential reference, and legal-effect flag.
- Review all evidence types: request, response, artifact, rejection, and retry schedule.

Hardening required:
- Compliance queue monitor with due retries, rejected documents, missing evidence, country-pack drift, and legal-effect warnings.
- Legal delivery guardrails for receipts/invoices that block uncertified documents where required.
- Tests for posted-source requirement, idempotency hash conflict, retryable outage, terminal rejection, evidence persistence, and sandbox-only legal effect.

## 9. Close Assurance, Accountant Trust Pack, And Stale Evidence Invalidation

Management question: Is month-end ready to certify, hand to an accountant, and defend later?

Critical activities:
- Run close checks for ledger balance, traceability, payment reconciliation, inventory evidence, tax/compliance, payroll, and unresolved findings.
- Create checklist items, evidence items, and findings.
- Review and resolve/waive findings with proper roles.
- Export draft or certified close pack.
- Block certification when high-risk findings remain.
- Invalidate certification if underlying evidence changes after certification.

What breaks if it fails:
- Accountant receives a pack that looks certified but contains unresolved blockers.
- Managers close a period while payments, inventory, or fiscal documents remain unreconciled.
- Stale evidence makes historical close packs indefensible.
- Close BI becomes decorative instead of operationally decisive.

Early warning signals:
- Close run has unresolved high-risk findings.
- Certified export requested by same actor who prepared or reviewed the close.
- Close pack export lacks evidence items or certificate hash.
- Inventory valuation annex hash changes after certification.
- Proof trail returns blocked grade for a certified close run.

How to diagnose:
- Trace close run, period, checklist items, findings, evidence items, reviews, pack exports, certificate hash, and invalidation events.
- Identify the blocker service and source table named in the finding.
- Compare evidence hashes at run time and export time.
- Review role separation among preparer, reviewer, and certifier.

Hardening required:
- Close readiness command center with blocker ownership, aging, direct workflow links, and certification eligibility.
- Automatic invalidation notices when source evidence changes after certification.
- Tests for draft watermark, certified export blocker, same-actor certification block, stale inventory evidence, proof trail redaction, and deterministic close snapshot hash.

## 10. Accounting Posting Gateway, Journal Source Links, And Ledger Invariants

Management question: Can every financial number in BI be traced to balanced, period-valid, source-linked ledger evidence?

Critical activities:
- Resolve active posting rules for each business event.
- Validate open accounting period.
- Create ledger posting batch.
- Create balanced journal entry and lines.
- Link accounting source to posting batch and journal entry.
- Record ledger audit event and mark business event applied.
- Expose reconciliation checks for trial balance and traceability.

What breaks if it fails:
- BI can read operational totals that do not match ledger totals.
- Journal entries can exist without source evidence.
- Posting batches can exist without journal entries or source links.
- Period lock and OHADA immutability can be undermined.
- Every downstream dashboard becomes suspect.

Early warning signals:
- Ledger posting batch status failed or pending beyond SLA.
- Posted journal entry missing posting batch or source link.
- Posting batch source type/id does not match source link.
- Debits and credits do not balance.
- Manual journal post/reversal lacks fresh auth or correct audit trail.

How to diagnose:
- Trace posting purpose, posting rule, source document, ledger posting batch, journal entry, journal lines, source link, ledger audit event, and business event status.
- Run ledger reconciliation for trial balance and traceability failures.
- Check period status, fiscal year, journal default account, and posting rule mapping.
- Verify that source totals equal journal totals and that source links are tenant scoped.

Hardening required:
- Ledger invariant monitor with failed batches, missing source links, unbalanced journals, closed-period attempts, and unmapped posting rules.
- BI contract requiring financial KPIs to read from ledger-backed views or carry a visible evidence grade.
- Tests for missing posting rules, source mismatch, idempotent posting, traceability failure, closed period posting, and reversal evidence.

## Cross-Cutting Failure Precursors

These warning signs should become common alerts across all critical workflows:

- Idempotency key reused with different payload hash.
- Business event recorded but not applied.
- Outbox message stuck or retrying without operator visibility.
- Posted operational record without ledger posting batch.
- Ledger posting batch without journal entry or source link.
- Evidence hash missing, changed, or disconnected from source document.
- Same actor crossing maker-checker boundaries.
- Fresh-auth required action attempted with stale assurance.
- Workflow status stuck between approved, posted, certified, released, paid, or signed states.
- Period lock or close certification violated by a late mutation.
- Reconciliation exception or suspense item aging beyond owner SLA.
- Dashboard metric sourced from operational tables without ledger/evidence grade.

## Diagnosis Playbook

For any critical workflow failure, use this order:

1. Identify the business object: sale, offline event, payment, PO, supplier payment, stock adjustment, payroll run, fiscal document, close run, or posting batch.
2. Pull the immutable identifiers: organizationId, sourceType, sourceId, idempotencyKey, payloadHash/documentHash, postingBatchId, journalEntryId, businessEventId, and correlationId.
3. Classify current state: draft, approved, posted, certified, released, matched, signed, blocked, failed, reversed, or invalidated.
4. Check transaction boundary: did the write fail before commit, after commit, or in an outbox/background step?
5. Compare operational truth to ledger truth: source totals, journal totals, source links, fiscal documents, and reconciliation artifacts.
6. Check evidence completeness: source document hash, attached proof, authority response, provider payload, count sheet, payslip, or close-pack artifact.
7. Check role boundary: actor, approver, releaser, reviewer, certifier, fresh-auth state, and SoD conflicts.
8. Check period and compliance boundary: open period, country-pack version, fiscal document status, certification policy, and close run state.
9. Decide action: retry safely, block and assign, reverse through controlled workflow, or escalate to accountant/admin review.
10. Record the resolution as an auditable event so the next manager sees why the incident is closed.

## Notification And Dialog Color Semantics Audit

Current issue: notification popups and some shared dialog defaults do not fully inherit the dashboard color semantics.

Observed evidence:
- `app/globals.css` defines dashboard semantic tokens including `--dash-brand`, `--dash-brand-strong`, `--dash-success`, `--dash-danger`, `--dash-info`, `--dash-gold`, `--dash-spruce`, and related soft variants.
- `components/notifications/NotificationSystem.tsx` uses independent gradients: emerald/green/teal for success, red/rose/pink for error, amber/yellow/orange for warning, blue/cyan/indigo for info, plus purple for reconciliation.
- `components/notifications/NotificationProvider.tsx` already centralizes notification types, priorities, categories, and domain-specific helpers for cash, reconciliation, payments, purchase orders, client orders, and forms.
- `components/ui/dialog.tsx` and `components/ui/alert-dialog.tsx` use base `bg-background`, `text-muted-foreground`, and default button variants. Many dashboard pages override these locally with `dashboard-glass-panel` and `--dash-*`, but the shared primitives do not enforce dashboard semantics.

Why it matters:
- Alerts are the product's incident language. If success, warning, danger, info, and blocked states use a different palette from dashboards, managers read the system as less coherent and less enterprise-grade.
- Financial and compliance workflows require instant severity recognition. Color drift makes a failed posting, pending certification, or cash variance feel like a generic UI toast instead of an operational control signal.
- BI action queues will rely heavily on notifications and confirmation dialogs. They must feel native to the dashboard command system.

Recommended semantic mapping:

| Notification Meaning | Dashboard Token |
| --- | --- |
| Success, posted, certified, reconciled | `--dash-success`, `--dash-success-soft` |
| Warning, pending, aging, needs review | `--dash-gold`, `--dash-gold-soft` |
| Error, blocked, rejected, failed, high risk | `--dash-danger`, `--dash-danger-soft` |
| Info, queued, imported, generated, in progress | `--dash-info`, `--dash-info-soft` |
| Primary action or trusted source proof | `--dash-brand`, `--dash-brand-strong`, `--dash-brand-soft` |
| Reconciliation/cash proof category | Prefer `--dash-spruce` or `--dash-brand`, not purple-only styling |
| Neutral/system background | `--dash-surface`, `--dash-surface-raised`, `--dash-border-subtle`, `--dash-text` |

Design requirements before code changes:
- Create one notification tone contract that maps `type`, `priority`, and `category` to dashboard tokens.
- Replace independent gradient palettes with token-based borders, soft backgrounds, icon capsules, progress bars, and high-priority rings.
- Keep category icons but avoid category colors that override severity. Severity should lead; category should refine.
- Add dashboard-aware variants for `DialogContent`, `AlertDialogContent`, descriptions, action buttons, and destructive confirmations.
- Ensure destructive dialogs use `--dash-danger` for the risk action and `dashboard-button-secondary` or tokenized outline styling for cancel.
- Maintain contrast in light and dark dashboard themes.
- Add visual regression checks for success, warning, info, error, high-priority, cash, reconciliation, and destructive confirmation states.

## Workflow-To-Notification Contract

Each critical workflow should emit manager-visible notifications using the same severity language:

| Workflow State | Notification Type | Required Link |
| --- | --- | --- |
| Posted, certified, reconciled, signed, released | Success | Proof trail or completed workflow |
| Imported, queued, calculating, replay pending | Info | Queue/detail page |
| Aging, variance, pending evidence, expert review required | Warning | Manager action item |
| Failed, blocked, rejected, tamper suspected, SoD violation | Error | Exception or blocker page |
| Close certification invalidated | Error | Close run evidence graph |
| Suspense created | Warning | Suspense resolution workflow |
| Payment exception created | Error for tamper/high amount, warning for timing mismatch | Payment exception detail |
| Offline replay conflict | Error | Offline conflict workbench |

## Foundational Hardening Roadmap

Quick wins:
- Add manager-facing health checks for failed posting batches, missing source links, open payment exceptions, open suspense, blocked fiscal submissions, stale offline replay, and unresolved close findings.
- Standardize notification/dialog tone mapping to dashboard tokens.
- Add direct workflow links to every exception, toast action, and manager task.
- Create one workflow incident glossary: blocked, failed, pending evidence, pending certification, pending posting, pending reconciliation, signed, certified, invalidated.

Medium-depth platform work:
- Build a workflow incident table or read model that normalizes failures from POS, payments, AP, inventory, payroll, compliance, close, and ledger posting.
- Create evidence-grade read models for BI: unverified, operational, posted, reconciled, certified, blocked.
- Add SLA aging, owner, role boundary, and recommended next action to every critical exception.
- Add cross-workflow reconciliation snapshots for cash, stock value, supplier balances, receivables, payroll liabilities, and close readiness.

Strategic moat:
- Build a Control Tower that shows daily operational truth: cash status, payment truth, stock truth, supplier exposure, payroll exposure, fiscal certification, and close readiness.
- Make every BI number drill through to source document, journal entry, business event, evidence hash, and responsible action queue.
- Create workflow replay and incident reconstruction tools so support/accountants can show what happened before failure, what the system blocked, and what corrective action closed the issue.
- Add fraud and abuse analytics across supplier bank changes, inventory write-offs, manual matches, late period adjustments, offline replay conflicts, and payroll payment destinations.

## Acceptance Criteria For Future Implementation

Before the proposed BI layer depends on these workflows, each critical workflow should meet these criteria:

- Every state transition has a typed event, actor, timestamp, idempotency key, and payload/document hash where applicable.
- Every financial mutation has a ledger posting batch, balanced journal entry, and source link or a visible blocker.
- Every compliance-relevant document has source evidence and certification/submission trace.
- Every manager-facing metric has an evidence grade and drill-through route.
- Every exception has owner, severity, SLA, source workflow, recommended next action, and close reason.
- Every high-risk action enforces fresh auth and maker-checker boundaries.
- Every notification and dialog uses dashboard semantic tokens.
- Every close pack can prove its evidence was current at certification time or show invalidation.

## Recommended First Sprint

1. Standardize notification and dialog semantics around `--dash-*` tokens.
2. Create a cross-workflow incident/read model for failed postings, payment exceptions, suspense, compliance submission failures, offline replay blockers, inventory reconciliation blockers, payroll blockers, and close findings.
3. Add drill-through links from notifications and incident rows to the exact workflow detail page.
4. Add a ledger invariant monitor for missing source links, failed posting batches, and unbalanced or closed-period attempts.
5. Add POS and payment reconciliation health cards to the Manager Action Center because cash and receipt trust are the fastest daily trust builders.

