# S06–S12 shared candidate review R5 — 20 October 2026

**Review and bounded local verification complete; production rollout remains blocked.** The requested 14 modifications and 106 additions were the R4 end-of-run drift. At R5 capture, the shared tree had advanced to **37 modified and 224 added paths, zero removals** relative to R4. All 261 paths are recorded in `review-ledger.json`, including the requested 120 paths and five requested files that changed further. The frozen candidate contains **6,774 source files and 101 SQL migrations**.

Candidate: `.codex-tmp/full-app-4f2da3019d`. Evidence: `.codex-tmp/shared-review-20261020-r5/`. Captured HEAD: `6ee84a90c760d2864f6aef672d8b393ac2b65971`, plus recorded working-tree bytes and two explicitly recorded source repairs. HEAD alone does not identify this candidate. R4 and initial R5 failure evidence are retained.

No production, existing application database, real provider credentials, customer data, deployment or notification recipient was used. Database writes, role changes and fault injection targeted a new owned loopback PostgreSQL cluster. The occupied historical port was not reused or stopped. No staging, commits, resets, stashes or unrelated cleanup occurred.

## Review and practical value

| Area | Evidence-backed assessment and limit |
| --- | --- |
| Accountant portfolio | Bounded cursor pagination replaces an incomplete first-page view. Fresh actor, module, grant and tenant checks and per-client RepeatableRead projections preserve isolation; assessment ordering and current-proof status distinguish retained historical scores from usable evidence. UI refresh clears private cards and work-desk content, rejects stale responses and handles expiry and page restoration. The fresh browser journey qualifies 105 synthetic authorized clients across six pages; it does not establish hosted scale or operator productivity. |
| Firm engagements | New schema and command boundaries retain immutable engagement/assignment terms, versioned transitions, explicit mandate enrollment and idempotent event/outbox receipts. Named staff, current sessions, management permissions and module checks are revalidated. A sticky managed scope prevents old readers from silently recovering legacy access after enrollment. Real clean/upgrade database checks cover concurrent commands, stale versions, role ceilings, revocation and delegated export/acceptance denial. Operational consent, migration activation and rollback compatibility still require approval. No notification worker was run. |
| Delegated accounting reads | Current managed authority is checked at protected reads and sensitive acceptance/export boundaries. Direct delegated export without session proof fails closed. These controls narrow access; they do not make every accountant-firm roadmap phase complete. Captured roadmap status and in-progress AF04 implementation are not treated as an AF16 release certificate. |
| Public photo workflows | Ten disclosed illustrative WebP assets, five business contexts including accounting, localized sample previews and keyboard/focus handling improve explanation. Actual light/dark state, mobile width, image decode and preview focus are tested separately from static content tests. Real conversion, device cost and assistive-technology acceptance remain unmeasured. |
| Retention verification | The existing real-database test used fixtures acceptable to a datamodel bootstrap but invalid under SQL migration constraints. The repaired fixtures now run against all 101 migrations. This closes a verification gap without weakening production constraints or claiming adoption/economic outcomes from synthetic records. |
| Historical reports and architecture | Dated retention/firm program reports retain their original scope and sequence. The graph node `accounting_accountantportfolio_tsx`, community 140, is navigation evidence only; captured source controls behavioral findings. Historical test counts are not added to fresh totals. |

Package metadata, npm/pnpm dependency locks and Next configuration are unchanged. Prisma schema and two new migrations changed: `20261019120000_firm_engagement_foundation` and `20261019140000_firm_engagement_authority`. This is an app/schema candidate, not a frontend-only release.

## Corrections and retained failures

1. **Firm-engagement advisory lock.** The first real database run passed one legacy-access case and failed 21 command cases because Prisma could not deserialize PostgreSQL's void advisory-lock result. A concurrent shared-tree correction was inspected and adopted into the candidate: it casts the result to text, locks/verifies enrollment staff, narrows mandate row selection, rejects self-handover and rechecks activation expiry. The shared service was not overwritten by this review. Clean and upgrade lanes subsequently passed 22 tests each. Preimage and adopted bytes are retained.
2. **Retention fixture state.** The original suite failed 17 of 18 cases when SQL state constraints were present. The only live source edit authored here is `services/analytics/__tests__/retention-outcomes.postgres.test.ts`: finalized fixtures now have a result hash/completion timestamp, claimed rows use SQL NULL, and invalid committed rows are asserted to be rejected rather than counted as persisted invalid observations. The edit was hash-guarded and synchronized into the candidate. Constraints were preserved.
3. **Isolated retention harness.** A subsequent attempt exposed duplicate dependency resolution: copied tests resolved the shared-tree Prisma/null sentinel and headers module while candidate services resolved candidate-local dependencies. Explicit mappings bind both to the frozen installation. The final 18-case database suite passes. The session-subject seam remains mocked; this lane does not certify cookie transport.
4. **Build interruption.** The first owned build was deliberately stopped before sealing to include the retention fixture repair. Its receipt is retained in `build-attempt1/`. The final build is verified against the repaired source manifest.

