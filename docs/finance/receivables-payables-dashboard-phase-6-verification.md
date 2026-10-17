# AR/AP dashboard phase 6 verification

Date: 2026-10-12. Continuation of the [phases 4–5 implementation](receivables-payables-dashboard-phases-4-5.md), against the [recovered original plan](receivables-payables-dashboard-original-plan.md). **Acceptance remains incomplete.** No rollout or financial operation is included.

## Navigation corrections

Source inspection identified stale local state after a saved activity period changes without remounting the dashboard. New mocked component regressions reproduced these failures before the fixes:

- AR initialized its default month from the initially selected URL period. Removing that period kept the old dates instead of returning to the current organization-local month.
- AP kept edited date inputs from an earlier period even after the applied period and underlying read scope changed.

The dashboard also retained a local applied AR period that could override a restored URL. The URL now owns the applied AR period. Drafts are associated with the actor, organization and applied period; changing invoice filters retains an unfinished edit, while navigating between periods discards it. Returning again to a prior period does not resurrect an old draft. AR defaults are calculated independently from the organization timezone and checked timestamp. AP controlled submissions update URL state without replacing the current-month fallback; its draft resets when the applied period changes.

Owned source in this continuation: `components/finance/OpenItemsDashboard.tsx`, `ReceivablesCollectionsPanel.tsx`, `PayablesPaymentActivity.tsx`; regression additions in their existing component suites. Existing financial services, authorization, payment controls and unrelated working-tree changes were preserved.

## Verification evidence

Commands were reviewed against current definitions, `docs/ecc/command-registry.json` and `docs/ecc/test-lanes.md` before execution. The scoped Jest configuration uses direct SWC and mocked action/persistence boundaries, without application bootstrap or environment loading. Source, mocked, database and browser results are separate evidence classes.

- Workflow contract: passed at continuation start and finish; 198 package scripts remain outside the reviewed manifest.
- Initial regression run: two failures reproduced stale dates (8 other tests passed).
- First corrected run: three component suites / 19 tests passed. A further regression covers clearing a controlled AP period after applying it.
- Final mocked suite: `node node_modules/jest/bin/jest.js --config jest.open-items-dashboard.config.cjs --runInBand --no-cache` — **21 suites / 163 tests passed** (65.416 seconds).
- Scoped ESLint: passed for the three edited source components and their three component-test files, without autofix.
- Scoped TypeScript: `node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.open-items-dashboard.json` — **passed (exit 0)**, including the dashboard and imported history routes/workbenches.
- Whitespace: direct trailing-whitespace inspection passed for all seven owned files, including the untracked source/tests. A whole-tree `git diff --check` found unrelated trailing whitespace in `components/purchase-orders/PurchaseReceivingWorkbench.tsx:152`; it was left unchanged. Git also reported line-ending normalization warnings.
- Real PostgreSQL: not rerun for these presentation-state changes. The preceding slice's 10 read-only checks remain prior evidence, not a new result or concurrency certification.
- Rendered/browser: no new successful page check in this continuation. Existing browser inventory still showed a localhost connection-error page. No locale, responsive, keyboard, focus, permission-role or screenshot claim is added.

## Local browser startup blocker

Port inspection found no listener on 3000. The reviewed local startup command was `npm run dev -- --hostname localhost`; its `predev` invokes the local Prisma-client check/generator. It does not migrate or seed the database. Startup stopped during client generation because Windows rejected replacement of the Prisma engine DLL with `EPERM`; the Next server did not start. A subsequent read-only comparison found that the generated schema differs from the project schema, while the installed/generated engine hashes and Prisma versions (6.19.3) match.

The exact lock owner was not established. No unrelated process was stopped, no generated-client guard was bypassed, and no engine file was forcibly replaced. The schema/client mismatch must be resolved before reliable rendered verification. This is a local startup blocker, not evidence that the dashboard itself failed to render.

## Remaining acceptance gates

| Gate | Status / next evidence |
|---|---|
| EN/FR desktop/mobile and keyboard/focus journeys | Pending a working local server; verify period edits, saved URL restoration, exact invoice history and return navigation. |
| Rendered AP admitted state | Existing organization has purchasing disabled; requires an existing appropriately enabled organization/account. No activation or permission grant was performed. |
| Least-privilege and session-change journeys | Mocked coverage exists; actual fixture-role and in-flight revocation browser evidence remains pending. |
| Controlled downloads | Requires legitimate fresh authentication and export audit evidence on an approved target. No export/audit write was executed in this continuation. |
| Real concurrent reads, rollback and larger populations | Requires reviewed fixtures and an explicitly disposable database target. Permission to use the current database supports existing read-only evidence; it does not make that database disposable. |
| Performance and rollout | Realistic-volume query plans/latency and independent AR/AP release decisions remain pending. No production build, migration, seed or deployment ran. |
| Advanced phase 5 features | Historical trends, general collection-case implementation, funding coverage and contractual discount opportunities retain their documented prerequisites and deferrals. |

Rollback for this continuation is limited to the period-state corrections and their tests. No schema or financial-record rollback is needed. Do not revert earlier security corrections or unrelated changes.

Source baseline: `6f7f6741` with pre-existing extensive working-tree changes; no staging or commit. Source inspection and mocked tests establish the navigation corrections, not a completed phase 6 release gate.

## Server discovery follow-up (2026-10-12)

