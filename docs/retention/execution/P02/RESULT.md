# P02 — Execution result

**PARTIAL — local outcome slice implemented and verified with pure/mocked tests; required real-database evidence is blocked.** Run: 13 October 2026. No later prompt was run.

HEAD `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`, branch `codex/migration-control-plane-release-2026-08-29`. [P01 revalidation](evidence/BASELINE_REVALIDATION.json): HEAD unchanged and all 81 selected source fingerprints matched at start. Initial checkout had 400 modified tracked files and 14,662 untracked entries; this is not a clean release candidate. Prior report, roadmap, prompt pack and P01 evidence are preserved. See [source trace](SOURCE_TRACE.md) and final [validation](evidence/VALIDATION.json) for exact scope/provenance.

## Delivered implementation

- [retention-outcomes.ts](../../../../services/analytics/retention-outcomes.ts): source-backed scalar projection. Deduplicates sale completion, retains refund/void observations, rejects mixed tenant/location rows, excludes unresolved/invalid evidence, preserves unknown attribution.
- [retention-outcomes.service.ts](../../../../services/analytics/retention-outcomes.service.ts): server-authorized, bounded POS registry/correction reads using a RepeatableRead transaction. Reuses existing RBAC, tenant and module controls. No endpoint or automatic collector added.
- [retention-cohorts.ts](../../../../services/analytics/retention-cohorts.ts): versioned synthetic observation evaluator and explicit cohort denominators, including missing and immature observations.
- Tests: [projection](../../../../services/analytics/__tests__/retention-outcomes.test.ts), [reader](../../../../services/analytics/__tests__/retention-outcomes.service.test.ts), [cohorts](../../../../services/analytics/__tests__/retention-cohorts.test.ts), [shared synthetic fixtures](../../../../services/analytics/__tests__/retention-fixtures.ts).
- [Isolated test configuration](../../../../jest.retention-outcomes.config.cjs), [metric contract](METRIC_CONTRACT.md), [synthetic expectations](SYNTHETIC_COHORT_EXPECTATIONS.md), [source trace](SOURCE_TRACE.md), evidence in this directory and P02's row in [STATUS](../STATUS.md).

Those eight code/config/fixture files plus this P02 directory and P02's status row are the complete owned write scope. No pre-existing application file, financial writer, dependency, package script, schema or migration changed. No backfill, installation, graph regeneration, customer contact or deployment occurred. **Data/schema impact: no new persistence or schema change; new read queries only.** Existing RBAC/module auditing may write its existing denial evidence when the entry point is invoked; this run mocked those dependencies.

## Acceptance

| P02 criterion | State | Evidence / remaining boundary |
|---|---|---|
| Repeated finalized operation counts once; reversal explicit; failed/uncertain operations are not completed | PARTIAL: S/M PASS; D BLOCKED | COMMITTED/COMPLETED collapse by org/sale; CLAIMED excluded; refund/void explicit; conflict and invalid evidence tests pass. Real persisted source uniqueness, query results and transaction snapshot remain unverified. |
| Cross-tenant reads denied; sensitive payloads excluded | PARTIAL: S/M PASS; D BLOCKED | Fresh reports+sales authorization, tenant helper, module denial, location binding and defensive source checks; query/output allowlist assertions pass. These are mocked dependency decisions, not real session/DB certification. |
| Demo/jobs excluded from human adoption; missing/immature never inferred churn | PASS for conservative local contract; live attribution BLOCKED | Synthetic TEST/DEMO/AUTOMATED excluded. Real-source provenance/role is UNKNOWN and human eligible count null. Missing, partial, unactivated, non-trading and immature windows remain distinct. Actual qualified human cohort collection is intentionally not claimed. |
| Working measurement slice and documented remaining instrumentation, or concrete architecture blocker | PARTIAL | Pure projection and mocked server reader work; versioned contracts and executable cohort fixtures exist. D04 disposable target and D12 source classification/completeness decisions prevent a runtime/human-adoption claim. No speculative warehouse was built. |

The local slice is useful for review and continuation. **Do not mark P02 fully passed or consume it as runtime-qualified measurement.** P12/P18/P22 can use the contracts as proposals and tests as synthetic evidence, while retaining these blockers.

Concurrent checkout activity was observed outside this task: dashboard page/access-test changes and UI/UX execution/report evidence appeared after the initial snapshot. These are unrelated to P02, were neither edited nor reverted, and are listed separately in final validation. Preservation checks compare P01's selected fingerprints and initial Git-status metadata; they are not a byte-level audit of all unrelated untracked content.

## Verification actually performed

