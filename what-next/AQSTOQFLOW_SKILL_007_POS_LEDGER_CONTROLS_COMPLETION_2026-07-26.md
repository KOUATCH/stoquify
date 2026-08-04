# AqStoqFlow Skill 007 — POS Ledger Controls Completion

Generated: 2026-07-26

## Decision

**PASS — POS ledger controls are ready at the verified repository scope.**

No new runtime implementation was required in this run. The existing implementation already provides the requested ledger-first POS control slice, and the focused gates and tests passed.

This result is an engineering verification of repository controls. It is not a statutory certification, external auditor opinion, payment-provider certification, or country-pack approval.

## Selected skill

- `007-aqstoqflow-pos-ledger-controls`
- Previous numbered skill: `006-aqstoqflow-country-pack-factory`
- Next recommended numbered skill: `008-aqstoqflow-compliance-center`

## Verified control path

### Sale completion

- The sale is scoped by organization, location, terminal, session, cashier, draft status, and soft-delete state.
- The active cashier shift is revalidated before commit.
- Stock issues use the inventory stock-event kernel.
- Cash drawer, tender rows, session totals, customer credit, sale status, accounting postings, audit evidence, business events, and fiscalization request evidence are created in one database transaction.
- Sale and captured-payment postings use the accounting posting services.
- Posting batches are required before fiscalization evidence is accepted.
- Provider capture references are normalized and duplicate-checked.
- Fiscalization remains pending and non-authoritative until the regulatory path completes.

### Refund and void

- Corrections require the original completed sale and the active tenant-scoped cashier session.
- Prior refunds, invalid payment states, and unsupported correction states fail closed.
- Stock returns use the inventory stock-event kernel.
- Cash drawer and session totals are reversed with the correction.
- Refund and void accounting entries use the posting services.
- Audit logs and durable business events are recorded in the same transaction.
- Posted corrections invalidate affected close evidence through the accounting posting layer.

### Cash-session close / Z-report evidence

- Close execution uses a serializable transaction.
- The command has a deterministic idempotency key and document hash.
- Replays are accepted only when stored session, drawer, event, audit, outbox, totals, variance, and command evidence agree.
- Terminal, session, and drawer state transitions are concurrency-checked.
- Non-zero cash variance requires an explanation.
- Close evidence records opening, expected, counted, and variance amounts; tender totals; tax; discounts; transaction count; actor; location; register; drawer; and timestamps.
- The close event is marked applied and emits a tenant-linked notification outbox record.

### Receipt and fiscalization

- Public receipt access is signed, expiring, registry-backed, and verified before lookup.
- Statutory receipt delivery fails closed until fiscal certification is complete.
- Offline receipts are provisional and carry non-statutory status until replay and fiscalization complete.
- Fiscalization requests bind source payload hashes and reject source drift.

## Gates passed

| Gate | Result |
| --- | --- |
| Inventory boundary | PASS — 0 active violations |
| Ledger/close truth | PASS — 10/10 |
| Payment/cash truth | PASS — 10/10 |
| Offline POS fiscal replay | PASS — 10/10 |
| Public receipt token configuration | PASS — 4/4 in local/non-release mode |
| Regulatory import boundary | PASS |
| Raw error boundary | PASS — 0 active unsafe findings |
| TypeScript typecheck | PASS |

## Focused tests

| Area | Suites | Tests | Result |
| --- | ---: | ---: | --- |
| POS sale, shift close, offline sync, cash history, receipts, token registry | 8 | 76 | PASS |
| Sale/payment/reversal postings and fiscalization outbox | 5 | 17 | PASS |
| Ledger, offline replay, receipt configuration, browser smoke gates | 4 | 21 | PASS |
| **Total** | **17** | **114** | **PASS** |

The PostgreSQL concurrency certification suite was not activated because it requires `RUN_POS_SHIFT_CLOSE_POSTGRES_CERTIFICATION=1` and a prepared certification database. The deterministic shift-close service suite passed; production certification should additionally run the PostgreSQL suite in its controlled CI environment.

## Files changed by this run

- `what-next/ledger-close-truth-readiness.md`
- `what-next/ledger-close-truth-readiness.json`
- `what-next/payment-cash-truth-readiness.md`
- `what-next/payment-cash-truth-readiness.json`
- `what-next/offline-pos-fiscal-replay-readiness.md`
- `what-next/offline-pos-fiscal-replay-readiness.json`
- `what-next/AQSTOQFLOW_SKILL_007_POS_LEDGER_CONTROLS_COMPLETION_2026-07-26.md`

Existing POS runtime files were inspected and tested but not modified by this run.

## Gates blocked

- None for the skill 007 engineering scope.

## Release cautions

- The receipt-token gate passed in automatic local mode but warned that the production receipt-token secret is not configured in this environment. Release mode must provide it.
- Country-pack production approval is outside the skill 007 engineering result and remains separately fail-closed.

## Verification result

The repository demonstrates a traceable POS chain from sale or correction through stock, cash, payment, journal, audit, business-event, close-invalidation, receipt, and fiscalization evidence. The focused verification set passed without a POS control blocker.

