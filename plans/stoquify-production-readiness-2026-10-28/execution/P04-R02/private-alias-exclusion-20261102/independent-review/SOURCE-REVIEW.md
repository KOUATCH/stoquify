# Independent review: declared private aliases

Reviewer: `qualification_review_r2`. Date: 2026-11-02. Scope: source review and reconciliation of isolated fixture receipts; no application, database, browser or deployment execution by this reviewer.

## Decision

The bounded implementation is acceptable for a fresh isolated full-application qualification. No blocking source defect was found in the reviewed alias policy, routing or artifact changes. This is not P04-R02 completion: real-session denial, authorized delivery, browser consumers, final preservation and cleanup remain separate gates.

The user's classification of the three existing aliases as private resolves the earlier asset-classification question. It does not authorize removal of source images or publication of their bytes.

## Reviewed behavior

- `config/private-upload-aliases.json` declares exactly three existing public image paths, fixed canonical tenant upload paths and SHA-256 digests. Original files remain in source.
- `lib/media/legacy-upload-routing.ts` uses that policy before the existing middleware static skips, sending recognized aliases to the existing server-authorized upload API. Repeated encoding, case, backslashes, normalized dot segments, trailing filename dots/spaces and filename NTFS-stream spellings resolve through the same fixed mapping. The optimizer boundary uses the same alias resolver.
- `next.config.mjs` imports the same policy using `createRequire`; canonical aliases and the existing upload path have `beforeFiles` rewrites. Other existing rewrites retain their after-files role. The imported policy becomes a reviewed command dependency.
- `scripts/release-artifact.cjs` verifies policy shape, unique paths, source bytes and canonical upload digest before invoking the build. It rechecks the policy and source after the build. Only declared source or traced public alias copies with the exact expected case and digest are excluded.
- Unsupported static-output alias paths and undeclared renamed copies of private bytes remain rejected. The global private-byte hash check was not weakened.
- The artifact manifest records each alias exclusion and canonical private destination. Verification reconciles the source policy and manifest, and rejects reintroduced public aliases even when their bytes and manifest digest have changed.

The default NTFS stream edge was confirmed with metadata-only filesystem inspection (`::$DATA` resolves to the existing file). The added resolver cases address that discovered alias. This inspection was not HTTP disclosure evidence.

## Executed evidence inspected

| Evidence | Result | Meaning |
|---|---|---|
| `packing/jest-native-result.json` | 84/84 tests, two suites, zero skipped | Real disposable-filesystem packing/verifier fixtures and mocked promotion behavior; no real build or DB |
| `unit-native/jest-result.json` | 85/85 tests, three suites, zero skipped | Pure routing, mocked route authorization/error adapter, disposable storage fixtures |
| `unit-final/jest-result.json` | 91/91 tests, three suites, zero skipped | Includes three fixed-tenant alias positives and three foreign-tenant guard cases; authorization remains mocked |
| `config-workflow-results.json` | Six dev-config tests and workflow contract passed | Current configuration import compatibility and reviewed command contract; no application build or sessions |
| Initial sandbox fixture attempts | 80/84 packing and 82/85 unit | All seven failures occurred while creating junctions with EPERM; preserved, then rerun natively |

The reviewer independently reconciled all native packing receipt input hashes with the current files. The later route-test change is qualified by the final 91-test receipt; all eight `owned-source-tested.json` hashes matched at review. The 85-test result remains evidence for its earlier recorded revision. No fixture result substitutes for an actual Next runtime, real persisted session or browser result.

## Fresh qualification fixture contract

A fourth synthetic alias is acceptable only as an explicitly recorded candidate fixture exception. It must map to the existing synthetic tenant-A upload, preserve the three root policy rows exactly, and bind both root and candidate policy hashes plus the added public canary hash. All other root-source comparisons must remain exact apart from the already declared public control fixture. The normal artifact build must exclude all four public alias copies and record all four private mappings.

Real tenant-A sessions must establish authorized synthetic-alias GET/HEAD behavior, with anonymous, foreign tenant, revoked/expired session, changed permission and disabled-module denial checks. Existing original aliases may be probed negatively without returning or logging their bytes. A request blocked by the test proxy before the application is fixture-exclusion evidence, not proof of application denial. Any original-alias denial claim must identify an actual upstream request and measured response.

The resulting artifact is fixture-policy qualification evidence, not an approved production artifact. The original source images and canonical mirrored copies must remain unchanged; the prior failed attempt and all receipts must be retained.

The adapted r3 preparation/admission/build recipes meet this fixture contract and are accepted for execution after source freeze. The unchanged candidate command registry intentionally retains the root three-row policy fingerprint; the dev-startup lane was verified on root, not on this four-row fixture candidate. This explicit exception does not permit bypassing normal build hooks, source checks or command side-effect review.

The r3 database recipes were separately reviewed and accepted after candidate admission. They require the exact r2 stopped owner/PID/receipt, transfer ownership only after stopped status and a free port, verify schema/catalog/migration and retained synthetic-state admission, and stop normally only after two empty client inventories and renewed ownership checks. Template/build emptiness covers eight named tables. Final fixture capture is an observation requiring reconciliation of intentional test transitions; it is not a blanket no-write assertion.

## Recovery and remaining gates

Do not deploy or revert to public static delivery on a qualification failure. Preserve source originals and failure evidence, stop only task-owned processes after checking active clients, and keep P04-R02 blocked until the actual runtime/browser and preservation gates pass. The fresh build must retain source/artifact binding, private physical dependencies, local-only database identity, normal build hooks and competing-build protection.
