# S06–S12 shared candidate review R2 — 17 October 2026

**The repaired frozen candidate passed the bounded local verification below. Production release remains blocked.** This report covers the requested 15 modifications and 61 additions since candidate `cbcfdd4eae`. It supersedes candidate-specific results in the previous shared-candidate report only where fresh evidence is identified below. Historical evidence and unresolved rollout gates remain explicit.

Evidence directory: `.codex-tmp/shared-review-20261017-r2/`. No production database, deployment, schema promotion against an existing environment, provider or real notification recipient was used. No shared service was stopped. Unrelated changes were not reverted, staged or committed.

## Review and frozen input

The capture matched the requested scope exactly: **15 modified, 61 added, zero removed files**. `comparison.json`, `before/`, `after/` and `diffs/` retain the review input. `review-ledger.json` accounts for all 76 paths, including historical reports and failed attempts. Documentation is evidence of its original bounded run, not automatic certification of this candidate.

Updated candidate: `.codex-tmp/full-app-b5e6e513ce`, **6,332 source files and 99 SQL migrations**, based on HEAD `b044764248f1ac47705371c235c2ba273dd973a7` plus recorded working-tree bytes. HEAD alone does not identify this release candidate. The repaired source archive is `b5e6e513ce-repaired-source.json.gz`, SHA-256 **`848ccd7459702e359cf5323176a4711359a106bae7e484bdfc9fc05fe82ed75e`**. Original input archive and the three-file repair lineage are retained separately. The previous candidate remains intact.

| Reviewed group | Assessment |
| --- | --- |
| Offline queue inventory, recovery panel and POS close submission | Counts are scoped to current organization/station; old-session work remains visible; sending requires the original session and current access. The panel survives remote read failures. A fresh local check precedes close submission. Uploaded work still requires the existing authoritative server check. A corrupt-record fallback was reproduced and repaired below. |
| Dashboard wrapper, appearance metadata/test and journal loading boundary | Fixed dark dashboard styling and native controls are scoped without changing the saved global preference. EN/FR pending-state announcements avoid a nested main landmark and respect reduced motion. Component tests do not certify the transient rendered loading boundary or every journal workflow. |
| Package inputs and security regression script | npm lock changes include Axios 1.16.0→1.20.0, Sharp 0.34.5→0.35.5 and related dependencies: 34 changed/added package versions. Next itself is unchanged. The installed Next range permits this Sharp version. Native decoding, optimizer and bounded HTTP behavior are tested; no fresh comprehensive vulnerability audit is claimed. |
| New authenticated browser fixture | Synthetic actor, roles, original sale and device only; database prefix/host guard retained. Its output previously overwrote checked-in historical evidence. It now requires an explicit absolute evidence directory and exclusive file creation. |
| Retention and UI delivery reports/evidence | Original failed and successful attempts remain attributed to their original targets. The separate development-target `P2022` journal-read/schema mismatch remains unresolved; that database was not inspected or altered in this review. |

The August 9 component graph was used only for navigation: `pos_professionalpossystem_tsx` (community 1) and `userdropdownmenu_tsx` (community 199). Captured current source establishes behavior. All 129 Prisma source files match the previous freeze (`inherited-schema-comparison.json`).

## Evidence-backed fixes

Only three existing shared-tree files received repair hunks:

1. `lib/pos/offline-local-queue.ts`: an existing IndexedDB record with missing/null state could fall back to an older empty legacy snapshot if its marker was absent. A real Chromium reproduction allowed `assertNoLocalOfflineWork` to return successfully (`inventory-reproduction.json`, `blocked: false`). Existing damaged durable records now fail closed instead of being treated as absent. The same reproduction then blocked and retained the evidence (`inventory-fixed-reproduction.json`).
2. `lib/pos/__tests__/offline-local-queue.test.ts`: two real-browser regressions cover missing state and a null durable record alongside an empty legacy snapshot. Neither permits shift-close readiness or deletes the retained legacy evidence.
3. `services/pos/__tests__/retention-offline-operator.browser-fixture.test.ts`: require `RETENTION_VERIFICATION_EVIDENCE_DIR` and write `BROWSER_FIXTURE.json` with `flag: 'wx'`. The fresh fixture passed and wrote outside the frozen source. Historical fixture files remain unchanged.

These changes prevent unverifiable offline evidence being reported as no pending work and preserve verification provenance. They do not enable production offline capture/replay or manufacture financial completion from an ingestion acknowledgement.

## Verification

