# HR-19 — Payroll-input readiness and retained handoff

Status: **VERIFIED_SCOPED**. Delivery mode **HR_CORE_WITH_HANDOFF**. Baseline `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, shared branch `codex/migration-control-plane-release-2026-08-29`; unrelated edits preserved. Automatic continuation and independent review were authorized by the user.

HR19A gathers the bounded eligible population from native employee, employment, contract, compensation, destination and certified-attendance owners. Explicit exclusions and mandatory blockers accompany exact units/totals. Native employee-before-period lock ordering, compensation-definition locks and current snapshot checks preserve source consistency. A complete preview fingerprint covers exported fields and source revisions.

HR19B issues immutable exact JSON/CSV bytes with hashes, issuer, named recipient, version and predecessor. Exact retries recover one outcome. Addressed recipients reconcile a unique partition of every employee row; rejection reasons and review references are retained in immutable receipts. Approved source corrections make originals stale and new packages link replacements. Database guards protect tenant/actor/lineage boundaries, and event/audit failures roll back the package/receipt.

HR19C supplies English/French operator and recipient screens at `/[locale]/dashboard/people/handoff`, linked from daily HR work only after current handoff access succeeds. Preview blockers, original downloads, correction receipts, freshness and archive status are explicit. Drafts survive authorized same-package downloads; failed refresh or account/company mismatch hides private details. Confirmed writes are distinguished from unknown results and exact retry recovery. Current-period predecessor lookup is independent of capped global history.

## Acceptance and evidence

All five criteria PASS_SCOPED in the synthetic input-handoff envelope. Evidence:24 mocked tests/3 suites;12 real database cases including18 browser records;60 shared correctness cases;bounded typecheck0;schema validation;exact migration replay;workflow check. Six EN/FR viewport screenshots and original download artifacts are retained.

| Criterion | Concrete evidence |
|---|---|
| HR-19-AC01 | Real synthetic201-person population:200 eligible including in-period leaver,1 explicit prior-leaver exclusion; exact currency/minute totals and safe CSV |
| HR-19-AC02 | Native certified time correction makes original stale; linked replacement preserves original bytes and prior receipt |
| HR-19-AC03 | Draft/missing contract, pending inputs and uncertified/stale attendance block issuance; visible exclusions and localized blocker explanations |
| HR-19-AC04 | Exact package-hash/unique-row receipt partition;199 accepted/1 rejected then corrected200-row reconciliation; recipient draft/download recovery |
| HR-19-AC05 | Source and rendered copy distinguish inputs, contract reference, receipt, stale/archive status and payroll effects; no payroll run or payment batch created |

Verification classes remain separate: source review, mocked logic/action/component checks, real PostgreSQL constraints/transactions/concurrency, synthetic browser transport to native services, and bounded type checks. No production Next authentication, external payroll provider import, assistive-technology certification, legal review or pilot operator acceptance is inferred from those checks.

Independent reviewer `/root/hr09_independent_review`: PASS_SCOPED_SOURCE_ONLY after the eleven fixes in INDEPENDENT-REVIEW.md. No unresolved reported critical/high source finding. Earlier failed logs remain available; they include test fixture/adapter corrections and do not count as passing evidence.

## Review lenses and release limits

- Architecture/domain/data: single employee master and native certification/proof owners reused; additive immutable artifact/receipt storage only. No alternate payroll engine.
- Security/privacy: fresh protected actions, server-derived actor, current explicit salary access, addressed-recipient scope, independent receipt actor, mixed-scope response rejection, IDs-only general audit/events.
- Workflow/design/product: existing components and tokens, EN/FR, recoverable draft and replay paths, truthful200-person counts and explicit history limits. Original files are reference inputs, not earnings or statutory output.
- QA/operations/performance: exact command artifacts and synthetic timing retained; no SLA invented. Disable new issuance through reviewed policy while retaining authorized history/replay. See OPERATIONS.md.
- Statutory/finance: no additional country admission, rate rule, payment, filing or accounting effect. Recipient/template legal applicability requires named expert/operational review.
- Provider, AI, inventory and purchasing: not applicable; no new provider adapter or effects in those domains.

No real employer, recipient/template approval, users, support owner, production migration, deployment, customer restore or live pilot was supplied. History is limited to100 displayed periods/packages with explicit disclosure; current selected-period issuance is not disabled by that limit. Generic multi-contract-segment cases remain blocked for reviewed mapping. No automatic recipient messages are sent.

Next eligible step: HR-21 synthetic qualification and pilot preparation for HR_CORE_WITH_HANDOFF. HR-20A–D are conditional LIVE_PAYROLL work and remain unselected. HR-22 expansion remains deferred pending actual pilot demand and a selected country/capability.
