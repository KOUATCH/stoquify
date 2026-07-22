# Cash Leakage Radar Source And Exception Ownership Audit

Generated: 2026-07-19  
Program: Stoquify Referral-Worthy Execution Program  
Invocation: `/stoquify-leakage-radar`  
Operating skill: `stoquify-cash-leakage-radar`  
Slice: Phase 3 / Slice 1, audit only

## Executive Decision

Phase 3 may proceed, but no Leakage Radar product implementation is certified yet.

The canonical lifecycle owner for cross-domain leakage cases should be the existing `WorkflowAssuranceIncident` spine. POS, payment reconciliation, and inventory services must remain the owners of their source truth. A narrow Leakage Radar service may evaluate typed domain evidence and project review cases through the assurance spine, but it must not duplicate that spine in a new generic exception table.

`PaymentException` is rejected as the cross-domain owner. It is correctly anchored to provider events, statements, payment transactions, reconciliation runs, and suspense. Extending it to POS cash and inventory would blur domain ownership and inherit an incomplete event and source-attribution contract.

The first deterministic exception rule should be **closed-shift cash shortage requiring review**, keyed to one POS session. It is not safe to implement that rule yet. The current shift-close path can manufacture a zero variance when the cashier leaves the count blank, can be closed twice under concurrency, has no durable close business event, and does not enforce cashier or managed-location scope. Current drawer-dashboard variance alerts remain operational hints only.

The recommended next implementation slice is therefore:

> **Phase 3 / Slice 2: POS Shift Close Evidence Foundation**

That slice must harden the source command only. It must not create Leakage Radar incidents, dashboards, predictive scoring, inventory-loss behavior, AI authority, or WhatsApp authority.

## Scope And Non-Goals

This audit inspected source ownership, exception ownership, the first rule, evidence, lifecycle, permissions, entitlement, migration needs, tests, rollout, and release gates.

No product code, Prisma model, migration, route, action, component, or generated UI artifact was intentionally changed by this audit. The repository is a shared dirty worktree; unrelated HRIS and Prisma changes were not modified.

The audit does not:

- certify historical closed shifts as cash-count evidence;
- convert dashboard alerts into durable cases;
- authorize a new generic `LeakageException` or `ActionItem` table;
- authorize a cross-module POS-sale/inventory detector as the first rule;
- authorize dismissal, resolution, or manager UI;
- begin Inventory Loss implementation;
- treat an exception as fraud, theft, or staff misconduct.

## Evidence Inspected

### Strategy And Program Control

- `docs/referrals/stoquify-referral-worthy-war-plan-report.md`
- `docs/referrals/stoquify-referral-worthy-execution-roadmap.md`
- `docs/referrals/referral-worthy-platform-features-report.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_2_PROMOTION_REPORT_2026-07-19.md`
- Installed `stoquify-cash-leakage-radar` skill contract

### Live Source And Control Boundaries