| Evidence class | Fresh result / retained record |
| --- | --- |
| Source and workflow contract | Workflow contract passed; 196 scripts remain unclassified. One-off runners were reviewed for side effects, explicit targets and bounded network access. |
| Clean locked installation | `npm ci` passed with lifecycle scripts enabled; no force, legacy-peer or ignore-scripts bypass. Package and npm lock bytes unchanged. `b5e6e513ce-install.json`. |
| Installed dependency identity | Node 22.17.0; Next 15.5.27; React/React DOM 19.2.6; DayPicker 8.10.2; Axios 1.20.0; Sharp 0.35.5. Declared DayPicker/React and Next/Sharp ranges checked. `dependency-identity.json`. |
| Candidate-local generation | Application and separate close-test Prisma clients generated successfully. `generate-checks.json`. |
| Native/loopback HTTP regressions | 16/16 passed: native Sharp formats, malformed/pixel bounds, Next optimizer, SVG denial, Axios transport/timeout/cancellation/redirect/body/config behavior. `sharp-axios.log`. |
| Mocked POS component/hook tests | 64/64 passed across three suites. `ui.json`. |
| Mocked appearance/loading tests | 7/7 passed. `appearance.json`. |
| Real Chromium storage | 25/25 passed, including both new corruption regressions, cross-tab discovery, restart, retained uncertainty, corruption and storage failure. `storage.json`. |
| Real PostgreSQL close controls | 72/72 passed across seven suites. `close-postgres.json`. Warmed connection-pool preconditions remain explicit. |
| Real PostgreSQL POS controls | 16/16 passed, including concurrent replay, lost responses, authority changes, serialization retry and transaction rollback. `pos-postgres.json`. Expected conflict diagnostics are retained in the log. |
| Fresh schema | All 99 migrations applied separately to the owned close and POS databases; names, completion states and SQL checksums verified. `close-migration-identity.json`, `pos-migration-identity.json`. Cluster data directory and port were checked before execution. |
| Synthetic operator fixture | 1/1 passed in the migrated POS database, with output in this run's evidence directory. `operator-fixture.json`. |
| Full build and sealed artifact | Passed compilation, configured lint/type checks and sealing on retry; original timeout retained below. Build ID `tQ0jGmYf7JjK24oc2PPG1`; artifact SHA-256 `100172f1f888b3ba2bd0653f93f39d9f480ed480734ce56021505d7823e461c7`. `9e8cb6aedd-build.json`. |
| Copied standalone HTTP/image/public browser verification | Passed: copied bytes verified outside repository ancestors, login HTTP 200 with actual form, static asset exact hash, native image HTTP 200 (webp, 64px), and 96 public/auth render cases across Chromium/Firefox/WebKit, EN/FR, light/dark and narrow/wide viewports. `9e8cb6aedd-sealed-runtime.json`, `public-browser-retry.json`. |
| Authenticated compiled POS browser journeys | Passed on a fresh-fixture retry: 7-step authenticated loss/reload/keyboard-retry/denial/conflict journey; separate empty-local-queue server-close denial (3 blockers, shift ACTIVE, zero financial commits); 2 French 390px/read-failure/offline checks. Saved light preference remains light while the dashboard computes dark native controls. `operator-retry/operator-checks.json` and its timestamped browser records. |

The earlier 72-case calendar browser run is **inherited, not rerun**: all 13 bound source inputs are unchanged (`calendar-inheritance.json`), and installed React/DayPicker compatibility is rechecked here. The previous 97→99 populated upgrade and broader mocked close/AR/login suites are historical evidence, not fresh counts in this table. This run does not test old-application compatibility. Full-build TypeScript coverage retains the repository's existing exclusions.

The installation contract tested here is npm. The pnpm lockfile was reviewed but resolves some versions differently and did not receive a clean pnpm installation. Do not treat these artifacts as evidence for an interchangeable pnpm-built release. Existing optional Better Call/Zod peer warnings, deprecations and build warnings remain separately visible; successful regressions are not a vulnerability-free certification. Build-time health checks log rejected connections to the deliberately closed synthetic database address `127.0.0.1:1`, as in the previous isolated build. Those diagnostics are retained and do not represent production access or real alert delivery.

Verification helper corrections were limited to the harness: snapshot capture through Git cannot enumerate an ignored isolated checkout, so the repaired archive is validated from the original explicit manifest; Sharp's exported API excludes its package manifest, so installed identity is read directly from disk. The first full build (`d47fab8c64-build.json`) reached the 30-minute harness limit during tracing, after compilation, configured lint/type checks and all nine static pages completed. It produced no sealed artifact and remains a failed attempt. The same frozen inputs were rerun with a 45-minute build observation limit and the existing same-input build cache. No application timeout or passing assertion was weakened. Cold-build duration and CI capacity remain part of S11 qualification.

