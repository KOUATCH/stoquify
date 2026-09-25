# POS policy observations and shift-opening recovery

Evidence date: 2026-09-13. Baseline: `evidence/source-baseline-v128.json`. This batch continues the whole-platform review; it does not complete or certify POS or commercial enforcement.

## Confirmed policy defect

Seven scenarios were exercised through real services against the owned local PostgreSQL database. Commercial decisions were evaluated through the real `observeModuleAccess` service in enforce mode with audit disabled for the fixture probe. This is not an actual tender-action visit. Shift opening and closure used actual services and persisted records.

| Fixture | Commercial write decision | Commercial read decision | Actual shift opening |
| --- | --- | --- | --- |
| Active POS and sales grants | Allow | Allow | Admitted |
| Explicit empty grants | Deny | Deny | **Admitted: unresolved defect** |
| Read-only POS grant | Deny | Allow | **Admitted: unresolved defect** |
| Expired POS grant | Deny | Deny | **Admitted: unresolved defect** |
| Suspended sales dependency | Deny | Deny | **Admitted: unresolved defect** |
| POS new-work stop | Allow | Allow | Denied by stop policy |
| Sales new-work stop | Allow | Allow | Denied by stop policy |

Every admitted fixture's existing zero-balance shift could be read and closed after POS was stopped. Closure retained its event/audit and released the terminal. No payment or journal entry was created. A local notification outbox record is evidence of queued work only; no worker delivery is claimed or invoked.

Root cause: `openPOSShift` checks `assertModuleNewWorkInTx` but does not enforce commercial grants. Stop policies and entitlements are distinct. The tender actions have an explicit commercial guard, producing inconsistent journey boundaries. `closePOSShiftAction` deliberately observes rather than enforces commercial access, preserving a completion route. The policy defect remains a priority engineering correction; it is not an external approval deficiency.

The applied `aqstoqflow-module-enforcement-truth` skill requires registered, versioned policy and says not to enable new enforced surfaces during its reconciliation workflow. No broad enforcement change was made. Next work must establish the bounded operation policy/registration and rollback behavior, test fresh transactional commercial admission at new-work boundaries, and separately preserve authorized idempotent completion and retained obligations. Changing every observe caller to enforce would strand existing work; changing the shared default to observe could relax existing controls. Neither substitution is a correction.

## Delivered recovery improvements

The opening action now exposes `MODULE_NEW_WORK_STOPPED` only for the actual domain stop error. The client uses it for a localized, persistent inline explanation. It says no shift was opened only for that confirmed pre-effect denial. Other failures show an unconfirmed-outcome message and instruct the user to inspect current shift/terminal state before retrying.

The opening amount is retained. No automatic retry or submission follows policy changes. The amount is disabled while submission is pending. The input has an accessible label and error description; the error uses `role=alert` and the existing dashboard danger token. A duplicate opening-error notification was removed after actual mobile evidence showed the same long guidance covering the controls. Existing shift-close notifications are unchanged.

No permission, entitlement, stop policy, financial rule, database schema, migration or deployment behavior was changed by this patch. Fixture policy changes exist only in the owned isolated database.

## User and operator procedure

Open `/en/dashboard/pos` or `/fr/dashboard/pos`. Select the location/terminal and enter the opening float. When new work is stopped, retain the amount and ask the authorized module administrator to inspect the current POS and sales stop settings at the module configuration screen. A cashier must not substitute an approval reference or change a grant to clear a stop. After an authorized policy change, explicitly choose Open/Ouvrir again. The policy change itself does not open the register.

For an unconfirmed result, inspect the current shift and terminal before another attempt. If a shift already opened, continue that shift. Existing shifts should be closed using their normal counted-cash and permission checks. This batch verifies service closure after a stop, not the entire financial sale/refund/offline lifecycle.

No new input is needed from the user for continued local engineering. Live commercial eligibility, prices, customer activation and X1 approval remain separate from fixture evidence.

## Evidence and limits

Policy verifier: `lanes/environment/verify-pos-policy-v128.cjs`. Successful observation receipt `fc81eb`, report `lanes/environment/pos-policy-v128-37537288-c052-4755-b0de-8431ad4aae33.json`. The initial verifier failed (`a18533`, `pos-policy-v128-2f008d8d-8272-44b2-8b14-68ffdafbf8c7.json`) because it expected a nonexistent `status` field in the closure result. It was corrected to verify returned session identity and persisted CLOSED status. This was a verifier error, not a product failure. The service and module policy hashes remained stable; the opening action's later change adds presentation discrimination only.

Browser verifier: `lanes/environment/verify-pos-stop-browser-v128.cjs`. Real credentials, same-origin fence, EN POS stop and FR sales-dependency stop, entered float 125, no session/opening-drawer transaction on denial, no submission after fixture policy change, explicit keyboard retry creates exactly one opening record with amount 125, and service closure after renewed stop. Zero payment/journal effects. Screenshots at 1440/768/320px. The first passing run (`909ece`, `pos-stop-browser-v128-c559d53f-0eac-40b0-a45d-09d58e27392e.json`) exposed the duplicate mobile notification; it is intermediate evidence.

Final source bindings, browser report, screenshot names, test/typecheck/lint receipts and coverage are in `evidence/pos-policy-recovery-v128.json`. Browser timings are development observations, not approved performance budgets. Keyboard activation, accessible naming/error association, horizontal reflow and reduced-motion screenshots do not prove complete screen-reader/focus/zoom accessibility. No full build or production performance certification was performed.

Focused tests cover action discrimination/trusted scope, retained float, stopped and transport failures, no success or automatic retry, existing shift-close regressions, and admission policy. Use direct inspected Jest/tsc/eslint entry points; the default build remains migration-bearing. Sandbox writes to existing test files failed, so the focused opening action checks were added as a new test file and the component regression was appended with an approved narrow local write. No source or prior tests were deleted.

## Review responsibilities and recovery

Architecture/backend: separate commercial evaluation, new-work stop and completion rules; access gap reproduced. Database/integrity: real no-effect denial and exactly one opening, retained closure evidence; no schema. IAM/privacy: existing trusted tenant/actor and permission checks preserved, no external requests; no broad access claim. Finance/controls: real opening/closing counts with no payment/journal effects; commercial gate consistency remains unresolved. Product/frontend/UX/localization: persistent localized recovery and amount preservation; duplicate mobile message removed. QA/SRE/release: bounded local source-bound checks; development latency still high; rollout not certified. Audit/events: closure audit/event persisted; outbox delivery remains unverified. SaaS packaging: no pricing or grant authority inferred from stop-policy success. Support: coupled action/UI/messages/hook rollout, current state inspection on uncertainty. Rollback of presentation changes loses recovery copy but must not remove the existing server admission guard.

Statutory/country-pack, HRIS/payroll, purchasing/AP, analytics, AI/agents and external payment providers: not applicable to this bounded patch because their logic and records are unchanged. They remain in the full workflow register. These are engineering reviews, not professional approvals.

Remaining: commercial consistency at POS new-work boundaries; refund/void and idempotent replay under revoked grants; current permissions on operation controls; current shift-opening validation/unknown outcomes; complete terminal creation/history; native accessibility; and all other unfinished platform workflows. No whole workflow is marked complete by this batch.
