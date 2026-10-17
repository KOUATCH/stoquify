# Payment release prerequisites and workbench guidance

FA-CASH-COMMAND remains active with payroll as its supporting dependency. Full release/provider-settlement/declaration verification is not complete.

## What was established

The actual local request service refuses the earlier synthetic posted-run fixture because it lacks HRIS readiness and payroll engine input proof. The first release verifier expected to reach destination validation and failed at this earlier gate. A second fixture attempt correctly failed because the synthetic employee defaulted to an inactive state. Neither attempt changed production controls or established successful release.

With a newly created ACTIVE synthetic employee, the actual destination services completed request → independent approval → independent application. Self-approval and cross-tenant evidence lookup were denied. Stored records contain masked/HMAC destination values, not the supplied raw account. The authoritative destination validator accepted the resulting record. The subsequent payment request still failed for missing calculated input proof, with payment batch, transaction and journal counts unchanged.

This exposed an interface defect: the run workbench derived payment/declaration action availability from run status and permissions without checking the same input proof required by the writer. It could invite a request that the server would certainly refuse.

## Correction

`payroll-control.service.ts` now uses the existing `payrollCertifiedInputProofFromMetadata` contract for workbench availability. Missing input proof blocks request-payments, release-payments and declaration preparation and produces `PAYROLL_RUN_CERTIFIED_INPUT_PROOF_MISSING` in the run's blocker list. It does not block historical reads or clear any writer control. Existing approval and lifecycle behavior remains unchanged.

`PayrollRunWorkbench.tsx` explains this blocker and its recovery in EN/FR. Users see why the action is unavailable before opening a submission drawer. The explanation directs them to controlled calculation/correction and explicitly rules out editing posted records or manually inserting approval hashes.

## Required inputs and where they originate

| Input | Responsible operator and source |
|---|---|
| Employee identity provenance | HR operator: existing HRIS identity source record and its recorded source system/ID/hash. |
| Contract and document approvals | Authorized HR reviewers: contract activation and approved/scanned document evidence maintained by the HRIS contract/document workflows. |
| Compensation approval | Authorized compensation reviewer: approved active assignments and linked business events. |
| Payment destination proof | Separate requester, approver and applier: the existing destination workflow, which produces the applied proof and private destination hash. |
| Attendance certification | Authorized attendance reviewer: certified HRIS time/leave/attendance and frozen payroll snapshot. |
| Payroll input proof | Payroll calculation service: readiness verdict, HRIS readiness export, engine input hashes and snapshot hash. These are outputs of controlled calculation, not fields for a user to invent. |

For an already posted historical run missing these outputs, engineering/accounting must establish an evidence-backed recovery or correction path. A newly calculated replacement must also account for existing liabilities; this report does not authorize another payment or posting. The current fixture gap is engineering verification work, not a request for the user to sign synthetic evidence.

## Verification and limits

Exact source-bound checks, failed attempts and browser captures are indexed in `evidence/cash-release-readiness-review-2026-09-30.json`. The focused regression first reproduced a missing blocker; the first corrected-suite attempt exposed a missing date in the test's mock payment batch, which was repaired without changing production behavior.

Actual browser scope: EN desktop and FR 320-pixel workbench blocker explanation, disabled payment/declaration drawers, current server denial and no new payment effects. Wider payroll localization, horizontal tables, keyboard/assistive-technology coverage, release UI, actual provider settlement and declaration lifecycle remain open. No deployment, migration, external delivery or real payment occurred.

Read-model changes do not alter payroll writes. Before this change the destination prerequisite receipt also reran the previous posting fixture; its successful posting is still only synthetic calculated-input evidence. New read/action/browser checks validate the current missing-proof denial. No release, settlement or statutory approval is claimed from that receipt's `passed` field; `releaseExecuted` and `settlementExecuted` are explicitly false.

## Review and rollout

Architecture/backend: read/write prerequisite consistency, reuse of the canonical proof parser, no new activation mechanism. Data/finance/audit: historical records preserved, no financial effects on denial, separate destination identities and durable evidence inspected. Security/privacy: tenant denial, self-approval denial and masked destination storage verified in the owned database; no broader certification. Product/UX/localization: actionable EN/FR guidance replaces an inevitable failed submission. Quality/release/SRE: focused regression and local runtime receipts, no production latency claim. Statutory rules, commercial packaging, inventory/POS, purchasing and AI: not applicable to this guidance change; original requirements remain open.

No migration is required. Deploy service and component together through the existing release process after its gates. Rollback is an application rollback preserving all records. A rollback restores the misleading action availability, although the writer still rejects missing proof.

Next work: prepare a source-backed HRIS calculation fixture through the actual identity/contract/document/attendance services, then continue request → approval → release → settlement/declaration and forecast checks. The readiness guard must remain effective throughout.
