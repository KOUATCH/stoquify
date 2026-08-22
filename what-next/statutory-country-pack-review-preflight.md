# Statutory country-pack qualified-review preflight

Generated: 2026-08-18T04:51:01.214Z

Status: **BLOCKED_PENDING_QUALIFIED_REVIEW**  
Operator manifest update allowed: **false**  
Manifest production use allowed: **false**

| Condition | Result | Owner | Required evidence | Detail |
|---|---|---|---|---|
| manifest_present_and_parseable | PASS | Engineering | Parseable manifest.json | Manifest parsed. |
| decision_present_and_parseable | PASS | Qualified reviewer | Parseable review decision JSON | Decision packet parsed. |
| source_artifact_integrity | PASS | Engineering | Captured sources match manifest byte length and SHA-256 | All manifest source artifacts match. |
| reviewer_identity_complete | BLOCKED | Compliance/legal owner | Reviewer identity, qualifications, organization, and conflict declaration | Missing: fullName, professionalCapacity, organization, qualificationReference, conflictOfInterestDeclaration |
| review_window_complete | BLOCKED | Qualified reviewer | Valid review start and completion timestamps | Review timestamps are missing, invalid, or reversed. |
| reviewer_recomputed_source_digests | BLOCKED | Qualified reviewer | Reviewer independently recomputes every source SHA-256 | Incomplete: CM_CNPS_CONTRIBUTION_DECREE_2016, CM_CNPS_EMPLOYER_RULES |
| fixture_family_decisions_complete | BLOCKED | Qualified reviewer | Decision, source provision, dates, and independent tie-out hash for every family | incomplete payroll.cnps.pensionRatesBps; incomplete payroll.cnps.familyAllowanceRatesBps; incomplete payroll.cnps.occupationalRiskRatesBps; incomplete payroll.cnps.employerRules |
| all_required_fixture_families_approved | BLOCKED | Qualified reviewer | Explicit APPROVED decision for every required fixture family | One or more required families are not approved. |
| final_decision_consistent | BLOCKED | Qualified reviewer | Approved final decision consistent with every fixture decision and effective date | Final approval is absent or inconsistent. |
| signed_approval_metadata_complete | BLOCKED | Qualified reviewer | Signed artifact filename, SHA-256, signature timestamp, and method | Signed-artifact metadata is incomplete or invalid. |
| signed_approval_artifact_verified | BLOCKED | Authorized checker | Retained signed artifact matching the decision SHA-256 | Signed artifact missing or hash mismatch. |
| manifest_transition_not_premature | PASS | Authorized maker/checker | Manifest remains fail-closed until review evidence is complete | Manifest state is safe for the packet state. |

## Non-claims

- This preflight validates evidence structure and integrity; it does not perform legal interpretation.
- Development authorization is not qualified statutory approval.
- A passing preflight authorizes a controlled manifest transition, not production release by itself.
