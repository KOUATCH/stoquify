# P04-R02 — refreshed candidate, isolated upload inventory and two-path tests

29 October 2026. **Opening slice completed; advancement BLOCKED.** Current delivery behavior does not meet the requirement that denied requests expose no private bytes. No application repair was implemented in this inventory/testing slice.

## Candidate and inventory

The refreshed [source snapshot](candidate-before.json) records 3,970 source/configuration/script files at HEAD 80e4abb283216b9f8e04b94e5020393f7dcabf62. No prior P04-captured source differed at refresh time. The source-plus-asset binding is **p04-r02-20261029-9599061e526c**, recorded in [candidate-binding.json](candidate-binding.json). This is scoped source evidence, not a built release artifact.

[asset-inventory.json](asset-inventory.json) records **three JPG files, 461,134 bytes**, copied into an isolated mirror and verified byte-for-byte. All originals and mirrored hashes still match. Actual asset contents were not rendered or served; HTTP tests used distinct generated synthetic images.

The [reference inventory](inventory-review/README.md) lexically/structurally scanned 3,896 source files, finding 43 upload references and 16 image-rendering candidates. Eight relevant callchains were manually traced. These counts do not imply 3,896 deep semantic reviews. Current managed upload producers differ from the historical graph's removed local writers; legacy URLs are still retained in item flows. Existing source/control contracts distinguish the legacy org/dashboard permission from managed inventory/POS media policy.

No live database, provider or deployed CDN was queried. Stored production references, external copies and orphan status therefore remain outside this inventory. Ignored files under public/uploads are still included by current release packing.

## Executed tests

The reviewed harness materialized archived current middleware, upload GET and pure supporting code into a new ignored fixture. It ran the installed **Next 15.5.27 development HTTP router**, with explicit synthetic authority and safe-error adapters. This is stronger than direct handler invocation for routing behavior, but does not qualify actual Better Auth cookies, a full current application build, hosted ingress or production cache state.

**36 HTTP requests completed: 17 acceptance rows satisfied, 19 failed.** [Full results](http-before-01-result.json) preserve every request and expectation. Harness completion and security acceptance are separate.

| Boundary | Observed result |
|---|---|
| API: absent, other-tenant, revoked, expired, missing-permission and disabled-module adapter states | All six returned 401/403 without private bytes or observed sentinel-file reads. These are supplied admission states, not real signed-session revocation tests. |
| API: authorized, encoded filename and authorized HEAD | Exact private bytes returned for GET with private/no-store; HEAD returned 200 with no body. Authorized reads continue working. |
| Legacy URL: the same six denied states | All returned 200 and exact private synthetic bytes with public cache headers. |
| Legacy URL: authorized GET/HEAD | Bytes remain available, but public cache policy fails the private-delivery contract. |
| Encoded legacy aliases, query variant and Windows case variant | Six of seven tested variants returned private bytes; the double-encoded variant returned 404. |
| Unauthorized legacy HEAD and conditional request | HEAD returned 200; the conditional GET returned private bytes. |
| Legacy image optimizer: cold, cross-tenant warm and encoded source | All returned 200 with the same transformed private-image hash. Warm access required no new observed private-file read. |
| Private API image optimizer | Returned 400 without private-file reads, including after authorized direct access. Optimizer internal requests do not retain caller credentials. |
| Ordinary public image and optimizer controls | Both stayed available with 200 responses. |

The optimizer output differs from the original PNG bytes; privateSentinelEquals:false is **not** evidence of denial for these transformed responses. The cold/encoded reads, route identity, matching private transformed hashes and distinct public-control hash establish the observed synthetic optimizer exposure/reuse. No production CDN behavior is inferred.

The [packing characterization](publication-characterization.json) invokes the actual current packer against an isolated mirror and synthetic standalone structure, with build invocation stubbed. It published all three preserved asset copies under runtime/public/uploads with matching hashes. No real build or artifact server was started. This proves current copy behavior, not deployed exposure.

## Advancement gate

[advancement-gates.json](advancement-gates.json) remains blocked:

- Denied legacy, encoded and optimizer paths expose private bytes.
- Authorized legacy responses remain publicly cacheable.
- The current packer publishes private legacy copies beneath the runtime public directory.
- Full application/session, hosted cache/ingress, remaining normalization and filesystem-link cases still require repair qualification.

The current HTTP fixture copies only the images policy from next.config. A future beforeFiles rewrite must be added to the reviewed fixture/candidate configuration before an after-run can qualify it. Range, repeated-slash/backslash/malformed-encoding and filesystem-link cases are explicit future obligations; this matrix is not exhaustive URL coverage.

## Preservation and cleanup

All 11 archived HTTP source inputs and the packer still match current bytes; all three original and mirror assets remain unchanged. Six unrelated disposable/statutory source files changed during this task. They were preserved. The strict whole-candidate check remains failed in [final-integrity.json](final-integrity.json); [drift-disposition.json](drift-disposition.json) records the narrow evidence applicability. The next repair must refresh/isolate its candidate.

All 36 request results were saved before cleanup. The Next development runtime retained process handles after shutdown; only its verified owned PID 13976 was terminated. The launcher exit 1 is retained, not called a clean automatic exit. An independent bind/close check confirmed port 59405 is released. Environment/real-upload read guards recorded no attempted forbidden reads. No database, production flag, live asset migration, deployment, commit or push occurred.

## Exact next action

Prepare the bounded R02 patch from a refreshed isolated candidate: route existing legacy URLs through the same current server authorization **before static resolution**, and copy legacy runtime bytes into private storage while excluding all public/traced duplicates. Preserve originals, hashes and stored URLs. Keep private images on direct unoptimized delivery; do not forward credentials into a shared optimizer cache.

Then rerun this matrix plus the remaining edge cases against the actual repaired configuration and sealed artifact. Advance only when denied API/legacy/optimizer requests return no private bytes, authorized reads return the exact originals, artifact/public-path inspection passes, reference/recovery mappings reconcile and independent review accepts. Any hosted cache removal or production asset transition requires its separately authorized operator procedure.

See [independent assessment](independent-review/ASSESSMENT.md) and the updated [work register](../../work-register.json). P04-R02 and parent P04 remain blocked; unrelated packages, all 57 domains and deferred commitments remain unchanged.
