# S06–S12 shared candidate review R6 — 20 October 2026

**Bounded local verification complete; production rollout remains blocked.** Reviewed all requested **20 modifications and 42 additions**, unchanged from their R5 end-of-run hashes. Capture additionally includes the R5 report: **63 reviewed paths, zero removals**. The repaired frozen candidate contains **6,818 source files and 102 SQL migrations**.

Candidate: `.codex-tmp/full-app-0395643c04`. Evidence: `.codex-tmp/shared-review-20261020-r6/`. HEAD: `6ee84a90c760d2864f6aef672d8b393ac2b65971`, plus recorded working-tree bytes and the three owned repairs below. HEAD alone is not the candidate identity.

No production, existing application database, customer data, real provider credentials, deployment or external notification was used. Database writes and fault injection targeted a new owned loopback PostgreSQL cluster. No staging, commits, resets, stashes or unrelated cleanup occurred. Concurrent shared-tree work was preserved.

## Review and value

| Area | Finding and evidence boundary |
| --- | --- |
| Delegated exports | The action derives session proof from trusted server context only for delegated accountants; forged caller authority is not forwarded. Home-organization exports keep their prior contract. Fresh mocked and real SQL authorization checks cover the changed boundary. |
| Grant reads | ACTIVE status no longer bypasses explicit revokedAt/revokedById markers. Composite named-scope uniqueness conflicts map to the existing domain conflict response. |
| Work desk | After fan-out, all successfully read clients are reauthorized. Lost access removes private items, continuation and client/incomplete coverage counts. Mocked revocation regressions verify this information boundary. |
| Runtime client | Hot-reload cache reuse now requires the four firm-engagement delegates. Prisma schema changes in the captured delta are explanatory comments only. Dependencies and lockfiles are unchanged. |
| Managed authority tests | The added 26-case matrix covers managed linkage, user/permission/module/engagement/assignment/role predicates. Session and mandate checks are exercised by separate action/authority suites. Real SQL tests add successful synthetic export and retained acceptance races against suspension/revocation, event/outbox rollback and duplicate namespace rejection. Scheduling wrappers retain actual SQL locks; service tests do not certify browser cookie transport. |
| Historical evidence | AF04 and P12 reports were classified and their JSON parsed separately from fresh tests. AF04 historical run 04 verifies its original 101-migration source, not this repaired 102-migration candidate. AF05–AF16 remain outside that phase's verification. P12 retains 41/42 criteria passing, one partial, U17/U18 and owner/business gates. No historical test counts are added to fresh totals. |

Current source controls behavioral findings. Dated graph nodes/communities are discovery aids only, not live coverage. The ledger records every captured path, hash, requested-path match and assessment.

## Evidence-backed repair

The captured change inserted `accountant_active_named_scope_key` into migration 101, which the verified R5 candidate had already applied. On an exact R5-schema fixture, **Prisma migrate deploy returned exit 0 while the index remained absent**. The applied migration checksum also remained unchanged. Editing an applied migration therefore did not deliver the new constraint to that upgrade path.

Three hash-guarded changes were synchronized into the shared tree and frozen candidate:

1. Restored `prisma/migrations/20261019140000_firm_engagement_authority/migration.sql` to its exact R5 verified bytes.
2. Added `prisma/migrations/20261020100000_accountant_active_named_scope/migration.sql` as migration 102. It creates the partial unique index for each organization/accountant pair with a non-null scope; it never deletes, merges or revokes consent.
3. Updated `scripts/run-firm-engagement-authority-postgres.cjs` so its predecessor remains the 100-migration foundation and its upgrade applies both 101 and 102.

Migration 101 SHA-256: `84c008d40b14282b5ea78fe4cd6b9da086240d6b3e7df3fe1121e51642f9ced5`.
Migration 102 SHA-256: `a11b45efeb4b859cb22965b5367f8198d6c346b46c63224171094b538c67bde1`.

