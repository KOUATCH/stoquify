# Execution plan and implementation contracts

> **30 September 2026 update:** M1-03 local PostgreSQL and EN/FR browser gates passed. Unanswered-request/notification visibility and in-place password confirmation are implemented. Real rail, customer cutover, recipient delivery recovery and pilot gates remain open. See [M1-03 execution report](M1_03_EXECUTION_REPORT.md); dated 27 September statements below describe the earlier baseline.

27 September 2026. Read with the [roadmap](MOAT_ROADMAP.md), [canonical register](MOAT_WORK_PACKAGE_REGISTER.json) and [validation protocols](MOAT_VALIDATION_PROTOCOLS.md). Estimates are engineer effort, not elapsed delivery promises. Roles below are accountable disciplines; named staffing remains unconfirmed.

## Scope and execution order

M0-01 establishes the source baseline. M1-01 implements one accountant workflow; M1-02 supplies onboarding and productive-work measurement. M3-01 is the one bounded experiment. M2 selection, integrated runtime verification, real customer cycles and supplier expansion have explicit entry conditions. A blocked operational pilot does not authorize replacing it with a second unrelated principal build.

| Package | Smallest useful outcome | Owner | Dependencies / acceptance |
|---|---|---|---|
| M0-01 | One evidence-backed program | Architecture + product | Existing programs reconciled; every recommendation traced |
| M1-01 | Triage submitted responses across clients, open evidence, record review | Accounting backend + frontend + security | Existing grants/queue/acceptance; local authorization, redaction, retry and bilingual tests |
| M1-02 | Rehearse trusted onboarding and measure productive cycles | Data + customer success + analyst | Templates, exact source mappings and tested offline scorecard; no registrations counted as productive work |
| M1-03 | Complete runtime evidence-to-close journey | QA + accountant + SRE | M1-01, M1-02 and M2-01; isolated DB, functioning browser, authorized accounts and sample corpus |
| M2-01 | Pick one actual statement/rail | Payments integration + pilot merchant | Consented samples, protocol provenance, settlement evidence and named operator |
| M2-02 | Prove payment resolution and close invalidation | Existing PR-17 owner + treasury | M2-01 and existing reconciliation package; no lost evidence or silent incorrect finalization |
| M3-01 | Compare cash choices with explainable assumptions | Finance/product + data | Standalone exact-money prototype, version hashes, uncertainty, buffer and actual evaluation tests |
| M3-02 | Durable production scenarios justified by behavior | Product + Cash Command owner | Real six-cycle experiment and adequate data coverage; then data/service/UI design |
| M4-01 | Reviewable single supplier journey | Purchasing + integration + privacy | Delivery, proposal/review and discrepancy contract; reachable participants before implementation activation |
| M4-02 | Repeated supplier participation and second relationship | Purchasing + customer success | M4-01 task success and genuine overlap; principal workflow capacity available |
| M5-01 | Continue, narrow or stop using operating economics | Product + release owner | Actual cohort observations, support costs, paid offer evidence and remaining release checks |

## M1-01 data and authority contract

New source files: `services/accounting/accountant-work-desk.contracts.ts`, `accountant-work-desk.service.ts`; `actions/accounting/accountant-work-desk.actions.ts`; `components/accounting/AccountantWorkDesk.tsx` and its local English/French copy. The existing portfolio page mounts the desk. No schema migration, financial posting or new event type is introduced.

The list takes an optional `afterGrantId`; the server derives actor and home organization from `protect`. Active home membership, audit permission and accountant-review permission are required. Candidates are active, effective, unexpired REVIEWER/PREPARER grants to active clients. The existing resolver validates the exact active scope key and role. Target `close_assurance` entitlement is enforced; home accounting entitlement is enforced at the action boundary. Each client is rechecked after its queue, pending-request and notification reads. This narrows the revocation window; no read response can guarantee atomic revocation after bytes have already been delivered.

Reads are sequential and limited to ten clients per page, with a stable grant-ID cursor. The existing source queue bounds each client to 100 findings and fails closed on truncation. List ordering is by original request deadline within that client page, not a global ranking. The result reports inaccessible and incomplete clients separately. A database error fails the read; it does not produce a successful empty portfolio.

The cross-client projection exposes client name, request ID, period, domain/severity, request due date, response time, evidence state and permitted next action. It excludes request/response bodies, finding detail, raw metadata, employee IDs and monetary records. Ownership is accurately labeled “authorized accountant team”; `requestedByYou` identifies provenance and does not invent individual assignment or a review SLA. As of 30 September, unanswered requests appear with client-recipient ownership and scoped notification states; contradictory or truncated histories are withheld and marked incomplete. Notification processing does not establish recipient delivery.

Detail requires client ID and request ID, repeats client authority and entitlement checks, and resolves only an item currently present in that client's validated review queue. React renders evidence as text. A missing/changed response returns an unavailable state. The review conclusion requires 10–4,000 characters. The client keeps the same correlation key and frozen conclusion after uncertain submission so retry uses the same command.

Acceptance first checks target write entitlement, then invokes the existing protected acceptance action. The latter owns fresh authentication, current grant checks, transaction/replay controls, separation of duties and finding transitions. The new UI does not equate response acceptance with settlement or certified close. A source transition that no longer permits acceptance remains governed by the owning service.

