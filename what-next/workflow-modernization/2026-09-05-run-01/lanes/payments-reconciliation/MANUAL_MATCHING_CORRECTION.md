# Manual reconciliation correction — 2026-09-05

Status: implemented and partially verified. PR-02 and PR-03 remain incomplete workflows. This checkpoint supersedes the manual-matching defects recorded as open in the earlier automatic-matching report; it does not supersede its remaining run-lifecycle findings.

## Delivered behavior

- The service accepts positive amounts with at most two decimal places, confirmed/settled internal payments, an active provider and exactly one compatible external record. Provider events require a valid signature, current verified/processed state, matching currency and direction; statement evidence must be unmatched, unarchived and have the compatible credit/debit direction.
- A serializable transaction locks the scoped provider, evaluates and audits the sensitive-action policy, checks existing allocations and writes both the match record and its inbox notification. Missing permission, self-approval and expired authentication retain canonical denial codes. The action derives identity, organization, permissions and verified authentication time from the server context.
- A proposal stores an evidence revision and a small review snapshot containing amounts, currency, direction and source kind. Approval recomputes that revision and remaining allocation. It appends a decision referencing the original proposal. It never silently changes the original proposal into an approved row.
- Exact proposal retries use the same request key. Exact approval retries return the saved decision. Concurrent or stale requests cannot silently commit excess allocations. Nullable legacy uniqueness is not treated as duplicate protection.
- The original preparer can explicitly replace an undecided proposal with current evidence at the same amount. The replacement, supersession record and notification commit together. The old proposal remains; its VOIDED decision points to the replacement. An already decided proposal cannot be replaced. Independent approval is required again.
- The pending read query excludes recorded decisions before applying its 12-row limit. Approved or superseded records cannot crowd older pending work off the page. The UI displays all returned rows instead of silently dropping rows 5–12.
- The screen shows saved evidence, opens the existing scoped proof drawer, explains unavailable actions, confirms identity through the existing password action and retains entered amounts after recoverable failures. It sends one external evidence identifier. Selection and proposal do not indicate approval.
- EN/FR copy now covers manual exception types, severity, evidence, denial, retry, replacement and identity confirmation. Inline alerts/status messages replace duplicate floating notifications. Durable reconciliation inbox evidence remains enabled.

## Evidence and limitations

Initial manual tests: 29 failed / 5 passed (`evidence/reconciliation-manual-before.json`). Final combined set: 147 passed across 11 suites (`evidence/reconciliation-manual-after-06.json`). This includes automatic matching, capture/import, certification, retained-obligation, action identity and UI boundaries. See the final receipt for exact commands and source hashes.

Real PostgreSQL: `lanes/environment/reconciliation-manual-run-f03ebb7afd2b.json`, 8/8. Exact retries, five denials, concurrent approval, competing proposals, residual 40.00 after 60.00, refusal of excess 0.01, stale/revoked evidence, replacement and queue filtering with 13 newer approved proposals pass. No live provider, real payment or professional approval is implied by the synthetic fixture.

Actual browser: `manual-browser-browser-52cadf1a.json`, English desktop and French mobile, 2/2. A real proposal response was deliberately dropped after the server request; each retry found the single saved record. A genuinely signed-in different reviewer completed actual password confirmation and approval. Each approved amount was 85.00; the original run remained NEEDS_REVIEW.

Those first screenshots exposed duplicate notifications obstructing mobile review. The UI was corrected and the already-used fixtures were resumed without resets. `manual-browser-recovery-fd139788.json`, 2/2, proves excess refusal with preserved input, inline feedback, an additional 1.00 proposal, explicit replacement, retained history and independent approval. Each final approved total is 86.00. The new screenshots show the unobscured screen. All original users/roles, organizations, grants and configuration hashes remained unchanged.

Reflow passed at widths 390, 720, 768 and 1440. Keyboard submission was used in actual journeys. The scoped axe scan returned 15 passing rules and no violations, but `color-contrast` remained incomplete. This is not a completed contrast review, native zoom test, screen-reader assessment or accessibility certification. Observed final checker-route readiness was 5,279 ms EN and 7,582 ms FR in local development; these are observations, not an approved performance budget or production result.

Preserved failed attempts: UI test run 01 used a wrong translation namespace; combined run 03 named the adapter test at a nonexistent path; combined run 04 exposed missing resets of the new action mocks. These were corrected, not hidden. Browser preparation f5da3b0e hit a provider-code uniqueness constraint after retaining its first synthetic journey; a75e6544 used separate unique provider codes and new actors. No prior records were reset or deleted. The earlier typecheck detected missing generic return inference; explicit receipt typing corrected it.

## Remaining engineering

