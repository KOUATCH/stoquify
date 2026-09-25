# External verification procedures

Generated 2026-09-24T09:07:34.739Z. Procedures and capture templates only; no external test or approval is claimed. Actual owner identities, provider credentials, devices and production-like environments have not been supplied.

For every returned artifact record: requirement ID, gate, evidence class, exact release/contract/country scope, source revision and source-manifest hash, environment and synthetic-data provenance, operator/reviewer authority, start/end times, scenario, expected/actual result, redacted artifact paths and hashes, defects, exclusions, expiry, stop-condition evaluation and detached authenticated approval. Follow [approval-verifier-contract.md](approval-verifier-contract.md) for machine-verifiable envelopes and trust configuration.

## EXT-G1-APPROVALS — G1

Required: D-01 through D-11 role-complete detached approvals.

Declared status: MISSING_AUTHENTIC_RETURN; actual completion: not established. Accountable roles: Product, finance, security and domain approvers listed per decision; named people: not supplied. Evidence class: ARTIFACT_BOUND_APPROVAL.

1. Review all 11 packets and resolve scope disagreements before signing.
2. Confirm authority for each required role using the approved identity/authority system.
3. Perform fresh authentication and approve the exact decision within the required time window.
4. Export the detached signed artifact, record its byte hash and evidence reference, and have the gate verify it with an independently managed trusted key.
5. Run G1 fail mode; missing, expired, mismatched or untrusted artifacts must remain blocked.

Acceptance: all applicable gate requirements and stop conditions below must be evaluated; any failure, missing prerequisite, unverifiable approval or expired evidence prevents release credit.

- All 11 decisions approved by every required role against the exact frozen contract.

Stop conditions:

- Missing or unverifiable accountable approval.

## EXT-PROVIDER-SANDBOX — G3A

Required: Named provider, merchant sandbox and official callback/statement contract.

Declared status: MISSING; actual completion: not established. Accountable roles: Payments, treasury, accounting and security owners; named people: not supplied. Evidence class: PROVIDER_SANDBOX.

1. Name the provider and merchant sandbox; provide official callback/signature and settlement specifications and a managed secret reference without exposing credentials.
2. Prepare synthetic orders and provider test cases for success, decline, timeout, unknown, duplicate, late capture, reversal, refund, dispute and chargeback.
3. Execute only provider-documented sandbox operations; verify signed callbacks, replay rejection and provider-authoritative transitions.
4. Tie out sale/payment/settlement/fee and bank-statement evidence; inject a statement mismatch and confirm owned exception handling.
5. Capture redacted request/callback/statement references and actual results; provider placeholders and local mocks are insufficient.

Acceptance: all applicable gate requirements and stop conditions below must be evaluated; any failure, missing prerequisite, unverifiable approval or expired evidence prevents release credit.

- Success
- Decline
- Timeout
- Unknown
- Duplicate
- Late capture
- Reversal
- Refund
- Dispute
- Chargeback
- Settlement
- Statement mismatch

Stop conditions:

- Pending/unknown completes sale
- Unsigned/replayed callback posts
- Provider uncertainty mapped to success
- Unowned captured-without-sale or settlement drift

## EXT-CM-QUALIFIED-REVIEW — G3B

Required: Qualified Cameroon review plus independent checker.

Declared status: MISSING_AUTHENTIC_RETURN; actual completion: not established. Accountable roles: Qualified Cameroon country reviewer, independent checker and financial controller; named people: not supplied. Evidence class: QUALIFIED_HUMAN_REVIEW.

1. Identify reviewer and checker authority and the exact country-pack/release scope.
2. Assemble dated official source citations for each enabled fiscal/tax/numbering/submission/retention/correction requirement; have qualified reviewers verify them.
3. Review immutable receipt snapshots, numbering and correction lineage against the supported scope; document explicit unsupported decisions.
4. Exercise authority outage/rejection and delivery retry in the approved nonproduction environment.
5. Return signed findings, exclusions, required remediation and approval bound to the exact artifact. This procedure asserts no legal rule or compliance result.

Acceptance: all applicable gate requirements and stop conditions below must be evaluated; any failure, missing prerequisite, unverifiable approval or expired evidence prevents release credit.

- Immutable source before sale result
- Historical snapshot independence
- Number uniqueness and replay
- Authority outage and rejection
- Delivery failure recovery
- Correction lineage
- Token rotation and revocation

