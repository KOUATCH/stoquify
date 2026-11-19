# Late source refresh for P04-R06 r3

Prepared only. Execution must wait for the runtime owner's verified dependency-copy completion signal and independent admission of `inventory/refresh-source-r2.cjs`.

The short-lived Node process reads the inspected source selector and uses its same Git source selection. It hashes current source without retaining source bodies, recursively reading installed dependencies, importing application/database helpers, starting processes other than read-only Git, opening network connections or writing to D:. It also checks the exact 68 selected root/candidate inputs, schema, all 122 migrations, retained private-fixture hash, database/helper provenance and frozen browser-observer input hashes. The private fixture is hashed only; its contents are not published.

Before scanning, the helper requires:

- No prior file at any of its five output paths.
- `independent-review/LATE-SOURCE-REFRESH-RECIPE-ADMISSION.json` with `passed: true` and an exact `files` entry for `inventory/refresh-source-r2.cjs` and its SHA-256.
- Every listed admission input still matches its hash, resolving its declared path from the r3 packet. This binds the reviewer-selected prior context, source/fixture/browser manifests and current selector/registry before scanning.
- `dependency-staging-attempt03.json` with `passed`, `physicalCopyExact` and `frozenDependencyTreeUnchanged` all true.
- The unchanged inspected candidate-selector hash and the frozen r2 selected-input manifest hash.

Only these exclusive E: evidence files are written:

| File | Binding |
| --- | --- |
| `CURRENT-SOURCE-MANIFEST-r2.json` | Full current source, `files: [{path, sha256}]`; identity is SHA-256 of the serialized path/hash array. |
| `SOURCE-SIZES-r2.json` | Byte lengths and 4096-byte allocation estimate from the same file bytes read for the source manifest; bound to its exact file hash and identity. |
| `SELECTED-INPUTS-REFRESH-r2.json` | Every one of the 68 expected inputs against current root and frozen r2 candidate; individual hashes, lengths and match flags. |
| `RETAINED-FIXTURE-SOURCE-COMPATIBILITY-r2.json` | Schema/migrations, package/config inputs, private fixture, helper/admission and browser-source bindings; no database continuity claim. |
| `SOURCE-REFRESH-r2.json` | Exact deltas against frozen r2, capacity checkpoint and first r3 refresh; late-copy/admission bindings and limitations. |

All earlier r2/E30 and r3/r1 evidence remains unchanged. A mismatch produces evidence rather than authority to bypass a later candidate guard. The source inventory is an observed read interval; the runtime owner's separate capture and prebuild checks must establish exact current-source equality again.

After the refresh, inspect only newly changed source/configuration paths and any new private-named evidence shapes. Save a new `SOURCE-IMPACT-r2.json` with current hashes, import/configuration impact, private metadata disposition and exact remaining constraints. Do not assume the earlier finance-only classification still holds if a new path appears. Existing finance changes remain outside R06 behavioral certification. The runtime owner alone captures/writes the successor candidate, resumes any admitted database and runs the build.

For the previously found `pg-PRIVATE_FIXTURE.json`, the prior inspection found a metadata receipt containing external paths, hashes and sizes, with no embedded records/credentials. Preserve it in isolated source and retain the separate sealed-artifact exclusion verification. Do not open its referenced private data or treat the old classification as evidence for a different new file.

This recipe grants no application, browser, database, migration, deployment or production authority. A passing source refresh does not close R06.
