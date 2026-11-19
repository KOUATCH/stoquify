# Authenticated close-screen continuation — 26 October 2026

Scope: actual English/French Next routes, authenticated protected actions, and the retained disposable PostgreSQL database. MTN, operating/retention decisions, rollout defaults, and negative-stock certification are excluded. This report supplements the shared [evidence register](../EVIDENCE_REGISTER.md); it does not approve deployment or certify statutory compliance.

## Repairs and acceptance

| Register item | Original trigger and impact | Correction and acceptance evidence |
|---|---|---|
| F9 / B8: post-commit cache failure | A draft/certified export was saved, then `revalidatePath` threw and replaced the committed result with an error. Two failing regressions are retained in [cache-before-results.json](cache-before-results.json). | `actions/accounting/close-assurance.actions.ts:65` uses the existing `revalidateAfterCommit` helper for the same paths. The action still awaits the original owner and retains all protected guards. [33 action tests](cache-after-results.json) pass. Actual cache faults during assessment/draft/certification retain IDs/hashes, download the English result, and recover the lost French successful reply with one certificate for that assessment. |
| F10 / B9: cached evidence after denied read | Permission/session revocation denied the server read but left private cached UI visible. The first correction missed query retries; retry startup could also clear the error before a successful authorization response. | `components/accounting/CloseAssuranceCenter.tsx` handles both terminal errors and retry failure reasons, clears local draft/export/password state, and retains a denial until a newer successful query response. Denied views use generic EN/FR copy and session recovery links. [Original](access-before-results.json), [retry-window](access-retry-gap-results.json), and [four failing retry-start regressions](denial-latch-before-results.json) remain available. [44 final component tests](ui-unit-results.json) and delayed-response browser checks pass. This hides rendered content and clears local drafts; it cannot retract data already delivered to a browser and is not a claim of full cache/memory erasure. |
| F11 / B10: French period-closing copy | The adjacent accounting setup period section rendered its closing label, title, status, dates and success notice in English for French users. | The period slice in `app/[locale]/(dashboard)/dashboard/accounting/setup/page.tsx` now localizes those strings/date formatting. Period ID/version fields, protected action and all close gates are unchanged. [Four setup tests](setup-unit-results.json) cover open French controls and retained closed status; final authenticated closed-state screenshots are in [setup-copy-results.json](setup-copy-results.json). Other setup configuration sections were not rewritten. |

Owned tracked source consists of these three application files and their three existing test files. New files are the disposable browser seed test, three narrowly scoped Jest configurations, a scoped TypeScript configuration and evidence scripts/artifacts. [Owned patch](owned.patch) records the surgical changes. Test fixture type corrections remove unsupported Testing Library options and use the existing reconciliation enum; they do not alter application behavior.

## Environment and source provenance

- HEAD: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, plus the actual working-tree changes. [Start](start-source.json) and [final](final-source.json) fingerprints cover 7,355 copied source/config/assets. The final comparison identifies five unrelated concurrent HRIS/landing changes; they are preserved and not certified by this work.
- Database: **localhost / stoquify_pos_audit_20261026_d30f / public**, retained from the preceding phase, PostgreSQL 17.5 with the existing 120 migrations. No schema change, reset or migration was needed here.
- App: isolated source copy under `.codex-tmp/close-browser-app`, Next development server on **127.0.0.1:3169**. No application `.env` files copied. Installed dependencies reused. Actual sign-in endpoints, session cookies, protected actions and database owners were exercised; sign-in form design itself was not tested.
- Separate synthetic preparer/reviewer actors per locale; zero-tax cash purchasing and nonnegative inventory. Real fixture owners establish receipt, invoice, independent payment, cash review and approved schedules. No READY close run, certificate or CLOSED period was seeded. [Fixture identities](fixtures.json) are non-secret. Credentials remain in ignored local private files.
- The only app instrumentation replaces cache invalidation in the isolated copy with a marker-controlled exception. It does not bypass authentication, accounting or close guards. [Instrumentation receipt](cache-instrumentation.json) and script describe it. Probe counts are cumulative across attempts, not business execution counts. The final marker is absent.
- Root application hashes match the isolated app for all three owned application files. Expected browser-copy differences include test files, the cache wrapper, Next-generated declarations and the unrelated concurrent files. Final source comparison is explicit; HEAD alone is not claimed as the tested state.

## Scenario matrix

Results are recorded stages, not 34 independent test cases. The final machine-readable [summary](summary.json) lists each result and its source artifact.

