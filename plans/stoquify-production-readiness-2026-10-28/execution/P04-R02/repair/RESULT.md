# P04-R02 repair — implemented and verified within isolated scope

29 October 2026. Candidate **p04-r02-20261029-e2cf325ec4db**, HEAD 80e4abb283216b9f8e04b94e5020393f7dcabf62, with 3,976 inventoried source/config/script files and a separate 19-input exercised-source binding. **Both delivery URL gates pass. P04-R02 and its parent remain blocked for full application and production admission.**

## Implemented behavior

- next.config routes /uploads/:path* to /api/uploads/:path* in beforeFiles. Middleware handles encoded, case, separator and dot-segment aliases before static skips. Both URL forms retain current session, organization, dashboard-module and dashboard.read guards.
- The image optimizer rejects local legacy upload targets before its URL-keyed cache, including encoded endpoint/target aliases. Private images must use direct, unoptimized authenticated reads. Ordinary public images and their optimizer remain available.
- Production reads exclusively from .private/uploads/<organization>/<file>; a missing private asset never falls back to public/. Local nonproduction source compatibility uses public/uploads only when private storage is absent. Known links/junctions are refused and bytes are read through one checked regular-file handle. These directories must be operator-owned, not tenant-writable; arbitrary concurrent hostile filesystem replacement is outside this trust boundary.
- Artifact version2 records original-to-private path/hash mappings. Packing retains source assets, copies legacy bytes only into runtime/.private/uploads, removes matching traced public duplicates, and rejects unsafe/ambiguous paths, changed ignored assets during build, symlinks, malformed mappings, and known private bytes renamed elsewhere. Verification rejects legacy public layouts; version1 remains accepted only when legacy assets are absent.

## Verification

| Evidence class | Outcome | Receipt |
|---|---|---|
| Mocked route/pure routing + disposable filesystem | 63/63, including actual directory junction refusal | [unit result](unit/RESULT.md) |
| Packer/verifier filesystem + mocked promotion | 52/52 | [packing report](packing/README.md) |
| Actual Next development HTTP, synthetic authority | 61/61, exit0 | [development](http/development-run-04-result.json) |
| Actual Next production compilation/typecheck + HTTP, synthetic authority | 61/61, exit0 | [production](http/production-run-03-result.json) |
| Actual packer/verifier, existing isolated mirror and stub build | 3 exact-hash private copies, zero public/renamed copies | [publication](packing/private-publication.json) |
| Existing safe-development configuration tests | 6/6; reviewed config fingerprint updated; workflow contract passes | [command review](command-review.json) |
| Preservation/source/cleanup | 19 exercised inputs current; 3 originals/mirrors/private copies unchanged; 6 fixture ports released | [integrity](final-integrity.json) |
| Independent review | See signed-off scope and remaining limits | [assessment](independent-review/ASSESSMENT.md) |

Denied absent/cross-tenant/expired/revoked/missing-permission/module-disabled fixtures return no private image bytes and perform no observed private-file reads. Authorized API and legacy GET/HEAD retain exact image compatibility and private,no-store. Cases include encoded aliases, traversal, malformed input, conditional headers, Range headers, cold optimizer requests and an actual preseeded private optimizer entry confirmed present both before and after denial. Public controls remain available. HTTP responses are tested; no browser was rendered and no real persisted session was used.

Original assets total461,134 bytes and were hashed only, never served/rendered. The unchanged three mappings are in [publication](packing/private-publication.json); no database-resident references were rewritten. The current source still retains unchanged legacy references in claimItemPictures. Nine unrelated files changed concurrently, including managed-picture code; they are preserved and explicitly outside the exercised-source claim.

## Retained failed/superseded evidence

The opening packet remains unchanged:36requests/19failed acceptance rows. Initial repair development attempt used an incorrect custom-server rewrite origin (localhost:3000), returned socket-reset errors and was stopped by verified owned PID; the corrected runners restrict HTTP to the actual allocated loopback port. Initial minimal production build failed on a synthetic error-adapter TypeScript signature, then passed after fixture correction. Initial Jest interruption and Windows sandbox junction EPERM receipts remain; unchanged scoped tests passed after permitted local execution. No failed receipt was relabeled successful. Final HTTP runs exit0; cleanup records distinguish Next close completion from owned-process exit.

## Remaining admission and exact next action

The next eligible work is **P04-R02 full-application qualification**, coordinated with P04-V02 actual-auth/browser evidence. First capture a fresh immutable candidate and create a synthetic-tenant, disposable-database full-app qualification fixture using the real session/authorization adapters and private artifact layout. Inspect its launch/build commands and targets before execution. No production data or deployment is authorized.

To advance: bind the full app artifact to that source; repeat denied/authorized GET/HEAD/conditional/optimizer cases with real signed sessions, expiry/revocation and changed grants; exercise private-image UI consumers; reconcile stored references against private mappings on the approved isolated data target; obtain independent review. Deployment-time ingress/static/CDN cache exclusion, operator-owned permissions, rolling-version compatibility and operator acceptance remain release gates. P04-R01/R03 and the finance policy decision remain separate; all57domains and deferred X01–X04 commitments are preserved.

## Recovery

Retain original assets, mirror, mapping and hashes until reference/recovery checks are accepted. If a future artifact check fails, abandon that incomplete candidate and create a fresh destination. Restore from retained copies only into private runtime storage and reverify hashes plus authorized delivery. Do not roll back to public exposure, old public-upload artifacts or an app without the optimizer guard. Treat source rollback and production recovery separately: local owned source preimages are under before-source; unrelated edits must be preserved. Hosted cache invalidation or traffic isolation is an operator cutover obligation and was not performed here.

No commit, push, production flag change, production migration or deployment occurred. Native database, actual-auth browser, full application artifact and hosted checks were not performed.
