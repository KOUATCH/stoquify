# Daily Truth Sign-Off Command UI Report

Generated: 2026-07-19  
Program: Stoquify Referral-Worthy Execution Program  
Phase: Phase 2 - Daily Truth Dashboard And Action Center  
Slice: 20 - Controlled branch daily-close sign-off product command with password step-up  
Operating skill: `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`

## Executive Disposition

Slice 20 is **certified complete**. Authenticated reviewer/signer desktop and mobile browser evidence passed 5/5 stages, including password step-up, a committed active sign-off, server-confirmed `SIGNED`, distinct durable maker/checker identities, append-only audit and business-event proof, and exact restoration of the authorized local test fixture.

The certification run also found and closed two product defects: a narrow-screen dialog-title overlap and an invalid business-event source enum that caused the sign transaction to roll back. The final focused, regression, static, architecture, accessibility, layout, redaction, and cleanup gates all pass.

Phase 2 remains active only because the final war-room review found a separate roadmap criterion still unproven: the operating surface has two, not three, durable daily commands. That decision is recorded in `what-next/referrals/REFERRAL_WAR_ROOM_PHASE_2_REPORT_2026-07-19.md` and does not reopen Slice 20.

## Before And After

### Before

- The protected critical sign action existed but had no daily-close product caller.
- The password step-up action existed but had no product interaction for branch daily-close sign-off.
- The workspace could display `AWAITING_SIGN_OFF` but exposed no permission-aware sign command.
- No client contract proved that password material stayed out of the sign request.
- Invalid credentials, rate limiting, fresh-auth expiry, replay, double submission, and maker-checker denial had no product-level interaction coverage.

### After

- The guarded server page derives `canSign` only from the trusted RBAC context with `branch.daily-close.sign`.
- The workspace renders the sign command only for `AWAITING_SIGN_OFF` plus trusted `canSign`.
- The interaction sends password only to `stepUpWithPasswordAction()`.
- After successful step-up, the client sends only location, explicit business date, and one bounded per-attempt idempotency key to `signBranchDailyCloseAction()`.
- The same idempotency key is retained across safe retry, including fresh-auth expiry between protected actions.
- Successful creation or replay refreshes the protected completion read; the browser never authors `SIGNED`.
- Password input is cleared after every submission and whenever the dialog closes.
- English and French operational copy is present.
- The mobile dialog header reserves close-control space on narrow screens.
- The signed business event uses valid `MANUAL` source provenance and preserves `BranchDailyCloseSignOff` as domain metadata.

## Product Contract

### Trusted Capability

- `app/[locale]/(dashboard)/dashboard/manager-action-center/daily-close/page.tsx` derives `canSign` from `canUsePermission(ctx, "branch.daily-close.sign")` only after the protected completion read succeeds.
- Query, component, and action-caller input cannot grant sign capability.
- Focused page tests prove review and sign capabilities are independently derived from the guarded context and are not evaluated when the protected read fails.

### Lifecycle Gate

- `BranchDailyCloseWorkspace` requires both `canSign` and completion state `AWAITING_SIGN_OFF`.
- The command is absent for `NOT_STARTED`, `BLOCKED`, `SIGNED`, and `EVIDENCE_DRIFTED`, even when capability is true.
- The command is absent for `AWAITING_SIGN_OFF` when capability is false.

### Password Step-Up And Sign Request

- Password is sent only to `stepUpWithPasswordAction()`.
- The sign action receives only `locationId`, `businessDate`, and `idempotencyKey`.
- Actor, tenant, roles, permissions, review identity, assurance time, evidence hashes, clock, audit metadata, event data, and sign status remain server-owned.
- Password is never placed in a URL, browser storage, log, sign input, saved evidence, screenshot, or analytics path.

### State And Retry

- One idempotency key is generated per mounted UI attempt and retained for safe retry.
- A synchronous in-flight ref blocks duplicate submissions before React pending state renders.
- `AUTH_REQUIRED` and sign-action 401/403 responses refresh capability without claiming success.
- `RATE_LIMITED` uses the bounded delay returned by the step-up action.
- `FRESH_AUTH_REQUIRED` retains the same sign attempt and requests password verification again.
- Only server-confirmed creation or replay produces terminal success copy and completion refresh.

## Guardrail Matrix

| Guardrail | Result | Evidence |
|---|---|---|
| Service-owned truth | Preserved | Completion, review, drift, maker-checker, sign status, persistence, audit, and event remain protected service contracts. |
| RBAC | Preserved | Server page derives `canSign`; protected action independently requires `branch.daily-close.sign`. |
| Fresh authentication | Preserved | Password step-up precedes signing; verified assurance claims and time remain session/server-owned. |
| Password handling | Preserved | Password is dialog-local, cleared after attempt/close, and excluded from sign input and evidence. |
| Tenant isolation | Preserved | Client supplies no organization or actor identity. |
| Maker-checker | Preserved | Service reloads the review and blocks self-approval. |
| Idempotency | Preserved | One bounded UI key is retained across safe retry; service owns replay. |
| Audit and event | Preserved | Service owns both; event uses valid `MANUAL` provenance and domain-specific metadata. |
| Module entitlement | Preserved | Page maps to `dashboard.read`; sign action maps to `dashboard` / `branch.daily-close.sign`. |
| AI and delivery | Out of scope | No copilot, WhatsApp, notification, certificate, revocation, or supersession behavior was added. |

## Defects Found During Certification