The next verification attempt clarified the startup diagnosis. The sandboxed process/port inventory omitted an existing host process. An approved read-only host inspection identified Node PID 24280 as a Next.js server loading this project's Prisma engine and listening on `127.0.0.1:3000`. Therefore the earlier absence of a listener was an inventory limitation, not proof that no development server existed. No process was stopped. The attempted second `npm run dev -- --hostname localhost` exited during Prisma generation with the same engine-replacement `EPERM`; it did not start a competing server.

The first token mismatch between project/generated schemas is a reordering of model-level `@@unique` and `@@index` declarations. This explains that particular textual difference; it does not establish equivalence of the entire generated client. No guard, schema, generator, or DLL was modified as a workaround.

Browser tab 6, using the existing IAB browser, opened `http://127.0.0.1:3000/en/dashboard/finance/receivables` and ultimately reached `http://localhost:3000/en/login?callbackUrl=%2Fen%2Fdashboard%2Ffinance%2Freceivables`. The sign-in form rendered and hydrated with editable fields. The existing browser session is signed out. The tab was shown and retained for user sign-in; no credentials were retrieved, no login was fabricated, and no permission/module configuration was changed. Dashboard acceptance is now waiting on an authenticated browser session; no new dashboard rendering or responsive checks are claimed from the login page alone.

The workflow validator passed again (198 scripts outside the manifest). No application source or tests changed in this follow-up, so the previous 163-test/type/lint results were not rerun or represented as new results. Remaining AP-role, controlled-export, disposable-fixture, and performance gates still apply.

## Authenticated browser follow-up (2026-10-12)

The user completed sign-in. The rendered session was **Accountant / Nadia Essomba / Wilkinson - Feeney 001**, distinct from the earlier Super Admin observations. Browser: existing Codex IAB, tab 6, desktop viewport explicitly set to **1440 × 1000 CSS pixels** during the checks and reset afterward. Initial accessibility-wrapper timeouts were temporarily resolved using the documented browser tab/DOM interface.

Confirmed rendered observations:

- English receivables loaded with three current overdue invoices, XAF 197,201.25 outstanding/overdue, 100.00% overdue share, 38.66% largest-counterparty share, and 100.00% top-five share. Current-month receipts showed XAF 964,881.56 and were explicitly separate from the open-invoice balance.
- Native keyboard edits applied **2026-09-01 through 2026-09-12**. Both date fields, the URL's `activityStart`/`activityEnd`, and the receipt report reflected this period. Receipt/net figures became XAF 1,057,687.88; current outstanding remained XAF 197,201.25. The first automated date `fill` attempts changed visible input values without applying the intended period; native keyboard input provided the successful interaction evidence. No application fix was inferred from that automation discrepancy.
- Selecting **Overdue (3)** eventually set `queue=overdue` and `aria-pressed=true`, retaining the September receipt period in the URL and rendered report.
- Keyboard Enter opened the exact `RDS001-AR-004` drawer. It displayed Mr. Archie Grant 004, partial settlement, original XAF 73,635.00, allocated XAF 18,408.75, remaining XAF 55,226.25, due 2026-06-03, and unavailable credit evidence. The narrower Accountant drawer exposed Open history without the statement-dispute/promise link observed under the earlier Super Admin session.
- The history link carried `customerId=rds_org_001_customer_004`, `selected=rds_org_001_customer_receivable_document_004`, and a return URL retaining the overdue queue and September activity period.

Incomplete or failed checks:

- History link activation did not complete within the navigation deadline. A direct navigation to that exact observed href also timed out. Thus this run confirms link construction, **not** rendered history selection or return navigation.
- Escape/focus return was attempted, but immediate DOM observations still showed the dialog during transition; no completed focus-return assertion is claimed.
- Navigation to the already-observed French switch URL in a fresh tab also timed out, followed by browser focus-emulation timeouts. Screenshot capture failed. No screenshot artifact, French/mobile acceptance, or broader accessibility claim is made.
- Read-only host inspection confirmed the original Next server still listened on 127.0.0.1:3000 and was running during these failures. It was not restarted or killed. The evidence does not isolate the navigation delay to application code, browser automation, or local resource contention.
- AP rendered admission, exports, session revocation and other remaining acceptance gates were not reached. No payment, reminder, statement delivery, permission change or financial-record mutation occurred.

The temporary French tab was closed, the viewport override reset, and tab 6 retained for follow-up. Only this evidence report changed in this authenticated follow-up. Previous unit/type/lint/database results remain separately dated evidence; no unnecessary application test rerun was performed for a documentation-only update.

## Environment recovery and current database checks (2026-10-13)

The resumed session had no retained IAB tab and no host listener on port 3000. The workflow validator passed (198 unclassified scripts). Current startup definitions, Prisma helper/configuration and Next configuration were inspected again.

- Normal `predev` successfully regenerated Prisma Client 6.19.3; the previous DLL replacement lock did not recur. No schema migration or seed ran.
- The npm invocation misforwarded the hostname argument as a directory. A direct invocation of the installed Next CLI followed the completed predev check, without changing or bypassing its client-generation requirements.
- Startup against the existing `.next-dev` output failed on a missing `prerender-manifest.json`. That output was preserved. The configured `NEXT_DIST_DIR` override was set to the new git-ignored `.next-ar-ap-verification-20261013` directory.
- The sandbox denied the localhost port binding (`EACCES` on `::1:3000`). The reviewed command was then approved for execution outside that sandbox: `node node_modules/next/dist/bin/next dev -p 3000 --hostname localhost`, with the isolated output override. **Next reported Ready in 7.4 seconds**, at `http://localhost:3000`. The server is left running for the browser handoff. No unrelated process was stopped.
- Next added its temporary output's types path to `tsconfig.json`; only that automatically added entry was removed, preserving the existing project configuration.

