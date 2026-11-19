# AF16 local artifact and runtime assurance

26 October 2026. **Full application build, artifact sealing and digest verification PASS. Eight isolated HTTP checks PASS on a diagnostic retry; the initial 30-second public-page timeout is retained. Fresh lockfile installation with lifecycle scripts disabled also PASS. AF16 remains IMPLEMENTED_UNVERIFIED for release; production NO_GO; pilot PILOT_PREPARED with live validation deferred.**

## Verified candidate and artifact

Reused Stoquify's source-snapshot, secret-preflight, lint, safe-build, release-artifact and AF16 database controls. The frozen candidate contains 7,916 source files from HEAD 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886 plus captured local changes. Its independent index, dependencies and build output are isolated from the primary checkout. Environment files were excluded. The [source manifest](2026-10-26-run-02/source-manifest.json) identifies the exact tested bytes; later primary-checkout changes are not covered automatically.

The private source archive SHA-256 remains 0db1890ac0c8463838bc1910884cb9480c51750a8047b6658cb56b408c76b567. Build dependencies were the retained installed copy: Next 15.5.27, React 19.2.6 and Prisma 6.19.3. The separate fresh installation below did not replace that dependency tree.

| Artifact identity | Recorded value |
|---|---|
| Build ID | eoW9-NZPj4rd9OHTZxMDM |
| Sealed runtime files | 5284 |
| Manifest SHA-256 | 987da3ead9c716cdbf5d2a22ac1723aa8a8ed15113f40a6b8abd3c1fb64d151f |
| Retained artifact | .codex-tmp/af16-artifact-20261026 |
| Source candidate | .codex-tmp/af16-release-20261026 |

The digest was captured immediately from the produced artifact and supplied to the independent verifier. Local content verification is not a signature, immutable artifact store or deployment authorization.

## Actual verification results

| Check | Result | Evidence class and limit |
|---|---|---|
| Workflow contract | PASS; 196 scripts unclassified | Read-only contract check; no registry hash refresh |
| Frozen source and database prechecks | PASS | Exact file hashes and 120 migration names/checksums before building |
| Synthetic secret preflight | CONDITIONAL; 2 disabled-live-delivery warnings | Fresh synthetic secrets; release enforcement off; not production-secret approval |
| Configured full lint | PASS; 0 errors, 24 warnings | Warnings retained; no suppression |
| Application compilation | PASS in 14.3 minutes | Actual full application compiler |
| Next type gate and page generation | PASS; 11/11 static pages | Complete Next pipeline, not a separate tsc test count |
| Full build and artifact sealing | PASS; 47.3 minutes overall | Normal cleanup removed incomplete output; valid final output; no remaining build chains |
| Independent artifact verification | PASS; 105.0 seconds | Source identity, manifest digest and every sealed file checked |
| Isolated runtime | PASS on retry; 8 HTTP checks | Initial public request timed out at 30 seconds; retry limit 120 seconds. No latency/SLO, authenticated browser or TLS claim |
| Fresh locked installation | PASS; 1,340 packages in 16.2 minutes | Lifecycle scripts disabled; not a full clean-install build or native-module qualification |
| Final synthetic database observation | 0 users, 0 organizations, 120 migration records | Guarded read-only counts; no new migration or real enrollment |

Receipts: [build log](2026-10-26-run-02/artifact-build-attempt-5.log), [build exit](2026-10-26-run-02/artifact-build-attempt-5.json), [artifact verification](2026-10-26-run-02/artifact-verify-attempt-5.json), [initial runtime timeout](2026-10-26-run-02/artifact-runtime.json), [loopback-origin mismatch](2026-10-26-run-02/artifact-runtime-retry.json), [final runtime retry](2026-10-26-run-02/artifact-runtime-attempt-3.json), [locked install](2026-10-26-run-02/locked-install.json) and [database observation](2026-10-26-run-02/build-database-after-attempt-5.json).

## Runtime and dependency scope

The runtime check reused the existing release verifier and S11 outside-repository copy pattern. It verified copied bytes before starting the sealed server on a temporary 127.0.0.1 port. Fresh synthetic configuration and the guarded AF16 database were used; live statement and invitation delivery stayed disabled. No application environment files or workspace dependency fallback were used.

The initial server started in 1.647 seconds, but its first public-page request exceeded the 30-second check limit; no page check completed. That failure and server shutdown were retained. Source inspection found in-process session lookup and local rendering in the public route. No application fix was made. A diagnostic retry used a 120-second limit: English public HTML took 34,885 ms (headers at 16,349 ms), and login HTML took 536 ms. It then stopped because the harness expected a 127.0.0.1 redirect origin while Next returned localhost. The installed next/dist/server/web/next-url.js explicitly normalizes loopback aliases to localhost.