`source-repairs.json` and `harness-repairs.json` distinguish application adoption, the owned test edit and harness-only corrections. Failed attempts are not silently replaced by passing receipts. The earlier combined `database-review.json` remains failed because its retention lane failed; final results are bound by `verification-summary.json` and `retention-bound-run.json`.

## Fresh verification

| Evidence class | Result and boundary |
| --- | --- |
| Workflow/source | Workflow contract passed; 196 package scripts remain unclassified. Selected commands and custom runners were inspected for side effects; no blanket approval. All 261 changed paths classified. |
| Strict installation | Fresh candidate-local npm ci passed: 1,340 packages, lifecycle enabled, no force/legacy-peer/ignore-scripts bypass. Package and lock hashes unchanged. Prisma generation passed. |
| Mocked/component/source regressions | 425 tests / 28 suites plus 534 accounting tests / 17 suites passed. Includes landing, portfolio/access, proof ordering, delegated boundaries and selected unchanged onboarding/media/POS/login regressions. |
| Pure archive contract and SSR | 47 archive tests / 1 suite and 1 real React SSR regression passed. Total non-database tests: **1,007 / 47 suites**. No production archive workflow is implied. |
| Real PostgreSQL authorization | **22 clean + 22 upgrade tests passed**, with migration application/replay and checksum verification. Legacy mandates remain unchanged and are not automatically enrolled. Upgrade lane starts from the 100-migration predecessor. |
| Real PostgreSQL portfolio | **6 tests passed**: 105 grants, unsampled proof, concurrent invalidation under RepeatableRead, revocation, tenant scope and role/module boundaries. |
| Real PostgreSQL foundation | **26 tests passed** against all 101 migrations: tenant/actor consistency, assignment windows and versions, immutable terms/history, ordered receipts, duplicate/concurrent writers and retained identity. Five AF03-only dormant-enrollment fence cases were explicitly excluded because migration 101 replaces that temporary fence; the 22-case authority suite verifies the replacement. This is not a claim that the unchanged historical AF03 suite passes on schema 101. |
| Real PostgreSQL retention | **18 tests passed** against all 101 migrations, including persisted uniqueness, role/session-subject changes, source caps, concurrent snapshot consistency, rollback and backend termination. Total fresh DB assertions: **94 / 5 suite executions**, plus the five documented exclusions. |
| Build and seal | Compile, type checks, page generation, tracing and seal passed in **17.51 minutes**. Build ID `TJDQ4qUP2I76Re1OPF7dn`. Cache reuse is recorded; this is not a cold build. |
| Copied standalone runtime | Copied artifact bytes, login HTTP 200/form, static JS SHA-256, packaged native Sharp WebP optimization and all 10 new public asset hashes passed. First successful login request: 13726 ms on this host; not an accepted startup SLO. |
| Public rendered checks | **208 route matrix cases passed**. **8 focused interactions passed; 1 no-JavaScript check failed**. **40 photo-preview cases passed** across EN/FR, 390/1440px, light/dark and five scenes, including keyboard open, focus containment and Escape/focus return. |
| Authenticated portfolio | Real compiled routes, Better Auth sign-in and protected actions against a fresh synthetic database: EN/FR desktop/mobile keyboard and scoped axe checks; 105 unique clients over six pages; failed-request recovery; client/period portal navigation; revoked-grant, lost-permission, revoked-session and module-lock isolation. Synthetic sessions revoked after capture. |
| Cleanup and custody | Final audit verifies all frozen source hashes, build/source/artifact identity and closure of owned app/database ports. Disposable data and failure evidence retained; private synthetic credentials excluded from the evidence index. |

Browser scope is bounded: Chromium covers the 18-route public matrix; Firefox/WebKit cover four representative routes, all EN/FR, light/dark and desktop/mobile widths. Portfolio axe checks cover the workspace, not whole-application accessibility. Visual review covers only explicitly inspected retained screenshots.

Initial preview screenshots caught the opening fade and looked transparent. A separate settled-rendering diagnostic confirmed an opaque panel and usable layout in EN desktop and FR mobile, with focus returned after closing. The first diagnostic attempted to connect after the portfolio server had already shut down; a public-only owned server was used instead. Its first focus assertion was also immediate rather than waiting for the closing transition; the corrected diagnostic uses bounded assertions and retains the failed attempt. No application patch was inferred from transition-time screenshots. Dialog opening/closing motion remains present under the emulated reduced-motion setting; these checks do not certify all modal motion preferences or accessibility needs.

