# Cameroon CNPS Country-Pack Qualified Review Intake

Status: `PENDING_EXPERT_REVIEW`  
Production use allowed: **No**

This package supports qualified legal/payroll review of the Cameroon CNPS country-pack fixtures. Completing this document does not itself update the production manifest. An authorized operator must retain the signed approval artifact, calculate its SHA-256 digest, update `manifest.json`, and rerun the statutory production gate.

## Reviewer eligibility

The reviewer must be qualified to interpret Cameroon payroll and social-security obligations. Record professional capacity, organization, jurisdictional experience, and any conflict of interest. A developer or automated agent must not approve its own implementation.

## Source artifacts

| Legal reference | Retained artifact | SHA-256 |
| --- | --- | --- |
| `CM_CNPS_CONTRIBUTION_DECREE_2016` | `CNPS-Decree-2016-072-contribution-rates.pdf` | `1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61` |
| `CM_CNPS_EMPLOYER_RULES` | `CNPS-employer-general-rules.html` | `bc51f74de8dd3b0c7babd86e8f98d92dbdbece214480f66ac89c42d3e894a868` |

Before review, independently recompute both digests and confirm they match `manifest.json`.

## Reviewer identity

- Full legal name:
- Professional title/capacity:
- Organization:
- Relevant qualification or license:
- Cameroon payroll/social-security experience:
- Contact retained in controlled evidence store:
- Conflict-of-interest declaration:
- Review started at (UTC):
- Review completed at (UTC):

## Required fixture-family decisions

For every family, record `APPROVED`, `REJECTED`, or `CHANGES_REQUIRED`. Approval requires the source provision, effective window, input interpretation, rounding rule, expected output, and edge cases to agree with the retained authority source.

| Fixture family | Decision | Source provision/page | Effective from | Effective to | Reviewer notes |
| --- | --- | --- | --- | --- | --- |
| `payroll.cnps.pensionRatesBps` |  |  |  |  |  |
| `payroll.cnps.familyAllowanceRatesBps` |  |  |  |  |  |
| `payroll.cnps.occupationalRiskRatesBps` |  |  |  |  |  |
| `payroll.cnps.employerRules` |  |  |  |  |  |

## Golden-fixture verification

For each production-supported fixture, attach or reference the independent calculation worksheet and record:

- fixture identifier;
- country-pack version;
- source provision and page;
- input values and assumptions;
- independently calculated expected output;
- system-calculated output;
- tie-out result;
- rounding and ceiling treatment;
- exceptions or unsupported cases.

## Mandatory control questions

- Are the employee and employer contribution rates correctly separated?
- Is the pension contribution ceiling correctly interpreted and effective-dated?
- Are family-allowance categories and rates correctly mapped?
- Are occupational-risk groups and classification requirements complete?
- Are declaration, payment, and employer-registration obligations correctly represented?
- Are any formulas, thresholds, categories, or exceptions missing?
- Do the golden fixtures cover all production claims?
- Are any sources superseded, amended, or subject to a later effective date?

## Final decision

- Overall decision: `APPROVED` / `REJECTED` / `CHANGES_REQUIRED`
- Approved fixture families:
- Excluded fixture families:
- Effective from:
- Effective to:
- Conditions or limitations:
- Required follow-up date:

## Attestation

I attest that I reviewed the retained source artifacts identified by their SHA-256 digests, independently assessed the listed fixture families and golden outputs, disclosed relevant limitations, and made the final decision recorded above within my professional competence.

- Reviewer signature:
- Signature method:
- Signed at (UTC):
- Signed approval artifact filename:
- Signed approval artifact SHA-256:

Until a signed approval artifact is retained and the production manifest is updated by an authorized operator, `productionUseAllowed` must remain `false`.
