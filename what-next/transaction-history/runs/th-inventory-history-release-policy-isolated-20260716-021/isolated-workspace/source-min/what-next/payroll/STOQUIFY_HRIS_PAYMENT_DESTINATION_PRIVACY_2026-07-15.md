# Stoquify HRIS Payment Destination Privacy

Date: 2026-07-15
Skill: `stoquify-hris-09-payment-destination-privacy`
Decision: READY FOR CONTROLLED INTEGRATION; NOT YET AN AUTOMATED PROVIDER-DISBURSEMENT CLAIM

## Scope

This slice established the HRIS payment-destination boundary used to request, approve, apply, and read salary-payment destinations while preserving the existing payroll release gate. It hardened the compatibility payroll service rather than creating a second source of truth.

The implementation was limited to the payment-evidence service, HRIS service/actions, focused tests, the deployment secret contract, and this report. No Prisma migration, provider adapter, bank-file generator, broad payroll UI migration, or accounting workflow change was made.

## Privacy Decision

- Raw bank-account and mobile-money values exist only in the fresh-authenticated request command and are discarded after normalization.
- Persisted records contain masked display values and keyed HMAC fingerprints only.
- `PAYROLL_PAYMENT_DESTINATION_HASH_SECRET` is a dedicated deployment secret, must be at least 32 characters, and must not reuse `AUTH_SECRET` or another application secret.
- Missing or short HMAC configuration fails closed before a destination request is persisted.
- Reveal is prohibited because the platform deliberately stores no recoverable destination value.
- Export is limited to masked status and proof-presence data.
- Recovery requires re-entry and a new approval workflow.
- Existing legacy `sha256:` fingerprints remain readable for compatibility; all new requests use `hmac-sha256:v1:`. Legacy destinations should be rotated through a newly approved request before unrestricted certification.

## Changes Implemented

### Payroll compatibility boundary

- Replaced deterministic unkeyed payment-destination hashes with domain-separated HMAC-SHA-256 fingerprints for all new bank, mobile-money, cash, and cheque requests.
- Added an explicit privacy policy to request and applied-evidence metadata.
- Replaced raw approval/rejection reasons in business-event metadata with reason hashes.
- Reduced audit snapshots to masked destination, status, proof-presence, and separation-of-duty outcomes.
- Enforced three distinct actors: requester cannot approve or apply; approver cannot apply.
- Preserved the existing release assertion that requires matching employee metadata, an applied destination request, request evidence, approval evidence, and an applied business event.

### HRIS boundary

- Added employee-scoped administrative and self-service read/request services.
- Self-service identity is resolved from the authenticated user-to-employee link; submitted employee, tenant, actor, and permission values cannot select another employee.
- Administrative decisions resolve HRIS people scope and bind the request ID to the tenant and employee before payroll delegation.
- HRIS output exposes only masked destination data, status, proof-presence booleans, release blockers, and separation outcomes.
- HRIS output omits requester/approver/applier IDs, raw workflow reasons, evidence hashes, and destination fingerprints.

### Action policy gates

- Reads require `hris.people.read`.
- Administrative mutations require `hris.people.manage` and fresh authentication.
- Self-service destination requests require `hris.people.read`, fresh authentication, and a server-resolved own employee record.
- The self-service action allowlists request fields before delegation.
- Payroll compatibility permissions are added only inside the HRIS service after HRIS scope has been established.

## Data Ownership

| Truth | Owner | Current implementation |
|---|---|---|
| Approved employee payment destination | HRIS payment-destination service | HRIS facade over existing payroll storage |
| Raw payment value | No Stoquify database owner | Discarded after request normalization |
| Masked display and fingerprint | HRIS compatibility storage | `PayrollEmployee` and destination-change request |
| Request/approval/application evidence | Business events and audit | Separate evidence hashes and event IDs |
| Payroll release decision | Payroll | Requires matching applied HRIS evidence |
| Settlement and accounting | Payment/accounting workflows | Consume released batch evidence, not HRIS raw values |

## Verification

Passed:

- Payroll payment-evidence service: 9 tests covering HMAC privacy, fail-closed secret handling, redacted persistence, event/audit minimization, maker-checker, three-actor application, readiness drift, and release evidence success/failure.
- HRIS payment-destination service and action gates: 8 tests covering own-record binding, scoped reads, cross-employee request rejection, permission denial, fresh authentication, submitted-authority stripping, and administrative approval policy.
- Existing payroll completion/release suite: 8 tests, including successful release and missing payment-destination evidence rejection.
- Focused ESLint across all six implementation/test files.
- Full TypeScript: `tsc --noEmit --pretty false`.
- Scoped tracked diff hygiene and new-file trailing-whitespace scan.

The Windows sandbox helper repeatedly failed during file reads/patches, so the same local operations were rerun outside that helper. Those failures were tooling-environment failures, not application failures.

## Residual Risks and Required Operations

- Configure the same strong `PAYROLL_PAYMENT_DESTINATION_HASH_SECRET` on every application instance before destination requests are enabled. Secret management and deployment validation remain operational responsibilities.
- Legacy unkeyed fingerprints are compatibility-only and are not automatically migrated because the raw values no longer exist. Re-entry plus independent approval is the safe migration path.
- The system cannot generate a provider-ready bank/mobile-money disbursement file from non-recoverable values. Automated settlement requires a separately governed tokenized provider vault or equivalent external destination owner; reintroducing decryptable values into HRIS/payroll would reverse this privacy decision.
- Existing payroll payment-destination actions remain compatibility ingress. Their underlying controls are hardened, but UI migration to the HRIS facade is still pending.
- The current self-service gate reuses `hris.people.read`; a dedicated self-service entitlement can be introduced when package-level HRIS permissions are finalized.
- No broad Jest run, production build, browser smoke, accessibility pass, provider integration test, secret-rotation rehearsal, or migration rehearsal was performed in this focused service/control slice.

## Files Changed

- `.env.example`
- `services/payroll/payment-evidence.service.ts`
- `services/payroll/__tests__/payroll-payment-evidence.service.test.ts`
- `services/hris/payment-destination.service.ts`
- `services/hris/__tests__/payment-destination.service.test.ts`
- `actions/hris/payment-destination.actions.ts`
- `actions/hris/__tests__/payment-destination.actions.test.ts`
- `what-next/payroll/STOQUIFY_HRIS_PAYMENT_DESTINATION_PRIVACY_2026-07-15.md`

## Handoff

Next skill: `stoquify-hris-10-time-leave-attendance-engine`.

Before production release, choose and document the settlement destination owner: a tokenized provider vault is the recommended path if Stoquify must generate payment instructions without storing recoverable bank or mobile-money values.
