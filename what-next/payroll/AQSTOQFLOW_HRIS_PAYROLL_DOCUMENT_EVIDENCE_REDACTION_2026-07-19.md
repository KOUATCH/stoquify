# AqStoqFlow HRIS–Payroll Document Evidence And Redaction

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-07-document-evidence-redaction`  
Decision: **IMPLEMENTED — document evidence is tenant-scoped, role-redacted, audited, and safe for readiness/proof surfaces; raw delivery remains disabled**

## Scope

Verify and harden the bounded HRIS document-evidence chain after compensation controls: contract evidence capture and approval, malware-scan proof, retention and legal hold, tenant/employee scope, raw-access denial, employee/self-service redaction, payroll-readiness proof, payment/attendance readiness, payslip evidence, audit purpose, and safe proof consumption. Raw storage-provider behavior and unrelated HRIS/payroll functionality were not changed.

## Prerequisite result

Employee identity and the HRIS permission model are present and covered by focused negative tests. Skills 05 and 06 passed: approved contract/document proof gates compensation activation, and Payroll consumes approved, effective, traceable compensation source records only.

The governing blueprints continue to require HRIS ownership, certified Payroll consumption, tenant isolation, role-based redaction, sensitive-read auditing, and fail-closed behavior when evidence is absent or stale.

## Files inspected

- `services/hris/document-evidence.service.ts`
- `services/hris/contract.service.ts`
- `services/hris/employee.service.ts`
- `services/hris/self-service.service.ts`
- `services/hris/manager-self-service.service.ts`
- `services/hris/payment-destination.service.ts`
- `services/hris/payroll-readiness-contract.ts`
- `services/hris/approval-inbox.service.ts`
- `services/payroll/employee.service.ts`
- `services/payroll/payment-evidence.service.ts`
- `services/payroll/payslip-self-service.service.ts`
- `services/security/redaction-policy.service.ts`
- `services/evidence/evidence-redaction.service.ts`
- `services/evidence/proof-trail.service.ts`
- Relevant HRIS, Payroll, redaction, readiness, payslip, payment-evidence, and workbench tests
- HRIS/payroll blueprints, current status register, prior document-evidence report, and the 2026-07-15 contract/document implementation report

No current top-level HRIS document/action knowledge-graph artifact was available in `graphify-out`; conclusions were grounded directly in current source and focused tests.

## Baseline controls verified

- HRIS owns contract-document governance; `PayrollContract` remains compatibility storage rather than a duplicate document master.
- Evidence capture accepts hashes and governance metadata only. It does not accept or persist raw bytes, storage keys, URLs, or access tokens.
- Pending evidence requires externally produced malware-scan proof, signing time, retention policy code and basis, retention end date, and optional legal hold with a hashed reason.
- Pending evidence does not populate the payroll-eligible signed-document hash.
- A different actor must approve the evidence before its artifact hash becomes the contract's governed signed-document proof.
- Direct legacy create/update attempts to write signed evidence are rejected by the contract service.
- Contract activation and Payroll readiness require the approved document record to match the signed-document hash and contain scan, approval, and event proof.
- Employee scope resolves before document lookup; lookup predicates include organization, employee, contract, and non-deleted state.
- Raw document access always fails closed with no URL, token, object key, or artifact hash.
- Redacted exports omit artifact, scan, approval, and decision hashes plus capturer/approver identities.
- Employee and manager self-service omit document hashes and raw documents.
- Payslip self-service and internal payroll-release verification remain tenant/employee scoped and retain their existing evidence contracts.

## Gap found and corrected

The general payment/attendance readiness read model assembled contract, salary-change, and payment evidence hashes and returned them directly to any caller with payment-destination read or command/readiness authority. That contradicted the shared `payroll_document_evidence` policy, which treats these hashes as sensitive evidence pointers requiring a document-owning role.

This tranche now:

- Evaluates the shared document-evidence redaction policy inside `getPaymentEvidenceReadiness`.
- Replaces contract, salary-change, payment, and latest-change evidence hashes with `[REDACTED:HR_DOCUMENT]` for ordinary read-only roles.
- Preserves reference counts, evidence-presence flags, statuses, masked destinations, and blockers so operational readiness remains usable.
- Allows the actual hashes only when the caller also has a document-owning Payroll permission recognized by the shared policy.
- Includes the redaction decision in the returned policy summary and the sensitive-read audit record.
- Leaves internal payroll-release evidence verification unchanged; release logic still compares the real tenant/employee-scoped hashes server-side.

Focused document-service tests were also strengthened to prove missing-permission denial before scope/database access, tenant/employee/contract lookup predicates, and explicit redacted-export audit purpose.

## Data ownership decision

- HRIS owns employee and contract document evidence, approval, retention, legal-hold decisions, and readiness meaning.
- Payroll consumes approved evidence state and server-side proof hashes; it does not become the document source of truth.
- Readiness and proof-pack workbenches expose status, counts, and redacted pointers unless the actor has document-owning authority.
- Accounting and Assurance may consume certified proof references through their own controlled contracts; they do not receive raw HR documents from this slice.
- Raw object storage remains deliberately unimplemented rather than simulated.

## Tenant and RBAC decision

- Document reads and mutations require HRIS people read/manage authority and resolve effective employee scope before lookup.
- Contract-document lookup is constrained by `organizationId`, `employeeId`, `contractId`, and `deletedAt: null`.
- Missing permission fails before scope resolution, database lookup, or audit of a nonexistent access decision.
- Cross-employee manager denial fails before document lookup.
- Payroll payment-readiness actions retain tenant-derived organization context and their existing module/permission gates.
- Document evidence hashes are visible only when a caller has both the readiness surface authority and a document-owning permission recognized by the shared policy.
- No public, unauthenticated, cross-tenant, binary download, or signed-URL route was found.

## Audit and redaction decision

- Evidence request/approval records business events and audit logs without raw document content.
- Raw-access denial records a dedicated audit action and returns no delivery capability.
- Metadata reads and redacted exports record explicit purpose, allow/deny decision, governance status, authority kind, and confirmation that raw documents were excluded.
- Payment-readiness audits now record document-evidence redaction policy, mode, reason, and allow/deny result.
- Redaction is applied in services before UI rendering; React components do not decide whether sensitive hashes are visible.
- Read-only employee, manager, payment, attendance, command, and self-service surfaces remain hash-redacted.

## Gates run

```text
PASS: 12 focused Jest suites
PASS: 70 focused tests
PASS: unauthorized document denial before scope/database access
PASS: cross-employee denial before document lookup
PASS: tenant/employee/contract lookup predicates
PASS: document maker-checker and evidence publication boundary
PASS: retention, legal hold, and malware-scan evidence metadata
PASS: raw download denial without URL/token/key/hash
PASS: redacted export without hashes or actor identities
PASS: explicit audit-purpose and policy-decision records
PASS: employee, manager, and self-service document redaction
PASS: read-only payment/readiness evidence-pointer redaction
PASS: document-owner role visibility
PASS: Payroll readiness, payslip, and payment-release proof continuity
PASS: focused ESLint
PASS: skill-package validation
```

## Baseline-gap delta

- Payment/readiness evidence pointers: `raw hashes for ordinary read roles -> service-redacted pointers unless document-owning authority is present`.
- Latest payment-change evidence: `raw request hash in workbench model -> policy-controlled redacted value`.
- Readiness audit: `surface permissions recorded only -> document-evidence policy decision and reason also recorded`.
- Unauthorized-access coverage: `scope denial present -> missing-permission denial explicitly proven before scope, lookup, and audit`.
- Export audit coverage: `redacted payload proven -> tenant/employee lookup and explicit REDACTED_EXPORT audit purpose also proven`.
- Payroll-release verification: `server-side real-hash comparison -> unchanged`.

## Skipped checks

- No schema migration, seed, backfill, provider, storage, upload, download, or production tenant mutation was required.
- No browser run was required because the output contract retains the same string arrays and the changed service returns safe replacements before rendering; focused workbench component tests passed.
- Full-project TypeScript checking was not rerun because the established repository baseline exhausts available V8 heap; focused Jest compilation and ESLint passed.
- Statutory retention duration was not invented or changed.

## Current blockers and residual risk

- Raw HR document delivery remains a deliberate no-go. There is no certified object store, encryption/key policy, upload quarantine, platform-executed malware scanning, short-lived access grant, revocation proof, or download-time retention/legal-hold enforcement.
- Malware-scan evidence is supplied by an authorized process; this service does not execute the scanner.
- Retention policy codes and dates are captured but are not yet resolved by a jurisdiction-aware, legally approved retention engine.
- Document governance is still projected into compatibility JSON metadata. First-class tenant-consistent document, retention, legal-hold, access-grant, and immutable approval records remain future schema work.
- Existing legacy signed hashes without complete governance metadata remain intentionally ungoverned/blocked and require reviewed certification or backfill.
- Dedicated HRIS document request/read actions and UI remain incomplete; the absence of a route is safe, but not a production document-center implementation.

## Next handoff

Skill 07's stop condition is closed for the implemented surfaces: no public, cross-employee, or cross-tenant path returns sensitive HR documents, and ordinary readiness roles no longer receive raw document evidence pointers. Hand off to `aqstoqflow-hris-payroll-08-time-leave-attendance` for the next bounded tranche.
