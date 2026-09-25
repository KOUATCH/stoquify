# Exception recovery and mobile reading width — v113

Evidence date: 2026-09-13. Selected skill: `009-aqstoqflow-payment-reconciliation-moat`. Previous goal turn: progress, with the v112 case workbench implemented and verified in EN/FR. Full-platform scope remains active.

## Changes and purpose

The two nested exception panels now omit their extra border and padding below the existing `sm` breakpoint. Their desktop appearance remains the same; the queue's existing mobile container supplies the surrounding surface. This addresses the cramped reading width found in actual v112 English and French 320-pixel screenshots, without replacing the application shell or shared components.

Loading an evidence preview or saved proposal now moves keyboard focus to its named region. A fresh-authentication challenge moves focus to its password input once the pending operation finishes. The retained request states whether retrying will propose, approve or reject, alongside the saved reason. Selection and retained intent remain distinct from a confirmed server outcome.

Only `components/finance/PaymentExceptionClosurePanel.tsx` and its EN/FR message entries change in production. The v112 server-owned case/history contracts, tenant isolation, authority, financial evidence, stale-revision checks, independent decisions and idempotency remain unchanged.

## Recovery procedure

Open the existing reconciliation page in English or French, then **Review exception cases / Examiner les dossiers d’exception**. The system supplies case IDs, current state, proposal/decision IDs and verified history. Operators supply an actual investigation reason; independent reviewers supply their own decision reason. Permission assignments come from the workspace administrator, and identity confirmation uses the current account password.

- **Unreadable draft:** new writes remain disabled. Restore browser session storage, then explicitly refresh server records and clear the local request. If that read fails, the unreadable local record remains; no server decision is cancelled.
- **Lost response:** keep the retained request and retry it. A request may already have committed even when its HTTP response was lost. Exact retry returns its existing receipt rather than creating another proposal.
- **Changed financial evidence:** a displayed proposal may become stale during recovery review. The server refuses its decision. Inspect current history, clear the obsolete local request explicitly and prepare a new proposal from current evidence. Rejecting a financial recovery request does not restore an earlier closure preview's revision.
- **Reopened case:** a source-owned financial reversal may reopen a previously resolved exception. Its earlier closure decision remains historical evidence. Complete current financial treatment before requesting closure again; an old approval does not establish current readiness.

## Verification ledger

- Configured `tsc --noEmit --pretty false`: exit 0, receipt `513fab`.
- Changed-component ESLint: exit 0, receipt `242055`.
- V112's 59 service/action/source/manifest tests may be reused only after confirming their source bindings remain unchanged. No new domain behavior is claimed from a UI-only test.
- Actual EN/FR browser recovery and PostgreSQL pagination checks are pending at this record's creation. Their final receipts and source bindings will be added after completion.
- Regression bindings were checked against v112: eight service/action/test files remain byte-identical (`56ed95`), supporting reuse of its 59 focused tests for those unchanged boundaries.
- A complete comparison against all 2,856 v112 source bindings found exactly the intended three changes: the exception panel and EN/FR messages (`971c7f`). Other bound production and test sources remain unchanged.
- PostgreSQL pagination passed three check groups (`17498d`, `lanes/environment/exception-pages-v113-71e5b7ac-081.json`): 25 genuine producer cases as 20+5 with complete tenant-scoped counts; 23 real proposals across history pages, then approval of a proposal from the later page with all 24 records retained; and an injected authoritative-count failure propagated without writes. Monitored pre-existing records remained unchanged and source hashes were stable. Direct local service observations were 13 ms for both case pages and 202 ms for both initial history pages, with no production performance claim.
- First browser attempt: `lanes/environment/exception-recovery-v113-browser-0afb03e9-665.json`, receipt `31a36f`, stable source but failed in both languages at the final preview click. The verifier had not filled the required new-proposal reason for the checker, so the preview button correctly remained disabled. Added that user input to the verifier; no application control was weakened. The preceding malformed-draft, failed-reset, committed-response-loss/retry, stale-proposal and fresh-closure assertions passed. Both runs measured 212 CSS pixels of reading width against 160 with the previous nested padding replayed (52 pixels gained). Full journey status remains failed until the corrected run finishes. The verifier now also waits for the post-commit refresh to finish before taking its stable-state screenshots.

