# POS Shift Close Evidence Foundation Report

Generated: 2026-07-19  
Program: Stoquify Referral-Worthy Execution Program  
Phase: Phase 3 / Slice 2  
Selected skill: `007-aqstoqflow-pos-ledger-controls`  
Companion contract: `004-aqstoqflow-business-event-gateway`

## Decision

The prospective POS shift-close evidence foundation is **capability certified** and ready to return to the referral war room for source acceptance and next-slice selection.

This is not a repository deployment approval. The full TypeScript command did not complete within 304 seconds in the current dependency layout. A compiler-API check over the ten relevant production, test, and Jest setup roots completed with zero diagnostics.

No Leakage Radar incident, assurance rule, dashboard, inventory-loss behavior, Prisma migration, AI authority, or WhatsApp authority was added.

## Before And After

| Control | Before | After |
| --- | --- | --- |
| Counted cash | Blank UI input could fall back to system balance | An explicit nonnegative amount is required; literal zero is preserved |
| Variance | No mandatory operator context | A trimmed explanation is required for every nonzero signed variance |
| Close authority | Service did not bind the closer to the opening cashier | Only the cashier who opened the active session may close it |
| Transaction boundary | Close state could race another close or an active POS writer | One Serializable transaction conditionally claims session, drawer, and terminal state |
| Drawer identity | Drawer selection did not certify the full source relationship | Exactly one opening transaction must bind the drawer to the same session, terminal, and location |
| Evidence | No close audit, business event, outbox, or source hash | One close transaction, audit, versioned event, outbox row, and payload hash commit atomically |
| Replay | No stable replay contract | Exact replay returns original evidence; changed replay returns 409 and writes a durable conflict audit |
| Legacy data | Historical closed sessions could look equivalent to certified closes | Closed sessions without the versioned event fail closed and remain ineligible |

## Implemented Contract

### Service-Owned Truth

- `closePOSShift` validates the command, reloads tenant-scoped source state inside a Serializable transaction, and verifies self-close authority.
- The close requires one drawer linked through the session opening transaction and matching the session terminal and location.
- Conditional writes enforce `ACTIVE -> CLOSED`, open drawer -> closed drawer, and active terminal -> no current session.
- The transaction commits one `CLOSING_BALANCE` drawer transaction, one `POS_SHIFT_CLOSED` audit, one schema-version-1 `pos.shift.closed` business event, and one deduplicated notification outbox row.
- The stable idempotency identity is `pos-shift:<sessionId>:closed` within the tenant and POS event-source scope.
- Replay validates the complete session, transaction, event, outbox, audit, currency, totals, authority, command hash, and payload hashes before returning evidence.
- A changed replay writes `POS_SHIFT_CLOSE_IDEMPOTENCY_CONFLICT` outside the rolled-back replay transaction and returns a safe conflict.

### Competing POS Writers

- Sale, refund, and void paths now claim the cashier-owned active session at write time.
- Writer order is standardized around session state before sale state and downstream inventory, drawer, payment, posting, or audit effects.
- Sale completion conditionally claims `DRAFT -> COMPLETED` before financial effects.
- Refund and void conditionally claim `COMPLETED -> RETURNED` or `COMPLETED -> CANCELLED` before financial effects.
- Duplicate refund and refund-versus-void requests stop before restock, drawer, payment, or posting side effects.

### Protected Action And UI

- The protected action uses canonical `pos.session.end` RBAC and derives tenant and actor from server context.
- Module access is recorded with audited `observeModuleAccess({ mode: "observe" })`. Hard module enforcement is deliberately not claimed because the module control-plane status says runtime promotion is not approved.
- The UI cannot submit a blank, negative, non-finite, or over-precision count and preserves explicit zero.
- Nonzero variance requires an explanation before submit.
- A server rejection keeps the dialog, counted value, explanation, and inline alert available for correction.
- Changing the active shift identity clears draft close data so one shift's count cannot be submitted against another.

## Authority Boundary

