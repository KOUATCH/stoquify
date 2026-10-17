# P05 — Execution result

> **17 October 2026 follow-up: PASS for the bounded checkout recovery contract.** The requested disposable-database and actual interrupted-response browser gaps are closed. The continuation also fixed a reproduced misleading failure notification. Final evidence: 9 lifecycle + 16 full-commit PostgreSQL tests, 40 mocked component tests, and actual Chromium response-loss/reconnect checks. See the [dated closure report](../P05-P06-closure-2026-10-17/RESULT.md) for exact scope, French-fixture limits, preserved failures and cleanup. This does not certify release readiness or close unrelated P04/deployment gates. The 13 October record below is retained as history.

**PARTIAL — bounded checkout identity defect fixed; required real-database and interrupted-response browser evidence remain pending.** Run: 13 October 2026. Only P05 executed. P06 and later prompts did not run.

The leased service path now rejects replacing a retained checkout operation ID even when its payload is unchanged. An expected failing regression reproduced the defect before the fix; **109 focused tests across six suites pass afterward**. These are mocked/pure/jsdom checks, not proof of real transaction concurrency or a rendered cashier journey.

## Baseline and ownership

HEAD `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`, branch `codex/migration-control-plane-release-2026-08-29`. Initial capture `2026-10-13T12:20:08.089444+00:00`: 15,171 dirty/untracked path entries; all **81 selected P01 fingerprints matched**. P01 and P04 predecessor results were inspected: their local preparation passed, while P01 D04 and P04 T01–T08 remain open for runtime/deployed claims. P02 remains PARTIAL; this fix does not depend on its missing cohort evidence.

[Initial baseline](evidence/INITIAL_BASELINE.json) captures 84 prior retention artifact hashes, 44 selected POS source hashes and original status text. [Final validation](evidence/VALIDATION.json) records actual preservation and owned drift. This is a dirty checkout, not an immutable release candidate. Historical predecessor statements that later prompts had not run are retained as dated history.

Exact owned changes:

