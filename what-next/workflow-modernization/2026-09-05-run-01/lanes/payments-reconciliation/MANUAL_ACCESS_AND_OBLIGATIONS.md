# Manual reconciliation access and retained obligations

Evidence date: 2026-09-05. Status: bounded corrections implemented; complete reconciliation and platform workflow review remain in progress. This record supersedes item 1 in the earlier manual-matching checkpoint. Final verification and source bindings are recorded in `evidence/reconciliation-access-receipt.json` after verification finishes.

## Findings and corrections

1. **Manual writes omitted current module eligibility.** The page and sign action already enforce reconciliation access, but proposal and approval did not. The new baseline reproduced eight failures among 46 tests. Both actions now declare the canonical reconciliation write guard. The service independently evaluates persisted organization/configuration/grant state inside the financial transaction, before reading payment/proposal evidence. A client selection, passed entitlement override or wildcard role cannot establish commercial authority.
2. **Concurrent authority changes need transactional consistency.** The new evaluator shares the existing organization lock order and locks the configuration and grant records. Grant revocation during an in-flight attempt cannot authorize a write from the old snapshot. The real PostgreSQL experiment revealed raw-query serialization failures reported as Prisma `P2010` with SQLSTATE `40001`, rather than the ORM's `P2034`. Both now produce the existing localized safe-retry response. Other database failures retain their original failure classification.
3. **A replaced proposal inflated pending obligations.** PostgreSQL counted two pending requests where one valid replacement remained. Module observations now recognize the actual immutable replacement shape: same organization, provider, original preparer, currency and evidence pair; a VOIDED marker with the recorded replacement reason; a retained replacement with a new evidence revision and backlink. Foreign, missing, mismatched or malformed replacements cannot discharge the original request. The manual review queue reuses this predicate and verifies the source tuple of other decisions.
4. **The approval summary rounded the amount and used the organization's currency.** Actual French screenshots showed a stored 0.50 as 1 XAF. New XAF/EUR tests both reproduced the wrong display. The manual summary now uses two decimal places and the proposal's own currency; French separators follow the active locale. This fixes the approval summary, not the unfinished external-currency/residual candidate read model or other dashboard aggregates.

The service commits a bounded denial audit before returning a module refusal. No match, approval or inbox effect commits with a denied write. Existing proposal, replacement, approval and provider/payment records remain intact. Query errors propagate; no missing observation becomes zero.

## Access and lifecycle meaning

| Condition | Effect on this workflow |
| --- | --- |
| Legacy organization without managed configuration | Existing derived rights remain; configuring a shortcut is not required to allocate valid evidence. |
| Managed configuration with no grants | No broad legacy fallback. Manual writes are denied. |
| Active valid reconciliation, finance and accounting grants | Proposal/approval remain available subject to ordinary role, evidence, fresh-authentication and independent-review controls. |
| Read-only, suspended, expired, unavailable, not-yet-effective or missing reconciliation grant | No new manual proposal or approval effect. Existing records remain. Read access follows its own canonical read decision. |
| Suspended required accounting dependency | Write denied; an application role wildcard does not bypass the dependency. |
| Workspace shortcut deselected | Does not revoke valid grants or existing allocation rights. |
| New manual-journal admission stopped | Does not stop required reconciliation of existing money. Current operational dependencies and stop-policy ownership remain unchanged. |
| Valid proposal replacement | Removes the old review request from pending counts; the replacement still requires independent approval. |
| Manual match approved | Records an allocation only. The payment, exception, suspense and run obligations are not declared signed, posted or resolved. |

The global module mode and all unrelated consumers are unchanged. This bounded repair follows the user's express request to correct current module-eligibility inconsistencies; it does not authorize a live tenant activation or commercial grant change.

## Verification and failures retained

