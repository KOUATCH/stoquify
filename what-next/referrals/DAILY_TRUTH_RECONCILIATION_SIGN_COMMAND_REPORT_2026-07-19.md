# Daily Truth Reconciliation Sign Command Report

Generated: 2026-07-19  
Phase: Phase 2 / Slice 23  
Status: **certified complete**  
Skill: `stoquify-daily-truth-command-center`

## Decision

The existing payment-reconciliation-owned terminal command is now sufficiently hardened for later Manager Action Center composition.

The command remains owned by `ReconciliationRun` and its durable `READY_FOR_SIGNOFF -> SIGNED` transition. No generic action-resolution table, client-authored resolved flag, or second source of truth was introduced.

Slice 24 may now compose this command into the tenant-wide Manager Action Center and certify the step-up browser workflow. This report does not certify that UI.

## Before And After

### Before

- The protected sign action required `payments.reconciliation.sign` and wrapper fresh authentication, but reconstructed service assurance with `Date.now()`.
- The sign action did not explicitly enforce `payment_reconciliation` write entitlement.
- The service accepted only a first-time `READY_FOR_SIGNOFF` mutation and used an update by identifier rather than a conditional terminal transition.
- A retry after a committed sign did not return durable success evidence.
- Concurrent attempts did not have an explicit compare-and-transition contract at the reconciliation aggregate.
- The read descriptor and write command did not share one canonical source-version algorithm.

### After

- The protected action requires `payments.reconciliation.sign`, a five-minute password-assurance window, and enforced `payment_reconciliation` write access.
- Actor, tenant, assurance organization, assurance level, and assurance timestamp are checked against the verified protected-action context. The exact verified `Date` reaches the service; the sign path no longer fabricates `lastAuthAt` with `Date.now()`.
- The read descriptor and write command use the same SHA-256 source-version helper over provider identity/display/currency, dates, status, maker, totals, counts, and source `updatedAt`.
- The service re-reads service-owned truth in a serializable transaction, revalidates every existing control, and conditionally updates only the exact current `READY_FOR_SIGNOFF` row.
- A committed `SIGNED` run is the idempotency source. Correlation ID remains trace metadata.
- Same-checker replay and another-checker completion return validated durable evidence without another terminal mutation, certificate, ledger audit, business event, outbox message, or close invalidation.
- Lost conditional transitions and Prisma serialization/unique conflicts recover only from a valid committed `SIGNED` aggregate; otherwise they return source-stale behavior.

## Implemented Files

- `actions/payments/reconciliation.actions.ts`
- `actions/payments/__tests__/reconciliation.actions.test.ts`
- `services/reconciliation/payment-reconciliation-sign-off-source-version.ts`
- `services/reconciliation/payment-reconciliation-sign-off-command-state.service.ts`
- `services/reconciliation/payment-reconciliation-certification.service.ts`
- `services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts`
- `services/reconciliation/__tests__/payment-reconciliation-sign-off-command-state.service.test.ts`
- `what-next/referrals/DAILY_TRUTH_RECONCILIATION_SIGN_COMMAND_REPORT_2026-07-19.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

No Prisma schema or migration was added. No Manager Action Center component, page, generic `ActionItem`, Phase 3 feature, AI, or WhatsApp path was changed.

## Protected Action Contract

The protected sign wrapper now declares:

- permission: `payments.reconciliation.sign`;
- fresh-auth maximum age: 300 seconds;
- module: `payment_reconciliation`;
- surface: `actions/payments/reconciliation.actions.ts`;
- surface type: `action`;
- intent: `write`;
- mode: `enforce`;
- module audit: enabled.

The action accepts an optional canonical `expectedSourceVersionHash`. This preserves the existing finance reconciliation caller while allowing the Slice 24 Action Center descriptor to submit the exact version it rendered. Even when the legacy caller omits the hash, the transaction still uses current-source revalidation and the conditional `status + updatedAt + empty terminal evidence` transition.

## Idempotency And Concurrency

| Observed source state | Actor relation | Result | New side effects |
|---|---|---|---:|
| Exact current `READY_FOR_SIGNOFF` | independent checker | `SIGNED`, `replayed: false` | one atomic set |
| Valid committed `SIGNED` | same checker | `SIGNED`, `replayed: true` | none |
| Valid committed `SIGNED` | another checker | `ALREADY_SIGNED`, `completedByAnotherActor: true` | none |
| Conditional transition lost, winner is same checker | same checker | committed replay | none from loser |
| Conditional transition lost, winner is another checker | another checker | already completed | none from loser |
| Expected source hash differs | any first attempt | source-stale rejection | none |
| Terminal evidence is malformed or hash-inconsistent | any replay | fail closed | none |
| Race ends without valid committed `SIGNED` evidence | any | source-stale rejection | none |

The terminal compare-and-transition predicate includes organization, run, `READY_FOR_SIGNOFF`, exact `updatedAt`, and null signer/time/certificate fields. The signed row is read back before certification side effects proceed.

## Preserved Service Controls

The service continues to fail closed on:

- missing critical sign permission;
- stale or missing authentication assurance;
- maker-checker self-approval;
- inactive or incomplete provider configuration;
- missing or closed accounting period;
- missing provider events and statement lines;
- open reconciliation exceptions;
- open suspense items;
- posted suspense without ledger evidence;
- source-manifest count drift;
- stale descriptor/source-version evidence;
- inconsistent signed certificate or metadata evidence;
- foreign organization/run identity.

The successful transaction still owns the certificate payload/hash, control audit, ledger audit, `payment.reconciliation.signed` business event, outbox notification, and close-certification invalidation. A losing transaction may execute mocked calls before its conditional conflict, but the real serializable transaction rolls those writes back; recovery performs no writes.

## Focused Test Evidence

Certification service:

```text
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

