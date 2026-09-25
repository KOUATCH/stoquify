# Supplier payment amount and concurrency controls — v79

## Current-source finding

Payment approval and release previously checked invoice total minus amountPaid. Neither subtracted immutable supplier credit notes and their reversals. A posted credit of 20 against an invoice of 100 therefore still allowed the service to reach payment creation or release for 100. Two counterexample tests reached explicit payment-write sentinels before the expected balance rejection. This was a write-boundary defect, not merely a misleading history display.

The existing services already required independent actors, approved bank evidence, exact approved release allocations and idempotency. Those controls are preserved. The correction adds credit-adjusted amount due and coordination of the source records; it does not clear their other prerequisites.

## Implemented behavior

The new supplier-payment-balance helper reads posted immutable credit records for the selected invoice IDs within the trusted organization. It validates supplier, currency, positive amounts and posted-event references; a reversal requires a matching original and cannot restore the original more than once. Decimal arithmetic computes invoice total minus paid amount minus net credits. All invoices must match the payment currency. A negative balance remains a supplier credit position and provides no positive payment allowance.

Approval and release both use this calculation. Release rereads current credits instead of relying on approval-time amounts. A credit posted after approval can therefore make the old approved amount ineligible for release. No invoice, payment or source evidence is silently rewritten to fit an approval.

Both paths lock invoice rows in sorted identifier order and then the supplier before reading the amounts and current supplier balance. Release additionally locks its payment before reading its status/idempotency evidence. This coordinates competing releases and uses the same invoice-before-supplier order as supplier-credit posting. It does not certify every possible lock interaction elsewhere in the platform; broader deadlock/retry review remains open. Existing transaction errors remain visible, rather than being treated as successful release.

The existing cash-paid status semantics remain unchanged. A credit plus cash can exhaust the amount available for further payment while the invoice is still PAYMENT_PENDING under that legacy status rule. A credit-adjusted lifecycle/display policy and reversal recovery require connected workflow work; the service now prevents another excessive payment in the meantime.

## Verification

74 tests in four suites pass: balance helper, AP domain service, AP action controls, and purchase return/credit service. Tests cover credit deduction, reversal restoration, invalid scope/evidence, currencies, negative remaining allowance, both write-path rejections, and existing actor/bank/event behavior. Two before-tests fail as expected. An intermediate run passed 72 tests but failed two new parameterized cases because the test data was spread as Jest callback arguments; that fixture format was corrected, without changing expected values or increasing timeouts.

The owned PostgreSQL verifier exercises actual domain calls with explicitly synthetic invoice/return/credit and approved-bank prerequisites. It proves:

1. Credit 20 prevents new approval of 100 against invoice 100, without creating a payment.
2. A payment approved before the credit is rejected at release and remains APPROVED, with no payment ledger entry.
3. Mixed XAF/EUR invoice allocations are rejected before payment creation.
4. Two distinct approved payments competing for the remaining 80 produce one release and one rejection. Exactly one payment ledger entry and one payment transaction remain, invoice amountPaid is 80 and supplier currentBalance is zero.
5. Repeating the winning release with the same idempotency key reuses its evidence and produces no second effect.
6. Cash 80 plus credit 20 leaves zero further payment allowance.

Bound sources stayed unchanged during verification; records outside the new fixture organization stayed unchanged. The result inspection confirms one RELEASED and one APPROVED competing payment, with the released transaction in SUSPENSE. This is not evidence of provider execution, bank settlement, clean reconciliation or statutory posting readiness. No external payment rail or message was used. Typecheck and changed-file lint pass; see the receipt for command/session bindings.

## User and operator guidance

The current source has server actions for payment approval and release but no caller from application components, hooks or routes. This batch does not claim an end-to-end browser payment journey. Review current obligations through `/en/dashboard/purchases/payables` and `/en/dashboard/purchases/payables/history` or the French equivalents. The user-facing payment preparation/review/release flow and handling of superseded approvals remain engineering work.

For an amount rejected after a supplier credit, the AP owner needs the invoice ID and source amount, posted credit/reversal records, existing cash allocations, selected bank destination and current approved payment. Obtain these from authorized AP history/source records and the supplier's actual documents. The organization administrator supplies the relevant role assignments; the bank-destination approver supplies verified destination evidence through its governed process. Do not invent approval references or use another person's identity.

The payment requester, independent approver and independent releaser must use their own current identities and applicable fresh authentication when the actions are invoked through the authorized interface. The amount to approve must reflect current credits, allocations and one currency. A release rejected after changed evidence needs a new review of the actual current amount. Do not edit the old approved record directly, duplicate a released payment, or clear SUSPENSE to force progress. A controlled replacement/cancellation route for stale approvals is not supplied here and remains required implementation.

SUSPENSE requires the reconciliation owner to inspect the payment transaction, exception and ledger/provider evidence through the existing reconciliation workflow. Obtain any external payment reference from the actual provider or bank record. A locally recorded release ID is not proof that a bank transfer completed.

The existing PA-022 register also identifies an untrusted requester-origin gap: the approval payload contains requestedById before a durable authenticated payment request exists. Comparing requester/approver/releaser identifiers alone does not prove that the named requester actually submitted it. This batch preserves that open finding. An authenticated request record and independent review of that record are required before claiming the full separation-of-duties journey works.

## Rollout and remaining scope

No migration, backfill or production deployment is required by this source patch. Release service/helper changes together through the usual controls. Monitor balance rejections, mixed-currency requests, transaction conflicts and suspense queues. Preserve all old approvals and financial evidence. Correct forward or pause affected release operations if necessary; do not restore credit-blind payment amounts or remove locks to make a blocked request succeed.

PA-022 approval and PA-023 release remain partial, with service/database evidence and browser workflow gaps. PA-026/027 credit/reversal behavior has regression coverage but has not received full lifecycle runtime assurance in this batch. Remaining work includes a user-facing review/release flow, controlled stale-approval recovery, credit-aware invoice status, complete supplier-ledger reconciliation and provider outcome/retry semantics. The full platform assignment remains active.

Architecture/backend/API/data: domain-owned amount calculation and transactional source coordination. Finance/controls/audit: credit deduction, currency separation, exact retry and preserved financial evidence; no auto-repair or professional certification. IAM/privacy/security: existing current-role/fresh-auth/separation-of-duties controls retained; tenant-scoped source queries and parameterized locks. Frontend/UX/accessibility/EN-FR: no interface changed; payment-action browser completion remains unverified because no caller exists. Product/support/SRE/release: explicit stale-approval and suspense limits, no performance or end-to-end readiness claim. Statutory country-rule changes, POS/offline, HRIS/payroll, AI/agents, billing/growth and external provider integration changes: not applicable to this bounded amount/concurrency correction; provider settlement remains a connected unverified boundary.

Selected skill: `011-aqstoqflow-purchasing-ap-controls`. Passed bounded gates: credit/currency limits, existing action authority regressions, concurrent release/idempotency, source/non-fixture integrity, typecheck and lint. Open gates: complete approval/release/reconciliation workflows and platform-wide assurance. Next numbered skill remains `012-aqstoqflow-payroll-presence-engine` after active AP priorities, without automatic advancement.