1. [services/pos/pos.service.ts](../../../../services/pos/pos.service.ts#L2237): one retained operation-ID predicate and explanatory comment.
2. [pos.service.test.ts](../../../../services/pos/__tests__/pos.service.test.ts#L491): two regressions for mismatch rejection before financial work and matching-ID replay.
3. [commit-recovery.service.test.ts](../../../../services/pos/__tests__/commit-recovery.service.test.ts#L69): seven scoped lookup cases and one original-identity/amount recovery case.
4. [pos-full-commit.postgres.test.ts](../../../../services/pos/__tests__/pos-full-commit.postgres.test.ts#L134): one prepared, **unexecuted** regression comparing financial snapshots after substituted-ID rejection and original-ID replay.
5. [jest.retention-checkout.config.cjs](../../../../jest.retention-checkout.config.cjs): bounded four-suite runner using installed Next/SWC, no project `dir`, existing mocked setup. The storage-helper run uses reviewed CLI root/environment overrides.
6. This P05 directory and evidence; only P05's row in [STATUS.md](../STATUS.md).

Original four source/test files are retained in `evidence/*.before.txt`; [owned patch](evidence/OWNED_CODE.patch) is against those captured working-tree files, not HEAD, so it excludes pre-existing edits. No staging or commit. Source/action/UI files outside that list were inspected only.

## Implementation and decision

[Failure matrix](CHECKOUT_FAILURE_MATRIX.md) traces prepare → commit → read recovery and request retention, including before-commit uncertainty, response loss, same-key replay, changed payload, concurrency and scope denial. [Recovery state contract](RECOVERY_STATE_CONTRACT.md) distinguishes confirmed, unknown, rejected and conditional exact-retry states for P08. [Browser test script](BROWSER_REHEARSAL.md) preserves the pending rendered verification procedure.

The request hash excludes `clientCommitId` by design. Previously the leased service compared retained and attempted payload hashes without separately comparing IDs. A valid-lease service call could substitute the key while keeping the payload identical. The new negative test reached a successful mocked commit before the fix, establishing the uncovered service case. The normal protected browser action already prepares intent and rejects replacement; this is not evidence of a browser exploit or an observed customer duplicate charge.

The fix preserves original key equality without altering hash/schema versions or recorded-result replay. Existing action authority, write entitlement, draft/session/lease validation, monetary and stock kernels, accounting/period controls and receipt behavior remain in their owners. Lease validation may attempt its existing workspace CAS before the rejection; mocked tests prove no financial delegate work, not database rollback of that CAS.

**Data/schema impact: none.** No migration, seed, build, install, graph regeneration, production-data query, deployment, provider operation or customer contact occurred. No new commercial restriction or exit friction was introduced. ECC search-first and security-review skills from the installed 2.2.3 package guided bounded research; two read-only researchers traced backend and client paths. They made no edits and ran no application/database checks. Current source, not stale graph positions, controls the conclusions.

## Acceptance

| P05 criterion | State | Evidence and limitation |
|---|---|---|
| Identical replay produces one effect set and original confirmed outcome | PARTIAL | Modeled exact replay passes; original ID/outcome and unchanged mock delegate counts asserted. Real financial/concurrent snapshots remain NOT_RUN. |
| Changed payload and unauthorized tenant/location attempts rejected consistently | PARTIAL | Existing changed-payload/action cases plus seven exact-scope lookup cases pass. New operation-ID substitution is rejected. A recovery scope miss returns non-disclosing `NOT_FOUND`, not authorization or proof of non-commit. Persisted isolation and rendered denial remain unverified. |
| Uncertain state recoverable without duplicate sale or forced cart reset | PARTIAL | Source retention contract and modeled recovery/lifecycle/storage pass. Actual lost-response, reload, cross-register timing and duplicate-effect checks remain pending. |
| Mock and actual transaction evidence separate; zero-tax fixture not certification | PASS — reporting requirement | Evidence classes below; both PostgreSQL routes explicitly NOT_RUN. Synthetic zero-tax mapping does not certify OHADA/country tax behavior. |

Mandatory D/B checks keep P05 partial. Local implementation does not close M2 or any release/pilot gate.

## Verification record

Exact commands, exits, configuration and machine-readable counts are saved in [VERIFICATION.json](evidence/VERIFICATION.json). No skipped real-DB suite is represented as a pass.

| Class | Actual result on 13 October 2026 | Evidence / limit |
|---|---|---|
| S — source | Prompt/common contract/workflow/registry, P01/P04 results and fingerprints, current prepare/commit/recover/client paths, graphs, command hooks/config/imports and DB setup/cleanup inspected. | [Source manifest](evidence/SOURCE_MANIFEST.json). Scoped inspection, no full-platform or deployed assertion. Graph refresh dated 9 August 2026; current line references rechecked. |
| Workflow control | `npm run agent:workflow:check`: exit 0, 198 unclassified scripts. `node scripts/verify-agent-workflow-contract.js --command test:ecc:pilots`: exit 0, auditAllowed true. | Current definitions, absent relevant pre/post hooks and fs/path/crypto runner inspected first. Classification does not execute application commands. |
| M — reproduction | Focused `P05` test-name run before fix: exit 1, **1 failed / 1 passed / 52 filtered**. | [RED JSON](evidence/RETAINED_IDENTITY_BEFORE.json). Expected failing ID-substitution test resolved a sale instead of rejecting. Filtered cases were not counted as passes. |
| M — commit/recovery/actions | Scoped four-suite runner: exit 0, **90 passed / 0 skipped**, 11.61 seconds reported. Suite split: service 54, recovery service 23, tender action 10, recovery action 3. | [GREEN JSON](evidence/CHECKOUT_RECOVERY_AFTER.json). Prisma, authority and financial collaborators mocked; real helper execution does not make it a DB test. Ten new cases included. |
| M — lifecycle | V2-P before fix: 16 passed. Final V2-P after fix: exit 0, **16 passed / 0 skipped**, 10.162 seconds. | [Final JSON](evidence/CHECKOUT_LIFECYCLE_FINAL.json). Count these once in the final 109. Mocked transactional delegates. |
| M — storage | Scoped jsdom helper run: exit 0, **3 passed / 0 skipped**, 12.784 seconds. | [Storage JSON](evidence/PENDING_REQUEST_RESULTS.json). Synthetic sessionStorage, not rendered browser. |
| Syntax | TypeScript `transpileModule`, ES2022/CommonJS, four changed TypeScript files: exit 0, no reported diagnostics. | [Syntax JSON](evidence/SYNTAX_RESULTS.json). Not semantic typechecking. No broad lint/typecheck/build/suite run. |
| Artifact integrity | Prior artifacts, selected source drift, exact original-content preservation, P05-only status-row change, test counts and local links checked. | [Validation](evidence/VALIDATION.json). Scope-limited local preservation, not proof about every unowned file. |
| D — real database | NOT_RUN. No target selected and no DB connection attempted. | Five lifecycle cases and three full-commit cases, including the new P05 regression, require explicit disposable target/schema ownership. D04 remains open. |
| B — rendered/browser/device | NOT_RUN. No server/browser fixture started. | [Prepared script](BROWSER_REHEARSAL.md); no screenshots, network-interruption proof, focus/accessibility or device certification. |
| P — provider/authority | NOT_RUN. | No actual settlement, receipt delivery or authority operation. |
| C — customer outcomes | NOT_RUN. | No measured activation, satisfaction, churn, support or retention benefit. |
| E — qualified expert | NOT_RUN. | No accountant/legal/tax/security certification. |
| O — operational restore/load | NOT_RUN. | No deployed durability, recovery-time, load or incident-response proof. |

One source-discovery read used a nonexistent `implementation-prompts/STATUS.md`; the actual register is `execution/STATUS.md` and was read before its scoped update. This was not treated as verification evidence.

The artifact checker was run with the bundled Python executable and `-X utf8 docs/retention/execution/P05/evidence/validate_artifacts.py`. Its first pass found only its own not-yet-written `VALIDATION.json` links; that result is preserved in [initial self-link check](evidence/VALIDATION_INITIAL_SELF_LINK.json). After the output existed, the second pass exited 0 with every check passing. This is an artifact-ordering issue, not an application test failure. Final P01 fingerprint drift is exactly the owned `pos.service.ts` fix; the other 80 fingerprints and all 83 prior artifacts remain unchanged.

## Remaining risks and exact continuation

1. **D04: establish an explicitly owned disposable PostgreSQL target and prepared schema.** Inspect current runner/imports again. Lifecycle requires localhost and owned schema `codex_pos_lifecycle_20260920`, with required public tables/enums; it creates and drops its new schema. Full-commit requires localhost database matching `stoquify_pos_audit_YYYYMMDD_<hex>`, matching `POS_DISPOSABLE_DATABASE_NAME`, schema public and `RUN_POS_FULL_COMMIT_POSTGRES=1`. It refuses missing `ledger_posting_batches.postingCycle`; do not silently migrate another database. It writes fixtures and failure-injection trigger/function/sequence objects; injection objects are cleaned in `finally`, while fixture rows remain in the disposable database. No ambient `.env` target selection.
2. Run the two separately reviewed V3 commands below only after those prerequisites exist. Save per-case evidence: lifecycle lease concurrency, retired draft/rollback, isolation and edit/close; full-commit identity rejection/original retry, duplicate completion, and failure at durable-result finalization with unchanged financial snapshots. A synthetic zero-tax cash/credit sale is deliberately bounded.
3. Establish the reviewed disposable app/cashier/browser fixture and execute [B01–B06](BROWSER_REHEARSAL.md). Prove post-commit response loss independently. A late cross-register response is an unreproduced concern in component source, not fixed by this service predicate. Do not claim forced-reset prevention across timing boundaries until tested.
4. Re-evaluate all P05 acceptance criteria, append a dated run and update only P05. P06/P08/P12/P14 can consume the documented interface when separately requested, but must retain missing evidence and predecessor trust blockers. Do not start them through this continuation.

Prepared commands, **not executed**:

```powershell
node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --runTestsByPath services/pos/__tests__/checkout-lifecycle.postgres.test.ts
node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --runTestsByPath services/pos/__tests__/pos-full-commit.postgres.test.ts
```

Lifecycle additionally requires `RUN_POS_LIFECYCLE_POSTGRES=1`. These commands do not supply or authorize a target; flags are not evidence of ownership. No approval flow was invoked or rejected in this run.

Recovery/rollback: no persistence change requires rollback. If the guard needs correction, change only the owned predicate using the captured before-content as reference and preserve concurrent edits; do not reset the whole dirty file. Removing it would reintroduce the reproduced gap. Do not repair uncertainty by deleting registry/workspace evidence, resetting a cart or reposting money. Test/config/doc rollback is similarly scoped to the owned additions.

Metrics: no product telemetry added or changed. The 109 pass count and red-to-green regression are engineering evidence only. Future observation could measure unresolved original commit IDs, time to confirmed outcome and same-ID retry resolution using privacy-bounded evidence; no baseline or customer benefit was measured here.

Review lenses: architecture/backend/data ownership and financial integrity covered by the narrow service guard and existing controls; IAM/privacy by scoped recovery and sanitized conflicts; QA/SRE by evidence separation and pending runtime checks; product/support by preserving recoverable original intent; frontend/design/localization/accessibility by a source-only handoff with no UI edits. POS/receipt integration examined without providers; audit evidence retained. New APIs, payroll/AP/close features, country-rule changes, pricing, AI autonomy and organizational rollout: not applicable because none is changed or executed.
