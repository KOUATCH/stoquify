# P08 — Cashier recovery and manager discrepancy usability

18 October 2026. **PASS — bounded implementation and synthetic developer journeys.** P08 only; no later prompt ran. This does not certify a customer pilot, production release, accounting treatment or retention improvement.

## Outcome and scope

One confirmed obstacle was changed: manager action rows previously showed the next-step label and a generic “Open” link without their matching signal context. They now pair the server-provided signal title, next step and source warning, with distinct EN/FR accessible link names and wrapping for mobile. Matching uses the server action ID, not translated text or a shared route. Explicitly unavailable sources are not clickable; a stale/failed read is not converted to zero or success.

The existing cashier recovery controls already support the requested task, so P08 adds no cashier production change. Current actual-app checks verify original-request retry, post-commit response loss, reconnect/reload, original-result recovery and French mobile keyboard acknowledgement. The final snapshot remains **one commit result, one stock movement, two payment records, two journals, two posting batches and one customer-ledger entry**. A total-10 synthetic cash/credit sale changes stock from 5 to 4; these zero-tax fixtures do not certify statutory accounting or external payment settlement.

**Data/schema impact: none.** No new API, writer, approval, notification platform, dependency or design system. Digest navigation does not resolve an exception or authorize an operation. The source workflow remains responsible for current permissions and all financial controls.

## Baseline, prerequisites and ownership

HEAD `6ee84a90c760d2864f6aef672d8b393ac2b65971`; [baseline](evidence/BASELINE.json) captures 361 selected source/artifact fingerprints and inherited dirty paths. P07 onboarding/media and unrelated landing work were preserved. [Validation](evidence/VALIDATION.json) compares current selected files, P07's final owned-source hashes and the P08-only status-row delta. This is an uncommitted working tree, not an immutable release artifact.

P05's [dated closure](../P05-P06-closure-2026-10-17/RESULT.md) has 40 component, 9 lifecycle and 16 full-commit checks plus actual response-loss recovery. P07's [dated continuation](../P07-media-2026-10-18/RESULT.md) closes the media blocker with 107 focused and 12 real-DB cases and the actual import journey. Their machine results and current source were revalidated in [source review](evidence/SOURCE_REVIEW.json); these historical counts are **not added to P08 totals**. Current P08 cashier checks re-exercise the consumed recovery behavior. P07 opening positions remain unverified/unsupported where documented; imported masters are not opening-balance completion. P04/live cutover/provider/expert/deployment gates remain open.

Exact production ownership: [DailyHabitDigestDashboard.tsx](../../../../components/daily-habit/DailyHabitDigestDashboard.tsx), action-row presentation only. Existing test ownership: [modes.test.tsx](../../../../components/daily-habit/__tests__/modes.test.tsx), three added regression cases and adjusted accessible-name expectations. Artifact ownership: this P08 directory and only P08's row in [STATUS](../STATUS.md). Before-files and owned patches are in evidence. No stage, commit or reset.

Graph navigation: `daily_habit_dailyhabitdigestdashboard_tsx`, component community 156; `pos_professionalpossystem_tsx`, community 1. Graph refresh is 9 August; current route → protected service → snapshot/signal → action-ID → component relationships were inspected independently. The manager source is an organization-level stockout aggregate linking to inventory items, not an exact transaction/correction link. No multi-location grant guarantee is inferred.

## Acceptance

| Criterion | Result and evidence |
|---|---|
| Cashier finds and executes supported recovery without losing identity | PASS, bounded fixture. [Five actual browser steps](evidence/BROWSER_RECOVERY.json), original request bytes and independent DB snapshots. Keyboard retry and FR acknowledgement exercised. |
| Manager traces discrepancy to source and next permitted step; unavailability explicit | PASS for stockout/source workflow. [Actual manager journey](evidence/manager-1792343331471.json), source/item navigation, failed read and keyboard retry; typed stale/unavailable/mismatched-source cases in component tests. Resolution/correction is outside this slice. |
| No optimistic unauthorized mutation | PASS for changed scope. Read-only presentation; disabled/unavailable actions have no link. Actual denied-role screens and mocked route entitlement/permission checks pass. Existing server owners unchanged. |
| FR/EN rendering, keyboard/focus, viewport evidence | PASS for tested envelope. [UI evidence](UI_STATE_EVIDENCE.md), screenshots and traces. No assistive-technology or general accessibility certification. |

## Verification classes

