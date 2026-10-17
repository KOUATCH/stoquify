# R01 execution update — 1 October 2026

**R01 remains PARTIAL.** A stable source candidate and Linux verification kit are ready. Actual Linux installation, application verification and standalone runtime qualification have **not run**. The immediate blocker is execution access: no usable local Linux runtime was discovered, and GitHub CLI is signed out.

This continues R01, “Restore a reproducible test, typecheck and policy-gate baseline,” from the [implementation roadmap](../../../docs/system-audit/04_IMPLEMENTATION_ROADMAP.md). The September [execution register](../../../docs/system-audit/EXECUTION_REGISTER.md) remains historical evidence; this update does not mark that package or any other roadmap package complete.

## Completed and evidenced

| Work | Result | Evidence |
| --- | --- | --- |
| Preserve a stable candidate from the changing workspace | 6,314 files, 111,629,348 bytes; source and destination inventories match with no observed capture drift | [Candidate manifest](candidate/r01-source-candidate.json) |
| Prepare a portable source archive | 33,758,550 bytes; every archive entry matches the manifest, with no extra, duplicate, traversal or link entries | [Archive validation](candidate/archive-validation.json) |
| Validate the capture helper | 7/7 tests passed after an approved retry of filesystem checks blocked by the sandbox | [Capture review](candidate/capture-review.md) |
| Prepare Linux verification | Syntax checks and 10/10 guard tests passed; read-only binding to the actual frozen candidate passed | [Preparation receipt](runner/preparation-validation.json), [runner instructions](runner/README.md) |
| Prepare standalone structural checks | Syntax checks and 30/30 synthetic filesystem tests passed; no temporary fixture directories remain | [Preflight receipt](runtime/fixture-verification-2026-10-01T08-40-55-445Z.json), [preflight instructions](runtime/README.md) |
| Correct the standalone trace requirement | Minimal-server-only dependencies are not required by the reviewed normal Next packager; required/shared dependencies remain enforced | [Trace policy review](runtime/next-packager-trace-review.md) |

The 47 passing tests exercise these preparation helpers. They are **not application regression, Linux process-control, migration or runtime passes**. Independent review confirmed the runner now generates its Next type stub after manifest binding and invokes Next directly inside its owned process group.

## Exact candidate identity

- Baseline Git commit: `62a56036a5ac9b37236a20c9b148052199069479`, plus selected current workspace changes and untracked source files.
- Candidate ID: `fad60d274131a4bf50f13b78bbb351358254033e1dde19a4e0bda8f82727afba`.
- Manifest SHA-256: `0f14ca22b351470ed93ee4a9e02c5073b13616ea9717b43ec4b4fc7c75f35f16`.
- Archive SHA-256: `b4b4f26934aaf4f13a730e09d2a0186f2ad9489731a0a0ef6d58aecf69ae1cde`.
- Capture window: 2026-10-01, 08:31:59–08:34:59 UTC.
- Managed worktree: `C:\Users\J COMPUTER\.codex\worktrees\r01-build-qualification\stoquify`.
- Frozen source directory: `C:\Users\J COMPUTER\.codex\worktrees\r01-build-qualification\stoquify\r01-source-candidate`.
- Local transfer artifact: [r01-source-candidate.tar.gz](candidate/r01-source-candidate.tar.gz).

The snapshot contains **90 migration files**, including `20260930231500_supplier_credit_zero_value_evidence` with SHA-256 `4e56dc79850e0937c8671500da573373f8d0aff8a4f45cf1527255684d464eec`. This is file inclusion only; none of these migrations was applied or rehearsed in this run. Prior migration results cover an older candidate.

The capture includes application, test, build, asset and migration inputs, including the bounded landing-page snapshot and one separately versioned artifact schema required by the unchanged TypeScript configuration. Three specific documentary fixtures were retained. Broad report/history directories, old build outputs, dependencies, uploaded media, generated route types and environment files were excluded. This is a selected verification candidate, not proof that every repository-wide policy or historical-fixture test can run from it. Filename exclusions are not a complete secret scan. The archive has not been uploaded.

## Execution blocker

[Capability discovery](runner/linux-capabilities.json) found:

