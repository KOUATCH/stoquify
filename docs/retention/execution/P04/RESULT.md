# P04 — Execution result

**PASS — local access-test foundation, trust map and recovery protocol prepared. Live trust/recovery gates remain blocked.** Run: 13 October 2026. Only P04 executed; P05–P24 were not run. P01 is the hard predecessor; P02 remains PARTIAL and P03 remains prepared synthetic evidence, unchanged.

HEAD `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`, branch `codex/migration-control-plane-release-2026-08-29`. Initial capture at `2026-10-13T10:13:01.220287+00:00`: 15,123 dirty/untracked path entries; all **81 selected P01 fingerprints matched**. This is a dirty working tree, not an immutable release candidate. [Initial baseline](evidence/INITIAL_BASELINE.json) retains path/status scope, prior artifact hashes and the original execution register; [final validation](evidence/VALIDATION.json) records preservation and any concurrent changes.

## Delivered and implementation decision

- [ACCESS_MATRIX](ACCESS_MATRIX.md): each proposed pilot path, server authority, related-resource/location/module scope, denial case and evidence class; stale graph nodes checked against current source.
- [RECOVERY_PROTOCOL](RECOVERY_PROTOCOL.md): inspected restore source/target guards and cleanup limitations; explicit identity sheet, synthetic controls, database/object/key dependencies, worker containment, revocation reconciliation, recovery measurements and cleanup.
- [TRUST_BLOCKERS](TRUST_BLOCKERS.md): eight scoped runtime, policy/integration and operational gaps with owners and continuation cases. None grants live onboarding authority.
- **20 additional negative/contrast cases** across accountant consent (8), operating location scope (2), module read/export/job distinction (4) and background export (6). Reused existing services, in-memory export store and crypto helpers.

The exercised authority cases passed without a production fix. No production boundary was changed simply to make this task appear to implement a feature. Missing module coverage, assigned-location policy and download wiring are documented for precise follow-up; they are not asserted to be proven exploits or silently considered safe. No new permission, commercial restriction, cancellation rule or export redaction was introduced.

**Data/schema impact: none.** All added fixtures are synthetic and in memory. No customer/production records were queried, no database/migration/seed/restore/build ran, and no dependency, graph, deployment setting or secret changed. No contact with customers/providers/reviewers occurred.

## Exact owned files

1. New `services/accounting/__tests__/accountant-access-retention-boundary.test.ts`.
2. New `services/operating-access/__tests__/operating-access-retention-boundary.test.ts`.
3. New `services/modules/__tests__/module-retention-access.test.ts`.
4. Added six cases to `services/inventory/__tests__/inventory-history-background-export.service.test.ts`; original content captured in `evidence/INVENTORY_TEST_BEFORE.txt` and fingerprinted before editing. Existing content preserved.
5. New `jest.retention-access.config.cjs`: seven exact mocked suites and bounded roots, installed Next/SWC without project `dir`, existing mocked setup; no application Next config or `.env` loading.
6. This P04 directory and evidence; **only P04's row** in `../STATUS.md`.

No staging or commit. Unrelated tracked/untracked changes and prior P01/P02/P03 artifacts preserved. Skills: ECC search-first and security-review from the installed 2.2.3 package; repository controls take precedence over generic install/build advice. Two read-only researchers supplied pilot-path and recovery traces under search-first; neither edited files or ran application/database tests. No external comparison or new dependency justified registry/web research.

## Acceptance

| P04 acceptance | State | Evidence and precise limit |
|---|---|---|
| Trust matrix maps every pilot path to server authority and a specific denial case | PASS — source map | ACCESS_MATRIX includes setup, checkout/recovery/offline, stock/receiving, reconciliation/close, accountant read/export/review, background artifacts, receipt/media and proposed archive. Unimplemented or unproven paths are explicitly marked, not filled with invented authority. |
| Any changed authority boundary has focused regression evidence and no client-supplied tenant trust | NOT_APPLICABLE to production changes — none; focused regression requirement PASS | 20 added cases and current existing RBAC/protect/scope/entitlement/export suites pass. Server-derived boundaries remain unchanged. Mocks are not persisted isolation or race proof. |
| Recovery protocol identifies DB/files/operational dependencies and does not claim proposed RPO/RTO achieved | PASS — prepared protocol | Current local restore source guard, `.env` fallback, target refusal, count/schema limits, exception cleanup, keys/objects/workers and independent proof steps documented. RPO 15 minutes/RTO 4 hours remain unmeasured. |
| Missing deployment evidence explicit and cannot unlock live onboarding | PASS — blocker record | T01–T08 and P01 D04/D08/D10/D11 retained; Gate A/B not passed. No restore or live pilot performed. |

This completes P04's local preparation mission. It does not complete R06, Gate A, production isolation, archive delivery or recovery readiness.

## Verification performed

