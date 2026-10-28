# Stoquify Slice 437 Release Evidence

Date: 2026-08-08
Slice: Protected Customer Settlement Reversal Action Boundary
Status: certified at current-worktree protected-action-boundary level

## Certified Scope

Slice 437 introduces one `"use server"` finance action that binds the Slice 436 reversal service to live protected-session evidence. The boundary owns permission, fresh-auth, tenant and actor provenance, finance-module entitlement, audit configuration, schema parsing order, bounded service handoff, and success-only cache revalidation.

No product caller was added. This release evidence certifies the dormant protected boundary, not a user-visible or public reversal workflow.

## Files

- `actions/finance/customer-settlement.actions.ts`
- `actions/finance/__tests__/customer-settlement.actions.test.ts`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- `what-next/report-trust-export-readiness.md`
- `what-next/report-trust-export-readiness.json`
- `what-next/referrals/CUSTOMER_SETTLEMENT_REVERSAL_PROTECTED_ACTION_SLICE_437_REPORT_2026-08-08.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_5_POST_SLICE_437_AUDIT_REPORT_2026-08-08.md`

## Verification Record

| Gate | Result |
| --- | --- |
| `jest actions/finance/__tests__/customer-settlement.actions.test.ts --runInBand` | Pass: 1 suite / 14 tests |
| Eight-suite action/accounting/event/security regression | Pass: 8 suites / 86 tests |
| `jest scripts/__tests__/report-trust-export-gate.test.js --runInBand --detectOpenHandles` | Pass: 1 suite / 290 tests |
| `npm run report:trust:export:gate` | Pass: ready, 31/31 checks, zero blockers |
| `npm run typecheck` | Pass |
| Scoped ESLint | Pass |
| JavaScript `node --check` | Pass |
| Scoped `git diff --check` | Pass |
| Product exposure scan | Pass: no caller outside the action and its evidence tests/ratchet |
| Temporary patch scan | Pass: no `.codex-slice437*` artifact |

The first hardened mutation-suite invocation exceeded its 120-second shell wrapper without diagnostics. A direct local Jest rerun with a wider timeout and open-handle detection completed successfully at 290/290; this is the recorded result.

## Independent Review

The reviewer initially identified a concrete dead-code bypass in the static ratchet. The checker was strengthened to require the exact fresh-auth evidence prelude immediately before the denial guard and a bounded evidence return after it. A dedicated `if (false)` mutation now fails the boundary check. The constrained re-review reported no remaining findings.

## Release Holds

- No route, UI, API endpoint, or product caller exists, so public reversal execution is not authorized.
- Finance-module provisioning may block the action at runtime and is intentionally fail-closed.
- Repository integration, migration deployment, PostgreSQL concurrency, and production deployment are not certified.
- Provider refunds and statement generation are outside this slice.
- No statement snapshot, signed token, external recipient workflow, delivery integration, AI authority, or WhatsApp authority is included.

## Next Gate

A fresh war-room audit must decide whether to select the immutable posted customer receivable document foundation. Statement generation remains blocked until immutable invoice-grade source truth and customer-scoped receivable grouping are proven.
