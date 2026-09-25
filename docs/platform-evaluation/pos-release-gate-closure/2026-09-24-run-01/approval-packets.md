# POS decision review packets

Generated 2026-09-24T09:07:34.739Z. These packets are proposals awaiting real accountable review; they are not approval records. No owner identity has been inferred.

Frozen contract: [docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json](../../../docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json); version `0.2.0`; SHA-256 `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db`. Register: [docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json](../../../docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json).

The selected options below are copied exactly. If a reviewer chooses another option, create a reviewed contract revision and collect affected approvals against its new hash; do not edit the existing frozen file or transplant old signatures. The supplementary artifact-verifier contract in this run specifies how signed evidence is checked.

## D-01: Store-credit tender disposition

- Status: PENDING; actual accountable people: not supplied.
- Exact proposed option: `DISABLE_HIDE_AND_REJECT_STORE_CREDIT`.
- Required roles: Product owner; Financial controller; Payments owner.
- Frozen implementation declaration (historical, not a fresh test result): ENFORCED_DEVELOPMENT_SCOPE.
- Recommendation: Retain the selected disabled store-credit scope until issuance, redemption, liability, expiry, refund and reconciliation controls have approved evidence.
- Alternatives: Implement a separately approved store-credit product, or exclude it from the release. Enabling an existing UI option alone is insufficient.
- Impact: Cashiers cannot redeem store credit; finance avoids an unproven liability and reconciliation path.
- Acceptance: UI hides unsupported tender and server rejects crafted store-credit requests before sale, inventory, cash or journal consequences.
- Rollback/disable: Keep store-credit tender disabled at the service boundary and preserve previously recorded facts.
- Known limitations: Consult the gate preflight and evidence limits; no production approval is inferred.
- Source pointers: `services/pos/pos.service.ts`; `components/pos/ProfessionalPOSSystem.tsx`

## D-02: Physical terminal/register and drawer session boundary

- Status: PENDING; actual accountable people: not supplied.
- Exact proposed option: `TERMINAL_CURRENT_SESSION_CAS_PLUS_ONE_SESSION_DRAWER_OPENING_CLAIM`.
- Required roles: Retail operations owner; POS architect; Security owner.
- Frozen implementation declaration (historical, not a fresh test result): PARTIALLY_ENFORCED.
- Recommendation: Retain the selected terminal/session claim design for review, with explicit evidence of drawer-ownership limits rather than implying a stronger database invariant.
- Alternatives: Introduce a dedicated unique active-drawer claim through a separately reviewed migration, or restrict operations to the demonstrated terminal/drawer allocation.
- Impact: Cashier handover, duplicate tabs, supervisor recovery and cash responsibility depend on one authoritative active owner.
- Acceptance: Race concurrent open, handover, close, sale and recovery commands; prove one owner and no mutation through a stale session across organizations and locations.
- Rollback/disable: Block new affected sessions; reconcile and close existing sessions through their recorded owner without rewriting cash history.
- Known limitations: The terminal claim is unique/CAS protected; the drawer claim is evidenced by one session opening record but is not a dedicated unique active-drawer-claim aggregate.
- Source pointers: `prisma/schema.prisma:POSStation.currentSessionId`; `services/pos/pos.service.ts:openPOSShift`; `services/pos/pos.service.ts:commitPOSSale`

## D-03: First electronic payment provider

- Status: PENDING; actual accountable people: not supplied.
- Exact proposed option: `ELECTRONIC_TENDER_DISABLED_UNTIL_NAMED_PROVIDER_APPROVED`.
- Required roles: Payments owner; Treasury owner; Security owner.
- Frozen implementation declaration (historical, not a fresh test result): DISABLED_CURRENT_SCOPE.
- Recommendation: Approve only the explicit disabled electronic-tender scope until a named provider and its real contract have been reviewed.
- Alternatives: Select a provider and complete G3A sandbox and treasury review; defer electronic tenders entirely.
- Impact: Cash-only operation is narrower but avoids mapping uncertain or fabricated provider results to paid sales.
- Acceptance: Unsupported electronic tenders fail before mutation. Later activation needs signed callback/replay, unknown/late-capture, settlement and reversal evidence.
- Rollback/disable: Disable new electronic attempts and retain investigation/reconciliation of existing provider references.
- Known limitations: Consult the gate preflight and evidence limits; no production approval is inferred.
- Source pointers: `services/pos/pos.service.ts:assertSupportedSaleTenders`; `components/pos/ProfessionalPOSSystem.tsx:tenderMethods`

