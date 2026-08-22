# G1 decision-by-decision completion runbook - 2026-08-19

## Outcome and boundary

This runbook tells the governance owner, 33 role assignees and independent verifier exactly how to complete G1. It is an operational handoff, not approval evidence.

G1 remains `BLOCKED_0_OF_11`. No person is currently verified for any of the 17 distinct G1 roles. The live register must remain untouched until real identity, authority, approval and verifier evidence exists.

Frozen contract for every envelope:

- Artifact: `STOQUIFY-POS-G1-CONTRACT-FREEZE-0.2.0-20260817`
- Version: `0.2.0`
- Path: `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json`
- SHA-256: `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db`

Every signer must see and approve the complete hash. An abbreviated hash is for human readability only and cannot be the signed binding.

## Phase 0: governance must make collection possible

Before contacting signers:

1. Name the owner and authoritative source of the G1 role roster.
2. Define stable G1 authority codes corresponding exactly to the 17 contract roles.
3. Confirm the real people, stable subject IDs, tenant, appointment references, scope and dates.
4. Approve delegation rules, permitted multi-role assignments, prohibited combinations and verifier independence.
5. Define qualification evidence for the Cameroon and accounting reviewers.
6. Approve evidence retention, redaction, immutable export and verification policy.
7. Select an organization-controlled approval workflow that can export immutable evidence and an audit trail.
8. Approve authentication assurance and MFA expectations.

If no existing workflow meets the evidence contract, governance must separately authorize a bounded app-native pilot. Do not improvise one inside the live register.

## Standard procedure for every obligation

### A. Authority preflight

The governance owner confirms the signer using a stable identity, not a display name. Verify exact role, tenant, scope, effective dates, delegation, conflict and SoD. Qualified reviewers also require dated qualification evidence.

### B. Envelope preparation

Create the signer envelope from the 33-obligation register. Include decision ID/title, exact selected option, full contract identity/path/hash, decision rationale, evidence list, affected capabilities, rollback/disable policy and exact approver role.

### C. Signer review and fresh authentication

The signer inspects all linked evidence, reauthenticates through the approved workflow and deliberately selects approve or reject. Record trusted `freshAuthenticatedAt` and `approvedAt`. The approval must occur at or after fresh authentication and no more than ten minutes later. If the window expires, reauthenticate and repeat.

### D. Evidence export

Export the final approval artifact and audit trail without modification. Record provider, envelope ID, signature reference, final evidence path/URI, audit-trail path/URI, export time and retention class. Compute lowercase SHA-256 over the exact final evidence bytes.

### E. Independent verification

A separate authorized verifier resolves the identity, authority, qualification, SoD, authentication, decision/hash binding, signature reference and audit trail. The verifier independently rehashes the contract and evidence and records a reproducible pass/fail result.

### F. Controlled import

Only a passed obligation may be copied into the matching live decision. Only a decision with all three exact roles may be set to `APPROVED`. Partial decisions remain pending.

## D-01: Store-credit tender disposition

Selected option: `DISABLE_HIDE_AND_REJECT_STORE_CREDIT`

Plain meaning: the current POS accepts cash only. Store credit remains hidden and rejected until Stoquify has a separately governed store-credit instrument, customer-liability ledger, issuance/redemption lifecycle and reconciliation controls.

Required roles and accountability:

- Product owner: accepts the product scope and user-facing exclusion.
- Financial controller: accepts that no store-credit liability is created or redeemed in the current scope.
- Payments owner: accepts that store credit is not an authorized tender method.

Evidence to inspect:

- `services/pos/pos.service.ts`
- `components/pos/ProfessionalPOSSystem.tsx`
- G1 technical result showing cash-only enforcement.

Each signer explicitly agrees that store credit is disabled and that later enablement requires a new governed ledger/tender decision. Sign the D-01 envelope bound to the complete contract SHA-256 above. Export and hash each final approval. A governance/control verifier checks all three roles.

Invalidation: POS exposes store credit, a new store-credit policy is adopted, the contract hash changes, an authority expires/revokes, timing fails or evidence cannot be rehashed.

Live-register completion: exact option, accountable rationale, version, future review date, evidence links, `pos.store-credit`, fail-closed policy and three verified approvals. Confirm D-01 changes from pending to approved in the G1 gate.

## D-02: Physical terminal/register and drawer session boundary

Selected option: `TERMINAL_CURRENT_SESSION_CAS_PLUS_ONE_SESSION_DRAWER_OPENING_CLAIM`

Plain meaning: one terminal claims a current POS session using compare-and-set protection, and that session has one drawer-opening claim. The separate unique active-drawer aggregate is not yet proven and remains an explicit limitation.

