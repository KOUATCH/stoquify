# P04-R06 resume source and preservation receipt

Captured 10 November 2026. This lane inspected source and preserved evidence only. It did not edit application code, the isolated candidate, shared roadmap files, previous evidence, production configuration or data.

## Selected authentication source

Of 63 selected inputs, 62 match the prior v3 manifest, immutable snapshots and captured candidate. Current `lib/auth.ts` has one unattributed concurrent type assertion at the context spread. Its old and current versions are preserved here.

| Binding | SHA256 |
| --- | --- |
| Previous/candidate `lib/auth.ts` | `181e15aad556024353b1e988cce6ccb5eb9679dfc50620427b81aa059a8c7064` |
| Current `lib/auth.ts` | `c7a1acf7ee8c25682a47a7476feafdaeeb4d55f68fb030f33b76bd95e605bff5` |
| Both emitted JavaScript strings | `69d7a9256da83822d06ba8f067acd362774447fae854389f15be4f358c53e0ec` |
| Current selected 63-input identity | `d156380731346ebfee88a9c7fcc936468e189e9ae4f949129366bc1836cd78c5` |
| Current former 48-input subset identity | `745a634e5640187a55216fabdc9e00118399aba672c6d8a3a31af0f1d4c22ef6` |

The installed TypeScript 5.8.3 compiler, whose bytes also match the candidate, emitted identical JavaScript for the two complete strings with explicit ES2022/ESNext options and no diagnostics. This was an in-memory transpilation comparison, not a project typecheck or application execution. See [typescript-erasure.json](typescript-erasure.json).

The immutable successors are [source-after-manifest-v4.json](../source-after-manifest-v4.json), [source-after-repair-manifest-v4.json](../source-after-repair-manifest-v4.json) and [authority-map-after-v4.json](../authority-map-after-v4.json). They preserve the original 48-input provenance and prior 63-input authority map. Their identity algorithm is explicitly recorded; older identity values remain historical provenance.

All 63 current file hashes and saved snapshot hashes matched in [SUCCESSOR-CAPTURE-VALIDATION.json](SUCCESSOR-CAPTURE-VALIDATION.json). The other three owned product/test files are unchanged. The six shared roadmap publication files matched their preservation baseline at `2026-11-10T08:47:05.304Z`; root owns any subsequent publication. See [SOURCE-COMPARISON.json](SOURCE-COMPARISON.json).

## Complete captured source set

The same inspected candidate selection was applied to the current workspace without traversing installed dependencies. Of the original 9,723 files, 9,719 match, four changed and none are missing. There are 65 new selected files, all documentation/evidence under the concurrent close-production-prep directory; there are no newly added application source files.

The four changed files are `lib/auth.ts`, `tsconfig.json`, and the unrelated close-preparation `RESULT.md` and earned-close `PLAN.md`. Both versions of each are preserved here. The full current selection is 9,788 files with identity `ce65aec5d3b0da755510a454a989807a5b855543431aa58d41ad7224566dce6b`. See [FULL-SOURCE-COMPARISON.json](FULL-SOURCE-COMPARISON.json), [CURRENT-FULL-SOURCE-MANIFEST.json](CURRENT-FULL-SOURCE-MANIFEST.json) and [CONCURRENT-DRIFT-DISPOSITION.json](CONCURRENT-DRIFT-DISPOSITION.json).

`tsconfig.json` only broadens an exclusion from `plans/**/preservation/before/source/**` to `plans/**/preservation/**`. Applying the installed compiler's include/exclude glob semantics to all five existing preservation TypeScript files finds exactly one newly excluded file: the archived `preservation/repair-r1/lib/auth.ts`, hash `6e40844d3bd3a4d93d95c1916418eada52d37c38aea313e760a9bd2f6f9bbe72`. The other copies/tests were already excluded. The isolated candidate has no `plans` tree or selected `plans` entries, so this exclusion change removes no candidate-selected preservation files. Import resolution and the actual configured project typecheck remain separate matters. See [TSCONFIG-PRESERVATION-SELECTION.json](TSCONFIG-PRESERVATION-SELECTION.json).

## Qualification boundary

An auth-only successor may be described as the previously admitted 9 November candidate plus the independently admitted type assertion. It must not be described as byte-identical to the entire current workspace: the configuration and unrelated documentation differences remain explicitly outside that bounded successor unless separately admitted.

`npm run agent:workflow:check` passed with exit 0 and 196 unclassified scripts after inspection of its current definition and registry. It did not run application/database commands. This lane did not run mocked tests, real sessions, browser tests, database qualification, a build or a full typecheck. These source receipts do not close P04-R06, parent P04 or production readiness.
