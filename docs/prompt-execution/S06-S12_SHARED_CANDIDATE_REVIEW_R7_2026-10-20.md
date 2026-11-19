# S06–S12 shared candidate review R7 — 20 October 2026

**Bounded local verification complete; production rollout remains blocked.** Reviewed the requested **10 modifications and 44 additions**, plus the prior R6 report: **55 paths, zero removals**. All 54 requested paths matched their R6 end-of-run hashes. The repaired candidate contains **6,863 source files and 102 SQL migrations**.

Candidate: `.codex-tmp/full-app-02b77deb7a`. Evidence: `.codex-tmp/shared-review-20261020-r7/`. HEAD: `6ee84a90c760d2864f6aef672d8b393ac2b65971`, plus captured working-tree bytes and six owned repairs. HEAD alone does not identify this candidate.

No production, existing application database, customer data, real provider credentials, deployment or external notification was used. Tests wrote only to fresh synthetic databases on the review-owned loopback PostgreSQL cluster. No staging, commit, reset, stash or unrelated cleanup occurred.

## Review and concrete improvements

| Area | Assessment |
| --- | --- |
| Firm setup and handover | The existing Accountant Access route adds firm/client views using existing AF04 commands. Assignment, named consent, explicit enrollment and activation remain separate. Handover retains original work ownership and requires a separate incoming mandate. Management permission alone does not grant evidence-work authority. |
| Authorization and privacy | New readers derive firm/user/session from trusted actions, scope engagement details to the current firm and revalidate persistent authority. The client register identifies only people referenced by returned client grants. Delivery DTOs omit tokens/envelopes and distinguish delivery from acceptance. |
| Scope limits | Engagements paginate at 20; staff and setup-client selectors cap at 100 with partial labels. Large-firm selector search, hosted load, real operator acceptance and whole-app accessibility remain unqualified. No posting, payment, filing or consent-transfer authority is added. |
| Historical evidence | AF05 JSON packets were parsed separately. Historical browser results include failed and resumed attempts; their combined verification is not one uninterrupted pass. Historical mocked counts overlap and are not added to R7 totals. Captured AF05 is bounded verified; AF06–AF16 remain NOT_STARTED. |

The dated graph node `accounting_accountant_access_actions_ts` (community 58, August graph) aided discovery only; current source controls behavioral claims. `review-ledger.json` classifies all 55 paths.

Six hash-guarded file repairs were synchronized into the shared tree and candidate:

1. **Preserve uncertain commands and modal focus.** Background/page-show events previously discarded the pending command and idempotency key. The 60-second refresh could also move focus outside confirmation. The workspace now retains the exact in-memory command across those events and suppresses periodic refresh/focus movement while confirmation is open. Private metadata is still invalidated and reads/commands remain server-authorized. This does not promise recovery across reload, unmount or device loss.
2. **Use consistent consent evidence.** The setup-client query omitted `revokedById`; the member status missed that revocation marker; and a newer retained revoked grant could supply the displayed expiry of an older active grant. The reader now checks both revocation markers and derives expiry from the selected active mandate. These were misleading reader states; this review does not claim a reproduced unauthorized financial write.
3. **Add regressions.** Four component cases reproduced the original command/focus failures. Three actual PostgreSQL cases reproduced the consent issues. Both sets pass after repair.
4. **Make scoped verification reproducible.** The SQL test no longer reads a personal historical fixture/client path. It requires an explicit loopback database and matching owned cluster directory before writes. The scoped Jest and TypeScript configurations now use the freshly generated installed Prisma client.

Owned files: `FirmEngagementWorkspace.tsx`, its component test, `firm-engagement-workspace.service.ts`, `firm-engagement-workflows.postgres.test.ts`, `jest.firm-engagement-workflows-postgres.config.cjs`, and `tsconfig.firm-engagement-workflows.json`. Exact paths/hashes are in `source-repairs.json`. No application migration changed.

## Fresh verification

