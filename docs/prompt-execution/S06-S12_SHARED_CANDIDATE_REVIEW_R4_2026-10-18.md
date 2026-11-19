# S06–S12 shared candidate review R4 — 18 October 2026

**Review and bounded local verification complete; production rollout remains blocked.** The no-JavaScript public-rendering failure and an intermittent readiness-refresh observation remain explicit below. The captured change set is exactly **24 modified and 118 added paths, zero removals**, relative to R3. The updated candidate contains 6,550 source files and 99 SQL migrations. All 142 changed paths are recorded in `review-ledger.json`; historical reports and evidence are classified separately from new verification.

Candidate: `.codex-tmp/full-app-9406e1829c`. Evidence: `.codex-tmp/shared-review-20261018-r4/`. Captured HEAD: `6ee84a90c760d2864f6aef672d8b393ac2b65971`, plus recorded working-tree bytes. HEAD alone does not identify the candidate. R3 and its evidence remain intact.

No production, existing application database, real provider credentials, customer data, deployment or notification recipient was used. All database writes and fault injection targeted this run's new disposable loopback PostgreSQL cluster. No staging, commits, resets, stashes or unrelated cleanup occurred.

## Review and business value

| Area | Assessment and practical limit |
| --- | --- |
| Managed-image item imports | ITEM schema/mapping v2 accepts one managed media reference, checks ready/item/organization scope, and uses the existing transactional domain claim at commit. Recovery compares the retained item image as well as its business key/name. Old mappings and batches remain retained. This addresses the previous local item-import incompatibility without bypassing media ownership or independent approval. It does not establish a working external upload/storage/decryption provider. |
| Import image helper | Uses the existing authenticated uploader. A fresh uploader instance after each successful image preserves earlier references from replacement cleanup; references remain selectable and users are told to retain them before leaving. Real unconfigured-provider failure, retry availability and no fabricated ready asset are checked separately from mocked upload success. |
| Manager actions | Risk titles, next steps and warnings are tied to source action IDs; unavailable actions remain disabled. Localized accessible names and wrapping improve the path from a discrepancy to an authorized source record. The change does not grant new permissions or add financial mutations. Operator acceptance and productivity improvement remain unmeasured. |
| Public presentation | Sample dashboard captures and illustrative accounting imagery have provenance/disclosure. Hero pacing, scene crossfade, native workflow details, scoped hash/focus navigation and looping demonstrations improve explanation. Mouse/touch/manual pause and reduced-motion behavior require rendered verification. Conversion, real-device performance and assistive-technology acceptance are not established by these changes. |
| Archive contract | A pure validator for the explicitly synthetic `p09-synthetic-retail` profile checks caller-supplied trusted authority, declared category coverage, canonical paths, byte/hash/count integrity, tenant/reference consistency and decimal monetary/stock tie-outs. It has no authenticated export endpoint, database extraction, object delivery or production consent policy. It does not certify full tenant completeness or attachment content safety. |
| Historical evidence | Retained with its original scope and failures. Prior test counts are not added to fresh results. The dated architecture graph is navigation evidence only; current captured source is the behavioral authority. |

All 133 dependency/configuration/Prisma inputs compared with R3 are unchanged, including package and npm/pnpm locks, Next configuration and all schema sources. No dependency or migration change was introduced. The prior R3 source repairs are part of this frozen baseline.

## Repairs and verification boundaries

No application source change was made in this review. Application files were preserved. The first combined Jest run passed 388 tests in 26 suites but two suites failed during module loading: the external setup file resolved its routing mock from the shared tree while isolated tests resolved candidate-local `next-intl` ESM. A test-only module mapping binds the routing-definition shim explicitly; actual local path localization and dashboard components still execute. The initial failure is retained in `unit-attempt1/`. The corrected full selected lane passed.

A generated manager-browser script contained a literal-dollar replacement syntax error. Parsing detected it before execution; the invalid preimage is retained and the generator now uses functional replacement. This changed no application behavior and performed no database injection. Production action-denial checks use the redacted RSC error envelope, matching newly emitted owned-server logs and persisted database state. Recovery checks wait for hydration, issue keyboard retry, and record a fresh RSC request. Loading screenshots use immediate browser capture while synthetic reads are deliberately locked. Database diagnostics and injected recovery scenarios run sequentially.

