# Hardened close: release candidate R2

Qualification date: 2026-11-11. The directory retains the original task date.

The new sealed candidate includes the close database-integrity migration and completes the local build, migration, restore, HTTPS authentication and authenticated browser checks described below. Its final machine-readable admission is [FINAL_QUALIFICATION.json](FINAL_QUALIFICATION.json). This is a Windows/x64 candidate bound to a local HTTPS origin; production deployment and database promotion have not occurred.

## Candidate identity

| Input | Identity |
| --- | --- |
| Frozen application source | 10,148 files; SHA256 `cfcac6d0dfa217f3ad18ff27d16e46a55aa002bcbf77c91afc7e0b7082bfd544` |
| Sealed artifact manifest | SHA256 `6d0147749362b359969b6113bf3e6a94918dc6df8d19ee1fcc5c208db4724d2f` |
| Build ID and packaged files | `4CtAnxpXoochpr8CsDOPH`; 6,707 files |
| Migration catalog | 123 migrations; identity `968c1f6c7c45f26a8eb8068b551e67450142fccc119b84528e4f4424c64a2e66` |
| Prisma schema | SHA256 `937754a6034b37b82c98957ebb9b70f612659d40af562967151595562acc6ef0` |
| New scope migration | `20261110190000_close_scope_integrity`; SHA256 `334b580ac161ed37b6eccd6bc33234b3aabd0d6935215d60d6dd3318166b53e7` |
| Runtime platform and public origin | Windows/x64; `https://127.0.0.1:3443` |

The retained artifact is at `E:\ohada saas\Focused projects\stoquify\.codex-tmp\close-integrity-release-20261110-cdebf2df2e\artifact`. Its original emitted digest is preserved in [ARTIFACT_EMITTED_DIGEST.json](ARTIFACT_EMITTED_DIGEST.json). The source archive, private build configuration and isolated clean installation remain in the same owned candidate cohort. Credentials and configuration values are excluded from this report.

## Blocker found and fixed

The [first candidate](../close-integrity-release-candidate-2026-11-10/RESULT.md) built successfully but failed its actual anonymous close-page recovery check: middleware redirected to Next's internal `https://localhost:3296` address instead of the configured public origin. That artifact and failed evidence remain preserved and are not admitted as successful.

The product fix is confined to [middleware.ts](../../../../middleware.ts) and [its routing regression tests](../../../../lib/security/__tests__/middleware-routing.test.ts). Redirects now use the existing trusted-origin normalizer with the established configuration precedence: `NEXTAUTH_URL`, `NEXT_PUBLIC_BASE_URL`, then `NEXT_PUBLIC_APP_URL`. They preserve locale, relative callbacks, query strings, cookies and security headers. Arbitrary forwarded host headers do not select the redirect origin. When no valid HTTP(S) origin is configured, the existing request-URL fallback remains.

Nine added regression cases failed against the original middleware; after the fix, all 35 tests in the two routing/origin suites passed. R2 was captured and rebuilt after this change. The actual sealed-runtime anonymous recovery assertion then passed with the exact public origin and relative close callback. Neither the proxy nor the assertion was changed to accept the internal address. [Redirect regression evidence](REDIRECT_REGRESSION_QUALIFICATION.json).

Preparation also encountered insufficient reserve on C:. The corrected qualification helpers require the exact owned E: artifact and temporary directories and a combined 9 GiB reserve before creation. The earlier guard failure and helper preimages remain recorded in [BUILD_STORAGE_REVIEW.json](BUILD_STORAGE_REVIEW.json). Application code, migration inputs, dependency locks and byte/source verification controls were unchanged by this storage adjustment.

## Executed qualification

Counts below describe the admitted executions once. Historical or unsuccessful attempts are not added to them.

