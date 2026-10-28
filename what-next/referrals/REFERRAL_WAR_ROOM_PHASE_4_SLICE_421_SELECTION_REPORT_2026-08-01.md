# Referral War Room Phase 4 Slice 421 Selection Report

Date: 2026-08-01
Orchestrator: `stoquify-referral-war-room-orchestrator`
Implementation skill: `stoquify-accountant-close-portal`

## Selected Slice

Phase 4 / Slice 421: Accountant access expired-scope retirement and renewal safety.

## Roadmap Requirement

The Phase 4 accountant-close pillar begins with explicit accountant-client grants before close-readiness, missing-proof, close-pack, or firm workflow expansion. Accountants must see only authorized clients, and every consent transition must remain tenant-scoped and auditable.

## Current-State Evidence

- `services/accounting/accountant-access.service.ts` resolves delegated reads and exports only from an `ACTIVE`, effective, unexpired grant with the exact organization/accountant active-scope key.
- The same service computes an expired DTO status when `expiresAt <= now`.
- Grant creation currently treats any persisted `ACTIVE` row with the same `activeScopeKey` as a conflict without retiring an expired reservation.
- The unique `activeScopeKey` therefore prevents a new explicit-consent grant after expiry unless a user manually revokes the old row.
- Grant, revoke, delegated access, and portfolio tests pass, but no focused test covers expired renewal or a concurrent unique-key race.
- The Prisma model and migration are valid, but the accountant, grantor, and revoker identity columns do not yet have user foreign keys.
- The accountant-access service, schemas, actions, focused tests, and migration remain untracked in the current worktree. This slice will not stage them or claim deployment ownership.
- `graphify-out/` is absent, so the selection uses live source, tests, schema, migration, and roadmap evidence.

## Candidate Decision

1. **Selected:** expired active-scope retirement and race-safe renewal. This is the smallest correctness dependency for reliable accountant consent.
2. **Deferred:** user identity foreign keys and migration deployment ownership. This requires a separate schema, backfill, and migration-compatibility gate.
3. **Deferred:** missing-proof request lifecycle. It depends on a trustworthy grant lifecycle and service-owned close evidence.
4. **Deferred:** delegated close-pack and portal expansion. Existing read/export surfaces must not be widened before access renewal is safe.

## Required Behavior

- Keep the existing organization/accountant active-scope key as the one-grant concurrency boundary.
- Within the grant transaction, inspect the exact reserved scope.
- Reject an unexpired reserved scope with the canonical `ConflictError` and perform no retirement or create.
- When the reserved scope is expired, clear only that row's `activeScopeKey` and record an `ACCOUNTANT_ACCESS_EXPIRED` business event before creating the replacement grant.
- Require the replacement grant to carry fresh explicit consent evidence and its own grant event.
- Convert a concurrent `activeScopeKey` unique race into the same canonical conflict instead of leaking a raw Prisma error.
- Preserve delegated READ/EXPORT capability checks, tenant scoping, portfolio filtering, revocation, and non-authority boundaries.

## Expected Product Files

- `services/accounting/accountant-access.service.ts`
- `services/accounting/__tests__/accountant-access.service.test.ts`

## Expected Evidence Files

- `what-next/referrals/ACCOUNTANT_CLOSE_PORTAL_GRANT_RENEWAL_SLICE_421_REPORT_2026-08-01.md`
- `what-next/skills-life-cycle/STOQUIFY_SLICE_421_RELEASE_EVIDENCE_REPORT_2026-08-01.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Pre-Edit Baseline

- Accountant access service/action and report-trust gate: 3 suites / 11 tests passed.
- `npm run prisma:validate`: passed.

## Verification Plan

- Focused accountant-access service tests for active conflict, expired retirement, audit ordering, replacement consent, and concurrent unique conflict.
- Accountant-access action and report-trust export-gate regression tests.
- Delegated data-trust action/service regression tests.
- `npm run typecheck`.
- Scoped ESLint for the two product files.
- `npm run prisma:validate` as a no-schema-change ratchet.
- Static scans for transaction ordering, exact tenant/accountant scope, expiry event evidence, unique-race mapping, sensitive data, unrelated activation, and forbidden external authority.
- Direct whitespace, scoped diff, and patch-reject checks.

## Non-Goals

- No Prisma schema or migration edit.
- No identity foreign keys or data backfill.
- No staging, commit, or deployment certification of the untracked accountant-access foundation.
- No new role, permission, entitlement, route, component, navigation, notification transport, missing-proof request, close-pack field, external share, AI/copilot, or WhatsApp authority.
- No POS cash-shortage production activation.

## Handoff

Run `stoquify-accountant-close-portal` for this selected service-owned grant-lifecycle slice, then return to the war-room orchestrator for certification and the next Phase 4 audit.