## Rollout gates

The first authenticated artifact run passed six economic/authorization steps, then failed when the recovery panel detached during a route/viewport transition while the harness was scrolling. That failure and its synthetic records remain intact. A fresh fixture in `operator-retry/` reran all three browser scripts successfully. The harness re-resolves the panel within a bounded assertion and still requires all three retained rows and French recovery copy; application code and deadlines were unchanged. The retry fixture also passed independently. Fresh authenticated evidence is in `operator-retry/operator-checks.json` and its timestamped browser records. Manual inspection of the French narrow login, recovery and read-failure screenshots is recorded in `visual-review.json`; it is not assistive-technology or real-device acceptance.

| Step | Still required |
| --- | --- |
| S06 | Trusted ingress/header overwrite, origin isolation, shared limiter, observed till/NAT traffic and business-approved outage policy. |
| S07 | Full authenticated CSP journeys, supported-browser policy, representative render/cache measurements and activation approval. Local browser routing restrictions and bounded public/POS journeys do not establish deployed CSP acceptance. |
| S08 | Real operator and assistive-technology acceptance, agreed task/error targets and independent review. |
| S09 | Broader authenticated navigation/workflow acceptance and demonstrated maintenance benefit. The transient journal loading state and healthy populated journal queue are not fully accepted by these tests; the separately reported development-target `P2022` needs target-specific diagnosis. |
| S10 | Hosted startup/load/reconnect/recovery acceptance, including inventory polling at realistic retained-evidence sizes. Prior stress p95 **288.62 ms** exceeds the provisional **250 ms** target. Earlier cold-pool P2028 and host-clock/cutoff assumptions remain qualification concerns. Warmed database tests and local functional timing do not close these gates. |
| S11 | Promote only the exact reviewed source/artifact; assess any later shared-tree drift separately. Require matching application/schema sequencing, full prior-app compatibility or an approved forward/rollback plan, protected checks/environments, immutable custody, cold-build budget/CI capacity, target-platform Node/native build/runtime, hosted health and promotion/rollback. Schema 99 intentionally rejects older unreceipted period-close writes. The recorded npm/Windows artifact does not certify another installation contract/platform or the mismatched development database. |
| S12 | Business-approved RPO/RTO and named incident/recovery owners remain unassigned, as the user confirmed. PITR rehearsal, real alert/receiver receipts and the legacy assurance-key stop/drain/mapping decision remain open. |

Separate offline-POS **P06 is not S06**. Its bounded current-browser visibility and authenticated original-envelope recovery are evaluated here. Production offline capture/economic replay stays disabled. Real device/key enrollment, policy renewal/conflict correction, persistent authenticated offline boot, power-loss/eviction durability, broader supported devices and coordination with another browser's never-uploaded work remain unresolved. Browser-local inventory is not a global close barrier; ingestion acknowledgement is not a paid sale.

## Final integrity and cleanup

All 6,332 frozen source files still match their recorded hashes after verification. File-manifest identity: **`0d1ccd4d81eed0eda1a6d8468bc8d21175a4635a54cbfea09b48e23858d615b0`**. All three owned repair files still match the shared tree. `verification-summary.json` binds source, artifact, counts and cleanup; `evidence-index.json` inventories retained evidence.

The final shared-tree scan found **8 modified, 68 added and 0 removed paths** relative to this candidate. Additions include this report; 67 are other additions. Exact paths and captured hashes are in `later-shared-tree-drift.json`. Later edits were preserved and were not absorbed into the tested artifact. This report was finalized after that scan.

The copied runtime is retained at `C:/Users/JCOMPU~1/AppData/Local/Temp/stoquify-full-artifact-UueNAc`. The login response took 8726 ms; the checked static asset took 10 ms. These are functional observations, not approved SLO results. All owned application/browser endpoints and the disposable PostgreSQL endpoint were independently confirmed closed (`server-cleanup.json`, `postgres-cleanup.json`); cluster data and runtime copies remain for audit. The recorded Windows/Node environment does not certify another deployment platform.

Rollback of this review is limited to its three described repair hunks and added report/evidence. Preserve all other changes. Reverting the queue repair restores the reproduced false-empty result; reverting the fixture repair restores historical evidence overwrite. No local pass authorizes production rollout.

The operator runners recorded `appStopped: false` immediately after the termination callback, before Node observed the child exit. Treat that flag as an incomplete cleanup observation. The later independent probes confirmed both operator ports, the public runtime port and the PostgreSQL port closed; those probes are the final cleanup evidence.
