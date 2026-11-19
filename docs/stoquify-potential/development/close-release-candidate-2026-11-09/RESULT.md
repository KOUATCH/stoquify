# Hardened close workflow: new release candidate

9 November 2026. **PASS_LOCAL_CANDIDATE_WITH_PRODUCTION_GATES**.

The hardened close workflow has a newly built and locally qualified standalone artifact. All selected functional checks passed. The application and PostgreSQL are stopped. No production migration or deployment was performed.

## Candidate and artifact

| Item | Qualified identity |
| --- | --- |
| Build ID | `wMWHmuVfpeP275uc-dCjr` |
| Source files | 9,508 |
| Source manifest SHA-256 | `8c9723660c455a3cea75b4ab774d91844418e9397d7ed35da47fceef389168b3` |
| Artifact manifest SHA-256 | `d925ed1f841c6d267d12108b7fd23361b3cee581f38adae78b8b1526aaa050d9` |
| Runtime files | 6,707 |
| Platform and public origin | Windows x64; `https://127.0.0.1:3443` |

Candidate: `E:\ohada saas\Focused projects\stoquify\.codex-tmp\close-release-20261109-9cf90a4714\candidate`.

Artifact: `C:\Users\J COMPUTER\.codex\visualizations\2026\11\02\01a19e00-6435-7443-92d6-f2cf160728a8\close-release-20261109-9cf90a4714-artifact`.

The trusted artifact digest was captured directly from the first successful unchanged packager output. The repository verifier checked every runtime file and the exact candidate source identity. Private synthetic configuration was excluded from the artifact. Three policy-pinned legacy images were retained in the approved private mapping, with their independent input archive and policy hashes.

See [final qualification: 477 bound receipts](FINAL_QUALIFICATION.json), [source manifest](CANDIDATE_SOURCE_MANIFEST.json), [artifact qualification](ARTIFACT_QUALIFICATION.json) and [emitted digest](ARTIFACT_EMITTED_DIGEST.json).

## Verification results

| Evidence class | Result |
| --- | --- |
| Repository workflow contract | Passed; 196 package scripts remain outside its reviewed manifest |
| Frozen-candidate close unit/action-boundary tests | 516 passed; 5 suites; no failures or skips |
| Artifact/promotion/private-upload controls | 84 passed; 2 suites; no failures or skips; filesystem fixtures and mocked collaborators |
| Fresh migration replay | All 121 migrations, second deploy and catalog/history checks passed |
| Real PostgreSQL authority tests | 40 passed; no failures or skips |
| Real PostgreSQL close-service tests | 5 passed; no failures or skips |
| Full unchanged release pipeline | Passed: secret preflight, lint, compilation, types, static generation, standalone packaging and verification |
| Actual sealed-artifact HTTPS checks | 22 passed |

Lint reported zero errors and 28 warnings. Webpack also reported a dynamic-import cache-dependency warning from `next-intl`; compilation succeeded. Full build and packaging took approximately 21.3 minutes. No build, lint, type, tenant, module, session or fresh-authentication guard was bypassed.

### Database and actual service behavior

The new database `stoquify_replay_close_authority_20261109_2f40ef5057` was created in the owned local PostgreSQL 17 cluster at `localhost:58033`. Existing databases were neither reset nor dropped. Migration SQL and checksums matched the frozen candidate.

Schema certification returned `READY_WITH_INTENTIONAL_RESIDUAL_DRIFT`: the existing 240 classified residual statements remained, with zero unexpected drift. This is not a zero-drift schema assertion.

The 40 helper tests exercised actual persisted authority, exact-session matching, module and permission denials, observed competing session/role/module revocation locks, rollback and password assurance expiring during a real lock wait.

The five service tests exercised actual candidate code and PostgreSQL persistence: assessment, assignment, comment, waiver request, requester self-approval denial, independent fresh approval, advisory review and draft export. An injected tenant-scoped audit failure rolled the comment back. All eight writers denied each of three committed revocations—24 denied calls—with unchanged scoped business counts. Temporary fault-injection SQL was removed; the SQL inventory remained unchanged.

The deliberately incomplete setup remained **BLOCKED**. Its draft was explicitly uncertified, and certified export was refused. No journal, sale or customer-settlement rows were created. This qualifies the hardened authority boundary; it does not manufacture an earned close certificate.

See [PostgreSQL result](pg-LATEST.json) and [public synthetic fixture](pg-FIXTURE_PUBLIC.json).

### Authenticated artifact interface

A second fresh database, `stoquify_runtime_close_20261109_bb03af1c82`, received all 121 migrations with matching checksums. The sealed standalone artifact ran behind an owned local HTTPS proxy using synthetic credentials and disabled live delivery.

The 22 checks verified actual sign-in and persisted secure session, authenticated close-page SSR, a real persisted comment whose author ignored spoofed client authority, actual password step-up, eight suspended-module denials, two stale-assurance denials and eight revoked-cookie denials. Denials preserved business rows. Final counts were one comment, zero exports, zero sessions and zero financial rows.

Artifact bytes were identical before and after the run. Both the application and database stopped successfully. These are actual HTTP/SSR and server-action checks; no hydrated-browser, visual or accessibility qualification is claimed. See [runtime result](RUNTIME_HTTP_RESULT.json).

## Blockers resolved and provenance preserved

Storage review reclaimed only ten obsolete generated webpack-cache files (1,990,938,514 bytes). The prior frozen source, installed dependencies, non-cache output, qualified artifact and evidence were preserved. Capacity was checked against measured compiler/artifact footprints with explicit reserves.

The first local Git reconstruction was refused by the sandbox's MSYS resource restriction. Its original source archive and failure receipts were retained, and reconstruction resumed with the required Windows execution capability. The orphan-process guard stayed enabled.

The slow initial dependency copier was stopped by verified owned PID. Recovery retained 64,750 correct files, copied the remaining 7,264, found no mismatches, and compared every source/destination file by SHA-256. All 72,014 files (1,175,733,068 bytes) matched. This is verified reuse of the prior locked installation, **not a new clean-install claim**.

Review also repaired local runner cleanup, capacity, private-input retention and digest/log handling before execution. No additional application-source blocker was found. [Source comparison](SOURCE_DELTA.json) confirms exactly the nine intended hardening application/test changes and 207 evidence changes since the prior candidate. The final verifier independently confirmed the prior candidate and trusted artifact bytes unchanged.

## Promotion boundary

This is a local Windows/loopback release-candidate qualification. Strict production preflight remained blocked on the two expected disabled delivery gates: live statement delivery and live accountant invitations. Real provider configuration, correct production origin/platform, hosted promotion, operational recovery objectives and production approvals remain separate requirements.

The earlier close audit's separate signature admission, account coverage, retained export, assignee eligibility, waiver-policy and UI/cache items are not closed by this authority slice. No earned READY/T4 evidence, statutory approval or certified close pack is claimed.

No schema change was introduced by the hardening patch. Retain the reviewed artifact digest and exact bytes for any later promotion; do not rebuild after promotion. Source rollback must preserve unrelated working-tree edits and does not undo database data.

Selected skill: `aqstoqflow-release-verification-foundation`, applied within the requested hardened-close boundary and existing repository release controls.
