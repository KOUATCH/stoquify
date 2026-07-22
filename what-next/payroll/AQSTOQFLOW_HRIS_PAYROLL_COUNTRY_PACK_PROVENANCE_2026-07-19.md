# AqStoqFlow HRIS/Payroll Country-Pack Provenance

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-12-country-pack-provenance`  
Status: **Stopped — source-evidence provenance is not verifiable**  
Next handoff: `aqstoqflow-hris-payroll-13-payments-declarations-proof` is blocked until the evidence remediation below is complete.

## Executive Decision

Do not promote or broaden statutory payroll automation from the current country pack.

The active Cameroon pack contains reviewed CNPS calculation fixtures and the executable fixture runner currently ties out. However, its `sourceEvidenceHash` values are symbolic labels such as `sha256:cm-cnps-regulator-confirmed-2026`, not 64-character SHA-256 digests. No repository source artifact is bound to those labels. The system can therefore prove that pack content has not changed relative to its own header hash, but it cannot prove which legal or regulator-reviewed source artifact supports the fixture outputs.

No statutory formula was changed in this tranche. Inventing a digest, reviewer, or legal approval would create false assurance.

## Scope Inspected

- `graphify-out/ordered-code-graph.json` and the available architecture graph evidence
- `services/regulatory/country-packs/cameroon.ts`
- `services/regulatory/country-packs/registry.ts`
- `services/regulatory/country-packs/resolve.ts`
- `services/regulatory/country-packs/schemas.ts`
- `services/regulatory/country-packs/hash.ts`
- `services/regulatory/country-packs/validation.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`
- `services/payroll/payroll-country-pack-fixture-runner.ts`
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
- `scripts/regulatory-hardcode-gate.js`
- `scripts/statutory-country-pack-production-gate.js`
- the prior 2026-07-12 country-pack provenance report

## Evidence and Gap

### Controls that are working

- Unsupported countries and absent parameters fail through typed regulatory errors.
- Effective-dated pack selection is pinned by country, date, status, and optional pack version.
- `computeCountryPackHash` creates a canonical SHA-256 digest over the complete pack payload.
- Golden fixtures are pinned to pack version, legal reference, inputs, and expected outputs.
- The payroll fixture runner detects evaluator/output drift.
- IRPP remains explicitly `REQUIRES_EXPERT_REVIEW` and is not promoted to production support.
- Regulatory hardcode and statutory-gate unit suites pass.

### Stop-condition blocker

The schema and validator accept `^sha256:[A-Za-z0-9_.:-]+$`. This proves only that a value carries a `sha256:` prefix. It does not require a SHA-256 digest and does not verify the digest against a retained legal-source artifact.

The active CNPS fixtures repeatedly use:

```text
sha256:cm-cnps-regulator-confirmed-2026
```

Consequently:

- a fixture can appear regulator-confirmed without cryptographic binding to the reviewed source bytes;
- the canonical country-pack header hash protects the pack payload, but not the truth of the external evidence claim;
- the current static readiness gate reports `ready` because it checks the presence of provenance wiring, not artifact-to-digest verification.

## Verification Results

Passed:

- `services/regulatory/__tests__/country-pack.service.test.ts`
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
- `scripts/__tests__/statutory-country-pack-production-gate.test.js`
- `scripts/__tests__/regulatory-hardcode-gate.test.js`

Result: 4 suites passed, 35 tests passed.

The statutory fail gate also completed with `10/10` checks ready and `0` blockers. That result is a baseline observation, not clearance of the source-artifact gap.

The full regulatory-hardcode repository scan exceeded 120 seconds in the current large dirty worktree. Its focused unit suite passed; no claim is made that the full scan completed in this tranche.

## Baseline-Gap Delta

| Measure | Prior baseline | Current finding | Delta |
| --- | ---: | ---: | ---: |
| Static statutory gate checks ready | 10/10 | 10/10 | 0 |
| Static statutory gate blockers | 0 | 0 | 0 |
| Identified unverifiable source-hash controls | 0 recorded | 1 cross-cutting blocker | +1 blocker |
| Statutory formulas changed | 0 | 0 | 0 |

The meaningful delta is one newly evidenced control gap: source-evidence hash presence is being treated as source-evidence verification.

## Required Remediation Before Skill 13

1. Obtain the exact authoritative CNPS source documents and qualified reviewer approval artifacts for every production-supported fixture family.
2. Retain those artifacts in the approved evidence store with tenant-independent regulatory provenance and access controls.
3. Compute real `sha256:<64 lowercase hex characters>` digests from the retained artifact bytes.
4. Bind each fixture review record to the artifact identifier, digest, reviewer identity, review date, legal reference, and effective window.
5. Tighten the schema and validator to require cryptographic digest shape and verify the digest against the evidence artifact.
6. Add negative tests for symbolic/fabricated hashes, mutated evidence bytes, missing artifacts, unsupported countries, and stale effective windows.
7. Extend the statutory production gate so this condition reports blocked, then rerun the fixture, hardcode, and production gates.

## Handoff Decision

Do not start the payments/declarations proof tranche as a production-readiness claim yet. Skill 13 may be inspected in read-only mode, but implementation that relies on country-pack statutory proof should wait until the source-artifact provenance blocker is closed.

## Evidence Intake and Fail-Closed Gate Follow-Up

The next bounded remediation was completed without changing any statutory formula or asserting expert approval.

Official CNPS sources were captured under `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/`:

- Decree No. 2016/072 contribution-rates PDF: `sha256:1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61`
- CNPS employer general-rules HTML: `sha256:bc51f74de8dd3b0c7babd86e8f98d92dbdbece214480f66ac89c42d3e894a868`

The manifest is explicitly `PENDING_EXPERT_REVIEW` with `productionUseAllowed: false`. Artifact capture does not certify legal interpretation or fixture correctness.

The statutory production gate now:

- recomputes SHA-256 from retained artifact bytes;
- requires every country-pack `sourceEvidenceHash` to be a real digest present in the manifest;
- requires expert-reviewed or regulator-confirmed manifest status before production use;
- blocks path traversal through manifest filenames;
- fails closed when artifacts are missing, mutated, symbolic, or awaiting approval.

Updated gate result:

- checks ready: `10/12`;
- blockers: `2`;
- `source_artifact_hash_verification`;
- `source_artifact_expert_approval`;
- fail-mode exit: `1`, verified as the expected result.

JavaScript syntax checks passed for the gate and its focused test. The Jest wrapper did not complete within two attempts (120 and 180 seconds) in the current relocated-dependency/large-process environment, so no Jest-pass claim is made for this follow-up. Direct gate execution and fail-mode behavior were verified.

### Revised baseline-gap delta

| Measure | Before follow-up | After follow-up | Delta |
| --- | ---: | ---: | ---: |
| Statutory gate checks | 10 | 12 | +2 provenance checks |
| Gate-reported blockers | 0 | 2 | False green closed |
| Official source artifacts retained | 0 | 2 | +2 |
| Real artifact digests recorded | 0 | 2 | +2 |
| Qualified approvals recorded | 0 | 0 | unchanged; still blocked |
| Statutory formulas changed | 0 | 0 | 0 |

The remaining next action is human/expert review: bind reviewer identity, approval evidence, effective dates, and approved fixture families to the manifest. Only after that approval may the symbolic country-pack hashes be replaced with the captured artifact digests and the gate be rerun.

### Signed-approval verification hardening

The expert-approval check now additionally requires:

- a non-empty reviewer identity and review timestamp;
- an effective-from date;
- explicit approval of all four required CNPS fixture families;
- a basename-only signed approval artifact path;
- a 64-character SHA-256 digest for the approval artifact;
- recomputation of that digest from the retained approval artifact bytes.

The focused statutory-gate suite passed after constraining Jest's root to `scripts/`, avoiding the deeply nested copied workspaces under `what-next/`: 1 suite and 6 tests passed. This successful run supersedes the earlier Jest-wrapper timeout note above. The production gate remains correctly blocked at 10/12 until a qualified reviewer supplies the signed approval artifact and the country-pack hashes are bound to the retained source evidence.

## Skill 17 Prerequisite Rerun — 2026-07-19

This Skill 12 gate was rerun after Skill 17 correctly stopped on its unsatisfied statutory prerequisites.

### Current evidence state

- Both retained CNPS source files were independently rehashed from disk.
- The decree PDF still matches `1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61`.
- The employer-rules HTML still matches `bc51f74de8dd3b0c7babd86e8f98d92dbdbece214480f66ac89c42d3e894a868`.
- `manifest.json` remains `PENDING_EXPERT_REVIEW` with `productionUseAllowed: false`.
- `requiredApproval.approvalArtifactFile` remains `null`.
- No additional candidate signed-approval artifact is present in the evidence folder.
- The review-decision template contains no reviewer identity, fixture-family decision, effective window, final decision, or signature evidence.

### Fresh gates

| Gate | Result |
| --- | --- |
| Retained artifact byte/digest verification | Passed: 2/2 artifacts match the manifest |
| Country-pack, fixture-runner, statutory-gate, and regulatory-hardcode Jest suites | Passed: 4 suites, 38 tests |
| Golden fixture tie-out | Passed within the focused fixture-runner suite |
| Unsupported-country fail-closed behavior | Passed within the focused country-pack suite |
| Symbolic/mutated hash and approval-artifact rejection | Passed within the focused statutory-gate suite |
| Full regulatory-hardcode fail gate | Passed on definitive rerun: 0 active findings |
| Statutory country-pack production fail gate | Expected block: 10/12 ready, exit code 1 |

The first full hardcode scan transiently reported one finding in a dated documentation snapshot. Direct detector execution returned no finding for that excluded path, a fresh full scan returned none, and the definitive gate rerun passed. No documentation or scanner code was changed.

### Current blockers and delta

| Measure | Before rerun | After rerun | Delta |
| --- | ---: | ---: | ---: |
| Retained source artifacts with matching digests | 2 | 2 | 0 |
| Focused Jest tests passing | 38 | 38 | 0 |
| Statutory gate checks ready | 10/12 | 10/12 | 0 |
| Statutory gate blockers | 2 | 2 | 0 |
| Qualified approvals retained | 0 | 0 | 0 |
| Statutory formulas changed | 0 | 0 | 0 |

The two enforced blockers remain:

1. `source_artifact_hash_verification` — the production country pack still declares symbolic `sourceEvidenceHash` values because no qualified decision authorizes fixture-to-artifact binding.
2. `source_artifact_expert_approval` — no completed qualified review or signed approval artifact exists.

No formula, fixture expectation, country-pack hash, production-use flag, reviewer field, or approval field was changed. Development authorization cannot substitute for qualified statutory review.

### Handoff decision after rerun

Skill 13 remains blocked as a production-readiness tranche. The next action is external qualified review using `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/QUALIFIED_REVIEW_INTAKE.md` and `review-decision.template.json`.

After the signed decision is retained and hashed, an authorized operator may update the manifest and approved fixture bindings, rerun this Skill 12 gate, and proceed to Skill 13 only if all 12 checks pass.
