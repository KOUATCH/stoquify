# Kontava Proof Evidence Timeline Skill Run Report - Payment Transaction

Date: 2026-06-24
Skill: kontava-proof-evidence-timeline
Chosen proof domain: payment.transaction

## Execution Summary

Executed the proof evidence timeline skill for exactly one domain: payment transactions. The implementation adds a tenant-scoped, RBAC-protected proof trail for `payment.transaction` and exposes it through the existing proof-drawer contract used by the cash-command dashboard.

The work stayed within the existing evidence, proof drawer, RBAC, redaction, and BI command primitives. No new dashboard-specific truth service, duplicated metric store, client-computed business truth, or decorative UI system was introduced.

## Prerequisite Gate

Status: PASS

Gate findings:
- Source table: `payment_transactions` via `PaymentTransaction.id` scoped by `organizationId`.
- Permission: `payments.reconciliation.read` through `SUBJECT_PERMISSION_MAP` and protected evidence action wrapper.
- Redaction: provider account internals and provider references are redacted in the proof trail using existing proof redaction contracts.
- Audit: sensitive proof access is logged by existing `finalizeProofTrail` behavior for non-journal and redacted evidence.
- Tenant isolation: service lookup uses `findFirst({ where: { id, organizationId } })`; action ignores caller-supplied organization and uses session org context.
- UI availability: existing `BIProofDrawerHost` and `ProofTrailDrawer` support available, unavailable, blocked, and redacted proof subjects.

## Implementation Status

Status: COMPLETE

Implemented:
- Added `payment.transaction` as a supported proof subject type.
- Added subject permission mapping to `payments.reconciliation.read`.
- Added protected action dispatch for payment transaction proof trails.
- Added payment transaction evidence grading.
- Added server-side proof trail builder for transaction, provider account, provider reference, posting batch, match records, suspense items, exceptions, and accounting business events when the source type is recognized.
- Added blocker behavior for failed/cancelled transactions, disputed/suspense states, failed posting batches, open exceptions, and open suspense.
- Added proof redactions for provider-account internals and provider-side references.
- Wired cash-command provider risk proof to prefer `payment.transaction` proof when available, with reconciliation proof as fallback.
- Added tests for tenant-scoped RBAC dispatch, redacted reconciled proof, blocked proof, cash-command proof subject wiring, and dashboard proof subject display.

## Files Changed By This Skill Slice

Tracked files:
- `actions/evidence/proof-trail.actions.ts`
- `actions/evidence/__tests__/proof-trail.actions.test.ts`
- `services/evidence/evidence-contracts.ts`
- `services/evidence/evidence-grade.service.ts`
- `services/evidence/proof-trail.service.ts`
- `services/evidence/__tests__/proof-trail.service.test.ts`
- `services/owner-war-room/owner-war-room.service.ts` (skill-relevant map entry only; file already contains broader pending dashboard work)

Untracked or already-new dashboard-slice files touched by this run:
- `services/cash-command/cash-command-contracts.ts`
- `services/cash-command/cash-command.service.ts`
- `services/cash-command/__tests__/cash-command.service.test.ts`
- `components/cash-command/__tests__/CashCommandDashboard.test.tsx`

Note: The worktree contains many unrelated pending changes from earlier dashboard phases. They were not reverted or normalized by this skill run.

## Validation

Passed:
- `npm test -- --runTestsByPath services/evidence/__tests__/proof-trail.service.test.ts actions/evidence/__tests__/proof-trail.actions.test.ts services/cash-command/__tests__/cash-command.service.test.ts components/cash-command/__tests__/CashCommandDashboard.test.tsx --runInBand`
  - 4 test suites passed
  - 14 tests passed
- `npm run typecheck`
  - `tsc --noEmit --pretty false` passed
- `npx eslint` on the touched proof/cash-command files passed
- Route probe: `http://localhost:3000/en/dashboard/finance/cash-command`
  - Result: `307`
  - Location: `/en/login?callbackUrl=%2Fen%2Fdashboard%2Ffinance%2Fcash-command`

## Blockers

None for this domain slice.

## Single Source Of Truth Review

Risks avoided:
- No client-side computation of reconciliation, cash, or proof truth.
- No duplicated payment metrics.
- No dashboard-only shadow proof service.
- No new proof UI system.
- No broad multi-domain proof graph expansion.
- No unredacted provider identifiers in the proof drawer.

Truth owners preserved:
- Payment transactions remain owned by the payment transaction and reconciliation tables.
- Posting state remains owned by ledger posting batches.
- Event proof remains owned by business events, joined only when source type matches the accounting source enum.
- Dashboards render server-provided proof subjects and proof drawer data.

## Recommended Next Action

Run the dashboard release gate skill for this phase if continuing the suite, then add a direct proof launcher from payment reconciliation transaction rows so operators can open the same `payment.transaction` timeline from the reconciliation workbench, not only from the cash-command risk card.