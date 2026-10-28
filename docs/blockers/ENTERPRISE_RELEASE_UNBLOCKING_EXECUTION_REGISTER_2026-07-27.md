# Enterprise Release Unblocking Execution Register

**Started:** 2026-07-27  
**Source plan:** `ENTERPRISE_RELEASE_BLOCKER_UNBLOCKING_EXECUTION_PLAN_2026-07-27.md`  
**Current release posture:** development continues; pilot and production remain fail-closed  
**Current tree classification:** active development tree, not a release candidate

## Program controls

- Do not freeze or request artifact-bound approval while implementation changes continue.
- Do not use country-pack production claims until authentic expert and checker evidence passes.
- Do not place secret values, database URLs, or personal approval data in this register.
- Do not treat a generated build artifact as passed until its command exits successfully.
- Do not run destructive database verification outside an explicitly identified test database.

## Live blocker state

| ID  | State                   | Owner role                                   | Current evidence                                                                                                                                                    | Next action                                                                          |
| --- | ----------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| B01 | READY                   | HRIS/payroll engineering                     | All 11 exported actions are explicit `async` wrappers; 2 focused suites and 6 tests pass; typecheck passes; diagnostic production build exits 0 with valid artifact | Preserve the focused tests and production build as required gates                    |
| B02 | READY                   | Payroll engineering / database platform      | Canonical gate passes: 9/9 triggers, 14/14 forbidden mutations blocked, 3/3 allowed lifecycle mutations pass, zero blockers; 4 suites and 35 focused tests pass     | Preserve as a required integration/release gate                                      |
| B03 | BLOCKED_EXTERNAL_CONFIG | Platform/database                            | Production database URL and target safety evidence are absent                                                                                                       | Platform owner provisions approved target and backup/restore evidence                |
| B04 | BLOCKED_EXTERNAL_CONFIG | Security/platform                            | Three managed production secrets remain absent                                                                                                                      | Security operator creates independent managed secret versions                        |
| B05 | REQUIRES_EXPERT_REVIEW  | Qualified reviewer / authorized operator     | Seven source hashes remain symbolic/unbound                                                                                                                         | Complete independent source verification after expert review                         |
| B06 | REQUIRES_EXPERT_REVIEW  | Compliance/legal                             | Cameroon readiness remains 10/12                                                                                                                                    | Obtain authentic expert decision, signed artifact, and separate checker verification |
| B07 | BLOCKED_DEPENDENCY      | Security / service owners                    | Fifteen credential classes remain unresolved                                                                                                                        | Start only after stable managed endpoints and secret references exist                |
| B08 | BLOCKED_DEPENDENCY      | Release manager / SRE                        | Operational register remains incomplete                                                                                                                             | Assign owners now; deploy scheduler/alert evidence after platform baseline           |
| B09 | NOT_STARTED             | Release manager / independent reviewer       | Current tree contains extensive concurrent development changes                                                                                                      | Cut a clean candidate only after B01–B08 implementation work stabilizes              |
| B10 | BLOCKED_DEPENDENCY      | Product/security/release authorities         | Approvals and six accepted operational assignments absent                                                                                                           | Bind approvals only to the final frozen candidate                                    |
| B11 | NOT_STARTED             | Release authority                            | Phase 2B entry depends on gate 017 GO                                                                                                                               | Rerun only after B01–B10 pass                                                        |
| B12 | NOT_STARTED             | Product/security/finance/release authorities | No pilot exit evidence                                                                                                                                              | Run only after a successful authorized Phase 2B pilot                                |

## Execution log

### 2026-07-27 — Baseline and orchestration

- Loaded `001-aqstoqflow-program-orchestrator`.
- Read the program blueprint, technical specification, and architecture graph.
- Confirmed graph-visible foundations: tenant defence, server-action security, ledger-first controls, RBAC, and enterprise error handling.
- Confirmed the working tree has extensive user-owned development changes; no freeze or broad cleanup is authorized.

### 2026-07-27 — B01 server-action build repair

