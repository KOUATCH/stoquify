# Slice: Cash and Payment Proof

## Prerequisite

Require `gates.foundationInventory.status: PASS` with evidence. Otherwise stop before Stage 01.

Required lanes: one or both of `cash`, `payment`.

## Cash lane

- Trace opening float, cash sales, refunds, payouts, cash-in/out, counted cash, variance, reason, approval, and lock state by cashier, terminal, drawer, session, and shift.
- Separate cash from electronic tender.
- Enforce cashier-own-session versus manager access.
- Require expected-versus-counted reconciliation and approval thresholds.
- Treat offline ambiguity and shared-drawer attribution as explicit partial or blocked states.

## Payment lane

- Trace internal payment, provider event, statement line, match decision, suspense/exception, posting, reconciliation run, and certificate.
- Label capture-readiness separately from durable reconciliation truth.
- Require maker-checker approval for manual matches and suspense resolution.
- Redact provider references and PII according to permission and export context.
- Make unresolved material suspense a close blocker.

## Stage gates

- Stage 02: provider secrets and raw payloads never reach client artifacts; proof hashes are fingerprints unless stronger verification exists.
- Stage 03: cash variance, suspense, posting, period, source-link, and close-blocker invariants pass.
- Stage 04: session/payment timelines use stable pagination and service-owned totals from the same filters.
- Stage 05: proof drawers expose source and lifecycle without presenting hashes as user-facing truth.
- Stage 06: capture and certified states remain visually and semantically distinct.
- Stage 07: own-versus-manager access, variance math, manual-match segregation, provider redaction, state transitions, and close blockers pass.

## Stop conditions

- Electronic tenders are included in physical cash expectations.
- A browser or webhook path can assert authenticity with a bare checksum.
- Ingestion can post directly to the ledger.
- Manual matches or settlement approvals bypass segregation of duties.
- The UI labels capture-readiness as certified reconciliation.
