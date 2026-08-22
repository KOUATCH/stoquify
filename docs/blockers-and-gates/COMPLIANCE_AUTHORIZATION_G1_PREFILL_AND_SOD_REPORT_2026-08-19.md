# G1 compliance authorization candidate prefill and SoD report

**Date:** 2026-08-19  
**Classification:** Candidate working copy — not approval evidence  
**Page-6 source SHA-256:** `34356ac2c77db34300f13b60d6538dad25bec0439641bbcd693c97e799b2981f`  
**Frozen contract SHA-256:** `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db`

## Outcome

The 17 page-6 names were mapped by exact canonical role across all 33 G1 obligations. The existing page-7 matrix contained only 6 correct name/role repetitions; **27 of 33 rows were corrected** in the separate working copy.

No page-6 person could be independently matched to an authoritative identity or HR employee record in the configured database. The asserted tenant was not found. The HRIS contains zero employment assignments and zero manager delegations. Therefore:

- verified stable subject IDs: **0/17**;
- verified role appointments: **0/17**;
- formal SoD/COI results: **0/17**;
- verified obligations: **0/33**;
- complete decisions: **0/11**.

Every unsupported field is marked `UNRESOLVED — GOVERNANCE EVIDENCE REQUIRED`. The live approval register was not modified.

## Authoritative lookup evidence

| Check | Result |
|---|---|
| Database transaction | Read only; rolled back after retrieval |
| Data-source fingerprint | `6074d3e925d251ad387403661d2a7b863a3894c0c660c03b7dec749dfdcd68bc` |
| Available records | 2 organizations; 28 users; 24 employees |
| Exact matches for page-6 names | 0 users; 0 employees |
| Page-6 tenant matches | 0 |
| HR employment assignments | 0 |
| HR manager delegations | 0 |

Ordinary application RBAC was not accepted as governance authority. Repository reports identify separate unresolved migration identity-role conflicts for `Tamen Marceline` and `Yonga Springfield`; those reports do not validate either person for a G1 role.

## Role status

| Canonical role | Obligations | Page-6 candidate name | Stable IDs verified | Appointments verified | SoD/COI |
|---|---:|---|---:|---:|---|
| Product owner | 4 | Arielle Yongwa | 0 | 0 | No formal result |
| Financial controller | 5 | Tchami Jennifer | 0 | 0 | No formal result |
| Payments owner | 2 | Yonga Junie | 0 | 0 | No formal result |
| Retail operations owner | 5 | Tamen Max | 0 | 0 | No formal result |
| POS architect | 1 | tchakoumiLorrain | 0 | 0 | No formal result |
| Security owner | 2 | Yonga Springfield | 0 | 0 | External conflict also unresolved |
| Treasury owner | 2 | Tamen Stanick | 0 | 0 | No formal result |
| Risk owner | 2 | Tamen Martial | 0 | 0 | No formal result |
| QA owner | 1 | Sonkeng Steve | 0 | 0 | No formal result |
| Support owner | 2 | Etoo Naomie | 0 | 0 | No formal result |
| Qualified Cameroon country-pack reviewer | 1 | Kouatchoua mMark | 0 | 0 | No formal result |
| SRE owner | 1 | Ronald Djakou | 0 | 0 | No formal result |
| Order-to-cash product owner | 1 | Tamen Marceline | 0 | 0 | External conflict also unresolved |
| Qualified accounting reviewer | 1 | Tchana Nikita | 0 | 0 | No formal result |
| Inventory controller | 1 | Tchana Rose | 0 | 0 | No formal result |
| Fulfillment owner | 1 | Yonga Lysette | 0 | 0 | No formal result |
| Accounting owner | 1 | Yongwa Eli | 0 | 0 | No formal result |

Names are reproduced exactly as entered, including `tchakoumiLorrain` and `Kouatchoua mMark`. Their spelling and casing were not silently corrected.

## Maker/checker and signer/verifier screen

| Decision | Candidate signers from page 6 | Name-level screen | Stable-ID screen | Independent checker | Result |
|---|---|---|---|---|---|
| D-01 | Arielle Yongwa; Tchami Jennifer; Yonga Junie | Distinct names only | Unresolved | Unassigned | Blocked |
| D-02 | Tamen Max; tchakoumiLorrain; Yonga Springfield | Distinct names only | Unresolved | Unassigned | Blocked |
| D-03 | Yonga Junie; Tamen Stanick; Yonga Springfield | Distinct names only | Unresolved | Unassigned | Blocked |
| D-04 | Arielle Yongwa; Tamen Martial; Tamen Max | Distinct names only | Unresolved | Unassigned | Blocked |
| D-05 | Tamen Max; Sonkeng Steve; Etoo Naomie | Distinct names only | Unresolved | Unassigned | Blocked |
| D-06 | Tchami Jennifer; Tamen Max; Tamen Martial | Distinct names only | Unresolved | Unassigned | Blocked |
| D-07 | Arielle Yongwa; Tchami Jennifer; Kouatchoua mMark | Distinct names only | Unresolved | Unassigned | Blocked |
| D-08 | Ronald Djakou; Arielle Yongwa; Etoo Naomie | Distinct names only | Unresolved | Unassigned | Blocked |
| D-09 | Tchami Jennifer; Tamen Marceline; Tchana Nikita | Distinct names only | Unresolved | Unassigned | Blocked |
| D-10 | Tchana Rose; Yonga Lysette; Yongwa Eli | Distinct names only | Unresolved | Unassigned | Blocked |
| D-11 | Tchami Jennifer; Tamen Stanick; Tamen Max | Distinct names only | Unresolved | Unassigned | Blocked |

The absence of duplicate display names is not a formal SoD PASS. Stable identities, exact appointments and independent checkers remain unavailable.

## What governance must provide next

1. A controlled identity record for each candidate, including a stable immutable subject ID and the authoritative tenant.
2. A dated appointment or delegation for each exact canonical role, including scope, effective dates and appointing authority.
3. A formal SoD/COI assessment based on stable subject IDs, with any exception approved by an independent authority.
4. Independent checkers/verifiers who are different from the signer, evidence producer and authority verifier for the same obligation.
5. Controlled signing envelopes, fresh authentication, trusted timestamps, resolvable signature references and immutable evidence hashes.

Only after those records exist may the live approval register be populated and the two narrow G1 gates be run.

## Produced artifacts

- `docs/blockers-and-gates/COMPLIANCE_AUTHORIZATION_G1_PREFILLED_WORKING_COPY_2026-08-19.docx`
- `docs/blockers-and-gates/COMPLIANCE_AUTHORIZATION_G1_PREFILL_STATUS_2026-08-19.json`
- `docs/blockers-and-gates/COMPLIANCE_AUTHORIZATION_G1_UNRESOLVED_FIELDS_2026-08-19.json`
- `docs/blockers-and-gates/COMPLIANCE_AUTHORIZATION_G1_PREFILL_AND_SOD_REPORT_2026-08-19.md`

`pos:g1:contract:gate`, `pos:enterprise:program:gate`, `policy:gates` and `verify:release` were not run because the candidate remains ineligible.