## D-04: Offline tender policy

- Status: PENDING; actual accountable people: not supplied.
- Exact proposed option: `OFFLINE_CAPTURE_DISABLED`.
- Required roles: Product owner; Risk owner; Retail operations owner.
- Frozen implementation declaration (historical, not a fresh test result): DISABLED_CURRENT_SCOPE.
- Recommendation: Keep offline capture disabled under the frozen decision; reference synchronization or replay scaffolding does not prove safe offline sale acceptance.
- Alternatives: Approve a bounded offline policy with device identity, limits, fiscal timing and replay/conflict controls, or require network connectivity.
- Impact: Disconnection interrupts new checkout but retained uncertain requests remain recoverable without duplicate sale creation.
- Acceptance: Network loss cannot produce a false recorded sale; reconnect preserves the original request identity and resolves uncertain outcomes safely.
- Rollback/disable: Disable new offline capture; preserve queued evidence and route unresolved records to a scoped operator workflow.
- Known limitations: Consult the gate preflight and evidence limits; no production approval is inferred.
- Source pointers: `services/pos/offline-sync.service.ts`; `docs/pos-enterprise-grade-audit/EXECUTION_00_DECISION_REGISTER.json`

## D-05: Browser, terminal and peripheral support matrix

- Status: PENDING; actual accountable people: not supplied.
- Exact proposed option: `EDGE_151_WINDOWS_10_25H2_SIMULATED_DESKTOP_PDF_ONLY_DEVELOPMENT`.
- Required roles: Retail operations owner; QA owner; Support owner.
- Frozen implementation declaration (historical, not a fresh test result): DEVELOPMENT_MATRIX_DECLARED_NOT_PHYSICALLY_CERTIFIED.
- Recommendation: Treat the exact frozen simulated-desktop/PDF option as development scope only. Its declared browser/OS labels require reconciliation with an actual supported device matrix before broader approval.
- Alternatives: Approve explicit peripheral exclusions for a bounded release, or test named browser/OS/scanner/printer/drawer combinations.
- Impact: Defines support promises, cashier ergonomics and recovery procedures; a rendered printer label is not a hardware test.
- Acceptance: Record actual versions and viewport dimensions, EN/FR, keyboard, screen-reader, touch, zoom/reflow, disconnect/retry and each included physical device.
- Rollback/disable: Withdraw unsupported matrix entries and show unavailable device capability accurately; preserve browser receipt access where verified.
- Known limitations: Consult the gate preflight and evidence limits; no production approval is inferred.
- Source pointers: `docs/pos-enterprise-grade-audit/templates/TEMPLATE-04-HARDWARE-COMPLIANCE-MATRIX_FILLED_20260817.md`

## D-06: Returns, voids and refunds policy

- Status: PENDING; actual accountable people: not supplied.
- Exact proposed option: `LINKED_COMPENSATING_FULL_SALE_REFUND_AND_VOID_CURRENT_SCOPE`.
- Required roles: Financial controller; Retail operations owner; Risk owner.
- Frozen implementation declaration (historical, not a fresh test result): FRESH_AUTH_AND_COMPENSATING_EVENTS_PRESENT_PARTIAL_RETURN_AND_MAKER_CHECKER_MISSING.
- Recommendation: Retain source-linked compensating full-sale corrections as the reviewed target; do not imply partial returns or maker-checker are complete.
- Alternatives: Restrict release to approved correction scenarios, or implement and prove partial-line disposition and materiality/approval controls in a later approved slice.
- Impact: Protects inventory, customer balances, cash and ledger provenance while keeping operator responsibilities explicit.
- Acceptance: Fresh-auth denial, permissions, original-drawer ownership, insufficient cash, duplicate correction and unsupported electronic reversal have no unintended effects; approved paths balance.
- Rollback/disable: Disable affected new correction paths and preserve original and compensating records for controlled resolution.
- Known limitations: No partial line/quantity return aggregate, inspection/disposition workflow, materiality threshold or maker-checker approval contract is production-proven.
- Source pointers: `actions/pos/tender.actions.ts`; `services/pos/pos.service.ts:refundPOSSale`; `services/pos/pos.service.ts:voidPOSSale`; `services/accounting/postings/post-refund.ts`; `services/accounting/postings/post-void.ts`