- `reconciliation-access-before.json`: eight failed / 38 passed; missing write eligibility reproduced.
- `reconciliation-access-after-01.json`: 64 tests passed across the initial service, entitlement and action checks.
- `reconciliation-replacement-before.json`: one failed / three passed; pending count was two instead of one.
- `reconciliation-replacement-after-01.json`: seven checks passed, including actual PostgreSQL malformed/foreign-lineage and failure-propagation checks.
- `reconciliation-manual-run-1ef2173e6e25.json` and `reconciliation-manual-run-189249464fbf.json`: ten checks passed, final concurrency classification failed. The diagnostic receipt shows no returned approval and unchanged match/inbox counts; the failure was the untranslated database error.
- `reconciliation-manual-run-8a23f58475e1.json`: all eleven real database checks passed after correction. Includes sixteen module refusals with sixteen committed denial audits, empty grants, all restricted validity states, suspended dependency, missing organization, retained legacy rights, replacement-count agreement and concurrent revocation/retry.
- `manual-browser-access-b4f10cd8.json`: both initial keyboard proposal checks timed out waiting for success. `manual-browser-inspect-cd39a796.json` then confirmed no 0.50 proposal or approval was saved and both totals remained 86.00. These failed attempts are not browser passes.
- `manual-browser-access-9a30a0c9.json`: both proposals were saved and reader controls were disabled, but keyboard approval checks timed out. The driver had not waited for enabled/focused controls. It was corrected without changing production permissions or action handling. `manual-browser-access-resume-f80dde4a.json` resumed those same proposals: both EN/FR journeys passed, used actual password confirmation, retained history and reached 86.50. No duplicate proposal was created to replace a failed check.
- `reconciliation-review-amount-before.json`: two failed / fourteen passed; both XAF and EUR approval summaries were incorrectly displayed as rounded organization-currency amounts. Final `reconciliation-access-after-02.json`: 232 passed in sixteen focused suites, including the corrected display cases. Full typecheck and twelve-file lint passed.

Final regression, browser, typecheck and lint outcomes are added to the source-bound checkpoint receipt. Earlier browser screenshots and the earlier build result remain historical. Full build previously failed at Windows standalone symlink packaging; this patch does not claim a successful release build.