Required roles and accountability:

- Retail operations owner: accepts the store procedure, ownership conflict response and recovery workflow.
- POS architect: accepts the current concurrency/invariant design and documented gap.
- Security owner: accepts identity/session/tenant ownership and misuse protections.

Evidence to inspect:

- `prisma/schema.prisma:POSStation.currentSessionId`
- `services/pos/pos.service.ts:openPOSShift`
- `services/pos/pos.service.ts:commitPOSSale`
- Frozen D-02 limitation text.

Each signer explicitly agrees to the current claim model and acknowledges the missing dedicated unique active-drawer aggregate. The evidence envelope must include the full contract hash and limitation. An independent architecture/security verifier checks source mapping, role authority and all hashes.

Invalidation: claim invariant changes, limitation is removed without evidence, cross-session ownership is possible, authority/timing/evidence fails or contract bytes change.

Live-register completion: evidence links, terminal/session capabilities, conflict fail-closed policy and all three approvals. Confirm D-02 gate credit.

## D-03: First electronic payment provider

Selected option: `ELECTRONIC_TENDER_DISABLED_UNTIL_NAMED_PROVIDER_APPROVED`

Plain meaning: card, mobile money and bank-transfer capture stay unavailable until a named provider, merchant scope, state model, security controls, settlement evidence, reconciliation and kill switch are approved.

Required roles and accountability:

- Payments owner: owns tender/provider state and operational integration policy.
- Treasury owner: owns settlement, cash visibility and reconciliation consequences.
- Security owner: owns credentials, provider trust, abuse controls and kill-switch safety.

Evidence to inspect:

- `services/pos/pos.service.ts:assertSupportedSaleTenders`
- `components/pos/ProfessionalPOSSystem.tsx:tenderMethods`
- Any provider proposal only as future evidence, not current authorization.

Each signer agrees that electronic capture remains disabled. Sign D-03 with the full contract hash. The verifier confirms no envelope wording accidentally approves a provider or production tender.

Invalidation: any electronic tender becomes available, a provider is selected, settlement/security policy changes, authority/timing/evidence fails or contract bytes change.

Live-register completion: `pos.card`, `pos.mobile-money`, `pos.bank-transfer`, cash-only rollback and all three approvals. Confirm D-03 gate credit.

## D-04: Offline tender policy

Selected option: `OFFLINE_CAPTURE_DISABLED`

Plain meaning: sales requiring offline capture are not finalized offline. Offline capture stays disabled until device identity, ordered replay, idempotency, conflict handling, recovery and reconciliation evidence are approved.

Required roles and accountability:

- Product owner: accepts the online-only product scope.
- Risk owner: accepts the fail-closed treatment and residual availability tradeoff.
- Retail operations owner: accepts store procedures and customer recovery handling.

Evidence to inspect:

- `services/pos/offline-sync.service.ts`
- `docs/pos-enterprise-grade-audit/EXECUTION_00_DECISION_REGISTER.json`
- Current offline/replay readiness evidence as context, without broadening the decision.

Each signer agrees that offline capture remains disabled, not merely hidden in UI. Sign D-04 with the full contract hash. The verifier checks that the envelope does not authorize offline tender or replay in production.

Invalidation: offline capture becomes active, device/replay policy changes, authority/timing/evidence fails or contract bytes change.

Live-register completion: offline capabilities, online-only fail-closed policy and all three approvals. Confirm D-04 gate credit.

## D-05: Browser, terminal and peripheral support matrix

Selected option: `EDGE_151_WINDOWS_10_25H2_SIMULATED_DESKTOP_PDF_ONLY_DEVELOPMENT`

Plain meaning: the current evidence supports only the named simulated development setup and PDF/desktop behavior. It does not certify physical printers, drawers, scanners, payment terminals or a production support matrix.

Required roles and accountability:

- Retail operations owner: accepts the limited operating scope and exclusions.
- QA owner: confirms what was actually tested and what was not.
- Support owner: accepts the supported/unsupported boundary and escalation wording.

Evidence to inspect:

- `docs/pos-enterprise-grade-audit/templates/TEMPLATE-04-HARDWARE-COMPLIANCE-MATRIX_FILLED_20260817.md`
- Associated test evidence and explicit production exclusions.

Each signer agrees only to the development matrix, not physical or production certification. Sign D-05 with the full contract hash. The verifier checks that evidence dates, browser/OS versions and simulated-versus-physical labels are explicit.

