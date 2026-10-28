# Cameroon CNPS Authoritative Regulatory Evidence Research Prompt

Investigate and assemble the authoritative regulatory evidence required to resolve the Cameroon CNPS country-pack production blockers.

Target evidence directory:

`docs/HR-Payroll/evidence/country-packs/CM/2026-07-19`

## Objectives

1. Identify the exact official documents that establish:
   - whether Decree No. 2016/072 remains effective for the 2026 country pack;
   - current CNPS contribution rates, ceilings, employer obligations, and occupational-risk classifications;
   - any amendments, replacements, implementing instruments, circulars, regulator confirmations, or official 2026 guidance;
   - whether the implementation may legitimately use `REGULATOR_CONFIRMED`.
2. Search only authoritative primary sources, prioritizing:
   - Cameroon Presidency or Prime Minister’s Office;
   - Official Journal or official legislation portals;
   - CNPS Cameroon;
   - Ministry of Labour and Social Security;
   - other competent Cameroon government or regulatory authorities.
3. Do not treat blogs, payroll vendors, accounting websites, summaries, search snippets, or unofficial mirrors as approval evidence.

## Evidence acquisition

For every authoritative document found:

1. Confirm the issuing authority, title, reference number, publication date, effective date, and legal status.
2. Determine whether it remains operative in 2026 or has been amended, replaced, suspended, or repealed.
3. Download or capture the complete official document.
4. Preserve the original filename where practical.
5. Save it in the target evidence directory.
6. Record:
   - official source URL;
   - retrieval timestamp;
   - media type;
   - file size;
   - SHA-256 digest;
   - issuing authority;
   - legal reference;
   - publication and effective dates;
   - relevant provisions or page numbers;
   - supersession or amendment relationships;
   - scope and limitations.
7. Never overwrite existing evidence silently. Preserve previous artifacts and document any replacement or newer version.

## Required fixture coverage

Map authoritative provisions to:

- `payroll.cnps.pensionRatesBps`
- `payroll.cnps.familyAllowanceRatesBps`
- `payroll.cnps.occupationalRiskRatesBps`
- `payroll.cnps.employerRules`

For each family, extract the applicable rate, ceiling, category, responsibility, exact source provision, effective window, amendments, exceptions, implemented value, agreement result, independent calculation scenarios, expected outputs, rounding treatment, edge cases, and tie-out evidence hash.

## Evidence classification

Determine separately whether the evidence proves:

1. `SOURCE_VERIFIED`: the implementation is traceable to authentic official sources;
2. `EXPERT_REVIEWED`: an independently qualified professional approved the interpretation and fixtures;
3. `REGULATOR_CONFIRMED`: the competent regulator explicitly confirmed the interpretation, implementation, rates, fixtures, or production use.

Do not label evidence `REGULATOR_CONFIRMED` merely because it was published on a regulator’s website. Official publication proves provenance and current regulator guidance; it does not automatically prove regulator endorsement of this software implementation.

If explicit regulator confirmation cannot be found, preserve the accurate status and identify the exact external approval still required.

## Reviewer and approval evidence

Extract available regulator identity, organization, confirmation reference, confirmation date, effective period, fixture coverage, production-use authorization, reviewer identity, qualification, conflict declaration, review window, signature method, signed artifact, and artifact SHA-256.

Do not invent missing identities, qualifications, declarations, signatures, dates, decisions, or authorization.

## Controlled updates and gates

Only when authentic evidence supports the transition:

1. Prepare `review-decision.json` from the existing template.
2. Update the evidence manifest with verified artifacts and hashes.
3. Preserve `productionUseAllowed: false` until the qualified-review preflight passes 12/12.
4. Run the preflight in enforced fail mode.
5. Only after maker–checker approval:
   - apply the truthful review status;
   - record production authorization;
   - replace symbolic `sourceEvidenceHash` values with matching retained hashes;
   - update related evidence manifests.
6. Run the production country-pack, policy, release-evidence, and enterprise release gates.

## Required output

Return:

- official-source search methodology;
- documents found, downloaded, and rejected;
- complete artifact inventory and hashes;
- extracted regulatory provisions;
- 2026 applicability assessment;
- fixture-family traceability and tie-outs;
- evidence supporting each classification;
- missing information;
- qualified-reviewer and authorized-checker actions;
- files changed;
- before-and-after gate results;
- final readiness decision.

Success means the evidence chain is reproducible and honest. Gates may clear only with authentic evidence—not by removing controls, fabricating approval, or treating publication as regulator endorsement of the software.