| Evidence class | Result |
| --- | --- |
| Workflow/source | Workflow contract passed. 196 package scripts remain unclassified; selected definitions/hooks/helpers were reviewed individually. All requested hashes matched. |
| Strict installation | Fresh candidate-local npm ci passed: 1,340 packages, lifecycle enabled, no force/legacy-peer/ignore-scripts bypass. Package and lock hashes unchanged. Prisma generation passed. |
| Mocked/component tests | **592 tests across 22 suites passed**, no pending cases. The 12-case workspace regression rerun is included in this total, not added again. |
| Real PostgreSQL | **8 firm-workflow + 27 authority + 6 portfolio cases passed: 41 total.** Fresh application, replay and checksums cover all 102 migrations. The repaired stock PostgreSQL configuration separately repeated the 8 workflow cases successfully; those are not added to 41. |
| Scoped types | The repaired stock AF05 TypeScript configuration passed with no emit and incremental output disabled. |
| Build and seal | Full compilation, types, page generation, tracing and artifact sealing passed in **20.28 minutes**. Dependencies were clean-installed; compiler cache was reused from R6. This is not a cold-build qualification. |
| Copied standalone runtime | Byte verification, login HTTP 200/form, static JS hash, packaged native Sharp WebP optimization and ten packaged asset hashes passed. First successful login request: 9462 ms; local observation only. |
| Authenticated firm browser | Actual compiled routes and Better Auth sign-in: client grant, draft, assignment, explicit enrollment, activation, handover without consent transfer, revocation and queued invitation presentation. Actual CREATE commit followed by aborted response, visibility/page-show events and identical retry retained one engagement. EN/FR at 1440/390 px, keyboard refresh and four scoped axe scans; recovery checks cover keyboard cancellation, expiry, read transport loss, role/module loss and session revocation. |
| Authenticated portfolio browser | Fresh synthetic 105-client fixture: six-page traversal, EN/FR desktop/mobile, keyboard/scoped axe, request recovery and client/period navigation, grant/role/session revocation and module isolation. |
| Custody/cleanup | Frozen file hashes and byte sizes, source/build/artifact identity, unchanged R6 migration checksums, synthetic session cleanup and closure of owned application/database ports verified. Disposable data retained; private synthetic credential fixtures excluded from the evidence index. |

Source inspection, mocked/component tests, real database tests and rendered/browser checks are distinct evidence classes. Browser checks are local Chromium with synthetic identities and workspace-scoped axe, not assistive-technology or hosted-platform certification. Invitation worker failure was injected in the synthetic outbox; no delivery worker/provider ran.

Earlier attempts remain visible: the first repaired UI run clicked Retry while its reauthorization read was still busy (10 pass/2 fail); the harness now waits for the enabled control and all 12 pass. The first authority harness omitted the legacy read-only fixture (26 pass/1 fail); a new database with that fixture passed all 27 unchanged assertions. The initial build was intentionally stopped to include the two scoped-client configuration repairs; its failed receipt is retained. The first portfolio browser attempt passed eight recorded stages, then tried to click Refresh after current authorization had already replaced the route with “Access Not Available.” The retained screenshot shows no private cards. The harness now accepts only a recognized denial/renewal boundary if that control disappears, still asserts card removal, and revisits the portfolio after permission restoration. The complete rerun on a new fixture passed; its evidence is in `portfolio-browser-02/` and `portfolio-runtime-02.json`. No application change was needed for that race. No failing attempt was overwritten or added to passing totals.

Lint warning comparison: **12 current; 2 added and 0 removed relative to R6**. The two added AF05 warnings concern cleanup reads of request-generation counters. These deliberately invalidate late responses; they are not DOM-node references. Warnings remain visible without suppression or unrelated refactoring. Dependency deprecations/cache warnings remain visible. Build-time refusal at synthetic 127.0.0.1:1 is expected from the existing health probe and is not a database-health pass. No comprehensive new vulnerability audit is claimed.