| Evidence class | Result | Receipt |
| --- | --- | --- |
| Source inspection and isolation | Frozen source/archive checked; independent source reviews found no remaining concrete blocker in the stated scope. Clean offline locked installation used owned npm configuration and cache, skipped install scripts, and no forced peer resolution. Native Prisma, Argon2 and SWC checks passed; the shared root client remained unchanged. | [SOURCE_PREPARATION_RESULT.json](SOURCE_PREPARATION_RESULT.json), [CLEAN_INSTALL_RESULT.json](CLEAN_INSTALL_RESULT.json), [CANDIDATE_NATIVE_READINESS.json](CANDIDATE_NATIVE_READINESS.json), [BUILD_NPM_CONFIGURATION.json](BUILD_NPM_CONFIGURATION.json) |
| Mocked service/action tests | 472 passed across five suites; zero failed, skipped or todo. Executed against the frozen clean candidate and its generated default client, without a real database or application bootstrap. | [UNIT_QUALIFICATION.json](UNIT_QUALIFICATION.json) |
| Mocked routing and pure origin regression | 35 passed across two suites after the fix. Before-fix 26 passes and nine expected failures are retained as reproduction evidence and excluded from qualified counts. | [REDIRECT_REGRESSION_QUALIFICATION.json](REDIRECT_REGRESSION_QUALIFICATION.json) |
| Real PostgreSQL tests | 20 passed: 12 close-scope integrity cases and eight earned monthly-close cases; zero failed, skipped or todo. | [TEST_RESULTS.json](database-e5474a4749/TEST_RESULTS.json) |
| Fresh schema replay | All 123 migrations deployed twice to a new, previously absent database. Exact history and the unchanged certification/drift gate passed. | [fresh123.json](database-e5474a4749/fresh123.json), [replay execution](database-e5474a4749/fresh-123-replay.execution.json) |
| Synthetic database recovery | Native dump restored into a second new database. All 247 public-table profiles, sequences, migration history and retained bytes matched. Thirteen CHECK deparse differences were accepted only through the recorded PostgreSQL parser fixed-point proof; all other compared schema definitions matched exactly. | [RESTORE_RESULT.json](database-e5474a4749/RESTORE_RESULT.json) |
| Full application build and package | The unchanged named `release:artifact` pipeline passed, including its local auto-mode secret preflight, full lint, TypeScript, 11 static pages, standalone packaging and trusted-digest verification. Lint reported zero errors and 29 warnings. The package includes the default Windows Prisma engine. Exact synthetic private configuration values were absent; the three policy-managed private images were mapped into private runtime storage and their public duplicates excluded. | [FULL_ARTIFACT_BUILD_RESULT.json](FULL_ARTIFACT_BUILD_RESULT.json), [ARTIFACT_QUALIFICATION.json](ARTIFACT_QUALIFICATION.json), [configuration exclusion](ARTIFACT_SYNTHETIC_CONFIG_EXCLUSION.json) |
| Actual production-command boundary | The named `release:schema:promote` command verified this artifact, then rejected the local database target with its expected exit 1. Native V8 observations recorded one actual verification call, zero migration-lock calls and zero migration-launcher calls. PostgreSQL remained stopped. | [LOCALHOST_PROMOTION_REFUSAL.json](LOCALHOST_PROMOTION_REFUSAL.json) |
| Sealed application over HTTPS | Four checks passed: anonymous protected-page recovery; wrong-password rejection; real sign-in, secure cookie and protected SSR; real logout and old-cookie denial. | [RUNTIME_QUALIFICATION.json](RUNTIME_QUALIFICATION.json) |
| Authenticated rendered browser | Six steps and four controlled authority transitions passed in isolated Edge. Two downloaded JSON documents were each exactly 97,550 bytes and byte-identical to the retained original. The journey recorded 132 same-origin requests, zero external requests, zero page/console errors and no WebSockets. | [Browser result](browser-895f24c2aa/RESULT.json), [browser binding](browser-895f24c2aa/BINDING.json) |
| Final cleanup and binding | Browser/context closed; zero owned profiles remained. The application and proxy stopped, PostgreSQL stopped, ports were released, financial facts were unchanged, and the artifact retained its original manifest and file inventory. Final source/client binding and offline admission are recorded separately. | [Runtime result](sealed-runtime-be3da1890d/RESULT.json), [FINAL_SOURCE_BINDING.json](FINAL_SOURCE_BINDING.json), [FINAL_QUALIFICATION.json](FINAL_QUALIFICATION.json) |

