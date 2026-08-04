# Cameroon CNPS Authoritative Evidence Research Report

**Report date:** 2026-07-26  
**Country pack:** Cameroon (`CM-2026.1`)  
**Decision:** `SOURCE_VERIFIED / BLOCKED_PENDING_QUALIFIED_REVIEW`

## Executive result

The official-source investigation materially strengthens the Cameroon CNPS evidence chain. Four additional CNPS artifacts were retained, hashed, and catalogued. The sources independently support the implemented contribution rates, ceilings, occupational-risk categories, and employer responsibilities.

The investigation did **not** find an official document that expressly approves Stoquify, the `CM-2026.1` implementation, its executable fixtures, or production use. It also did not produce the independent qualified-review record, conflict declaration, fixture tie-out hashes, or signed approval artifact required by the release controls.

Accordingly:

- development and integration remain unblocked;
- the development gate passes `11/11`;
- the production gate remains correctly blocked at `10/12`;
- the qualified-review preflight remains `4/12`;
- no control was removed, weakened, or bypassed;
- no symbolic source hash was replaced;
- `productionUseAllowed` remains `false`.

## Scope and method

The research used primary official sources only, prioritizing CNPS Cameroon and competent Cameroon government publications. Search results, blogs, payroll vendors, accounting summaries, and unofficial mirrors were not accepted as approval evidence.

For each accepted artifact, the complete source was retained locally and recorded with its official URL, issuing authority, media type, byte length, SHA-256 digest, coverage, and review limitations. The investigation separately assessed:

1. source provenance and technical traceability;
2. independent professional review;
3. explicit regulator confirmation of the software interpretation or production use.

Official publication was treated as authoritative source evidence, not as regulator endorsement of this software.

## Official sources accepted

### Decree No. 2016/072

The retained decree establishes the underlying CNPS contribution framework used by the country pack. Its retained source artifact hash is:

`1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61`

This artifact remains the principal legal-source candidate for the implemented fixtures. Its hash must not replace symbolic implementation hashes until a qualified reviewer completes the required interpretation, independent tie-out, and approval record.

### CNPS Statistical Yearbook 2025

The yearbook reports CNPS data through 2025-12-31 and reproduces the operative contribution parameters:

- family allowances: 7.00% for the general and domestic-worker regimes, 5.65% for agriculture, and 3.70% for private education;
- old-age, invalidity, and death pension: 8.40% total, split 4.20% employer and 4.20% employee;
- pension contribution ceiling: XAF 750,000 monthly and XAF 9,000,000 annually;
- occupational risks: Group A 1.75%, Group B 2.50%, and Group C 5.00%, employer-funded and uncapped;
- the employer is responsible for paying the full contribution, including the employee portion withheld at source.

Relevant pages: 8–10.

### Current CNPS employer-obligations page

The current CNPS employer page, captured on 2026-07-26, continues to publish employer calculation, declaration, and payment responsibilities and the family-allowance rates.

This is useful current administrative guidance. It does not expressly confirm the Stoquify implementation or authorize its production use.

### CNPS official FAQ

The CNPS FAQ explains Decree No. 2016/072, including:

- the XAF 750,000 pension ceiling;
- the 8.40% total pension rate;
- the 4.20% employee pension share;
- the occupational-risk classification;
- teledeclaration obligations.

Relevant pages: 4–5.

### Official CNPS contribution scale

The official contribution-scale publication, whose source page was updated on 2025-05-05, was retained as corroborating CNPS evidence.

## Retained artifact inventory

| Artifact | Local file | Bytes | SHA-256 |
|---|---|---:|---|
| CNPS Statistical Yearbook 2025 | `CNPS-Statistical-Yearbook-2025.pdf` | 2,895,247 | `53a22ebb9a9bf31bc0c7c60f8cc0eed9383192ef4f0d6a309f2782ad60875504` |
| Current CNPS employer obligations | `CNPS-Employer-Obligations-current-2026-07-26.html` | 231,875 | `8e319e856a0f473accac53587708523b7080c5aac5f6d8eb4e8bd5cb5bb8d743` |
| CNPS official FAQ | `CNPS-Official-FAQ-Decree-2016-072.pdf` | 380,118 | `166f12931df869f4a6f96a977342ce18600ece1361535c96fc2e841f2ffb7d5d` |
| Official CNPS contribution scale | `CNPS-Contribution-Scale-official-2025.jpg` | 1,476,553 | `ae152e77b7a26ab2a2270d032a256815e8f3544e66700f207191edf584ed2259` |

Evidence directory:

`docs/HR-Payroll/evidence/country-packs/CM/2026-07-19`

All recorded byte lengths and SHA-256 digests were recomputed after download and matched the supplemental manifest.

## Fixture-family traceability

