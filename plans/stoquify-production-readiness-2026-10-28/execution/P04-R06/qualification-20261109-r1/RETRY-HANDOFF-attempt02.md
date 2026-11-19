# P04-R06 isolated retry handoff

This is a blocked execution checkpoint, not authentication qualification or production approval. The first full build compiled, then failed with native V8 `Fatal process out of memory: Zone` during the type/lint phase. Its recipe, logs and result remain preserved. The reviewed successor keeps every build, type and lint check and the default Node heap/worker settings.

## Exact next action

After the user has freed host memory, run the reviewed capacity collector from the repository root with a new receipt name:

```powershell
node 'plans/stoquify-production-readiness-2026-10-28/execution/P04-R06/qualification-20261109-r1/check-resources-attempt02-v2.cjs' resource-retry-ready-20261110-r3.json
```

The receipt must report `passed: true`: at least **6 GiB free physical memory, 12 GiB free commit and 12 GiB free on D:**. These are conservative admission thresholds, not a success guarantee. Do not lower them silently, stop unrelated processes, alter paging/system settings, or increase the heap. A further attempt requires a new receipt name if the named receipt already exists.

The retained local build directory is `D:/p04-r06-fullapp-20261109-r1`. Current source provenance is in `candidate-context-attempt02.json`, `candidate-source-manifest-attempt02.json` and `candidate-refresh-attempt02.json`. The previous candidate and build records keep their original names. The failed output and four changed original source files are retained under `D:/p04-r06-fullapp-20261109-r1/attempt01-preserved`. The 65 added documentation files are source capture inputs only; their claims are not accepted by this qualification.

## Order after capacity passes

1. Confirm the actual source-refresh receipt and independent `CANDIDATE-REFRESH-OUTCOME-attempt02.json` both pass. Reconcile any new current-source or selected-input drift before execution. A current-source equality assertion in the build runner fails closed if the workspace changed while waiting.
2. Verify `database/suspend-attempt02.json` passes and the retained cluster ownership record is stopped. Resume only that cluster with `node 'plans/stoquify-production-readiness-2026-10-28/execution/P04-R06/qualification-20261109-r1/database/resume-attempt02.cjs'`. This repeats capacity checks, verifies the exact loopback target and compares all retained fixture business/session/audit digests. It performs no seeding, database creation or migration. Review the resulting `database/resume-attempt02.json`; the resume recipe has been reviewed, but has not been exercised at this checkpoint.
3. Run `node 'plans/stoquify-production-readiness-2026-10-28/execution/P04-R06/qualification-20261109-r1/run-build-attempt02-v2.cjs'` under the already required reviewed D: write escalation. It checks full current/candidate source equality, all 63 selected inputs, process ownership, the empty build database and its migration ledger, and fresh resources before compiling. It regenerates the private client and builds/seals `artifact-attempt02`. Require `build-result-attempt02.json` to pass with a complete verified artifact. Review actual logs and results independently.
4. Prepare and independently admit successor runtime bindings to `candidate-context-attempt02.json`, `build-result-attempt02.json`, the reviewed 63-input v4 manifest and the new sealed artifact. The original runtime scripts/admissions refer to the first candidate and must not be invoked as if they qualified the successor. Preserve them and use new filenames. Do not alter the previously reviewed 58 logical test groups or weaken their assertions.
5. Run the complete real-session qualification: signed legacy cookies issued by the preserved baseline, current sessions, denial and authorized-positive HTTP/browser cases, EN/FR consumers, and before/after native database evidence. Any denial must reveal no private bytes and cause no unauthorized change; a server error is not an accepted denial. Preserve each actual result, clean up only owned test sessions/processes and prove final integrity.
6. Obtain independent review of the observed build, all real-session/browser outcomes, database effects and cleanup before changing any advancement status. P04-R06 remains blocked until these pass. Parent P04 and production readiness have additional open obligations even if R06 later passes.

## Preserved limits and recovery

- No commit, push, deployment, production flag change or production-data operation is authorized by this handoff.
- The owned PostgreSQL cluster remains on disk with both local databases, ten synthetic actors, private local signing secrets and fixture credentials retained. Never print those private files.
- Restart failure cleanup targets only the newly started owned cluster. If ownership, PID, clients, source or fixture digests differ, stop dependent work and preserve evidence.
- The resource checks, source-refresh/config-input comparison and fixture retention checks are separate from mocked unit tests, full typechecking, application execution, real-session tests and browser tests. None substitutes for another.
- Existing deferred cases and parent blockers remain explicit. No full application, restored-service, hosted-provider or production readiness claim follows from recipe admission or a blocked checkpoint integrity pass.