| Class | Exact procedure/result | Limit |
|---|---|---|
| S — source inspection | Current prompt/common contract/workflow/registry, predecessor P01 evidence and 81 fingerprints, authority/callers, existing graphs, test imports/setup and restore/storage/worker/incident source. [Source manifest](evidence/SOURCE_MANIFEST.json). | Scoped inspection; no full-platform certification or deployed configuration inspection. |
| Workflow control | `npm run agent:workflow:check`: exit 0; 198 unclassified scripts. `node scripts/verify-agent-workflow-contract.js --command test:ecc:pilots`: exit 0/auditAllowed true. | Definitions, lifecycle absence, fs/path/crypto helper, registry and setup reviewed first. Gate executes no application commands. |
| M — existing RBAC | `node node_modules/jest/bin/jest.js --config jest.ecc-pilots.config.cjs --runInBand --no-cache --selectProjects ecc-unit --runTestsByPath lib/security/__tests__/rbac.test.ts --json --outputFile docs/retention/execution/P04/evidence/RBAC_RESULTS.json`: **1 suite / 8 passed, 0 skipped, exit 0**. | Better Auth, Prisma and audit mocked. [Raw JSON](evidence/RBAC_RESULTS.json). Direct runner retained inspected package definition/config and avoided the previously observed npm argument-forwarding issue. |
| M — scoped access/export | `node node_modules/jest/bin/jest.js --config jest.retention-access.config.cjs --runInBand --no-cache --json --outputFile docs/retention/execution/P04/evidence/ACCESS_RESULTS.json`: **7 suites / 57 passed, 0 skipped, exit 0**, 13.513 seconds reported by Jest. | [Raw JSON](evidence/ACCESS_RESULTS.json). Prisma mocked; in-memory outbox/artifact adapters and injected fixed secret/clock. Real crypto exercised, no provider fetch or real transaction. |
| Artifact integrity | Baseline hashes, original inventory test content, unchanged prior artifacts/non-P04 status rows, linked artifact paths and actual test counts. [Validation](evidence/VALIDATION.json). | Proves retained local outputs, not release provenance of every unowned file. |
| D — real database | NOT_RUN; no target selected or connection made. | Current persisted session/grant revocation, DB isolation and races require V3. |
| B — rendered/browser/API/device | NOT_RUN; no server/browser started. | HTTP delivery, direct static paths, session cookies and denial UX require V4. No accessibility claim. |
| P — provider/authority | NOT_RUN. | UploadThing/deployed object ACL, backup service and real integrations unverified. |
| C — customer outcomes | NOT_RUN. | No activation, retention, support response or satisfaction measurement. |
| E — qualified expert | NOT_RUN. | No legal/accounting/security/privacy certification or approved live role/data-right policy. |
| O — restore/load/operations | NOT_RUN; V5 deferred to P17. | No measured RPO/RTO, object restore, worker recovery or support coverage. |

The first new Jest invocation had broad default repository roots and produced no test result before it was interrupted (exit 1). Roots were restricted to the relevant test directories and the subsequent run passed. During runner preparation an initially named test intent `background_job` was corrected to the actual `job` contract before the passing run. These are task-local test/runner corrections, not application fixes. Source discovery encountered absent guessed action/helper paths; current paths were located and used. No absent path or interrupted run is reported as passing evidence. No broad typecheck/lint was run; SWC execution is not TypeScript type certification.

## Risks, recovery and next action

Do not broaden the 65 passing mocked tests into a tenant-security guarantee. The material remaining blockers are entitlement coverage differences, unresolved per-site operational policy, absent demonstrated streaming delivery, possible deployed legacy-static alternative, runtime revocation races, and unverified backup/object/key/worker operations. T02/T03 require policy and exact entry-point reproduction before changes; do not impose new exit restrictions to hide these gaps.

Recovery for P04 is scoped removal/supersession of its new tests/config/docs and the appended inventory cases, preserving the captured original test and all concurrent edits. No application/data rollback is required. Actual recovery must use the separate protocol; never reset domain history or replay external actions blindly.

No product metrics were instrumented. New evidence metrics are test cases and pass/fail counts only. Future RPO/RTO definitions and incident/queue/object controls are in the protocol; no measured business benefit is claimed.

Next sequential prompt, **only when requested**, is P05. It may consume this source map for local checkout work while retaining T01–T08 and its own runtime gates. P07/P09/P10/P13/P15/P16/P17 and later consumers use only the relevant scoped evidence. P05–P24 did not run.

Review lenses: architecture/domain/data ownership mapped; security/privacy covered with bounded negatives and open gates; QA/SRE covered by separate evidence classes and recovery protocol; product/commercial covered by scope/data-right limitations. Frontend/design/accessibility/localization: no UI change, runtime denial presentation unverified. Financial/audit continuity: retained evidence and no replay/double-post assumptions. Country/tax calculation, payroll execution, AI autonomy, pricing and new live integrations: not applicable because none is changed or executed.