Stop conditions:

- Sale completes without immutable source
- Final number allocated outside country authority
- Delivery failure rolls back or hides sale
- Original fiscal evidence mutated

## EXT-HARDWARE-MATRIX — G4

Required: Physical device certification or signed exclusion.

Declared status: MISSING_OR_EXCLUDED; actual completion: not established. Accountable roles: Retail operations, QA, accessibility/French reviewers and support owner; named people: not supplied. Evidence class: PHYSICAL_HARDWARE.

1. Record actual OS/browser versions and each scanner, printer and drawer model/connection; obtain explicit signed exclusions for omitted hardware.
2. Sign in with an existing authorized cashier and separately verify prohibited-role denial without widening access.
3. Measure actual desktop/tablet/mobile viewport dimensions; exercise EN/FR checkout recovery, keyboard-only navigation, focus, screen reader, touch, 200% zoom and 320px reflow.
4. On included physical devices, test scan/print/drawer operations, disconnect, retry, duplicate input and fallback using synthetic data.
5. Capture device/operator identity and redacted evidence. Browser PDF, simulated device status and ineffective viewport overrides cannot qualify as physical coverage.

Acceptance: all applicable gate requirements and stop conditions below must be evaluated; any failure, missing prerequisite, unverifiable approval or expired evidence prevents release credit.

- Authenticated EN/FR at all viewports
- Keyboard
- Screen reader
- Touch
- 200% zoom and 320px reflow
- Scanner
- Printer
- Drawer
- Device disconnect/retry/fallback

Stop conditions:

- Unknown device rendered ready
- Responsibility lost on lock/handover
- Unsupported offline or tender shown available
- Secret/PII in screenshot or telemetry

## EXT-CLOSE-CYCLE — G5

Required: Production-like business-day and settlement cycle.

Declared status: MISSING; actual completion: not established. Accountable roles: Store supervisor, controller and treasury owner; named people: not supplied. Evidence class: PRODUCTION_LIKE_OPERATIONS.

1. Prepare a guarded production-like environment with synthetic sales, sessions, declarations, settlements and bank statements.
2. Run a complete business-day cycle across multiple sessions with an explicit included-session manifest.
3. Exercise blind declarations, approved variance thresholds and no-self-approval rules; reconcile cash/provider/ledger/bank differences.
4. Introduce a late correction and prove close evidence is invalidated and routed for review.
5. Capture statement hashes, tie-outs, exception ownership, approval records and reopen history; a drawer-rendering test does not complete this cycle.

Acceptance: all applicable gate requirements and stop conditions below must be evaluated; any failure, missing prerequisite, unverifiable approval or expired evidence prevents release credit.

- Session/declaration/day/statement/reconciliation/accounting-close state separation
- Cash/provider/ledger/bank tie-out
- Suspense ownership and aging
- Late-correction invalidation

Stop conditions:

- Z omits accepted event
- Self-approved material variance
- Unexplained tie-out difference
- Late correction leaves close evidence valid

## EXT-INVENTORY-POLICY — G6

Required: Inventory scope and unsupported-combination decision.

Declared status: MISSING_APPROVAL; actual completion: not established. Accountable roles: Inventory controller, fulfillment owner and accounting owner; named people: not supplied. Evidence class: ARTIFACT_BOUND_APPROVAL.

1. Declare negative-stock, unit conversion, lot, serial, reservation, issue and reversal scope with explicit unsupported combinations.
2. Review immediate POS goods issue separately from delivery reservations and fulfillment.
3. In a guarded synthetic database, race reservations and issues, then exercise partial fulfillment, backorder, cancellation and reversal.
4. Verify no oversell, no duplicate stock/COGS, and no on-hand/COGS movement from reservation alone.
5. Return signed policy and scope evidence; attach actual integration results without treating policy approval as proof of implementation.

Acceptance: all applicable gate requirements and stop conditions below must be evaluated; any failure, missing prerequisite, unverifiable approval or expired evidence prevents release credit.

- Concurrent reservation
- Partial fulfillment
- Backorder
- Cancellation
- Goods issue
- Issue reversal
- No oversell
- No duplicate COGS

Stop conditions:

- Confirmation posts accounting
- Reservation changes on-hand/COGS
- Oversell
- Duplicate goods issue or COGS
- Unsupported inventory combination proceeds