The portal handoff retains client and period. The existing hook previously omitted the selected client on refresh/export and keyed all clients together. It now propagates the client and partitions cache keys by client, period and limit. The component hides stale evidence after query failure. Export still reauthorizes the explicit client through the existing action and fresh-auth controls.

## Operational contracts for the remaining principal workflow

**Financial onboarding:** retain immutable source references and reconcile counts and integer minor-unit totals independently for cash, AR, AP, inventory quantity/value, opening ledger and aggregate payroll obligations where relevant. The master-data importer does not import opening financial balances. Domain owners execute opening operations in an isolated rehearsal, reconcile differences, obtain accountant sign-off and retain a rollback/replay record. No opening rows are written by this run.

**Delivery and activation:** invitation created, provider accepted, recipient delivery confirmed, failed and unknown are different observations. `ACCOUNTANT_CLIENT_INVITE_REQUESTED/ACCEPTED` and outbox evidence are input sources; invitation acceptance is not productive activation. Map `close.assurance.missing_evidence.requested`, `response_submitted` and the owning acceptance event into source-verified pilot outcomes. Record first authorized task, first reviewed resolution, two distinct business cycles, paid continuation and support time. See M1-02 worksheet contract in the protocols. Actual tenant records stay in authorized storage; only pseudonymous summaries belong in the pilot register.

**M2:** the rail/format is intentionally unset. M2-01 requires real sample provenance and named integration evidence. Preserve recorded payment, accepted ingestion, provider confirmation, settlement, fees, reversal and unknown as separate states. M2-02 extends the existing payment owner; it must prove duplicate/late/reversal handling, exact amounts, maker-checker decisions, stale-proof invalidation, delivery recovery and source-linked close regeneration. Passing the generic adapter's tests is insufficient.

## M3-01 experiment contract

Run `node what-next/moat-execution/2026-09-27-run-01/cash-planning-prototype.mjs <input.json> <new-output.json>`. Output creation is exclusive: use a new versioned filename for each observation. The synthetic fixture is labeled throughout and must not be used to pass a demand gate.

Inputs are opening cash and provenance, one currency/minor-unit convention, 13-week start, explicit input-coverage attestation, dated obligations, confirmed/expected receipts, purchase/transfer choices, supplier lead days, need dates, buffer and scenario choices. Integer strings and BigInt preserve amounts; mixed currencies, missing provenance, duplicate rows, invalid dates and unaccounted overdue inputs are rejected. The operator must reconcile coverage rather than simply set the attestation to true.

Expected receipts can be delayed; confirmed receipts retain their date. Each day conservatively applies outflows before receipts, so an intraweek funding gap is not hidden by a positive week-end balance. Results include 13 weekly closes, earliest buffer breach, minimum cash, events beyond the horizon and late choices. Choices are marked `REQUIRES_DOMAIN_APPROVAL`; this experiment creates no purchase, transfer or payment.

An assumption hash excludes later actuals; an input hash includes them. Freeze the assumption artifact before collecting outcomes. Compare absolute forecast error by week/horizon against the frozen opening-cash baseline using the same observed-week denominator. Missing weeks are disclosed. This prototype models receipt delays, not probabilistic forecasts, allocation optimization, taxes or exchange conversion. Inventory need quantities and availability remain source references for operator review, not an automated stock recommendation.

## M4-01 preparation contract

First journey: known supplier receives a relationship-scoped revocable invitation, proposes one date discrepancy on an existing PO, buyer reviews through the purchasing owner, and both see only the permitted decision. Delivery must be linked to a durable outbox attempt and distinguish provider acceptance from recipient delivery. The existing invite event with an empty outbox is not evidence of successful delivery.

Before implementation activation, confirm transport, reachable recipient, actual discrepancy type and domain-owner coverage. Define idempotency as relationship + invitation/proposal command; retain retry/dead-letter diagnosis and operator ownership. Supplier content remains a proposal. No direct stock receipt, AP booking, payment or bank-detail mutation follows from external submission. Invoice/remittance visibility and reusable cross-buyer identity are conditional extensions, with separate consent and disclosure for each relationship.

## Rollout and recovery

Deploy the accountant slice only after M1-03 runtime checks. Start with selected accountant mandates and supported client modules. No data migration is required. Refresh or return to the client portal on unavailable evidence; do not silently drop unresolved work. A failed acceptance can be retried with the same command; confirmed acceptance is reversed only through an authorized domain correction, never by deleting audit history.

Rollback removes the work-desk mount and its new actions/services/components, retaining any accepted source records. Preserve the portal scope fix independently because it corrects client selection. Re-run the authority tests after a revert. Disable an unsafe pilot with existing grants/module controls; retain evidence and support ownership. M3 has no production rollback because it is isolated offline output; supersede an erroneous version rather than overwrite history.

## Verification and release ownership

Local evidence: focused Jest, acceptance domain tests, typecheck, scoped lint, boundary ratchet, prototype and outcome-reducer tests. Required next evidence: isolated PostgreSQL grant expiry/revocation and concurrent acceptance/replay; browser list/detail/export scopes in English/French, keyboard and narrow viewport; named-rail failure corpus; restored-delivery exercise and real cohort observations. The 27 September browser/database gaps were resolved in the 30 September local runtime checkpoint. Live rail, delivery recovery, screen-reader/restore and customer evidence remain open.
