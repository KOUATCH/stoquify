# Reconciliation loading and cache isolation — v120

## Findings

The local development route had repeatedly taken tens of seconds to become usable. The first instrumented profile separated direct service work from browser navigation and authentication. In the owned 22-run workspace, direct durable-dashboard reads took 417/79/70 ms and the payment workbench took 26/16/16 ms. The durable path issued 45 recorded model operations, including its retained alert trigger; the workbench issued three. These timings exclude HTTP guards, layout work, development compilation, browser loading and raw-query instrumentation. They are not production budgets or certification.

Browser samples reached durable readiness in 10503/18487/11325 ms (EN/EN/FR). Their traces show repeated permission lookups and variable authentication time: one session lookup took about 5.4 seconds and its following permission lookup about 3.3 seconds. Development scripts also took time to load. This evidence does not establish that the alert scan or PostgreSQL is the dominant cause. The previously held removal of the alert trigger remains unapplied. A replacement schedule has not been deployed or approved.

While tracing the two queries on this page, a confirmed data-isolation defect was found: the payment-workbench cache key contained date/location filters but no tenant or user. Six new tests reproduced fetching before permission identity, reuse after tenant/user changes, acceptance of mismatched responses and display of cached data after read access was revoked. This was prioritized over speculative performance changes.

## Correction

The protected workbench action now returns its server-derived organization and actor alongside domain data. The client cache includes both identifiers and accepts a response only when its scope and domain organization match the current query. It starts and manually refreshes only with ready reconciliation-read authority. Failed reads are not retried automatically or converted to successful empty data.

A same-user, same-tenant view that was already authorized remains visibly refreshing during its permission refresh, avoiding repeated unmount/remount cycles when child components subscribe to permissions. A denial, failure, sign-out or changed scope hides that cache. Denied data cannot reappear merely because another permission refresh begins. This is display continuity, not a permission to submit a business operation; server authorization remains authoritative.

The route uses localized shared error presentation. When authority cannot be verified, Retry reloads the page to establish current session/permission state rather than repeatedly calling a disabled query with stale authority.

## User and operator guidance

- Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation` normally. No new approval record, account subscription or form input is required.
- A refreshing view describes previously checked information. Wait for current checks before acting; sign-off, preparation and other commands still enforce their own permissions.
- If access cannot be verified, use Retry. The page reloads current authority. If the role was legitimately removed, ask the workspace administrator to review your actual role; do not borrow another user's approval reference.
- For a scope mismatch or failed query, the page must show an error, not another workspace's information or a successful zero-row statement.
- Platform operators should retain sanitized request timings, source/build binding, environment and workload context when diagnosing latency. This profile contains no request bodies, cookies, passwords or authorization headers.

## Review responsibilities

| Responsibility | Finding / boundary |
| --- | --- |
| Architecture/backend/API | Existing protected action and service retained; response gains server scope. No new endpoint, ledger or background workflow. |
| Database/integrity | No schema/migration or business-state change. Direct service timings measured on owned data. Existing alert observations remain enabled. |
| IAM/privacy/security | Reproduced cross-scope cache reuse corrected; response identity checked and denied cache hidden. Browser cache is never authority. |
| Finance/audit | No financial posting, signature or approval introduced. Query errors do not become successful zero-row results. |
| Frontend/UX/EN/FR/accessibility | Existing loading/freshness/error patterns reused; localized error recovery added. No visual redesign. Native assistive-technology assurance remains open. |
| Quality/release/SRE | Before/after cache tests and actual local browser recovery are recorded separately from performance observations. Shared authentication and development loading still require deeper profiling. |
| SaaS packaging | Existing module enforcement and role management unchanged. |
| Payments/providers/ledger/close | No provider evidence or ledger rules changed. A local timing profile is not provider or accounting certification. |
| Statutory/country, POS/offline, inventory, purchasing/AP, HRIS/payroll | Not applicable to this patch: these domain behaviors are unchanged; their platform-wide review remains required. |
| Analytics/AI/events | No analytics formula, agent decision or event semantics changed. Existing alert trigger retained under the prior approval-review decision. |
| Rollout/support | Deploy action and hook together through the normal release process so returned scope is available. Old response shapes are rejected rather than silently trusted. No deployment performed here. |

## Recovery and remaining work

No migration, reset, live customer activation, external delivery or X1 approval. Preserve pending business requests and evidence; this change governs data loading. Do not roll back to an unscoped cache key as a latency workaround.

Continue instrumenting authentication/layout/action timings and the repeated permission-request chain, using a controlled workload before claiming improvement. Also review the mobile native-select wording recorded in v119 and continue the complete workflow inventory. The full assignment remains active.

Final source and verification receipts are appended after completion of the active checks.

## Verification progress

The six before-fix cache tests failed as intended (receipt47540a), demonstrating the actual unscoped React Query behavior. After correction, the first48 tests passed (e4c0d5), followed by15 current hook/permission tests (4a8e0c) and40 final workbench regression tests (258f20). Accounting for overlap,57 distinct tests across five suites passed: eight new workbench-cache tests, four durable-dashboard scope tests, three permission-snapshot tests, two protected-action tests and40 workbench component tests. Final typecheck08ded9 and five-file lint0803eb passed.

The first after-fix browser run retained an unsuccessful result in `lanes/environment/reconciliation-profile-v120-db60efae-0037-4467-a92b-fb9c46ac69f1.json`. It reached the view, recorded a mobile screenshot, verified that injected403 permission failure removed it, then exceeded its60-second post-click recovery wait. Its trace shows a real reload followed by successful session, permission and action responses near the deadline. The probe was corrected to await the reload's load event before checking readiness. This does not establish a product performance improvement.

That attempt overlapped test/typecheck jobs and is not a controlled performance comparison. Read-only process diagnostics0645ad identified two task-started typechecks each using roughly2.2GB working set; earlier process samples5c3e12 also showed large Node processes. Full system-memory querying was partly unavailable. A guarded attempt to stop only the obsolete task-started typecheck did nothing because it had already completed; final handles5719a9,258f20 and08ded9 were terminal. No application process was stopped. Browser verification was then restarted only after its previous handle9d0cf1 was terminal and all checks had finished.


## Final source and runtime evidence

evidence/source-baseline-v120.json, 2026-09-13T11:51:38.362Z, branch codex/migration-control-plane-release-2026-08-29, commit a05a41ef66cd5d98fd69ae3df18225795f912232; existing dirty changes preserved. Before profile lanes/environment/reconciliation-profile-v120-0e286769-7b85-405a-9e85-6c876af2590c.json, receipt3f1cb0; failed after attempt lanes/environment/reconciliation-profile-v120-db60efae-0037-4467-a92b-fb9c46ac69f1.json, terminal9d0cf1; successful after lanes/environment/reconciliation-profile-v120-54990ba0-e5b6-4e85-9f57-e71a74f318f8.json, receipta7bf02. Both EN/FR permission failures hid the cache and reload recovered; no page errors, two mobile screenshots, French view inspected. Source hashes match the respective retained baselines. After readiness7597/10978/17744ms remains variable.

Exact test invocation uses the bundled Node runtime with node_modules/jest/bin/jest.js --runInBand --runTestsByPath. Before: hooks/payments/__tests__/workbench-scope.test.tsx, six failures47540a. Final current hook command: that file plus hooks/payments/__tests__/suspense-dashboard-scope.test.tsx and hooks/payments/__tests__/permission-scope.test.tsx,15 passed4a8e0c. Protected action actions/payments/__tests__/reconciliation-workbench.actions.test.ts passed as part of e4c0d5 (two tests; hook/root overlap excluded from total). Final components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx40 passed258f20. Full node_modules/typescript/bin/tsc --noEmit --pretty false passed08ded9; node_modules/eslint/bin/eslint.js on changed hook/action/root component and two changed tests passed0803eb.

Runtime command: bundled Node lanes/environment/profile-reconciliation-v120.cjs for initial measurement, then --after for changed browser behavior. Baseline service calls were not repeated in after mode. All v120 verification handles are terminal. Source capture and publisher are one-use checkpoints. Selected skill009-aqstoqflow-payment-reconciliation-moat; next recommended numbered skill010-aqstoqflow-inventory-valuation-kernel, without reducing the full platform objective. No global blocker or completion claim.