| Scenario / start and actor | Procedure and expected effect | Evidence |
|---|---|---|
| Initial open period, preparer, EN desktop / FR mobile | Load actual close page, run assessment, export draft; READY is persisted and downloaded canonical content hashes match. | `journeys-results.json`: initial render and assessment/draft stages |
| Prepared run, independent reviewer | Age synthetic session assurance; keyboard-trigger certification, perform actual password step-up, return focus to the originating button, then deliberately retry. No certificate is created merely by step-up. | `journeys-results.json`: fresh-auth/focus stages |
| Fresh reviewer, assessed run | Export certificate, independently canonicalize/hash downloaded JSON, reload; exactly one certificate and a disabled duplicate-certification action. | `journeys-results.json`: certified-download/reload stages |
| Existing authorized session, then real role/session changes | Remove the entire close capability family (write permissions imply read), refresh, and deny access; test foreign-tenant period IDs and delete stored sessions. No new business effects. | `access-results.json`: six EN/FR stages |
| New assessment under injected cache failure | Run, draft, independently certify; English download succeeds. French interception lets the real successful action commit, then drops its reply. Reload recovers recorded certification without another effect. | `recovery-results.json`: two cache/response stages; downloaded JSON |
| Certified page, EN/FR at 1440 and 390px | Enter fresh selector focus, open with Enter, close with Escape, verify returned visible focus, no page overflow and targeted WCAG A/AA axe scans. | `recovery-results.json`: four viewport stages; `*-focus-*` / `*-final-*` screenshots |
| Independently certified run, reviewer with synthetic setup permission | Submit the real existing setup Close form; period becomes CLOSED/version 1, with one seal bound to the exact certificate/run/hash and different preparer/reviewer. Permission restored afterward. | `recovery-results.json`: two authenticated seal stages; `database-readback.json` |
| Loaded closed assessment, transient transport failure | Abort protected reads, retain explicitly labelled history, disable certification, restore transport and refresh successfully. | `read-recovery-results.json`: EN/FR transient stages |
| Denied closed assessment, then restored permission | Let denied retries settle, delay the next protected read, prove private workspace stays absent until a successful response, then restore it. | `read-recovery-results.json`: EN/FR delayed restore stages |
| Revoked read/session, final repaired UI | Check generic denied view and localized sign-in link, keyboard focus and targeted axe/no-overflow results. | `read-recovery-results.json`: four denial/session accessibility stages |
| Retained CLOSED period, EN/FR setup route | Render localized period section; closed state has no closing button. | `setup-copy-results.json`; `en-period-copy.png`, `fr-period-copy.png` |

The main lifecycle and four viewport stages preceded the final retry-start latch and the period copy patch. The affected denial/restoration scenarios were rerun against the final latch; setup rendering and unit tests cover the copy patch. The final denial rendering was also rechecked after removing a repeated explanatory paragraph. Financial owners and action payloads were unchanged. The earlier real seal submission used the original labels; it is not represented as a second seal submission after translation. The earlier post-seal screenshots could catch the loading transition; use the final setup screenshots for retained closed-state rendering.

## Durable reconciliation and invariants

The final [readback](database-readback.json) uses a repeatable-read, read-only transaction. Both fixture organizations retain:

- One CLOSED period at control version 1 and exactly one period-control seal, bound to a retained certificate ID/content hash.
- No duplicate certified export for any individual assessment. Explicit new assessments during harness retries remain separate historical runs; multiple historical certificates are not presented as a duplicate business effect.
- Stock quantity **2.000**, total stock value **200.00**, three balanced journals, one supplier payment and one payment transaction. Close UI/recovery/access tests did not create additional stock or money effects.
- All synthetic role permissions restored after browser checks. No active cache fault marker remains.

| Invariant | Authoritative boundary / evidence class |
|---|---|
| Commit outcome survives cache failure | Existing service owner + existing nonthrowing cache helper; action mocks and real HTTP/browser/database evidence |
| Private cached UI stays hidden after denial and through retry startup | Protected read errors + component denial latch; mocked retry sequence and delayed real browser response |
| Tenant and current-session denial | Existing protected action / service binding; actual foreign-period, revoked-role and deleted-session browser checks |
| Certification requires distinct prepared/reviewed authority and fresh identity | Existing close service / step-up action; actual password flow and recorded seal actor IDs; earlier lifecycle suite covers additional denial/concurrency paths |
| One recorded certification survives response loss | Existing retained export owner; intercepted successful real response + database execution counts |
| Closing preserves stock/value/accounting and binds proof | Existing period owner; authenticated form submission + read-only durable reconciliation |
| Recovery controls are usable in both languages | Rendered Chromium focus, responsiveness and targeted axe checks; not a screen-reader or all-browser certification |