## D-07: Pilot country, currency, language and fiscal profile

- Status: PENDING; actual accountable people: not supplied.
- Exact proposed option: `CAMEROON_XAF_EN_FR_DEVELOPMENT_ONLY`.
- Required roles: Product owner; Financial controller; Qualified Cameroon country-pack reviewer.
- Frozen implementation declaration (historical, not a fresh test result): DEVELOPMENT_ONLY_COUNTRY_PACK_FAILS_CLOSED_FOR_PRODUCTION.
- Recommendation: Retain Cameroon/XAF/EN/FR development-only scope until qualified country review and independent checking supply dated authoritative provenance.
- Alternatives: Approve a narrower nonproduction scope, or obtain country-specific fiscal numbering, tax, submission, retention and correction approval.
- Impact: Defines what receipts and country behavior may claim; zero-tax synthetic tests do not establish statutory compliance.
- Acceptance: Qualified reviewer and independent checker bind dated sources and supported/unsupported rules to the country-pack version and release candidate.
- Rollback/disable: Keep unapproved statutory issuance disabled; preserve immutable evidence and route existing submission exceptions to their owner.
- Known limitations: Consult the gate preflight and evidence limits; no production approval is inferred.
- Source pointers: `what-next/statutory-country-pack-production-readiness.json`; `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json`

## D-08: Pilot service levels and error budgets

- Status: PENDING; actual accountable people: not supplied.
- Exact proposed option: `NO_PRODUCTION_SLO_UNTIL_D05_MATRIX_AND_MEASURED_BASELINE`.
- Required roles: SRE owner; Product owner; Support owner.
- Frozen implementation declaration (historical, not a fresh test result): TARGET_CONTRACT_NOT_BASELINED.
- Recommendation: Retain the decision not to claim a production SLO until D-05 and measured workload baselines exist.
- Alternatives: Measure and approve targets for a bounded workstation/cohort, or retain development-only service expectations.
- Impact: Support staffing, timeout/retry budgets and expansion decisions must match observed capacity and failure recovery.
- Acceptance: Record workload, concurrency, duration, latency percentiles, errors, recovery time, alert acknowledgement and explicitly approved thresholds.
- Rollback/disable: Stop expansion when the approved budget is exceeded; retain observability and incident ownership during rollback.
- Known limitations: Consult the gate preflight and evidence limits; no production approval is inferred.
- Source pointers: Measured baseline and approved support matrix still required.

## D-09: Delivery invoice recognition event

- Status: PENDING; actual accountable people: not supplied.
- Exact proposed option: `ORDER_CONFIRMATION_NON_POSTING_INVOICE_FROM_ACCEPTED_DELIVERED_QUANTITY`.
- Required roles: Financial controller; Order-to-cash product owner; Qualified accounting reviewer.
- Frozen implementation declaration (historical, not a fresh test result): NOT_IMPLEMENTED_AS_DELIVERY_O2C_AGGREGATES.
- Recommendation: Review the selected delivery-based recognition target with the controller and qualified accounting reviewer; ordinary immediate POS tests do not prove a complete delivery/invoice aggregate.
- Alternatives: Keep delivery invoicing excluded, or approve a separately specified advance/deposit policy with its own recognition controls.
- Impact: Prevents duplicate billing and premature revenue/receivable recognition across confirmation, delivery and invoicing.
- Acceptance: Confirmation remains non-posting; eligible accepted delivery quantities, partial invoices and retries cannot create duplicate invoices, revenue or tax.
- Rollback/disable: Disable new unsupported delivery invoice creation; preserve posted documents and use approved linked corrections.
- Known limitations: Consult the gate preflight and evidence limits; no production approval is inferred.
- Source pointers: `prisma/schema.prisma:SalesOrderStatus`

## D-10: Reservation, availability and goods-issue policy