The final retry used localhost consistently for requests/configuration, verified that DNS resolved only to loopback, retained the strict 127.0.0.1 listener and same-origin redirect assertions, and reused the copy only after matching every file to the verified manifest. It recorded route/status/header/body timings; its slowest completed check took 25943 ms. Both earlier failure receipts remain. A passing retry does not establish acceptable cold-start latency or production responsiveness.

The eight final retry checks covered English/French public and login HTML (four HTTP 200 responses), anonymous accounting-dashboard redirects to the corresponding login page with the callback path retained (two checks), and a public asset plus a Next static asset whose served bytes matched their sealed hashes (two checks). The sealed source/artifact were reverified after requests. The child server was stopped and the copied runtime retained. These are HTTP checks, not screenshots, accessibility scans, authenticated financial journeys, TLS proof or previous-application rollback. The build used public origin https://127.0.0.1:3186; future authenticated browser checks must account for bundled public configuration and verify origin/cookie behavior with an isolated local HTTPS setup. Changing runtime environment variables alone does not replace already-bundled public values.

The independent install used npm ci --ignore-scripts --no-audit --no-fund in a fresh private directory with empty task-owned npm configuration and cache. Package.json, package-lock.json and the vendored SheetJS archive matched the frozen manifest; the archive also matched lockfile SHA-512 integrity. Installation inputs stayed unchanged, and the six recorded key package versions matched the retained candidate. npm reported a better-call/zod peer warning and existing package deprecations. No version was changed and no vulnerability audit ran. The receipt lists all skipped lifecycle packages. Client generation, native/lifecycle validation and a build from that fresh install remain separate work.

## Earlier attempts and changes retained

| Attempt | Historical outcome |
|---|---|
| 1 | Process guard blocked a competing build after lint |
| 2 | Early guard blocked the same competing process before lint |
| 3 | Compilation passed in 15.9 minutes; type gate passed; page-data collection began, then the 30-minute build and 40-minute outer budgets expired |
| 4 | Lint passed; a new competing build appeared before compilation and the second guard refused it |
| 5 | Waited for the competing build to finish, then completed the guarded artifact pipeline and independent verification |

All earlier logs and receipts remain. Prior summary, cleanup and publication receipts are preserved with attempts-1-2 and attempts-3-4 suffixes. No other task's processes were stopped. The AF16 runner uses a bounded 60-minute build budget and 90-minute outer budget; it retains process, source, database, cleanup, lint, type and artifact controls. The existing compiler dependency-cache warning and 24 lint warnings remain visible.

This continuation added the bounded locked-install probe and executed the prepared runtime verifier. It changed no application business logic, migrations, dependencies, permissions or command-registry hashes. Current helper hashes are in [orchestration sources](2026-10-26-run-02/latest-orchestration-sources.json). The candidate, sealed artifact, synthetic database files and runtime copy remain retained; final service cleanup is recorded in cleanup.json.

## Remaining release decision and next step

The local artifact and anonymous HTTP runtime gaps are now closed for this exact candidate. Production remains NO_GO and AF16 IMPLEMENTED_UNVERIFIED because the remaining selected-scope browser checks, prior-application compatibility/rollback, clean build from the fresh dependency install, agreed performance budgets and AF11 qualified country evidence are still open. Hosted promotion and operations also require separate authorization and evidence. Live pilot validation remains deferred; AF14 and AF15 remain excluded.

No new unit suites, migration runs or authenticated browser checks ran in this continuation. The 25 October regression, database and browser results remain historical evidence with their original scope. Starting and stopping the current artifact is not proof that a predecessor application works against the expanded schema.

Ready-to-use next prompt:

> Continue AF16 from the verified artifact and BUILD_ASSURANCE_2026-10-26.md. Reuse build eoW9-NZPj4rd9OHTZxMDM and its recorded manifest digest; verify those exact bytes before use and do not rebuild or silently refresh the frozen candidate. Map the remaining authenticated browser journeys against RELEASE_SCOPE.md and the 25 October evidence, then execute the missing synthetic workflows with fresh authority, denial, recovery and export checks. Reuse the existing fixtures and guarded local database controls. Assess prior-application rollback only against an identified retained predecessor; do not substitute current-app restart or SQL-only upgrade proof. Record the fresh-install lifecycle/clean-build gap separately. Update the roadmap and matching Markdown/PDF reports with actual outcomes. Keep live enrollment, delivery, deployment, AF14/AF15 and qualified-country claims deferred.

See [development result](RESULT.md), [release decision](GO_NO_GO.md) and [current summary](2026-10-26-run-02/verification-summary.json).