Invalidation: browser/OS/device matrix changes, a production or physical-support claim is introduced, evidence becomes stale, authority/timing/evidence fails or contract bytes change.

Live-register completion: browser/print/PDF/simulation capabilities, unsupported fail-closed policy and all three approvals. Confirm D-05 gate credit.

## D-06: Returns, voids and refunds policy

Selected option: `LINKED_COMPENSATING_FULL_SALE_REFUND_AND_VOID_CURRENT_SCOPE`

Plain meaning: the current scope supports linked full-sale void/refund compensation with fresh authentication and accounting/stock events. It does not claim production-proven partial return, inspection/disposition, materiality thresholds or maker-checker approval.

Required roles and accountability:

- Financial controller: accepts compensating accounting behavior and absence of fact rewriting.
- Retail operations owner: accepts full-sale-only procedures and unsupported-case escalation.
- Risk owner: accepts fraud/control limitations and required fail-closed behavior.

Evidence to inspect:

- `actions/pos/tender.actions.ts`
- `services/pos/pos.service.ts:refundPOSSale`
- `services/pos/pos.service.ts:voidPOSSale`
- `services/accounting/postings/post-refund.ts`
- `services/accounting/postings/post-void.ts`
- Frozen D-06 limitation text.

Each signer agrees to full-sale linked compensation only and explicitly acknowledges the partial-return/maker-checker gaps. Sign D-06 with the full contract hash. The verifier checks fresh-auth controls and stock/payment/accounting event linkage.

Invalidation: corrections rewrite completed facts, partial returns are introduced, event ownership changes, limitation wording changes, authority/timing/evidence fails or contract bytes change.

Live-register completion: correction capabilities, fail-closed event-evidence policy and all three approvals. Confirm D-06 gate credit.

## D-07: Cameroon development country/currency/language profile

Selected option: `CAMEROON_XAF_EN_FR_DEVELOPMENT_ONLY`

Plain meaning: Cameroon, XAF, English and French may be used for development only. The decision does not authorize production fiscalization, tax/statutory claims or country-pack certification.

Required roles and accountability:

- Product owner: accepts Cameroon as the bounded development profile.
- Financial controller: accepts XAF/accounting development scope without statutory claims.
- Qualified Cameroon country-pack reviewer: reviews dated Cameroon source provenance and confirms only the stated development boundary.

Evidence to inspect:

- `what-next/statutory-country-pack-production-readiness.json`
- `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json`
- Qualification and scope evidence for the named reviewer.

The qualified reviewer must be a real individual; organization labels such as DGI, MINFI or CNPS are not signer identities. All signers agree that production/statutory use remains disabled. Sign D-07 with the full contract hash. A separate verifier checks qualification, provenance dates and scope.

Invalidation: country-pack sources or rules change, development-only boundary changes, qualification expires/is disproven, authority/timing/evidence fails or contract bytes change.

Live-register completion: country/currency/locale capabilities, production-fiscalization fail-closed policy and all three approvals. Confirm D-07 gate credit without claiming legal certification.

## D-08: Pilot service levels and error budgets

Selected option: `NO_PRODUCTION_SLO_UNTIL_D05_MATRIX_AND_MEASURED_BASELINE`

Plain meaning: Stoquify must not publish a production POS SLO or error budget until the D-05 support matrix and measured operational baseline exist.

Required roles and accountability:

- SRE owner: confirms that no measured production baseline currently supports an SLO claim.
- Product owner: accepts the product/release limitation.
- Support owner: accepts customer/support communication and escalation without an SLO promise.

Evidence to inspect:

- Frozen D-08 contract text.
- D-05 support-matrix evidence.
- Any actual telemetry only if it is measured, dated and in scope.

Each signer agrees to make no production SLO claim. Sign D-08 with the full contract hash. The verifier confirms the envelope does not invent performance numbers or availability commitments.

Invalidation: a measured baseline or support matrix changes the policy, an SLO is published, authority/timing/evidence fails or contract bytes change.

Live-register completion: SLO/error-budget/supportability capabilities, claim-withdrawal policy and all three approvals. Confirm D-08 gate credit.

## D-09: Delivery invoice recognition event

Selected option: `ORDER_CONFIRMATION_NON_POSTING_INVOICE_FROM_ACCEPTED_DELIVERED_QUANTITY`

Plain meaning: confirming an order does not post revenue or create the governed invoice. Invoice recognition depends on accepted delivered-quantity evidence. The delivery/O2C aggregates are not currently implemented as a production-ready flow.

Required roles and accountability:

- Financial controller: accepts the accounting recognition boundary.
- Order-to-cash product owner: accepts the end-to-end order/delivery/invoice process contract.
- Qualified accounting reviewer: independently reviews the accounting treatment and stated implementation gap.

