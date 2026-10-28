# Phase 3 / Slice 390 Selection - POS Cash Shortage Production Activation Evidence Marginalia

Date: 2026-07-31
Program owner: `stoquify-referral-war-room-orchestrator`
Leakage guardrail: `stoquify-cash-leakage-radar`

## Selection

Slice 390 is selected to add a compact read-only evidence marginalia derived from the certified Slice 389 production activation evidence gloss.

## Scope

- Add a service-owned `PosCashShortageProductionActivationSlice390EvidenceMarginalia` wrapper.
- Preserve the Slice 389 gloss as source evidence.
- Add focused blocked, ready, and partial tests.
- Keep production activation unauthorized with `activationAuthorized: false`.

## Non-Authority

This slice does not add or authorize any route, action, UI, worker, scheduler, detector, DB or Prisma write, migration, browser automation, alert, rollback, AI, copilot, WhatsApp, or production activation authority.

## Expected Verification

- Source authority scan with no matches.
- Focused Jest for `pos-cash-shortage-production-activation-preflight.test.ts`.
- Related leakage preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for the touched source and test files.
- Whitespace and status-register hygiene checks.
