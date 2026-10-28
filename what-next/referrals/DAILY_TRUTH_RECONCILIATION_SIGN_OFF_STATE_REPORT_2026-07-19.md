# Daily Truth Reconciliation Sign-Off Command State Report

Generated: 2026-07-19  
Program: Stoquify Referral-Worthy Execution Program  
Phase: 2 - Daily Truth Dashboard And Action Center  
Slice: 22 - Source-Owned Reconciliation Sign-Off Command State  
Primary skill: `stoquify-daily-truth-command-center`

## Executive Result

Slice 22 is complete and certified at the service/read-model boundary.

Stoquify now has a payment-reconciliation-owned command-state contract that can return one deterministic `READY_FOR_SIGNOFF` candidate or an explicit `EMPTY`, `READ_ONLY`, or `HIDDEN` outcome. It does not sign a run, persist a generic action item, add a route, or expose a product control.

The state is derived from durable `ReconciliationRun` truth only after tenant-wide operating authority, organization and actor identity, RBAC, and enforced module entitlement are resolved. Managed-location responsibility receives no provider or run evidence.

## Before State

Before Slice 22:

- payment reconciliation already owned the durable terminal transition `READY_FOR_SIGNOFF -> SIGNED`;
- the Manager Action Center had no narrow source-state adapter for that command;
- consumers would have needed to understand reconciliation persistence or trust projection-level action metadata;
- there was no explicit service result for empty, read-only, hidden, module-denied, or maker-checker outcomes;
- no stable command projection hash bound the approved provider/date/aggregate facts;
- the existing write path still required separate hardening before product exposure.

## After State

After Slice 22:

- `ReconciliationRun` remains the sole source of command truth;
- candidate selection is deterministic by `businessDate`, `createdAt`, then `id`, all ascending;
- operating access is resolved before entitlement, and read/write entitlement is resolved before source access for a sign-capable actor;
- the source query is tenant-bounded and restricted to `READY_FOR_SIGNOFF`;
- location-responsibility, denied access, missing read permission, and denied read entitlement return non-enumerating `HIDDEN` states;
- missing sign permission, denied write entitlement, and maker-checker conflict return explicit `READ_ONLY` states;
- no eligible row returns `EMPTY` with no invented candidate;
- foreign, malformed, inactive, future-dated, stale-status, or inconsistent evidence fails closed;
- the source version hash covers the approved provider identity/display/currency, dates, maker, totals, counts, status, and source update time;
- the projection hash excludes observation time, so it remains stable when source and authorization facts do not change;
- output excludes external provider account identifiers, raw payloads, certificates, request hashes, correlation IDs, credentials, and session material.

## Implemented Files

- `services/reconciliation/payment-reconciliation-sign-off-command-state-contracts.ts`
- `services/reconciliation/payment-reconciliation-sign-off-command-state.service.ts`
- `services/reconciliation/__tests__/payment-reconciliation-sign-off-command-state.service.test.ts`
- `what-next/referrals/DAILY_TRUTH_RECONCILIATION_SIGN_OFF_STATE_REPORT_2026-07-19.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

No Prisma schema or migration was added. No action, route, component, generic `ActionItem`, AI, WhatsApp, or Phase 3 file was changed for this slice.

## State Contract

| State | Meaning | Candidate exposed | Command allowed |
|---|---|---:|---:|
| `AVAILABLE` | Tenant-wide actor has read/sign RBAC, read/write entitlement, and is not the maker | yes | yes |
| `READ_ONLY` | Source is visible but sign permission, write entitlement, or maker-checker independence is unavailable | yes | no |
| `EMPTY` | No tenant `READY_FOR_SIGNOFF` run exists | no | no |
| `HIDDEN` | Operating authority, tenant-wide scope, read RBAC, or read entitlement is unavailable | no | no |

The contract publishes controls rather than claiming execution:

- source of truth: `ReconciliationRun`;
- tenant-wide only;
- module entitlement enforced;
- maker-checker required;
- fresh authentication required at write time;
- minimum assurance `L1`;
- source revalidation required at write time;
- client-supplied resolution is never accepted.

## Acceptance Gate

| Gate | Result | Evidence |
|---|---|---|
| Deterministic candidate or explicit non-command state | pass | Four-state discriminated contract and ordered source query |
| Authority, identity, RBAC, and entitlement before exposure | pass | Invocation-order and identity-consistency tests |
| Location responsibility cannot receive tenant/provider command | pass | `TENANT_WIDE_REQUIRED`, no entitlement or source call |
| Approved redacted evidence plus stable hashes | pass | Narrow Prisma select, recursive forbidden-key test, source/projection hash tests |
| Foreign, malformed, stale, or inconsistent evidence fails closed | pass | Cross-tenant/provider/maker, inactive provider, stale status, invalid dates/counts/money tests |
| Focused tests without UI | pass | 28 Slice 22 tests |
| No mutation, migration, generic task, Phase 3, AI, or WhatsApp | pass | Static dependency/mutation assertions and change-set inspection |

## Verification

Focused Slice 22 suite:

```text
Test Suites: 1 passed, 1 total
Tests:       28 passed, 28 total
Snapshots:   0 total
```

Expanded relevant baseline, including the prior five suites:

```text
Test Suites: 6 passed, 6 total
Tests:       53 passed, 53 total
Snapshots:   0 total
```

Additional checks:

- focused ESLint: passed with no findings;
- `npm run typecheck`: passed;
- `npm run service:boundary`: passed, 0 active service-boundary violations;
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers;
- `npm run module:surface:ratchet`: command exited successfully in warn mode, but the generated ratchet status remains failed because of two unrelated new gaps for `actions/security/step-up-auth.actions.ts` (`MODULE_SURFACE_UNMAPPED` and `MODULE_SURFACE_MISSING_PERMISSION`). The new reconciliation state service is not listed as a new gap and enforces `payment_reconciliation` read/write access directly.

The module ratchet caveat is not treated as a Slice 22 failure and is not silently claimed as green.

## Security And Trust Properties

- Organization and actor identities returned by operating-access resolution must exactly match the request context.
- Entitlement decisions must exactly match tenant, actor, module, surface, intent, mode, result, and blocking semantics.
- Wildcard RBAC does not substitute for the critical reconciliation sign permission.
- Source evidence includes an active, non-archived, same-tenant provider and a same-tenant maker.
- A maker with sign authority receives `READ_ONLY`, never `AVAILABLE`.
- Source timestamps cannot be in the future relative to the bounded observation time.
- No source row is queried for denied, location-scoped, missing-read, or read-entitlement-denied actors.

## Residual Risks

Slice 22 describes command availability; it does not make the current write action ready for Action Center exposure.

The following remain for Slice 23:

- preserve the verified fresh-auth timestamp instead of constructing service assurance with `Date.now()`;
- enforce `payment_reconciliation` write entitlement in the protected command;
- define semantic idempotency and committed-success replay behavior;
- prove concurrent sign attempts cannot duplicate certificate, audit, event, outbox, or close-invalidation evidence;
- return source-stale behavior when the candidate version changes before execution;
- retain every existing provider, exception, suspense, accounting-period, source-manifest, permission, and maker-checker revalidation.

Composition into the Manager Action Center and browser certification remain Slice 24. Phase 3, AI, WhatsApp, and generic action persistence remain on hold.

## Next Handoff

Run:

```text
/stoquify-daily-truth
```

Implement only **Phase 2 / Slice 23: Protected Reconciliation Sign Command Hardening**. Harden the existing source write boundary and its protected action; do not start the Action Center UI, browser workflow, generic `ActionItem` persistence, Phase 3, AI, or WhatsApp.
