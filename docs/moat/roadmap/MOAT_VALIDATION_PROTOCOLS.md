# Customer, operational and commercial validation protocols

> **30 September 2026 update:** M1-03 local PostgreSQL and EN/FR browser gates passed. Unanswered-request/notification visibility and in-place password confirmation are implemented. Real rail, customer cutover, recipient delivery recovery and pilot gates remain open. See [M1-03 execution report](M1_03_EXECUTION_REPORT.md); dated 27 September statements below describe the earlier baseline.

27 September 2026. All thresholds are retained hypotheses from the governing assessment. No participant recruitment, provider activation or real financial transaction occurred. A product owner must record a continue/redesign/stop decision; the accountant and operational owner can stop a financially unsafe pilot immediately.

## Common intake and evidence rules

Recruit existing firms/merchants with the recurring job, authority to share their own data and ability to complete the observation period. Record country, segment, existing tool, weekly volume, connectivity, buyer and decision maker. Obtain consent defining purpose, data scope, retention, access, withdrawal and permitted recordings. Use pseudonymous participant IDs in research artifacts; source records remain in approved tenant storage. Do not put account numbers, credentials, payroll detail or real customer records in this repository.

Before starting, time representative tasks using current tools. Record baseline source, start/end definition, support minutes, unresolved work, error rate and data-preparation time. Freeze cohort eligibility and exclusion rules. Dropouts remain in enrollment denominators; unusable financial records are disclosed separately rather than counted as successful work. Report founder prompting and assisted outcomes separately. Avoid causal claims from a small nonrandom pilot.

Define the support/cost ceiling before the first observation: paid package contribution less provider fees, hosting, review work, onboarding amortization and support minutes × loaded labor cost. Actual prices, costs and ceiling are currently unset. Present firm-paid versus client-paid M1/M2 offers and buyer-paid M4 collaboration as pricing hypotheses. A positive interview is neither payment nor retention.

## M1: accountant desk and repeat onboarding

**Cohort:** three firms and ten consenting clients; two close cycles. Include firms with at least two suitable clients, recurring missing-evidence work and the permissions to review. Baseline request-to-reviewed-resolution time uses request creation to authoritative review acceptance, preserving unresolved cases as censored/aged observations.

**Tasks:** onboard Client A with a separately scoped expiring grant; reconcile source/control totals; request proof through the existing owner; independently verify delivery state; submit evidence; find it in the desk; open the authorized detail; inspect the original source; record review; inspect current trust/close state and export for that client; revoke access and verify denial; repeat on Client B and in the second close cycle. The desk now includes unanswered requests and notification processing states. In the pilot, verify actual recipient delivery and recovery independently; an outbox SENT state is not a delivery receipt.

**Continue:** median request-to-reviewed-resolution time improves at least 30%; at least two firms bring another client without founder prompting; at least seven of ten clients complete a second productive cycle; at least two firms or their clients accept a stated paid pilot price. Record actual paid continuation separately. Report distribution, unresolved age and assistance alongside the median. If manual help accounts for improvement, firms resist the task, or their current system performs as well, redesign or stop.

**Interview script:** demonstrate the last missing-proof case; identify who chased whom and which record established resolution; describe the cost of an incorrect acceptance; repeat the task with the desk; explain the next client they would bring and why; identify who approves spend; present a specific written price; ask what would prevent a second cycle. Do not suggest that network effects already exist.

**Onboarding checklist:** consent and scope → active actor/permissions/modules → grant start/expiry/revocation owner → source inventory → control totals by currency/domain → isolated cutover rehearsal → explain every difference → accountant sign-off → rollback evidence → delivery/operator ownership → first actual reviewed task → second-cycle date. Master-data imports do not establish opening cash, stock or ledger continuity.

## M1-02 productive-outcome worksheet

Artifacts: `what-next/moat-execution/2026-09-27-run-01/pilot-outcomes-template.json`, `pilot-outcomes.mjs`, `customer-observation.csv`, and `onboarding-control-totals.csv`.

Each client entry needs client/organization IDs, `consentRef` and `onboardingEvidenceRef`. Each event needs a unique source ID, timestamp, client/organization, type and `evidenceRef`. Normalize only after verifying the actual source: invitation transport attempts → `INVITE_SENT/DELIVERED/FAILED/UNKNOWN`; missing-evidence request → `REQUESTED`; submitted response → `RESPONSE_SUBMITTED`; authoritative accepted response → `RESPONSE_ACCEPTED` with `cycleId` and `reviewEvidenceRef`; operator work → `SUPPORT` with minutes; paid continuation → `PAID_CONTINUATION` with payment evidence.

