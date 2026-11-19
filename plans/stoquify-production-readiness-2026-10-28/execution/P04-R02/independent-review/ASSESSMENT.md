# Independent assessment of the P04-R02 opening slice

29 October 2026. **Assessment accepted as bounded characterization; P04-R02 remains BLOCKED.** No application repair was implemented or qualified in this slice. P04 and its dependent production gates must not advance from these results.

Reviewed the source/asset candidate binding, inventories, archived HTTP runner and captured source definitions, publication harness and receipt, all 36 HTTP result rows, launcher/log, final integrity, drift disposition, advancement gates and final RESULT/NEXT records. The prior source design review is a recommendation only. This reviewer did not run the application, database, tests or browser and did not change application or register files.

## What the evidence establishes

- The source snapshot identifies 3,970 files at HEAD `80e4abb283216b9f8e04b94e5020393f7dcabf62`. The source/asset binding is `p04-r02-20261029-9599061e526c`. Three separately inventoried ignored legacy assets total 461,134 bytes. Independent SHA-256 checks confirm each original, isolated mirror and synthetic packed artifact copy matches the recorded asset hash. Image contents were not rendered or interpreted, and actual legacy asset bytes were not served by the HTTP fixture.
- Reference discovery covers 3,896 source files, 43 lexical reference rows and 16 JSX image candidates. These are discovery counts, not an exhaustive semantic review. Selected producer/retained-reference/consumer callchains were traced. No live database URL census, production ownership mapping, hosted object inventory or orphan classification is established.
- The actual release packer, with build invocation stubbed and synthetic standalone structure, publishes all three asset copies under `runtime/public/uploads/...`. Its source hash matches the receipt. This proves the packing behavior under the fixture; no real build or deployed artifact was inspected.
- The archived runner hash is `b790548e120990b1f0cf638b80c9dce489dbc8464463daf7a62354224346cdb8`. It compiles the captured middleware and upload GET through installed Next 15.5.27 development HTTP routing, with explicit synthetic authority and error adapters. The fixture extracts only the literal image policy from application configuration. It does not exercise actual Better Auth, database authority, the full application configuration/plugin or a production build.

The HTTP matrix completed **36 requests: 17 met the specified acceptance and 19 failed it**. No runner failure was recorded during those requests. This is a successful reproduction of a failing security boundary, not a passing repair test:

| Boundary | Observed result |
|---|---|
| API denial branches | Six denied actor adapters received 401/403, without private sentinel bytes or observed sentinel-file I/O. These adapter labels do not prove real session expiry/revocation. |
| Authorized API read | Valid direct and encoded-filename requests returned the exact synthetic bytes with private/no-store. Authorized HEAD also retained private/no-store. |
| Legacy static path | Every denied actor adapter received HTTP 200 and the exact synthetic private image. Several encoded namespace/separator forms, the query variant and the case variant also returned it. Valid legacy GET/HEAD remained public-cache responses. |
| Optimizer | Anonymous cold and encoded legacy requests returned HTTP 200 image/png derived from the private file. The cross-tenant warm request returned the identical transformed image hash without a new observed sentinel read. |
| Optimized API / public controls | The protected API optimizer requests returned 400, reflecting absent credentials on internal fetch. Both ordinary public image controls remained available. |

The optimizer result is especially important: `privateSentinelEquals: false` compares against the original PNG bytes and does **not** imply denial after transformation. Cold, warm and encoded optimized private responses share hash `dc9a4cfee7803ca29e80d0aa2db39e1b59a3d73cb69c4e6deeef4e954e1c5564`, distinct from the public control. This establishes reuse across synthetic actor contexts in this development fixture; production cache lifetime, CDN exposure and purge behavior remain untested.

## Cleanup and evidence applicability

HTTP result persistence precedes cleanup. The development process retained handles and required explicit termination of the verified owned runner PID 13976 (parent 34076). The launcher records exit 1 without timeout; the cleanup receipt records targeted taskkill success and released loopback port. There was **no clean automatic process exit**. Completed request observations remain usable, with this cleanup limitation retained.

The strict final integrity check is failed: six unrelated captured disposable/statutory sources changed concurrently. The changes are listed in `drift-disposition.json`, preserved and outside this exercised chain. Independently rehashed all 11 HTTP source-manifest entries and the release packer; they still match their captured identities. Original/mirrored assets also match. Thus the fixed upload-path evidence remains applicable, but the whole 3,970-file candidate is not stable and cannot be qualified as a current combined release. Refresh and isolate the next repair candidate before changing application source.

## Remaining repair acceptance

The current failed static/encoded/optimizer and public-artifact gates must remain failed. The API positive controls show existing behavior to preserve; they do not establish preservation after an unimplemented repair. A future repair must retain both valid URL contracts while preventing unauthorized bytes and removing public runtime copies, with originals and reference mappings preserved.

Before reuse for an after comparison, the fixture must incorporate the actual reviewed routing change: it currently copies image policy only, so a newly introduced before-files rewrite would otherwise be absent. Add the remaining relevant range/conditional, malformed-encoding/backslash/repeated-separator and filesystem-link cases; current coverage is bounded. Establish real signed-session denials and current full-application artifact behavior in the corresponding qualification lanes. Verify direct/unoptimized private rendering where applicable. Existing hosted copies and old optimized caches require explicit deployment/cutover evidence; no production move, deletion, purge or data rewrite was performed or authorized by this characterization.

The advancement gate disposition is sound: inventory and API controls are scoped evidence; legacy access, shared optimization and public packaging block advancement. Independent-review acceptance means the opening assessment is trustworthy within these limits. It must not set P04-R02, P04 or a production gate to verified.

Final packet consistency review found no material correction needed. The register retains P04-R02 and P04 as blocked, with the existing 54-package / 183-edge dependency graph and unrelated packages unchanged. The exact next action is a separately reviewable repair from refreshed isolated source, not a claim that this opening slice implemented that repair.
