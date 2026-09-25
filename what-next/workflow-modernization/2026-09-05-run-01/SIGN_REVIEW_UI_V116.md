# Independent sign review and certificate handoff

This is a bounded implementation checkpoint in the active whole-platform assignment. It does not complete the workflow register or clear X1.

## Delivered behavior

The existing reconciliation workspace opens an independent review before signing. It reads current provider/currency, precise amount strings, complete source-manifest counts and current prerequisites from the certification service. The maker and a retained preparation's actor cannot sign their own work. The preview requires current read/sign permissions and an active tenant actor, and uses the existing enforced module boundary.

The reviewed request binds both the existing header version and a digest of the loaded run, current period and complete evidence manifest. Signing recomputes that digest inside the existing serializable transaction. Changed evidence cannot silently become the user's approved version. A committed certificate retains the reviewed digest. Exact retry recovers the retained result; a different reviewed digest cannot be reported as the same actor's completed request. Another authorized signer's completion is identified explicitly.

The new EN/FR review preserves its scoped request in session storage before submission. Password confirmation does not submit automatically. Reload, uncertain response and retry keep the original request. Corrupt/unwritable recovery blocks new submission until an authoritative reread and local reset succeed. No password is stored. A confirmed signature opens the existing certificate-export review, which separately enforces export authority, verifies downloaded bytes and retains its audited receipt.

The preparation/history browser also provides the sign-review handoff for ready runs beyond the five recent-run cards. Its existing accounting-read requirement still applies to that discovery route; a user with reconciliation-read/sign permissions can use the recent-run entry without accounting-read. Extending all-run discovery for those users remains explicit work.

## How to use it and required information

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation` in your authorized workspace.

1. Find the ready run in recent runs or preparation/history and select **Review for signing** / **Examiner avant signature**. Obtain the run from the reconciliation operator; its provider, date and currency come from actual stored records.
2. Review its current totals and evidence. If preparation or source obligations are incomplete, use the identified source workflow, then prepare the run again. An administrator can grant the required scoped permissions; permission alone does not supply missing evidence.
3. An authorized person different from the maker and preparer confirms the review. Supply your own current account password if prompted, then explicitly retry the retained request. Do not share a password or sign using the maker's account.
4. If interrupted, reopen the same run in the same browser tab/session and retry the retained request. If evidence changed, inspect the current records and request a fresh review. A retry reports the actual retained outcome and does not create another signature.
5. Select the signed-certificate export review. Export requires `payments.reconciliation.certificate.export` as well as reconciliation-read and current module eligibility. The downloaded JSON, hash and receipt come from Stoquify; they are not an external product approval or X1 signing record.

## Design and review responsibilities

Reuses the existing authenticated shell, dashboard surface/brand/focus tokens, gold evidence boundary, shared buttons, password controls and export component. Explicit text separates ready-for-review, denied, pending, signed and another actor's completion. Uses inline regions with focus entry/return, wrapping controls and precise amounts rather than converting monetary values to JavaScript numbers.

Architecture/backend/data: extends the existing certification transaction and certificate payload, no schema or migration. Security/IAM/privacy: server scope, read/sign authority, canonical fresh authentication and maker/preparer separation; retained browser data contains only run/hash/request references. Finance/controls/audit: full evidence revision, immutable signed payload and audited existing effects; financial tables must remain unchanged by signing/export. Frontend/UX/localization: EN/FR current semantic tokens and recoverable explicit steps. Quality: focused service/action/component, whole-workbench regression and owned browser proof. SRE/operations: actionable failure and retained outcome recovery, measured local route timings only. Packaging: existing module read/write eligibility, no pricing or billing changes. API/events: canonical sign/audit/event owners reused; no new worker or delivery schedule.

Statutory/country-pack rules, POS/offline, purchasing/AP, HRIS/payroll, analytics, AI/agents and new provider integrations: not applicable to this bounded patch because their business behavior and records are unchanged; they remain in the whole-platform assignment. This review is engineering evidence, not professional approval or certification.

## Rollout and recovery

No migration, seed, production deployment, live payment or external message is required by this patch. The local test driver creates only new fixtures after asserting the owned database target. Release still requires existing release controls. Retain signed certificates and source recovery history. Never rewrite signed rows or restore readiness directly to undo a business decision; use the existing source correction/reversal workflow. Avoid rolling back the writer's reviewed-revision check while this interface submits bound requests.

Existing manager-action-center and legacy service callers retain their compatible optional header-only input. They still revalidate current evidence at signing, but do not yet carry this full browser-reviewed digest. Extending that review contract across those callers remains engineering work, not an external approval requirement.

## Verification and remaining work

97 distinct tests across six focused suites passed: service 22, sign UI 4, preparation UI 4, workbench 40, canonical actions 20 and new review actions 7. Receipts: `2921ec`, `92b16b`, `0dbbd9`. Full typecheck: `47daae` (also initial `5a5ade`). Nine-file lint `841ecc`; final UI/action/workbench-test lint `0dbbd9`, no warnings. The first whole-workbench attempt `8816bb` failed to load the newly imported server boundary; appending its focused mock corrected the test setup, and all 40 tests then passed. Existing tests were preserved.

First browser attempt `sign-review-v116-browser-05f905ec-661.json` failed before review because its keyboard action did not wait for resolved permissions. It also records a source change during the attempt (gold token correction); it is not a passing proof. The driver now waits for an enabled entry before keyboard activation. Final browser and source binding are appended after completion.

Open: native screen-reader and browser zoom checks, committed-response loss in the browser (component test covers rejected response), broader module/role/race combinations, complete direct-route/transport review and all other platform workflows. No production-performance, accessibility-certification or whole-workflow completion claim.


## Final browser and source binding

lanes/environment/sign-review-v116-browser-f7708913-46f.json: both languages passed with stable source; 10 actual screenshots. Read-only UI denial; service maker/tenant denial; actual password confirmation without auto-submit; preserved request after reload; bound signature; export focus handoff; downloaded bytes equal retained receipt; financial tables unchanged; keyboard focus and 320/768/1440 reflow. French mobile review/export screenshots inspected. Native screen-reader/zoom remain unverified. Route observations EN7818ms/FR6411ms and CSS preload warnings retained as development evidence only.

evidence/source-baseline-v116.json, 2026-09-13T10:49:47.288Z, branch codex/migration-control-plane-release-2026-08-29, commit a05a41ef66cd5d98fd69ae3df18225795f912232. Aggregate: evidence/sign-review-ui-v116.json. Failed earlier attempt remains retained. Existing application8757 remains running; all checkpoint verifiers are terminal. Next recommended numbered skill is010 inventory valuation after remaining reconciliation handoffs; prioritization does not reduce the whole-platform scope.
