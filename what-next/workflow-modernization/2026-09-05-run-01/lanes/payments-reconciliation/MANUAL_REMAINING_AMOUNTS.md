# Manual reconciliation: remaining amounts and recoverable preparation

Evidence date: 2026-09-06. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`, with the existing dirty working tree preserved. This is a bounded PR-02/PR-03 correction within the active all-workflows assignment. It does not complete either lifecycle or the platform review.

## Problem and delivered behavior

The earlier candidate view showed original payment amounts even after independent approvals had allocated most of them. For the existing synthetic 100.00 internal / 90.00 external pair, 86.75 had already been approved, but the form still suggested 90.00. The writer refused over-allocation; the interface did not explain the remaining amount or current evidence eligibility. Missing amounts became zero, external currency used the internal currency, and a failed refresh could unmount the edited draft. Refresh updated only the capture view and could report success despite a query error.

The preparation service now reads a consistent tenant-scoped snapshot and calculates internal and external allocations separately. The same evidence and Decimal allocation rules are shared with the writer. Candidate records include exact original amounts, each record's currency, remaining amounts, the available minimum, an eligibility reason, the check time and current module write eligibility. All evidence tables are independently tenant-scoped, and a mismatched provider reference cannot expose its values. Query failures propagate; they are not empty or zero results.

For the verified example, the interface defaults to 3.25 (3,25 in French), displays internal remaining 13.25 and external remaining 3.25, and refuses a larger amount before submission. The server remains authoritative. After the independent approval of 3.25, the external remaining amount is 0.00 and internal remaining is 10.00. The exception and original run remain unresolved; completing an allocation does not certify the run or resolve suspense.

The interface distinguishes missing or invalid evidence, currency differences, unavailable providers, incompatible payment states, ambiguous external sources, inconsistent historical allocations and fully allocated evidence. Read-only module eligibility leaves preparation visible but disables writes; actor permissions remain a separate condition. Currency and monetary strings retain exact decimal places without conversion through floating-point numbers. Unknown amounts render as unavailable. The input accepts the localized decimal separator and sends its unchanged numeric value.

Draft amounts and the existing request-key owner now live above the recoverable error panel. A failed refresh removes submission controls, shows the failure, and preserves the draft until a successful refresh can revalidate it. Refresh requests both reconciliation views with query errors propagated. The independent password confirmation and append-only approval controls remain intact. A malformed amount cannot enable approval or renewal.

## Source and relationship map

| Owner | Responsibility |
| --- | --- |
| `services/reconciliation/manual-match-evidence.ts` | Shared evidence validation and exact remaining-allocation arithmetic; no transport authority or database access. |
| `payment-reconciliation-manual-candidates.service.ts` | Repeatable-read snapshot, persisted module eligibility, bounded tenant-scoped batch queries and classified preparation results. |
| `payment-reconciliation-manual-match.service.ts` | Existing locked/serializable financial writer, current authority, revision binding, independent approval, immutable records and inbox effects; delegates evidence arithmetic to the shared policy. |
| `payment-reconciliation-manual-read.service.ts` | Existing pending lineage filter, now returns amount strings or null without rounding or zero substitution. |
| `payment-reconciliation-dashboard.service.ts` | Consumes the service-owned preparation result and exposes metadata to the existing dashboard contract. |
| `components/finance/PaymentReconciliationWorkbench.tsx` | Localized exact display, residual default and input validation, current write availability, preserved draft and request-key lifecycle, both-view refresh. |
| `messages/en.json`, `messages/fr.json` | Eligibility, residual amount, freshness, bounded queue and access explanations. |

Existing historical graph nodes and current action/service relationships are recorded in `MANUAL_ACCESS_AND_OBLIGATIONS.md`. This batch verifies the new direct imports against source; the historical graph does not establish coverage of these new files.

## Verification and limits

Canonical source/test/command/screenshot bindings: `evidence/reconciliation-residual-receipt.json` at the run root.

Real PostgreSQL result: `lanes/environment/reconciliation-manual-run-e14aac7c1857.json`, 13 passed / 0 failed, stable source. It covers existing idempotency, concurrency, independent approval, stale evidence, tenant and grant boundaries, plus exact residuals, full allocation with an open exception, read-only preparation, unavailable amounts, invalid signature evidence, distinct currencies and malformed foreign references. Synthetic invalid records are separately created at insertion; immutable captured evidence is never edited or bypassed.

Actual browser result: `lanes/environment/manual-browser-residual-347868e0.json`, EN desktop and FR mobile both passed. Normal test-account sign-in and actual independent password confirmation were used. The journey verifies invalid amount refusal, a deliberately aborted read response, preserved draft and successful refresh, proposal and approval of 3.25, pre-refactor evidence-revision compatibility, retained records and the still-open run. Existing authority hashes are unchanged; no external origins were contacted; no JavaScript page errors or horizontal overflow at 1440/390px were observed. Screenshots were inspected. Last reviewer-route observations were 4875ms EN and 6450ms FR in the local development server; these are not production performance evidence or a controlled before/after comparison.

The first database attempt (`reconciliation-manual-run-30a26c659daa.json`) passed 11 existing checks and then failed because the test tried to edit an immutable provider event. The database correctly refused it. The fixture was corrected to capture the separate 90.00 amount directly and insert distinct invalid cases. That failed attempt and its records remain retained.

Focused attempt 02 had 45 passing tests, one incorrect expected UI error string, and one mistyped test path; writing its JSON was blocked by filesystem permissions. Its tool result is retained (session28351/chunk58adfa). Corrected attempt03 passed 95 tests in three suites. Subsequent final checks include the both-view refresh and affected regressions; use the canonical receipt for their exact results.

Native browser zoom, screen-reader operation and full manual contrast assessment remain unverified. Earlier axe findings retain their historical source meaning. The prior full build still failed during Windows standalone symlink packaging; compilation/typechecking alone is not a successful release build.

## Use and recovery

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation` in the correct organization.

