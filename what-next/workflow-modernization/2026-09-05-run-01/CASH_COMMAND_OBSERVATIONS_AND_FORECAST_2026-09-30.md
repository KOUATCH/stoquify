# Cash Command observations and payroll forecast evidence

2026-09-30T09:19:12.995Z. FA-CASH-COMMAND remains In progress. Previous goal turn: progress, with UTC correction and drawer handoff evidence. This turn completes two source-meaning criteria; full workflow closure remains unproven.

## Corrected behavior

Cash Command previously labeled current source values as new, changed or worsened despite having no earlier comparison snapshot. Its service now emits observed events with no previous value. The accepted shared observation display shows the current value, identifies historical comparison as unavailable, and has EN/FR empty guidance that does not infer absence of risk. The collected-cash heading describes the selected period. Existing severity, amounts, provenance, controls and actions are preserved.

The payroll-proof observation also inherited the net-pay card's currency unit while displaying a blocker count. That observation now explicitly uses a number and blocker unit; it is not presented as a monetary amount.

An unblocked forecast was also always labeled posted. A successful read with no upcoming payroll periods is evidence of an empty horizon, not posting. The two forecast cards now show empty/operational for that result, retain blocked/null for incomplete evidence, and reserve posted for the existing source-linked reason. Unknown future evidence reasons do not inherit a posted grade. The forecast service, ledger proof requirements and financial values are unchanged.

## Verification

- [Focused checks](evidence/cash-navigation-checks-ae1ce0fd-4113-45cb-aaf7-095a52ac2022.json): 208 tests/seven suites, changed-file lint and full typecheck passed with stable source hashes. Cases include empty, blocked, source-linked and unknown-reason forecasts; current values and severity remain intact. The source-linked unit fixture does not establish a genuine posted payroll lifecycle.
- [Actual runtime](lanes/environment/cash-evidence-40e8fd30-10a0-4716-b529-26ba5ee5ec9b.json): eight EN desktop/FR mobile views against the owned local database and real app. With current permissions, an empty horizon displays operational zero values; a newly created incomplete synthetic period with no run withholds amounts as blocked; moving that test period outside the horizon returns to empty; withdrawn permissions hide the indicators and show the truthful empty-observation explanation. Both actual service projections and rendered cards are checked. No page errors or checked-viewport horizontal overflow occurred.
- The fixture date change tests scope handling only. It is not cancellation, posting, approval, settlement or proof that an obligation has been resolved. Payroll balance rows, payment count and journal count were unchanged during reads. Eight screenshots and development timings are retained; no production performance claim is made.
- The first browser attempt passed both empty views, then failed its incomplete-source expectation because the synthetic due date was tomorrow, outside Cash Command's selected UTC day. The fixture now uses a due date inside the selected day. That failed receipt remains retained in the review; the product's horizon was not changed to satisfy the test.

## Review, guidance and recovery

Finance/product/audit: distinguish a current observation, an empty result and posted evidence. Backend/data/security: preserve source reads, tenant/role/module projection and nullable blocked amounts. Frontend/design/localization: reuse BIWhatChangedStrip's observation contract and current semantic tokens; no shared component edits or second UI system. Quality/SRE: source-bound tests and actual state changes; release remains unapproved. Statutory, provider, offline, billing and AI behavior: not applicable to this display/read-model change. These are engineering reviews, not expert certifications.

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command. Read current observations as the present source position; they do not establish improvement or deterioration. Empty payroll cards mean no eligible items were found in the displayed forecast horizon. Check payroll periods and due dates in the authorized source workspace if obligations are expected. Blocked cards require the existing domain proof to be completed; changing this display does not lift those controls.

No migration or deployment was performed. Recovery is limited to reverting the reviewed service event/grade and dashboard observation changes, then rerunning the linked checks; preserve unrelated changes. Remaining finance handoffs, full source localization, other proofs, genuine posted payroll and complete accessibility/performance verification remain in the register.