- `services/pos/pos.service.ts`
- `services/pos/pos.schemas.ts`
- `services/pos/drawer-dashboard.service.ts`
- `actions/pos/session.actions.ts`
- `actions/pos/drawer-dashboard.actions.ts`
- `actions/pos/tender.actions.ts`
- `components/pos/ProfessionalPOSSystem.tsx`
- `services/events/business-event.service.ts`
- `services/payments/provider-event.service.ts`
- `services/payments/statement-import.service.ts`
- `services/reconciliation/payment-reconciliation-run.service.ts`
- `services/reconciliation/payment-suspense-workflow.service.ts`
- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/assurance-registry.service.ts`
- `services/assurance/assurance-incident.service.ts`
- `actions/assurance/workflow-assurance-incident.actions.ts`
- `services/inventory/inventory-adjustment.service.ts`
- `services/inventory/inventory-reconciliation.service.ts`
- `services/end-of-day-close/end-of-day-close-readiness.service.ts`
- `services/modules/module-control-contracts.ts`
- `lib/security/rbac-permissions.ts`
- `lib/security/rbac.ts`
- `lib/security/audit-log.ts`
- `prisma/schema.prisma`
- Relevant focused tests and release-gate scripts
- Existing graph reports, including separate assurance, POS, and payment-reconciliation communities

Three focused read-only reviewers independently challenged POS source integrity, assurance ownership, and RBAC/release controls. Their conclusions agree on the no-go status of the current close source and on the need for stronger incident identity and maker-checker controls.

## Live Boundary Findings

### 1. Current POS close is not trusted cash-count evidence

`closePOSShift` reads an `ACTIVE` session before entering its transaction, then updates by session ID only (`services/pos/pos.service.ts:792-860`). Two concurrent closers can both read the same active session, overwrite the close amounts, append separate `CLOSING_BALANCE` transactions, and clear the terminal pointer.

The sale path also reads an active session and later updates it by ID (`services/pos/pos.service.ts:1245-1481`). Without a conditional active-state update or row-level serialization, a sale can race a close and mutate totals after the shift has become closed. Refund/void session updates have the same stale-read risk around `services/pos/pos.service.ts:1823-2024`.

The user interface does not require an actual count. When the closing field is blank, it submits the cash drawer's system balance or the session expected balance as `actualBalance` (`components/pos/ProfessionalPOSSystem.tsx:592-594`, `647-661`). Because drawer current and expected balances are maintained from system transactions, this fallback can manufacture an apparent exact count and zero variance.

`closeShiftSchema` requires a nonnegative amount but has no explicit count attestation, idempotency input, count timestamp, or conditional difference explanation (`services/pos/pos.schemas.ts:25-29`).

The close transaction writes no domain audit, business event, outbox message, payload hash, or immutable source version. `auditAllowed` on the action records an authorization decision, not successful business completion (`actions/pos/session.actions.ts:42-50`, `lib/security/rbac.ts:283-291`). Security-audit failures are logged and swallowed (`lib/security/audit-log.ts:47-66`), so that record cannot be the close source of truth.

`POSSession.userId` is the session cashier/opener. The closer is only indirectly available on a closing drawer transaction, and the current code can create more than one. The service also selects the terminal's oldest drawer without proving that it still belongs to the session location.

### 2. Phase 2 close readiness does not certify cash truth

The end-of-day readiness service selects only POS session ID, status, start/end time, and update time (`services/end-of-day-close/end-of-day-close-readiness.service.ts:100-114`). It considers a shift consistent when closed status and end time agree (`:387-406`), and its evidence hash omits expected cash, counted cash, signed variance, drawer, closing actor, and close event (`:521-545`).

This is valid for Phase 2's operational question, "Are branch shifts closed?" It is not evidence that the drawer was physically counted or that a cash shortage is real.

### 3. Drawer-dashboard alerts are transient signals

`getCashDrawerDashboard` calculates high and medium variance arrays from a bounded read query and returns aggregate alerts with constant IDs (`services/pos/drawer-dashboard.service.ts:244-304`, `347-351`, `481-509`). It does not create an exception, audit event, business event, owner assignment, source hash, or resolution history.

The XAF/XOF thresholds of 2,000 and 10,000 and the fallback thresholds of 10 and 50 are hard-coded and unversioned (`services/pos/drawer-dashboard.service.ts:97-104`). The alerts use absolute variance, which merges shortages and overages. They may inform an initial observe-mode policy, but they cannot be promoted as durable case identity.

### 4. Strong adjacent POS evidence patterns already exist

Final sale, refund, and void workflows write transactional domain audits and business events with actor, location, register, source identity, idempotency, payload hashes, and outbox messages. Examples include `pos.sale.finalized` (`services/pos/pos.service.ts:1556-1645`), `pos.refund.issued` (`:2157-2207`), and `pos.sale.voided` (`:2322-2368`).

The shift-close source should follow this established pattern. Refund and void are good later Leakage Radar sources. Discount override is rejected as an initial source because the active cart mutation contract does not currently expose a first-class override command to monitor.

### 5. Payment exceptions remain payment-owned

`PaymentException` has useful severity, status, owner, evidence, SLA, and source fields, but its first-class relations are payment/provider/statement/reconciliation/suspense records (`prisma/schema.prisma:4597-4650`). Provider ingestion creates tamper, signature, and replay exceptions; statement import creates duplicate-reference exceptions; reconciliation creates missing-payment and mismatch exceptions.

The model has no append-only exception-event relation and no first-class location, terminal, subject actor, currency, signed variance, or amount-at-risk contract. A reviewer also identified an existing risk that reconciliation-created exceptions and suspense items are created separately without always linking `PaymentException.suspenseItemId`. That payment-specific issue strengthens the decision not to widen this table into the cross-domain case owner.

Payment exceptions may later be source links inside a cross-domain Leakage Radar case. They remain authoritative for payment exception truth.

### 6. Workflow Assurance is the right spine, but needs hardening

`WorkflowAssuranceIncident` already owns organization, versioned check identity, workflow, module, source identity/hash, severity, status, evidence links, owner, due time, action route, occurrence count, timestamps, metadata, append-only events, alert deliveries, and maker-checker waivers (`prisma/schema.prisma:6362-6669`). The schema supports POS, inventory, payment reconciliation, and cross-module workflows.

Existing POS assurance definitions show the intended reusable control plane (`services/assurance/assurance-registry-contracts.ts:349-451`). Inventory adjustments show the stronger domain pattern for creator/approver separation and evidence hashes (`services/inventory/inventory-adjustment.service.ts:321-354`).

The shared spine has four blockers before Leakage Radar can use terminal resolution:

1. `normalizeAssuranceResult` includes severity and `sourceHash` in `fingerprint` (`services/assurance/assurance-registry-contracts.ts:959-981`), while reopen lookup requires the same fingerprint and a different source hash (`services/assurance/assurance-incident.service.ts:411-420`). The normal path therefore cannot preserve one logical case across changed evidence.
2. Generic resolve and suppress are immediate single-actor transitions. They do not revalidate source truth or prevent the source actor, explainer, or remediation actor from approving closure (`services/assurance/assurance-incident.service.ts:166-189`, `523-575`).
3. Acknowledge is a mutation protected by `controls.audit.read` (`actions/assurance/workflow-assurance-incident.actions.ts:60-75`). Read permission must not authorize a state change.
4. Assignment does not validate that the target owner belongs to the incident tenant, and the generic service lacks a complete allowed-transition matrix.

These are shared-control-plane hardening requirements for a later incident slice. They do not justify a duplicate Leakage Radar table.

## Canonical Ownership Decision

| Concern                                            | Canonical owner                                                         | Decision                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| POS shift expected cash, counted cash, close state | POS session/cash-drawer service plus immutable POS close business event | Source truth remains POS-owned                                  |
| Provider, statement, payment, suspense exceptions  | Payment reconciliation services and `PaymentException`                  | Payment-owned; link as evidence only                            |
| Inventory count, adjustment, write-off, reversal   | Inventory services and immutable stock/ledger events                    | Inventory-owned; later source domain                            |
| Cross-domain review-case lifecycle                 | `WorkflowAssuranceIncident` and incident events                         | Reuse after identity and transition hardening                   |
| Leakage rule and typed evidence adapter            | Narrow `services/leakage/` service layer                                | Evaluates source truth; owns no duplicate terminal truth        |
| Manager Action Center and future Leakage Radar UI  | Rebuildable read model over incident plus redacted source summaries     | Never owns resolution state                                     |
| AI copilot and WhatsApp                            | Notification/explanation assistants only                                | No detection, approval, dismissal, or source-of-truth authority |

### Rejected alternatives

- **`PaymentException` as generic owner:** rejected because it is payment-specific and lacks cross-domain history and attribution.
- **New `LeakageException` table:** rejected because it would duplicate the mature incident lifecycle before a proven schema gap exists.
- **BusinessSignal/ActionItem as owner:** rejected because these are regenerated projections and do not own durable terminal state.
- **Drawer-dashboard alert as owner:** rejected because it is aggregate, transient, unversioned, and non-actionable.
- **Cross-module sale/cash/inventory consistency as the first rule:** deferred. It has value, but it combines several domains, requires one-finding-per-source registry support, overlaps existing POS assurance checks, and has a larger false-positive and release surface than one hardened shift close.

## First Deterministic Exception Rule

### Rule identity

- Check key: `pos.closed_shift_cash_shortage.review`
- Definition version: `1`
- Workflow: `pos`
- Source type: `POSSession`
- Source ID: closed session ID
- Owner role: branch manager
- Execution: after-commit evaluator with scheduled retry
- Mode: observe only until policy, identity, and resolution gates are certified
- Product wording: "Cash shortage requiring review"

The first rule is shortage-only. Overage is a meaningful anomaly but has different causes, such as missed sales, opening-float errors, or change mistakes. It should be a later rule rather than being merged into a first cash-loss case by absolute value.

### Eligibility gate

A session is eligible only when all of the following are true:

- one committed `pos.shift.closed` business event with schema version 1 exists;
- the event belongs to the same organization, session, location, and terminal;
- the terminal requires a cash drawer and exactly one session/location-matched drawer close is present;
- the count was explicitly entered and attested, never defaulted from system balance;
- expected amount, counted amount, signed variance, currency, cashier, closer, and timestamps are complete;
- `signedVariance = countedAmount - expectedAmount` using decimal arithmetic;
- the persisted event payload hash matches a recomputed canonical source hash;
- an effective, approved threshold policy exists for the event currency and close time.

Legacy closed sessions without this event are `legacy_unverified` and are excluded. Missing or inconsistent evidence blocks evaluation and routes to source-integrity remediation. It must never create or label a shortage case.

### Sign, amount, threshold, and rounding semantics

- Signed variance: `countedAmount - expectedAmount`.
- Negative value: shortage.
- Positive value: overage.
- Amount at risk: `abs(signedVariance)` only when signed variance is negative.
- Exact equality with the review threshold triggers.
- A shortage below the review threshold does not create a durable case in version 1.
- Exact match and overage do not create this rule's case.

All source amounts must remain canonical decimal strings. The evaluator must not convert money through JavaScript `Number`. Policy selects the currency scale and rounding mode at `closedAt`; original and normalized values remain in evidence. XAF/XOF may seed an observe-only policy at review/high thresholds of 2,000/10,000 because those values already exist in the dashboard, but they are not production-approved merely because they exist. The generic 10/50 fallback is rejected. Unsupported currency policy produces a blocked evaluation, not a guessed threshold.

Policy records must have a stable policy ID, version, currency, review threshold, high threshold, minor-unit rule, rounding mode, effective-from time, and optional effective-to time. Historical cases remain pinned to the policy effective at close. A later policy change must not silently rewrite prior case severity.

## Close Source Evidence Contract

The prerequisite close command should commit one `pos.shift.closed` event using `eventSource: "POS"`, `schemaVersion: 1`, and a stable idempotency key such as `pos-shift:${sessionId}:closed`.

The canonical payload must include:

- organization ID;
- location ID and location code where safe;
- terminal ID and register number;
- drawer ID;
- session ID and session number;
- cashier/session-user ID;
- closer ID and whether the close is self or delegated;
- opening amount;
- expected cash amount;
- explicitly counted cash amount;
- signed variance;
- currency code;
- shift start, count, and close timestamps;
- closing drawer transaction ID;
- count-attestation version;
- source schema version.

The transaction must also write:

- domain audit action `POS_SHIFT_CLOSED` with safe before/after evidence;
- one `CLOSING_BALANCE` drawer transaction;
- one deduplicated outbox message for `pos.shift.closed`;
- the terminal pointer update;
- the conditional `ACTIVE -> CLOSED` session transition.

The business-event payload hash is the immutable source hash. Same session and same payload is an idempotent replay returning committed evidence. Same session and a different counted amount or evidence payload is a conflict, emits a durable conflict audit outside any rolled-back transaction, and does not mutate the close.

The command must serialize against sale, refund, and void session updates. Every competing session mutation must condition its write on the session still being `ACTIVE`; a stale writer must roll back its full transaction.

## Stable Case Identity And Source Drift

The logical case key is stable across evidence versions:

```text
organizationId + checkKey + definitionVersion + sourceType + sourceId
```

The stable fingerprint must exclude status, severity, and source hash. `sourceHash` represents the evidence version. The current assurance normalizer violates this rule and must be corrected before the first incident is created.

Unchanged evidence increments occurrence without duplicate alerting. Changed evidence on the same logical source reopens or updates the same case and records old/new hashes. Resolution must reload the source, recompute the hash, and reject stale evidence before any terminal transition.

Closed-shift financial fields must not be edited in place. A future correction command should create compensating reconciliation evidence and a new business event. It is outside the recommended next slice.

## Lifecycle And Maker-Checker Contract

1. **Detected:** deterministic evaluator creates an open case from trusted source evidence.
2. **Acknowledged:** authorized manager accepts ownership; this is a mutation permission, not audit-read.
3. **Assigned:** owner must be an active member of the same tenant and within allowed location scope.
4. **Explanation submitted:** cashier or designated operator may explain only their own/source-scoped case. Evidence is append-only; it does not resolve the case.
5. **Resolution proposed:** manager records outcome, remediation, evidence hash, and current source hash.
6. **Resolution approved:** independent checker with fresh authentication reruns the source rule and approves or rejects.
7. **Resolved or waived:** terminal state is written only after valid source recheck and maker-checker separation.
8. **Reopened:** newer source evidence or correction reopens the same logical case with append-only old/new hashes.

The source cashier, explanation author, resolution proposer, and remediation actor may not approve the same high-severity case. Suppression is not routine dismissal. False positive or policy override must use a reasoned waiver with evidence hash, expiry where relevant, and a distinct approver. Silent deletion or dismissal is forbidden.

The future leakage wrapper must not expose generic immediate `resolveWorkflowAssuranceIncident` or `suppressWorkflowAssuranceIncident` directly until those shared transitions have an explicit state matrix, source revalidation, and separation-of-duties enforcement.

## Permission, Scope, Entitlement, And Redaction Matrix

| Operation                  | Permission/policy                                                                       | Scope                                                             | Fresh auth                                             | Module entitlement                                                          | Decision                                       |
| -------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------- |
| Close own active shift     | `pos.session.end`; actor must equal session cashier                                     | Tenant plus exact session/location/terminal                       | Authenticated session; step-up only if policy requires | Enforce `pos` before mutation                                               | Required in source slice                       |
| Delegated manager close    | `pos.session.end` plus certified tenant/managed-location authority and mandatory reason | Exact managed location; never tenant-wide by ID alone             | 300 seconds                                            | Enforce `pos`                                                               | Hold unless implemented and tested explicitly  |
| Read a leakage case        | `controls.audit.read` plus source permission                                            | Tenant or certified managed locations; subject sees own case only | No                                                     | Enforce source package; initial POS case uses `cash_drawer`/`pos` packaging | Later incident slice                           |
| Acknowledge/assign         | `controls.manage`                                                                       | Same tenant and allowed location; assignee membership validated   | Assignment policy dependent                            | Enforced                                                                    | Later; current audit-read mutation is rejected |
| Submit explanation         | Source-subject policy, not broad control permission                                     | Own case or assigned operational role                             | No                                                     | Enforced                                                                    | Later dedicated command                        |
| Propose resolution         | `controls.manage`                                                                       | Tenant/managed location                                           | 300 seconds for high severity                          | Enforced                                                                    | Later dedicated command                        |
| Approve resolution/waiver  | `controls.manage`, independent checker                                                  | Tenant/managed location; no self-approval                         | 300 seconds                                            | Enforced                                                                    | Mandatory                                      |
| Configure threshold policy | `controls.manage`, tenant authority                                                     | Tenant only                                                       | 300 seconds                                            | Enforced                                                                    | Separate policy slice                          |

The current commercial module vocabulary has `pos`, `cash_drawer`, and `close_assurance`, but no `cash_leakage_radar` slug (`services/modules/module-control-contracts.ts:3-24`). This audit does not invent one. The source command must enforce `pos`. Professional-tier packaging may compose existing modules until a separate commercialization-governance slice approves a dedicated slug.

Foreign tenant/session IDs must return non-enumerating not-found/forbidden behavior. Manager authority must reuse the certified operating-access scope rather than directly depending on unstable HRIS internals.

Actor identity, explanation text, IP/device evidence, and raw notes are sensitive. Cashiers may see their own source facts. Branch managers see only assigned locations. Tenant owners/finance controls may see named actors when authorized. Accountant, export, AI, and WhatsApp projections must redact actor identity and free text by default; they may receive counts, amount ranges, status, and safe action links only.

## Migration Decision

### This audit slice

No migration is authorized or required. No schema was changed.

### Recommended next source slice

Do not add a Leakage Radar table. First attempt the close foundation with the existing `BusinessEvent`, outbox, audit, POS session, and drawer transaction models, using a transactional row claim and conditional active-state writes.

Before implementation, run a real-PostgreSQL preflight for:

- more than one active session per terminal;
- more than one `CLOSING_BALANCE` transaction per session;
- closed/reconciled sessions missing end time, expected amount, counted amount, or variance;
- terminal/session/drawer location disagreement;
- closed sessions whose variance is not counted minus expected.

If current database semantics cannot guarantee one winner under dual close and close-versus-sale/refund/void races, stop and return to the war room for one narrow POS-invariant migration. Candidate database defenses are partial unique indexes for active terminal sessions and session closing transactions, plus validated closed-state checks. Do not mix speculative query columns or a new case table into that migration.

### Later incident slice

Reuse `WorkflowAssuranceIncident`. First fix stable identity and add a strict Zod-discriminated `cash_shortage/v1` evidence envelope. Do not add amount/location projection columns until queue-volume and query-plan evidence proves JSON-backed pilot reads insufficient. Run a duplicate-case preflight because current fingerprint behavior may already have produced parallel incidents.

## Recommended Next Slice

### Phase 3 / Slice 2: POS Shift Close Evidence Foundation

**Purpose:** make one closed POS shift a reliable, replay-safe, tenant/location-scoped, evidence-backed source. No leakage detector or incident is created.

**Expected files:**

- `services/pos/pos.schemas.ts`
- `services/pos/pos.service.ts`
- `actions/pos/session.actions.ts`
- `components/pos/ProfessionalPOSSystem.tsx`
- `services/events/business-event.service.ts` only if durable conflict-audit behavior must be corrected
- `services/pos/__tests__/pos-shift-close.service.test.ts` (new)
- `actions/pos/__tests__/session.actions.test.ts` (new)
- `components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx` (new)
- one narrowly scoped Prisma migration only if the concurrency/preflight gate proves it necessary

**Acceptance criteria:**

- blank count is rejected in UI, schema, action, and service; no expected-balance fallback remains;
- counted amount is explicit, finite, nonnegative, currency-valid, and preserved as a decimal string in evidence;
- nonzero variance requires an explanation or approved reason contract;
- close derives organization and actor from protected context and enforces `pos` entitlement;
- self-close and delegated-close authority are explicit and location-scoped;
- terminal, session, location, and drawer must agree;
- one transaction conditionally claims only the exact active session;
- sale/refund/void stale writers cannot mutate a closed session;
- same source/payload replay returns the committed close; changed payload conflicts;
- exactly one session close, drawer close transaction, domain audit, business event, and outbox message survive;
- any audit/event/outbox failure rolls back the business close;
- historical rows without the versioned event remain ineligible for Leakage Radar;
- no assurance incident, Leakage Radar UI, inventory rule, AI, or WhatsApp command is added.

## Focused Fixture Matrix

### Source command

- explicit zero count is accepted; blank, NaN, infinity, negative, and excess precision are rejected;
- exact expected count, shortage, and overage preserve signed variance;
- nonzero variance without explanation is rejected;
- same-payload retry is idempotent; changed count/notes conflict;
- two simultaneous close requests yield one committed close and one replay/conflict;
- close racing sale, cash refund, and void has one serializable winner; stale transaction rolls back;
- event/audit/outbox failure leaves session, drawer, transaction, and terminal unchanged;
- foreign tenant, unowned session, unmanaged location, wrong terminal/drawer, stale auth, missing permission, and denied entitlement do not mutate or enumerate;
- legacy closed row without event is not upgraded silently.

### First future rule

- exact match, shortage below review threshold, exact review threshold, one minor unit above, exact high threshold, and overage;
- XAF and XOF policy, unsupported currency, fractional source amount, and explicit rounding boundary;
- policy version selected by close time; later policy change leaves historical result stable;
- missing event, hash mismatch, duplicate close transaction, source drift, and malformed evidence remain blocked, not shortage;
- stable case key across severity/source-hash changes; unchanged replay increments occurrence without duplicate alert;
- source actor/proposer self-approval denied; independent approval succeeds; stale-source resolution fails;
- safe English/French wording contains no accusation.

## Verification Contract

Run focused checks before broad gates:

```text
npm test -- --runInBand services/pos/__tests__/pos-shift-close.service.test.ts actions/pos/__tests__/session.actions.test.ts components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx
npm test -- --runInBand services/pos/__tests__/pos.service.test.ts actions/pos/__tests__/drawer-dashboard.actions.test.ts
npm run typecheck
npx eslint services/pos/pos.service.ts services/pos/pos.schemas.ts actions/pos/session.actions.ts components/pos/ProfessionalPOSSystem.tsx
npm run service:boundary:fail
npm run module:surface:fail
npm run role:cockpit:gate
```

Concurrency acceptance requires a real PostgreSQL integration test, not only mocked Prisma calls. If a migration is added, also run:

```text
npm run prisma:validate
npm run prisma:migration:safety:gate
```

The later incident slice must add focused assurance identity, transition-matrix, tenant-assignee, maker-checker, source-revalidation, notification-dedupe, and release-gate tests. The workflow-assurance release gate currently does not inspect incident actions or transition services, and `module:surface:fail` is not part of `policy:gates`; those coverage gaps must be closed when those contracts are touched.

## Audit Verification Results

Focused baseline:

```text
npm test -- --runInBand services/pos/__tests__/pos.service.test.ts actions/pos/__tests__/drawer-dashboard.actions.test.ts services/assurance/__tests__/assurance-registry-contracts.test.ts services/assurance/__tests__/assurance-registry.service.test.ts services/assurance/__tests__/assurance-incident.service.test.ts actions/assurance/__tests__/workflow-assurance-incident.actions.test.ts scripts/__tests__/workflow-assurance-release-gate.test.js
```

Result: **7 suites, 72 tests passed**.

No existing focused test exercises `closePOSShift`, `closePOSShiftAction`, explicit-count behavior, dual close, idempotent replay, close-versus-sale/refund/void, or durable close evidence.

Existing static assurance gate:

```text
npm run workflow:assurance:release-gate
```

Result: **passed** with 37/37 checks, 6/6 indexes, 2/2 engine-health checks, and zero static blockers.

The gate is read-only and does not inspect incident-action permissions or incident transition semantics. Its green result does not clear the identity, source-recheck, assignee, or maker-checker blockers documented above.

Current repository typecheck:

```text
npm run typecheck
```

Result: **failed outside this slice** at `app/[locale]/(dashboard)/dashboard/people/page.tsx:58` with TS2367. The unchanged page compares `LOCATION_RESPONSIBILITY` against a live HRIS union that now contains `LOCATION_RESPONSIBILITY_COMPATIBILITY`. No HRIS code was changed by this audit. Repository deployment readiness remains on hold.

## Rollout And Rollback

1. Ship source hardening behind an internal/observe release flag.
2. Require explicit count immediately for pilot organizations; monitor close completion and error rates.
3. Emit versioned source events but do not create cases.
4. Reconcile event/session/drawer evidence for a pilot window and prove zero duplicate close events.
5. Add the shortage evaluator in observe mode only after war-room certification.
6. Compare cases with manager-reviewed outcomes before enabling notifications or Daily Truth composition.

Rollback disables event-driven evaluation and the feature flag. It must not delete close events, audits, outbox records, incident history, or source evidence. A failed source release may restore the prior user flow only after preserving explicit-count and single-close integrity; it may not restore expected-balance auto-submission.

## Blockers And Residual Risks

- Current full typecheck is red from unrelated HRIS contract drift; no Phase 3 implementation can be release-certified while it remains red.
- POS close currently permits broad tenant-level session closure with no cashier/managed-location rule.
- Terminal location may change while a session is active; close must bind session, terminal, drawer, and location atomically.
- The current business-event conflict audit is written inside the transaction that throws; verify that conflict evidence survives rollback before relying on it.
- Current assurance fingerprint/reopen semantics can create parallel cases.
- Current assurance acknowledge, assign, reopen, resolve, and suppress policies are not strong enough for financial-case closure.
- Existing assurance runners are primarily one aggregate result per check; per-source leakage evaluation needs a deliberate batch-finding contract.
- Existing threshold values are unapproved, unversioned operational constants.
- Historical close rows cannot be trusted or synthetically backfilled.
- Business-date/timezone grouping remains unresolved; the first event must preserve UTC close time and source location so a later policy can derive the business date correctly.
- The review workflow must measure false positives and avoid unsupported staff accusations.

## Handoff Decision

Phase 3 / Slice 1 is **audit complete**.

Return to:

```text
/stoquify-referral-war-room
```

The war room should review and, if accepted, select only **Phase 3 / Slice 2: POS Shift Close Evidence Foundation**. The next operating skill should be a POS controls/source-integrity skill, with `stoquify-cash-leakage-radar` retained as the rule contract reviewer. No Leakage Radar incident, dashboard, inventory-loss implementation, AI command, or WhatsApp command should begin before the source slice is certified.