Fresh real PostgreSQL evidence, with the existing runner's connection-level read-only settings enforced:

1. `node scripts/run-open-items-readonly-verification.cjs --inspect 'Wilkinson - Feeney 001'` — passed. Source counts: 12 AR documents and 12 AP invoices. Purchasing remains disabled; the search returned no active purchasing-configuration candidates. This is configuration discovery, not role/entitlement admission proof.
2. `node scripts/run-open-items-readonly-verification.cjs --verify 'Wilkinson - Feeney 001'` — **1 suite / 10 tests passed**, 5.932 seconds. No fixture creation, audit writes, migrations, seeds, financial updates or cleanup. Concurrent-writer and rollback fixtures remain unexecuted.

The current browser blocker differs from the prior navigation delay: IAB has no attached webview. Creating its tab timed out during attachment; the application-level open request returned `queued` for this task. The user was asked to open this task in Codex, or explicitly choose Edge. No switch to another browser or its signed-in account was made without that choice. Until a browser attaches, server readiness and passing read-only database tests do not establish any new rendered dashboard, history, locale, mobile or export evidence.

No application source changes or unit-test reruns were needed in this recovery slice. This report, regenerated local client/build artifacts, and the running local server are the resulting changes. Phase 6 remains incomplete.

## User-selected Edge follow-up (2026-10-13)

The user identified Edge as the working signed-in browser. The existing receivables tab was claimed through the supported browser extension. Its initial DOM snapshot confirmed the English route, Wilkinson - Feeney 001, and Super Admin / Amina Ngono. The main content still displayed “Preparing command surface”; this is authenticated shell/loading-state evidence, not loaded dashboard acceptance.

Subsequent DOM inspection timed out, and screenshot capture and console-log retrieval timed out while enabling browser focus emulation. A separate temporary Edge tab's navigation to the payables route also timed out. No new metrics, history-return, French/mobile, keyboard, AP admission or export result is claimed; screenshot capture produced no artifact.

Read-only host diagnostics found Node PID 18280 listening on port 3000, using approximately 2,268 MB working memory. Available physical memory was approximately 3.6 GiB of 23.9 GiB. These observations do not isolate the delay to the server, browser extension, or machine resource contention. No process was stopped or browser profile changed. The prior server process identity should not be treated as current.

Only this report changed. No application code, financial records, permissions, module configuration or payment state was changed; no verification suite was rerun for this documentation-only follow-up. The separately dated 163 mocked tests and 10 read-only database checks remain prior evidence. Phase 6 remains incomplete pending a responsive browser automation session and the other acceptance gates above.

## Reconnected Edge acceptance checks (2026-10-13)

Scope: continued phase 6 browser verification, using the user's existing Super Admin / Amina Ngono session in Wilkinson - Feeney 001. Source baseline remains `6f7f6741` plus the existing working tree. No application source was changed, staged or committed. The reviewed workflow validator passed again; 198 package scripts remain outside the manifest. Mocked tests, TypeScript, lint and PostgreSQL checks were not rerun for this evidence-only update; their preceding results retain their original dates and scope.

### Confirmed rendered results

- **English AR, desktop:** the report loaded with three overdue invoices and XAF 197,201.25 outstanding/overdue, 100.00% overdue share, 38.66% largest-party share, and 100.00% top-five share. October 1–13 receipt activity remained separate at XAF 964,881.56. Measured viewport: 1542 × 742 CSS pixels; document client/scroll widths both 1523.
- **AR keyboard drawer:** Enter opened `RDS001-AR-004`; original XAF 73,635.00, allocated XAF 18,408.75 and remaining XAF 55,226.25 matched the dashboard evidence. Escape closed the drawer; a subsequent DOM check found zero dialogs and focus back on the exact invoice trigger. The saved desktop screenshot shows its visible focus indicator.
- **Exact AR History and return:** the link loaded customer `rds_org_001_customer_004`, selected document `rds_org_001_customer_receivable_document_004`, one matching invoice, and the corresponding automatically opened detail drawer. Customer/export-scope and uncertified-evidence notices were visible. Closing the detail and using the return link eventually restored `/en/dashboard/finance/receivables?bucket=all&queue=all&page=1&pageSize=25`. This tests the default saved scope, not a non-default receipt-period return.
- **French AP, narrow viewport:** the admitted dashboard loaded 12 invoices with unverified balances and unknown due dates. Affected XAF balances, aging and exposure showed `Indisponible`, not zero. The independent workflow panel showed 12 draft invoices, 12 matching exceptions, 12 pending bank changes and 12 draft payment requests; approved/released counts were zero. Dated recorded released-payment activity displayed 0.00 XAF with operational-evidence and incomplete-period notices. No workflow command was invoked.
- **AP exact invoice/history/return:** keyboard Enter opened `RDS001-INVOICENUMBER-001` for Mungo Beverage Distribution. Its history link carried supplier, invoice, invoice lane, selected-record and safe return parameters. The history page eventually loaded one matching invoice and automatically opened its exact detail drawer; the filtered balance remained unavailable. Closing it and using the return link restored `/fr/dashboard/finance/payables?bucket=all&queue=all&page=1&pageSize=25`, with the dashboard heading/content confirmed. No CSV download was initiated.
- **French AR, narrow viewport:** translated headings, controls, source notices, amounts and independent receipts loaded. Outstanding was 197,201.25 XAF and receipt activity 964,881.56 XAF. Selecting the zero-count due-within-seven-days queue produced the translated no-matching-invoices state and `queue=due7` URL while retaining those totals and the October receipt period.
- **Narrow layout and keyboard table scroll:** requested viewport override was 390 × 844; the browser reported **487 × 1055 CSS pixels**, so this is not an exact 390-pixel certification. Both French dashboards had equal document client/scroll widths of 468 pixels. On AR, the labelled invoice region had `tabindex=0`, client width 387 and scroll width 484. ArrowRight focused that region and moved `scrollLeft` to 40. Screenshots show wrapping French controls without page-wide horizontal overflow. Other breakpoints and a full assistive-technology review remain open.

