# Pending Close recovery proposal decisions

FA-CASH-COMMAND remains primary; FA-CLOSE-PACK is the supporting dependency. Previous turn: progress through verified independent recovery and resumed processing. The full workflow modernization objective was reread; this milestone does not redefine or close either workflow.

Evidence date: 2026-10-04. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Root instructions and current source were checked; no nested instructions were found in the affected directories. Shared working-tree changes were preserved. Prior graph location `accounting_close_assurance_actions_ts`/community 6 remains a discovery reference; decisions here are grounded in current services/actions/components.

## Closure checklist for this milestone

- Persist reason, actor, time, proposal binding and exact outcome in the existing tenant audit journal.
- Permit withdrawal only by the proposer and rejection only by another current reviewer; enforce current read/review, module write and fresh session authority.
- Serialize authorization and closure on the same finding; permit only one terminal outcome. Preserve exact retries and refuse changed intent.
- Permit closing stale pending proposals without selecting evidence or changing a finding, financial records or previously approved selection.
- Show retained terminal outcome and reasons in EN/FR. Require explicit confirmation, preserve unknown-outcome retries, and verify mobile/keyboard paths.
- Verify actual database effects and the connected browser proposal → close → corrected proposal → independent authorization → normal processing journey.

## Delivered behavior and review

The `CLOSE_EVIDENCE_HISTORY_CLOSED` audit event records WITHDRAWN or REJECTED, the exact command, proposer binding and hash of the retained proposal. It does not mutate the proposal. A shared outcome reader validates the actor relationship, tenant/finding, time, command and proposal binding; contradictory terminal outcomes require investigation. The read model resolves terminal status separately for each displayed proposal, so a decision outside the bounded history page cannot make it appear pending. It exposes safe outcome references and reasons, not actor identifiers or private audit metadata.

The existing finding lock serializes approval, withdrawal and rejection. The same current authority and fresh-session checks apply before and after persistence. Exact committed retries return their original result; changed intent or another terminal transition is refused. Withdrawal is restricted to the proposer; rejection requires another authorized reviewer. Rejection grants no operational access and need not be performed by the eventual evidence acceptor. Stale pending proposals can be closed without requiring the stale selection to validate again.

The EN/FR interface explains that closing a proposal preserves history and changes no evidence or existing approval. A reason and explicit confirmation are required. Unknown outcomes retain the command and draft in memory for exact retry; password verification still requires an explicit subsequent retry. Terminal cards show outcome, reason, reference and timestamp. Users can submit a new proposal using a fresh inspection and the usual independent authorization controls.

Architecture/backend/data: reused audit journal and lock order, no schema migration. Security/privacy: server identity, current read/review/module write, fresh authentication, strict input and restricted actor transitions. Finance/audit: original comments, finding and financial records unchanged by closing a proposal; already approved selections remain effective. UX/localization: established dashboard controls and EN/FR decision states. SRE: atomic outcomes and idempotency; one scoped terminal query per displayed proposal adds bounded reads and needs later capacity assessment. Product/operations: users can explicitly dismiss erroneous pending proposals while retaining accountability. Statutory calculations, payroll, POS, AI and commercial billing are not applicable because this change affects none of them. These are engineering reviews, not certifications.

## Verification

