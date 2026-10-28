# Referral War Room Phase 3 Slice 317 Selection Report

Date: 2026-07-30

## Selected Slice

Slice 317 is selected: POS cash-shortage production activation evidence ravelin.

## Evidence Basis

- Slice 316 is certified in what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md.
- The source evidence chain currently ends at $prevType.
- The roadmap still requires deterministic, service-owned leakage evidence before any production activation authority.

## Scope

- Add a compact read-only ravelin contract derived from the certified Slice 316 evidence glacis.
- Add blocked, ready, and partial tests for the Slice 317 ravelin contract.
- Keep production activation unauthorized.

## Expected Files

- services/leakage/pos-cash-shortage-production-activation-preflight.ts
- services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts
- $reportPath

## Guardrails

No detector, scheduler, worker, DB/Prisma write, migration, route/action, UI, browser automation, alert, rollback, AI, copilot, WhatsApp, or production activation authority is selected.

## Verification Plan

- Focused Jest for services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts.
- Related leakage preflight Jest bundle.
-
pm run typecheck.
- Scoped ESLint on touched source and test files.
- Source authority scan.
- Whitespace and git diff --check hygiene.
