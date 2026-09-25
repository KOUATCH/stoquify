# Isolated application build verification

The application **compiled successfully in 6.2 minutes**, completed lint/type validation, generated all nine static pages, and reached build tracing/standalone packaging. Next then failed to create dependency symlinks on Windows (`EPERM`). The Next child and wrapper both exited 1; the run did not time out. This is not a passing deployable build.

Evidence: [complete log](evidence/build.log), [structured outcome](evidence/build-result.json), [source/configuration start](evidence/build-start.json), and [exact configuration restoration](evidence/build-config-cleanup.json).

The build ran through the existing safe wrapper API, using `.next-pos-gates-20260924`, cleanup disabled, a 60-minute bound, and orphan/process guards. No migration-deploying build command was used. No generated directory was deleted, and the existing development output was preserved. The two generated configuration edits were the added isolated types include and changed route-type reference. Both were verified against pre-build snapshots and restored byte-for-byte after the wrapper completed.

Existing unrelated lint warnings were retained. The Windows symlink error came from the operating system during Next standalone packaging, not from automatic approval review and not from an application type error. No persistent Windows security setting or process privilege was changed to work around it.

## Build wrapper remediation

The wrapper previously inspected `.next` regardless of `NEXT_DIST_DIR`. It now inspects and reports the configured contained output; an older valid default directory cannot mask a missing isolated build. Root/outside/link targets are rejected, including a new target below an existing parent junction. Its existing recursive-deletion restrictions remain in place; custom output cleanup was not enabled.

The first five regression failures reproduce the original wrong-directory behavior. Independent review identified the parent-junction case; it failed before the follow-up fix. Final result: 23 focused tests pass, scoped lint clean, and independent follow-up review found no remaining blocker in this bounded delta. See [original regressions](evidence/build-wrapper-focused-red.log), [parent-link regression](evidence/build-wrapper-ancestor-red.log), [final tests](evidence/build-wrapper-final-green.log), and [exits](evidence/build-wrapper-final-results.json).

The application build began before the last parent-junction check was added. Its direct-root output target is unaffected. The final guard was verified separately rather than presenting the earlier running process as if it loaded a later edit.

## Remaining G8 environment requirement

The existing program requires an official Linux CI artifact or approved Windows symlink capability. The release owner must select the actual supported packaging environment and freeze a reviewed candidate. Do not turn off standalone output or ignore packaging errors simply to report green. No deployment or operating-system privilege change is included in this run.

On the approved environment, preserve its locked dependencies and configured runtime, select a new isolated output directory, set `BUILD_APP_SKIP_CLEAN=1` explicitly, and use `npm run build:app`. Capture the actual wrapper/child exits, build ID, complete standalone artifact, source manifest, runtime configuration scope and a bounded startup/route smoke. A public receipt signing secret must be verified through managed configuration evidence, never pasted into a report. Reconcile that artifact with G8 evidence and the eventual G9 entry decision; a build alone does not authorize release.
