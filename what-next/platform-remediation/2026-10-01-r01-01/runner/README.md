# R01 Linux execution capability discovery

No usable local Linux runtime was discovered. WSL's executable is present, but both bounded status/list probes explicitly report that WSL is not installed. Docker and Podman were absent from PATH and the checked standard installation locations; no service was started or installed.

GitHub CLI 2.81.0 is available but is not authenticated, including an unsandboxed read-only confirmation. Repository metadata access returned authentication-required (exit 4). The sanitized remote identity is `github.com/kouatch/stoquify`. Remote repository permissions and workflow/run state therefore remain unverified.

The practical next route is the existing Ubuntu/Node 20/`npm ci` GitHub Actions setup, after interactive CLI authentication and access verification. The frozen candidate must then be made available as the exact remote ref under separately authorized push/CI actions. An already available Linux host is the alternative. These checks do not justify another Windows packaging workaround or a machine-wide runtime installation.

See `linux-capabilities.json` for sanitized commands, exit codes, discovery limits and prerequisites. No token or credential-bearing URL was printed or persisted. No source, dependency, database, service or remote CI mutation occurred.

## Prepared execution entry

`run-linux-verification.cjs` is prepared for an authorized Linux host with Node.js **20** and npm. Linux execution has **not** occurred. `preparation-validation.json` records Windows syntax checks, 10 passing guard tests, and a read-only exact match against the frozen 6,314-file candidate:

`fad60d274131a4bf50f13b78bbb351358254033e1dde19a4e0bda8f82727afba`

Copy the runner and the candidate manifest as sidecars, outside the freshly extracted candidate. The manifest is `../candidate/r01-source-candidate.json` in the preparation bundle. Preserve the manifest bytes and candidate contents during transfer. The candidate must not contain dependencies, earlier Next outputs, runnable dotenv files or a project `.npmrc`. The evidence parent directory must already exist; the evidence directory itself must be new and outside the candidate.

Example on Linux (replace the illustrative absolute paths):

```sh
node /work/r01-tools/run-linux-verification.cjs \
  --candidate /work/r01-source-candidate \
  --manifest /work/r01-source-candidate.json \
  --evidence /work/r01-linux-evidence-01
```

The runner checks Linux, Node 20 and the full frozen manifest before creating evidence or starting commands. It rejects missing, changed and extra candidate files. An absent `next-env.d.ts` is then created from a recorded minimal Next type-reference stub. The frozen candidate ID is preserved; the stub is removed at the end only when its contents are still known generated content. Existing config files are restored byte-for-byte only when their sole changes are the recognized Next-generated route reference/type include. Unknown changes are retained and fail verification.

The child environment is constructed explicitly, without inherited credentials, `NODE_OPTIONS`, `NODE_PATH`, provider configuration or user npm configuration. npm uses empty task-local user/global configuration, a task-local cache, and the public registry. All configured database URLs and PostgreSQL fallback variables target disabled `127.0.0.1:1`. No real database or provider credentials are supplied. This is environment isolation, not an OS network firewall; the trusted frozen source and package-lock still determine executed package code. Dependency downloads require network access.

## Phases and bounds

All phases use the candidate's ordinary configuration and stop on failure. No source/test exclusions are added.

| Phase | Command | Bound |
| --- | --- | --- |
| Dependencies | `npm ci --include=dev` | 15 minutes |
| Client generation | `node node_modules/prisma/build/index.js generate` | 5 minutes |
| Schema validation | `node node_modules/prisma/build/index.js validate` | 2 minutes |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit --pretty false` | 15 minutes |
| Selected Jest | normal local Jest, `--runInBand --runTestsByPath`, 12 explicit paths in `TESTS` | 20 minutes |
| App compilation | `node node_modules/next/dist/bin/next build` | 30 minutes |

The Jest subset covers posting, periods, close assurance and packs, ledger balances/export, financial analytics, offline POS synchronization/recovery/scope/queue, and inventory stock-event behavior. Direct inspection found no archived `what-next` fixture dependency in these test files; the queue suite reads its captured source file. This is a selected regression run, not all repository tests.

The final phase is the same local Next compiler used by `build:app`; the wrapper itself is deliberately not executed by this harness. Review found `build-app-safe.js` detaches its Linux Next child into another process group. Direct invocation lets the runner own and stop the complete compiler process group on timeout or interruption. Full normal Next compilation, lint and type checks remain enabled. `NEXT_DIST_DIR=.next-r01-linux` gives this attempt its own output. No root `build`, `verify:ci`, migration, seed, deployment, database or browser command is included.

## Evidence and exit criteria

Each phase writes separate stdout/stderr logs and a receipt with the exact argument array, timestamps, duration, exit code, signal and timeout status. `plan.json` records the intended run; `result.json` records the terminal result. `sources-before.json` and `sources-after.json` cover every candidate file. Only the explicitly recorded `node_modules`, `.next-r01-linux` and `tsconfig.tsbuildinfo` generated paths are excluded after startup. New files elsewhere fail the source check. Generated config snapshots and restoration outcomes are retained.

Exit **0** means every requested phase passed, `BUILD_ID`, `required-server-files.json` and `standalone/server.js` exist, and frozen source integrity was restored. The status is deliberately `BUILD_VERIFIED_RUNTIME_PENDING`: standalone dependency/asset integrity, relocation outside the repository, runtime startup/login-page checks and authenticated smoke against a disposable database still need their own qualification. Any failed phase, timeout, unknown source/config change or missing required output yields exit **1**. An interrupted or failed attempt retains its logs/output and must be retried from a fresh candidate with a new evidence directory.

The earlier Windows EPERM build and failed package-copy recovery remain historical failures in `../../2026-09-30-run-01/runner/`. This entry does not repeat that workaround or certify the latest changing checkout.

## Local preparation checks

```sh
node --check run-linux-verification.cjs
node --check run-linux-verification.test.cjs
node --test run-linux-verification.test.cjs
```

Guard tests use only small uniquely owned fixtures; they do not install dependencies or run application verification. They exercise runtime refusal, strict arguments, path boundaries, clean environment, full inventory binding, additions/removals, dangerous input refusal and exact generated-config recognition. Linux process-group cleanup and the actual verification phases remain unexecuted on this Windows host.

Independent read-only review by the accounting worker found the missing generated Next type file and the wrapper's detached process-group issue. Both were corrected before final review. The final recheck reported no remaining actionable blocker in its narrow scope: manifest binding precedes generation, phase integrity includes the generated stub, unknown changes fail, and the local Next CLI remains in the runner-owned group. This is a review of the prepared runner, not evidence that Linux execution succeeded.