- Root cause expanded from two read exports to all higher-order exported mutations in the `"use server"` module.
- Converted every exported action to a syntactically explicit `async` wrapper.
- Kept the existing `protect()` permission, fresh-auth, tenant-guard, audit resource, service call, and revalidation behavior unchanged.
- Focused verification passed:
  - `services/hris/__tests__/operational-time.service.test.ts`
  - `components/hris/__tests__/HrisOperationalTimePanels.test.tsx`
  - 2 suites, 6 tests.
- Typecheck passed against regenerated Next.js route types.
- Diagnostic build passed with exit code 0, no timeout, valid pre/post output, and no orphaned processes.
- Build evidence:
  - `what-next/build-diagnostics/enterprise-unblocking-b01/summary.json`
  - `what-next/build-diagnostics/enterprise-unblocking-b01/summary.md`
  - `what-next/build-diagnostics/enterprise-unblocking-b01/build.stdout.log`
  - `what-next/build-diagnostics/enterprise-unblocking-b01/build.stderr.log`

### 2026-07-27 — B02 payroll immutability recovery

- Captured the original full failure: the dedicated test database contained a half-applied migration.
- Identified a second repository constraint: the retained migration history cannot bootstrap an empty database because the earliest migration is a repair migration that assumes baseline tables.
- Added a fail-closed reset utility that:
  - accepts only local hosts;
  - accepts only database names containing `test` or `immutability`;
  - rebuilds the current schema with Prisma `db push --force-reset`;
  - installs trigger logic that Prisma schema representation cannot create.
- Updated the canonical npm gate to prepare the dedicated database, then run the runtime proof with migration replay disabled.
- Verification passed:
  - `npm run payroll:immutability:runtime`
  - 9/9 triggers.
  - 14/14 forbidden mutations blocked.
  - 3/3 allowed lifecycle changes passed.
  - zero blockers.
  - 4 focused suites, 35 tests.
- Evidence refreshed:
  - `what-next/payroll/payroll-immutability-runtime-check.md`
  - `what-next/payroll/payroll-immutability-runtime-check.json`

## Database diagnostic note

One direct Prisma diagnostic was invoked through a helper that sets `PAYROLL_IMMUTABILITY_DATABASE_URL` but intentionally does not replace `DATABASE_URL` for arbitrary child commands. Prisma therefore targeted the local development database `dbakesman`, applied four already-pending migrations, and stopped when `20260727110000_offline_pos_sync_foundation` encountered an existing `POSOfflineDeviceStatus` enum. No production database was contacted. The dedicated payroll gate was subsequently recovered and verified against `stockflow_immutability_test`.

A direct read-only query subsequently proved that `_prisma_migrations` contains an unfinished `20260727110000_offline_pos_sync_foundation` row (`finished_at=null`, `rolled_back_at=null`, zero applied steps) and a retained error log confirming the pre-existing `POSOfflineDeviceStatus` collision. Prisma status lists only the two later migrations as pending and does not expose that unfinished row. The discrepancy is therefore reconciled by classification: `dbakesman` is quarantined from all release evidence, and no resolve, reset, deploy, schema mutation, or data mutation was performed. Evidence: `what-next/blocker-execution/local-development-migration-history-diagnostic-2026-07-27.{md,json}`.

## Integration gate evidence

`npm run policy:gates:integration` completed successfully with exit code 0 on 2026-07-27. The retry-safe runner executed all 24 ordered gates in fail mode and reported `status=passed passed=24/24`.

The gate order is now declared in `scripts/policy-gates-integration-contract.json`. Both the runner and the statutory integration-versus-promotion separation check consume that same contract. Focused verification passed 3 suites and 18 tests, including negative cases that reject development or production country-pack gates in the integration chain.

Four transient Windows `UNKNOWN ... open` report-write errors occurred. Each affected gate remained nonzero and was retried until it passed; no gate or control was skipped. The successful consolidated exit resolves `EVIDENCE_IO_RETRY_REQUIRED`.

Constituent results include:

