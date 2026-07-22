# Cross-Cutting Module-Surface Boundaries Follow-up

Date: 2026-07-20

Skills:

- `aqstoqflow-module-surface-registry-ratchet`
- `aqstoqflow-module-access-guard-contract`

Status: complete

## Scope

Resolve false-positive module ownership findings for:

- `actions/_shared/safe-action-responses.ts`
- `actions/auth.ts`

No runtime authentication, error handling, tenant access, RBAC, or entitlement behavior was changed.

## Evidence and decisions

### Internal action-response helper

`actions/_shared/safe-action-responses.ts` exports reusable safe-error conversion and structured logging helpers. It is consumed across 58 action, test, and engineering-document surfaces and does not expose an executable tenant business command.

Classification: `not applicable: internal action response helper`

### Public identity boundary

`actions/auth.ts` exposes registration and credential sign-in. Both execute before an authenticated tenant-commercial module decision can exist. Registration delegates to the public identity workflow with request context; sign-in delegates to the authentication provider and establishes the session cookie.

Classification: `not applicable: public identity boundary`

Authentication validation, enumeration resistance, rate limiting, cookie security, and abuse controls remain identity/security concerns. They must not be replaced by commercial module entitlement.

## Changes

- Added two exact-file applicability rules to the inventory classifier.
- Added a focused regression suite that verifies both records remain module-less and produce no active module-surface findings.
- Regenerated the inventory and baseline ratchet in warn mode.

## Delta

- Cross-cutting active gaps: 4 → 0
- Whole inventory active gaps: 20 → 16
- Saved baseline active gaps: 55
- Overall active-gap delta: **−39**
- New findings: 0
- Resolved findings: 39
- Remaining unmapped records: 10
- Remaining missing-permission records: 4
- Ratchet status: passed

## Controls

- Tenant/RBAC: neither file is a tenant-commercial action boundary, so no tenant module guard was invented.
- Identity: public registration and login retain their existing request-context, credential, and safe-error controls.
- Audit/redaction: safe response helpers continue to log canonical metadata without raw error disclosure.
- Entitlement: module control remains report/warn mode; no enforcement change was made.
- Release gate: exclusions are exact-file and test-backed rather than broad folder exemptions.

## Verification

- `actions/__tests__/auth-actions.test.ts` — passed.
- `actions/_shared/__tests__/safe-action-responses.test.ts` — passed.
- `scripts/__tests__/module-surface-inventory-cross-cutting-boundaries.test.js` — passed.
- Combined focused result: 3 suites / 13 tests passed.
- `npm run module:surface:ratchet` — passed, 367 records, 16 active gaps, zero new findings.

## Next handoff

The next safest ownership-only cluster is:

- `actions/signals/business-signals.actions.ts`
- `actions/snapshots/snapshot.actions.ts`

Both already show `dashboard.read` permission and protected-action guard evidence. Confirm their read-model ownership and consumers before mapping them to the canonical Dashboard module. Keep customer, supplier, evidence, and module-service findings separate because they require distinct ownership or parser decisions.
