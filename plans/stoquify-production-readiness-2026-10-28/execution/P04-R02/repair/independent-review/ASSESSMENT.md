# Independent assessment of the R02 repair

29 October 2026. **PASS_SCOPED for the reviewed implementation and isolated verification. P04-R02 remains BLOCKED for broader qualification; P04 and production gates must not be promoted.** No unresolved implementation defect was identified in the reviewed upload boundary. This is not a full-application or deployed security certification.

Reviewed the actual middleware, before-files rewrites, legacy route, new routing/storage helpers, release packer and focused tests; inspected harness definitions, per-case results, packing manifests and integrity receipts. This reviewer did not edit application code or run application/tests/database/browser commands. Read-only hash checks and review artifacts are the reviewer's work.

## Implementation accepted within scope

- Legacy and API URLs retain current server session/organization, dashboard-module and dashboard.read decisions. Middleware intercepts decoded/case aliases before static bypasses, and the actual before-files policy also routes canonical legacy URLs into the API. No cookie-presence authorization was substituted for current guards.
- Production reads only `.private/uploads`. Missing private files/root fail closed. Nonproduction compatibility falls back to original public assets only when the private root is absent, behind the same request guard. Organization/file components are constrained; known links/junctions and nonregular files are refused, and an opened handle is checked and closed. Operator-controlled storage remains the trust boundary; this is not proof against arbitrary hostile concurrent ancestor replacement.
- The routing helper normalizes decoded separators and dot segments before classification. Private optimizer URLs, including aliases and an encoded optimizer endpoint, are denied before shared-cache lookup. Caller credentials are not forwarded into the optimizer. Ordinary public image controls remain available.
- The packer maps original legacy bytes into manifest-bound private paths, omits matching public/traced copies, refuses conflicting copies and renamed copies of known private hashes, and verifies mapping completeness. Ignored assets are captured before build and checked afterward, independently of Git source identity. Originals are retained. Version 1 manifests are accepted only without legacy content/mapping requirements; old public-upload artifacts are refused rather than relabeled safe.

Three initial review issues were corrected: path-only duplicate recognition, ignored-asset drift across build, and inconsistent decoded dot-segment classification. The last was a source-derived bypass hypothesis; native repaired HTTP cases now exercise the relevant inputs. The review also required surviving prewarmed-cache assertions and explicit conditional headers; both are present in the final runs.

## Verification evidence

| Lane | Final evidence | What it establishes |
|---|---|---|
| Route/routing/storage | `unit/run.json`, `unit/jest-result.json`: 63 tests, 3 suites, exit 0 | Mocked authority/error route checks, pure normalization and real disposable filesystem behavior, including production no-fallback and real directory-junction denials. File-link metadata has a separately labeled adapter test. |
| Packer | `packing/fixture-receipt.json`, `packing/jest-result.json`: 52 tests, 2 suites, exit 0 | Real filesystem fixtures, injected build/source identities and mocked promotion controls. Known-private renamed copies, build-time drift, mapping tampering and actual directory junctions are tested. |
| Development HTTP | `http/development-run-04-result.json`: 61/61, launcher exit 0 | Actual installed Next 15.5.27 development router with captured sources/configuration and explicit synthetic authority/error adapters; guarded source-tree compatibility. |
| Production-mode HTTP | `http/production-run-03-result.json`: 61/61, launcher exit 0 | A compiled/typechecked minimal Next fixture using the captured source and actual rewrite/image policy, private-only storage and the same synthetic adapters. This is not a full Stoquify build. |
| Mirrored legacy packing | `packing/private-publication.json`: 3 assets, zero public/renamed known-private copies | Actual repaired packer/verifier on the isolated mirror; build is stubbed and runtime is not served. Hashes and ordinary static control are preserved. |

Both final HTTP runs bind the same ten source entries and runner SHA-256 `9884ad9c92a53e94ebfecef53776090bdce7ce20068fe0ff00c31a1646223d28`. Denied API/legacy cases return 401/403 without private bytes or observed private-file opens; authorized GETs and aliases return exact synthetic bytes with private/no-store. Authorized HEAD remains bodyless. Range requests are denied without authorization and return the full authorized body with 200 when admitted. Explicit `If-None-Match: *` and future `If-Modified-Since` headers are recorded on the conditional negative. Malformed, encoded dot/slash/backslash and case variants do not expose bytes.

The installed optimizer cache is seeded with private bytes and checked immediately before and after denied optimizer requests. The entry remains present, while requests receive 400/private-no-store without private-file I/O. This establishes the tested pre-cache boundary rather than attributing denial to an absent cache entry. Both public image controls still return 200. Actual session expiry/revocation remains untested: those actor states are supplied by adapters.

Earlier discovery/interruption, sandbox junction-creation EPERM, fixture error-adapter typing and first development launch failures remain retained. Final tests were not weakened or skipped to hide those attempts. Final HTTP receipts record listener closure and completed Next shutdown; launcher exit 0 corroborates completion. Root's integrity receipt records six released ports, including earlier owned attempts.

## Identity, preservation and limits

The final broad source snapshot is `p04-r02-20261029-e2cf325ec4db`, 3,976 files at unchanged HEAD `80e4abb283216b9f8e04b94e5020393f7dcabf62`. `final-integrity.json` is a scoped preservation result, not whole-candidate certification: nineteen exercised inputs match their receipts, while nine unrelated concurrent source changes are explicitly preserved. These include `services/media/picture.service.ts`; current combined media/business behavior is not certified by the isolated route tests.

Independently checked the ten HTTP source hashes and all eleven owned final-file hashes against current files. Independently checked each of the three original/mirror/private-output hashes: all nine comparisons match. The synthetic packed artifact digest is `786829183a71d79a6e0adf4f3c04a9d0f39708aaf71907d47498025f9fdc08e2`. Actual original images were not rendered or HTTP-served. The command-registry change relative to the captured before copy is limited to the reviewed startup-test configuration fingerprint; unrelated preexisting registry edits were preserved.

Exact-byte duplicate detection cannot classify transformed image derivatives. The local pre-cache denial does not purge existing external copies or prove hosted ingress/CDN behavior. No live database reference census, actual signed-session lifecycle, rendered browser continuity, current full-application standalone artifact, production migration, flag change, deployment, commit or push is qualified here.

## Advancement decision

Record the repair as implemented with the above scoped gates passing. Retain P04-R02's blocked status until the required local current full-application artifact and actual persisted-auth/browser evidence is verified. Refresh and isolate that candidate, reconcile preserved URL/asset mappings and controlled storage provision, and keep rollback from restoring public exposure. Hosted cutover remains a separate release requirement. The successful local implementation does not discharge the wider P04 dependencies.

Final consistency clarification: G08 now correctly requires local full-application and persisted-auth/browser qualification for R02 completion. G09 separately retains hosted ingress/CDN/operator cutover as a release requirement and explicitly does not require deployment or hosted acceptance to complete local R02. RESULT/NEXT, R02/E18 and the revalidated 54-package / 183-edge register retain accurate scoped evidence and blocked local status. No further material documentation correction remains.
