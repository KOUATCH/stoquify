# Referral War Room Phase 4 Slice 423 Selection Report

Date: 2026-08-02
Phase: 4 - Accountant Portal And Close Pack
Slice: 423 - Accountant Grant Temporal Honesty And Scheduled Revocation
Control plane: `stoquify-referral-war-room-orchestrator`
Selected skill: `013-aqstoqflow-data-trust-accountant-portal`

## Decision

Select one narrow product slice that makes accountant consent windows truthful before adding missing-proof collaboration or changing identity and migration ownership.

## Evidence

- `grantAccountantAccess` rejects `expiresAt <= effectiveFrom` but accepts a fully elapsed window when both dates are in the past.
- `effectiveStatus` reports every future-effective grant as `EXPIRED`, although its consent window is scheduled and remains the current reserved scope.
- Delegated access and the portfolio already exclude future-effective grants with `effectiveFrom <= now`; those service-owned access boundaries are correct and must remain unchanged.
- The existing manager displays the DTO status directly and exposes revocation only for `ACTIVE`, so a future-effective consent cannot be revoked from its product surface.
- Revoking an already elapsed persisted grant currently changes its terminal cause to `REVOKED` and emits a misleading revocation event instead of preserving expiry.
- The manager sends offset-free `datetime-local` strings to the server, allowing server timezone interpretation to shift the intended consent instant.
- The accountant-access implementation, actions, component, tests, and migration remain untracked current-worktree evidence. This slice cannot certify repository ownership or deployment readiness.

## Selected Boundary

- Add `SCHEDULED` to the derived DTO status vocabulary without changing the persisted Prisma enum.
- Reject `expiresAt <= now` before user lookup or transaction work.
- Preserve the independent `expiresAt > effectiveFrom` consent-window invariant.
- Keep scheduled grants excluded from delegated access and portfolio reads.
- Allow both `ACTIVE` and `SCHEDULED` grants to be revoked from the existing manager.
- Preserve expiry as the terminal cause when revocation is requested after the consent window elapsed; retire the reserved scope and record expiry evidence without a revocation event.
- Convert valid browser-local date-time values to absolute ISO instants before calling the protected action.
- Harden the report-trust release gate so the pre-slice temporal behavior cannot pass certification.

## Expected Files

- `services/accounting/accountant-access.service.ts`
- `services/accounting/__tests__/accountant-access.service.test.ts`
- `components/accounting/AccountantAccessManager.tsx`
- `components/accounting/__tests__/AccountantAccessManager.test.tsx`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- generated `what-next/report-trust-export-readiness.{md,json}`

## Acceptance Gates

1. A fully elapsed consent window fails before database identity lookup or transaction start.
2. A valid future-effective consent returns `SCHEDULED`, not `EXPIRED`.
3. Persisted revocation takes precedence for grants revoked before expiry; elapsed active grants remain `EXPIRED`; currently effective grants remain `ACTIVE`.
4. The existing delegated resolver and portfolio retain their effective and expiry query bounds.
5. The manager offers revocation for `ACTIVE` and `SCHEDULED`, but not `EXPIRED` or `REVOKED`.
6. A revocation request after expiry performs no revocation transition or revocation event and leaves the DTO `EXPIRED`.
7. Valid `datetime-local` form values reach the action as absolute ISO timestamps.
8. The report-trust gate rejects missing stale-window validation, future-effective misclassification, and loss of scheduled revocation.
9. Focused service, action, component, gate, route, and related accountant/data-trust regressions pass.
10. Full typecheck, scoped ESLint, gate generation, caller/status scans, and patch hygiene pass.

## Pre-Edit Evidence

- Accountant-access service and protected action baseline: 2 suites / 12 tests passed.
- No schema or migration change is required for this derived-state correction.
- Identity foreign keys, retention policy, repository ownership, database lifecycle constraints, and exact-revision PostgreSQL deployment evidence remain NO-GO.

## Non-Goals

- No user foreign keys or deletion policy.
- No migration ownership or deployment claim.
- No missing-proof request model or workflow.
- No close-pack expansion, external sharing, AI/WhatsApp authority, or POS cash-shortage activation.

## Next Control

Implement only this selected boundary, then run independent review and release evidence before any Slice 424 selection.
