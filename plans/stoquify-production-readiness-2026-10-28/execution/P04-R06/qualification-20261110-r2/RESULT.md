# P04-R06: repair implemented; full-app qualification blocked

The bounded bookkeeping repair is implemented. Independent source review and 116 isolated mocked tests passed. The full build has not started because memory capacity is below the reviewed requirement. Current source also differs from the frozen candidate: nine modified and three added files; all 68 selected P04-R06 inputs still match. No repaired-artifact session or browser qualification is claimed. Parent P04, P04-V02 and production admission remain blocked.

## Verified work

| Evidence class | Observed result | Evidence |
| --- | --- | --- |
| Source | Two product files and four regression files; 68 selected inputs and 9,789 candidate files reconciled | [Source admission](independent-review/REPAIR-SOURCE-ADMISSION.json), [candidate admission](candidate-admission.json) |
| Current snapshot | Nine modified files and three additions; 68 R06 inputs unchanged; successor candidate required | [Source comparison](independent-review/CAPACITY-CHECKPOINT-SOURCE-REVIEW.json) |
| Mocked tests | 116 passed; 5 suites; 0 failures/skips; isolated from application environment and network | [Independent unit review](independent-review/UNIT-OUTCOME-REVIEW.json) |
| Dependencies | 152,806 copied files matched the archive; 2,998,378,443 bytes; verified reuse, not a clean install | [Dependency review](independent-review/DEPENDENCY-STAGING-OUTCOME-REVIEW.json) |
| Native database preparation | 122 migrations; 16 synthetic users; 32 accounts; 0 issued sessions | [Database review](independent-review/DATABASE-OUTCOME-REVIEW.json) |
| Full build | No client-generation or compiler commands executed; capacity gate failed | [Build entry](build-result.json), [latest capacity](resource-retry-ready-attempt02-r2.json) |
| Real sessions/browser | Not run on this repaired candidate; 107 cases mapped to 58 original requirements | [Qualification contract](runtime/qualification-contract.json) |
| Recovery | Owned database suspended; exact fixture/state preserved; resume recipe reviewed | [Suspension receipt](database/capacity-suspension.json), [resume recipe](database/resume-after-capacity.cjs) |
| Independent outcome | Accurate blocked checkpoint accepted; qualification not passed | [Final review](independent-review/FINAL-CAPACITY-OUTCOME-REVIEW.json) |

## Repair and preserved boundaries

The credential before-hook applies the installed form-CSRF guard before account lookup or lock audit and no longer resets expired locks. The after-hook updates credential bookkeeping only for a genuine session-token/user success or the native401 INVALID_EMAIL_OR_PASSWORD result. Other outcomes do not become failed passwords. Genuine wrong-password and 30-minute threshold-lock behavior remains covered by explicit tests.

Current continuation ownership is limited to lib/auth.ts, lib/security/credential-sign-in-outcome.ts and four regression files. Earlier current-session protection and unrelated edits are preserved. E01–E29 and every prior failed observation remain unchanged; this packet does not turn old failures into passes.

## Blocking evidence and next action

Final source comparison found nine modified files and three additions, giving 9,792 current files versus 9,789 in the intact frozen candidate. All 68 selected P04-R06 inputs and the six owned repair/test files still match. This is an identity finding, not a correctness judgment on the concurrent finance/payment changes. Preserve them and admit a successor candidate before building. See [exact source delta](independent-review/CAPACITY-CHECKPOINT-SOURCE-REVIEW.json).

The latest readiness check recorded 6.64 GiB available physical memory and 11.27 GiB remaining commit capacity against unchanged 6/12 GiB requirements. Storage passed. Releasing only owned analysis kernels did not establish sufficient capacity. The original failed entry and both subsequent readiness observations are retained.

First reconcile the recorded concurrent source delta and capture an independently reviewed successor candidate/context while preserving the frozen candidate and unrelated edits. Follow RETRY-HANDOFF-20261110-r3.md: verify schema, migrations, dependencies and fixture compatibility; explicitly rebind the retained database and downstream recipes to the successor. The old retry is ineligible while its exact-root guard fails. After a fresh capacity check passes at least 6 GiB available physical memory and 12 GiB remaining commit capacity, use the newly admitted recovery/build sequence and obtain native resumed-state review. Then complete the isolated build, current-source/fixture preflights, all 107 cases mapped to 58 requirements, owned cleanup, independent outcome review and successor publication. Do not overwrite previous candidates, receipts or unrelated changes.

Even after R06 passes, R08 module enforcement, R07 failed-refresh recovery, R05 approved finance visibility implementation and remaining P04 qualification obligations still block parent completion. Those implementations are not authorized by this continuation.

No commit, push, deployment, production flag change or production-data migration occurred. Hosted/provider/operator admission, clean-install reproducibility and whole-system production readiness are not certified.