The initial `npm run agent:workflow:check` passed. Package commands, registry classifications, custom runner definitions and explicit targets were inspected before execution. Application configuration, database commands, build output and rendered checks are treated as distinct evidence classes.

The actual browser journey signed in through `/en/login-v2`, recovered the retained original, expired the password proof, completed real password verification and manual retry, suspended close-module access, restored access with cleared drafts, and revoked the current browser session. Module and session denials removed the private workspace and prevented further recovery. Desktop denial screenshots were visually inspected; 1440-pixel desktop and 390-pixel mobile captures are retained. These checks do not establish comprehensive accessibility, French-language UI coverage, performance targets or every legacy close-write denial. The focused service/action suites own the stated legacy-write authority coverage. The displayed current-certification badge was observed as presentation; historical retrieval did not create a new financial approval.

## Database-integrity scope and inherited evidence

The candidate includes the additive scope controls from the [database-integrity review](../close-db-integrity-2026-11-10/RESULT.md): fourteen composite foreign keys, six supporting unique indexes and seven immutable-identity guards. They enforce the tested organization, period, run and parent lineage while retaining all 26 original core foreign keys, permitted nullable associations, legitimate updates and deletion behavior. The post-migration SQL inventory remained 149 triggers, 231 CHECK constraints and 77 public functions. Actor authority, module access and fresh authentication remain service controls.

The earlier populated 122-to-123 upgrade, older-client compatibility and rejection of fourteen corrupt predecessor categories were not rerun here. Their [existing admission](../close-db-integrity-2026-11-10/FINAL_QUALIFICATION.json), all pinned evidence and the candidate's corresponding source/import closure were rechecked against exact inputs. [Inherited admission binding](database-e5474a4749/INHERITED_UPGRADE_ADMISSION.json). Their cases are not included in the 20 new PostgreSQL tests.

Structural fixtures use synthetic OPEN/DRAFT records and an explicitly uncertified custody sentinel. Separately, monthly cases earn internal approvals, retained-pack certification and an October seal from synthetic provider observations. They also cover denial, replay, fault rollback and actual POS/receivable collection contention. The primary monthly cohort has an opening receivable and collections, with zero sales, payroll runs or statutory certified documents. This is scoped close/integrity evidence, not qualification of every sales producer, provider authenticity or statutory certification.

## Isolation and remaining production requirements

The two new databases are `stoquify_replay_close_monthly_20261110_e5474a4749` and `stoquify_restore_close_integrity_rc_20261110_e5474a4749` on the exclusively owned loopback PostgreSQL 17 cluster. Existing databases and failed attempts were not reset, dropped or relabelled. The cluster is stopped. Unrelated working-tree changes and the shared generated client were preserved. No production database, deployment or live customer message was used.

No concrete blocker remains in this qualified local close-workflow scope. Production still requires a chosen host/platform and HTTPS domain, a candidate built for that platform and correct public origin, production database adoption and hosted recovery evidence, live statement-delivery/invitation and worker configuration, target-scale migration rehearsal, and the existing independent release/domain gates. The production-mode configuration preflight intentionally remains blocked here by disabled live statement delivery and accountant invitations; compilation does not clear those gates. [Selected production preflight](PRODUCTION_SECRET_PREFLIGHT_CONFIG_ISOLATED.json).

Migration 123 acquires an exclusive nine-table lock cohort with a five-second lock timeout and a 120-second per-statement timeout. Production promotion needs a planned writer-quiescence window and target-scale timing. Existing corrupt records intentionally block it and require a separately reviewed repair plan; it does not repair or delete them. A successful database promotion is not reversed merely by reverting application source. Local synthetic restore results do not establish hosted recovery objectives or production-scale availability.