- inventory and service boundaries: zero active violations;
- regulatory boundary: ready across 1,417 checked files;
- API route guard inventory: zero active issues;
- public identity abuse: 15/15 in non-release mode;
- ledger close truth: 10/10;
- payment cash truth: 11/11;
- purchasing/AP: 11/11;
- offline POS replay: 16/16;
- country adapter pilot: 14/14 development checks, production authority still intentionally uncertified;
- AI copilot guardrails: 15/15;
- country-pack core integration: 8/8, with production activation and live submission prohibited;
- report trust/export: 17/17;
- role cockpit: 9/9;
- workflow assurance runtime tables: 7/7 and migration rows 3/3;
- receipt token: 4/4 in non-release mode with the production-secret warning preserved;
- payroll presence: 12/12;
- payroll immutability: 9/9 triggers, 14/14 blocked mutations, 3/3 allowed lifecycle changes;
- hard-delete, regulatory hardcode, demo trust, and raw-error boundaries: zero active violations;
- local Prisma migration safety: 8/8 with no destructive SQL findings.

### 2026-07-27 — Production-only lane snapshot and external handoff

- Production database preflight: 8/9 checks, blocked by `deployment_target_is_safe` and `database_url_missing`; no migration was attempted.
- Release secret preflight: 2/8 checks, with six presence/strength blockers across three purpose-specific secrets; no value was printed.
- Cameroon review preflight: 4/12; production country-pack gate: 10/12, blocked only by source hash verification and qualified expert approval.
- Credential rotation: 15 unresolved classes and 31 blockers.
- Operational readiness: 152 blockers; `activationAuthorized=false`.
- Created the controlling redacted handoff:
  - `docs/blockers/ENTERPRISE_RELEASE_EXTERNAL_WORKSTREAM_HANDOFF_2026-07-27.md`
  - `docs/blockers/enterprise-release-external-workstream-handoff-2026-07-27.json`
- Real assignees, external target references, approvals, and signatures remain deliberately unfilled.

### 2026-07-27 — Migration quarantine and downstream gate snapshot

- Reconciled the local `dbakesman` discrepancy by read-only inspection: the offline-POS migration has an unfinished history row and a confirmed pre-existing-enum collision.
- No database mutation or migration resolution was performed; `dbakesman` is quarantined from release evidence.
- Diagnostic evidence: `what-next/blocker-execution/local-development-migration-history-diagnostic-2026-07-27.{md,json}`.
- Phase 2A freeze report remains intentionally blocked for the active development tree: historical manifest 206/207, eight Phase 2A runtime drift paths, 406 current changes, and `activationAuthorized=false`.
- Phase 2B entry is 2/23 with 21 blockers and no authorization.
- Phased-execution audit is 36/37; its one incomplete requirement is the stale historical freeze attestation, not an unimplemented runtime control. A new freeze must wait until B03–B08 and release-affecting changes are complete.

### 2026-07-27 — Direct migration-history release proof

- Added `prisma:migration:history:health`, a read-only direct `_prisma_migrations` verifier.
- The gate blocks unfinished rows, unapplied repository migrations, genuine checksum drift, unknown successful migrations, and duplicate successful rows.
- LF/CRLF-only checksum equivalents are accepted; SQL content changes remain blocked.
- `prisma:migrate:deploy:safe` now requires the history proof after deploy. Protected CI and `verify:release` are order-ratcheted to run it before progression.
- Focused verification passed: 3 suites, 26 tests.
- Static migration safety passes 9/9; production preflight is 8/9 and remains blocked only because the approved production target is absent.
- Negative proof against quarantined `dbakesman`: 5/8, with one unfinished row, three missing migrations, and one genuine historical checksum mismatch. No mutation occurred.
- The complete development integration suite was rerun and passed 24/24.
- Evidence: `what-next/prisma-migration-history-health.{md,json}` and refreshed B03 preflight evidence.

### 2026-07-27 — External-input orchestration refresh

- `agent:external-inputs:report`: 1/13 checks passed, 102 blockers, activation and Phase 3 unauthorized.
- `agent:human-intervention:report`: nine human interventions remain, zero evidence-ready, safeguards intact.
- Authoritative next-command mapping remains in:
  - `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_EXTERNAL_INPUT_READINESS_2026-07-25.{md,json}`
  - `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_HUMAN_INTERVENTION_PLAN_2026-07-25.{md,json}`
- No external identity, endpoint, secret reference, approval, or operational acceptance was fabricated.

