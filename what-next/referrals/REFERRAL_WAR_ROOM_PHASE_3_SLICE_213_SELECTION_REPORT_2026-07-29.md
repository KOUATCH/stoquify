# Referral War Room Phase 3 Slice 213 Selection Report

Date: 2026-07-29

## Selected Slice

Phase 3 / Slice 213 - POS cash-shortage production activation review digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row contract.

## Rationale

Slice 212 certified a read-only status-line projection over the Slice 211 digest. The smallest safe next slice is a derived evidence-row helper that captures that status line as one reviewable row without becoming a route, scheduler, detector, migration, worker, UI, AI, WhatsApp automation, or production activation authority.

## Evidence Inputs

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- Slice 212 certification report: `what-next/referrals/POS_CASH_SHORTAGE_SLICE_212_EVIDENCE_ROW_TABLE_DIGEST_STATUS_LINE_EVIDENCE_ROW_TABLE_DIGEST_STATUS_LINE_CONTRACT_REPORT_2026-07-29.md`

## Verification Plan

- Focused Slice 213 Jest coverage for blocked, ready, and partial evidence-row states.
- Related production activation preflight bundle.
- `npm run typecheck`.
- Scoped ESLint for the touched service and test file.
- Authority scan proving no runtime authority was introduced.
- Trailing whitespace and `git diff --check` hygiene.

## Filename Note

The slice title is intentionally long to preserve lineage, but the certification report filename is shortened to stay within Windows path component limits.