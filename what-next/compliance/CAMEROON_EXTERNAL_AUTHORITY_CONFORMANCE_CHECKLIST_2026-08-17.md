# Cameroon external-authority conformance checklist — 2026-08-17

Scope: DGI/CNPS and any legally effective Cameroon authority channel.  
Current decision: **BLOCKED_EXTERNAL_CONFIGURATION**  
Production-authority certified: **false**

| ID | Requirement | Current status | Required evidence and pass condition | Owner / segregation |
|---|---|---|---|---|
| CM-AUTH-01 | Official authority technical contract | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Dated official specification, endpoint ownership, schema/version, source URL/file and SHA-256; qualified reviewer confirms applicability | Compliance/legal; checker independent of implementer |
| CM-AUTH-02 | Production endpoint and environment separation | `BLOCKED_EXTERNAL_CONFIGURATION` | Authority-confirmed sandbox/UAT/production endpoints; adapter rejects cross-environment use | Integration owner; security approves configuration |
| CM-AUTH-03 | Credential provisioning and vault reference | `BLOCKED_EXTERNAL_CONFIGURATION` | Regulator-confirmed process, least-privilege managed secret reference, owner, expiry and rotation/revocation exercise; no secret in evidence | Security owns secret; operator cannot approve own access |
| CM-AUTH-04 | Request payload conformance | `NOT_TESTED` | Redacted canonical payload samples covering sale, refund/credit, cancellation/correction and edge rounding; authority sandbox accepts exact schema | Compliance maps; engineering implements; checker verifies |
| CM-AUTH-05 | Response and error taxonomy | `NOT_TESTED` | Accepted, rejected, duplicate, pending/unknown, outage, rate-limit and malformed-response fixtures mapped to fail-closed states | Integration owner; compliance accepts legal semantics |
| CM-AUTH-06 | Signature and transport trust | `NOT_TESTED` | TLS/certificate validation, request signing if required, callback signature verification, timestamp tolerance and replay rejection | Security reviewer independent of adapter author |
| CM-AUTH-07 | Idempotency and duplicate submission | `PASS_WITH_LIMITATIONS` | Local idempotency controls exist; external sandbox must prove same payload/key returns one authority result without duplicate legal effect | Engineering + authority sandbox operator |
| CM-AUTH-08 | Fiscal numbering and artifact contract | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Qualified decision on number allocation, gaps, offline rules, artifact format, authenticity and retention; sandbox artifact verified | Qualified fiscal reviewer + checker |
| CM-AUTH-09 | Immutable source and delivery separation | `PASS_WITH_LIMITATIONS` | Local outbox/evidence model exists; production must prove completed accounting sale remains visible if authority/receipt delivery fails | POS/compliance owners; controller verifies source links |
| CM-AUTH-10 | Rejection/correction/credit lifecycle | `NOT_TESTED` | Legally correct non-destructive correction, credit-note and resubmission cases with original history retained | Qualified reviewer + controller |
| CM-AUTH-11 | Offline and delayed submission | `NOT_TESTED` | Authority-approved offline policy, provisional numbering boundary, ordered signed replay, conflict resolution and expiry | Country-pack owner; device operator separate from approver |
| CM-AUTH-12 | Evidence retention and redaction | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Retention period, legal hold, audit export, PII minimization and secret/PAN exclusion approved and tested | DPO/compliance + security checker |
| CM-AUTH-13 | External sandbox conformance run | `NOT_TESTED` | Timestamped run ID, endpoint class, request/response hashes, redacted logs and authority result for all mandatory scenarios | Integration operator; independent release checker |
| CM-AUTH-14 | Production pilot and kill switch | `BLOCKED_EXTERNAL_CONFIGURATION` | Named tenant/location, bounded window, monitoring, rollback/disable runbook, incident owner and signed go/no-go | Product maker; security/controller/compliance checkers |
| CM-AUTH-15 | Production certification statement | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Authority or qualified reviewer states precisely what is certified, limitations and expiry; hash-bound to release | External authority/reviewer; Stoquify cannot self-certify |

## Current local pilot evidence

The Cameroon adapter pilot gate passes 16/16 for a sandbox-shaped, fail-closed implementation. It explicitly reports these production blockers: `official_dgi_technical_contract_not_validated`, `independent_expert_production_review_not_attached`, `regulator_production_credentials_not_provisioned`, and `external_sandbox_conformance_not_executed`.

The local `ACCEPT`, `REJECT`, `OUTAGE` and `RATE_LIMITED` fixtures are engineering tests. They are not evidence that DGI implements those contracts.

## Exit rule

This checklist passes only when every applicable row is `PASS`, every non-applicable row has a qualified scope decision, the evidence is bound to a clean candidate and exact country-pack hash, credentials remain redacted, and independent approvers sign after the final evidence timestamp. Until then, production authority submission and statutory receipt claims must stay disabled.