- [593 focused tests /23 suites](evidence/close-evidence-recovery-jest-36bff30a-4582-4d02-a225-0afa82886e76.json): no failures or skips; includes outcome binding/tampering, unsupported commands, EN/FR confirmation/retry, retained rejected outcomes and affected existing regressions.
- [No-emit TypeScript](evidence/close-evidence-recovery-typecheck-6f6cc0d3-e268-4307-b568-40bfee37415d.json) and [focused lint](evidence/close-evidence-recovery-lint-db573ab5-2446-40c9-8560-471173f2f695.json) passed with stable source bindings.
- [18 actual database scenarios](lanes/environment/close-evidence-ambiguity-f974744b-f122-4361-aaab-58d0105ceefc.json) passed. In addition to prior recovery regressions: withdrawal and rejection, exact replay, changed retry refusal, wrong actor/tenant and insufficient-role denial, stale withdrawal, original comments/finding retained, authorization after closure refused, both closure/authorization races yielding one terminal record, and attempts to close an approved proposal refused. Source, financial and outside-fixture hashes remained unchanged. Both race runs happened to select closure as the winner; the separate approval-first case verifies the other ordering.
- [Actual EN/FR connected browser journeys](lanes/environment/close-evidence-ambiguity-browser-d0cd7b23-49c5-41cd-9fdd-624047976d3a.json) passed: proposal → proposer withdrawal → new proposal → independent rejection → new proposal → independent authorization → normal evidence acceptance. Each terminal card had no further decision buttons. Original comments remained unchanged after both closures and acceptance; source, financial and outside-fixture checks passed. Existing refusal/draft, keyboard focus, reduced motion and 1440/768/320 containment checks remain included. No browser page errors occurred.

Visually inspected actual [English retained rejection](lanes/environment/close-evidence-ambiguity-browser-d0cd7b23-49c5-41cd-9fdd-624047976d3a-en-rejected.png), [French mobile withdrawal](lanes/environment/close-evidence-ambiguity-browser-d0cd7b23-49c5-41cd-9fdd-624047976d3a-fr-withdrawn.png) and [French mobile rejection](lanes/environment/close-evidence-ambiguity-browser-d0cd7b23-49c5-41cd-9fdd-624047976d3a-fr-rejected.png). Reasons, source references and timestamps remain visible in the inherited shell; status is explicit text rather than color alone.

The generated development Close route SHA256 is `6334b0613b016e9332aea160e666c8ffeeb47512989150b12046537c9247d826`. First navigation to the loaded workbench took 32.371 seconds; the following eleven measured visits took 5.663–9.741 seconds. The previous milestone measured 6.027–8.563 seconds across eight visits. Different development startup conditions and journey scope prevent an improvement claim; no approved production budget was established. Route latency remains open. All scoped checks completed without failed test or browser attempts in this milestone.

## User and operator instructions

Open `/en/dashboard/accounting/close` or `/fr/dashboard/accounting/close`. Select the period and inspect the original request reference. Locate the proposal under retained recovery proposals.

The proposer uses **Withdraw proposal** to stop an incorrect pending selection. Another current reviewer uses **Reject proposal** when their review finds it unsuitable. Enter the factual reason from the investigation, confirm that originals and existing authorizations remain unchanged, and submit. Obtain proposal/request IDs from the displayed retained history; obtain the reason from the actual discrepancy, not a generated approval statement. Current permissions and recent password verification come from the signed-in account. A live organizational decision still requires an actually authorized person.

The retained card supplies the decision reference and time. After rejection or withdrawal, inspect current records and record a new proposal when needed. Do not edit the old proposal or evidence. If authorization won a concurrent race, closure is refused: refresh and inspect the actual outcome. These controls cannot revoke an active selection. If a response is uncertain, retry the saved command before leaving the page; reload recovery is not yet implemented.

## Rollout, recovery and limits

Ship services, outcome reader, action and interface together. Rolling back the approval guard after closures exist could make a closed proposal approvable; preserve terminal-outcome guards and readers if hiding the new controls. No migration, reset, deployment, live activation, payment or external notification occurred. Runtime used only identity-checked owned loopback synthetic fixtures.

No workflow closure is claimed. Unsaved draft reload persistence, departed-requester reassignment, delegated review, complete authority interleavings, notification delivery, full accessibility/zoom and high-volume behavior remain open. Latest-20-event display and 100-record/audit bounds remain; terminal queries do not certify full history. Original Cash/Close handoffs and the complete workflow inventory remain in scope.
