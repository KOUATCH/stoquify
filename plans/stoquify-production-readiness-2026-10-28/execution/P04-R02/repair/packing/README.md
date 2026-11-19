# P04-R02 private release packing

The repaired packer preserves original `public/uploads/<org>/<file>` assets and places their runtime copies at `runtime/.private/uploads/<org>/<file>`. It produces a version 2 manifest with `legacyUploads` entries containing the original source path, private destination path and SHA-256. The existing runtime file inventory also binds those private bytes.

Only `scripts/release-artifact.cjs`, the new focused packing test and evidence in this directory were changed by this reviewer. The existing release-artifact tests were inspected and executed unchanged. No original image was moved, deleted or served; no production flag, real build, migration, database, provider or deployment command ran.

## Controls implemented

- Matching copies traced under `public/uploads` or `.private/uploads`, including nested standalone paths and case variants of the structural directory names, collapse to one private destination.
- Orphan copies, different bytes at the same legacy identity and case-ambiguous organization/file identities fail before output is written.
- Any inventoried legacy byte hash found outside the canonical private mapping fails. This includes renamed copies in ordinary public assets, standalone output or static output; matching ordinary assets are never silently deleted.
- Original ignored upload path/hash inventory is captured before the build invocation and must remain identical afterward. Verification rechecks that inventory independently of the Git-based source snapshot.
- Unsafe portable filenames, traversal, absolute paths, duplicate/case-conflicting destinations, source/target ancestor symlinks and junctions are rejected. The packer does not import application TypeScript.
- Verification rejects public legacy paths, renamed known-private copies, missing/private mapping drift, original-byte drift and malformed manifest paths, even when a changed manifest has a newly supplied matching digest.
- Non-upload public assets remain at their ordinary runtime paths.

The private path contract permits two ASCII organization/file segments using letters, digits, dot, underscore and hyphen; neither may contain `..`. Trailing dots/spaces and Windows device names are rejected. File extensions are jpg/jpeg/png/gif/webp, case-insensitively. Structural output directory spelling is normalized; organization and filename spelling is preserved, with ambiguous case variants refused.

## Deliberate backward compatibility

Version 1 manifests remain verifiable only when neither current original sources nor the artifact contain legacy uploads and there is no legacy mapping. Historical artifacts containing public upload bytes are rejected. A version 1 artifact cannot become newly trusted merely by computing its digest again. Version 2 is required when legacy images exist.

## Verification

Independent source review identified two gaps in the first draft: renamed exact-byte copies and upload changes during the injected build. Both were corrected and covered before execution. The reviewer then inspected and approved the isolated runner/configuration and the three-asset characterization.

Command: `node plans/stoquify-production-readiness-2026-10-28/execution/P04-R02/repair/packing/run-fixtures.cjs`

**52/52 tests passed across two suites**, using real disposable filesystem fixtures and injected build/source identities. Existing schema-promotion tests use mock clients and synthetic settings. The runner supplies only OS/runtime environment keys, loads no Next configuration or application setup, and performs no real database connection.

The first sandbox run passed 49 tests; three native Windows junction fixtures failed at fixture creation with `EPERM`, before reaching packer assertions. These receipts are retained as `*.sandbox.*`. Automatic approval review permitted the identical filesystem-only lane outside the sandbox, where all 52 tests passed, including the three actual junction denial cases. No test was weakened or skipped.

- `fixture-receipt.json`: successful command, timings, filtered environment key names and source hashes.
- `jest-result.json`: all 52 assertions and suite outcomes.
- `fixture-output.log`: test output.
- `fixture-receipt.sandbox.json`, `jest-result.sandbox.json`, `fixture-output.sandbox.log`: preserved initial environment-limited result.

Command: `node plans/stoquify-production-readiness-2026-10-28/execution/P04-R02/repair/packing/inspect-private-publication.cjs`

**Three mirrored assets passed actual packer/verifier characterization.** Every private output hash equals its recorded original-copy hash; no public upload paths or renamed known-private byte copies remain in the artifact. The synthetic static control survives, and mirror hashes are unchanged. The injected build does nothing and the synthetic runtime is never served. This runner does not read the original source assets; their preservation is reconciled by the parent's separate receipt.

- Result: `private-publication.json`.
- Fresh artifact: `.codex-tmp/p04-r02-20261029-r1/private-publication-repair-01`.
- Trusted artifact digest: `786829183a71d79a6e0adf4f3c04a9d0f39708aaf71907d47498025f9fdc08e2`.

## Recovery and limits

Preparation requires a new artifact directory and writes each file exclusively. Originals remain intact. An interrupted artifact without a complete trusted manifest cannot pass verification; retry into a fresh owned directory after investigating the failure. Never recover by restoring private bytes to runtime public storage.

These results qualify bounded packing behavior, including actual copies of the three inventoried assets. They do not qualify a real standalone compilation, real sessions, browser rendering, transformed image caches, external origins/CDNs or production migration/deployment. Exact-byte duplicate detection cannot identify previously transformed/compressed image derivatives; the image-optimizer and cache-cutover gate remains separate. The parent owns the two-URL runtime tests, original preservation reconciliation and final P04-R02 advancement decision.