### 2026-07-27 — B03–B08 external evidence intake contract

- Added one redacted, owner-fillable intake manifest:
  - `docs/blockers/enterprise-release-external-evidence-intake-2026-07-27.json`
- Added a fail-closed validator that reconciles submitted references with the authoritative B03–B08 gate decisions:
  - `scripts/enterprise-release-external-evidence-intake.js`
  - `npm run enterprise:release:external-evidence:report`
  - `npm run enterprise:release:external-evidence:gate`
- The contract rejects secret-bearing fields and database URLs, synthetic identities or placeholder references, duplicate managed-secret/version references, reviewer/checker identity reuse, and any attempt to authorize activation through the intake.
- A completed manifest is not production approval. Each workstream remains blocked until its underlying authoritative gate is also ready.
- Focused verification passed: 1 suite, 6 tests.
- Live intake readiness is 1/6 with 71 redacted-reference or authoritative-gate blockers; only the fail-closed safety boundary passes.
- Generated evidence:
  - `what-next/enterprise-release-external-evidence-intake-readiness.md`
  - `what-next/enterprise-release-external-evidence-intake-readiness.json`
### 2026-07-27 — Cameroon runtime authority claim correction

- Completion audit found that the retained manifest and review decision correctly remained `PENDING_EXPERT_REVIEW`, but the runtime Cameroon pack still labeled CNPS fixtures `REGULATOR_CONFIRMED` and capability `SUPPORTED`.
- Reclassified the unapproved runtime state to:
  - `CNPS_CAPABILITY_STATUS = "SUPPORTED_DRAFT"`
  - `CNPS_VERIFICATION_STATUS = "SOURCE_CHECKED"`
- Development and sandbox consumers retain deterministic values with a non-authoritative watermark; production resolution now returns `PENDING_COUNTRY_PACK` until authentic approval and a reviewed runtime promotion exist.
- Strengthened `source_artifact_expert_approval`: a completed signed manifest cannot pass unless the runtime capability and verification constants are explicitly promoted to authoritative states.
- Added `runtimeAuthorityPromotionReference` to the B05/B06 external intake and post-signature runbook.
- Fixed the development gate to consume the canonical manifest-driven integration contract rather than assuming an inline npm command chain.
- Made statutory production report writes retry-safe after a transient Windows file lock.
- Verification:
  - Typecheck passed.
  - Regulatory runtime and statutory focused suites passed: 32/32, 19/19, and 17/17 in the executed bundles.
  - Country-pack development gate: 11/11.
  - Country-pack integration gate: 8/8.
  - Country-adapter pilot gate: 14/14; production authority remains uncertified.
  - Consolidated development/integration suite: 24/24.
  - Production country-pack gate remains intentionally blocked at 10/12 only by source hash binding and authentic expert approval.
## First-tranche exit criteria

- [x] Application build exits successfully.
- [x] Typecheck passes against regenerated Next.js route types.
- [x] Focused HRIS operational-time tests pass.
- [x] Canonical payroll immutability gate passes.
- [x] Payroll reset safety and migration contract tests pass.
- [x] Country-pack integration gate passes without production claims or activation.
- [x] Payroll presence gate passes 12/12.
- [x] All constituent development/integration gates were rerun and passed.
- [x] Consolidated integration command exits 0 after fail-closed retries (`24/24`).
- [ ] Platform, statutory, and operational owners are assigned in an authoritative system.

## Next command sequence

1. Authorized owners fill only their sections of `enterprise-release-external-evidence-intake-2026-07-27.json` with redacted authoritative references.
2. Run `npm run enterprise:release:external-evidence:report` and resolve the owner/reference checks without inserting secret values or a database URL.
3. Execute B03 production-target and B04 managed-secret provisioning in the authorized external environments and rerun their protected gates.
4. Dispatch and complete the existing Cameroon packet with a qualified independent reviewer and separate checker.
5. After B03/B04 stabilize, complete B07 credential rotation and B08 operational evidence.
6. Run `npm run enterprise:release:external-evidence:gate`; proceed to refreeze only when it passes.
7. Keep freeze, approval, pilot, and production promotion gates open until their authentic inputs exist.