This slice implements self-close only. Delegated manager close, managed-location authorization, fresh-authentication proof, and delegated-close reason evidence are deferred rather than partially simulated. A non-owner receives a forbidden result from the service.

This makes managed-location and stale-auth tests inapplicable to the current command. They become mandatory if a delegated-close contract is selected later.

## Database Evidence

Read-only preflight established:

| Check | Result |
| --- | ---: |
| Duplicate active terminal groups | 0 |
| Duplicate closing-transaction groups | 0 |
| Location or source-scope mismatches | 0 |
| Existing `pos.shift.closed` events | 0 |
| Legacy closed/reconciled rows missing complete close evidence | 135 |
| Legacy variance mismatches | 135 |

No historical row was backfilled or synthetically certified. Only new versioned events qualify as prospective source evidence.

Real PostgreSQL certification used only schema `codex_pos_shift_close_cert_20260719` in the configured local database. The schema was created from the current Prisma model, used for six tests, dropped, and then verified absent. The application `public` schema was not used by the test URL.

## Verification

| Gate | Result |
| --- | --- |
| Focused service/action/UI regression | 4 suites, 29 tests passed |
| Real PostgreSQL certification | 1 suite, 6 tests passed |
| Identical simultaneous close | One commit and one exact replay |
| Different simultaneous close | One commit, one 409, one durable conflict audit |
| Close versus active cash writer | Serialized ordering; no post-close writer commit |
| Event insert failure | All close state and evidence rolled back |
| Outbox insert failure | All close state and evidence rolled back |
| Audit insert failure | All close state and evidence rolled back |
| Focused TypeScript | 0 diagnostics across 10 roots |
| Focused ESLint | Passed |
| Prisma validate | Passed |
| Service boundary | 0 active violations |
| Module surface ratchet | Passed; 55 baseline gaps -> 48 current gaps; 0 new gaps |
| Role cockpit | Ready, 9/9 checks |
| Targeted `git diff --check` | Passed |
| EN/FR JSON parse | Passed |
| Full repository TypeScript | Inconclusive: timed out after 304 seconds without diagnostics |

Expected Serializable write-conflict logs appeared during the PostgreSQL race tests and were recovered through the bounded retry/replay path.
The final six-test PostgreSQL pass ran with `jest.setup.ts` active. The test explicitly unmocks `@/prisma/db` and supplies the Node timer needed for Prisma teardown, so the real-database path does not depend on an undocumented no-mock Jest environment.


## Files In Scope

Production:

- `services/pos/pos.schemas.ts`
- `services/pos/pos.service.ts`
- `actions/pos/session.actions.ts`
- `components/pos/ProfessionalPOSSystem.tsx`
- `messages/en.json` (two POS variance keys only)
- `messages/fr.json` (two POS variance keys only)

Focused verification:

- `services/pos/__tests__/pos-shift-close.service.test.ts`
- `services/pos/__tests__/pos-shift-close.postgres.test.ts`
- `services/pos/__tests__/pos.service.test.ts`
- `actions/pos/__tests__/session.actions.test.ts`
- `components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx`

The locale files contain unrelated concurrent edits; this slice owns only the two variance-explanation keys in each file. Unrelated POS cash-payment-history files were not touched by this slice.

## Deferred Work And Non-Claims

- No delegated or manager close path.
- No broad module-entitlement enforcement promotion.
- No Leakage Radar incident, fingerprint, lifecycle, assignment, or resolution implementation.
- No historical close certification or data migration.
- No AI/copilot or WhatsApp source-of-truth behavior.
- No repository deployment approval while the full TypeScript gate remains incomplete.
- Server error localization remains constrained by the existing unstructured action-error contract; the UI safely retains the error and input state.

## Handoff

Return to `stoquify-referral-war-room-orchestrator` through `/stoquify-referral-war-room`.

The war room should first accept or reject `pos.shift.closed` schema version 1 as the prospective source contract. If accepted, it may authorize `stoquify-cash-leakage-radar` to design the first shortage-only rule. This report does not authorize detector or incident implementation.
