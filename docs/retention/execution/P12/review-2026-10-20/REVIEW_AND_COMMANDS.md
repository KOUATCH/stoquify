# P12 rerun — execution review

20 October 2026. Scope: application reads, P12 documents/evidence and its register row. ECC verification-loop was read; project V1/V6 rules override its generic broad build/type/lint recipe. No delegation or slash-command harness was assumed.

Read AGENTS, WORKFLOW, skill-routing, command-registry, test-lanes, common contract, verification guide, P12, roadmap M0/gates/capacity, predecessor results/continuations, P04 trust blockers and P01 decisions. Current original criteria/dependencies are independently extracted in PROMPT_CONTRACTS.json. Historical ledger wording is checked against that source.

## Executed commands and side effects

- `node docs/retention/execution/P12/review-2026-10-20/prepare.cjs`: reads Git/files, snapshots hashes/inventory, compares manifests, copies four old decisions and STATUS. Writes only this directory. It copied reviewed prior workflow/review helpers. Whole-tree Git diff emitted inherited dependency line-ending warnings; no normalization occurred. Nested dependency binaries are in status but excluded from selected-content hashing.
- `node docs/retention/execution/P12/review-2026-10-20/workflow.cjs`: fixed `npm.cmd run agent:workflow:check`, actual exit/log retained. Definition is `node scripts/verify-agent-workflow-contract.js`; absent pre/post hooks, fs/path/crypto runner and registry auditAllowed entry inspected. Runner validates references/hashes without executing application commands. Exit 0, 196 unclassified scripts.
- `node docs/retention/execution/P12/review-2026-10-20/review.cjs`: reads historical raw Jest records and current graph/source lines. No application import execution.
- `node docs/retention/execution/P12/review-2026-10-20/refresh.cjs`: verifies new packet raw hashes, compares 17 sources, checks retained original schema hash and all model/enum declarations; extracts current criteria. It corrects copied review metadata so all results in EVIDENCE_REVIEW.json, including original P12 storage, are historical to this rerun.
- `node docs/retention/execution/P12/review-2026-10-20/proof-check.cjs`: current pure projection regression, exact child arguments/exit/timestamps in PROOF_EXECUTION.json. OS-variable allowlist and NODE_ENV=test; no ambient database/auth values. 13/13 pass, zero skips.
- `node docs/retention/execution/P12/review-2026-10-20/update-documents.cjs`: asserts literal prior text, writes only P12 ledger/decision/order and its register row. New RESULT content is copied from result-content.md to P12/RESULT.md; that source template uses links relative to the final P12 location.
- `node docs/retention/execution/P12/review-2026-10-20/finalize.cjs`: reads baseline/current hashes, verifies exact criteria, raw evidence integrity, prior copies, links and non-P12 register preservation, then writes validation/manifest. No repair of unrelated code.

All helper bodies were reviewed before execution. Failed attempts are in ATTEMPTS.md. Original evidence remains unchanged.

## Focused test review

`jest.accountant-portfolio.config.cjs` uses nextJest() without a project dir, exact suite allowlist, no Next application config/dotenv/global setup. The direct invocation selects only close-assurance-current-proof.test.ts. It imports Prisma enums, the pure proof function and evidence grade/blocker helpers, with no database client construction or queries. Installed SWC transforms it. Test checks current retained exports, stale/voided/blocked states, findings, controls and absent evidence. It does not exercise aggregate SQL, current delegated authorization or the entire portfolio.

P02 reader/RBAC/module and P06 queue/panel/action/fixture hashes match latest evidence. The schema comparison reports only User/Organization/AccountantAccessGrant relation/key changes and four FirmEngagement models plus one enum. POSCommitResult/BusinessEvent/Location/Role declarations match. This is text analysis, not migration or DB proof. Installed client schema remains the earlier one; no generation occurred.

Current accountant actions/services add grant rechecks and delegated export locks/revalidation. AF01–AF03 result packets provide context; AF04 had no completed RESULT at inspection. Its authority contract is an intended contract, not proof all retention T02/T04 surfaces pass. Candidate integration stays U17.

No unchanged queue test was repeated merely for a new date. New accountant schema requires candidate-bound integration qualification, retained explicitly rather than claiming old tests ran against the new schema. No P02/P06 DB/browser was started by this checkpoint. The 18 October cleanup record remains dated evidence, not a fresh port probe.

## Nonexecution

No DB connection, application server, browser, migration, seed, build, whole-repository type/lint/test, provider interaction, contact, graph generation, install, deploy, stage or commit. No later retention prompt or separate accountant programme executed. P/C/E/O NOT_RUN. Graph nodes/current line anchors are in SOURCE_REVIEW.json; dated graphs are discovery only. M0 PARTIAL follows explicit scope/candidate/owner prerequisites, not failure of the completed bounded tests.
