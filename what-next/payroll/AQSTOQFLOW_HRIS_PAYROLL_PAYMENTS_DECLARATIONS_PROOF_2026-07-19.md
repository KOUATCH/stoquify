# AqStoqFlow HRIS/Payroll Payments and Declarations Proof

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-13-payments-declarations-proof`  
Status: **Stopped — country-pack provenance prerequisite is not satisfied**  
Next handoff: `aqstoqflow-hris-payroll-14-accounting-close-assurance` is blocked until the prerequisite is remediated and this tranche is rerun.

## Executive Decision

The existing payment, declaration, callback, authority-proof, and settlement controls remain operational and fail-closed in focused tests. They must not be represented as production-ready because the upstream country-pack proof currently contains symbolic `sourceEvidenceHash` labels rather than verifiable SHA-256 digests bound to retained authoritative artifacts.

No payment, declaration, employee destination, statutory formula, or proof service was changed in this tranche.

## Scope

This was a blocker audit of the downstream proof chain. It verified that the existing controls remain present without accepting the unresolved statutory provenance claim.

Files inspected included:

- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_COUNTRY_PACK_PROVENANCE_2026-07-19.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PAYMENTS_DECLARATIONS_PROOF_2026-07-14.md`
- `services/payroll/payment-evidence.service.ts`
- `services/payroll/payment-reconciliation.service.ts`
- `services/payroll/declaration-lifecycle.service.ts`
- `services/payroll/authority-adapter-execution.service.ts`
- `services/payroll/payroll-provider-settlement-bridge.service.ts`
- `services/payroll/payroll-provider-inbox-settlement-worker.service.ts`
- their six focused test suites
- available architecture graph evidence under `graphify-out/`

## Prerequisite Decision

Skill 13 requires country-pack provenance. The 2026-07-19 Skill 12 audit found that:

- active CNPS fixtures use labels such as `sha256:cm-cnps-regulator-confirmed-2026`;
- those values are not 64-character SHA-256 digests;
- no retained source artifact is bound to the asserted hash;
- the static country-pack gate does not detect this distinction.

This prerequisite failure blocks a production-readiness handoff even though downstream code tests pass.

## Existing Controls Confirmed

- Approved payment destination evidence is required before payment readiness succeeds.
- Destination approval/application preserves maker-checker separation.
- Payment settlement requires a released batch, posted ledger evidence, provider evidence, approved matching, source register proof, and amount/currency tie-out.
- Settlement idempotency keys reject reuse with conflicting evidence.
- Provider inbox workers enforce lease and supported-event boundaries.
- Declaration transitions require authority adapter proof and maker-checker approval where applicable.
- Declaration proof carries country-pack resolution/register metadata and authority proof identifiers.
- Production authority adapters remain blocked when certification proof is incomplete.

## Data Ownership

- HRIS owns employee identity and approved payment-destination evidence.
- Payroll owns certified run, payment-release, and declaration proof.
- Payment/reconciliation services own provider callbacks, settlement state, exceptions, and tie-out evidence.
- Authority services own submission, acknowledgement, rejection, and amendment proof.
- Accounting owns ledger truth and close assurance.

## Tenant, RBAC, Audit, and Redaction

- Existing organization scoping and permission checks were preserved.
- Existing maker-checker and fresh-authorization boundaries were not weakened.
- No employee bank, mobile-money, national identifier, raw statutory document, or unredacted proof payload was added or changed.
- The existing dirty working-tree changes in payment evidence and other roadmap surfaces were preserved.

## Verification

Passed:

- `services/payroll/__tests__/payroll-payment-evidence.service.test.ts`
- `services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts`
- `services/payroll/__tests__/declaration-lifecycle.service.test.ts`
- `services/payroll/__tests__/authority-adapter-execution.service.test.ts`
- `services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts`
- `services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts`

Result: **6 suites passed, 60 tests passed**.

Skipped:

- No live provider or authority call was made.
- No browser validation was required because no UI changed.
- Full repository typecheck and full test suite were not run because this was a prerequisite-blocked, read-only tranche.

## Baseline-Gap Delta

| Measure | 2026-07-14 baseline | 2026-07-19 result | Delta |
| --- | --- | --- | --- |
| Focused downstream proof controls | Ready | Tests remain green | No code-control regression found |
| Country-pack prerequisite | Treated as satisfied | Not verifiable | Ready → blocked |
| Production-readiness blockers | External provider/authority readiness | Provenance plus external readiness | +1 upstream blocker |
| Source or service changes in this tranche | N/A | None | 0 |

## Required Next Action

1. Complete the Skill 12 remediation: retain authoritative source artifacts, obtain qualified review evidence, calculate real SHA-256 digests, bind them to fixtures, and make the statutory gate verify them.
2. Rerun Skill 12 until the country-pack prerequisite is genuinely satisfied.
3. Rerun this Skill 13 tranche to prove the downstream payment/declaration chain against the corrected provenance.
4. Only then hand off to `aqstoqflow-hris-payroll-14-accounting-close-assurance`.

## Residual Risk

Green downstream tests prove local service behavior, not the truth of the external statutory evidence they reference. Live provider credentials, callback trust, authority endpoints, and real settlement/declaration certification also remain external production prerequisites.
