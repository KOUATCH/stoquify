# Cameroon Country-Pack Statutory Gate Unblock Handoff - 2026-07-19

Status: `PENDING_EXPERT_REVIEW`  
Production use allowed: `false`  
Current gate result: blocked by `source_artifact_hash_verification` and `source_artifact_expert_approval`

## Purpose

This packet is the reviewer-ready handoff for unblocking the Cameroon statutory country-pack production gate. It verifies the captured source artifacts, identifies the remaining approval gap, and records the exact updates that must occur only after qualified statutory review is complete.

This handoff is not an approval, legal certification, tax opinion, payroll opinion, or regulator confirmation.

## Verified Source Artifacts

| Legal ref | File | Manifest SHA-256 | Actual SHA-256 | Result |
| --- | --- | --- | --- | --- |
| CM_CNPS_CONTRIBUTION_DECREE_2016 | `CNPS-Decree-2016-072-contribution-rates.pdf` | `1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61` | `1e88f488d96e163ded9e204c100c5bbce9e8d4917e6e72387ec6af52e0c90b61` | match |
| CM_CNPS_EMPLOYER_RULES | `CNPS-employer-general-rules.html` | `bc51f74de8dd3b0c7babd86e8f98d92dbdbece214480f66ac89c42d3e894a868` | `bc51f74de8dd3b0c7babd86e8f98d92dbdbece214480f66ac89c42d3e894a868` | match |

## Current Code Hash Gap

The manifest artifacts hash correctly, but the production country-pack source still declares symbolic evidence hashes:

| Declared sourceEvidenceHash | Occurrences | SHA-256 format | Matches manifest artifact |
| --- | ---: | --- | --- |
| `sha256:cm-cnps-regulator-confirmed-2026` | 7 | False | False |

Because the statutory gate requires every `sourceEvidenceHash` in `services/regulatory/country-packs/cameroon.ts` to be a real `sha256:<64 hex>` value matching a retained manifest artifact, `source_artifact_hash_verification` must remain blocked until the post-review update is made.

## Qualified Reviewer Must Complete

A qualified statutory reviewer must complete `review-decision.template.json` or an equivalent signed artifact with:

- Reviewer identity, professional capacity, organization, qualification reference, and conflict-of-interest declaration.
- Review start and completion timestamps.
- Independent digest recomputation for both retained source artifacts.
- Decision for each required fixture family:
  - `payroll.cnps.pensionRatesBps`
  - `payroll.cnps.familyAllowanceRatesBps`
  - `payroll.cnps.occupationalRiskRatesBps`
  - `payroll.cnps.employerRules`
- Source provision references and effective-date scope for each approved family.
- Final decision, exclusions if any, and conditions if any.
- Signed approval artifact filename, SHA-256 hash, timestamp, and signature method.

## Post-Approval Operator Steps

Only after the signed approval artifact is retained in this folder:

1. Recompute and record the approval artifact SHA-256.
2. Update `manifest.json` so `reviewStatus` is `EXPERT_REVIEWED` or `REGULATOR_CONFIRMED`.
3. Set `productionUseAllowed` to `true` only if the reviewer explicitly approved production use.
4. Set each approved source artifact `reviewStatus` and `productionUseAllowed` consistently with the reviewer decision.
5. Fill `requiredApproval.reviewerIdentity`, `reviewedAt`, `effectiveFrom`, `approvalArtifactFile`, `approvalArtifactHash`, and all approved fixture families.
6. Replace the symbolic `sourceEvidenceHash` values in `services/regulatory/country-packs/cameroon.ts` with real manifest artifact hashes in `sha256:<64 hex>` format.
7. Rerun `npm run statutory:country-pack:gate`.
8. If it passes, rerun `npm run policy:gates`.

## Current Safe Decision

Do not change production readiness flags or public/product claims yet. The correct status is blocked until qualified review approval exists and the code-to-artifact hash link is made with real retained evidence hashes.