Cycle IDs are actual business periods, not invented sessions or repeated clicks. The reducer validates tenant linkage, source references, prior request/response chain and duplicate IDs; two distinct reviewed cycles are required for repeat productive use. It keeps unknown delivery distinct from delivery confirmation and does not count invitations as useful work. Run `node <run-folder>/pilot-outcomes.mjs <operator-verified-input.json>` in authorized storage. The repository template is empty; synthetic tests prove arithmetic/control behavior only. Invitation IDs and multiple delivery attempts must be reconciled by the operator before normalization; this is not a production event ingestion service.

## M2: selected payment-proof operation

**Selection dossier:** merchant/finance owner names in authorized storage; country, actual rail/statement format and protocol version; frequency and cost of unresolved work; representative permissioned statements; fees, reversals and settlement evidence; identifiers/currency/timezone; credentials and contract availability; provider support contact and escalation; named operator; recovery and cost ceiling. Keep rail unset until this evidence exists. Rank by observed pain × usable source coverage × operational feasibility, recording the reason for the first choice.

**Cohort and duration:** five merchants, 30 days and at least 1,000 permissioned transactions. Baseline median investigation time on comparable cases. Separate real cohort volume from a controlled edge-case corpus.

**Corpus and tasks:** normal settlement, duplicate upload/event, inconsistent duplicate, fee, reversal before/after matching, late event, missing statement, timeout with unknown result, multi-currency rejection, incorrect proposed match, reviewer conflict, concurrent finalization, revoked access, source correction after close-pack preparation. Preserve the seven lifecycle states from the execution plan; internal records alone cannot prove settlement. Assign every unresolved case an owner and age. Reconcile counts and amounts before/after ingestion; repeat the same command and demonstrate no duplicate monetary effect. Correct source evidence and show the affected proof invalidated/superseded, then regenerate through the owning service.

**Continue:** investigation median improves 50%; every tested resolution retains source evidence; no seeded wrong match silently finalizes; failures stay inside the agreed support budget. Show unmatched and unknown denominators separately. Stop expansion for unexplained differences, lost events, unavailable provider access or excess support cost. Small samples do not establish rare-event safety. Use `payment-proof-corpus.csv`.

## M3: cash/stock decision experiment

**Cohort:** eight merchants and an accountant for six weekly cycles. Require reconciled opening cash, dated obligations, expected receipts, source stock needs/availability, supplier lead times and a chosen buffer. Keep employee-level payroll detail outside the experiment; use authorized aggregates. Reject incomplete or mixed-currency inputs until separately reconciled.

**Tasks:** freeze base assumptions/version; compare base, delayed receipts and selected purchase/transfer choices; explain each funding breach and late arrival; record the decision that would change; submit any chosen action through the existing approval process outside the prototype; freeze weekly observed actuals and compare at the same horizon. Keep original forecasts to avoid hindsight edits. Show missing observations and preparation effort.

**Continue:** six of eight use it in at least four cycles; at least four identify a consequential decision it changed; aggregate absolute forecast error improves at least 20% against the frozen simple baseline. Compute by currency and horizon on the identical observed sample; never aggregate incompatible currency amounts. The supplied tool reports error sums and denominators, with null when no actuals exist. Stop/narrow if inputs are unreliable, preparation exceeds the current planning effort or no decisions change. Durable scenario storage waits for this gate.

The synthetic example compares a late purchase with a smaller-cost transfer under delayed receipts. Both can still breach the buffer; the tool does not call either “approved” or “optimal.” Five technical tests do not satisfy the merchant thresholds.

## M4: one useful supplier relationship before a network

**First cohort:** three buyers and eight known suppliers. Verify reachability, recurring eligible tasks and separately scoped relationship consent. Begin with a PO date discrepancy; change the discrepancy type only after recording actual need and domain-owner coverage.

**Tasks:** create invitation → confirm delivery status → supplier opens current grant → submits proposal → buyer reviews → supplier sees limited decision → second eligible task. Exercise revoked/expired invitation, wrong buyer, replay, delivery retry/unknown outcome and refusal. Measure confirmation/discrepancy time and support. No supplier submission updates payable, stock, payment or bank truth directly.

**Continue:** at least 60% of suppliers with a second eligible task complete it, median confirmation/discrepancy time improves 30%, and support stays within the pre-agreed ceiling. Report all enrolled suppliers plus the second-task denominator and reasons for ineligibility. Then require at least three suppliers genuinely serving at least two participating buyers before testing whether the second relationship is easier to activate. Founder prompting or no benefit from shared participation defeats a network claim. Use `supplier-relationship-observation.csv`; interview refusals and compare with current tools.

## Release observation checklist

Before release: actual browser English/French and keyboard task completion; screen-reader status/error review; two-client cache/export isolation; revoked and expired grants; disabled module and read-only entitlement; source changed after display; fresh-auth retry; same-command network retry; concurrent acceptance in PostgreSQL; per-client read bounds/latency; delivery recovery and support handoff; control-total rehearsal and restore; current qualified country review only where statutory outputs are used. Record exact commands, environment, timestamps and source revision. The present run supplies no release certification.
