# S06–S12 shared candidate review R9 — 20 October 2026

**The requested 12 modifications and 26 additions have been reviewed and incorporated into an updated, locally verified frozen candidate. Production rollout remains gated.** No production data, provider connection, deployment, schema promotion or external notification was used.

## Scope and preservation

All 38 requested paths matched the hashes recorded after R8. By capture time, the live tree had advanced to 15 modifications and 36 additions. This candidate takes R8 plus the requested 38 paths, the R8 report, and the focused repairs below. The three additional modifications and nine additional files from ongoing review-workpaper work were preserved outside this candidate. The prior R8 report accounts for the other addition. See [scope ledger](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/scope-ledger.json>) and [review ledger](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/review-ledger.json>).

No reset, stash, staging, commit or unrelated cleanup occurred. Historical AF07 execution evidence remains historical; its reported 112 unit and 9 database cases are not counted as new R9 verification. No migration, application dependency, fingerprint algorithm or webhook signature behavior changed.

## Evidence-backed repairs

1. **Decoded JSON text:** raw checks accepted escaped NUL, replacement characters and unpaired surrogates in identities. Three new cases reproduced the bypass. The parser now validates decoded row keys and string values before importing. Valid Unicode scalar text remains accepted.
2. **Line numbers:** four cases showed that booleans, arrays, exponent notation and hexadecimal strings were coerced into integers. The adapter now accepts numeric integers or plain decimal text within the existing positive PostgreSQL integer bound.
3. **Reproducible verification:** the AF07 fixture and test configuration referenced a historical private cluster, fixed port and temporary Prisma client; performance tests overwrote dated evidence. They now use the installed generated client, explicit loopback/database/absolute-cluster parameters, server directory verification, an environment-free candidate, refusal to reuse an existing database, and exclusive writes to a fresh evidence directory. Performance-file output is optional for ordinary test runs. The operating notes document this contract.
4. **Trusted response scope:** a downstream mock test still expected the older workbench response. Both its action and test were byte-identical to R8. The corrected assertion verifies server-owned actor/organization scope even when both are supplied by an attacker in the input. No action implementation changed.

These are nine owned source/test/config/documentation paths. Exact before/after hashes are in [source repairs](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/source-repairs-final.json>). The seven parser failures were retained in [before-fix reproduction](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/parser-before.json>); the final provider run passes all cases. The public-component harness initially omitted the existing matchMedia stub (49 passed / 7 failed); adding the same browser API stub to the review-local harness yielded 56 passing cases. This was a harness correction, not a UI defect. The first build wrapper was deliberately stopped before compilation to refresh the stale test assertion; only the final build below is qualified.

The review-local runtime verifier was also tightened: copied runtime bytes must match the trusted manifest directly. A synthetic one-file probe reproduced the earlier gap where comparing the copy with the current source directory accepted bytes changed after verification. Direct manifest comparison rejected that change. See [copy-binding probe](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/copy-binding-probe.json>). This did not modify the actual artifact or frozen application and is not counted as a database or application test.

## Fresh verification

Earlier AP, payroll, offline-POS, R8 authenticated evidence-desk and operational rehearsal evidence remains inherited from the prior reports. The fresh checks below cover this batch and its selected downstream consumers.

| Evidence class | Result and limits |
|---|---|
| Source inspection | Requested parser/import/coverage, UI, fixtures, configs and historical reports reviewed. Existing payment action derives actor/tenant from protected context. Dated graph node payments_reconciliation_actions_importproviderstatementaction (community 14, August 9) used only for discovery. Scoped heuristic secret scan: 39 files, zero findings; not a full security or dependency audit. |
| Clean locked installation | npm ci passed: 1,340 packages, lifecycle scripts enabled, no force/legacy-peer/ignore-scripts bypass. Candidate owns its node_modules. Package and lock hashes unchanged. |
| Pure/mocked service and action tests | **176 passed**: provider suite 120; downstream reconciliation/Close/data-trust/action consumers 56. Mocked permission tests do not certify deployed authentication. |
| Component tests | **56 passed** across cinematic landing and workflow-atlas suites. These are jsdom checks, separate from browser evidence. |
| Real PostgreSQL | **10 passed** on a fresh owned PostgreSQL 17 cluster: Decimal totals, account separation/foreign-account denial, simultaneous exact/changed imports, retained legacy-file replay, mixed-file rejection/replay, event-trigger rollback, invalid-input zero-write rejection, 1,000-row import, independent no-activity approval/late contradiction, and stale signoff exclusion. The retained-signature fixture does not execute financial signing. |
| Target safety | **3 refusal probes passed:** non-loopback target, wrong actual cluster, existing database. Row counts stayed unchanged. |
| Migrations | **102 applied, replayed with none pending, and checked against stored checksums. All 102 match R8.** This fresh-target evidence does not replace target-history/collision/rollback gates. |
| Type/workflow | Scoped tsc --noEmit --incremental false and workflow contract passed. 196 package scripts remain outside the reviewed manifest. |
| Build | Full Next application compilation and artifact sealing passed. 14 lint warnings retained; see lint review. Compiler cache reused from verified R8; dependencies and compiled runtime were not copied from R8. No production-secret or schema-promotion qualification. |
| Standalone runtime | Independently copied artifact bytes verified; packaged native Sharp optimizer, login form, compiled JavaScript and ten public assets passed. Login response observed at 23.83 seconds on this local host, not an approved startup SLO. |
| Rendered browser | Anonymous /en, /fr, /en/workflows and /fr/workflows at 1440 and 390 px, reduced motion: artwork remains behind copy, decorative/pointer semantics preserved, no horizontal overflow, keyboard entry and role selection work, scoped axe checks have zero violations, forced-color artwork hidden, no page errors. Screenshots inspected separately. No screen-reader, default-motion, authenticated journey or broad-browser certification. |