| Fixture family | Implemented value | Official-source result | Current classification |
|---|---|---|---|
| `payroll.cnps.pensionRatesBps` | 840 bps total; 420 employer; 420 employee; XAF 750,000 monthly ceiling | Textually agrees with the decree explanation, official FAQ, and 2025 yearbook | `SOURCE_VERIFIED` |
| `payroll.cnps.familyAllowanceRatesBps` | 700 general/domestic; 565 agriculture; 370 private education | Textually agrees with the current employer page and 2025 yearbook | `SOURCE_VERIFIED` |
| `payroll.cnps.occupationalRiskRatesBps` | 175 Group A; 250 Group B; 500 Group C | Textually agrees with the decree framework, official FAQ, and 2025 yearbook | `SOURCE_VERIFIED` |
| `payroll.cnps.employerRules` | Employer calculates, declares, withholds the employee share, and pays the total contribution | Textually agrees with current CNPS guidance and the 2025 yearbook | `SOURCE_VERIFIED` |

The values agree textually with the official sources. This report does not substitute for the required independent executable-fixture tie-out.

## 2026 applicability assessment

The official 2025 yearbook demonstrates continued application of the same rates through 2025-12-31. The current CNPS employer page still published the relevant rates and employer responsibilities when captured on 2026-07-26.

No superseding, repealing, suspending, or amending official instrument was found in the official sources searched. This is strong source evidence for continuity, but absence from the searched sources is not a legal opinion. A qualified reviewer must make and sign the final 2026 effective-window determination.

The project owner's statement that the 2016 rules remain effective for 2026 is recorded as an input. It is not a substitute for the independent qualified-review artifact required by the automated controls.

## Evidence classification

### `SOURCE_VERIFIED`

**Supported.** The implementation is traceable to authentic official CNPS sources, the retained files have verified hashes, and the fixture values textually agree with those sources.

### `EXPERT_REVIEWED`

**Not achieved.** No complete independent reviewer record was found containing:

- reviewer identity and organization;
- relevant professional qualification;
- conflict-of-interest declaration;
- review start and completion dates;
- independent digest recomputation;
- a decision for every fixture family;
- independent tie-out hashes;
- final approval decision;
- signature method and signed artifact.

### `REGULATOR_CONFIRMED`

**Not achieved for the software implementation.** Official CNPS publication confirms source provenance and administrative guidance. It does not, by itself, establish explicit regulator approval of Stoquify, `CM-2026.1`, the executable fixtures, or production use.

If `REGULATOR_CONFIRMED` is intended only as a source-authority label, its semantics should be renamed or documented so it cannot be mistaken for implementation approval. Under the current strict approval meaning, the label is not yet justified.

## Gate results

| Control | Result | Meaning |
|---|---:|---|
| Qualified-review preflight | `4/12` | `BLOCKED_PENDING_QUALIFIED_REVIEW` |
| Production country-pack gate | `10/12` | Blocked by hash verification and expert approval |
| Development country-pack gate | `11/11` | `READY_FOR_DEVELOPMENT_TESTING` |
| Focused automated tests | `42/42` | Four suites passed |

The two remaining production blockers are:

1. `source_artifact_hash_verification`
2. `source_artifact_expert_approval`

The new evidence does not automatically clear either blocker because the primary manifest and implementation correctly require an authentic maker–checker approval chain.

## Required actions to clear the remaining gates

An independent qualified reviewer must:

1. verify the retained official artifacts and independently recompute their SHA-256 digests;
2. determine and document the 2026 legal effective window;
3. review all four fixture families;
4. perform independent calculations for representative, boundary, ceiling, rounding, and category scenarios;
5. record the expected results and independent tie-out hash for each fixture family;
6. declare qualifications and any conflicts of interest;
7. sign and date the review artifact.

An authorized checker must then:

1. validate reviewer independence and qualifications;
2. confirm complete four-family coverage;
3. verify the signed artifact and its digest;
4. approve production use explicitly;
5. populate the existing review-decision structure without changing its control semantics.

Only after the qualified-review preflight reaches `12/12` should the implementation:

1. replace symbolic source hashes with the exact retained, approved artifact hashes;
2. update the primary evidence manifest;
3. set production authorization truthfully;
4. rerun the enforced preflight, production country-pack gate, policy gate, release-evidence gate, and enterprise release gate.

## Files created

- `docs/country-pack/CAMEROON_CNPS_AUTHORITATIVE_EVIDENCE_RESEARCH_PROMPT_2026-07-26.md`
- `docs/country-pack/CAMEROON_CNPS_AUTHORITATIVE_EVIDENCE_RESEARCH_PROMPT_2026-07-26.pdf`
- `docs/country-pack/CAMEROON_CNPS_AUTHORITATIVE_EVIDENCE_RESEARCH_REPORT_2026-07-26.md`
- `docs/country-pack/CAMEROON_CNPS_AUTHORITATIVE_EVIDENCE_RESEARCH_REPORT_2026-07-26.pdf`
- `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/CNPS-Statistical-Yearbook-2025.pdf`
- `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/CNPS-Employer-Obligations-current-2026-07-26.html`
- `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/CNPS-Official-FAQ-Decree-2016-072.pdf`
- `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/CNPS-Contribution-Scale-official-2025.jpg`
- `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/authoritative-source-supplement-2026-07-26.json`

## Final decision

The Cameroon country pack now has a substantially stronger, reproducible official-source evidence chain. It is safe for continued development and feature integration. Production release remains intentionally blocked until the independent qualified review and signed approval evidence are completed.

No evidence was fabricated, no approval was inferred from publication alone, and no production control was bypassed.
