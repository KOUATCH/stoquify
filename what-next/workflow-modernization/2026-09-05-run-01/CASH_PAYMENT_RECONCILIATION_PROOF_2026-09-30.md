# Cash payment and reconciliation proof lifecycle

FA-CASH-COMMAND remains in progress. This milestone corrects a financial meaning defect and verifies successful payment matching and signed-reconciliation proof handoffs. It is not a whole-workflow, statutory, provider or release certification. Branch/HEAD remain `codex/migration-control-plane-release-2026-08-29` / `62a56036a5ac9b37236a20c9b148052199069479`; unrelated work is preserved.

## Defect reproduced and corrected

Payment proof previously used the number of displayed match rows to award **reconciled**. A real local manual proposal awaiting independent approval already earned that grade. Approving only 60 of a 100 payment also earned it, as did a second unapproved proposal for the remaining 40. These are recorded pre-change reproductions, not inferred risks.

The service now aggregates the complete accepted allocation history for the current tenant and payment. It reuses the reconciliation writer's accepted statuses (`AUTO_MATCHED`, `APPROVED`, `CORRECTED`). Reconciled proof requires positive, non-null allocations in one matching currency whose exact decimal sum equals the payment amount. Proposals, rejected/voided decisions, partial coverage, excess amounts, missing amounts and incompatible currencies cannot establish full reconciliation. Existing posted, operational, raw and blocker precedence remain effective. Corrected accepted match nodes now use the same accepted-status meaning.

Displayed history remains bounded to ten rows and explicitly tenant-filtered. Older valid allocations can establish coverage even when only newer rejected history is displayed. Historical rejected nodes remain retained as unavailable evidence; their mere existence neither grants full reconciliation nor deletes valid current coverage. Aggregate failures propagate; missing/foreign payment subjects stop before allocation queries. No business writer, permission, module guard, approval rule or signature control was weakened.

## Verified transitions

| Local service sequence | Payment proof |
|---|---|
| Confirmed synthetic payment, no match | Operational |
| Actual proposal for 60, awaiting approval | Operational |
| Actual independent approval for 60 of 100 | Operational |
| Actual proposal for the remaining 40 | Operational |
| Actual independent approval completing 100 | Reconciled |
| Accepted allocations outside the ten displayed rows | Reconciled |

Provider events were captured through the actual HMAC adapter and capture service using a generated local secret. Proposal and approval services produced durable records and safe replay. Maker self-approval was rejected without creating a match. Proof reads left payment, provider-event, match, journal and payment records unchanged; ordinary access audits remain allowed. A foreign-organization proof request was denied.

A separate actual reconciliation run matched its synthetic source, reached `READY_FOR_SIGNOFF`, passed preview, and was signed through the signing service by a separate actor. Its proof changed from **reconciled** to **certified**. Repeating the signing command returned the same certificate hash with exactly one signing audit and one signing business event; no journal was created. Product “certified” here describes that local software state, not professional certification or live organizational authority.

## Verification and limitations

The current review indexes exact hashes and receipts. **62 tests across six suites**, changed-file lint and TypeScript pass. Coverage includes accepted allocation completeness/precision, non-accepted statuses, wrong/mixed currency, null/non-positive/excess values, query failure/retry, root/child tenant scope, existing proof/blocker policy, protected actions/module boundaries and the drawer. The initial suite passed tests/lint but failed TypeScript because a narrowed status array rejected the broader enum argument. An equivalent equality comparison fixed it; final static and database checks bind to the corrected source.

Actual Cash proof drawers are exercised for the successful payment and signed reconciliation in EN desktop (1440), FR tablet (768) and FR mobile (320). The verifier checks the real action response's subject, localized reason, keyboard focus containment, Escape/focus return, horizontal containment and page errors, and retains screenshots. Financial record fingerprints are compared before/after reading. The first browser attempt pressed Enter before hydration and opened no dialog; its screenshot/receipt are retained. The verifier waits for the existing mode control's interactive-ready state before activating the proof. This does not resolve the separate pre-hydration/latency requirement.

All data, provider setup, confirmed payment state and direct-service authority/fresh-auth preconditions are synthetic and isolated. Actual local producer/approval/signing services were exercised; no live provider callback, money movement or statutory approval was supplied. No payment or ledger posting is claimed by this matching test. The baseline verifier saved its completed six-stage receipt but retained runtime handles; only that identified process was stopped after checking its final receipt. Corrected verifiers disconnect and terminate explicitly. The app was not restarted.

## User and operator guidance

Open `/en/dashboard/finance/cash-command` or `/fr/dashboard/finance/cash-command` and select an available payment or reconciliation proof. A pending proposal or partial approved allocation should remain below **reconciled**. Complete review and approval in the reconciliation workspace; do not edit proof metadata or statuses to improve the grade. Reopen proof after the underlying operation succeeds. No-blocker text alone does not establish approval, posting or settlement. Real operations still need the source payment, provider/statement evidence, matching currency/amount, appropriate current permissions, an independent approver and required fresh authentication.

No schema migration or new setup input is required for this correction. The shared proof service also serves other evidence consumers; use the existing reviewed rollout. Prefer a forward fix if an aggregate read fails. Reverting the coverage check restores the demonstrated false reconciliation claim. Preserve historical match and audit records during recovery.

## Review responsibilities and next work

Architecture/backend/data: bounded display plus complete aggregate, shared accepted-allocation semantics, exact decimal comparison. Security/privacy/audit: tenant/object admission, per-record audit and redaction remain; no new private data fields are exposed. Finance/controls/product: pending/partial work cannot masquerade as completed reconciliation; historical decisions stay visible. Frontend/localization/accessibility: existing EN/FR reason strings and drawer components reused; successful-state browser checks, no new visual system. QA/SRE: meaningful failed attempts retained, sources bound; no new production performance claim. Statutory/country rules, billing, migrations, external messaging and AI: not applicable to this read-grade correction; their broader requirements stay open. These are engineering reviews, not professional approvals.

Next: complete the certified-close proof lifecycle and the remaining Cash accessibility/recovery checks. Full upstream payment/release/provider settlement, payroll statutory evidence and the original whole-workflow closure audit remain outstanding. No new workflow is counted complete by this milestone.
