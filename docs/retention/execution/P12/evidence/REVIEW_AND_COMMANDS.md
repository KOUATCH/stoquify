# P12 execution and side-effect review

18 October 2026. Task scope: application read-only checkpoint; write P12 artifacts and only P12's execution-register row. No later prompt or outstanding feature implementation. Existing unrelated work preserved.

## Inspected contract and commands

- Read AGENTS.md, docs/ecc/WORKFLOW.md, skill-routing.md, command-registry.json, test-lanes.md, P12, common execution contract, verification guide, mapped roadmap and predecessor RESULT/follow-up artifacts. Existing graphs used for discovery; current source and hashes used for claims. No graph generation, installation or external contact.
- Read current package workflow definition and pre/post hook presence, complete `scripts/verify-agent-workflow-contract.js`, imports and registry entry. Script is `node scripts/verify-agent-workflow-contract.js`; fs/path/crypto only, no pre/post workflow hooks. Registry runner hash `cb86a260bf7bd5924e06cf9ba444cd07d3bab57832f76c8d12e31b7e4e61db29`. `node docs/retention/execution/P12/evidence/workflow.cjs` executes fixed `npm.cmd run agent:workflow:check`, records real exit 0 and output; 196 scripts outside the reviewed manifest are not certified by this pass.
- `git rev-parse`, `git status`, selected `git diff`/`git log` and `rg`/Get-Content inspected source only. A Git HEAD-to-HEAD diff is not the earlier dirty snapshot; raw artifact hashes control freshness. P06 mismatches were also compared with LF/CRLF-normalized hashes and remain real byte differences. No Git mutation.
- `node docs/retention/execution/P12/evidence/capture.cjs` writes selected baseline, exact prompt criteria and prerequisite hash comparisons. Initial in-memory extraction failed on a P08 dictionary-shaped fingerprint collection; corrected before successful capture. It imported only filesystem/path/crypto/child-process and read Git. No application imports.

## Focused browser-storage rerun

Why: P06 current queue helper/test differ from its operator evidence. Historical source bytes were not silently replaced by current files. The full authenticated app/DB path remains a separate pending check, F04.

Reviewed `lib/pos/__tests__/offline-local-queue.test.ts`, current queue helper, `jest.payroll-trust-spine.config.cjs`, `jest.setup.ts`, P06 storage runner/config and the new P12 wrapper before execution. The registry does not classify this task-specific invocation; this is an explicit side-effect review, not an assumption that an unclassified script is safe.

Exact wrapper: `node docs/retention/execution/P12/evidence/storage.cjs`. Child: local installed `node_modules/jest/bin/jest.js --config docs/retention/execution/P12/evidence/jest.storage.cjs --runInBand --no-cache --json --outputFile docs/retention/execution/P12/evidence/STORAGE_RESULTS.json`. Actual absolute arguments/times/exit appear in STORAGE_EXECUTION.json.

P12 config extends the inspected direct SWC Jest config and restricts roots/testMatch to one queue suite. No Next application config or dotenv is loaded. Environment is allowlisted OS/runtime entries, NODE_ENV=test, existing Playwright browser path and telemetry disabled; no database/provider environment is inherited. Existing Jest setup mocks Prisma/router/notifications, but **the storage suite uses real Chromium IndexedDB and WebCrypto**, not an IndexedDB mock. It imports no application DB client. No new dependencies installed.

Effects: isolated loopback HTTP server on an OS-selected port serves only synthetic HTML and transpiled queue helper; ephemeral browser contexts and a test-created persistent profile use synthetic identifiers. The profile's resolved path is verified beneath the temp directory's `stoquify-offline-test-` prefix before recursive cleanup. Test afterEach/afterAll close contexts, browser and owned server. No application, Prisma target, schema, migration, seed, provider or customer data is used. Node child process is launched hidden. Writes are P12 logs/results plus ephemeral browser storage/temp/cache effects.

First attempt: exit 1, 25 failed/zero passed, each unable to navigate the fixture (`ERR_NETWORK_ACCESS_DENIED`). This is an environment-blocked attempt, not 25 demonstrated queue defects. Copies retained as STORAGE_SANDBOX.log, STORAGE_SANDBOX_RESULTS.json and STORAGE_SANDBOX_EXECUTION.json before retry.

Reviewed escalation allowed the same loopback fixture. Final: exit 0, **25 passed, zero failed/skipped, one suite**, Chromium 149.0.7827.55 on Windows, 1280×720. Exact fixture envelope in STORAGE.log. Cases include offline/reconnect, restart of persistent profile, cross-tab leases, corrupt/null/missing durable records, immutable identity, quota/abort failure, stale acknowledgements and batch cap. Case-level results retained. The success is isolated browser storage only; no actual app sign-in, database, device power loss or full offline startup was tested. The process exited normally after fixture cleanup. No automatic approval rejection occurred.

## Evidence and document verification

- `node docs/retention/execution/P12/evidence/review.cjs`: read selected raw Jest records and current source, record hashes/counts/assertion statuses and selected graph nodes/edges. Retains the superseded 47-case P03 run and final 48-case result separately; 29 inventory tests were intentionally filtered from the selected three-case run. The earlier P06 60-pass/three-timeout attempt is not the final 64-case result.
- `node docs/retention/execution/P12/evidence/acceptance.cjs`: render all 42 original P01–P11 criteria with P12 judgments, evidence and accountable roles; no application execution.
- `node docs/retention/execution/P12/evidence/finalize.cjs`: check local document links, exact 42-item coverage, status-row-only change, source/baseline preservation and fresh storage/workflow results; write VALIDATION and MANIFEST under P12. It does not run application commands. Final manifest excludes itself and contains raw hashes of owned artifacts.

Read-only discovery initially guessed nonexistent cohort/accountant paths and one wrong STATUS directory; `rg --files` resolved actual locations. Those failed lookups are not evidence that the capabilities are absent. No semantic conclusion relies on truncated tool output. The detailed stored manifests/results are available to consumers.

Initial finalization exited 1 because four concurrently edited landing files differed from the captured baseline. VALIDATION_ATTEMPT_1.json preserves that observation. Selected diffs/statistics confirmed unrelated public-page/story/style/test work. P12 did not modify or revert those files. The validator now records the exact observed concurrent hashes separately and still rejects unexplained drift, changes to checkpoint-reviewed source, broken links or non-P12 register edits. `sourcePreserved: false` honestly records that the entire observed tree was not static; `relevantSourcesStable` is the bounded preservation check. This does not update any command-registry fingerprint or grant a release waiver.

Not performed: builds, broad tests/lint/typecheck, migrations/seeds, production/shared DB queries, authenticated application rerun, backup restore, provider/authority operations, legal/rule changes, expert sign-off, customer observations, installs, graph regeneration, deployment, commit or later prompts. Historical S/M/D/B are identified separately from P12 checks. No PDF was requested for this execution packet.
