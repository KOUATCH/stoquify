# Cameroon Country-Pack Evidence and Approval Readiness Report

**Assessment date:** 2026-07-26  
**Country:** Cameroon (`CM`)  
**Country-pack version under review:** `CM-2026.1`  
**Evidence packet:** `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19`  
**Current qualified-review status:** `BLOCKED_PENDING_QUALIFIED_REVIEW`  
**Current production gate:** `blocked` — 10/12 checks ready  
**Production use allowed:** No

## Executive decision

The packet is complete enough for dispatch to an independent qualified reviewer. Repository-controlled evidence integrity is verified: every file pinned by the dispatch manifest exists, all seven pinned byte lengths match, and all seven pinned SHA-256 digests match.

The production country-pack must remain blocked. The repository cannot supply the remaining evidence legitimately because it depends on independent professional judgment and authority: reviewer identity and qualification, 2026 legal applicability, independent calculations, fixture-family decisions, conflict disclosure, signature, and production authorization.

No gate should be removed or overridden. The shortest legitimate path is:

1. appoint and verify a qualified reviewer;
2. obtain a complete signed decision packet and independent fixture tie-outs;
3. pass the qualified-review preflight at 12/12 while the manifest remains fail-closed;
4. perform a maker–checker manifest transition;
5. replace only the approved symbolic source links with real retained hashes;
6. pass the production country-pack gate at 12/12;
7. rerun policy and enterprise release gates.

## 1. Packet inventory

| File | Purpose | Bytes | Integrity result |
|---|---|---:|---|
| `CNPS-Decree-2016-072-contribution-rates.pdf` | Primary contribution-rate and ceiling source | 2,608,628 | SHA-256 and length match |
| `CNPS-employer-general-rules.html` | Primary employer-obligation source capture | 248,633 | SHA-256 and length match |
| `manifest.json` | Source inventory and production approval state | 2,339 | Dispatch hash and length match |
| `artifact-integrity-2026-07-19.json` | Previous integrity assessment | 2,205 | Dispatch hash and length match |
| `QUALIFIED_REVIEW_INTAKE.md` | Human reviewer worksheet | 4,004 | Dispatch hash and length match |
| `review-decision.template.json` | Machine-readable reviewer decision template | 2,271 | Dispatch hash and length match |
| `STATUTORY_GATE_UNBLOCK_HANDOFF_2026-07-19.md` | Engineering-to-reviewer transition instructions | 3,790 | Dispatch hash and length match |
| `qualified-review-dispatch-manifest.json` | Machine-readable dispatch inventory | 2,138 | Present; it pins the seven files above |
| `QUALIFIED_REVIEW_DISPATCH_2026-07-20.md` | Reviewer dispatch instructions and ownership | 3,793 | Present |

## 2. Verified retained source artifacts

### 2.1 Contribution decree

- Legal reference: `CM_CNPS_CONTRIBUTION_DECREE_2016`
- Retained file: `CNPS-Decree-2016-072-contribution-rates.pdf`
- Source authority recorded in the manifest: Caisse Nationale de Prévoyance Sociale du Cameroun
- Retained pages: 5
- Byte length: `2608628`
- SHA-256: `1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61`
- Hash and byte length: verified

Objective provisions extracted from the retained source:

| Provision | Extracted content relevant to the pack |
|---|---|
| Article 1 | Scope includes family benefits, old-age/disability/death pensions, workplace accidents, and occupational diseases administered by CNPS. |
| Article 2 | Family allowance rates: general 7%; agriculture 5.65%; private education 3.7%. |
| Article 3 | Pension contribution: 8.4% total, divided 4.2% employer and 4.2% employee. |
| Article 4 | Contribution ceiling: XAF 750,000 per month and XAF 9,000,000 per year. |
| Article 5 | Voluntary-insurance pension rate: 8.4%, fully borne by the voluntary insured person. This is extracted evidence but is outside the four fixture families currently awaiting approval. |
| Article 6 | Pension calculation references actual remuneration within the contribution ceiling; the considered monthly average may not be below the SMIG. |
| Articles 7–9 | Occupational-risk groups A/B/C, classification rules, and rates of 1.75%, 2.5%, and 5%. |
| Article 9 | Multiple activities under one legal identity are classified according to the highest-risk activity; CNPS may correct a classification after control. |
| Article 10 | Family allowance and occupational-risk contributions are exclusively employer-funded. |
| Article 11 | Contribution rates are revisable every two years. This makes current 2026 applicability a mandatory reviewer question. |
| Articles 12–13 | Contrary prior provisions are repealed; publication and insertion in the Official Journal are prescribed. |
| Annex | Lists activities and professions by occupational-risk group. |

