# P04-R06 r2 execution handoff

This is an incomplete qualification checkpoint. No r2 application artifact has been built and none of the 107 native/browser checks has run. The product repair and 116 mocked tests have separate accepted evidence.

The current candidate is `p04-r06-r2-f6b4ff106590`: 9,789 source files, 68 selected source/dependency inputs, no source overrides or additions. `candidate-admission.json` and `independent-review/CANDIDATE-OUTCOME-REVIEW.json` bind it. The new physical dependency copy and immutable archive each passed all 152,806 hashes. No clean-install claim is made.

The exclusively owned local cluster is `D:/p04-r06-fullapp-20261110-r2/postgres`, loopback `127.0.0.1:55517`, recorded PID `21228`. Both local databases have 122 verified migrations. The build database remains empty. The runtime database has 16 synthetic actors, 32 accounts and zero initial sessions. `independent-review/DATABASE-OUTCOME-REVIEW.json` accepts the actual setup. The cluster remains running while the user has an opportunity to free host memory; do not reinitialize or reseed it.

The first build entry stopped before any child command, private environment file, generated client or artifact was created. `build-result.json` and `resource-build-admission.json` preserve the failure: 11.79 GiB commit headroom was below the unchanged 12 GiB minimum. After only owned idle analysis kernels were released, `resource-retry-ready-attempt02.json` measured 5.45 GiB physical and 10.49 GiB commit, below the 6/12 GiB gates. D drive space is sufficient. Never relax the gates or stop unrelated processes.

Resume only after a fresh exclusive resource receipt passes and the exact successor recipe is independently admitted:

1. Confirm the recorded cluster PID/file/data-directory/port ownership and that no conflicting build/application is running. Preserve any unexpected state for reconciliation.
2. Run `run-build-attempt02.cjs` under `BUILD-RECIPE-ADMISSION-attempt02.json`. It rechecks current source, ownership, resources, the empty build database and full canonical private Prisma generation. It retains normal build/type/lint/default-heap behavior. Output is `build-result-attempt02.json`; the failed first entry remains immutable.
3. Require independent `BUILD-OUTCOME-REVIEW.json` accepting the actual artifact. Run admitted `admit-runtime-source-v2.cjs` and `database/fixture-preflight-v2.cjs`; require independent `RUNTIME-PREFLIGHT-OUTCOME.json` on the actual current source and fresh native state.
4. Execute the admitted `run-runtime-v3.cjs`. Earlier unexecuted main drafts remain preserved. The corrected v3 reads the original immutable P04-V02 `build-result.json` only for its legacy signed-cache issuer and reads the new r2 `build-result-attempt02.json` for the repaired artifact.
5. Require every proof in `runtime/qualification-contract.json`: core 50, expanded 36, retained-expiry 3 and consumer 18, totaling 107 actual cases mapped to the original 58 logical requirements. All failures remain visible. `runtime-result.json` binds candidate and artifact; no mocked/source result substitutes for these checks.
6. Obtain independent actual outcome and rendered evidence review. Run only the already reviewed owned-session finalizer and cluster stop after all needed probes finish. Use `final-integrity-v3.cjs` under its matching admission; source identity, artifact preservation and cleanup are reported separately from qualification pass/fail.

The precise admission files must exist, pass and bind current script bytes before their corresponding execution. At this handoff's creation the build retry and runtime-wide successor admissions are being finalized; this document itself grants no execution gate. All prior packets, old artifacts, old clusters, failed attempts and current unrelated changes remain preserved. No commit, push, production flag change, production migration or deployment is authorized.
