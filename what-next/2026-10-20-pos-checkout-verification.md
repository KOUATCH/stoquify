# POS checkout verification — 20 October 2026

Local target: `localhost:5432/stoquify_replay_next_20260830`.
Source HEAD: `6ee84a90c760d2864f6aef672d8b393ac2b65971`, with pre-existing unrelated working-tree changes.

## Current financial evidence

Read-only PostgreSQL verification at `2026-10-20T13:54:07.528Z`, repeated successfully after sign-in at `2026-10-20T14:41:08.610Z`, passed for order `POS-TERM-CERT-001-20261019-RVAZ3`:

- Sale `COMPLETED`, payment status `PAID`, total 67,644.56 XAF.
- Exactly one payment: `PAY-20261019-WNI6XWK`, cash, 67,644.56 XAF.
- Cash tendered 70,000 XAF; change 2,355.44 XAF.
- Exactly one completed commit, retaining original client commit ID `pos:4f81da97-37f5-4b01-9a49-306400f2cf14`.
- Exactly one drawer SALE entry and one shift transaction.
- Drawer balance increased once from 145,200 to 212,844.56 XAF.
- Payment was recorded on 19 October at 15:49:14.518 UTC; audit records show checkout recovery settled as RECORDED.

No payment was submitted during this verification because the original sale was already complete.

## Verification classes and limitation

- Command contract: `npm run agent:workflow:check` passed.
- Real database read-only assertions: `node .codex-tmp/pos-payment-verify-20261020.cjs` passed. The initial diagnostic assertion expected the wrong payment enum (`COMPLETED`); corrected the diagnostic to the application's `PAID` value and reran successfully.
- Evidence JSON: `.codex-tmp/pos-payment-verify-20261020.json`.
- Browser: initial redirect to sign-in was resolved by the user. A fresh Edge screenshot then showed authenticated Amina Ngono (SUPER ADMIN) at `http://localhost:3000/en/dashboard/pos`, EN locale, 1828×880 viewport, with “Checking the current checkout workspace.” Receipt verification remains incomplete: repeated accessibility/DOM calls timed out, as did a separate attempt to navigate to sales history. This does not establish whether the app or the browser control connection caused the stall. No further sale/payment was submitted.
- Screenshot: initial sign-in evidence is `.codex-tmp/pos-login-20261020.jpg`. The signed-in loading screenshot was displayed in tool output, but a subsequent attempt to save it timed out; no saved receipt screenshot exists.
- No fresh mocked unit test or real checkout/replay mutation was run. The prior isolated PostgreSQL replay test remains historical evidence documented in the 19 October repair report.
- No application source or database changes were made. Only verification artifacts were added; no rollback is needed for business data.

## Workspace repair and final verification

The subsequent repair restored the POS workspace. The local server logged rejected server-action IDs from an older/newer deployment, and the browser logged a failed development chunk load. Cold compilation took 100.3 seconds. Restarted only the identified port-3000 development server with the existing isolated-output launcher, then refreshed stale browser assets without clearing storage or replaying checkout.

The POS read hook also had no response deadline. `hooks/posHooks/usePOSReadQuery.ts` now bounds each data read to 30 seconds, routing a stalled read to the existing failure/retry state. This does not cancel the underlying server action, automatically retry it, or change payment/commit logic. A late response cannot replace the successful explicit retry. Permission/session fetches retain their existing behavior.

Owned source changes:

- `hooks/posHooks/usePOSReadQuery.ts`
- `hooks/posHooks/__tests__/pos-read-scope.test.tsx`

Verification:

- Mocked hook tests: `node node_modules/jest/bin/jest.js --config .codex-tmp/pos-workspace-jest.config.cjs --runInBand --no-cache` — 1 suite, 6 tests passed. Includes stalled-read timeout, explicit retry, late response isolation, and existing actor/tenant/permission checks.
- `git diff --check` on the two changed source files passed.
- Rendered browser: authenticated EN POS at `localhost:3000/en/dashboard/pos`, Amina Ngono / SUPER ADMIN, viewport 1828×880. Loading/error state recovered to the full workstation, catalog and empty cart. Original certification terminal and shift restored; session shows 1 transaction, sales FCFA 67,645 and drawer FCFA 212,845 (display rounding).
- Saved screenshot: `.codex-tmp/pos-workspace-ready-20261020.jpg`.
- Final read-only database check at `2026-10-20T15:02:05.065Z` passed: original sale COMPLETED/PAID, exactly 1 payment of 67,644.56 XAF, 1 commit, 1 drawer SALE and 1 shift transaction. IDs and balances match the earlier checks.
- No new sale or payment was submitted. No new end-to-end charge/replay was performed on this database. Individual receipt-detail verification was not completed; the restored shift display and independently verified sale/payment records are the current evidence.
- Server output: `.codex-tmp/pos-workspace-dev-20261020.stdout.log` and `.stderr.log`; fresh build directory `.next-dev-session-kAPh3Y`. Server left running for local use.

Rollback of the timeout change is limited to the two owned source-file hunks above. No business-data rollback is required.
