# Cameroon blueprint execution — scope and production admission

Date: 7 October 2026. Status: **first bounded engineering tranche implemented; release acceptance remains open**. This executes the initial 00/01 boundary prescribed by the [completion blueprint](../../plans/stoquify-cameroon-hris-payroll-blueprint-2026-10-07.md). It does not mark the whole blueprint complete.

## Confirmed scope and unresolved decisions

The user confirmed private-sector SMEs with 10–250 employees, monthly payroll and one legal employer per tenant. Multiple establishments remain within that single employer boundary. Cameroon is the first jurisdiction; other countries require independent national packs and acceptance.

Actual pilot employer, workforce categories, sector/collective agreement, establishment filings, reviewer identities, permitted deductions and current statutory output specifications remain unresolved. A product scope decision is not evidence that a particular tenant meets those conditions. Employer enrollment/eligibility verification remains part of the later release work; it is not inferred from a country code or tenant ID.

The [legal-source register](cameroon-legal-source-register-2026-10-07.md) remains the source/interpretation worklist. No statutory rates, formula approvals, reviewer signatures, authority acknowledgements or country-pack approvals were created by this implementation. Earlier legal research has not been silently promoted into professional sign-off.

## Reconciliation with existing programs

- Retain the [HRIS realization roadmap](../HRIS-Payroll/STOQUIFY_HRIS_PAYROLL_REALIZATION_ROADMAP_2026-07-19.md): its July pending organization/time-model descriptions do not authorize rebuilding the existing schema. Current source evidence remains in the [HRIS audit note](cameroon-hris-ux-evidence-2026-10-07.md).
- Retain the [Payroll Trust Spine register](../HRIS-Payroll/payroll-trust-spine-execution/EXECUTION_REGISTER.md): WP0–8 internal engineering ratification is historical evidence. This admission change supplements its runtime boundaries; it does not reopen or replace the transition kernel, or imply national certification.
- Preserve the large inherited dirty working tree. In particular, pre-existing payslip assembly/sealing and certified-input workbench changes in `payroll-control.service.ts` were retained. A diff against HEAD includes those inherited changes and must not be attributed wholly to this tranche.

## Implemented contract

`services/payroll/payroll-production-admission.ts` adds one server-owned guard using existing country resolution, certified-input and scenario-evidence mechanisms. It requires:

1. The actual run is Cameroon and its persisted payroll-period frequency is MONTHLY.
2. Persisted pack identity, aggregate capability and calculation snapshot agree.
3. Certified HRIS/input hashes are present; employee input identities and readiness hashes match the retained run.
4. Calculator parameters remain supported and independently reviewed, with the same resolution hashes for the pinned version and pay date. The income-tax calculator must be enabled; every employee line must show a calculated, applied tax result. A reviewed zero result is allowed; missing, blocked or unapplied tax is not an exemption.
5. Reviewed scenario coverage is READY, complete and still has the exact retained hash and source evidence.
6. A separate, reviewed `payroll.productionAdmission` release decision is present in the calculation snapshot and still matches current resolution. Merely promoting existing CNPS/IRPP families is insufficient.

Calculation captures an optional release resolution with purpose `PAYROLL_PRODUCTION_ADMISSION`, includes its hash in the country-pack resolution hash and retains its full envelope in server-generated metadata. Its absence does not bypass existing calculation provenance checks, and cannot authorize downstream effects. Caller metadata remains under `requestedMetadata`; it cannot set the authoritative decision.

The release parameter must use the existing regulatory envelope and supported/reviewed capability. Its value must identify status APPROVED, scope `CM_PRIVATE_SME_MONTHLY_SINGLE_EMPLOYER`, calculator contract `stoquify-payroll-calculator.v1`, and SHA-256 identities for `obligationCatalogueHash` and `releaseEvidenceHash`. These identities refer to actual future reviewed artifacts; a matching string is not proof that evidence was professionally accepted. The calculator-contract ID is a compatibility identifier, not a source-code attestation. Changes to calculator semantics require an explicit contract/version and evidence review.

**No real Cameroon release parameter was added.** The current CNPS and IRPP review blockers are unchanged. Full applicable charges, employer eligibility, formula correctness, database proof and pilot acceptance must be closed before anyone publishes that release approval. This tranche provides the enforcement boundary; it does not supply the missing statutory implementation.

## Protected paths and recovery policy