## Verification procedures and evidence classes

Current command definitions, registry, delegated configurations and hooks were inspected before execution. The first verification command was `npm run agent:workflow:check` (PASS). No broad build or environment-loading test wrapper was used.

From the repository root:

```powershell
node node_modules/jest/bin/jest.js --config jest.close-browser-actions.config.cjs --runInBand --json --outputFile what-next/pos-purchasing-inventory-audit-2026-10-26/close-browser/cache-after-results.json
node node_modules/jest/bin/jest.js --config jest.close-browser-ui.config.cjs --runInBand --json --outputFile what-next/pos-purchasing-inventory-audit-2026-10-26/close-browser/ui-unit-results.json
node node_modules/jest/bin/jest.js --config jest.close-browser-setup.config.cjs --runInBand --json --outputFile what-next/pos-purchasing-inventory-audit-2026-10-26/close-browser/setup-unit-results.json
node what-next/pos-purchasing-inventory-audit-2026-10-26/close-browser/check-static.cjs
node what-next/pos-purchasing-inventory-audit-2026-10-26/close-browser/finalize.cjs
```

- **Source/static:** source/diff/security-boundary review, scoped TypeScript and owned diff checks. [TypeScript receipt](typecheck-results.json). Security review uses ECC guidance adapted to existing Prisma/protect/RBAC controls; no unrelated dependencies or authentication infrastructure changed.
- **Mocked tests:** **81 passed**: 33 protected actions, 44 close-screen components, four setup-page components. Existing table `act(...)` warnings remain visible; they did not fail assertions. These tests do not prove locks or transactions.
- **PostgreSQL:** one separate real fixture-preparation test ([seed results](seed-results.json)) plus actual browser-driven business effects and final read-only reconciliation. No new locking/transaction design was introduced; prior concurrency results are historical evidence, not rerun here.
- **Rendered/browser:** five reviewed scripts (`journeys.cjs`, `access.cjs`, `recovery.cjs`, `read-recovery.cjs`, `setup-copy.cjs`) target only the fixed local app/database. Thirty-four recorded stages across both locales. Targeted scans report no detected WCAG A/AA violations in exercised close states. Browser setup/lifecycle scripts are stateful; they are not safe to rerun blindly against already sealed fixtures. Use fresh disposable fixtures for a new complete lifecycle.
- **External provider:** NOT RUN; MTN sandbox remains excluded.

The initial source copy hit a sandbox junction restriction; creation and localhost execution succeeded under reviewed escalation. Intermediate harness failures are retained: inherited read permission, an unscoped French Refresh selector, hydration timing, viewport resizing while focus was already retained, restoration racing an unfinished denied retry, and route interception cleanup. These do not constitute passing product evidence. Product defects are separately reproduced by the retained failing regressions. Final result artifacts supersede intermediate attempts only for their stated scope.

## Compatibility, rollback and remaining limits

No schema, policy, rollout default, dependency or operation identity changed. Cache refresh can be stale when invalidation fails; the saved outcome remains authoritative and existing safe logging records the failure. The denial latch is component-local, uses query success timestamps, and adds no durable retention policy. French closing copy changes presentation only.

Rollback consists of reversing only the three application-file hunks in `owned.patch`, with their tests, after reviewing the current tree. Do not reset the repository or reverse unrelated work. Reverting B8/B9 restores the reproduced cache-result/privacy defects. No financial record or schema rollback is needed for these code changes; retain synthetic database evidence, and use the established reopen owner for any deliberate later period correction. Do not delete retained certificates as rollback.

Still outside or blocked:

1. MTN MoMo provider verification requires a sandbox account/product, local sandbox configuration and a safe callback/test endpoint. No live provider interaction occurred.
2. Retention, creator resumption/admin escalation, durable-authoring default rollout and legacy compatibility remain open by user instruction. The earlier default legacy duplicate-create risk and mixed-version rollout certification are not resolved here.
3. No current period-reopen UI exists. Its protected action/database lifecycle passed in the preceding continuation; browser reopen evidence cannot be supplied without an approved UI path. No new reopen control was invented.
4. Negative-stock certification remains explicitly excluded. Login-form design, screen-reader testing, other browsers, and full accounting-setup translation are not certified by these targeted close-screen checks.

The isolated server is stopped after evidence capture; the disposable database remains for inspection. No production mutation, live charge, deployment, commit or push occurred. Program-wide verification remains incomplete because the provider and policy/rollout gates remain open.