- WSL executable present, but both status/list probes report WSL is not installed.
- Docker and Podman absent from PATH and checked standard installation locations.
- GitHub CLI 2.81.0 present but unauthenticated, including an unsandboxed read-only confirmation.
- Sanitized remote identity `github.com/kouatch/stoquify`; repository permissions and Actions state remain unverified.
- Local CI configuration uses Ubuntu and Node 20. This is configuration evidence, not a successful remote run.

The pending execution route is either GitHub Actions after interactive authentication and access verification, or an existing Linux host. For the GitHub route, the user can run `gh auth login --hostname github.com --web`; no token should be pasted into chat. Authentication alone does not constitute a build result. The exact candidate still needs a reviewed transfer/ref and a workflow that executes the intended isolated commands; the existing aggregate build commands must not be dispatched blindly.

## Ready execution sequence

1. Establish Linux access and verify the intended repository/host. Preserve this candidate identity; changes require a new manifest and run.
2. Transfer the archive, manifest and helper sidecars to a fresh Linux workspace. Verify the archive and manifest hashes. Keep tools and evidence outside the candidate. The runner rejects changed, missing or extra candidate files before execution.
3. Run the prepared helper with Linux and Node 20:

   ```sh
   node /work/r01-tools/run-linux-verification.cjs \
     --candidate /work/r01-source-candidate \
     --manifest /work/r01-source-candidate.json \
     --evidence /work/r01-linux-evidence-01
   ```

4. The helper performs `npm ci`, Prisma generation/validation, ordinary TypeScript checking, 12 selected existing Jest suites, and direct local `next build`, retaining separate logs, exit codes and before/after source inventories. It supplies disabled loopback database endpoints, no inherited credentials and task-local npm configuration. This is environment isolation, not an OS network firewall. It does not execute migrations, seed data or deploy.
5. Only after a successful build, prepare the standalone package outside the repository and dependency ancestry, include matching public/static assets, and run structural preflight against `.next-r01-linux`. Then prove actual isolated startup with CJS and ESM containment, required native modules and asset/login behavior. A structural pass alone does not qualify runtime behavior.
6. Rehearse the current migration chain and authenticated business workflows against an explicitly disposable database. Record the exact candidate/database identity. Extend route checks into panels and transactions, including expected role/module denials and classification of rendered alerts.
7. Update the R01 register from those results. Revalidate R07 source/close concurrency and R08 database boundaries against this candidate before implementing their remaining contracts; the added migration and concurrent workspace edits make older receipts insufficient for current acceptance.

The compiler invocation intentionally bypasses `build-app-safe.js`: that wrapper detaches its Linux child into another process group, which would escape the outer helper's cleanup. The helper retains normal compiler checks but **does not qualify the wrapper itself**. Root `build` and `verify:ci` can chain migration operations and are not used by this packet. Broader policy checks remain separate from the 12 selected Jest suites.

## Standalone finding correction

Read-only inspection of Next **15.5.23** shows normal standalone packaging consumes the normal-server and selected application traces, not `next-minimal-server.js.nft.json`. Missing dependencies unique to that unused trace were an overstrict earlier check, not independent evidence of a packaging defect. The revised preflight records that trace as provenance and rejects unreviewed Next versions.

The previous Windows build still exited with EPERM, and the recovery package still resolved `@next/env` and `styled-jsx` into the original workspace. Those independent failures remain valid. Neither old package nor a new Linux package was started or qualified in this run. Historical reports are preserved with this correction stated separately.

## Remaining acceptance evidence

| Acceptance item for this candidate | Status |
| --- | --- |
| Frozen source and local archive integrity | PASS |
| Preparation-helper checks | PASS, stated Windows fixture scope only |
| Linux dependencies, Prisma generate/validate, application typecheck and selected Jest | NOT_RUN |
| Linux Next build and build-wrapper qualification | NOT_RUN |
| Broader policy gates / complete repository regression | NOT_RUN |
| Standalone copy, actual structural preflight and isolated runtime | NOT_RUN |
| Current 90-migration rehearsal and authenticated workflow tests | NOT_RUN |
| Release or deployment | NOT_RUN |

No primary application source/configuration, primary database, remote branch, CI run or deployment was changed by this R01 preparation. Work by other writers was preserved. The managed worktree and local evidence remain available for the next execution session.
