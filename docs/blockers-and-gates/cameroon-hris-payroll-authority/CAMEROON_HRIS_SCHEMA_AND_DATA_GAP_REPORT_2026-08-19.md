# Cameroon HRIS schema and data gap report

Prepared 2026-08-19  
Classification: **VERIFIED REPOSITORY ASSESSMENT**

## Outcome

The HRIS schema and its migration are present. The blocking condition is missing or unverified runtime data and missing governance control-role evidence.

| Question | Finding | Evidence |
| --- | --- | --- |
| Are the core HRIS tables absent? | No | `prisma/schema.prisma` and migration `20260719190000_hris_org_manager_scope_foundation` |
| Do employment assignments exist in the controlled lookup? | No — 0 records | docs/blockers-and-gates/COMPLIANCE_AUTHORIZATION_G1_PREFILL_STATUS_2026-08-19.json |
| Do manager delegations exist? | No — 0 records | docs/blockers-and-gates/COMPLIANCE_AUTHORIZATION_G1_PREFILL_STATUS_2026-08-19.json |
| Do the 17 candidate names exactly match verified users/employees? | No — 0 exact matches | docs/blockers-and-gates/COMPLIANCE_AUTHORIZATION_G1_PREFILL_STATUS_2026-08-19.json |
| Does the asserted tenant match? | No — 0 tenant matches | docs/blockers-and-gates/COMPLIANCE_AUTHORIZATION_G1_PREFILL_STATUS_2026-08-19.json |
| Can candidate names be imported as authorities? | No | All 17 remain CANDIDATE_NOT_VERIFIED |

## Controlled data snapshot

| Record type | Count |
| --- | --- |
| Organizations | 2 |
| Users | 28 |
| Payroll employees | 24 |
| Employment assignments | 0 |
| Manager delegations | 0 |
| Candidate names queried | 17 |
| Exact identity matches | 0 |

The snapshot was recorded by the existing prefill assessment as a read-only transaction and rolled back after retrieval. This run did not mutate or reseed the configured database.

## Existing reusable capabilities

- `User.id` is the application subject key; `User.organizationId` provides direct tenant ownership.
- Sessions persist assurance time, method, organization and level.
- `requireFreshAuth()` rejects future, stale, cross-tenant or insufficient assurance.
- Password step-up has session CAS-style updates, lockout and security-event logging.
- `PayrollEmployee` has tenant uniqueness, employment status/dates, masked identifier fields and identifier hashes.
- HRIS units, positions and employment assignments are effective-dated and tenant-scoped.
- Reporting relationships and manager delegations require evidence/reason hashes, forbid self-relations/delegations and model revocation/supersession.
- HRIS scope resolution enforces tenant, permission, effective-date and delegated-scope checks and emits audit records.
- `BusinessEvent` provides tenant/idempotency/payload-hash foundations; `AuditLog` provides actor, organization and change history.

## Material gaps before G1 authority can rely on them

1. **Subject-to-employee binding is not evidence-grade.** `PayrollEmployee.userId` is optional and unique per tenant but is not modeled as a database foreign-key relation to `User`.
2. **No control-role catalog or appointment model exists.** Job titles, RBAC roles and manager delegations cannot safely represent the 17 canonical G1 roles.
3. **Manager delegation is too generic.** `APPROVAL_DECISION` does not identify the G1 role, decision IDs, contract/policy version or capability exclusions.
4. **No employment/identity evidence registry exists.** Contract, CNPS, identity, issuer, path, hash, verification and expiry are not first-class records.
5. **No first-class SoD/COI assessment exists.** Distinct names are not proof of independence or conflict clearance.
6. **No qualification registry exists** for the Cameroon country-pack reviewer or qualified accounting reviewer.
7. **Current step-up assurance is password level only.** MFA requirements for G1 remain a governance/security decision.
8. **Audit evidence is not sufficient by itself.** `AuditLog` is useful history but has no visible hash chain or independent-verification boundary.
9. **The G1 validator is necessary but presence-oriented.** It validates required fields, roles, contract-register binding and the ten-minute window, but a separate verifier must resolve authority and evidence artifacts and recompute hashes.
10. **No authority-drift invalidation engine exists** connecting HR termination, appointment revocation, policy changes and artifact changes to approval eligibility.

