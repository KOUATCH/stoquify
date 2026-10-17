# Standalone package structural preflight

Prepared while Linux execution remains unavailable. This helper has been exercised only with synthetic filesystem fixtures on Windows: **30/30 tests passed**, both syntax checks passed, helper/test hashes remained unchanged, and no test temporary directories remained. See `fixture-verification-2026-10-01T08-40-55-445Z.json` and its matching TAP log. Earlier receipts remain preserved. It does not copy a package, build or start the app, load native dependencies, launch a browser, log in, or connect to a database.

After a completed candidate build and separately controlled package copy, invoke:

```sh
node standalone-package-preflight.cjs \
  --build-output-root /absolute/candidate/.next \
  --package-root /absolute/isolated-package \
  --public-root /absolute/candidate/public \
  --receipt standalone-preflight.json
```

All three input directories must be explicit absolute paths. `public` must belong to the candidate identified by the compiled `distDir`. Nested output such as `.next/standalone` may be checked, but this does not establish relocation or isolation. The receipt must stay under this run's `runtime` directory and cannot overwrite existing evidence. Source `.env` files and credentials are never copied into the package; packaged secret paths cause a failure before their contents are read.

The preflight checks physical containment of every package link, rejecting dangling links, directory cycles and links escaping the package. It compares the generated server, build ID, copied compiled configuration, required files and discovered normal-server/application NFT dependency files. The root minimal-server trace is recorded as unconsumed provenance: the installed Next 15.5.23 standalone packager does not consume it, so its unique files are not required. See `next-packager-trace-review.md`; a different Next version requires review and fails the version check. Static and public files must match the candidate exactly, including extra-file detection. Candidate file hashes, asset inventories, trace lists and the package inventory are checked again to detect changes during inspection. These before/after checks are not an atomic filesystem snapshot. It resolves `next` from the copied server and resolves `@next/env`, `styled-jsx`, `react` and `react-dom` from the actual copied Next importer. `sharp` and `canvas` are explicitly optional for this structural check: unresolved optional modules are recorded, while any dependency resolving outside the package fails. Native loading and actual route requirements remain runtime checks.

Success is `STRUCTURAL_PREFLIGHT_PASS_RUNTIME_PENDING`; failed checks exit nonzero. Neither result claims successful ESM loading, startup, native-library loading, React/context behavior, login/assets rendering, authenticated routes or deployment. The previously reviewed CJS/ESM loader guards should accompany actual isolated startup when an environment and qualified candidate are available; this resolver-only helper is not a substitute.

Focused verification:

```sh
node --test --test-reporter=tap standalone-package-preflight.test.cjs
```

Tests create only synthetic candidate/package trees under this runtime directory, use throwing entry modules to show that resolution does not execute them, and remove their own temporary trees after checking canonical ownership. No existing application output is copied or executed. Independent read-only review identified two gaps that were corrected before the final run: environment/private-path variants, and candidate changes after initial comparisons. Tests now prove rejection before private-file reads and detection of mid-check configuration, public-asset and trace-list changes. The reviewer re-read the fixes and found no remaining material blocker for the stated structural-only scope; the reviewer did not execute the helper.