| Situation | Required information and owner | Where to get it / next action |
| --- | --- | --- |
| Prepare a proposal | Reconciliation preparer: internal payment, external evidence, currency and amount still available. | Read the original and remaining amounts on the candidate card. Enter a positive amount no higher than the displayed available amount. |
| Source or currency is unavailable/incompatible | Reconciliation operator: the actual provider event or imported statement, internal payment and their source references. | Inspect scoped proof and source records. Correct through the supported source workflow; do not edit immutable evidence to make a match pass. Dual-source choice still requires an implementation extension. |
| Read-only or unavailable write access | Organization administrator: current module grants, validity dates, dependencies and actor role. | Use the organization's actual module and role records. A test or saved file creates no authority. |
| Refresh fails | Current actor: the existing draft only; no new approval information. | Use Refresh again. The existing amount returns and is checked against newly loaded evidence. Revisit the value if availability changed. A page reload/session loss remains a separate open recovery gap. |
| Independent approval | A different authorized reviewer: the saved proposal and exact amount/currency. | Review current evidence and confirm identity with the existing password confirmation when requested. The system retains the approval record; no external approval ID is invented. |
| External evidence is fully allocated but internal money remains | Reconciliation operator: remaining internal balance, original run, exception and suspense records. | Continue the real exception/run/suspense process. Zero available on this evidence pair does not mean the financial workflow is complete. |

## Rollout and recovery

No schema, migration, live configuration, provider, subscription, payment or deployment change. Release the shared policy, service read model, string contracts and interface together. Do not roll back only the interface or only the amount contract. Prefer a forward correction or an authorized write restriction to restoring misleading or unsafe behavior; preserve all evidence, proposals, decisions, audits and inbox records.

The exact owned local controls database is `stoquify_local_modern_modules_controls_20260905_01`; the browser database is `stoquify_local_modern_modules_20260905_01`. The browser fixture now has 90.00 approved for each accepted a75e6544 EN/FR pair, with 10.00 internal remaining. Old stage-specific runners must not be rerun blindly. No reset or deletion is required. Port3107 runs the isolated application; original port3000 and the prototype are untouched.

## Review accountability

| Responsibility | Review and material limits |
| --- | --- |
| Architecture/backend/distributed systems | Service-owned read model, one consistent snapshot, shared rules with the serializable writer. Snapshot is preparation evidence, not permission to commit. |
| Database/integrity/migrations | Exact Decimal sums, tenant/provider checks, immutable evidence and retained effects verified in PostgreSQL. No migration. Database decimal schema limits still apply. |
| Security/IAM/privacy/fraud | Current module eligibility and actor role remain separate; foreign references expose no amounts/references. Existing writer authority and independent approval retained. |
| Finance/reconciliation/audit/records | Original versus remaining amounts are explicit. Prior allocations and unresolved obligations retained; no ledger entry, sign-off or professional approval implied. |
| Frontend/design/UX/localization/accessibility | Existing tokens, controls, semantic warning text and EN/FR system reused. Keyboard submission, actual mobile and draft recovery verified; native zoom/screen-reader/contrast work remains. |
| Quality/release/SRE/observability/cost | Source-bound service/database/browser checks, failed attempt retained, bounded batch queries and development timing observations. No release certification or approved performance budget claimed. |
| Product/packaging/operations/support | No price or module product change. Available, selected, authorized and completed remain distinct. Guidance names the actual owner and record source. |
| APIs/events/providers | Existing protected actions, signed capture and transactional inbox remain. No new transport or external event producer. Other asynchronous handoffs remain open. |
| Statutory/country rules | Not applicable to this patch: no tax, country formula, filing or statutory conclusion. |
| POS/offline/purchasing/AP/HRIS/payroll | No producer behavior changed; their downstream payment obligations remain. Separate workflow reviews remain active. |
| AI/agents/growth | Not applicable to this patch: no autonomous approval, agent behavior or growth workflow change. |

Remaining engineering includes reachable paging and complete history; controlled rejection/correction; dual provider/statement evidence selection; cross-session intent and duplicate-request recovery; the full run/suspense/accounting handoff; dashboard aggregate/currency/date truth; every restricted-grant and statement-side browser journey; remaining accessibility and release checks. Continue the other workflow families and unmapped entry sources. These are engineering tasks, not requests for fabricated approval evidence.