## Architecture graph evidence

`graphify-out/GRAPH_REPORT_actions.md` identifies HRIS payment-destination workflow Community 16 and payroll action/test communities 47-55. The payroll communities consistently expose RBAC and fresh-authentication test dependencies, supporting reuse of those controls. The graph also flags `MockFreshAuthRequiredError` as weakly connected, so graph inference is not treated as proof of runtime enforcement; source-code verification remains required.

## Verified artifact fingerprints

| Path | SHA-256 | Bytes |
| --- | --- | --- |
| docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json | 11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db | 18732 |
| docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json | 49e19d9ed6c83df23010264ffff4bb92dbe63ba4c2e7a8e3acdc42c0e4fe8340 | 3235 |
| docs/blockers-and-gates/G1_33_OBLIGATION_FINALIZATION_REGISTER_2026-08-19.json | d6038910cbe77ee79e5052ff801b142454e0c678e00a5a6abe8ee96b7d18c6b4 | 105924 |
| docs/blockers-and-gates/COMPLIANCE_AUTHORIZATION_G1_PREFILL_STATUS_2026-08-19.json | cb8d97d342cf128d631c40a8f2e0648c768392318d708fce0d804e2bf335a605 | 86491 |
| docs/blockers-and-gates/COMPLIANCE_AUTHORIZATION_G1_UNRESOLVED_FIELDS_2026-08-19.json | 488ce0ebaaf5657b3524c1823950389832a15348a270ad2f83b9f4a36ca88f28 | 12568 |
| docs/Compliance/Complaince authorization validation.docx | d0c77c8d729f8fa4f44e4a13f316202a0e7d6c429d2fd2454a36ba0bd79b18fc | 465953 |
| docs/blockers-and-gates/COMPLIANCE_AUTHORIZATION_VALIDATION_G1_COMPLETION_FORM_2026-08-19.docx | 34356ac2c77db34300f13b60d6538dad25bec0439641bbcd693c97e799b2981f | 526293 |
| prisma/schema.prisma | d088d67f849b7641af6bd32e46bcac7a1536a6a1e503a113ef2de941b2348a09 | 293381 |
| prisma/migrations/20260719190000_hris_org_manager_scope_foundation/migration.sql | cef33045a530b51f10bd86cc42c08c1951ce2ad1eeaa096562c6b9d83ee36f0f | 14854 |
| services/hris/org.service.ts | c6c85df30ceeadaefd48c25fbb0c7ef367e74ddba04bb96aa35dcfb37c7a923e | 13371 |
| lib/security/auth-session.ts | d72bbbd03dda9045a973a0a0a9ba7d60309d8b4626d56325cd07959c32adeaae | 5252 |
| services/security/step-up-auth.service.ts | f2e3770b7b01982f9a17e5ee8328d56f3d07e44ab7bd68e23e34c4fbb6e2bed8 | 6626 |
| scripts/pos-g1-contract-gate.js | 855f50521a8e803b82af3be1ccf9b984c43739f6e8be03daff3bda1164bc4d57 | 15221 |
| graphify-out/GRAPH_REPORT_actions.md | c76ce8bd9fc93f7bd5b9bb5c75ca56b2be049d0dce8c9e645aa89e5c0ec3d074 | 27619 |

## Disposition

- Do not add replacement HRIS tables.
- Populate verified employee/assignment records through a controlled onboarding workflow.
- Add a narrow, separate authority-evidence layer rather than overloading employment, job-title or RBAC data.
- Do not populate the live G1 register until independent authority and approval evidence exists.
