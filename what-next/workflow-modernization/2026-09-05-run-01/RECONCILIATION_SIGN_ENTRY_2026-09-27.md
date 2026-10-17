# PR-10 — sign-review entry and repeated permission queries

Source HEAD `62a56036a5ac9b37236a20c9b148052199069479`, branch `codex/migration-control-plane-release-2026-08-29`, with preserved shared changes. The preceding authentication/failure-recovery milestone made verified progress. PR-10 remains the primary workflow.

## Reproduction and correction

The workbench loads its data before mounting the durable-evidence panel. That panel, its manual-match lane and suspense queue independently subscribed to the same permission query. Because the established permission hook deliberately has zero stale time, mounting these consumers after data arrives starts additional fresh permission requests. The hook temporarily clears available permissions during a refresh; this delays sign-review readiness.

[The source-stable baseline](lanes/environment/sign-entry-profile-0ffb9b60-f931-48a6-b8d4-22f6df7b9933.json) records three completed permission requests before a usable review in every one of six entries. EN warm reloads took 15,750ms and 16,731ms; FR warm reloads took 26,927ms and 25,877ms. Initial entries were 108,433ms EN and 32,663ms FR. These are development-server observations, not production budgets or certification.

The workbench now subscribes to permissions before its data loads and passes that live result to the durable-evidence, manual-match and suspense panels. All their actor, organization, ready-state and operation-permission checks remain in place. The two data hooks retain their existing queries; simultaneous subscriptions share the query already in flight. Global zero-stale-time policy, visibility refresh, explicit refresh, server action checks and transaction guards are unchanged. No new cache or static permission copy was introduced.

Only `PaymentReconciliationWorkbench.tsx`, `PaymentSuspenseQueue.tsx` and the queue's test wrapper changed. The suspense component's sole application caller supplies the live result; the test wrapper supplies the existing mocked live result so its denial, draft and recovery tests still exercise changing authority. [Before/after source hashes](evidence/sign-entry-source-change.json) record this bounded change.

## Measurement and verification method

The inspected `supplier-ack-local.cjs` wrapper runs only against owned loopback database `stoquify_local_registration_20260906_01`, with external-network fencing and no migrations or seeds. `profile-sign-entry.cjs` creates comparable synthetic runs and restricted signers, then records an initial entry and two warm reloads per language. It measures document/navigation timing, completed and aborted requests, permission-request count, and usable-review time. It stores no credentials, action bodies or cookies.

The browser may report a server-action stream as `net::ERR_ABORTED` even after its data has rendered. Those transport observations are retained and are not relabelled as successful requests or inferred to mean a failed business query. No server/SQL timing or universal speedup follows from a browser trace alone.

The after-change journey additionally checks persisted sign-permission withdrawal/restoration, controlled permission-lookup failure hiding evidence, reload recovery, fresh authentication and one explicit independent signature without a journal. The visibility transition used to request a fresh permission read is explicitly emulated, not native tab-switch evidence.

## Guidance and review scope

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`. Existing review, identity confirmation, signing and retained-request recovery procedures are unchanged. No migration or operator input is required for this frontend correction. Existing rollout controls apply; preserve pending requests and financial records during rollback.

Architecture/frontend/performance: remove delayed duplicate subscriptions inside this workbench. Security/privacy: retain live actor/tenant scope, failed-lookup withdrawal and server authority. Finance/data/audit: no business record, amount, event or certificate rule changed. Product/UX/localization: same screens and EN/FR content with fewer loading dependencies. QA/SRE: scoped regressions, comparative request counts and bounded developer-server measurements. Statutory/country rules, payroll, inventory/POS/offline, billing and AI behavior are not applicable because none of their policies or records change. No professional or release certification is claimed.

Full PR-10 closure still requires reconciliation of the lifecycle evidence and remaining race/source bindings. Live worker scheduling and general exhausted-message repair/requeue remain separate operational workflow boundaries.

## Completed verification

[After-change EN/FR browser receipt](lanes/environment/sign-entry-profile-2d6a4d8a-c992-4b2b-9b86-79079e20e912.json) passed with stable source hashes. Every initial and warm entry completed exactly one permission request before usable review, compared with three in all six baseline entries.

| Locale | Before warm entries | After warm entries | After initial entry |
|---|---|---|---|
| EN | 15,750 / 16,731ms | 9,352 / 7,279ms | 15,161ms |
| FR | 26,927 / 25,877ms | 6,918 / 10,751ms | 9,181ms |

This removes two delayed permission refreshes per entry. The varying development timings support a local observation, not a production speed guarantee. Remaining session, data and review requests are retained in the raw traces; optimizing unrelated services is not required by this correction.

Both languages verified actual persisted sign-permission withdrawal/restoration, failed permission lookup withdrawing evidence and showing the localized error, reload recovery, focused password confirmation, explicit keyboard Retry, one signature audit/event and zero journals. The 320px ready panels have no document horizontal overflow; the French screenshot was also visually inspected. Existing wider-layout, contrast and authentication-error evidence remains linked in the prior milestone because this patch does not change those components or styles.

[Final focused checks](evidence/sign-entry-checks-45b48b8f-7057-4adb-9028-0ce9e7acdf3f.json): 84 tests across four suites, changed-file lint and full TypeScript passed; sourceStable=true. The earlier [failed attempt](evidence/sign-entry-checks-3cd163c1-3574-49f2-a9a0-b03dcb83a0e9.json) is retained: a queue unit test loaded an unmocked server-only closure action. Adding that missing boundary mock allowed the existing queue tests to run; queue behavior was not mocked away.

[Final binding](evidence/sign-entry-current-bindings.json) records 18 source files and exact receipts. The earlier patch-stage receipt predates that test mock and remains historical. [Dictionary isolation proof](evidence/sign-entry-independent-catalog-edit.json) confirms independent module-catalogue edits leave every other dictionary byte unchanged; those edits were preserved. No schema, migration, business service or global authentication policy changed.