The collision fixture deliberately contains two retained active namespaces for one client/accountant. Migration 102 correctly refuses it. Prisma's CLI reports a later aborted-transaction error instead of the original duplicate-index error; the first harness expected the original text and stopped. That failed receipt is retained as `database-review.json`. The PostgreSQL server log confirms the original unique-index failure. A supplemental execution of the exact SQL returns **SQLSTATE 23505**, leaves the index absent and preserves both complete consent rows. No failed-migration resolution or consent change was performed. `database-verified.json` binds the six passing suites and supplemental proof without erasing the failed harness attempt.

Target duplicate-scope preflight, authorized consent resolution, index-lock/timeout assessment and failed-migration recovery remain rollout requirements. If a target already applied the edited variant of migration 101, its history requires explicit reconciliation through an approved process; this review does not authorize blind checksum rewriting.

## Fresh verification

| Evidence class | Result |
| --- | --- |
| Workflow/source | Workflow contract passed. 196 package scripts remain unclassified; selected runners were inspected individually. All 63 captured paths classified; all 62 requested hashes matched. |
| Strict installation | Fresh candidate-local npm ci passed: 1,340 packages, lifecycle enabled, no force/legacy-peer/ignore-scripts bypass. Package/lock hashes unchanged; Prisma generation passed. Installation receipt records the original 6,817-file/101-migration capture; the verified archive records the subsequent three repairs and 6,818-file/102-migration state. |
| Mocked/component/source tests | **425 tests / 28 suites** and **564 accounting tests / 18 suites** passed. |
| Pure archive and real React SSR | **47 archive tests / 1 suite**, **1 SSR test / 1 suite** passed. Total non-database: **1,037 tests / 48 suites**. Archive tests do not establish a production archive service. |
| Real PostgreSQL authority | **27 clean + 27 foundation-upgrade + 27 R5-upgrade tests passed**. Application/replay/checksum checks bind all 102 migrations. Retained legacy and dormant AF03 history remains unchanged; no automatic enrollment. |
| Real PostgreSQL portfolio | **6 tests passed**, including 105 grants, unsampled proof, concurrent invalidation, revocation and tenant/role/module boundaries. |
| Real PostgreSQL foundation | **26 tests passed**. Five obsolete AF03 dormant-enrollment fence cases explicitly excluded because migration 101 replaces that fence; replacement authority is covered by the 27-case suite. |
| Real PostgreSQL retention | **18 tests passed** against all 102 migrations. Total fresh database assertions: **131 / 6 suite executions**, plus five explicit historical exclusions. Separate upgrade-gap reproduction and expected collision refusal also verified. |
| Build and seal | Compilation, type checks, page generation, tracing and sealing passed in **18.64 minutes**. Next cache reused from R5; candidate dependencies were freshly installed. This is not cold-build qualification. |
| Copied standalone runtime | Artifact byte verification, login HTTP 200/form, static JS hash, native Sharp WebP optimization and ten packaged asset hashes passed. Local first successful login request: 45128 ms; not an accepted startup SLO. |
| Public browser | **208 route matrix cases**, **40 photo-preview cases**, and **8 focused interactions passed**. **One no-JavaScript check remains failed**, explicitly retained as a rollout gate. |
| Authenticated portfolio browser | Actual compiled routes and Better Auth sign-in against a fresh synthetic database: 105 authorized clients across six pages, EN/FR desktop/mobile keyboard and scoped axe checks, request recovery, portal client/period navigation, grant/permission/session revocation and module-lock isolation. Synthetic sessions revoked after capture. |
| Cleanup/custody | All frozen source hashes, source/build/artifact identity, migration checksums and closure of owned application/database ports verified. Disposable data retained; synthetic credential fixture excluded from evidence index. |

Source inspection, mocked tests, actual PostgreSQL tests and browser checks are distinct evidence classes. Browser scope: Chromium covers the 18-route public matrix; Firefox/WebKit cover four representative routes, across EN/FR, light/dark and desktop/mobile. Portfolio axe scope is the workspace only. Photo screenshots wait for the opening animation to settle; visual assessment is limited to the retained images actually inspected. No application UI change was made.

The no-JavaScript homepage heading remains hidden inside the streamed Suspense boundary. JavaScript-enabled passes do not close this S08/S09 gate. R4's stale readiness after interrupted post-commit navigation also remains unresolved; no new full onboarding-browser qualification or application fix is claimed. Reduced-motion modal acceptance, broader devices, real operators and assistive technologies remain unqualified.