### Findings and remaining limitations

1. **French AP status copy:** the dashboard invoice drawer rendered raw `DRAFT`; the same invoice in AP History rendered `Brouillon`. Current `OpenItemsExplorer.tsx` lacks a `DRAFT` label in its state map and falls back to the raw value. This is a confirmed localization gap, left unchanged during this verification request.
2. **AR history evidence presentation:** the exact history drawer displayed an allocated amount while its allocation section said “No allocations yet.” Its XAF currency formatting also rounded fractional values displayed to two decimals by the dashboard. These are observed cross-page presentation differences requiring source/domain review; this run does not establish missing database allocations or incorrect stored balances.
3. **AP admission is not a controlled transition proof:** an earlier English AP screenshot showed “This module is not enabled”; the later French AP route admitted this same visible organization/session. No permission or module change was made by this task. The cause was not isolated; the earlier configuration inventory cannot certify current admission. Recheck the current module/entitlement state and both locale routes before release.
4. **Intermittent automation/navigation:** several DOM, screenshot and navigation calls timed out, yet later observations confirmed completed navigation. Console diagnostics showed asynchronous browser message-channel errors, without a confirmed React render-loop error. Source inspection of the page/read hooks did not justify an application change. Final English AP desktop navigation timed out and reset the automation session. No completed English AP admitted desktop/mobile matrix, full French desktop matrix, or timing/performance pass is claimed.
5. **Still open:** additional restricted-role/session-revocation browser scenarios, controlled exports with fresh authentication/audit evidence, non-default activity-period history return, real concurrency/rollback fixtures, realistic-volume query plans/latency, domain acceptance and independent AR/AP rollout decisions. The current database was not treated as disposable. No payment, reminder, export audit, financial mutation, migration, seed or deployment ran.

Screenshots saved in the task's local artifact directory:

- `C:/Users/J COMPUTER/.codex/visualizations/2026/10/11/01a12b04-d704-7140-8a30-f8957f1b40e4/phase6-ar-en-desktop.jpg`
- `C:/Users/J COMPUTER/.codex/visualizations/2026/10/11/01a12b04-d704-7140-8a30-f8957f1b40e4/phase6-ap-fr-mobile.jpg`
- `C:/Users/J COMPUTER/.codex/visualizations/2026/10/11/01a12b04-d704-7140-8a30-f8957f1b40e4/phase6-ar-fr-mobile.jpg`
- `C:/Users/J COMPUTER/.codex/visualizations/2026/10/11/01a12b04-d704-7140-8a30-f8957f1b40e4/phase6-ar-fr-empty-queue.jpg`

The task-created verification tab was closed and the temporary viewport override reset successfully. The user's original AR tab was left open after its return journey.

Phase 6 remains **incomplete**. These results close specific browser evidence gaps, not the full release gate.

## User-confirmed loading stall and recovery (2026-10-13)

The user confirmed that normal Edge use also remained on the loading screen. This is not dismissed as an automation-only issue. Read-only inspection of `.next-dev/trace` found session and permission requests lasting approximately 34.9 and 39.5 seconds, a Receivables request lasting 100.8 seconds, and page preparation/compilation spans lasting up to 75.6 seconds. Other routes and even static assets were also delayed. Subsequent invalidation entries named concurrent changes outside this task, including purchase-order loading and payroll copy. This establishes development-server compilation delays, not a production query-performance diagnosis or a proven infinite React render loop.

The mounted `OpenItemsDashboard` previously had no recovery path while session, permission or invoice reads remained pending. This continuation adds a 30-second delayed-loading notice in English/French with a native page-reload link retaining the allowlisted invoice filters and activity period. The request is not automatically repeated, and no unverified figures are shown. A later authorized response displays normally; denied/error states still take precedence. A successful read resets the timer for a later pending read. This is recovery from a long wait, **not a fix for the shared development server's compilation latency**; it cannot take effect before the client component hydrates.

Owned edits: the delayed-loading copy/effect/branch in `components/finance/OpenItemsDashboard.tsx`, four regression cases appended to `components/finance/__tests__/OpenItemsDashboard.test.tsx`, and this report. Concurrent draft-status translations, search-state fixes and their existing tests were preserved and are not claimed as changes from this continuation. No service, auth, module, financial-data or database controls were changed.

Verification:

