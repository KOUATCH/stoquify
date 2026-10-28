# Stoquify POS sale and cashier-close repair evidence

Generated: 2026-08-15

## Decision

**REPAIRED AT REPOSITORY SCOPE; NOT YET PROVEN IN PRODUCTION.**

The sale and cashier-close implementations retain their atomic ledger controls, and the product path now selects and validates the authenticated cashier's own terminal session. Receipt or cache work that fails after commit no longer reports the committed financial transaction as failed.

Production classification remains blocked by legacy invalid development data and by the controlled PostgreSQL concurrency suite not being activated in this environment.

## Root cause evidence

A read-only database diagnostic found:

- 89 sessions marked `ACTIVE`.
- 1 active session with coherent terminal, opening-drawer, and balance evidence.
- 88 invalid active sessions.
- 86 terminal current-session pointer mismatches.
- 66 sessions without exactly one opening-balance record.
- 88 sessions whose drawer was not open.
- 88 session/drawer balance mismatches.
- 2 draft sales created by a cashier different from the cashier who owns the attached session.

This explains the observed behavior: the UI could display an organization-wide active shift and attach a cart to it, while final sale and close services correctly rejected that foreign or malformed session.

## Implemented controls

### Cashier ownership and session readiness

- Active-shift lookup is scoped to the authenticated user, with terminal selection optional for initial discovery.
- A usable active shift must match its terminal's `currentSessionId` and location.
- It must contain exactly one opening-balance drawer transaction.
- Its drawer must be open, and drawer current/expected balances must equal the session expected balance.
- Cart creation requires the selected session to be active, terminal-current, and owned by the authenticated cashier.
- The POS screen defaults to the authenticated cashier's active location and terminal instead of an arbitrary organization terminal.

### Sale completion truth

- Sale, payment, stock issue, session totals, drawer movement, accounting postings, audit event, business event, and outbox work remain inside the existing database transaction.
- Receipt hydration is explicitly post-commit. If it fails, the response states `RETRY_REQUIRED` while retaining the completed sale result.
- Offline replay rehydrates committed receipt evidence before acknowledging the device event and does not recommit the sale.
- Cache revalidation failures are logged after commit and cannot convert a completed sale into an action failure.

### Cashier close truth

- Close remains a serializable, idempotent transaction over session, drawer, terminal pointer, closing transaction, business event/outbox, and audit evidence.
- Cache revalidation failures after close are logged without falsifying the committed close result.
- Both standard and comprehensive seed generators now create coherent active shift, opening drawer, and opening-balance evidence.

## Consequence verification

| Consequence | Verification |
| --- | --- |
| Payment | Commit rollback and duplicate-capture tests pass; completed-sale assurance requires paid/partial payment evidence. |
| Receipt | Receipt failure returns retry-required after commit; offline replay hydrates receipt before acknowledgement. |
| Inventory | Stock issue stays inside sale commit; completed-sale assurance requires inventory movement for tracked items. |
| Cash session | Authenticated ownership, opening evidence, balances, sale totals, drawer movement, and close idempotency tests pass. |
| Accounting | Sale/payment posting rollback tests pass; completed-sale assurance requires a posted batch, posted journal, and source link. |

## Verification results

- POS repository tests: **174 passed**, 7 skipped; 22 suites passed and the opt-in PostgreSQL suite was skipped.
- Workflow assurance tests: **41 passed**.
- TypeScript: **PASS** (`tsc --noEmit`).
- Prisma schema: **PASS** (`prisma validate`).
- Payment/cash truth gate: **PASS — 12/12**.
- Ledger/close truth gate: **PASS — 10/10**.
- Offline POS fiscal replay gate: **PASS — 16/16**.
- Diff whitespace check: **PASS**.

Generated gate artifacts:

- `what-next/pos-cashier-repair-payment-cash-truth.md`
- `what-next/pos-cashier-repair-payment-cash-truth.json`
- `what-next/pos-cashier-repair-ledger-close-truth.md`
- `what-next/pos-cashier-repair-ledger-close-truth.json`
- `what-next/pos-cashier-repair-offline-pos-fiscal-replay.md`
- `what-next/pos-cashier-repair-offline-pos-fiscal-replay.json`

## Remaining production gates

1. Apply the corrected seed to a disposable environment, or remediate legacy active sessions with an approved data-change runbook. Do not bulk-repair production records without tenant and audit review.
2. Run `services/pos/__tests__/pos-shift-close.postgres.test.ts` with `RUN_POS_SHIFT_CLOSE_POSTGRES_CERTIFICATION=1` against its dedicated `codex_pos_shift_close_cert_20260719` schema.
3. Capture an authenticated browser smoke in staging: open shift, complete one cash sale, verify payment/receipt/stock/journal evidence, close the shift, and replay the close idempotently.
4. Confirm no invalid active session or foreign-cashier draft remains in the staged dataset.

Only after those gates pass should the POS/cashier capability be classified as proven.

## Selected skill

- `007-aqstoqflow-pos-ledger-controls`
- Next recommended numbered skill after production certification: `008-aqstoqflow-compliance-center`
