# Daily Truth Reconciliation Sign-Off Product Command Report

Generated: 2026-07-19  
Program: Stoquify Referral-Worthy Execution Program  
Phase: Phase 2, Daily Truth Dashboard And Action Center  
Slice: 24, Reconciliation Sign-Off Product Command  
Status: **certified complete**

## Decision

The tenant-wide Manager Action Center now exposes payment reconciliation sign-off as a source-owned product command only when the reconciliation service returns `AVAILABLE`. The browser workflow completed a real password step-up and protected sign command, reached durable `SIGNED` truth, refreshed the command away, and restored every mutable fixture baseline exactly.

Slice 24 is complete. Control returns to `stoquify-referral-war-room-orchestrator` via `/stoquify-referral-war-room` for Phase 2 promotion review. Phase 3 and Leakage Radar were not started.

## Before And After

Before this slice:

- The payment-reconciliation service owned a certified `AVAILABLE`, `READ_ONLY`, `EMPTY`, or `HIDDEN` command-state descriptor.
- The protected sign action enforced critical RBAC, module entitlement, fresh authentication, maker-checker separation, source-version concurrency, idempotency, and durable certification.
- The Manager Action Center did not compose that source descriptor into an executable product command or have authenticated EN/FR desktop/mobile evidence.

After this slice:

- Tenant-wide Manager Action Center composition queries the source-owned descriptor after guarded tenant access succeeds.
- Managed-location and unauthorized contexts remain non-enumerating.
- `AVAILABLE` produces the executable reconciliation discriminant; `READ_ONLY` remains link-only; `EMPTY` and `HIDDEN` add no action.
- The client sends the password only to password step-up and sends only the rendered `runId` and source-version hash to the protected sign action.
- Success, replay, another-checker completion, stale source, access change, authentication loss, rate limit, fresh-auth expiry, and safe transport errors refresh from service-owned truth.
- Ordinary signal and assurance actions remain link-only. No generic client-authored resolution truth was introduced.

## Classification Matrix

| Source state               | Tenant-wide action                                  | Submit control | Managed-location or unauthorized evidence |
| -------------------------- | --------------------------------------------------- | -------------- | ----------------------------------------- |
| `AVAILABLE`                | `SOURCE_COMMAND / PAYMENT_RECONCILIATION_SIGN_OFF`  | yes            | none                                      |
| `READ_ONLY`                | `SOURCE_COMMAND / LINK`                             | no             | none                                      |
| `EMPTY`                    | no source action                                    | no             | none                                      |
| `HIDDEN`                   | no source action                                    | no             | none                                      |
| source-state query failure | no source action; ordinary actions remain available | no             | none                                      |

`actions/security/step-up-auth.actions.ts` is classified by the module-surface inventory as `not applicable: cross-module session assurance`. It is shared assurance infrastructure, not a standalone commercial API or module surface. The exact exception is regression tested and the fail-mode ratchet reports no new gap.

## Implementation

- `manager-action-center-contracts.ts` now uses a discriminated action union that prevents link-only actions from carrying a command candidate.
- `manager-action-center.service.ts` composes one deterministic tenant-wide reconciliation source action without making source-state failure fatal to the ordinary action center.
- `PaymentReconciliationSignOffCommand.tsx` provides the controlled password-step-up dialog and handles all protected action outcomes without authoring terminal truth in the browser.
- `ManagerActionCenterDashboard.tsx` renders localized EN/FR source evidence, the executable control only for its discriminant, and a due-today summary.
- The dialog button is a registered Radix trigger, so `Escape` restores keyboard focus correctly.
- Long business-signal action labels wrap inside their action surface and no longer extend beyond the viewport.
- Page, action, manager-service, component, and inventory-classifier tests cover the new composition.

## Browser Certification

Authoritative artifacts:

- Preflight: `what-next/referrals/DAILY_TRUTH_RECONCILIATION_SIGN_COMMAND_UI_BROWSER_PREFLIGHT_2026-07-19.json`
- Evidence: `what-next/referrals/DAILY_TRUTH_RECONCILIATION_SIGN_COMMAND_UI_BROWSER_EVIDENCE_2026-07-19.json`
- Screenshots: `what-next/referrals/screenshots/daily-truth-reconciliation-sign-command-ui-2026-07-19/`

