# P04-R02 focused unit and filesystem verification

The repaired route, routing helper, and private storage reader passed **63 tests across 3 suites**. The final runner exited **0** and the six application/test source files hashed before and after execution were unchanged (`run.json`). `jest-result.json` contains the per-case results; `run.log` retains the command output.

## Exact command and side effects

```powershell
node plans/stoquify-production-readiness-2026-10-28/execution/P04-R02/repair/unit/run.cjs
```

The launcher uses an explicit OS-only environment plus `NODE_ENV=test` and disabled Next telemetry. Its reviewed config calls `nextJest()` without a `dir`, does not load the application Next configuration or environment files, has no root setup files, and limits discovery to `lib/media` and `app/api/uploads`. It starts only the installed Jest executable. New synthetic filesystem fixtures remain under `.codex-tmp/p04-r02-unit-*`; results are written only in this directory. It does not start the application, contact a database, migrate data, or run a build.

The workflow contract was inspected and run before this lane. It reported the expected `next.config.mjs` fingerprint drift from the active parent repair. This custom lane was reviewed separately rather than being represented as an existing registry-approved package command.

## Evidence classes

- **Mocked route:** missing session, cross-organization path, disabled dashboard module, missing `dashboard.read`, traversal, unsupported type, successful bytes after all guards, missing file, safe internal-error reply, invalid session-supplied organization component. Auth and canonical error formatting are explicit adapters; the storage read is mocked. Successful response bytes, MIME, private cache policy and guard ordering are asserted.
- **Real disposable filesystem:** production reads private bytes when stale public bytes also exist; absent private root/file never falls back to public; development supports public source compatibility only when private storage is absent; known directory junctions at `.private`, `.private/uploads`, and organization level are refused; directories cannot be read as images. Invalid components are rejected before any filesystem access.
- **Pure routing:** ordinary, encoded, case, separator and dot-segment aliases route through the guarded API; malformed and excessive decoding is rejected by the helper; private optimizer targets are recognized while public image controls remain admitted.
- **Mocked file-link metadata:** a separate `lstat` adapter case verifies that a known linked file is refused before opening. This is not a claim that a real file symlink was created.

## Retained failed attempts

`run-initial-interrupted.json` and its log retain an initial invocation whose Jest discovery was too broad. The owned Jest PID 31196, parent 34668, and exact unit config command were verified before stopping it. Its interrupted status and source drift are not a passing test result. Discovery was then narrowed and the launcher given a 180-second timeout.

The first bounded invocation passed 60 cases but failed to create the three directory junction fixtures under the sandbox (`EPERM`). `run-sandbox-link-denied.json`, its log, and `jest-result-sandbox-link-denied.json` preserve that outcome. The same bounded runner was then executed with local junction creation permitted and passed all 63 cases. No skipped cases were counted as passes.

## Limits

This lane does not qualify actual session revocation/expiry persistence, database writes, full application routing, browser rendering, hosted ingress, or production cache cutover. Directory ownership is a trusted operator boundary; known-link refusal does not claim protection against an arbitrary local process replacing ancestors concurrently. The parent HTTP/packaging gates and independent review supply separate evidence.