The first authenticated journey observed a **stale opening-readiness panel for 90 seconds** while the selected supplier batch and database showed successful validation. This followed a customer-commit check that reloaded immediately after observing the database write, without awaiting action/UI completion. The exact cause is **not established**. `operator-attempt1/` retains the failure and screenshot. A fresh route showed the retained supplier correctly. An initial diagnostic used visible text for collapsed evidence and could not capture response bodies; its automatic-refresh conclusion is not reliable. A corrected diagnostic compared full evidence text and browser-side response copies: all three repetitions (one direct validation, two after template download) updated automatically. The full journey then passed after waiting for the commit success notice, idle operation and settled requests before reloading. This qualifies that settled-action sequence; it does **not** establish that interrupted navigation is fixed. Request cancellations were also observed in the passing run, so they are not treated as proof of a particular cause. Interrupted post-commit navigation/readiness freshness remains an S08/S09 qualification gate. No speculative application patch or weakened assertion is presented as a fix.

## Fresh verification

| Evidence class | Result |
| --- | --- |
| Workflow/source | Workflow contract passed; 196 package scripts remain unclassified. Selected scripts and custom runners reviewed for side effects. No blanket registry approval or coverage claim. |
| Strict installation | Fresh candidate-local npm ci passed: 1,340 packages, lifecycle scripts enabled, no legacy-peer/force/ignore-scripts bypass. Package and lock hashes unchanged. 2026-10-18T19:22:02.782Z–2026-10-18T19:34:56.329Z. |
| Selected mocked/component/source contracts | 408 tests / 28 suites passed; no failures or pending tests in the corrected run. Includes onboarding, media helper/service boundaries, daily digest/source visibility/access, landing controls/localization and unchanged POS/login regressions. |
| Pure archive contract | 47 tests / 1 suite passed. Synthetic bytes/records and trusted caller assertions; no production export. |
| Server rendering | 1 real React SSR regression passed without browser globals. |
| Fresh schema and real PostgreSQL | 99 migrations applied and names/completion/checksums verified. 12 tests / 1 suite passed: ownership/status rejection, approvals, interrupted checkpoint, partial resume, transactional rollback, conflicting image, mapping versions and cleanup contention. |
| Build and artifact | Full compile/type/page/tracing/seal passed in 45.46 minutes with the recorded cache reuse. Build ID VVw2wKiZn08cXmCqGCA9b; exact artifact verified before copying outside the checkout. |
| Copied standalone runtime | Login HTTP 200, static asset SHA-256 and native packaged Sharp WebP optimization and all four new public asset hashes passed. Copied bytes verified. First successful cold login request took 20915 ms on this host; no startup SLO acceptance is claimed. |
| Public rendered routes/interactions | 208 matrix cases passed. 8 focused cases passed and 1 no-JavaScript case failed. Runtime smoke passed; overall public interaction acceptance remains false. |
| Authenticated onboarding | 13 journey steps passed through real compiled routes/actions. Persisted 1 customer, 1 supplier and 2 items. Independent lineage checked four committed source rows and two attached owned media references; zero opening stock levels/movements/journals/postings and zero starting customer/supplier balances. Approval, foreign-tenant/role denials and same-file replay checked. |
| Authenticated recovery | 4 EN/FR loading/error/recovery state assertions plus 2 recorded RSC retries passed; all injected database state restored. |
| Authenticated manager | 12 recorded steps passed: EN desktop/FR mobile source-linked stockout action, keyboard navigation to actual scoped item, empty/error distinction, hydrated recovery and denied-role isolation. Synthetic stock source and table injection restored. |

Visual review is limited to the retained screenshots explicitly inspected during this run; it is not a complete visual or assistive-technology audit.

The public matrix covers Chromium on 18 routes and Firefox/WebKit on four representative routes, each in EN/FR, 390/1280px and light/dark presentation. Focused checks cover keyboard menus, module selection, offer handoff, unknown-route UI/noindex, workflow deep-link focus, visible loop reset, hover pause/resume, touch pause/resume, dynamic reduced motion and legacy waitlist rendering. These are bounded checks, not full supported-browser/device or accessibility certification. The rate limiter remains enabled; the harness respects bounded `Retry-After` when necessary.

The no-JavaScript homepage remains a **failed check**, not a pass: the heading exists in the response but is inside React's hidden streamed Suspense container. `no-js-diagnostic.json` and `NO_JS_FR.png` retain the result. It remains an S08/S09 support/rendering gate. A successful JavaScript-enabled browser matrix does not close it. Legacy waitlist rendering also does not certify its simulated submission workflow.