1. A proposed reviewer-to-signer location transfer modified source-owned location evidence and correctly caused drift. The fixture now keeps the location immutable and grants the reviewer temporary tenant authority.
2. The 390 x 844 dialog title overlapped the close control. `DialogHeader` now uses `pr-8`, with a narrow-screen regression test.
3. `BusinessEvent.sourceType` is an `AccountingSourceType` enum, but the sign service supplied `BranchDailyCloseSignOff`. Prisma rejected the event create and rolled back signing. The service now uses `MANUAL` and stores `metadata.sourceEntityType: "BranchDailyCloseSignOff"`.
4. The harness waits for the asynchronous protected completion refresh before asserting `SIGNED`; success copy alone is not completion evidence.

## Browser Certification

Evidence:

- `what-next/referrals/DAILY_TRUTH_SIGN_OFF_COMMAND_UI_BROWSER_PREFLIGHT_2026-07-19.json`
- `what-next/referrals/DAILY_TRUTH_SIGN_OFF_COMMAND_UI_BROWSER_EVIDENCE_2026-07-19.json`
- `what-next/referrals/screenshots/daily-truth-sign-off-command-ui-2026-07-19/`

Passed stages:

1. Reviewer-created review, desktop: `AWAITING_SIGN_OFF`, sign command absent.
2. Signer without permission, desktop: `AWAITING_SIGN_OFF`, sign command absent.
3. Permitted signer, mobile dialog: password empty at capture, no title/close overlap.
4. Permitted signer, desktop dialog: password empty at capture.
5. Signed desktop: server-derived `SIGNED`, dialog closed, active sign-off evidence visible.

All five stages report:

- zero serious/critical axe violations;
- no horizontal overflow;
- no clipped controls;
- no incoherent overlap;
- no page errors;
- no failed requests.

Durable proof records reviewer `usr_payroll_e2e_local`, signer `usr_payroll_e2e_requester_local`, maker-checker distinctness, `L1` assurance, sign-control and signed audits, and review-started and signed business events.

## Restoration And Redaction

- Reviewer and signer permission hashes exactly match preflight.
- Temporary role codes and timestamps were restored.
- Two signer-session assurance records exactly match the opaque preflight hash and timestamps.
- Disposable location, review-run, and sign-off counts are all zero.
- Append-only audits and business events were intentionally retained.
- Evidence stores no password, password screenshot, session ID, session token, cookie, or raw assurance value.
- Boolean-only scanning found no fixture password, JWT-shaped value, cookie assignment, or bearer value.

## Verification

### Focused Tests

The final expanded Slice 20 gate includes the route, workspace, sign component, step-up action, sign action, and sign service:

- 6 suites passed.
- 100 tests passed.
- 0 snapshots.

The sign component suite passes 15/15, including narrow-screen close-control spacing. The sign service suite proves valid business-event provenance.

### Close Regression

```text
node node_modules/jest/bin/jest.js --runInBand --silent actions/end-of-day-close services/end-of-day-close
```

- 12 suites passed.
- 237 tests passed.
- 0 snapshots.

### Static And Architecture Gates

- `npm run typecheck`: passed with zero diagnostics.
- Focused ESLint across all touched product and test files: passed.
- `npm run service:boundary`: 0 active violations.
- `npm run role:cockpit:gate`: ready, 9/9 checks, 0 blockers.
- `npm run module:surface:ratchet`: 367 records and 10 unrelated warn-mode gaps.
- Relevant module records are mapped with no dependency gap:
  - page: `dashboard.read`;
  - sign action: `dashboard` / `branch.daily-close.sign`.
- Port 3011 is stopped.
- No `.codex-slice20*` harness or server log remains.

## Files Added

- `components/manager-action-center/BranchDailyCloseSignOffCommand.tsx`
- `components/manager-action-center/__tests__/BranchDailyCloseSignOffCommand.test.tsx`
- `what-next/referrals/DAILY_TRUTH_SIGN_OFF_COMMAND_UI_REPORT_2026-07-19.md`
- `what-next/referrals/DAILY_TRUTH_SIGN_OFF_COMMAND_UI_BROWSER_PREFLIGHT_2026-07-19.json`
- `what-next/referrals/DAILY_TRUTH_SIGN_OFF_COMMAND_UI_BROWSER_EVIDENCE_2026-07-19.json`
- five browser screenshots under `what-next/referrals/screenshots/daily-truth-sign-off-command-ui-2026-07-19/`.

## Files Updated

- `app/[locale]/(dashboard)/dashboard/manager-action-center/daily-close/page.tsx`
- `app/[locale]/(dashboard)/dashboard/manager-action-center/daily-close/__tests__/page.test.tsx`
- `components/manager-action-center/BranchDailyCloseWorkspace.tsx`
- `components/manager-action-center/__tests__/BranchDailyCloseWorkspace.test.tsx`
- `services/end-of-day-close/branch-daily-close-sign-off.service.ts`
- `services/end-of-day-close/__tests__/branch-daily-close-sign-off.service.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- module and role-cockpit generated evidence.

## Current Decision

- **Slice 20 implementation:** complete.
- **Slice 20 certification:** complete.
- **Phase 2:** active pending one separate durable third-command criterion.
- **Next skill:** `stoquify-daily-truth-command-center` via `/stoquify-daily-truth`.
- **Next slice:** Phase 2 / Slice 21 Durable Action Center Resolution Foundation Audit.
- **Phase 3:** do not start yet.