| Boundary | Enforcement | Retained behavior |
|---|---|---|
| Payslip emission and payroll posting | Guard before event, payslip or ledger writes | Verified exact replays return already committed results without new effects |
| Legacy combined approval/posting | Guard also applies when its legacy switch permits the entry point | Existing switch, actor and posting checks retained |
| Payment request and release | Guard before new batch/disbursement effects | Exact retained request/release results remain recoverable |
| Declaration preparation | Guard before creating outputs | Existing component/register proofs and truthful authority fallback retained |
| New submit/amend lifecycle evidence | Guard after fresh authorization, before evidence writes | Matching replay and later acceptance/rejection/payment/reconciliation evidence remain recordable |
| Authority execution queue | Guard before creating new execution work | Matching existing queue result remains idempotent |
| Authority worker | Tenant-scoped declaration/run lookup and guard immediately before adapter submission | Admission failure never calls the adapter; records a safe blocked error through existing failure handling |
| Historical employee archives and matched settlement bridge | No new current-pack gate | Already emitted employee records and settlement/reversal recovery remain available under existing access controls |

Rules are rechecked on a new attempt that could create effects. A successfully committed exact replay is retrieval of an existing result, not renewed financial authorization. This clarifies the blueprint's retry requirement and prevents later pack retirement from stranding recovery.

## Evidence and limits

The focused mocked lane covers the real admission guard, a successful synthetic emission, direct financial-service denials, stale/missing/review-required rules, incomplete release approval, input mismatch, monthly/country scope and retained emission replay. Queue, worker and declaration lifecycle tests independently prove rejection wiring and zero downstream writes/submission calls.

Existing calculation, lifecycle/CAS and payment/accounting suites explicitly isolate the new admission dependency to keep their original responsibilities testable. Their simplified evidence fixtures are not approved payroll configurations. The real-guard suite supplies separate admission evidence; a passing mocked transaction is not PostgreSQL rollback proof. One retained close-invalidation fixture was aligned with its existing row-lock query so that it exercises the intended invalidation path.

TypeScript checking uses the repository compiler options with six explicit source/test roots, `noEmit: true` and `incremental: false`; it does not run Next build, migrations, environment loading or database queries.

**Final results:** 10 suites / 175 mocked tests passed. Implementation and new admission-test typechecking has zero diagnostics. Expanding to thirteen roots exposes 24 existing legacy-fixture diagnostics; substituting the seven legacy fixtures from HEAD in a read-only compiler host produces 26, with no new diagnostic kinds introduced. The expanded fixture check is not green. Existing issues include duplicate fixture fields, incomplete execution-record fixtures and overly narrow inferred fixture types. They are recorded rather than hidden or repaired outside this scope. The workflow contract passed and the selected tracked diff passed whitespace checking.

Final command outcomes and source hashes are recorded in [execution verification](cameroon-blueprint-verification-2026-10-07.json). PostgreSQL concurrency/rollback, rendered browser journeys, live providers, employer enrollment and qualified Cameroon review are **not run/obtained** by this tranche. No production data, schema, rates, native plugin settings, deployment, commit or PR was changed.

## Execution register and next work

| Tranche | Status | Remaining acceptance |
|---|---|---|
| 00 scope/source worklist | Product scope confirmed; engineering decision record saved | Actual employer profile and qualified obligation decisions remain open |
| 01 production admission | Bounded engineering guard implemented and reviewed | Real database denial/rollback proof and eventual release evidence remain open; no activation |
| 00b disposable verification | Proposed | Identify/rehearse an explicitly isolated target before transactional acceptance |
| 02/03 directory and manager authorization | Proposed next implementation slices | Re-read source, isolate ownership, fix 250-person discovery and effective manager scope |
| 04–14 HRIS, formulas, outputs and pilot | Proposed, dependencies retained | Follow the original blueprint's domain decisions and acceptance conditions |
| 15 second-country boundary | Deferred until Cameroon acceptance | Independent country selection, research and disabled adapter proof |

ECC search-first located existing provenance, release-readiness and adapter boundaries; independent security review caught replay/recovery and scope issues before handoff. No new framework, package, schema or generic rules engine was introduced. UI/UX Pro Max work remains in the later page-contract/journey tranches.

Rollback is an explicit scoped code revert while new authoritative operations remain disabled operationally. Never remove admission checks to compensate for missing approvals, backfill approval hashes into frozen runs, or overwrite retained financial evidence. Review-only and historical evidence remain available under their existing controls.
