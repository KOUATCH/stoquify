# Cameroon HRIS authority implementation backlog

Prepared 2026-08-19  
Status: **PROPOSED — NO IMPLEMENTATION OR MIGRATION PERFORMED**

## Delivery principle

Keep the first implementation narrow and G1-focused. Each phase is additive, testable and reversible. No phase may create human approvals automatically.

| ID | Phase | Work item | Owner | Acceptance evidence |
| --- | --- | --- | --- | --- |
| P0-01 | Phase 0 | Confirm Stoquify legal employer, tenant and evidence owner | Governance/legal | Signed decision record; no guessed entity |
| P0-02 | Phase 0 | Qualified review of Labour Code, implementing orders, CNPS and DGI 2026 applicability | Cameroon counsel/payroll specialist | Reviewed source register with dated conclusions |
| P0-03 | Phase 0 | Approve 17 canonical role codes, scope and 33-obligation matrix | Governance/product/controls | Versioned role catalog and policy hash |
| P0-04 | Phase 0 | Approve SoD/COI, qualification, delegation, retention and MFA policies | Security/controls/legal | No unresolved policy required by eligibility |
| P1-01 | Phase 1 | Implement read-only evidence intake and independent verification records | HRIS/backend | No authority from unverified evidence; tenant tests pass |
| P1-02 | Phase 1 | Implement verified User↔PayrollEmployee identity link | IAM/HRIS | Stable ID, tenant and evidence checks; display-name matching rejected |
| P1-03 | Phase 1 | Populate verified positions and employment assignments for real staff | HR owner | Effective-dated records; 17 candidate rows resolved or rejected |
| P1-04 | Phase 1 | Add privacy/redaction and evidence access controls | Security/privacy | No raw ID/CNPS/session secrets in logs/reports |
| P2-01 | Phase 2 | Add versioned control-role catalog and assignments | Controls/backend | Role separate from job/RBAC; appointment evidence required |
| P2-02 | Phase 2 | Add bounded delegations with mandatory expiry and invalidation | Controls/backend | No self-delegation; role/decision/scope explicit |
| P2-03 | Phase 2 | Implement SoD/COI and qualification assessment | Controls/compliance | Producer/checker and role-pair policies fail closed |
| P2-04 | Phase 2 | Build current eligibility read model | Backend | Employment, authority, dates, policy and conflicts jointly enforced |
| P3-01 | Phase 3 | Create G1 approval envelope and attestations | Backend/security | Exact contract/option/role, fresh auth and deliberate intent |
| P3-02 | Phase 3 | Implement independent final evidence verification | Assurance/backend | Artifact resolves and rehashes; verifier separated |
| P3-03 | Phase 3 | Implement drift invalidation and dependency graph | Backend/SRE | Contract/authority/policy/evidence change invalidates affected approvals |
| P3-04 | Phase 3 | Build detached register export with human-controlled import | Backend/governance | No silent live-register write; minimal patch reviewable |
| P3-05 | Phase 3 | Run narrow G1 tests and validator only when eligible | QA/governance | 11/11 actual validator result required |
| P4-01 | Phase 4 | Add provider-neutral e-signature adapter if required | Integration/security/legal | Provider audit trail maps to internal envelope |
| P4-02 | Phase 4 | Assess supported CNPS/DGI adapters | Integration/compliance | No scraping or credential reuse; manual fallback preserved |

## Phase gates

- **Phase 0 exit:** legal/governance decisions are signed and source-provenanced.
- **Phase 1 exit:** identities and employment records are verified; no G1 authority yet.
- **Phase 2 exit:** all 17 roles have verified assignments or explicit unresolved status; SoD/COI/qualification results exist.
- **Phase 3 exit:** all 33 approvals are deliberate, fresh-authenticated, artifact-bound and independently verified; the actual validator reports 11/11.
- **Phase 4 entry:** only after a documented need for external integration and security/legal review.

## Rollback

- Disable the module feature flag and return eligibility as blocked.
- Preserve append-only evidence, invalidation and audit history.
- Do not delete employment or authority history.
- Keep the manual templates/process available.
- Never roll back by accepting stale or weaker evidence.

## Required test families

- Tenant-crossing and identity mismatch.
- Display-name collision and renamed user.
- Employment termination/suspension/assignment expiry.
- Appointment/delegation expiry, revocation and supersession.
- Maker/checker, producer/verifier and role-pair conflicts.
- Qualification expiry.
- Contract, policy, authority and evidence hash drift.
- Future/stale/cross-tenant authentication and >10-minute approval.
- Evidence path substitution and failed rehash.
- Duplicate/replayed provider or approval events.
