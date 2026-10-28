# AQSTOQFLOW HRIS/Payroll Payments And Declarations Proof

Date: 2026-07-14
Skill: aqstoqflow-hris-payroll-13-payments-declarations-proof
Next handoff: aqstoqflow-hris-payroll-14-accounting-close-assurance

## Scope

This pass focused on the payment and declaration proof chain after certified HRIS input readiness, payroll engine input snapshots, country-pack provenance, and posted payroll runs already exist.

The reviewed flow is:

1. Certified HRIS input readiness and engine input hashes are created on the payroll run.
2. Payroll posting creates component register, component mapping, legal provenance, year-to-date, and country-pack proof.
3. Payment release requires approved employee payment destination evidence, maker-checker release, fresh sensitive-action authorization, adapter proof, disbursement evidence where required, ledger posting, and reconciliation transaction evidence.
4. Declaration preparation requires legal provenance, year-to-date proof, component register proof, country-pack register proof, component liability mapping, and now certified HRIS input proof.
5. Declaration lifecycle and authority adapter flows require authority submission proof, callback/audit evidence, fresh authorization, and redacted proof exports.

No employee bank, mobile-money, or payment destination data was changed in this pass.

## Files Inspected

- `services/payroll/payroll-control.service.ts`
- `services/payroll/payment-evidence.service.ts`
- `services/payroll/payment-reconciliation.service.ts`
- `services/payroll/payroll-provider-inbox-settlement-worker.service.ts`
- `services/payroll/payroll-provider-settlement-bridge.service.ts`
- `services/payroll/declaration-lifecycle.service.ts`
- `services/payroll/authority-adapter-execution.service.ts`
- `services/payroll/authority-adapter-worker.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/__tests__/payroll-completion.service.test.ts`
- `services/payroll/__tests__/payroll-payment-evidence.service.test.ts`
- `services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts`
- `services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts`
- `services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts`
- `services/payroll/__tests__/declaration-lifecycle.service.test.ts`
- `services/payroll/__tests__/authority-adapter-execution.service.test.ts`
- `services/payroll/__tests__/authority-adapter-worker.service.test.ts`
- `services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts`
- `services/payroll/__tests__/payroll-authority-adapter-fixture-runner.service.test.ts`

## What Was Working

- Payment release already failed closed on posted payroll status, emitted payslips, approved destination evidence, separate preparer and releaser, fresh sensitive-action authorization, disbursement file evidence, adapter proof, and allocation total tieout.
- Payment reconciliation already required source register hash and provider evidence and deduped/conflicted provider callbacks.
- Declaration preparation already required legal provenance, year-to-date proof, matched statutory component register proof, matched country-pack register proof, component liability mapping, and correction declaration metadata.
- Declaration lifecycle already enforced maker-checker transitions, fresh authorization, authority proof envelopes, redacted proof exports, and callback/audit evidence.
- Provider and authority fixture runners already provided certification harness coverage for payment and declaration adapter behavior.

## Gap Closed

Step 11 introduced certified HRIS input proof on payroll run metadata:

- `payrollInputReadinessHash`
- `payrollEngineInputHashes`
- `payrollEngineInputSnapshotHash`

Before this pass, downstream payment release and declaration preparation could use the posted payroll run proof chain without explicitly requiring those certified-input anchors. That left a traceability gap between payroll-grade HRIS truth and external payment/declaration proof.

This pass closed that gap by requiring certified input proof from the posted run before:

- Payroll payment release can build payment batch, transaction, reconciliation, event, and audit proof.
- Payroll declaration preparation can build declaration payloads, declaration metadata, business events, and audit proof.

## Data Ownership

- HRIS remains the owner of employee identity, contracts, compensation, attendance, and approved payment destination evidence.
- Payroll remains the owner of certified payroll calculations, run proof, payment release proof, declaration proof, and correction proof.
- Payments and reconciliation services remain the owner of provider settlement callbacks, payment transaction state, settlement evidence, and exception state.
- Authority adapter and declaration lifecycle services remain the owner of external declaration submission, receipt, acknowledgement, rejection, and amendment proof.
- Accounting remains the owner of ledger posting and close assurance evidence.

## Tenant, RBAC, And Policy Gates

- Payment release remains tenant-scoped by organization and payroll run.
- Sensitive payment release continues to require fresh authorization and the `payroll.payments.release` permission.
- Payment release still requires maker-checker separation between request and approval.
- Declaration lifecycle operations continue to require fresh authorization and authority/declaration permissions in their existing gates.
- The new certified-input proof gate is service-owned, not UI-derived.

## Audit And Redaction

- Payment and declaration proof metadata now carries certified HRIS input proof hashes without exposing raw employee HRIS input details.
- Existing declaration proof exports keep redaction boundaries for sensitive proof payloads.
- No employee bank, mobile-money, national ID, or raw payroll input payload was introduced into public or broad proof outputs.

## Focused Tests Added Or Extended

- Extended payment release fixtures so successful payment batch, allocation, payment transaction, business event, and release metadata assert certified HRIS input proof propagation.
- Added a fail-closed payment release test for posted runs missing certified HRIS input proof.
- Extended declaration preparation assertions so declaration metadata, declaration payload, and declaration business event payload carry certified HRIS input proof.
- Added a fail-closed declaration preparation test for posted runs missing certified HRIS input proof.

## Verification Run

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts services/payroll/__tests__/payroll-payment-evidence.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/authority-adapter-worker.service.test.ts services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts services/payroll/__tests__/payroll-authority-adapter-fixture-runner.service.test.ts --runInBand`
  - 11 suites passed
  - 116 tests passed
- `npm run typecheck`
- `npm run prisma:validate`

## Current Blockers

No code blocker remains for this focused proof slice.

Production payment and declaration release still depends on real provider and authority readiness outside this local proof gate:

- Live provider credentials and settlement callback trust configuration must be certified per provider.
- Live authority adapter credentials and legal submission endpoints must be certified per authority.
- Production close assurance still needs the next handoff to prove payment, declaration, reconciliation, and ledger evidence tie out during close.

## Residual Risk

- This pass proves local service gates and fixture-backed provider/authority proof behavior. It does not certify a real bank, mobile-money provider, tax authority, or social authority integration.
- Accounting line metadata intentionally remains narrower than payment transaction and payment batch metadata. Full certified-input anchors are carried in payment batch, allocation, transaction, event, audit, and declaration proof artifacts, while individual ledger lines keep component/payment adapter evidence.
- The repository has a broad dirty worktree from earlier roadmap and module/HRIS work. This report only claims the focused payments/declarations proof slice.

## Decision

The payments and declarations proof slice is ready to hand off to `aqstoqflow-hris-payroll-14-accounting-close-assurance`.

The next step should prove the close-assurance chain from payroll run, payment release, settlement reconciliation, authority declaration proof, and ledger posting into period close evidence.
