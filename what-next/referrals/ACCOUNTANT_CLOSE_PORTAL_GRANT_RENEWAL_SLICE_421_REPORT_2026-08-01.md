# Accountant Close Portal Grant Renewal Slice 421 Report

Date: 2026-08-01
Skill: `stoquify-accountant-close-portal`
Control plane: `stoquify-referral-war-room-orchestrator`

## Decision

Slice 421 is implementation-certified in the current worktree for service-owned accountant grant expiry retirement and renewal safety. This is not deployment certification for the broader accountant-access foundation.

## Before

- Delegated reads and exports already required an exact organization/accountant grant that was active, effective, and unexpired.
- DTOs reported an elapsed grant as expired.
- The persisted row nevertheless remained `ACTIVE` and retained the unique `activeScopeKey`.
- A new grant therefore conflicted after expiry until the old row was manually revoked.
- A concurrent create could leak a raw Prisma `P2002` instead of the established accountant-access conflict.
- No expiry lifecycle event existed.

## Implementation

- Grant creation now derives one exact organization/accountant `activeScopeKey`.
- An unexpired reservation returns the canonical conflict before any update, event, or create.
- A reservation with `expiresAt <= now` has only its `activeScopeKey` cleared inside the grant transaction.
- Retirement records deterministic `ACCOUNTANT_ACCESS_EXPIRED` evidence using the original grant ID and expiry time before the replacement grant is created.
- The replacement still requires fresh explicit consent evidence and records its own `ACCOUNTANT_ACCESS_GRANTED` event.
- Only a Prisma `P2002` targeting `activeScopeKey` is converted to the canonical grant conflict. Other database errors are preserved.
- Existing delegated READ/EXPORT role checks, tenant scope, portfolio filtering, revocation, notification, and portal contracts remain unchanged.

## Changed Product Files

- `services/accounting/accountant-access.service.ts`
- `services/accounting/__tests__/accountant-access.service.test.ts`

No Prisma schema, migration, action, route, component, navigation, permission, entitlement, external-sharing, AI/copilot, WhatsApp, or POS activation file was changed by this slice.

## Verification

- Focused accountant-access service: 1 suite / 9 tests passed.
- Accountant access, delegated data trust, and report-trust regression: 5 suites / 29 tests passed.
- Exact accountant portal route plus business-event service: 2 suites / 6 tests passed.
- Full TypeScript typecheck passed.
- Scoped ESLint passed with zero errors.
- Prisma validation passed.
- Static scope/order gate passed for exact tenant/accountant reservation, expiry boundary, retirement before expiry event, expiry event before replacement create, grant event after create, and catch mapping after the transaction.
- Static evidence gate passed for deterministic expiry idempotency, no accountant email/firm data in the expiry event, active-scope-only race mapping, and preserved delegated time/role checks.
- External-authority and direct trailing-whitespace scans passed.
- No patch reject files remain.\n- Independent read-only review found no blocking or high-severity implementation issue.

## Release Boundary

The Slice 421 service behavior is certified in the current worktree. Production release remains prohibited because:

- the accountant-access service, schemas, actions, tests, and migration are untracked;
- the shared Prisma schema contains pre-existing unrelated modifications;
- `accountantUserId`, `consentGrantedById`, and `revokedById` have no decided user foreign-key/retention policy;
- database lifecycle constraints and backfill policy remain unresolved;
- no clean PostgreSQL `migrate deploy` and `migrate status` evidence exists from an exact tracked revision.

## Deferred Phase 4 Risks

- Future-effective grants are still represented as `EXPIRED` in the DTO vocabulary.
- Fully past consent windows can still be submitted when `expiresAt > effectiveFrom`.
- Identity integrity and migration repository ownership require a dedicated gate.
- Missing-proof requests, close-pack delegation expansion, and accountant firm workflow remain unselected.

## Next Handoff

Return to `stoquify-referral-war-room-orchestrator` for a fresh Phase 4 candidate audit. No Slice 422 is preselected.