| Class | Actual procedure / result | Limit |
|---|---|---|
| S | Prompt/common workflow, P05/P07 contracts, graphs, current source, design master/POS/inventory contracts, constitution/registry/tokens and command/import/environment review. [Run plan](RUN_PLAN.md). | Bounded inspection. UI/UX focused guidance and ECC verification-loop adapted to project controls; no broad audit. |
| V1 | `npm run agent:workflow:check`: exit 0; 196 scripts outside reviewed manifest. [Record](evidence/WORKFLOW_CHECK.json). | Inspected runner uses fs/path/crypto; absent pre/post hooks; no app/DB commands executed. |
| M | `node docs/retention/execution/P08/evidence/run-unit.cjs`: **201 passed, 9 suites, zero failed/skipped**, exit 0. [Final results](evidence/unit-1792343498866.results.json). | nextJest without app directory; bounded roots, shared mocked setup and explicit ESM-routing mock. Not real transaction or browser evidence. |
| D | One real fixture setup check passed; actual browser uses live Prisma/Next actions and independent PostgreSQL snapshots. [Fixture setup](evidence/fixture-1792342513961.results.json), [cashier effects](evidence/BROWSER_RECOVERY.json). | No standalone financial/concurrency suite rerun; P05's 25 DB cases remain dated evidence. Datamodel bootstrap is not migration-history/custom-trigger certification. |
| B | `node docs/retention/execution/P08/evidence/browser-cashier.cjs`: exit 0, five PASS steps. `node docs/retention/execution/P08/evidence/browser-manager.cjs`: exit 0, 10 recorded checks, injection restored. | Actual Better Auth/current application. Chromium 149.0.7827.55; EN desktops and FR 390×844. Synthetic source variations/lock/rename, no mocked route response. French cashier reuses captured original request bytes. |
| P | NOT_RUN. | No external provider settlement, receipt delivery or authority operation. |
| C | NOT_RUN. | [Task scripts](TASK_SCRIPTS.md) prepared for later authorized observation; no customer contact, satisfaction/churn claim. |
| E | NOT_RUN. | No accountant, tax/legal, security or accessibility certification. |
| O | NOT_RUN for restore/load. Owned process cleanup PASS. [Cleanup](evidence/CLEANUP.json). | No deployed recovery or performance claim; proposed 3-second p95 is unmeasured. |

Exact commands/configs and source inputs are retained alongside the results. Initial harness failure (two ESM suites could not load) and a subsequent unchanged cashier test timeout are retained; a later successful run does not erase them. The timeout was not treated as proof of a production defect or silently counted as a pass. See [attempts](evidence/ATTEMPTS.md).

## Environment, limits and handoff

New PostgreSQL 17 cluster at loopback port 61862, database `stoquify_pos_audit_20261018_d5f8832f3f`, public schema, synthetic `retention_fixture` user; [target](evidence/DATABASE_TARGET.json), [schema provenance](evidence/SCHEMA_PROVENANCE.json). Current datamodel-to-empty SQL was applied only to this new target. App origin `http://127.0.0.1:3189`, isolated `.next-retention-p08-session-M9tLsO` output; ambient dotenv values/provider secrets blocked. Both owned listeners were stopped; files/data retained for review. No production/shared data, broad build/lint/typecheck, installation, graph regeneration or deployment.

Keyboard and mobile checks cover selected controls, not a physical-device fleet or screen readers. The existing inventory source list displays item names from nameEn even on its French route; the source check uses SKU and exact item-ID links. The first French-name assertion failed and is retained, with the corrected test documented in ATTEMPTS. P08's digest wording is localized; this is not a whole-platform French completeness claim. Broad location/tenant matrices, late cross-register response races, offline production capture, customer task success, provider success, production performance and release readiness remain unproved. This slice does not depend on those broader claims being green, and must not be used to clear them. A developer source-following task is not demonstrated manager resolution or retained commercial value.

Metrics: none added/changed in product telemetry. Future task measures are defined in TASK_SCRIPTS: recovery discovery/completion, original-ID continuity, source/next-step interpretation, permission understanding and assistance. No invented baseline or retention uplift.

Rollback: restore only the owned presentation/test hunks using saved before-files as reference, preserving concurrent changes. No data migration or financial repair is required. Test source variations were restored; do not reset a customer cart or delete retained intent to recover uncertainty.

Review lenses: architecture/backend/data preserve existing owners; IAM/privacy preserve server-derived scope and redacted read models; frontend/UX cover context, locale, keyboard and wrapping; product/support provide repeatable tasks; QA/SRE distinguish mocks, transactions, browser and future deployed evidence; SaaS packaging unchanged. Finance/POS/audit matter for original effect preservation. OHADA rule changes, payroll/AP, provider integrations, AI autonomy, billing and new APIs are not applicable because P08 changes none of them.

Handoff: P12/P14/P22 may consume these bounded UI and task artifacts only when separately requested. A future pilot still requires its own access, opening-data, support, backup, expert and customer authority gates. **Stop after P08; no later prompt is authorized by this result.**