| Stage                            |    Viewport | Result                                                        |
| -------------------------------- | ----------: | ------------------------------------------------------------- |
| read-only English desktop        | 1440 x 1000 | source descriptor visible; submit absent; pass                |
| available English desktop dialog | 1440 x 1000 | password empty/focused; Escape focus restored; pass           |
| available French desktop dialog  | 1440 x 1000 | localized evidence and command; pass                          |
| available English mobile dialog  |   390 x 844 | scroll-safe dialog; no clipping/overlap; pass                 |
| available French mobile dialog   |   390 x 844 | localized scroll-safe dialog; pass                            |
| signed English desktop           | 1440 x 1000 | durable `SIGNED`; target command removed; dialog closed; pass |

Certification facts:

- 6/6 browser stages passed.
- Zero serious or critical axe findings.
- Zero page errors and zero genuine failed requests.
- Three `net::ERR_ABORTED` requests caused by the successful Next route refresh are retained separately as browser cancellations, not hidden or counted as request failures.
- Every screenshot has the expected dimensions and nonblank sampled pixels.
- No horizontal overflow, clipped control, or incoherent overlap remained.
- The real command produced one `payment.reconciliation.signed` business event and one reconciliation ledger audit for the unique disposable source.
- Maker and checker were distinct.

## Restoration And Redaction

- Temporary role state matched its preflight hash exactly and the role was removed.
- Both signer session-assurance baselines matched exactly.
- Tenant package modules and `updatedAt` matched the preflight baseline exactly.
- Disposable role, fiscal year, period, ledger accounts, rail, provider, settlement account, provider event, and reconciliation run all returned to count zero.
- The existing ready reconciliation remained untouched.
- Append-only audit, ledger-audit, business-event, and outbox evidence was intentionally retained.
- No password, cookie value, session ID, session token, assurance value, or bearer credential was saved or screenshotted. Mutable baselines use opaque hashes only.
- Port 3012 is not listening and temporary harness/server-log files were removed.

## Verification

Passed:

- Focused manager/action/page/component set: 5 suites, 43 tests.
- Source-state/certification/payment-action set: 3 suites, 46 tests.
- Module-surface classifier: 1 suite, 14 tests.
- Focused ESLint on the manager dashboard and reconciliation command files.
- `npm run service:boundary:fail`: 0 active violations.
- `npm run module:surface:fail`: 367 records, no new gap.
- `npm run role:cockpit:gate`: ready, 9/9.
- Full typecheck passed earlier after the Slice 24 shared contracts and product composition were added.

Closing rerun note:

- The final `npm run typecheck` rerun is currently blocked outside this slice at `app/[locale]/(dashboard)/dashboard/people/page.tsx:58` by TS2367, an impossible comparison with `LOCATION_RESPONSIBILITY`. Slice 24 did not modify that file or the HR/People workflow. This cross-worktree issue is handed to the Phase 2 program review rather than being silently changed here.

## Defects Resolved During Certification

1. The manually controlled dialog had no registered trigger, so focus did not return after `Escape`. The button now uses `DialogTrigger`, with a component regression test and passing Chromium evidence.
2. A long existing business-signal action label exceeded the desktop viewport after sign refresh. The action surface now permits bounded multi-line text, with a focused regression test.
3. Reusing a disposable run ID collided with correctly retained append-only idempotency evidence on repeated certification attempts. The reversible harness used a unique source ID per execution and retained historical evidence.
4. Cold Next locale and server-action compilation was separated from product assertions with bounded interaction and commit waits. No assertion was removed.

## Scope Guard

No Prisma schema or migration was added for Slice 24. No generic Action Item persistence, Leakage Radar, inventory-loss implementation, Phase 3 product code, AI copilot authority, or WhatsApp authority was introduced.

## Handoff

Run:

```text
/stoquify-referral-war-room
```

Review the certified Slice 24 evidence, adjudicate the unrelated People-page typecheck blocker, and make the explicit Phase 2 promotion decision before selecting any Phase 3 implementation slice.
