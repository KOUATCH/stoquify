# P04-R02 sealed HTTP qualification plan

Status: prepared for parent review/execution. The route reviewer has not executed the runner or changed application code. Canonical package ID is P04-R02; the earlier route-review proposal `P04-R01-LEGACY-MEDIA-BOUNDARY` is an alias, not a second repair package.

## Scope and snapshot

`snapshots/before/source-manifest.json` binds eleven current files by SHA-256. Seven files are materialized into the fixture: the exact middleware and upload route plus their localization/session-recovery/traffic/CSP helpers. The current `next.config.mjs`, server-authz, RBAC and auth-session sources are archived for inspection; they are not executed in the sealed fixture.

The API boundary is `requireApiSessionForCurrentOrg` -> live RBAC (`disableCookieCache`, stable subject ID, current active tenant user, same-tenant roles) -> matching organization path -> enforced dashboard module -> `dashboard.read` -> validated image name -> file read. Middleware currently passes static filename paths without this chain. The earlier P04 synthetic component reproduction established that a parallel public transport can bypass it; this package uses the installed Next HTTP router to qualify both URL forms.

`legacy-upload-path-inventory.json` records three real workspace paths and file sizes using directory metadata only. No image bytes were read, copied or served. Data-owner confidentiality classification, deployment inclusion and legacy reference mappings remain separate checks.

## Runtime design

The parent copies `next-http-runner.cjs.source.txt` to a fresh ignored `.codex-tmp` child, then invokes that materialized file with the repository root, the absolute `snapshots/before` directory and `before`. A subsequent repaired snapshot must live in a different directory and retain the before evidence.

The runner creates another unique `.codex-tmp/p04-r02-next-*` fixture, prints its path immediately, verifies every archived source hash and writes a minimal Next application. It starts the installed Next **development HTTP router** on `127.0.0.1` port 0. It does not call repository npm scripts, their lifecycle hooks, a full application build, database client or provider SDK.

The exact middleware and upload route compile in the fixture. An explicitly synthetic server-authz adapter provides absent, cross-tenant, revoked, expired, missing-permission, disabled-module and valid actor states. Synthetic revoked/expired results exercise the route's denial branch; they do not prove Better Auth session behavior. A small synthetic JSON-error adapter prevents importing application logging/database graphs. The fixture's image policy is statically extracted from the archived literal `images` object; the actual application config/plugin is not executed. Nonliteral image configuration fails preparation for review.

Distinct private/public PNGs are generated from synthetic pixel values. Filesystem hooks record access/readFile/readStream operations on the private sentinel and reject real upload reads or `.env` reads. Normal missing-file existence checks remain possible. HTTP/fetch calls reject non-loopback destinations; the executor's sandbox remains authoritative. The parent must scrub application secrets before launch. Next compilation output, fixtures and results stay inside the unique ignored directory.

## Acceptance matrix

The runner issues 36 HTTP requests and retains all results before assessing acceptance.

| Case | Required post-repair outcome |
|---|---|
| API and legacy URL: absent, cross-tenant, revoked, expired, missing-permission, disabled-module | 4xx, no private body and no private-file I/O |
| API and legacy URL: valid same-tenant actor | 200, exact private sentinel, private/no-store cache policy |
| API and legacy HEAD, no actor | 4xx and no private-file I/O |
| API and legacy HEAD, valid actor | 200, zero response-body bytes, private/no-store |
| Encoded filename/namespace/slashes, double encoding, case variant and query suffix | Anonymous alternate paths reveal no private bytes and perform no private-file I/O |
| Authorized API encoded filename | Valid authorized read still succeeds |
| Encoded API traversal | 4xx before private-file access |
| Anonymous conditional legacy read after a valid request; anonymous API read after valid request | No authorization inheritance from previous response/cache |
| Next image optimizer: legacy cold/warm/encoded source and API source with/without outer valid actor | No private optimized image or private-file I/O; authenticated private delivery must not become a shared image cache |
| Ordinary public image, direct and optimizer | 200; avoids satisfying private checks by breaking unrelated public images |

The intended compatibility contract explicitly preserves valid reads on **both** URLs. Unconditionally blocking the legacy URL cannot pass acceptance.

## Result semantics

`harnessCompleted` means transport requests completed. `acceptancePassed` separately reports the complete acceptance matrix. The vulnerable `before` run should complete and retain `acceptancePassed: false`, with exact failed rows. A successful reproduction is not a security pass. The `before` process may exit zero when its expected vulnerable reproduction completes; callers must inspect the acceptance field. The `after` process exits nonzero for any acceptance failure.

The result also records source hashes, installed Next version, literal image policy, synthetic image hashes, response status/type/cache policy, private-file I/O, guard trips and remaining gaps. `runnerFailure` is distinct from an application acceptance failure. Startup failures still write a result and close any prepared Next app/listener where possible. The early fixture path allows bounded cleanup if the outer executor times out.

## Execution and remaining limits

Review the archived runner before launching it. Use the parent's scrubbed child environment and bounded timeout; copy only the materialized runner, not repository `.env` files. Preserve the emitted result and logs in the P04-R02 evidence folder. Do not delete or move legacy upload files during this qualification.

This is real installed Next routing in a minimal development fixture with an explicit synthetic authorization adapter. It is not a current full-application artifact, real session/database negative test, production CDN test or deployed ingress certification. Development image-cache behavior cannot establish production cache lifetime or purge success. Any preexisting optimized/cache copies need separate release cache inventory and invalidation evidence. Real deployments may also serve the public directory outside Next middleware; that boundary remains an operator acceptance requirement.

First action after review: execute the archived **before** snapshot through the isolated runner and preserve the failed acceptance rows. Only then choose a bounded repair, obtain independent review and refresh a separate snapshot for the same matrix. No repair implementation is included here.