1. Manual transport/service module admission and retained-obligation semantics need an explicit reviewed contract and tests. These actions have current permission/fresh-auth checks, but lack the explicit module gate used by the sign action. A page gate does not prove action enforcement. Do not declare suspended/read-only cases verified or add a blanket gate that strands existing obligations.
2. The pending list is still limited to 12 without paging; retained decision history lacks a complete user-facing browse/export/correction/rejection workflow. CORRECTED/VOIDED lineage beyond this bounded replacement needs accounting review and tests. Historical malformed/missing-preparer proposals need a controlled recovery path.
3. Retry keys and unsaved amount drafts currently survive component rerenders, not full tab/session loss. Partial same-pair submissions under different request keys can remain as separate pending proposals. Remaining-amount enforcement prevents over-allocation, but complete cross-session intent recovery is unfinished.
4. The candidate read model still displays original amounts rather than residual allocations and can offer an amount the server later refuses. It does not yet expose all current eligibility reasons. The observed excess refusal is honest; it does not establish optimal preparation UX.
5. Manual approval does not resolve linked suspense, reconcile run revision or produce sign-off readiness. Automatic totals, mixed currency, dual provider/statement amounts, business dates, late evidence and safe run-revision recovery remain open.
6. Notification failure rollback has transaction-bound unit coverage and real concurrent commit evidence, but no forced database notification-failure experiment. Native zoom, full focus-return/screen-reader behavior and manual contrast review remain open. The earlier full build still failed during Windows standalone symlink packaging and predates this patch.
7. Direct statement-side manual matching has unit checks; the new browser journeys exercised provider-event evidence. No actual provider endpoint, delivery worker, certificate or live rollout was certified.

## User and operator procedure

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation` in your authorized organization.

| Person | Action and needed information | Where it comes from |
| --- | --- | --- |
| Preparer | Compare the internal payment and external evidence; enter the amount to allocate. | The displayed evidence and the linked payment proof. Use the verified provider event or statement, not an invented approval reference. |
| Preparer after an uncertain save | Keep the entered amount and retry the same action in the same page. | The UI retains this attempt's request key. A saved-result message means no second match was created. After a full reload, inspect existing proposals before creating another intent. |
| Original preparer after evidence changes | Use “Replace with current evidence” on the saved proposal. | Current server evidence is read again. The amount is preserved and a new independent review is required. This does not overwrite or approve the old record. |
| Independent reviewer | Inspect saved amounts/direction/source and open the proof; approve if authorized and correct. | Current role permissions, the saved proposal and existing evidence drawer. Enter your own current password only in the normal confirmation field when requested. |
| Organization administrator | Resolve a genuine missing permission or missing original preparer. | Organization membership/role records. The application cannot create business authority on behalf of an approver. Do not clear controls by editing match rows. |
| Reconciliation operator | Continue resolving the original run's remaining exception/suspense. | The run, exception and suspense records. A manual allocation alone is not a posted journal or a signed reconciliation. |

## Rollout and recovery

No schema migration or production deployment was performed. Deploy the action, service, read model, hook, component and EN/FR messages as one compatible change only after applicable release controls. Old clients lack the required retry/revision fields and should reload; no fallback should invent those fields or skip validation.

Retain all proposal, supersession, approval, audit and inbox rows. Do not roll back to the unsafe approval writer while current manual writes remain enabled. Prefer a forward fix or an authorized temporary suspension of affected writes while retaining read/history access. A recorded business approval requires controlled correction/reversal, not database deletion.

Owned browser fixtures now contain approved totals of 86.00 for each a75e6544 locale journey. `prepare`, `browser` and `recovery` are stage-specific and refuse incompatible reused state. Do not rerun them to reset evidence. The first f5da3b0e fixture remains as historical failed preparation. Dedicated app port 3107 was started with the migration-free helper; original port 3000 was not changed.

## Review responsibilities for this patch

| Responsibility | Assessment |
| --- | --- |
| Architecture / backend / API | One manual owner; existing action shell and notification facilities reused. Explicit module admission remains open. |
| Database / migration / integrity | Serializable allocation, append-only lineage and decision-filtered queue verified with real PostgreSQL. No migration. |
| Security / IAM / privacy / fraud | Server-derived identity, verified authentication provenance, independent reviewer and scoped evidence checked. Small saved summaries; no credential/evidence payload in public artifacts. Full session-loss and module policy checks remain open. |
| Frontend / UX / localization / accessibility | Existing dashboard controls, proof drawer and tokens reused. Actual EN/FR loss/retry/replacement checked. Mobile obstruction corrected. Contrast/screen-reader/zoom still incomplete. |
| Finance / reconciliation / accounting | Allocated money cannot exceed either evidence side; no manufactured posting/readiness. Correction and run handoff remain open. |
| Audit / records | Original proposals retained; decisions and replacement lineage plus inbox commit together. Full retained-history UX unfinished. |
| Quality / release / SRE | Focused regression, source-bound PG/browser results and development timings recorded. No production resilience or release certification. |
| Product / SaaS packaging / support | Role-appropriate review and recovery implemented. No price, package or subscription changes. Module/retention consistency still requires follow-up. |
| Statutory / country packs | Not applicable to calculations in this patch: no statutory formula, filing or country-pack rule changed. Matching is not statutory certification. |
| POS/offline, purchasing/AP, HRIS/payroll | No producer logic changed in this patch. Their payment obligations remain; full workflow reviews continue elsewhere in the register. |
| AI/agents, growth | Not applicable to this patch: no agent authority, recommendation, campaign or autonomous approval added. |
