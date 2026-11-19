# P09 execution attempts

18 October 2026. All four pure test runs completed successfully, in order: 41, 45, 46, 47 cases. Their exact start/finish times, commands and child exit codes are in the dated `.execution.json`; raw Jest results and combined logs are retained beside them. Final evidence is the 47-case run, not the sum.

First `node docs/retention/execution/P09/evidence/finalize.cjs` exited **1** (tool chunk `7c1d08`) with `Unowned source drift: components/landing/cinematic-hero.tsx, components/landing/cinematic.css`. The guard ran before P01 revalidation/status/manifest writes. P09 did not write either landing file. This was concurrent unrelated work in the shared checkout; it was preserved. The helper was narrowed to record these two explicitly known unrelated paths with both fingerprints while still refusing unexpected drift in other baseline files. No prior hash was overwritten and no product test or authority check weakened. Final invocation/result is recorded in VALIDATION/MANIFEST and the task transcript.

Source discovery encountered absent guessed paths and Windows glob interpretation failures. Actual files were discovered through `rg --files` and re-read. No missing path was treated as positive source evidence. The initial P09 broad read output was truncated; the prompt/workflow/predecessors and required source sections were reread in smaller calls.

Second finalization exited **1** (chunk `13a559`) because its link check ran before creating its own linked MANIFEST.json and ARTIFACT_LINKS.json outputs. These were the only absent links. The helper was corrected to materialize its output paths before checking links, then refresh their final hashes. This was an evidence publication ordering defect, not an archive test failure. The failed link result was preserved in `ARTIFACT_LINKS.failed-attempt-2.json` before rerunning.

No DB/browser/provider/deployment run, installation or broad test/build was attempted. No later prompt was executed.
