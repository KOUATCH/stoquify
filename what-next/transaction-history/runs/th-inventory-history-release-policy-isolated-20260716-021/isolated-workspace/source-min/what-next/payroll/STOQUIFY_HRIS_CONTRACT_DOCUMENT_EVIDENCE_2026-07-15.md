# Stoquify HRIS Contract And Document Evidence

Date: 2026-07-15
Skill: `stoquify-hris-07-contract-document-evidence`
Status: BACKEND CONTROL SLICE IMPLEMENTED; RAW DOCUMENT DELIVERY REMAINS NO-GO

## Executive Result

Stoquify now has an HRIS-owned compatibility boundary for employee contracts and signed contract evidence. Contracts can no longer be created directly as `ACTIVE`, transitioned from draft to active through the legacy payroll update command, or given a signed document hash through legacy create/update inputs. Activation now requires an HRIS request and a different HRIS approver, approved signed-document evidence, tenant/employee ownership, and the existing active-contract overlap check.

Signed document evidence is hash-only. Evidence is staged with externally produced malware-scan proof, signing time, retention policy, retention basis, retention end date, and optional legal hold. The staged artifact hash is not copied to `PayrollContract.signedDocumentHash` until a different actor approves it. Raw document content, storage keys, URLs, and access tokens are neither accepted nor returned.

## Scope And Ownership

- HRIS owns contract approval and document-governance decisions.
- `PayrollContract` remains the compatibility storage model; no duplicate contract master was introduced.
- Payroll consumes only an active contract with approved signed evidence and activation proof.
- Business events and audit logs prove document request/approval and contract activation request/approval.
- Salary remains in the payroll compatibility model and is absent from HRIS contract responses.

## Files Inspected

- `services/payroll/contract.service.ts`
- `actions/payroll/payroll-contract.actions.ts`
- `services/security/redaction-policy.service.ts`
- `prisma/schema.prisma`
- Payroll contract service/action tests
- Governing HRIS proposal, implementation analysis, skill blueprint, and current-state register
- `graphify-out/ordered-code-graph.json` contract-service community 37 and redaction-policy community 13

## Files Changed

- `services/payroll/contract.service.ts`
- `services/payroll/__tests__/payroll-contract.service.test.ts`
- `services/hris/contract.service.ts`
- `services/hris/document-evidence.service.ts`
- `services/hris/__tests__/contract.service.test.ts`
- `services/hris/__tests__/document-evidence.service.test.ts`
- This report

## Implemented Controls

### Contract Activation

- Direct `ACTIVE` contract creation is rejected.
- Direct draft-to-active payroll updates are rejected.
- Activation requests require `hris.people.manage`, tenant/employee/contract ownership, approved document evidence, reason hash, and request evidence hash.
- Activation approval requires a different actor, `hris.people.manage`, approval evidence, decision-reason hash, and no overlapping active contract.
- Activation produces a business event, activation event link, metadata projection, and before/after audit evidence.
- Existing active contracts without the new HRIS proof are labelled `LEGACY_ACTIVE` and `LEGACY_REVIEW_REQUIRED`, not silently certified.

### Document Evidence

- Direct signed-hash writes through legacy contract create/update commands are rejected.
- Evidence request stores only hashes and governance metadata in `PayrollContract.metadata.hrisDocumentEvidence`.
- Pending evidence does not populate `signedDocumentHash` and cannot make a contract payroll-eligible.
- Evidence approval requires a different actor and publishes the artifact hash only inside the same transaction as approval event/audit evidence.
- Retention policy code, basis, end date, and legal-hold state are mandatory governance inputs; legal hold requires a hashed reason.
- No delete/purge path was added, so governed or legally held evidence cannot be removed through this slice.

### Access And Redaction

- Employee scope is resolved before contract or document lookup.
- HRIS contract responses omit `baseSalary`, `userId`, document hashes, and raw approval payloads.
- Returned scope data is reduced to authority summary and managed-location count; server-only employee ID sets are not returned.
- Redacted exports omit artifact, scan, approval, and decision hashes plus capturer/approver identities.
- `RAW_DOWNLOAD` always returns `allowed: false`, with `url`, `token`, and `objectKey` all `null`.

## Required Gate Results

| Gate | Result | Evidence |
| --- | --- | --- |
| Contract overlap | PASS | HRIS approval calls the existing tenant-scoped active-range overlap guard; overlap test passes |
| Signed evidence | PASS | Pending evidence does not publish the hash; independent approval does; direct hash writes are rejected |
| Document access denial | PASS | Raw access returns no delivery capability and emits a denial audit event |
| Export redaction | PASS | Export contains no evidence hashes, actor identities, salary, URL, token, or object key |
| Maker-checker | PASS | Requester/capturer cannot approve their own contract activation or document evidence |
| Tenant/employee scope | PASS | Contract lookup includes organization, employee, contract, and non-deleted predicates after scope resolution |
| Type safety | PASS | `npm run typecheck` |
| Focused lint | PASS | ESLint on six changed implementation/test files |
| Focused tests | PASS | 3 suites, 22 tests |
| Scoped diff check | PASS | No whitespace errors; Git reports only normal CRLF-to-LF normalization warning |

## Deliberate No-Go Boundary

Raw document delivery is not production-ready and was not exposed. The codebase still lacks a certified HR document object store, encryption/key policy, upload quarantine, platform-executed malware scanner, short-lived signed access grants, download-time legal-hold/retention enforcement, and access revocation proof.

The request workflow records externally produced malware-scan evidence; it does not itself scan a file. Retention policy code and basis are supplied by the authorized HR process; a jurisdiction-aware policy resolver and legal signoff remain future requirements.

## Residual Risks And Follow-Up

- The new HRIS commands are service-level foundations. Dedicated protected HRIS server actions, approval-inbox UI, notifications, and fresh-auth UX are not wired in this slice.
- Existing payroll UI attempts to create active contracts or write a signed hash will now fail closed with a business-rule error; the UI must be moved to draft, evidence request, evidence approval, activation request, and activation approval commands.
- Existing active contracts are retained as legacy evidence and require migration/certification; they are not rewritten.
- JSON metadata is an explicit compatibility projection. A future schema should introduce first-class document evidence, retention, legal hold, access grant, and approval records with tenant-consistent foreign keys and immutable history.
- Browser, accessibility, upload, provider, and object-storage tests were not applicable because no raw document UI or delivery integration was introduced.

## Commit Readiness

The focused backend slice is ready to land with its new HRIS files and tests. Stage only the named files: this repository contains a large unrelated dirty worktree. Product release remains blocked on action/UI wiring and the raw-document no-go controls above.

## Next Handoff

Run `stoquify-hris-08-compensation-benefits-control` next. It should preserve this contract proof boundary, prevent direct employee salary mutation, require maker-checker compensation evidence, and keep country-pack/statutory parameter truth separate from employee compensation decisions.