- Workflow validator passed; 198 unclassified package scripts.
- Regression before the fix: four new tests failed because no reload control appeared; 12 existing component tests passed.
- After the fix: direct scoped Jest command with `OpenItemsDashboard.test.tsx` and `useOpenItemsDashboard.test.tsx` passed **2 suites / 20 tests**, 18.727 seconds. This is mocked component/hook evidence, including EN/FR scoped reload, late success, timer reset and AP module denial.
- Scoped ESLint passed for both edited source/test files.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.open-items-dashboard.json` passed.
- No database test, migration, seed, financial mutation or production build was run.
- Live Edge inspection initially showed the outer dashboard fallback (“Preparing dashboard command center”), which is distinct from the mounted invoice dashboard's wait. A single page reload completed, but subsequent DOM/screenshot inspection timed out. No successful rendered assertion of the new delayed notice or recovered totals, and no new screenshot artifact, is claimed. The user tab was left open.

The underlying server/browser delay remains unresolved. Phase 6 still requires a stable rendered verification run. Rollback for this continuation is limited to the delayed-loading notice/effect and its four tests; retain all earlier and concurrent changes.

## Payables loading follow-up (2026-10-13)

The user reported Payables still loading. This continuation made no application-code, permission, module or financial-record changes. The workflow contract passed (198 unclassified package scripts). Source inspection covered the Payables route/access wrapper, dashboard layout, parent read hook, shared supplement identity, payment activity and query provider. No reproducible client render loop was established.

Local development trace evidence included a Payables request of 114.840 seconds, Receivables of 112.792 seconds, permission requests around 37 seconds and a server webpack compilation of 43.081 seconds. These overlapping delays support a shared development-runtime problem; they do not isolate a database bottleneck or certify production performance.

Rendered Edge evidence: the existing French Payables tab for the visible Super Admin organization loaded all 12 invoice rows, workflow counts and payment-period evidence. The dashboard Refresh control was exercised without returning the page to a persistent loading state. A subsequent full browser reload initially displayed the French loading fallback, then showed the report at the next observation approximately 22 seconds after reload began (an observation upper bound, not a precise completion measurement). Unverified invoice balances remained unavailable as required. No payment or approval controls were exercised.

Screenshot: `C:/Users/J COMPUTER/.codex/visualizations/2026/10/11/01a12b04-d704-7140-8a30-f8957f1b40e4/phase6-ap-reload-recovered.jpg`. The existing user tab was left on the loaded Payables page. No unit or database tests were rerun for this documentation-only continuation. This confirms recovery and one successful reload, **not a permanent latency fix**; the remaining phase 6 gates above remain open.

## Roadmap continuation after shared table alignment (2026-10-14)

Continued phase 6 against `6f7f6741` plus the existing working tree, including the table changes documented in `receivables-payables-table-alignment.md`. This continuation changes only this evidence report. Unrelated edits, the active development server and other chats' browser tabs were preserved. No staging, commit, migration, seed, financial update, reminder, payment, permission change or export audit write occurred.

### Source and workflow inspection

- Re-read the original roadmap, current workflow/command registry, test lanes and the verification runner/configuration/test definitions before execution. `npm run agent:workflow:check` passed; **196** package scripts remain unclassified. No production build ran.
- The current read-only inventory reports `purchasingConfiguredActive: false`, 12 receivable documents and 12 supplier invoices for Wilkinson - Feeney 001. **That flag alone does not establish an access denial.** The inventory collapses an absent configuration to false. Current `module-entitlement.service.ts` also accounts for explicit grants and legacy entitlement behavior. Earlier report wording that described purchasing as disabled based on that inventory was too strong; current entitlement/admission behavior needs its own evidence.

### Mocked regression verification

The following scoped command passed **5 suites / 60 tests** in 49.724 seconds:

```text
node node_modules/jest/bin/jest.js --config jest.open-items-dashboard.config.cjs --runInBand --no-cache --runTestsByPath components/finance/__tests__/OpenItemsDashboard.test.tsx hooks/finance/__tests__/useOpenItemsDashboard.test.tsx actions/finance/__tests__/open-items-dashboard.actions.test.ts actions/purchasing/__tests__/ap-history-export.actions.test.ts services/purchasing/__tests__/ap-history-export.service.test.ts
```

This covers the shared table interactions, pending/error and permission behavior, scoped action authorization, and AP export scope/fresh authentication/revocation with mocked persistence. It does not establish a real export audit write or a rendered restricted-role journey. Previous type/lint results remain separately dated; no application source changed in this continuation.

### Real PostgreSQL verification

```text
node scripts/run-open-items-readonly-verification.cjs --verify 'Wilkinson - Feeney 001'
```

Passed **1 suite / 10 tests** in 17.199 seconds with the existing runner's connection-level read-only settings enforced. The initial sandbox connection failed safely; the same read-only command then succeeded under approved elevated execution. Existing records were used without fixture creation or cleanup.

Coverage includes balance/list consistency, currency handling, unknown AP evidence, invoice ownership, queue membership, stale revisions, tenant/location boundaries, workflow visibility, receipt arithmetic, AP history scope, and transaction isolation assertions. It does not include concurrent writers, rollback fixtures, large-volume query plans or export audit writes. The current database remains a non-disposable target.

### Rendered Edge observations

- Used a separate temporary tab because the existing Payables tab belonged to another active browser session. The visible current account was **Accountant / Nadia Essomba**, Wilkinson - Feeney 001. The role label alone is not proof of least privilege or denied permissions.
- **English Payables rendered** with 12 unverified invoices, unavailable affected balances and unknown due dates. The shared queue tablist, selected tabpanel, search/filter controls, table caption/column headings and pagination were present. Pagination showed 25 rows per page, page 1 of 1 and disabled first/previous/next/last controls. This establishes the current table structure in the rendered page.
- Attempting to change rows per page timed out during browser input dispatch. Later focus-emulation and navigation operations also timed out; no completed pagination interaction, keyboard acceptance, new French/mobile result or screenshot is claimed. Browser diagnostics included an asynchronous message-channel error without a confirmed React render-loop error. These failures do not establish whether the cause is application latency, extension transport or resource contention.
- The viewport override was reset successfully and the task-created tab was closed. Other browser sessions were left intact.

### Remaining delivery gates

Phase 6 remains **incomplete**. Continue in this order:

1. Complete the post-table-change EN/FR desktop/mobile and keyboard interaction matrix in a responsive browser session, including page-size changes and empty queues. Verify non-default activity-period history return.
2. Verify actual restricted-role/revocation journeys and controlled exports with legitimate fresh authentication and audit evidence; do not infer these from mocked tests or role labels.
3. Run concurrent-writer/rollback fixtures and realistic-volume query-plan checks only against an explicitly disposable target. The existing current-database authorization covers the read-only lane above, not destructive fixtures.
4. Record domain acceptance and separate AR/AP rollout decisions after the preceding gates pass.

Phase 5's deferred historical trends, audited collection follow-up ownership, authoritative funding coverage and verified early-payment discount capabilities retain their original data/domain prerequisites. Passing these regression checks does not mark those deferred capabilities delivered.

## Timeout diagnosis during continued browser acceptance (2026-10-14)

The user requested completion of the remaining browser checks and resolution of the timeouts. The workflow contract passed again (196 unclassified scripts). Current startup/maintenance controls, dashboard hooks, route admission and page contracts were inspected. No application source or access control was changed.

Host observations distinguish two unresolved issues:

- The existing server listened on port 3000, PID 18244. Available physical memory was approximately 603 MiB of 23.9 GiB while concurrent reconciliation tests/type-checking were active; the server's working set was approximately 3.1 GiB. Current `.next-dev-session-3WZwoQ/trace` included Payables requests of 16.509 seconds, a permissions request of 12.686 seconds, and an auth-route compilation of 4.724 seconds. Memory pressure is a plausible contributor, not an isolated root cause.
- The user explicitly chose to continue alongside the other chats. Their processes and shared server were preserved. After those test processes finished, available memory rose to approximately 1.26 GiB and later Payables requests completed in 1.354 and 0.307 seconds. Browser page inspection still timed out while enabling focus emulation. Fast server requests therefore did not restore reliable browser control.

Used one task-owned Edge Payables tab. Successful DOM observations showed the authenticated Accountant shell and loading state, not a completed report. Navigation, DOM evaluation and screenshot attempts failed at different browser-control stages. Console inspection returned asynchronous message-channel errors, without a confirmed application render-loop error. Resetting this task's CUA connection and reconnecting the existing tab did not resolve the focus-emulation timeout. A proposed blank-tab control observation was refused by browser URL policy; no workaround was attempted and no diagnostic conclusion is drawn from it.

No new table interaction, locale/mobile, keyboard, history-return, restricted-role, export, screenshot or release acceptance result is claimed. No repeated unit/database suite was needed for this evidence-only continuation. The user was offered the in-app browser as an alternative that requires their sign-in; switching browsers remains pending their choice. Phase 6 remains open, and the roadmap's disposable-database and domain acceptance gates also remain unchanged.

## User-authorized in-app browser acceptance (2026-10-14)

The user approved switching to Codex's in-app browser. It already had an authenticated **Accountant / Nadia Essomba / Wilkinson - Feeney 001** session; no credentials were read or copied. This surface allowed the interaction checks below. It is a working alternative to the failing Edge control connection, not a repair or certification of that extension. Some application navigation/loading delays and short selector deadlines still occurred; later rendered observations were used to confirm completion.

### Completed rendered checks

- **AP pagination:** selected 10 rows per page, confirmed page 1 of 2, then used Enter on Next. Page 2 contained exactly invoice references 011 and 012 and retained the revision in its URL. The French last-page control also produced page 2 of 2. The zero-count overdue queue reset pagination to page 1, removed the prior revision, retained table headings and pagination, and displayed the correct empty-state message.
- **AP period and history:** applied October 5–14 through the native accessible date field. The generic browser `fill` attempt had not persisted a date change; native field input did, so no application date-input defect is claimed. The exact invoice link carried supplier, invoice, selected-record and return scope. Its initial click did not finish within the observation window; directly loading that observed href reached AP History with one matching invoice and its automatically opened drawer. The history return link restored the dashboard, 10-row page size, and visible October 5–14 date fields. This proves destination/return behavior; it does not certify the initial click latency.
- **AR search and current/activity separation:** searching `RDS001-AR-008` yielded only the expected invoice, XAF 65,733.75. Clearing restored three invoices. Outstanding remained XAF 197,201.25. Applying October 5–14 changed receipt/net activity to XAF 865,635.75, separately from the current balance.
- **AR drawer keyboard:** Enter opened invoice 004 with original XAF 73,635.00, allocated XAF 18,408.75 and remaining XAF 55,226.25. Escape closed it; a settled DOM observation confirmed zero dialogs and focus returned to its exact invoice trigger.
- **AR exact history/return:** the clicked history link eventually reached the selected customer/document, one matching item and its detail drawer. Returning restored the Receivables page and October 5–14 date inputs. The previously recorded history rounding/raw status/allocation presentation differences remain visible and unresolved; these observations do not establish incorrect persisted balances.
- **French tabs:** ArrowRight moved focus from All to Overdue without changing selection; Enter then selected Overdue. The due-in-seven-days queue showed the translated empty state while retaining shared headings/pagination and the activity period.
- **Locales and responsive structure:** both routes rendered in English and French at desktop and narrow widths. Measured AP desktop was 1043 × 652 CSS pixels; AR desktop was 1440 × 900. After compensating for the in-app browser's scaling, narrow checks measured **391 × 844**, not exactly 390 × 844. Document client/scroll widths matched (AP desktop 1032/1032; AR desktop 1429/1429; narrow 379/379). The French AR desktop bounds check found no inspected section/nav/form/region extending beyond the viewport. These are bounded layout observations, not an all-breakpoint or full accessibility certification.
- **Keyboard horizontal scrolling:** both French invoice regions were focusable. ArrowRight advanced `scrollLeft` to approximately 29 CSS pixels. AR narrow region client width was 296 against 1040 scroll width. An additional more constrained AP observation measured 282 × 611, with a 188-pixel region against 1040 scroll width; the document itself did not overflow.

### Export and access gates

- AP History disclosed invoice lane, selected supplier and no history-date limit, keeping that export scope distinct from the dashboard activity period. Preparing the export required password confirmation and did not produce a successful download in this run.
- AR History rejected export preparation with **Fresh authentication required**, surfaced in its page status and alert. It did not present an inline password form. No successful export, file integrity check or successful-export audit receipt is claimed.
- The user said they will identify an existing restricted account. No account was named yet, no role or permission was altered, and the current Accountant label is not treated as evidence of restricted access. Denial/revocation/in-flight workspace-switch checks remain pending.

Screenshots were saved under `C:/Users/J COMPUTER/.codex/visualizations/2026/10/11/01a12b04-d704-7140-8a30-f8957f1b40e4/`, with the prefix `phase6-iab-`: `ap-en-desktop.png`, `ap-fr-desktop.png`, `ap-fr-narrow.png`, `ap-fr-mobile.png`, `ap-en-mobile.png`, `ar-en-mobile.png`, `ar-en-desktop.png`, `ar-fr-desktop.png`, `ar-fr-mobile-empty.png`, and `ar-fr-mobile.png`. The French AR desktop screenshot was recaptured after the loading state cleared. Screenshots show their captured viewport/scroll position; DOM measurements above establish the corresponding layout dimensions.

Only this evidence report changed. No application source, financial record, permission, migration, seed or payment changed. No unit/database suite was rerun for this documentation/browser continuation; earlier results retain their recorded scope. The temporary viewport override was reset. Phase 6 remains incomplete pending authenticated successful exports/audit proof, the identified restricted-account journeys, unresolved history presentation review, the disposable-database concurrency/volume lane and domain rollout acceptance.

## Export handoff follow-up (2026-10-14)

After the user replied ready, the AP export dialog was closed and the scoped history was visible. This alone did not prove a completed download. The current account was confirmed through the visible account menu as Nadia Essomba, `accountant.rds-org001@stockflow.test`, Wilkinson - Feeney 001.

- Workflow contract passed again (196 unclassified scripts).
- A scoped AR export attempt still returned **Fresh authentication required**. Its download-event observer timed out; the enclosing browser call took approximately 1042 seconds despite the requested 20-second event deadline. No file, successful-download status or export-success claim is made. This is an additional browser-control timing failure, not a measured server-action duration.
- A task-local evidence reader, `inspect-export-audit-readonly.cjs` in the existing visualization artifact directory, was reviewed and executed. It forces PostgreSQL startup read-only mode, verifies both connection read-only settings, resolves the exact organization and actor, then selects at most ten AR/AP export audit records within October 14 UTC. It reads no credentials/session fields and performs no writes, fixture preparation or cleanup. The sandbox connection failed safely; the same reader succeeded under approved elevated execution.
- The configured database returned **zero** `CONTROLLED_EXPORT_ALLOWED` or `CONTROLLED_EXPORT_DENIED` records of types `APHistoryExport` / `AROpenItemsHistoryExport` for that actor/organization/date. Failed freshness checks occur before artifact audit creation, so zero rows do not prove that no export button was attempted. They also do not provide successful artifact-generation evidence.
- Source inspection confirmed that password step-up persists the session assurance fields consumed by `requireFreshAuth(300)` in both export actions. No source mismatch or justification to relax that five-minute guard was established.

The user was asked whether the AP form produced a CSV, showed an error, or had not been submitted, so the next action can address the actual outcome rather than repeat an unsupported success assumption. The restricted test account remains unidentified. Existing passing browser checks remain valid within their recorded scope; successful export/file/audit checks and remaining release gates are still pending. No application source or financial record was changed.

## Successful AP export artifact verification (2026-10-14)

The user subsequently confirmed that the CSV downloaded. At source revision `6f7f6741` with the existing unrelated dirty tree preserved, the workflow validator passed again (196 unclassified scripts). This continuation changes only this evidence report; no application code or financial records were modified.

- **Local file evidence:** two 1,694-byte UTF-8 CSV files were found in the user's Downloads directory. Their watermarks were `wm_4aae85effd6a516544b2a50b` and `wm_7574f1fc9dca70c80d84a0e3`. Their SHA-256 digests were respectively `ab653ec74f25c73d27da88870caf18e58c475577d421c1aa2d01318deb8957ef` and `770e39d5da6de044da9ad0259e9b179cd9eefd06b11ee2647f1bc8673a86981a`. An initial PowerShell hash read encountered a sharing lock; subsequent read-only Node byte reads succeeded for both files.
- **Read-only PostgreSQL evidence:** the previously reviewed, enforced read-only audit reader returned two `CONTROLLED_EXPORT_ALLOWED` AP receipts for the exact organization/account, at 14:28:56.953Z and 14:29:02.413Z. Both audit content hashes exactly matched the corresponding downloaded bytes, and both row counts were one. Audit outcome remains accurately named `artifact_generated_not_download_confirmed`; the local files and user confirmation supply the separate download evidence.
- **Scope/content inspection:** both manifests identify organization `rds_org_001`, supplier `rds_org_001_supplier_001`, invoice `rds_org_001_supplier_invoice_001`, invoice lane, Africa/Douala timezone and no history-date limit. Each contains exactly the selected invoice, XAF document amount 1,118.70, draft/unverified state, and `UNAVAILABLE` recognized movement/current remainder/verified allocations/credits. Recorded released payments are separately 0.00. The operational/non-certified scope and unavailable-not-zero explanations are retained. Dashboard activity dates were not silently applied to this history export.
- **Rendered AR result:** the customer-scoped history loaded, its selected drawer closed, and a subsequent export request returned `Fresh authentication required` in status and alert. The visible attempt was around 20:23 local, several hours after the AP artifacts, outside the existing five-minute freshness window. No successful AR export is claimed. One drawer-to-export locator call timed out; a fresh DOM observation and a direct scoped click then completed the request. This does not establish that the general browser-control timeout problem is fixed.

The AP successful-download/integrity gate is now satisfied for this single-invoice scope. AR successful export still needs legitimate fresh authentication followed promptly by the AR attempt. Existing restricted-role identification, in-flight revocation/workspace-switch checks, disposable-database concurrency/volume checks, history presentation review and domain rollout acceptance remain open. No mocked suites or database fixture suites were rerun for this evidence-only continuation. Screenshot `phase6-iab-ar-export-expired.png` records the AR result in the existing visualization artifact directory.

## AR continuation and browser-session mismatch investigation (2026-10-15)

The user reported password confirmation and a completed CSV download. The previous browser bindings were absent and the selected in-app browser listed no tabs. A replacement customer-scoped AR tab initially timed out during navigation. Host listener diagnostics returned no rows, but these restricted-shell observations were inconclusive: the reviewed `npm run dev` launcher subsequently encountered `EADDRINUSE` on port 3000. The launcher reused the current Prisma Client without generation, allocated `.next-dev-session-eGCumO`, then exited. No existing server was stopped or replaced and no migration/fixture command ran.

- **Workflow/source evidence:** `npm run agent:workflow:check` passed (196 unclassified scripts), at HEAD `6f7f6741`. The development launcher, Prisma preparation helper, maintenance guidance and AR history hook were inspected. No application source changes were made. Permission/auth readiness gates and the five-minute export freshness requirement were preserved.
- **Browser evidence:** retrying the known AR URL reached the signed-in Nadia Essomba / Accountant / Wilkinson - Feeney 001 shell. The page remained loading across multiple observations before rendering the one customer-scoped item. A Playwright selector deadline occurred; the documented native accessibility surface then exposed the loaded export button. Clicking it showed Preparing download and subsequently **Fresh authentication required**. No successful AR artifact is claimed. Browser error/warning log inspection returned no entries; that does not isolate the loading delay's cause.
- **Read-only database evidence:** the task-local reader's bounded date range was extended through October 15 UTC (exclusive October 16), preserving all connection-level read-only enforcement and exact account/organization filters. It returned only the two previously verified October 14 AP export receipts. It found no newer AP or AR receipt at the time of that query. This does not contradict a download in another browser/account/target; the latest reported download has not been independently identified.
- **Local file evidence:** the focused Downloads-directory listing returned the same two AP files and no matching `customer-ar-open-items-*.csv`. This is not a search of all possible download destinations.

The user was asked which browser received the latest password confirmation. Do not repeat another password handoff until that session ambiguity is resolved. Restricted-account identity, disposable-database concurrency/volume testing and domain acceptance remain outstanding. This continuation adds evidence only; no financial record, payment, permission, authentication policy or unrelated source change was made. No unit/fixture suites were rerun. Screenshot `phase6-iab-ar-auth-result-2026-10-15.png` records the current AR result in the existing visualization artifact directory.

### Edge session identified (2026-10-15)

The user identified **Edge** as the browser where password confirmation/download occurred. An initial supported Edge DOM snapshot confirmed Nadia Essomba, `accountant.rds-org001@stockflow.test`, Wilkinson - Feeney 001, Accountant. The general dashboard displayed its access-limited state; this is not AR/AP access-denial proof. Navigation to the known customer-scoped AR URL detached before completion, and the tab inventory still reported the general dashboard. A refreshed tab handle and the documented accessible-tab wrapper both then failed on `Emulation.setFocusEmulationEnabled` deadlines (3 and 10 seconds). No AR export request or new download was verified in Edge. No credentials were accessed and no authentication policy was changed. Further automated retries of the same failing connection were stopped; the next bounded fallback is a user-triggered AR download in that same Edge session, followed by local file/audit verification. Phase 6 remains open.
