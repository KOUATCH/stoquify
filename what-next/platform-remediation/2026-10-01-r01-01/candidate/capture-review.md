# Candidate capture helper review

Reviewed and corrected on 1 October 2026. This review did not execute candidate capture, install dependencies, build the application, or access a database.

Corrections: reject dangling source links; normalize Windows filename case and separators for exclusions, including `.envrc`; reject overlapping source/worktree roots; recheck source physical containment before copying; independently inventory the completed destination without filtering unexpected files; retain failure receipts if final inventories reject a link or otherwise fail.

Verification command:

`node --test what-next/platform-remediation/2026-10-01-r01-01/candidate/capture-candidate.test.cjs`

The initial sandbox run passed two pure checks and failed five filesystem checks because `mkdtemp` was blocked with EPERM. The approved retry passed all seven checks (zero failures, skips or cancellations): containment/overlap, Windows exclusion variants, asset and untracked-file inclusion, source/destination added/deleted/changed detection, and escaping/dangling/cyclic directory-link rejection. Tests used real temporary fixtures and Windows junctions, then removed only verified task-owned fixture directories.

The explicitly selected landing snapshot contains 26 files totaling 326,026 bytes; retaining that directory is bounded. Broad documentary fixtures and historical evidence remain outside this capture's qualification. Filename filtering is not a complete secret scan. A successful capture is neither build proof nor a full-repository CI claim.