All **ten lint warnings match R5 exactly**; none were added or removed. The warning comparison is recorded separately. Dependency deprecations and cache warnings remain visible. During page generation, the existing background database health probe logged connection refusal against the deliberately unavailable synthetic endpoint at 127.0.0.1:1; build success is not a database-health pass. No external alert recipient was configured. This is not a comprehensive new vulnerability audit, deployment-platform qualification or production performance certification. Unchanged payroll/AP/POS/calendar/operational outcomes remain inherited evidence with their original limits.

## Frozen identity and shared-tree drift

- Source identity SHA-256: `b276e24a36bc505a8e9b201fc8334747fff0312f982ca29486ebfd7c1b71841e`.
- Verified source archive SHA-256: `a4dba49a6c2902206fc202e1489f384b4e18b8ebdd2aa8df932079978b4c371f`.
- Artifact SHA-256: `2e95a6b8f45ee13d9294e1f079a6c7c877be68d695ef1e0ccd2a8cb5df6fc420`.
- Build ID: `Xd1aVvmKRybVoMm5mzUlx`.
- Archive: `0395643c04-verified-source.json.gz`.
- Build receipt: `37106a24f7-build.json`.
- Release ready: **false**.

At final audit, later shared-tree work contained **10 modified, 44 added and 0 removed paths**. Exact hashes are retained in `later-shared-tree-drift.json`; that work is preserved and is not certified by this artifact. This report is a post-verification document outside the freeze.

`verification-summary.json`, `database-verified.json`, `migration-identity.json`, `review-ledger.json`, `source-repairs.json`, `server-cleanup.json` and `evidence-index.json` bind the local result. Controlled handoff must retain the source archive, artifact and receipts together.

## Remaining rollout gates

| Step | Still required |
| --- | --- |
| S06 | Trusted ingress/header overwrite, origin isolation, shared limiter, representative till/NAT traffic and approved outage policy. |
| S07 | Deployed authenticated CSP journeys, supported-browser policy, render/cache measurements and activation approval. Loopback blocking does not certify deployed CSP. |
| S08 | Operator/assistive-technology acceptance, agreed task/error objectives and independent review; decide/test no-JavaScript support. Resolve or explicitly qualify interrupted-navigation stale readiness and hydration-window behavior. Modal reduced-motion acceptance remains incomplete. |
| S09 | Broader workflow/business/maintenance metrics; firm mandate consent/enrollment/assignment acceptance and AF05–AF16. Conversion unmeasured; waitlist submission simulated. Opening cutover requires source-bound scope/date/revision, domain proof, tie-out and independent approval; external AR/AP opening import unsupported. Real media storage ACL/decryption, development-target journal P2022 diagnosis and production archive authorization/privacy/consent/lifecycle/extraction/delivery/scale remain open. |
| S10 | Hosted startup/load/reconnect/recovery/queue/assets/portfolio workloads. Prior stress p95 288.62 ms exceeds provisional 250 ms; cold-pool P2028 and clock/cutoff concerns remain. Local timing is not an approved SLO. |
| S11 | Exact source/artifact custody and later-drift review; **102-migration sequencing**, original 101 checksum and additive 102, target-history reconciliation if edited 101 was applied. Duplicate named-scope preflight, authorized consent resolution, index-lock/timeout budget and approved failed-migration recovery. Managed-mandate activation and prior-app compatibility/forward/rollback plan; schema 99 rejects old unreceipted close writes. Protected checks/environments, cold-build capacity, deployment-platform Node/native runtime and hosted health/promotion/rollback remain open. |
| S12 | **No approved RPO/RTO and no named incident/recovery owner**, as confirmed by the user. PITR rehearsal, real alert receipts and legacy assurance-key stop/drain/mapping decisions remain open. |

Offline-POS P06 is distinct from S06. Production capture/economic replay remains disabled. Real device/key enrollment, policy renewal/conflict correction, persistent offline boot, power-loss/eviction durability, broader devices and another browser's never-uploaded work remain unresolved. Local queue visibility is not a global close barrier; ingestion acknowledgement is not a paid sale. P12 U17/U18 remain partial. No local pass authorizes rollout.