The public **no-JavaScript homepage still fails**: the heading is present inside a hidden streamed Suspense container. Runtime smoke succeeds, but public interaction acceptance remains false. JavaScript-enabled passes do not close this S08/S09 gate. Legacy waitlist rendering does not establish real submission.

R4's stale readiness after early post-commit navigation also remains unresolved. Its settled-action journey and three focused refresh repetitions passed, but the cause of the interrupted-navigation failure was not established. No R5 onboarding application fix or new full onboarding browser qualification is claimed. Other unchanged payroll/AP/POS/calendar/operational results remain inherited evidence with their original limits.

Nine lint warnings are inherited; one new warning concerns the portfolio request-generation counter increment during effect cleanup. Source inspection shows that incrementing the current counter is intentional to invalidate late responses, rather than reading a stale DOM ref; the corresponding stale-response tests pass. No lint suppression or behavioral change was introduced. Existing dependency deprecation and cache-invalidation warnings remain visible. This run is not a comprehensive new vulnerability audit. Cached Windows compilation, local native execution and synthetic database results do not establish another deployment platform, external provider health or production performance.

## Frozen identity and later drift

- Source identity SHA-256: `ba161924645394e7f91103e860ad2889f02e8a078fb6581fece0b36768f51e6c`.
- Source archive SHA-256: `da59b14ac560bb0692fa3c8a79e41961ca6102af723954a58aaf707db3054fb5`.
- Artifact SHA-256: `b7864365e4b4fbb72833d7992e3237021ead449f58a5d047f6de2c81d559fddc`.
- Final archive: `4f2da3019d-verified-source.json.gz`.
- Build receipt: `53e628e78b-build.json`; runtime receipt: `53e628e78b-sealed-runtime.json`.
- Release readiness: **false**.

At the final audit, shared-tree work outside this freeze contained **20 modified, 42 added and 0 removed paths**. Exact paths/hashes are in `later-shared-tree-drift.json`; they were preserved and are not covered by this artifact. This report is a post-verification document and is not part of the frozen application source.

`verification-summary.json`, `migration-identity.json`, `review-ledger.json`, `server-cleanup.json` and `evidence-index.json` bind the result. Evidence is local and ignored by Git; a controlled handoff must preserve the archive, receipts and artifact together.

## Remaining rollout gates

| Step | Still required |
| --- | --- |
| S06 | Trusted ingress/header overwrite, origin isolation, shared limiter, representative till/NAT traffic and approved outage policy. |
| S07 | Authenticated deployed CSP journeys, supported-browser policy, representative render/cache measurements and activation approval. Loopback outbound blocking does not qualify deployed CSP. |
| S08 | Real operator and assistive-technology acceptance, agreed task/error objectives and independent review. Decide and test no-JavaScript fallback/support. Reproduce and resolve or explicitly qualify stale readiness after early post-commit navigation; hydration-window and interrupted-navigation behavior remain unqualified. |
| S09 | Broader workflow acceptance and measured business/maintenance outcomes; accountant-firm mandate consent/enrollment/assignment acceptance and remaining roadmap phases. Public conversion unmeasured; waitlist submission simulated. Opening cutover still needs source-bound scope/date/revision, domain proof, tie-out and independent approval; external AR/AP opening import unsupported. Real media upload/storage ACL/decryption, development-target journal P2022 diagnosis and production archive authorization/privacy/lifecycle/extraction/delivery/scale remain open. |
| S10 | Hosted startup/load/reconnect/recovery, representative queue retention and new animation/assets/portfolio load. Prior stress p95 288.62 ms exceeds provisional 250 ms; cold-pool P2028 and clock/cutoff concerns remain. Local correctness and timing do not approve an SLO. |
| S11 | Exact source/artifact custody and review of later drift; matching **101-migration** app/schema sequencing, explicit managed-mandate enrollment and tested prior-app compatibility or approved forward/rollback plan. Schema 99 already rejects old unreceipted close writes. Protected checks/environments, cold-build CI capacity, deployment-platform Node/native runtime and hosted health/promotion/rollback remain open. |
| S12 | **No business-approved RPO/RTO and no named incident/recovery owner**, as confirmed by the user. PITR rehearsal, real alert receipts and legacy assurance-key stop/drain/mapping decisions remain open. |

Offline-POS P06 is distinct from S06. Production capture/economic replay remains disabled. Real device/key enrollment, policy renewal/conflict correction, persistent offline boot, power-loss/eviction durability, wider devices and another browser's never-uploaded work remain unresolved. Local queue visibility is not a global close barrier; ingestion acknowledgement is not a paid sale. No local pass authorizes rollout.