- Status: PENDING; actual accountable people: not supplied.
- Exact proposed option: `RESERVATION_AFFECTS_AVAILABILITY_ONLY_PHYSICAL_ISSUE_OWNS_STOCK_AND_COGS`.
- Required roles: Inventory controller; Fulfillment owner; Accounting owner.
- Frozen implementation declaration (historical, not a fresh test result): IMMEDIATE_POS_GOODS_ISSUE_PRESENT_DELIVERY_RESERVATION_AGGREGATE_NOT_IMPLEMENTED.
- Recommendation: Retain availability-only reservations and stock/COGS ownership at physical issue as the proposed policy; define negative-stock, UOM, lot and serial exclusions explicitly. The frozen evidence pointer postStockReservation names an unimplemented target, not a function verified in current source.
- Alternatives: Limit release to immediate POS goods issue, or implement and approve reservation/fulfillment aggregates and unsupported-combination handling.
- Impact: Aligns cashier availability, warehouse responsibility and finance valuation without double stock or COGS effects.
- Acceptance: Concurrent reservation, partial issue, backorder, cancellation and reversal prove no oversell or duplicate COGS; reservation alone leaves on-hand and COGS unchanged.
- Rollback/disable: Disable unsupported reservation/fulfillment combinations and preserve source-linked stock events and commitments.
- Known limitations: Consult the gate preflight and evidence limits; no production approval is inferred.
- Source pointers: `services/inventory/inventory-stock-event.service.ts:postPOSStockIssue`; `services/inventory/inventory-stock-event.service.ts:postStockReservation`

## D-11: Business-day, statement, reconciliation and accounting-close boundary

- Status: PENDING; actual accountable people: not supplied.
- Exact proposed option: `KEEP_SESSION_DRAWER_BUSINESS_DAY_STATEMENT_RECONCILIATION_AND_CLOSE_SEPARATE`.
- Required roles: Financial controller; Treasury owner; Retail operations owner.
- Frozen implementation declaration (historical, not a fresh test result): SESSION_STATEMENT_RECONCILIATION_AND_ACCOUNTING_PERIOD_PRESENT_BUSINESS_DAY_AGGREGATE_MISSING.
- Recommendation: Retain separation of session, drawer, business day, statement, reconciliation and accounting close; a working drawer page does not prove end-to-end business-day close.
- Alternatives: Limit supported close scope explicitly, or implement missing aggregates and obtain controller/treasury approval for the full close cycle.
- Impact: Cashier declarations, supervisor variances, settlement matching and accountant period controls remain independently attributable.
- Acceptance: Prove blind declaration where required, no self-approved material variance, cash/provider/ledger/bank tie-out and late-correction invalidation.
- Rollback/disable: Stop close finalization on unresolved differences; retain evidence and reopen through a typed, audited correction procedure.
- Known limitations: Consult the gate preflight and evidence limits; no production approval is inferred.
- Source pointers: `prisma/schema.prisma:POSSession`; `prisma/schema.prisma:StatementFile`; `prisma/schema.prisma:ReconciliationRun`; `services/accounting/periods.service.ts`

## Approval intake

Reviewers must supply the exact decision, selected option, rationale, affected capabilities, effective version, review/expiry time and rollback policy. Each required role must provide a real authority reference, fresh-authentication and approval timestamps (approval within ten minutes), and externally verifiable detached evidence bound to the full decision and contract. The gate verifier requires an operator-managed trusted public key and the signed artifact envelope documented in [approval-verifier-contract.md](approval-verifier-contract.md). No keys, signatures, identities or approvals were created by this review.

The existing register describes these fields:

```json
{
  "decisionId": "D-01 through D-11",
  "selectedOption": "Exact selectedOption from the frozen contract",
  "rationale": "Accountable decision rationale",
  "approvalStatus": "APPROVED",
  "effectiveVersion": "Version in which the decision takes effect",
  "reviewOrExpiryAt": "ISO-8601 timestamp",
  "evidenceLinks": [
    "One or more durable evidence references"
  ],
  "affectedCapabilities": [
    "One or more affected capability identifiers"
  ],
  "rollbackOrDisablePolicy": "Fail-closed rollback or disable policy",
  "approvals": [
    {
      "accountableApprover": "Real accountable identity",
      "approverRole": "Exact requiredApproverRoles value",
      "authorityReference": "Identity-provider or authority record reference",
      "freshAuthenticatedAt": "ISO-8601 timestamp",
      "approvedAt": "ISO-8601 timestamp no more than ten minutes after fresh authentication",
      "signatureReference": "Externally verifiable detached-signature reference",
      "signatureEvidenceSha256": "64-character lowercase SHA-256"
    }
  ]
}
```

Templates and typed names are not proof. Existing compliance authorization material was previously assessed as unverified identity/scope declaration only; this run does not override that assessment. Submit evidence through the established controlled repository review process; this task has not contacted any owner.
