# P08 repeatable cashier and manager tasks

Prepared 18 October 2026. These are observation scripts, not evidence of customer satisfaction. Do not contact customers or use real financial data without the separately approved pilot authority. Use the P03/P07 opening assumptions; imported masters alone do not establish stock, receivables or ledger readiness.

## Setup and evidence envelope

Record source revision, actor role/permissions, organization, location, terminal/shift, locale, viewport/browser, connectivity profile and fixture identity. Use a new synthetic database and known synthetic credentials for developer replay. The inspected runners in `evidence/` block ambient target selection. Reinspect them before reuse; their recorded database and application port belong to this run. Preserve existing evidence when rerunning.

Developer replay sequence: `database.cjs create` → `run-fixture.cjs` → `manager-fixture.cjs` → `application.cjs` → `browser-cashier.cjs` → `browser-manager.cjs`. Run via `node docs/retention/execution/P08/evidence/<runner>`. Do not run manager fault injection concurrently with the cashier: its temporary table lock/rename is deliberately database-wide within the disposable fixture. Stop only the owned application process and use `database.cjs stop` afterward. The runners do not use deployment, seeds or migration wrappers.

## Cashier task: recover an interrupted checkout

**Scenario:** a payment attempt has an uncertain response. The retained original operation already exists. Ask the operator to determine what happened without taking another payment or discarding the cart.

1. Find the recovery entry beside the blocked Charge action. Reach it using Tab/Enter and record whether instructions were needed.
2. Read the retained operation reference. Record it before and after every transition. Check the status with the existing read action.
3. If the result is pending/unavailable, keep the request and tender evidence. Reconnect and check again; do not infer failure, clear storage, replace the request ID or create a new sale.
4. If the scoped original result is not found, use only the supported original-request retry. Server authorization, lease, revision and transaction controls still decide whether it can commit.
5. When the original sale is confirmed, compare its number/total/status, then explicitly acknowledge. Verify focus remains usable and no duplicate financial effect exists. A receipt or external payment delivery requires separate evidence.
6. If cart review is required, resume only the matching cart and inspect current data before continuing. Session/role loss requires restored access, not a workaround.

Run in EN and FR, desktop and 390×844, including actual response loss after independently confirmed commit. The saved runner restores the exact captured request bytes for the French replay; this is a disclosed synthetic setup, not a second customer checkout.

Record unassisted completion, time to locate recovery, time to confirmed result, reference continuity, accidental replacement attempts, assistance, backtracking and the operator's explanation of “unknown” versus “recorded”. Use task timestamps; do not present development cold compilation as application p95 latency.

## Manager task: inspect a source-backed discrepancy

**Scenario:** the manager run sheet reports a stockout risk. Ask the operator to explain the signal, find the source and identify the next permitted step.

1. Open the manager digest and switch to Actions and risks / Pilotage. Identify the signal and its next-step text in the same row.
2. Read generation/period/currency context and source limitations. Missing, stale or unavailable evidence is not zero or successful resolution.
3. Use the uniquely named source link with the keyboard. Verify it reaches the authorized inventory workflow and the synthetic item can be found. A dashboard-level aggregate is not an exact transaction or adjustment ID.
4. Review current stock and permitted replenishment/transfer options in their owning workflows. This P08 slice performs no correction, approval or inventory movement. Preserve source evidence; do not mark an aggregate resolved merely because it disappeared from the digest.
5. Repeat with an empty queue, a failed source read and a denied role. The failed read must provide an honest recovery path; a denied role must not receive the source data. Restore the source and retry by keyboard.
6. Repeat FR on the representative mobile viewport. Record wrapping, focus visibility, whether the next step is understandable, and any terminology needing local review.

Record time to identify source/next step, correct interpretation of source uncertainty, source-navigation completion, permission denial understanding, assistance and unresolved questions. Resolution rate requires a separately verified domain correction and subsequent fresh source read; opening a link is not resolution.

## Customer observation protocol for a later authorized pilot

Use neutral task wording, do not guide until the operator asks, and record assistance separately. Capture only consented, minimized evidence; avoid secrets, personal customer details and payment credentials. Compare repeated tasks within the same role/device envelope. Report counts and denominators, including failures/abandonment. No numerical baseline, satisfaction conclusion, retention uplift or accessibility certification is established by these scripts.
