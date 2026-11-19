# HR-09 independent review — 2026-10-24

Reviewer: `/root/hr09_independent_review`, separate fresh-context agent, read-only source review. Implementation remained with the primary agent. No production or database mutation was delegated to the reviewer.

## Agreed scope

TIME_POLICY organization-level grants and WORK_SCHEDULE / TIME_REQUEST exact-employee grants. The reviewer confirmed HR-09 does not mandate replacing every existing approval domain. Financial, contract and lifecycle approvals remain separately authorized and visibly distinguished. The checker is an existing verified tenant user, not a fabricated employee. hris.people.read grants entry access only; a bounded grant supplies decision authority.

## Findings and disposition

| ID | Severity | Finding | Fix / regression evidence |
|---|---|---|---|
| R1 | P2 | Operational dates were labelled exclusive although the allocation owner uses inclusive final work dates. | Separate operational inclusive labels from grant/unit exclusive dates. Existing allocation kernel unchanged; browser forms show both semantics. |
| R2 | P2 | Reversed/out-of-calendar schedule ranges and incomplete weekly totals could be activated. | Preparation and approval validate calendar coverage, timezone, all seven weekdays and total. Preserve named sun–sat and numeric 0–6 forms; reject conflicting aliases. Real DB invalid preparation/approval and legacy-format regression. |
| R3 | P2 | Equivalent grant rows omitted reviewer identity, making revocation ambiguous. | Display safe reviewer name or stable user identifier, explicit current/future/expired/revoked/unavailable state; exclude current actor from new checker options. |
| R4 | P2 | Concurrent policy checkers could overwrite retained approval evidence. | Conditional DRAFT claims for both policy/calendar inside one transaction; loser rolls back. Real DB barrier forces both transactions to read DRAFT; one success and one approval audit. |
| R5 | P2 | Disabled or de-permissioned checker still appeared as current coverage. | Current coverage requires live active verified unlocked tenant account and read role. DB regression checks account disable and role removal, owner read model and direct decision denial. |
| R6 | P2, implementation self-review, independently reviewed | A retained narrow grant could outlive a soft-deleted employee. | Recheck same-tenant nondeleted employee under row SHARE lock and exclude unavailable employee scopes from current coverage. Retain the existing employee advisory lock before that row lock to avoid lifecycle/reviewer inversion. Direct source denial regression added. |

Additional review observations resolved: policy data outside scope is not labelled missing; saved organization units are visible; successful mutation with failed refresh is distinguished from mutation failure; drafts retained; scoped substantive policy/schedule/request/correction details are visible before review; browser suite includes a decision-authorized checker as well as read-only and denied users. Grant semantic retries retain one effect and cannot reactivate revoked evidence.

Final source verdict received: **R1–R5 resolved; no remaining actionable correctness/security finding within this bounded setup scope.** The reviewer made acceptance conditional on final PostgreSQL/browser artifacts, source hashes and cleanup. See RESULT.md and evidence.json for those executed outcomes.

Subsequent R6 self-review was independently checked: the reviewer confirmed the nondeleted employee guard and matching lifecycle lock order, with no remaining source blocker. The final acceptance evidence was refreshed to 22 PostgreSQL cases after that change.

Limits: independent source review is not legal certification, an assistive-technology audit, a production release approval, or proof of full Next/BetterAuth/module-entitlement integration. The action unit lane mocks protect; the browser lane uses a synthetic role cookie and actual service/PostgreSQL behavior. These boundaries are retained explicitly.

## Final evidence verdict

The independent reviewer subsequently returned **PASS for the documented bounded HR-09 engineering scope**, independently recomputing all 98 manifest hashes with zero drift/missing files and confirming 22/22 HR-09 database tests, 60/60 shared regressions, 27/27 mocked unit/action tests, 30 browser cases, zero TypeScript diagnostics, zero remaining fixtures and stopped PostgreSQL. R1–R6 are closed. This final verdict was recorded here and the manifest refreshed to include this documentation update; runtime sources and test outputs were unchanged.