Protected action:

```text
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

Source-owned command state:

```text
Test Suites: 1 passed, 1 total
Tests:       28 passed, 28 total
```

Expanded Action Queue, Manager Action Center, source-state, service, and action baseline:

```text
Test Suites: 6 passed, 6 total
Tests:       63 passed, 63 total
Snapshots:   0 total
```

The expanded baseline is the prior 53 tests plus 10 new protected-command cases.

## Static And Release Gates

- Focused ESLint: passed with no findings.
- `npm run typecheck`: passed.
- `npm run service:boundary`: passed with 0 active violations.
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers.
- Narrow `git diff --check`: passed for Slice 23 files.
- `npm run module:surface:ratchet`: exited successfully in warn mode and regenerated its evidence, but still reports two unrelated new gaps on `actions/security/step-up-auth.actions.ts`: `MODULE_SURFACE_UNMAPPED` and `MODULE_SURFACE_MISSING_PERMISSION`.

The module inventory maps `actions/payments/reconciliation.actions.ts` to `payment_reconciliation` and reports no new reconciliation gap. Its file-level summary remains coarse; the focused action test proves that the sign wrapper itself uses enforced write entitlement.

## Gate Result

| Slice 23 requirement | Result | Evidence |
|---|---|---|
| Critical RBAC and verified fresh-auth provenance | pass | protected wrapper and action tests |
| Enforced `payment_reconciliation` write access | pass | module metadata and focused action assertion |
| Committed replay and exactly-once terminal evidence | pass | same/other checker and side-effect-count tests |
| Conditional transition and stale-source rejection | pass | source hash plus conditional `updateMany` tests |
| Existing provider/period/exception/suspense/manifest controls | pass | preserved service checks and regression suite |
| Focused action/service verification | pass | 18 command tests; 63-test expanded baseline |
| No UI, generic persistence, Phase 3, AI, or WhatsApp | pass | narrow change-set review |

## Residual Boundary

Slice 23 does not make the command visible in the Manager Action Center.

Slice 24 must:

- compose the source-owned descriptor only into tenant-wide Manager Action Center data;
- keep managed-location and unauthorized actors non-enumerating;
- render the command only for `AVAILABLE` state and never give `READ_ONLY` state a submit control;
- use the existing password step-up pattern;
- submit the rendered source-version hash;
- handle safe stale-source, replay, already-completed, permission/entitlement-change, rate-limit, and success states;
- refresh from source after terminal/access-changing outcomes;
- preserve ordinary signal actions as link-only projections;
- add focused service/component/page tests and authenticated desktop/mobile accessibility evidence.

## Next Handoff

Run:

```text
/stoquify-daily-truth
```

Execute only Phase 2 / Slice 24, **Reconciliation Sign-Off Product Command**, and save:

`what-next/referrals/DAILY_TRUTH_RECONCILIATION_SIGN_COMMAND_UI_REPORT_2026-07-19.md`

Do not begin Leakage Radar, generic action persistence, AI, or WhatsApp work until Slice 24 is certified and the war room promotes Phase 2.