The media fixtures are synthetic pre-existing ready records. Their real import/claim transactions prove local ownership and recovery behavior, not external upload, stored-object ACLs, encryption/decryption or provider availability. Imported customers, suppliers and items remain separate from opening stock, balances, journals and ledger completion. The old R3 readiness diagnostic expected the prior blocked-item fixture and is not recounted as a fresh test of the new successful media path; the new 12-case database suite and independent persisted lineage check provide this run's evidence.

Build cache reuse is recorded in `build-cache-reuse.json`: only Next cache files were copied from R3; no previous executable artifact or dependency directory was reused. This is strict clean installation followed by a cached build, not a cold-build qualification. Existing dependency deprecation and build warnings remain visible; no comprehensive new dependency vulnerability audit is claimed. Unchanged payroll/AP/POS/calendar/operational evidence is inherited with its original limits, not represented as fresh full-domain certification.

## Frozen identity and custody

- Source identity SHA-256: `f24db95b1c4dcf9974d87990efa9ba6a3940f6bb8427e4fe862eea513393e2d9`.
- Source archive SHA-256: `1108ab4af10696e398b9608d3ae8ad16d62f30817a01fe483cf1fe510e29c360`.
- Artifact SHA-256: `c58d6833c53b5788ff8d62e3052aa82876063f51bd8f204471cee9c9e1545e63`.
- Build receipt: `e6c97de8fc-build.json`; runtime receipt: `e6c97de8fc-sealed-runtime.json`.
- Release readiness: **false**. The no-JavaScript failure and external/business gates below are retained.

`verification-summary.json`, `migration-identity.json`, `review-ledger.json`, `server-cleanup.json` and `evidence-index.json` bind the result. The final audit checks every frozen source hash against the build manifest and verifies that recorded application/database ports are closed. Disposable database data and failure evidence are retained. Any edits made in the shared tree after capture are recorded in `later-shared-tree-drift.json` and remain outside this candidate's verification; they are neither overwritten nor silently admitted.

## Remaining rollout gates

| Step | Still required |
| --- | --- |
| S06 | Trusted ingress/header overwrite, origin isolation, shared limiter, representative till/NAT traffic and approved outage policy. |
| S07 | Authenticated deployed CSP journeys, supported-browser policy, representative render/cache measurements and activation approval. Local outbound blocking and public-page tests do not establish deployed CSP behavior. |
| S08 | Real operator and assistive-technology acceptance, agreed task/error objectives, independent review, and an explicit no-JavaScript support/fallback decision with tested rendering. Reproduce and resolve/qualify the observed stale readiness after early post-commit navigation. Hydrated retry checks do not qualify interactions during hydration or interrupted navigation. |
| S09 | Broader authenticated workflow acceptance and measured business/maintenance outcomes. Public conversion is unmeasured; legacy waitlist submission remains simulated. Opening cutover requires source-bound scope/date/revision, domain proof, tie-out and independent approval; external AR/AP opening import is unsupported. Local item/media compatibility is verified, but real provider upload/storage/ACL/decryption remains open. The separate development-target journal P2022 requires target-specific diagnosis. Production archive authorization, privacy/consent/lifecycle policy, consistent tenant extraction, delivery and scale remain unimplemented. |
| S10 | Hosted startup/load/reconnect/recovery acceptance, representative queue retention and the new animation/asset workload. Prior stress p95 288.62 ms exceeds the provisional 250 ms target; cold-pool P2028 and host-clock/cutoff concerns remain. Local functional results do not close these gates. |
| S11 | Exact reviewed source/artifact custody, later-drift review, matching app/schema sequencing, prior-app compatibility or approved forward/rollback plan, protected checks/environments, cold-build/CI-capacity budget, deployment-platform Node/native runtime and hosted health/promotion/rollback. Schema 99 rejects older unreceipted close writes. A Windows artifact does not qualify another platform or a mismatched database. |
| S12 | **No business-approved RPO/RTO or named incident/recovery owner**, as confirmed by the user. PITR rehearsal, real alert receipts and the legacy assurance-key stop/drain/mapping decision remain open. |

Offline-POS P06 is distinct from S06. Production capture/economic replay remains disabled. Real device/key enrollment, policy renewal/conflict correction, persistent offline boot, power-loss/eviction durability, wider devices and another browser's never-uploaded work remain unresolved. Local queue visibility is not a global close barrier; ingestion acknowledgement is not a paid sale. No local pass authorizes rollout.