Unchanged R6 public-route/photo/archive/SSR/payroll/AP/POS/calendar/operational evidence is inherited with its original limits, not rerun or counted as fresh R7 proof. The no-JavaScript hidden streamed homepage, interrupted post-commit navigation stale readiness, hydration-window and reduced-motion acceptance gates remain open.

## Frozen identity and later work

- Source identity SHA-256: `b298eaeb7d49b5aca39993cfa392db0862d384f05ee5697843062adb5f79447c`.
- Verified archive SHA-256: `52d291ad04cc941f8e03bd3a4727cc366c01c2249fa7059625476cd59ce556c4`.
- Artifact SHA-256: `e17d6d0a26584834c9c23a0d09f04c54c889730874a883fac95d7a5e2ff17123`.
- Build ID: `qRA8Fj63_iuPEVDl6fwPc`.
- Archive: `02b77deb7a-verified-source.json.gz`; build receipt: `25a3b0a9aa-build.json`.
- Release ready: **false**.

At final audit, later shared-tree work had **12 modified, 46 added and 0 removed paths**. Exact hashes are in `later-shared-tree-drift.json`. That work is preserved and is not certified by this artifact. This report is a post-verification document outside the freeze.

Retain the source archive, sealed artifact, `verification-summary.json`, `review-ledger.json`, `source-repairs.json`, `migration-identity.json`, `custody.json`, `server-cleanup.json` and `evidence-index.json` together.

## Remaining rollout gates

| Step | Still required |
| --- | --- |
| S06 | Trusted ingress/header overwrite, origin isolation, shared limiter, representative till/NAT traffic and approved outage policy. |
| S07 | Deployed authenticated CSP journeys, supported-browser policy, render/cache measurements and activation approval. Loopback network blocking does not certify deployed CSP. |
| S08 | Real operator/assistive-technology acceptance, task/error objectives and independent review. Resolve or qualify no-JavaScript support, interrupted-navigation stale readiness, hydration-window behavior and modal reduced-motion acceptance. |
| S09 | Business/maintenance/conversion metrics; real firm consent/enrollment/assignment operating acceptance; AF06–AF16. Waitlist remains simulated. Opening cutover needs source-bound scope/date/revision, domain proof, tie-out and independent approval; external AR/AP opening import is unsupported. Real media ACL/decryption, development-target journal P2022 diagnosis, and production archive authorization/privacy/consent/lifecycle/extraction/delivery/scale remain open. |
| S10 | Hosted startup/load/reconnect/recovery/queue/assets/portfolio/firm workloads. Prior stress p95 288.62 ms exceeds provisional 250 ms; cold-pool P2028 and clock/cutoff concerns remain. Local timings are not approved SLOs. |
| S11 | Exact source/artifact custody and later-drift review; unchanged **102-migration sequencing**, original 101 and additive 102. Reconcile target history through an approved process if edited 101 was applied. Duplicate named-scope preflight, authorized consent resolution, index-lock/timeout budget and failed-migration recovery. Managed activation and prior-app compatibility/forward/rollback; schema 99 rejects old unreceipted close writes. Protected checks/environments, cold-build capacity, deployment Node/native compatibility, hosted health/promotion/rollback remain open. |
| S12 | **No approved RPO/RTO and no named incident/recovery owner**, as the user confirmed. PITR rehearsal, real alert receipts and legacy assurance-key stop/drain/mapping decisions remain open. |

Offline-POS P06 is distinct from S06. Production capture/economic replay remains disabled. Device/key enrollment, policy renewal/conflict correction, persistent offline boot, power-loss/eviction durability, broader browsers and another browser's never-uploaded work remain unresolved. Local queue visibility is not a global close barrier; ingestion acknowledgement is not a paid sale. P12 U17/U18 remain partial. Hiding firm mutation entry points during rollback must retain managed-access restrictions and authorized history. No local pass authorizes rollout.
