# Stoquify unresolved evidence and approval register — 2026-08-17

Every record below is an active production blocker unless its scope explicitly says development-only.

| ID | Status | Owner | Precise missing proof | Acceptance test | Next executable action |
|---|---|---|---|---|---|
| U-01 | `BLOCKED_TECHNICAL` | Release owner | Clean immutable candidate; current tree is dirty and prior G0 is a different 67-migration candidate | All candidate/evidence hashes stable and reproducible | Finish/review current slices, cut clean candidate, rerun baseline |
| U-02 | `BLOCKED_TECHNICAL` | Migration maker/checker | 13 destructive findings, 0 approvals, stale bindings/schema manifest | Evidence and migration safety gates both pass | Complete target census, recovery bundle, freeze, signatures and 13 entries |
| U-03 | `BLOCKED_EXTERNAL_CONFIGURATION` | DBA/SRE | Approved production target and direct migration history | Read-only target attestation/history match release manifest | Provision named target; run non-secret preflight/history health |
| U-04 | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Security + checker | Signed operator/checker fresh-auth evidence | Immutable MFA/SSO record binds actors, candidate, decision and timestamps | Capture post-freeze authentication and independent signatures |
| U-05 | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Compliance/legal | Qualified Cameroon reviewer identity, capacity, conflict and decision | Review preflight 12/12 | Commission reviewer and transmit unchanged hash-pinned packet |
| U-06 | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Qualified reviewer + checker | Four CNPS fixture decisions, tie-outs, effective dates and signed artifact | Country-pack production gate 12/12 | Return decision/tie-outs; checker verifies; ingest without changing conclusions |
| U-07 | `BLOCKED_EXTERNAL_CONFIGURATION` | Compliance integration | Official DGI contract, endpoint, credentials and sandbox conformance | CM-AUTH-01–15 all pass/applicable decisions signed | Execute external-authority conformance checklist |
| U-08 | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Fiscal reviewer/controller | Statutory receipt, numbering, correction, offline and retention semantics | Qualified decision plus authority artifact cases pass | Complete receipt/fiscal country-pack review; keep development receipt non-statutory |
| U-09 | `NOT_TESTED` | Hardware operations | Physical printer, drawer kick, scanner, display, payment terminal and offline device evidence | Model/firmware/OS cases pass, including failure/recovery | Procure/name devices and execute hardware matrix |
| U-10 | `BLOCKED_EXTERNAL_CONFIGURATION` | Treasury/reconciliation | Provider contract, vault reference, statements, settlement receipts and conformance | Mandatory provider scenarios and exact three-leg tie-out pass | Select one XAF mobile-money sandbox and run credentialless packet |
| U-11 | `BLOCKED_EXTERNAL_CONFIGURATION` | Payroll/compliance | Live provider/authority proof and legally effective declaration mappings | Payment/declaration callbacks, settlement, acceptance/rejection and amendments reconcile | After U-05–U-10, rerun payroll Skills 13–14 |
| U-12 | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | HR/privacy/security | Production employee identity, retention, manager scope and policy validation | Tenant/role/privacy negative matrix passes on production-shaped data | Run current non-mutating production-shaped HRIS validation |
| U-13 | `BLOCKED_EXTERNAL_CONFIGURATION` | Tenant owner + migration checker | Current tenant dry-run, stable rerun, correction-only rollback and signoff | Hash-stable diff, exact reconciliation and signed acceptance | Execute Skill 17 against approved snapshot after upstream gates |
| U-14 | `NOT_TESTED` | Accessibility/IAM | Current-candidate EN/FR supported-browser, keyboard, screen-reader and production IdP evidence | All positive/negative journeys pass with no critical accessibility/privacy finding | Run authenticated browser/accessibility release matrix |
| U-15 | `BLOCKED_EXTERNAL_CONFIGURATION` | SRE/security | Managed secrets, rotation/revocation, TLS and deployment binding | Release secret preflight and direct target checks pass without secret output | Provision managed references and execute rotation/revocation |
| U-16 | `BLOCKED_EXTERNAL_CONFIGURATION` | SRE/service owners | Three operational windows, alert acknowledgement, dead-letter/recovery, DR/capacity evidence | SLO/alert/recovery/restore and reconciliation objectives met | Assign owners; run monitored windows and failure exercises |
| U-17 | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Product/security/controller/SRE | Artifact-bound governance approvals and six accepted owner assignments | Approvals bind exact candidate/evidence hashes and satisfy SoD | Complete ownership register after technical/external gates |
| U-18 | `BLOCKED_TECHNICAL` | Release board | Phase 2B 2/23 and Phase 3 0/34 | B01–B10 pass, bounded pilot exits clean, Phase 3 signed GO | Enter Phase 2B only after Gate 017 GO; then run pilot |
| U-19 | `NOT_TESTED` | Quality engineering | Current focused Jest suites did not complete in bounded run | Targeted tests finish with recorded suites/tests/exit code | Isolate Jest roots/configuration and rerun on clean candidate |
| U-20 | `BLOCKED_EXTERNAL_CONFIGURATION` | Compliance/document owner | `docs/Compliance/Complaince authorization validation.docx` was exclusively locked and not inspectable | File closed; content/hash/signature/candidate/scope/checker verified | Close the document and submit it to the controlled evidence-intake check |

## No-waiver rules

- A typed name, role, timestamp or `YES` does not replace a signature or immutable authenticated approval record.
- Development/sandbox gates cannot waive production target, provider, authority, hardware, statutory or operations evidence.
- Human review cannot waive tenant isolation, RBAC, ledger balance, immutability, idempotency, recovery or exact-hash migration controls.
- Missing evidence remains blocked; it is never converted to pass by elapsed time or administrative urgency.