### 2.2 Employer general rules

- Legal reference: `CM_CNPS_EMPLOYER_RULES`
- Retained file: `CNPS-employer-general-rules.html`
- Source authority recorded in the manifest: Caisse Nationale de Prévoyance Sociale du Cameroun
- Byte length: `248633`
- SHA-256: `bc51f74de8dd3b0c7babd86e8f98d92dbdbece214480f66ac89c42d3e894a868`
- Hash and byte length: verified

Objective statements extracted from the retained source:

- The employer is responsible for calculating, liquidating, and paying all social contributions, including the employer portion and employee portion withheld at payroll.
- Employer registration is completed through the relevant social-security center and results in a registration number.
- Online pre-registration is not confirmed until completed at a social-security center, no later than 30 days after pre-registration.
- Monthly or quarterly contributions are paid by the employer after salary teledeclaration.
- Employer controls verify salary declarations and contribution payments for a period.
- Taxation on an assessed basis may apply when salary declarations are not filed, adequate accounting is not presented, or the employer does not respond to a contribution controller.

These statements support review of `payroll.cnps.employerRules`, but the reviewer must determine their current legal force, exact operational scope, and effective dates.

## 3. Implemented country-pack information

| Fixture family | Implemented value | Current legal reference | Code effective date |
|---|---|---|---|
| `payroll.cnps.pensionRatesBps` | Total 840 bps; employer 420; employee 420; monthly ceiling 750,000; annual ceiling 9,000,000 XAF | `CM_CNPS_CONTRIBUTION_DECREE_2016` | 2026-01-01 |
| `payroll.cnps.familyAllowanceRatesBps` | General 700 bps; agriculture 565; private education 370; employer-funded | `CM_CNPS_CONTRIBUTION_DECREE_2016` | 2026-01-01 |
| `payroll.cnps.occupationalRiskRatesBps` | Group A 175 bps; B 250; C 500; employer-funded; classification required | `CM_CNPS_CONTRIBUTION_DECREE_2016` | 2026-01-01 |
| `payroll.cnps.employerRules` | Registration required; employee declaration required; payroll base requires CNPS review | `CM_CNPS_EMPLOYER_RULES` | 2026-01-01 |

Seven executable calculation fixtures exist:

- one pension fixture;
- three family-allowance sector fixtures;
- three occupational-risk group fixtures.

All seven currently declare the symbolic value:

`sha256:cm-cnps-regulator-confirmed-2026`

All seven name `CM_CNPS_CONTRIBUTION_DECREE_2016`, so the objective candidate source digest is:

`sha256:1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61`

This replacement must not occur until the qualified reviewer confirms that the retained decree supports each fixture and its 2026 effective window.

## 4. Important consistency findings

### 4.1 Repository evidence is pending while code labels are stronger

The evidence manifest says:

- `reviewStatus: PENDING_EXPERT_REVIEW`;
- `productionUseAllowed: false`;
- reviewer identity and approval artifact are absent.

The implementation currently uses `REGULATOR_CONFIRMED` labels and a `CNPS_REGULATOR_CONFIRMED_BY` description that records an official-source review. An official source is not automatically regulator confirmation of this software interpretation. The qualified reviewer must decide whether the truthful resulting status is:

- `EXPERT_REVIEWED`; or
- `REGULATOR_CONFIRMED`, but only when actual regulator confirmation evidence exists.

The gate currently prevents this semantic mismatch from authorizing production.

### 4.2 The 2026 effective date is not proven by the retained decree alone

