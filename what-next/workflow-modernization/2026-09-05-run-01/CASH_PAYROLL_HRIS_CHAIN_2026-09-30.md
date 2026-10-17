# HRIS input chain and country-pack boundary

FA-CASH-COMMAND remains the primary workflow. This milestone verifies its payroll prerequisite in the owned local database. It does not close payroll, Cash Command or the platform assignment.

## Outcome

Actual services successfully created employee identity provenance, requested and independently approved contract document evidence, requested and independently approved contract activation, requested/approved/applied a payment destination through three different actors, and certified/froze attendance. The HRIS readiness builder accepted these persisted records and produced a READY export with its own computed hash. Document, contract and attendance self-approval attempts were denied. The persisted destination did not expose the synthetic raw account.

All source inputs are explicitly synthetic test records. The signature, scanner and company-policy fixture inputs do not establish real signatures, malware scans or professional approvals. READY here describes the HRIS contract validation only; it does not establish payroll calculation readiness or statutory certification.

Both actual period creation and calculation reject the bundled Cameroon pack with:

> CNPS pension rates requires EXPERT_REVIEWED or REGULATOR_CONFIRMED country-pack provenance.

Period creation left no period. To exercise HRIS attendance independently, the verifier then created an explicitly synthetic OPEN period container directly in the owned fixture database. This is not a successful period-creation journey. Calculation on that container also failed, with run, payslip, payment-batch and journal counts unchanged. No calculated run or release was created; no calculated proof strings were inserted.

The registry currently contains the bundled Cameroon pack. Its CNPS provenance is SOURCE_CHECKED with SUPPORTED_DRAFT capability. The payroll resolver requires expert-reviewed or regulator-confirmed CNPS provenance. An unchanged-pack evaluation of the existing review-intake service returns BLOCKED for the four tested families; the IRPP review topics below are missing. No approval was submitted, and the pack was not modified.

## Remaining inputs and owners

| Required input | Owner and where to obtain it | What happens next |
|---|---|---|
| Reviewed CNPS pension, family allowance, occupational risk and employer rules, covering the applicable dates and classifications | Qualified payroll/statutory reviewer: review the original sources referenced by `services/regulatory/country-packs/cameroon.ts`, record the exact rule version and independently reviewed evidence | Engineering encodes the reviewed proposal and runs its executable fixtures; no status-only promotion |
| IRPP taxable base, brackets/rates, deductible contributions, family/dependent treatment, periodic/annual regularization and rounding | Qualified payroll/tax reviewer: authenticated source documents and a signed review addressing these six topics | Supply `topic`, `legalRef`, `sourceEvidenceHash`, `reviewedBy`, `reviewedOn`, plus reviewed expected calculation scenarios |
| Organization sector and occupational-risk classification | Payroll/finance owner: the organization's actual registration/classification records | Configure the correct settings; the GENERAL/A settings in this test are synthetic |
| Proposed pack and expected-output fixtures | Engineering, based on the review above | Validate the full proposal and hash, evaluate and record its intake certificate |
| Independent organizational signoff | Authorized legal/statutory owner, using the recorded certificate and authentic approval record | The existing payroll command-center intake requires a matching certificate hash, approval-evidence hash and fresh authentication |
| Executable reviewed pack integration | Engineering/release owner after accepted evidence and applicable controls | Integrate the reviewed version into the resolver's registry, rerun period/calculation/release/settlement verification, then use the ordinary release process |

The intake exists at `/en/dashboard/payroll` and `/fr/dashboard/payroll`. Its persistence service records certificates/approvals in audit records; it does not automatically change the bundled resolver registry. Signing an intake alone therefore does not make current calculation succeed. The already-posted synthetic fixture also remains unsuitable for proof backfilling or duplicate posting.

## Verification

- Successful source-bound receipt: `lanes/environment/payroll-hris-input-chain-bd47490f-c26b-4cb8-89f9-efb457b6075b.json`.
- Read-only country-review evaluation: `lanes/environment/payroll-country-review-a6c06546-5382-4132-a552-cca489d0a8c9.json`.
- Failed attempt retained: `payroll-hris-input-chain-7673617d-339e-4fba-8e7f-50fafad6a2d1.json`. The verifier initially read attendance evidence from `snapshot.sourcePayload`; the real field is `snapshot.metadata.sourcePayload`. Correcting that verifier lookup produced the passing run. No application fix was needed.
- The initial sandbox run could not save its receipt (EPERM). The authorized guarded local run then saved both attempts. No automatic approval-review rejection occurred.
- Commands: the bundled Node executable ran `verify-payroll-hris-input-chain.cjs` and `inspect-payroll-country-review.cjs` in the environment lane. The first enforces owned-database identity and blocks external fetches; the second evaluates the unchanged pack without submitting approval.
- Application and schema source hashes were stable. No application code changed, so prior relevant unit/lint/TypeScript/browser evidence was retained; no new browser or full-build pass is claimed.

## Review and next work

Architecture/backend/data: actual producer records now satisfy the consumer's HRIS readiness contract; the separate statutory boundary remains. Finance/audit/security: independent actors, immutable references, private destination and no financial effects on denial were checked. Product/operations: the remaining input owners and registry handoff are explicit. Quality/SRE: isolated runtime receipts and unchanged-source bindings, no production-performance claim. UX/localization: no interface changed; existing gaps remain. SaaS packaging, POS/inventory, purchasing and AI are not applicable to this prerequisite test because none of their behavior or data changed. This is engineering verification, not professional approval.

Successful calculation/release cannot be claimed against the current pack. Continue the unaffected Cash/payroll accessibility and recovery work while the statutory review is outstanding; prioritize the already identified nested-main landmark and wider payroll labels. Preserve the successful financial lifecycle requirement as open. No migration, deployment, external message or real payment occurred.