The browser recovery verifier deliberately aborts one read and drops one response after a real committed proposal. Those expected network errors must be distinguished from unexpected browser errors. Its mobile comparison replays the prior panel padding in the same browser solely to measure reading width, then restores the current DOM styling. No business status or approval is simulated by that comparison.

The corrected browser run passed in both languages with stable source (`4344da`, `lanes/environment/exception-recovery-v113-browser-f9de0956-26d.json`). It retained eight actual screenshots, verified all named recovery checks and measured 212 versus 160 CSS pixels in each language. Page errors and missing translations were absent. Expected injected network errors and existing CSS preload observations remain in the record. Development route observations were 7479/6172 ms in English and 11736/7583 ms in French; no approved performance-budget claim is made. Visual inspection confirms the wider English reopened-case reading area and the separate historical-approval label. The conflict copy remains too generic when current financial treatment is incomplete; distinguishing that prerequisite from a stale preview is recorded as remaining engineering work.

## Review responsibilities and limits

Frontend/UX/localization: mobile reading space, named focus targets, EN/FR operation-specific retry copy and recovery clarity. Security/IAM/privacy: scoped drafts and existing server authority remain effective; only actual protected actions establish decisions. Finance/controls/audit: uncertain outcomes use the same idempotent request, stale proposals remain refused, and genuine financial recovery preserves old decision evidence. Quality/SRE: use actual HTTP loss, persisted outcomes and bounded pagination evidence; local timings do not establish production budgets. Architecture/data: no new schema, migration or shared primitive. Rollout/support: no deployment or live activation; restore source through the normal reviewed release process, retain durable receipts and inspect current state before retrying.

Country-pack/statutory interpretation, POS/offline, purchasing/AP, payroll, analytics, AI/agents and commercial packaging: not applicable to these production changes because their behavior, rules and data contracts are unchanged. These domains remain in the full-platform register.

Remaining requirements include full assistive-technology/native zoom verification, nonfinancial investigation adapters, terminal legacy/domain evidence compatibility, reviewed-run preparation and genuine independent sign-off/export/reopening, and the rest of the platform workflow register. This batch cannot establish platform completion or clear X1.

## Next handoff confirmed against current source

`payment-reconciliation-certification.service.ts#signReconciliationRun` still requires `READY_FOR_SIGNOFF` before its provider, period, source-count, ledger and full-manifest checks. Initial reconciliation creates that status only when it finds no exceptions; exception closure deliberately leaves `NEEDS_REVIEW`. Current sign-off command-state reads target ready runs. The next required engineering handoff is an authoritative reviewed-run preparation transition and operator discovery, with source revision, current eligibility, durable evidence and safe retry; it must not relabel a run ready simply because the case list is empty. The actual sign/export/reopening lifecycle remains to be verified after that handoff exists.


## Final source binding

Both EN/FR browser recovery journeys passed with stable source: lanes/environment/exception-recovery-v113-browser-f9de0956-26d.json. PostgreSQL: lanes/environment/exception-pages-v113-71e5b7ac-081.json. Baseline: evidence/source-baseline-v113.json, 2026-09-13T09:43:22.220Z, branch codex/migration-control-plane-release-2026-08-29, commit a05a41ef66cd5d98fd69ae3df18225795f912232. Aggregate: evidence/exception-recovery-v113.json. The first browser attempt remains a failed attempt with its correction documented above. Coverage: 234 provisional workflows / 0 whole workflows complete / 212 unmapped entry sources.
