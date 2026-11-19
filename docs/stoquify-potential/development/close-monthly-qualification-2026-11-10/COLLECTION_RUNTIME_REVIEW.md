# Authenticated collection qualification runner review

Prepared for root review on 2026-11-10. **Not executed.** The three entry points pass `node --check`; this proves JavaScript syntax only. No candidate snapshot, TLS files, application, database, browser, credentials or financial writes have been created by this preparation task.

The monthly PostgreSQL receipt currently reports eight cases passed and its owned cluster stopped (`pg-attempt-149fa2421b`). Execution still requires root GO after the final product freeze and compiler completion. The runtime refuses a changed qualified financial closure or a changed prepared snapshot. Current UI controls are bound when preparation captures the frozen source; the browser separately records the inspected root files.

## Files and order

1. `prepare-collection-runtime.cjs prepare` checks the successful monthly receipt, private fixture digest, private schema-122 client, source closure and dependency lock. It creates a fresh private source snapshot, a junction to the previously qualified dependency copy, one combined network/private-Prisma bootstrap, and fresh loopback-only TLS files. It creates `COLLECTION_RUNTIME_TARGET.json` once and refuses an existing target. It starts no application or database.
2. `authenticated-collection-runtime.cjs run` owns the stopped dedicated local PostgreSQL cluster, verifies exact database/user/host/port/data-directory and 122 migration checksums, then starts its candidate Next development process and own TLS proxy at HTTP `127.0.0.1:43881` and HTTPS `127.0.0.1:43882`. Only one `NODE_OPTIONS --require` bootstrap is used. The root project's application, `.env` files, generated client and dependency installation are untouched.
3. `authenticated-app/browser-journey.cjs <private-control-path>` starts an owned headless Edge instance and authenticates through the actual password form. It does not directly access PostgreSQL, create sessions, call financial services, or mutate roles. It uses the private controller handshake for the reviewed operations below. The controller waits at most 20 minutes and also accepts `stop` on stdin.

These are local development checks with reused dependencies and a private Prisma resolution override. They do not produce or qualify a production artifact.

## Exact mutations and assertions

The controller first requires the fixture's collector to be active, verified, in the separate UI organization, and assigned exactly one native fixture role containing dashboard read, receivables read and collect without `*`. It creates a real Argon2 password credential only when that exact collector has no credential. There is no automatic retry after credential initialization: a repeat needs a separately reviewed fresh fixture/target policy. It creates a private synthetic support file; UI selection saves its fingerprint only, with no upload or original-document retention.

The browser opens the actual history route with `customerId` and `selected` document query parameters. It does not supply a historical `dateTo`. The opening document therefore supports a current collection without fabricating a prior-month sale or clock.

The controller accepts only these ordered handshake operations, bound to the exact newly signed-in collector session:

| Operation | Controlled effect or assertion |
| --- | --- |
| `stale-assurance` | Ages only that actual session's password assurance timestamp; real UI password verification follows. |
| `verify-no-collection-before-manual-retry` | Read-only comparison proves identity verification did not execute the collection. |
| `verify-one-collection` | Read-only proof of exactly one new settlement and posted journal, full allocation to the selected opening document, balance and receivable reduced by 100, retained support fingerprint, canonical native account/event/transaction/amount/currency metadata, native pointer to the same original batch, balanced journal with 100 net debit to its captured provider GL, one accounting source link and matching APPLIED event. |
| `revoke-collect-permission` | Removes only `finance.receivables.collect` from the collector's exact role; receivables read remains. A stale manual draft must receive a server denial, clear private widget data, then a successful fresh read must show read-only history without provider previews or Record controls. |
| `restore-collect-permission` | Restores the role's exact original array, then a fresh read enables a new manual denial draft. |
| `revoke-current-session` | Deletes only the actual runtime session. The subsequent command and read must deny and hide private widget state. |

Only the first linked collection performs a financial action. Both later denial drafts are manual and use distinct private synthetic text; they do not require another unclaimed provider receipt. The original provider observations remain synthetic external input facts. The runtime does not assert live provider authenticity or upstream processing.

The controller compares the primary October organization's financial fingerprint including closed periods, journal lines, source links, native transactions, close runs and retained canonical pack bytes before/after. It also verifies the separately retained private October pack file digest/size remains unchanged. After the one UI collection, all later financial fingerprints in the auxiliary organization must stay unchanged. Role restoration is attempted in `finally` even after a failed browser check.

## Privacy, rendering and cleanup

Credentials, cookies, TLS private key, support contents, browser profile/TEMP, raw application logs and failure diagnostics stay under owned `.codex-tmp` directories. Public evidence contains safe operation statuses, source digests, coarse network category/status counts and masked screenshots. No control-file hash, HAR, trace, storageState, request/response body or raw browser error stack is published. Browser traffic is restricted to the exact HTTPS origin and its exact HMR WebSocket. Actual local EN desktop/mobile screenshots are planned; broad accessibility, French rendering and hosted delivery are not claimed by this runner.

The browser closes its own context/process and reports any remaining owned profile directory. The controller destroys its proxy sockets, verifies the candidate Node process PID/parent/executable/command line before stopping its process tree, disconnects its private Prisma client, checks the exact owned PostgreSQL postmaster ID before stopping that cluster, and confirms both new application ports are free. Failed attempts retain their own evidence and never overwrite older attempts.

## Lock-order qualification limit

See `POS_PROVIDER_LOCK_ORDER_REVIEW.md`. Its initial trace found a tracked-stock POS source-before-native cycle. Root subsequently approved the bounded correction recorded in `LOCK_ORDER_IMPLEMENTATION.json`: both paths acquire native receipts before source publication and AR recognizes raw concurrency SQLSTATEs. The correction has mocked unit/lint evidence; source capture and authenticated execution must await the new tracked-stock PostgreSQL packet and root GO. The prior non-stock packet remains historical evidence.