| Class | Result | Procedure / evidence |
|---|---|---|
| S — source | PASS, scoped | P01 81-hash comparison, current Git identity/status, graph/current-source POS trace, auth/module/query/privacy review. See SOURCE_TRACE and evidence manifests. |
| Workflow control | PASS, exit 0 | `npm run agent:workflow:check`. Inspected script, fs/path/crypto imports, package definition, absent pre/post hooks and reviewed registry first. Reported 198 unclassified package scripts; none executed by the control check. |
| M — pure/mocked tests | PASS, **3 suites / 65 tests**, exit 0 | `node node_modules/jest/bin/jest.js --config jest.retention-outcomes.config.cjs --runInBand --no-cache --json --outputFile docs/retention/execution/P02/evidence/JEST_RESULTS_FINAL_02.json`. [Raw final result](evidence/JEST_RESULTS_FINAL_02.json); no skips. The earlier passing run is retained; this final rerun uses distinct synthetic sale IDs across target weeks. |
| Targeted type check | PASS, exit 0 | Installed TypeScript `--noEmit --incremental false --skipLibCheck --target ES2022 --module commonjs --moduleResolution node --types "node,jest"` over the two pure modules, their two test suites and shared fixture. This does not typecheck the service's full application dependency graph. |
| D — real database | BLOCKED / NOT_RUN | No explicitly owned disposable PostgreSQL target established by this run or P01. New query semantics trigger V3; no environment values inspected, ambient target used, schema prepared, query executed or migration applied. |
| B — browser/rendered | NOT_RUN | No UI/endpoint changed or synthetic browser target established. |
| P — provider/authority | NOT_RUN | No provider integration or external operation. |
| C — customer outcomes | NOT_RUN | No actual usage, observed customer cohort, satisfaction or churn measurement. |
| E — expert review | NOT_RUN | Activation/calendar/metric-owner proposals still need owner review; no accounting/tax claim made. |
| O — operational restore/load | NOT_RUN | No restore, load test, deployment or availability claim. |

The focused Jest configuration was reviewed as a new direct command, not falsely classified as an existing registry lane. It uses installed Next/SWC with no Next application config, dotenv, global Jest setup, migrations or DB bootstrap. Three exact suites are selected; the service suite mocks DB, RBAC, module access and error dependencies, and supplies a virtual `server-only` marker. Prisma's installed enum/type runtime is reused; no client is instantiated. The first test run failed to resolve that marker: 2 suites/49 tests passed, 1 suite failed to load, exit 1. [Initial evidence](evidence/JEST_RESULTS.json) is retained; the virtual mock fixed the harness, after which all 65 tests passed. A source review also added a transaction-clock regression: database recording time can precede application occurrence time. Exploration encountered Windows literal-glob path misses; corrected directory searches were used, with no claim that failed searches verified behavior.

## Assumptions and risks

Current source stores actor identity, but not historical role or authoritative live/demo/job classification. Do not infer either from current membership or an actor ID. All real-source rows remain unclassified for human adoption. Persisting/filling that evidence needs a reviewed source contract and D12, not heuristic labels. Activation milestone producers, organization calendar resolution, multi-location reviews, finance-close outcomes, offline provenance and completeness watermarks are documented gaps. They were not implemented through later prompts.

This reader measures current durable records within a bounded window. It is not a historical time-travel store, net revenue report or complete attempted-operation denominator. Source deletion/legacy coverage, receipt-state updates, clock semantics and corrections outside the selected window constrain interpretation. Source failure/overflow is explicit; source-only zeros cannot become churn. Whole-application build/typecheck, existing unrelated suites and runtime performance were not run.

Read-side recovery: retry the bounded query after transient failure; there are no analytics writes to replay or roll back. Local rollback removes only the eight newly owned code/config/test files and supersedes this evidence/status. Never delete business records, restore unrelated files to HEAD, or erase prior evidence.

## Exact continuation — P02 only

1. Establish an explicitly disposable local synthetic PostgreSQL target and review its preparation/cleanup and generated schema/client compatibility. Do not infer authority from an ambient URL. Prepare only owned fixtures for two tenants and two locations.
2. Execute the new query shape on persisted CLAIMED/COMMITTED/COMPLETED rows, duplicate retries/uniqueness, refund/void events, boundary timestamps, conflicting/foreign rows, overflow and failure cases. Verify the declared transaction snapshot with real concurrent fixture changes and rollback/cleanup. Preserve the current mocked evidence separately. No ready-made dedicated retention PostgreSQL runner is claimed.
3. Resolve D12's historical role/provenance/completeness contract before implementing a real human-cohort collector; maintain UNKNOWN until trustworthy evidence exists. Record owner decisions and permitted data retention. Do not backfill customer data or start another prompt.
4. Append dated verification evidence here, update this RESULT and only P02's STATUS row. Promote acceptance only when mandatory evidence exists. **P03–P24 remain NOT_RUN.**

## Review lenses

Architecture/backend/data: reuse durable registry/event ownership and read-side replay; no new write model. Security/privacy: fresh server authority, strict tenant binding, module gate and scalar allowlist. Product/analytics: explicit definitions, denominators and attribution gaps. QA/SRE: bounded queries, visible failures and separate unit/DB proof. Finance/POS/audit: count committed outcomes independently of receipts, retain corrections without financial-value inference. Packaging/support: no cancellation, pricing or service-promise changes. Frontend/accessibility/localization, payroll/statutory rules, external APIs/providers and AI autonomy: not applicable to this slice because none of those behaviors changes; no certification inferred.
