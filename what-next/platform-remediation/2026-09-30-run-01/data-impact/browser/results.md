# Authenticated compiled-runtime smoke — partial acceptance

**Follow-up:** the separately authorized reconciliation receipt now establishes an authenticated render with no skeleton or client error. A visible lower red panel remains semantically unclassified because its text/state was not retained. See `reconciliation-followup/results.md` and `review-classification.json`. The original results below are preserved; neither receipt claims business reconciliation success.

Executed **2026-09-30 21:51:44–21:52:46 UTC** against the retained local clone, after its two separately authorized accounting guard migrations. The source database was not targeted. The clone had **89 completed migrations**, with name/checksum SHA256 `3274e00f37fb1098ffd996824a2bd8db328cc2d1dc665d2d502f50177a590f7c`; the original restore matched 87 source migrations.

Exactly **one ordinary documented fixture login succeeded**. `/api/me/permissions` returned 200 with 431 permissions and one role. The authenticated user/organization pair was checked against the clone and remained stable after all five navigations. Only identity fingerprints and counts are retained. Expired saved cookies were not used; no session was minted or password changed.

| Route | Observed outcome | Acceptance |
| --- | --- | --- |
| Payment reconciliation | HTTP 200 on the expected route; no client error; loading skeleton and expected heading absent at capture | **Unverified render.** Network-idle did not establish settled client hydration. This is not proof of a product failure or a functional pass. |
| Accounting close | HTTP 200 with an explicit module-lock guard | **Authenticated denial.** Functional close workflow remains untested for this identity/configuration. No entitlement was changed. |
| Owner war room | Expected heading rendered on the authenticated route; no client errors | Read-only route render passed. |
| Manager action center | Expected heading rendered on the authenticated route; no client errors | Read-only route render passed. |
| Cash command | Expected heading rendered on the authenticated route; no client errors | Read-only route render passed. |

All five local screenshots redact non-static text and media. No raw page body, provider response, cookie, password or server log was saved. External browser/scheduler request counts were zero. Business aggregate counts remained unchanged across navigation: 180 users, 141 journal entries, 368 journal lines and 26 payroll runs. Aggregate equality is not a full row-immutability proof. Session/authentication and read-access audit writes on the disposable clone were expected and permitted.

The owned production server was PID **24500**, bound to `127.0.0.1:60818`. The browser closed and the server exited on SIGTERM in `finally`; `ownedServerStopped=true`. No other process or the retained clone was removed.

The runtime used real compiled output from `.next-remediation-r01-20260930` with the runner-confirmed BUILD_ID and `required-server-files.json`. Compilation, normal lint/types and static generation had succeeded. The full build originally exited 1 on Windows EPERM while packaging standalone symlinks. **This smoke proves workspace-backed compiled runtime behavior only; it does not certify standalone packaging.** Later packaging-recovery evidence, if successful, is a separate result.

Source/build lineage: `../../runner/app-build-final.result.json` records `sourceChanges: []`; `../../runner/app-build-final.sources-before.json` and `.sources-after.json` cover 6,042 build-window files; `../../runner/app-build-final.baseline-supplement-during.json` and `-after.json` cover 52 supplemental original-baseline files. No app source was changed for this smoke.

The original reconciliation capture did not establish settled client state; the separate follow-up adds a bounded explicit check and records the remaining alert-classification limit. The accounting-close functional gate needs an existing authorized enabled fixture configuration. Neither limitation warrants bypassing access controls or treating a login redirect as success. No business mutations, cross-tenant role matrix, accessibility, country qualification, provider settlement or production release was tested here.