The decree is dated 15 February 2016, while the country pack applies it from 1 January 2026. Article 11 says rates are revisable every two years. The reviewer must check for amendments, superseding texts, later classifications, and current CNPS instructions before approving the 2026 window.

### 4.3 Employer-rule traceability is weaker than calculation-fixture traceability

The employer-rules parameter has a legal reference and retained source, but it has no calculation scenario and no direct `sourceEvidenceHash` field comparable to the seven calculation fixtures. The required reviewer decision still covers this family. After approval, engineering should retain its source binding in the decision and signed artifact and consider a future schema-level hash link rather than relying only on the legal-reference string.

### 4.4 The npm review preflight is report-mode

`npm run statutory:country-pack:review:preflight` uses `--mode report`; it writes evidence but does not fail the process when blocked. Before manifest transition, use the explicit fail-mode command in Section 9 so automation cannot continue on a blocked packet.

## 5. Current preflight result

The qualified-review preflight currently passes 4/12:

Passed:

1. `manifest_present_and_parseable`
2. `decision_present_and_parseable`
3. `source_artifact_integrity`
4. `manifest_transition_not_premature`

Blocked:

| Blocked check | Missing evidence | Owner |
|---|---|---|
| `reviewer_identity_complete` | Full name, professional capacity, organization, qualification reference, conflict declaration | Compliance/legal owner and reviewer |
| `review_window_complete` | Valid start and completion timestamps | Qualified reviewer |
| `reviewer_recomputed_source_digests` | Independent recomputation of both source digests | Qualified reviewer |
| `fixture_family_decisions_complete` | Decision, source provision, dates, and independent tie-out hash for all four families | Qualified reviewer |
| `all_required_fixture_families_approved` | Explicit approval for every production-supported family | Qualified reviewer |
| `final_decision_consistent` | Consistent approved final decision, production authorization, approved families, and effective date | Qualified reviewer |
| `signed_approval_metadata_complete` | Signed filename, digest, timestamp, and signature method | Qualified reviewer |
| `signed_approval_artifact_verified` | Retained signed artifact whose digest matches the decision | Authorized checker |

## 6. Information that must not be fabricated

The following cannot be extracted or truthfully inferred from repository content:

- the reviewer’s identity;
- professional qualification, license, or jurisdictional competence;
- organization and authority to provide the review;
- conflict-of-interest declaration;
- review start and completion times;
- confirmation that the 2016 decree remains controlling in 2026;
- interpretation of amendments, exceptions, classifications, or current CNPS practice;
- independent source-digest recomputation by the reviewer;
- independent fixture calculations and tie-out hashes;
- approval, rejection, exclusions, conditions, and effective dates;
- reviewer signature and signature method;
- authenticity and authority verification by a checker;
- production authorization.

Engineering or an automated agent must leave these fields blank until authentic evidence is returned.

## 7. Reviewer-ready decision matrix

The following objective candidates are prepared for reviewer confirmation. They are not decisions.

| Fixture family | Candidate source provisions | Implemented claim to verify | Required independent evidence |
|---|---|---|---|
| `payroll.cnps.pensionRatesBps` | Decree Articles 3–4; also review Article 6 | 8.4% total; 4.2%/4.2%; XAF 750,000 monthly and 9,000,000 annual ceiling | Independent calculation covering below-cap, at-cap, and above-cap remuneration; rounding; minimum-base treatment |
| `payroll.cnps.familyAllowanceRatesBps` | Decree Articles 2 and 10 | 7%, 5.65%, 3.7%; employer-funded | Independent calculations for all three sectors; sector applicability and edge cases |
| `payroll.cnps.occupationalRiskRatesBps` | Decree Articles 7–10 and annex | A 1.75%, B 2.5%, C 5%; employer-funded; classification required | Independent calculations for all groups; classification examples; mixed-activity and reclassification cases |
| `payroll.cnps.employerRules` | Retained CNPS employer-rules page; relevant decree provisions | Registration, declaration, and employer payment/control obligations | Current authority, timing, scope, teledeclaration workflow, exceptions, and evidence of 2026 applicability |

For each family the reviewer must record:

- `APPROVED`, `REJECTED`, or `CHANGES_REQUIRED`;
- exact source provision and page/section;
- effective from and optional effective to;
- independent fixture tie-out hash in `sha256:<64 lowercase hex>` format;
- limitations and unsupported cases.

## 8. Maker–checker workflow

### Stage 1 — Compliance/legal owner

1. Appoint a reviewer competent in Cameroon payroll and social-security obligations.
2. Verify qualifications, organization, authority, independence, and conflict declaration.
3. Deliver the pinned packet without modifying the retained artifacts.

### Stage 2 — Qualified reviewer

1. Copy `review-decision.template.json` to `review-decision.json`.
2. Recompute both source SHA-256 digests independently.
3. Verify current legal applicability and effective dates.
4. Review every formula, ceiling, category, funding responsibility, classification, rounding rule, and exception.
5. Produce independent calculations and tie-out hashes for all four fixture families.
6. Record an explicit decision for every family.
7. Record a consistent final decision and production-use authorization only if professionally supportable.
8. Sign the approval artifact and return it with any referenced worksheets and additional sources.

### Stage 3 — Authorized checker

1. Authenticate reviewer identity, qualification, authority, and signature.
2. Verify the returned `review-decision.json` matches the signed artifact.
3. Recompute the signed artifact hash.
4. Place the signed artifact and any tie-out evidence in the evidence folder.
5. Run the fail-mode qualified-review preflight.
6. Reject the packet if any of the 12 conditions fails.

### Stage 4 — Authorized operator

Only after a 12/12 preflight:

1. Update `manifest.json` to `EXPERT_REVIEWED` or, only with actual regulator evidence, `REGULATOR_CONFIRMED`.
2. Set manifest and approved artifact `productionUseAllowed` values to `true` only when explicitly authorized.
3. Fill reviewer identity, review dates, effective dates, signed artifact filename and hash, and all four approved fixture families.
4. Replace the seven symbolic hashes with the reviewer-confirmed real retained source hash.
5. Recompute any packet/dispatch manifests that are intended to bind the transitioned evidence bundle.
6. Submit the change through ordinary code review and segregation-of-duties controls.

### Stage 5 — Release owner

1. Run the production country-pack gate.
2. Run policy gates.
3. Run release evidence and enterprise release gates.
4. Keep production blocked if any non-country-pack release condition remains unresolved.

## 9. Exact command sequence

### Current safe checks

```powershell
npm run statutory:country-pack:review:preflight
node scripts/statutory-country-pack-production-gate.js --mode report
```

### Enforced pre-transition acceptance

Run this after authentic reviewer artifacts are present:

```powershell
node scripts/statutory-country-pack-review-preflight.js `
  --mode fail `
  --decision docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-decision.json `
  --out what-next/statutory-country-pack-review-preflight.md `
  --json-out what-next/statutory-country-pack-review-preflight.json
```

Required result:

`READY_FOR_AUTHORIZED_MANIFEST_TRANSITION: 12/12 conditions passed.`

### Post-transition production verification

```powershell
npm run statutory:country-pack:gate
npm run policy:gates
npm run release:evidence:gate:release
```

Required country-pack result:

- status `ready`;
- 12/12 checks ready;
- zero country-pack blockers.

Then rerun:

`017-aqstoqflow-enterprise-release-gate`

## 10. Artifacts prepared by this assessment

- Refined evidence-audit prompt.
- Complete evidence and approval readiness report.
- Objective source-provision matrix.
- Reviewer completion requirements.
- Maker–checker transition checklist.
- Exact enforced command sequence and acceptance criteria.

No reviewer identity, decision, signature, tie-out, or authorization was generated.

## 11. Final readiness decision

**Decision:** `BLOCKED_PENDING_QUALIFIED_REVIEW`

Repository evidence is internally intact and ready for external qualified review. The remaining block is appropriate and cannot be removed legitimately by further extraction alone.

After authentic review evidence is returned, the engineering transition is deterministic: verify 12/12 preflight, update the manifest under maker–checker control, replace seven symbolic decree hashes with the approved retained digest, and rerun the 12/12 production gate followed by skill 017.