Evidence: [test summary](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/tests-summary.json>), [real database receipt](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/provider-database.json>), [build receipt](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/84389d8704-build.json>), [runtime receipt](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/84389d8704-runtime.json>), [browser results](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/public-browser.json>), [visual review](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/visual-review.json>), [reviewed commands](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/command-review.json>).

The supported 1,000-row synthetic CSV parsed in **206.9 ms** and imported in **1646.9 ms**, retaining the exact 100.00 XAF unsigned control total. These single-run observations are not throughput or production SLO qualifications. No live provider export, official mapping or economic settlement was certified.

The build's health probe intentionally used the non-listening synthetic target 127.0.0.1:1. Its retained connection-refusal log is expected and does not establish application database health. Real PostgreSQL evidence comes from the separate disposable-target tests above.

The disposable PostgreSQL cluster and owned runtime are stopped; data and receipts are retained. See [cleanup](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/server-cleanup.json>). No test delivery worker sent notifications.

## Frozen identity and later work

- Candidate: [full-app-2637b57006](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/full-app-2637b57006>).
- Base HEAD: 6ee84a90c760d2864f6aef672d8b393ac2b65971; **6,938 source files / 102 migrations**.
- Source identity SHA-256: b9e6fb51aabcd055994ef5adab8d577a6a68a36502442419e0a330de9997fb77.
- Verified archive SHA-256: d8922a2e0fa7bbeb3d738b331428febef26c46b2d64f6d34a94d63e89d0323af.
- Artifact SHA-256: 40413fa86cad8f615ec5aeae23fcb34f1b102d94c4fe1d41c73faa30b4cbd3af.
- Build ID: AJ2Vj9mOtd1zc-VkiMEzo.
- Archive: [final verified source](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/2637b57006-verified-source-final.json.gz>). The earlier same-candidate archive is superseded by this final archive.
- Custody: [source/artifact checks](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/custody.json>).

At 2026-10-20T15:30:42.173Z, the shared tree differed from this final freeze by **19 modifications, 58 additions and 0 removals**. Those later changes are preserved and unverified by this build. See [later drift manifest](<E:/ohada saas/Focused projects/stoquify/.codex-tmp/shared-review-20261020-r9/later-shared-tree-drift.json>). This report is written after that capture and itself adds one subsequent documentation file. Local passes apply to the exact frozen bytes, not the advancing shared tree.

## Remaining S06–S12 rollout gates

| Step | Still required |
|---|---|
| S06 | Trusted ingress/header overwrite, origin isolation, shared limiter, representative till/NAT traffic and approved outage policy. |
| S07 | Deployed authenticated CSP journeys, supported-browser policy, render/cache measurements and activation approval. Loopback blocking is not deployed CSP proof. |
| S08 | Real operators/assistive technology, task/error objectives and independent review. No-JavaScript hidden streamed homepage, interrupted post-commit navigation stale readiness, hydration-window behavior, modal reduced-motion acceptance and durable uncertain-command recovery remain open. |
| S09 | Business/maintenance/conversion metrics; real firm consent/enrollment/assignment/evidence-work acceptance. AF07 official provider samples/mappings/connectivity and network-uncertainty acceptance remain external; AF08–AF16 need separate qualification. Waitlist remains simulated. Opening cutover needs source-bound scope/date/revision, domain proof, tie-out and independent approval; external AR/AP opening imports are unsupported. Real media ACL/decryption, development journal P2022 target diagnosis, and production archive authorization/privacy/consent/lifecycle/extraction/delivery/scale remain open. |
| S10 | Hosted startup/load/reconnect/recovery/queues/assets/portfolio/firm/evidence-desk/provider-account workloads. Prior stress p95 **288.62 ms > provisional 250 ms**, cold-pool P2028 and clock/cutoff concerns remain. R8's 39.8-second and R9's local login observations are not approved SLOs. |
| S11 | Exact artifact/source and later-drift review; original migration 101 plus additive 102, target-history reconciliation if edited 101 was applied. Duplicate named-scope preflight, authorized consent resolution, index-lock/timeout budget and failed-migration recovery. Managed activation, prior-app compatibility and forward/rollback; schema 99 rejects old unreceipted close writes. Protected checks/environments, cold-build capacity, deployed Node/native compatibility, hosted health/promotion/rollback. AF07's private-path harness is repaired; other historical launcher recipes remain separate. |
| S12 | **No approved RPO/RTO and no named incident/recovery owner**, as the user confirmed. PITR rehearsal, real alert receipts and legacy assurance-key stop/drain/mapping decisions remain open. |

Offline-POS **P06 is distinct from S06**. Production capture/economic replay remains disabled. Real key/device enrollment, policy renewal/conflicts, persistent offline boot, power-loss/eviction durability, broader browsers and another browser's never-uploaded work remain unresolved. Local queue visibility is not a global close barrier; ingestion acknowledgement is not a paid sale. P12 U17/U18 remain partial.

R9 has no schema change or data rewrite to roll back. Preserve receipts, fingerprints, exceptions and signatures; pause new ingestion if operational acceptance fails. Restoring the old permissive parser or old coverage reader would require explicit review of the controls being removed. **This local verification does not authorize rollout.**