## EXT-AR-RETURNS-POLICY — G7

Required: Recognition, allocation, return and correction policies.

Declared status: MISSING_APPROVAL; actual completion: not established. Accountable roles: Controller, qualified accounting reviewer, treasury and returns owner; named people: not supplied. Evidence class: ARTIFACT_BOUND_APPROVAL.

1. Specify delivery recognition, advance/deposit exclusions, invoice eligibility, allocation/unapplied cash, refunds and return disposition policies.
2. Trace partial delivery through invoice, collection, allocation, return receipt/inspection/disposition and source-linked credit/refund.
3. Exercise duplicates, undelivered billing attempts, unauthorized corrections and restock-before-disposition attempts in synthetic tests.
4. Tie out receivables/revenue/tax/cash/stock and prove maker-checker and fresh-auth behavior where required.
5. Return signed policy and reviewed scenarios bound to scope; unsupported workflows stay disabled.

Acceptance: all applicable gate requirements and stop conditions below must be evaluated; any failure, missing prerequisite, unverifiable approval or expired evidence prevents release credit.

- No double billing
- AR/revenue/tax balance
- Explicit allocation/unapplied cash
- Return disposition before sellable restock
- Cross-domain partial-flow tie-out
- Maker-checker/fresh-auth matrix

Stop conditions:

- Undelivered quantity billed without approved advance policy
- Funds silently auto-applied
- Return increases sellable stock before disposition
- Correction rewrites original fact

## EXT-OPS-DRILLS — G8

Required: Load, recovery, failover, rotation, penetration, alerting and incident drills.

Declared status: MISSING; actual completion: not established. Accountable roles: SRE, security/privacy, QA, support and incident owners; named people: not supplied. Evidence class: PRODUCTION_LIKE_OPERATIONS.

1. Freeze the candidate, environment, workload and approved SLO/error thresholds; retain a complete successful build and redacted secret-configuration evidence.
2. Run bounded load/soak, network loss, provider outage and worker-backlog scenarios without real customer transactions.
3. Execute backup restore, point-in-time recovery and failover in designated disposable recovery targets; verify evidence/data consistency.
4. Exercise managed secret rotation, alert delivery/acknowledgement and an incident drill with named owners/runbooks.
5. Attach independent security/privacy and accessibility review within stated scope; record measured outcomes, rollback and unresolved findings.

Acceptance: all applicable gate requirements and stop conditions below must be evaluated; any failure, missing prerequisite, unverifiable approval or expired evidence prevents release credit.

- Load
- Soak
- Network loss
- Provider outage
- Worker backlog
- Backup restore
- PITR
- Failover
- Secret rotation
- Penetration/privacy
- Alert delivery and acknowledgement
- Incident drill

Stop conditions:

- Critical defect open
- Evidence lost on restore
- Alert has no owner/runbook
- Non-critical source blanks command surface
- Second finalizer or direct stock owner introduced

## EXT-PILOT-COHORTS — G9

Required: R0 through R6 cohort evidence and signed decisions.

Declared status: NOT_STARTED; actual completion: not established. Accountable roles: Product, controller, security, country reviewer, rollout and support owners; named people: not supplied. Evidence class: CONTROLLED_PILOT.

1. Do not start until prerequisite gates and separate pilot authorization are complete.
2. Name the cohort/design partner, agreement, supported capabilities, operating limits and daily review owner.
3. Capture an entry snapshot for each R0-R6 stage; define measured stop conditions and rollback/support capacity.
4. During each authorized stage record service-level/error-budget, close/reconciliation, incidents and support load.
5. Obtain artifact-bound expansion or rollback decisions for each cohort; never infer permission for R1-R6 from an R0 local pass.

Acceptance: all applicable gate requirements and stop conditions below must be evaluated; any failure, missing prerequisite, unverifiable approval or expired evidence prevents release credit.

- Entry snapshot per cohort
- SLO/error-budget report
- Close and reconciliation cycles
- Incident and support load
- Stop-condition evaluation
- Signed expansion or rollback decision

Stop conditions:

- Duplicate consequence
- False payment success
- Cross-tenant access
- Fiscal/stock/accounting mismatch
- Unrecoverable close
- Evidence loss
- Support overload
- Error-budget breach

