# P04-R06 r3 capacity checkpoint

The next action is a fresh resource observation after a real capacity change, followed by the exact reviewed candidate retry only if the unchanged gates pass. No new application candidate, build artifact, database start or native/browser qualification exists in this packet yet.

## Completed and preserved

- Separate D dependency copy: 152,806 files, 2,998,378,443 content bytes. Every destination file matches the preserved input manifest; the full original r2 dependency tree was independently reconciled as unchanged. `dependency-staging-attempt03.json` and its independent outcome review passed. The copying process/session has exited.
- Actual D free space after copying: 13,455,106,048 bytes (about 12.53 GiB). The new source tree has not consumed this reserve.
- Late complete source observation: 9,942 files, identity `4ea56948b133706d3dc0531852f7dd37da41f40bb6968604e822dae3bb10ac74`; expected eventual candidate ID `p04-r06-r3-4ea56948b133`.
- All 68 R06 inputs, the schema, all 122 migrations and the preserved synthetic fixture match the admitted baseline. The POS changes and archived-source TypeScript exclusion were separately inspected. Three source documents were classified as private fixture metadata; their paths and exact hashes are bound for actual sealed-output exclusion. External referenced fixture/pack files were not opened.
- Concrete capture inputs exist in `inventory/capture-input.json`, `inventory/source-after-manifest-runtime.json` and `inventory/private-metadata-policy.json`. Initial rejected classifications and the failed normalizer wrapper invocation remain preserved.
- Six synthetic tests of the metadata-exclusion helper passed. This does not prove exclusion from a real build. The earlier 116 mocked authentication tests remain baseline evidence, not a new full-app run.

## Current stop condition

`preparation.json` failed at the fresh resource gate, before source capture or filesystem construction; its command list is empty. `resource-capture-entry.json` recorded about 9.42 GiB free physical memory, 11.41 GiB commit headroom and 12.53 GiB D free space. The subsequent observation after owned analysis kernels were released, `resource-capture-retry-ready-r1.json`, still failed commit headroom at about 11.13 GiB (physical memory about 7.09 GiB).

The gates remain 6 GiB free physical memory, 12 GiB commit headroom and 12 GiB D build reserve. No threshold was relaxed and no unrelated process was stopped. The retained r2 database remains stopped with its fixtures and evidence preserved. Its directory and database names are intentionally separate from future r3 source/runtime/private storage.

## Exact continuation

From the repository root, after memory has actually been freed:

```powershell
node plans/stoquify-production-readiness-2026-10-28/execution/P04-R06/qualification-20261110-r3/check-resources.cjs resource-capture-retry-ready-r2.json
```

Use a new receipt name if that name already exists. This command is read-only except for its exclusive receipt. If the actual gates pass, require the exact `CANDIDATE-PREPARATION-RECIPE-ADMISSION-attempt02.json` and then run:

```powershell
node plans/stoquify-production-readiness-2026-10-28/execution/P04-R06/qualification-20261110-r3/prepare-candidate-attempt02.cjs
node plans/stoquify-production-readiness-2026-10-28/execution/P04-R06/qualification-20261110-r3/admit-candidate-attempt02.cjs
```

The retry preserves the original failure, checks that no partial capture outputs exist, repeats the resource gate and compares the full live source and HEAD to the exact admitted late manifest before writing the candidate. It does not treat recovered memory as proof of source freshness. If source has changed, preserve the failure and obtain a new bounded source reconciliation and successor binding; do not alter the frozen manifest or waive the equality check. D writes require the already established isolated-task execution permission.

After actual candidate acceptance, the remaining sequence is independently gated:

1. `database/prepare-retained.cjs`, actual preparation review, `database/resume-retained.cjs`, actual native continuity review. Require exact schema/migrations, old/new owner separation, copied private fixture equality and both database digests. Never initialize, migrate or reseed the retained cluster.
2. `run-build-v2.cjs` under its final exact build admission. It consumes `preparation-attempt02.json`, regenerates only the new private client, repeats source/HEAD/owner/resource checks and runs the complete unchanged type/lint/artifact build. Actual artifact and metadata exclusion review is mandatory.
3. `admit-runtime-source.cjs` and `database/fixture-preflight.cjs`, followed by actual independent preflight review.
4. `run-runtime.cjs`: all 107 raw checks, 58 logical requirements and 57 mandatory supplementary proofs. The new source/private files use r3; the retained local database names and cluster remain explicitly r2. The historic V02 artifact is read only and used for genuine legacy cache issuance.
5. Independent native/browser outcome review, exact owned session cleanup, owned cluster stop and `final-integrity.cjs`. Source identity and cleanup success must remain separate from qualification success.

Final DB/build/runtime/cleanup admissions must bind the actual new candidate and preceding outcomes; structural source reviews alone do not release these stages. The parent owns work-register/publication updates. Preserve all earlier packets and unrelated changes. No commits, pushes, production flags/data changes or deployment are authorized.
