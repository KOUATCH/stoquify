# Customer Settlement Reversal Protected Action - Slice 437

Date: 2026-08-08
Status: certified complete at current-worktree protected-action-boundary level
Primary skill: `stoquify-statement-proof-network`

## Outcome

Slice 437 adds one finance-owned server action over the Slice 436 customer-settlement compensating reversal service. The action is authenticated and fail-closed, but deliberately has no route, UI, API endpoint, or other product caller.

Before this slice, trusted service callers could construct the reversal control context directly. After this slice, the intended product boundary derives tenant, actor, permissions, module entitlement, and fresh-auth evidence from `ProtectedActionContext`, verifies their provenance, parses only the canonical reversal command, and passes a bounded control object to the source-owned service.

## Implemented Boundary

- Exact permission: `finance.receivables.reverse`.
- Allowed-command audit resource: `CustomerSettlement`.
- Fresh authentication: five-minute maximum age.
- Commercial access: enforced and audited `finance` module action/write entitlement.
- Identity binding: fresh-auth user, tenant, assurance organization, assurance level, and timestamp must match the protected context.
- Assurance binding: the assurance level must be finite and at least `PASSWORD`.
- Timestamp binding: `lastAuthAt` must be a real `Date`, finite, and equal to the signed claim timestamp.
- Input boundary: the canonical reversal schema is parsed only after authentication evidence is verified.
- Service handoff: organization, actor, permissions, and the five bounded fresh-auth claims are context-derived; raw input and raw context are not spread.
- Cache behavior: finance receivables and accounting pages are revalidated only after a successful reversal.

## Release Ratchet

The report-trust gate now includes `customer_settlement_reversal_protected_action_boundary`. Its mutation matrix rejects weakened permission, audit, module enforcement, freshness, context binding, schema ownership, execution ordering, unbounded handoff, and cache behavior.

The ratchet also strips comments and scopes forbidden markers to the protected boundary. An unrelated helper therefore cannot create a false blocker. The fresh-auth verifier must flow directly from its exact evidence prelude into the denial guard and then into the bounded return, so preserving the guard only under `if (false)` fails certification.

## Verification

| Check | Result |
| --- | --- |
| Protected action Jest | Pass: 1 suite / 14 tests |
| Focused action, reversal, ledger, AR, posting, event, sensitive-action, and `protect` bundle | Pass: 8 suites / 86 tests |
| Report-trust mutation suite | Pass: 1 suite / 290 tests |
| Live report-trust fail gate | Pass: 31/31 ready; zero blockers |
| TypeScript | Pass |
| Scoped ESLint | Pass |
| JavaScript syntax and scoped diff hygiene | Pass |
| Exposure and temporary-file checks | Pass: no product caller; no Slice 437 temporary artifact |
| Independent constrained security re-review | Pass: no findings remain |

## Evidence

- Protected action: `actions/finance/customer-settlement.actions.ts`.
- Focused tests: `actions/finance/__tests__/customer-settlement.actions.test.ts`.
- Static release control: `scripts/report-trust-export-gate.js`.
- Mutation tests: `scripts/__tests__/report-trust-export-gate.test.js`.
- Generated readiness: `what-next/report-trust-export-readiness.md` and `what-next/report-trust-export-readiness.json`.
- Release evidence: `what-next/skills-life-cycle/STOQUIFY_SLICE_437_RELEASE_EVIDENCE_REPORT_2026-08-08.md`.

## Certification Boundary

This slice certifies the protected server-action boundary in the current worktree. It does not authorize public reversal execution because no route, UI, API, or product caller exists. A missing or unprovisioned `finance` module entitlement can block execution at runtime; that is intended fail-closed behavior.

It does not certify repository integration, migration deployment, PostgreSQL concurrency, provider refunds, production release, or statement generation. It adds no statement snapshot, signed statement token, recipient action, external route, delivery channel, AI authority, or WhatsApp authority.

## Next Control

Return to `/stoquify-referral-war-room` under `/caveman full` for a fresh post-Slice 437 audit. The leading candidate is an immutable posted customer receivable document foundation that resolves customer-scoped receivable grouping and replaces mutable `SalesOrder` truth before statement generation is considered.
