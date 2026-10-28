# Cameroon country-pack qualified-review packet — 2026-08-17

Country: Cameroon (`CM`)  
Country-pack candidate: `CM-2026.1`  
Decision: **REQUIRES_QUALIFIED_HUMAN_REVIEW**  
Production use allowed: **false**

## Machine-verified evidence

| Evidence | Result |
|---|---|
| Country-pack manifest | Present; SHA-256 `661bec902f0c55d699c100c2b3ce1323de6f88813c2761a566e29806e91a2224` |
| Retained manifest artifacts | 2/2 byte length and SHA-256 verified by live production-gate assessment |
| Declared source hashes | 7/7 valid and bound |
| CNPS Decree 2016/072 PDF | SHA-256 `1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61` |
| CNPS employer general rules HTML | SHA-256 `bc51f74de8dd3b0c7babd86e8f98d92dbdbece214480f66ac89c42d3e894a868` |
| Development gate | `PASS`, 11/11; development/sandbox only |
| Integration gate | `PASS`, 9/9; production activation disabled |
| Production gate | `BLOCKED`, 11/12; `source_artifact_expert_approval` |
| Qualified-review preflight | `BLOCKED_PENDING_QUALIFIED_REVIEW`, 4/12 |
| Runtime authority | `SUPPORTED_DRAFT`, `SOURCE_CHECKED`, `authoritative=false` |

## Reviewer identity record

```json
{
  "status": "REQUIRES_QUALIFIED_HUMAN_REVIEW",
  "owner": "Stoquify compliance/legal owner and appointed independent Cameroon payroll/social-security reviewer",
  "reason": "No verified reviewer identity, professional capacity, qualification reference, conflict declaration, review window, or signature is bound to the candidate.",
  "requiredEvidence": [
    "reviewer full legal name and organization",
    "professional capacity and qualification/registration reference",
    "scope-of-practice statement covering Cameroon payroll, CNPS, tax and statutory interpretation",
    "conflict-of-interest declaration",
    "review start and completion timestamps",
    "verifiable signature or immutable enterprise approval record"
  ],
  "acceptanceTest": "Independent checker verifies identity, qualification, scope, conflict declaration, timestamps and signature against the exact review-decision SHA-256.",
  "evidencePath": null,
  "evidenceSha256": null,
  "approvalReference": null,
  "nextAction": "Compliance/legal appoints the reviewer and transmits the unchanged hash-pinned review package."
}
```

Administrative product/controller names already supplied may own product or financial decisions, but they are not automatically qualified statutory reviewers. `KOUATCHOUA MARK` may act as product owner and `KOUATCHOUA MARCELINE` must have an explicitly verified controller capacity if used for controller approval; neither role can self-certify legal interpretation merely through a typed name.

## Required fixture-family decisions

The reviewer must complete each row. Engineering must not supply the legal conclusion.

| Family | Current state | Reviewer must provide | Independent acceptance |
|---|---|---|---|
| `payroll.cnps.pensionRatesBps` | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Legal provision, covered persons, employee/employer rates, basis, cap, effective window, rounding, limitations and calculated examples | Checker recomputes source hash and tie-out |
| `payroll.cnps.familyAllowanceRatesBps` | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Provision, employer rate, basis/cap, effective window, exceptions and examples | Checker independently reproduces expected output |
| `payroll.cnps.occupationalRiskRatesBps` | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Risk classes, applicable rate selection, basis/cap, effective window and examples | Checker validates classification and tie-out |
| `payroll.cnps.employerRules` | `REQUIRES_QUALIFIED_HUMAN_REVIEW` | Registration, declaration/payment duties, deadlines, correction/penalty scope, evidence retention and applicability limits | Checker maps every claim to retained authority source |

The current source packet is CNPS-focused. Production coverage for IRPP/tax, labor/time/leave, payslip and declaration requirements, fiscal receipts, DGI e-invoicing/authority submission, retention/privacy, correction rules and effective-date transitions must be separately inventoried and either approved, blocked, or explicitly marked unsupported. Silence is not approval.

## Review decision schema to return

The genuine return must contain:

- decision ID and exact candidate/manifest SHA-256;
- reviewer identity, capacity, qualification, organization and conflict declaration;
- source artifact IDs and reviewer-recomputed SHA-256 values;
- one `APPROVED`, `REJECTED` or `LIMITED` decision for every required family;
- authoritative provision, effective dates, assumptions, limitations and independent calculation tie-out hash for each family;
- explicit supported/unsupported statement for payroll, tax, labor, receipts, authority submissions and corrections;
- final decision consistent with all family decisions;
- signed approval artifact filename, SHA-256, method and timestamp;
- separate checker identity, verification evidence, decision and later timestamp.

## Existing DOCX boundary

`docs/Compliance/Complaince authorization validation.docx` was present but exclusively locked by another process during this run, so its contents and SHA-256 could not be inspected. It is therefore **not evidence used by this decision**. After it is closed, verify its content, author/signature provenance, embedded/detached signature, candidate hashes, review scope and independent checker record. A DOCX with typed names alone does not satisfy the gate.

## Promotion sequence

1. Qualified reviewer returns the completed decision, source-hash verification and independent fixture tie-outs.
2. An independent checker validates the reviewer, signature and every bound hash.
3. Engineering ingests the decision without changing legal conclusions.
4. Run `statutory-country-pack-review-preflight`; require 12/12 with no override.
5. Transition the manifest only to the state explicitly authorized by the signed decision.
6. Run the production country-pack gate; require 12/12.
7. Rerun payroll, compliance, receipt, authority, accounting-close and final release gates against the same frozen candidate.

Final condition: **development and no-legal-effect sandbox work may continue; statutory production reliance remains blocked.**
