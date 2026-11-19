# HR-14 — Controlled reviews and decision receipts

Status: **VERIFIED (scoped engineering evidence)** once evidence.json is sealed. Baseline `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886` plus preserved shared edits. HR-10/HR-12 dependencies verified previously; historical evidence is not resealed. The user authorized ordered continuation and independent review.

Nine approval domains now show before/after facts, requester, dates, impact, scope and retained evidence. Reviewers acknowledge the facts and enter a reason; the server generates canonical proof bound to the reviewed version. Stale facts require renewed review. Native changes and durable human-readable receipts share the transaction. Exact retry recovers the receipt without repeating the decision; future employment application remains explicitly scheduled. Ordinary inbox, authoring, setup, roster and manager time-review entry points reuse the controlled dialog.

## Acceptance

| Criterion | Result | Evidence |
|---|---|---|
| HR-14-AC01 no ordinary cryptographic hash entry | PASS, nine listed approval domains | Controlled dialog wired into existing entry points; server generates proof; component/action assertions exclude caller hash submission. |
| HR-14-AC02 stale facts require renewed acknowledgement | PASS | Real direct contract/schedule changes reject prior review; browser stale document response preserves reason, clears acknowledgement and requires fresh preview. Native/source locking, concurrent attachment and atomic rollback tests. |
| HR-14-AC03 independent actors and current scope | PASS | Real self-review/approver-apply denial, salary privacy, disabled-account recovery denial, wrong employee and revoked scoped-grant denial. Shared 60-case correctness lane remains green. |
| HR-14-AC04 keyboard/EN/FR/reflow and announced semantics | PASS within automated rendered scope | Actual Radix focus entry/trap/return, role alerts/status, EN/FR at360/768/1440. Actual manager component/native read model exercised on team paths. Full screen-reader certification not run. |
| HR-14-AC05 human receipt per supported domain | PASS | Nine-domain component matrix; real six inbox plus policy/schedule/time owner cases; actor/scope/timestamp/version, scheduled result and uncertain recovery. Receipts remain visible until dismissal. |

## Separate verification evidence

- Source: independent reviewer preflight and R1–R7 resolved, final PASS; [review](INDEPENDENT-REVIEW.md).
- Mocked/component/action/native-owner unit lane: **98 tests in11 suites**, `unit-final.log`. Native unit fixtures explicitly mock SQL lock helpers; they do not certify concurrency.
- Real PostgreSQL: **10 cases** including browser integration, `postgres-browser-r7.log`; **60 shared correctness cases**, `shared-correctness.log`. Cleanup assertions verify zero fixture employers. An earlier failed cleanup left one synthetic employer, removed with the guarded HR-14-only cleanup script; `cleanup-first.log` records zero remaining.
- Rendered browser: **17 result records**, `browser/results.json`, actual components/CSS/native services/DB with synthetic role transport. Includes document and team time decisions, EN/FR widths, stale review, postcommit recovery and denied preview. Screenshots retained; French360 document and English receipt visually inspected.
- Scoped TypeScript: `typecheck-seal.log`, zero diagnostics required by sealing. Workflow and owned diff check required by sealing.
- Not run: full authenticated app build/end-to-end, live provider traffic, production migration/deployment/pilot, human screen-reader session, legal or statutory certification.

Earlier failures are retained: missing mocked lock interfaces, a disabled-account replay defect, a fixture assignment outside an approved contract interval, cleanup FK ordering, transient UI/type/build defects. Only final passing artifacts in evidence.json support acceptance.

## Review lenses

Architecture/backend/database: existing native domain owners and audit storage; no parallel master or approval engine. Security/privacy: fresh protected boundaries, current role/grant checks, explicit salary visibility and masked payments. UX/accessibility/localization: existing dialog/tokens, nine-domain review, recoverable drafts and receipts; full assistive certification unclaimed. Payroll/finance: accurate scheduled/applied truth, retained source proof, no accounting/payout/rate changes. QA/SRE: atomic rollback, concurrency/replay, explicit owned environment and source hashes. Country law, provider/offline infrastructure, analytics/AI and packaging are not applicable to this bounded review slice; no new claims or activation.

Owned source set: [owned-files.json](owned-files.json). Recovery and limits: [OPERATIONS](OPERATIONS.md). Next eligible: **HR-15**, automatically under the user's continuation instruction.