Evidence to inspect:

- `prisma/schema.prisma:SalesOrderStatus`
- Frozen D-09 implementation-status text.
- Dated reviewer qualification evidence.

Each signer agrees that order confirmation is non-posting and that accepted delivery evidence owns invoice recognition. Sign D-09 with the full contract hash. The verifier checks qualification, accounting scope and that no legal/accounting certification is implied beyond the reviewed decision.

Invalidation: recognition trigger changes, delivery aggregates are implemented under a new policy, qualification changes, authority/timing/evidence fails or contract bytes change.

Live-register completion: order/delivery/invoice/revenue capabilities, invoice fail-closed policy and all three approvals. Confirm D-09 gate credit.

## D-10: Reservation, availability and goods-issue policy

Selected option: `RESERVATION_AFFECTS_AVAILABILITY_ONLY_PHYSICAL_ISSUE_OWNS_STOCK_AND_COGS`

Plain meaning: a reservation reduces available-to-promise but does not reduce physical on-hand stock or recognize COGS. The authoritative physical goods issue owns stock reduction and COGS evidence.

Required roles and accountability:

- Inventory controller: accepts reservation-versus-on-hand control semantics.
- Fulfillment owner: accepts physical goods issue as the fulfillment source of truth.
- Accounting owner: accepts physical issue as the COGS recognition trigger.

Evidence to inspect:

- `services/inventory/inventory-stock-event.service.ts:postPOSStockIssue`
- `services/inventory/inventory-stock-event.service.ts:postStockReservation`
- Frozen D-10 implementation-status text.

Each signer agrees to distinct reservation and physical-issue events with exactly-once stock/COGS linkage. Sign D-10 with the full contract hash. The verifier checks inventory/accounting ownership and current implementation limitations.

Invalidation: reservation starts reducing on-hand/COGS, goods-issue ownership changes, duplicate/missing linkage appears, authority/timing/evidence fails or contract bytes change.

Live-register completion: reservation/goods-issue/on-hand/COGS capabilities, fail-closed posting policy and all three approvals. Confirm D-10 gate credit.

## D-11: Session, drawer, business day, statement, reconciliation and close

Selected option: `KEEP_SESSION_DRAWER_BUSINESS_DAY_STATEMENT_RECONCILIATION_AND_CLOSE_SEPARATE`

Plain meaning: a cashier session, drawer, business day, provider statement, reconciliation run and accounting close are separate controlled facts. Completing one must not silently certify the others. The business-day aggregate remains an explicit gap.

Required roles and accountability:

- Financial controller: accepts reconciliation/close separation and close evidence requirements.
- Treasury owner: accepts statement, cash and reconciliation boundaries.
- Retail operations owner: accepts session, drawer and business-day procedures and handoffs.

Evidence to inspect:

- `prisma/schema.prisma:POSSession`
- `prisma/schema.prisma:StatementFile`
- `prisma/schema.prisma:ReconciliationRun`
- `services/accounting/periods.service.ts`
- Frozen D-11 implementation-status text.

Each signer agrees that these boundaries remain separate and that missing/stale/unreconciled evidence blocks sign-off. Sign D-11 with the full contract hash. The verifier checks that the envelope does not treat shift close as reconciliation or accounting close.

Invalidation: boundaries are conflated, business-day/statement/reconciliation/close policy changes, unresolved cash is allowed through close, authority/timing/evidence fails or contract bytes change.

Live-register completion: session/drawer/business-day/statement/reconciliation/close capabilities, close fail-closed policy and all three approvals. Confirm D-11 gate credit.

## Live-register import checklist

For each D-01 through D-11 decision:

- exact decision ID and selected option;
- accountable rationale approved by all three roles;
- `approvalStatus = APPROVED` only after all three obligations pass;
- effective version and future review/expiry timestamp;
- durable evidence links;
- affected capabilities;
- fail-closed rollback/disable policy;
- three approval entries with verified name, exact role, authority reference, fresh-auth time, approval time, signature reference and lowercase evidence SHA-256.

The importer or preparer must not act as the only verifier.

## Gate rerun

After all 33 obligations pass independent verification:

```powershell
npm run pos:g1:contract:gate
npm run pos:enterprise:program:gate
```

Expected valid outcome:

- G1 technical checks: 13/13;
- G1 approvals: 11/11;
- G1 status: `PASSED`;
- POS program first blocker advances to G2.

G2 becomes eligible for its own assessment. It does not pass automatically. Production still requires separate release authorization.