## Operator instructions and required information

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation` in the correct organization. Ordinary preparation and independent approval use the existing workflow and password confirmation.

| Situation | Person and needed information | Where to get it / action |
| --- | --- | --- |
| Action says access is unavailable | Organization administrator: current organization, actor role, reconciliation grant, validity dates and required finance/accounting grants. | Inspect authorized organization role and module records. Correct an erroneous grant through the recognized administrative process; do not grant authority merely to clear an error. |
| Concurrent change asks for retry | Original actor: the same saved proposal or unchanged draft request. | Retry the same action. The server rechecks current grants and returns the existing receipt or an actionable refusal. Do not manufacture another approval. |
| A proposal was replaced | Preparer/reviewer: retained original and replacement IDs and current evidence. | Open the replacement for review. The old proposal remains recorded; its marker points to the replacement. Approval is required again. |
| Count still shows unfinished money after approval | Reconciliation operator: source run, payment, exceptions and suspense records. | Continue the real run/suspense workflow. A review-request count is not a unique financial-obligation total. |
| History contains a broken or foreign replacement reference | Controls operator: tenant-scoped original, marker and replacement evidence. | Keep the request visible and investigate; do not delete or edit immutable records to make the count disappear. Full malformed-history recovery remains engineering work. |

No new information or approval from the user is required to finish ordinary implementation and isolated verification. A real organization’s grant decisions still require its actual authorized owner; tests create no such authority.

## Rollout and recovery

No schema or migration changes. Release the action, entitlement service, manual writer, shared lineage predicate and both read consumers together through existing release controls. Retain every prior evidence row. A forward correction or authorized write suspension is safer than restoring the demonstrated missing guard. Preserve historical reads when their read grants permit them.

Test grants and identity changes in the PostgreSQL runner belong only to newly named synthetic organizations in the exact local controls database. Browser checks use the existing owned application database and preserve its original organization/configuration/grant/role authority hashes. They never reset fixtures, modify real approvals, contact live providers or post money.

## Review accountability and remaining work

| Responsibility | Review result |
| --- | --- |
| Architecture / backend / distributed systems | Canonical entitlement evaluation extended for transaction-owned reads; actual action/service consumers traced. Shared row-lock order and retry outcome verified. |
| Database / migration / integrity | Serializable grant/financial checks and append-only lineage; no migration. Real PostgreSQL verifies retained effects and pending counts. |
| Security / IAM / privacy / fraud | Server-derived action identity; role authority remains distinct from module grants. No wildcard grant bypass. Foreign/malformed lineage and object checks remain visible/denied. |
| Finance / reconciliation / ledger / close | Allocations retain existing ceilings, approval separation and snapshot checks. No journal, run certification or suspense resolution is manufactured. |
| Audit / records / analytics | Denial audits commit without business writes; pending requests reflect valid replacement links. Categories still overlap and do not represent a unique obligation total. |
| Frontend / UX / EN/FR / accessibility | Existing shell, controls and localized refusal/retry messages reused. Final actual browser results are in the checkpoint receipt; residual amount clarity, full history, native zoom, contrast and screen-reader checks remain open. |
| Quality / release / SRE / rollout | Failed attempts retained, focused regression and real database/browser evidence bound to source. No performance or release certification. |
| Product / packaging / operations / support | Commercial grants, workspace selection and business admission remain separate. Recovery instructions identify the real owner and evidence source. No price or provider change. |
| APIs / events / integrations | Current manual action producers traced; inbox atomicity preserved. Other transports and asynchronous reconciliation workflows remain in the full register. |
| Statutory / country-pack rules | Not applicable to calculations in this patch: no country formula, tax or filing behavior changes. Matching is not statutory approval. |
| POS/offline / purchasing/AP / HRIS/payroll | No producer logic changes in this batch; their continuing payment obligations remain. Their full reviews continue separately. |
| AI / agents / growth | Not applicable to this patch: no autonomous authority, campaign or product capability introduced. |

Next engineering: residual candidate amounts and current eligibility in the interface; paging/full history and controlled rejection/correction; cross-session draft/request recovery; run/suspense completion and source-currency/date correctness; remaining finance/sales workflows and unreconciled source discovery. These are outstanding engineering tasks, not external approvals. No whole workflow or platform completion is claimed.

Architecture evidence: historical graph action nodes `modules_module_control_actions_ts` (community 116), `payments_reconciliation_workbench_actions_ts` (community 132) and the proof-trail action (community 31) located the relevant boundaries. Current source verified the manual service reexports, actual guarded actions, dashboard read consumer and module obligation consumer. New service/predicate ownership is current source truth, not inferred coverage from the historical graphs. The module access skill, governing July proposal, roadmap/audit, ADRs 0004/0007/0011, current catalogue/contracts, guards, schema, navigation and inventory script were inspected; older observe-only descriptions do not override the user's bounded correction request or today's enforced page/sign-action behavior.


## Final checkpoint evidence

232 focused tests passed in 16 suites (9.487s); 11 real PostgreSQL scenarios passed, including 16 committed module-denial audits and concurrent revocation/retry. The separate replacement suite passed four actual PostgreSQL tests plus three query-failure tests. Full typecheck passed (session88013/chunk2fa4b1); twelve-file lint passed (chunk88521d). Final actual EN/FR precision/reader-denial/independent-password-approval journeys: 2/2, lanes/environment/manual-browser-precision-926e63c2.json. Original authority unchanged, no external origins contacted, exact display 0.25 XAF / 0,25 XAF, no horizontal overflow at1440/390px. Development reviewer route observations5426ms EN/8966ms FR are not a performance budget or production result. Module-surface inventory:427 records, report only. Full build remains failed at historical Windows standalone symlink packaging; no successful release build is claimed.

Canonical receipt: evidence/reconciliation-access-receipt.json. Browser state is now86.75 approved perlocale; all old proposals and markers remain. The final English and French reader screenshots were visually inspected; exact0.25/0,25 XAF is legible, with disabled approval and explanatory text. Current before-action module eligibility and residual/external-currency read-model limitations remain explicit.
