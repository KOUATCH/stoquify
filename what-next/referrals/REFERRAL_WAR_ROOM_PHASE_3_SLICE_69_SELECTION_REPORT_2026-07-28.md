# Referral War Room Phase 3 Slice 69 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 69 selects the POS cash-shortage production policy readiness review status-line contract.

## Evidence Reviewed

- The status register names the absence of an effective approved production threshold policy as a remaining production activation blocker.
- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts` already evaluates policy readiness through approved policy evidence, hash binding, approval-event binding, resolver guards, batch policy resolution, runner prerequisites, and no-default-policy behavior.
- Existing tests prove live absent evidence remains blocked and fixture evidence can certify without activation authority.

## Scope

Add a display-safe, read-only status-line contract derived from the existing production policy readiness preflight result. The status line will expose status, missing/satisfied requirement counts, text, and `activationAuthorized: false` for report/status surfaces.

## Expected Files

- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_STATUS_LINE_REPORT_2026-07-28.md`

## Guardrails

- No policy seeding, production threshold configuration, migration, database call, detector, worker, scheduler, route, action, UI, browser, notification, rollback, AI, WhatsApp, or production activation behavior.
- The status line is derived from service-owned preflight evidence and does not become a source of truth.
- Preserve service-owned truth, RBAC assumptions, audit/evidence posture, redaction readiness, tenant isolation, module entitlement, and release gates.

## Focused Verification

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`.
- Related cash-shortage policy/preflight bundle.
- `npm run typecheck`.
- Scoped lint for the touched source and test file.
- Static authority scan and whitespace/diff hygiene checks.

## Next Skill

Use `stoquify-cash-leakage-radar` for the Slice 69 implementation pass only.
