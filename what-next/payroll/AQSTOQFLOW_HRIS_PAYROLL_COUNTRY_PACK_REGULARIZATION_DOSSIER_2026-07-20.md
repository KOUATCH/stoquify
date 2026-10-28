# Cameroon Country-Pack Regularization Dossier

Date: 2026-07-20  
Scope: CM country pack `CM-2026.1` only  
Decision: engineering preparation may continue; production statutory reliance remains blocked.

## Executive finding

The development path is already open and must remain separate from the production approval path. The engineering development gate passes 11/11, while the production gate passes 10/12. The new qualified-review preflight passes 4/12 and identifies eight evidence conditions that only a qualified reviewer and authorized checker can close. No formula, reviewer field, approval record, or `productionUseAllowed` value was changed.

Development authorization permits synthetic calculation, integration, negative-path, UI, sandbox/UAT, redaction, idempotency, reconciliation, and failure-mode testing where no real payment, filing, declaration, or other legal effect can occur. It does not substitute for qualified statutory approval.

## Condition matrix

| Order | Condition | Current result | Accountable owner | Required evidence or action | Completion test |
|---:|---|---|---|---|---|
| 1 | Manifest parses | PASS | Engineering | Retained `manifest.json` | Preflight `manifest_present_and_parseable` passes |
| 2 | Review decision parses | PASS | Engineering / reviewer | Work from a copy named `review-decision.json`; retain the template unchanged | Preflight `decision_present_and_parseable` passes |
| 3 | Captured sources match manifest | PASS | Engineering | Both retained source files match recorded byte lengths and SHA-256 values | Preflight `source_artifact_integrity` passes |
| 4 | Reviewer identity and qualification | BLOCKED | Compliance/legal owner | Verify full name, professional capacity, organization, qualification reference, and conflict-of-interest declaration | `reviewer_identity_complete` passes; qualifications are independently validated |
| 5 | Review window | BLOCKED | Qualified reviewer | Record valid `startedAt` and `completedAt`; completion cannot precede start | `review_window_complete` passes |
| 6 | Independent source digest recomputation | BLOCKED | Qualified reviewer | Independently hash both retained source artifacts and set each recomputation attestation only after comparison | `reviewer_recomputed_source_digests` passes |
| 7 | Fixture-family decisions | BLOCKED | Qualified reviewer | For each of the four required families, record decision, exact source provision, effective window, and independent tie-out hash | `fixture_family_decisions_complete` passes |
| 8 | All required families approved | BLOCKED | Qualified reviewer | Resolve every `REJECTED` or `CHANGES_REQUIRED` result through a new engineering/review cycle; do not override it | `all_required_fixture_families_approved` passes |
| 9 | Final decision consistency | BLOCKED | Qualified reviewer | Final decision is `APPROVED`, all four families are listed, no unapproved family is silently excluded, effective dates are valid, and production use is explicitly allowed | `final_decision_consistent` passes |
| 10 | Signed approval metadata | BLOCKED | Qualified reviewer | Retain signed approval filename, SHA-256, signing time, and signature method | `signed_approval_metadata_complete` passes |
| 11 | Signed artifact verification | BLOCKED | Authorized checker | Independently hash the retained signed artifact and compare it with the decision packet | `signed_approval_artifact_verified` passes |
| 12 | No premature manifest activation | PASS | Authorized maker/checker | Keep `reviewStatus: PENDING_EXPERT_REVIEW` and `productionUseAllowed: false` until conditions 1–11 pass | `manifest_transition_not_premature` passes |

Required fixture families:

- `payroll.cnps.pensionRatesBps`
- `payroll.cnps.familyAllowanceRatesBps`
- `payroll.cnps.occupationalRiskRatesBps`
- `payroll.cnps.employerRules`

## Dependency-ordered execution roadmap

1. Engineering freezes the evidence directory and reruns source integrity, development, fixture, unsupported-country, and regulatory-hardcode checks.
2. The compliance/legal owner commissions a demonstrably qualified Cameroon payroll/social-security reviewer and validates qualifications and conflicts.
3. The reviewer works from `review-decision.template.json`, saves the completed packet as `review-decision.json`, independently recomputes both source digests, and reviews all four fixture families.
4. Any `REJECTED` or `CHANGES_REQUIRED` family returns to engineering. Engineering changes only the affected fixture or implementation, adds regression evidence, and sends a new version for review. Prior evidence remains retained.
5. When every family is approved, the reviewer records the internally consistent final decision and provides a signed approval artifact.
6. An independent authorized checker verifies reviewer identity, decision completeness, source hashes, tie-out hashes, signature metadata, and signed-artifact SHA-256.
7. Run `npm run statutory:country-pack:review:preflight`. Continue only when it reports `READY_FOR_AUTHORIZED_MANIFEST_TRANSITION`.
8. Under maker-checker control, update the manifest approval fields and bind approved source-evidence hashes. Set `productionUseAllowed: true` only when the signed final decision explicitly permits it. This is a separate reviewed change.
9. Rerun the preflight and the production country-pack gate. Both must pass; the production gate target is 12/12.
10. Rerun Skills 13, 14, 17, and 18 for payment/declaration proof, accounting-close assurance, migration/backfill, and final readiness. Production remains blocked until those downstream gates pass.

## Qualified reviewer checklist

- Confirm personal identity, professional capacity, organization, qualification reference, jurisdictional competence, and conflict status.
- Verify that each source artifact is authoritative, applicable to the effective period, complete, and not superseded.
- Independently recompute each retained source SHA-256; do not rely only on the manifest value.
- Review each required fixture family against an exact source provision.
- Independently recalculate golden fixtures and retain a `sha256:<64 lowercase hex>` tie-out digest per family.
- Record effective-from and, when applicable, effective-to dates.
- Use only `APPROVED`, `REJECTED`, or `CHANGES_REQUIRED` for family decisions.
- Make the final decision consistent with the family decisions; never approve a rejected or incomplete family.
- Explicitly decide whether production use is allowed and record limitations or conditions.
- Sign the approval artifact through an attributable method and provide its hash and signing timestamp.

## Internal engineering and operator checklist

- Copy the template; never overwrite the blank reference template.
- Do not invent reviewer data, legal provisions, fixture decisions, effective dates, or signatures.
- Do not modify formulas merely to make a gate pass.
- Keep evidence tenant-neutral and free of employee personal data, credentials, payment destinations, and secrets.
- Preserve append-only evidence history; supersede packets rather than deleting failed reviews.
- Require maker-checker separation for the manifest transition.
- Confirm country and version alignment between manifest and decision packet.
- Confirm every file reference is a basename within the evidence directory; prevent path traversal.
- Rerun the bounded tests and gates below and retain their output.

## Commands and expected outcomes

```powershell
npm run statutory:country-pack:dev:gate
npm run statutory:country-pack:review:preflight
npm run statutory:country-pack:gate
npm run regulatory:hardcode:fail
```

Current expected state:

- Development gate: `READY_FOR_DEVELOPMENT_TESTING`, 11/11.
- Qualified-review preflight: `BLOCKED_PENDING_QUALIFIED_REVIEW`, 4/12.
- Production gate: blocked, 10/12.
- Regulatory hardcode gate: pass with zero findings.

After genuine review evidence and the controlled manifest transition:

- Qualified-review preflight: `READY_FOR_AUTHORIZED_MANIFEST_TRANSITION`, 12/12.
- Production country-pack gate: 12/12.
- These results are necessary but not sufficient for overall production release; downstream Skills 13, 14, 17, and 18 must also pass.

## Stop conditions

Stop immediately and leave production fail-closed if any source or signed-artifact hash drifts; reviewer identity or qualifications cannot be verified; a conflict is unresolved; a fixture is rejected or requires changes; a legal provision or effective window is missing; the signature cannot be attributed; the decision and manifest disagree; or any test invokes a real payment, production authority endpoint, or legally effective declaration.

## Rollback and correction

Before rollout, revert only the controlled manifest/code-binding change and keep all review evidence. After any publication or downstream use, do not erase history: set production use fail-closed, unpublish or supersede the affected pack, invalidate dependent snapshots and proofs, identify impacted payroll runs, and execute the approved correction/reconciliation workflow. A corrected pack requires a new versioned review packet and approval.

## Audit, access, and redaction

The packet contains no tenant or employee data. Access to reviewer identity and signed artifacts should be limited to compliance/legal, authorized maker-checker operators, security/privacy audit, and named assurance reviewers. Reports may expose filenames, status, and hashes but must not copy signatures, credentials, private contact data, or source-document contents. Every packet transition must retain actor, role, timestamp, previous status, new status, reason, and evidence hashes.

## Gate transitions

```mermaid
flowchart LR
  A["Development: 11/11"] --> B["Synthetic and external sandbox/UAT only"]
  B --> C["Qualified review packet"]
  C --> D["Review preflight: 12/12"]
  D --> E["Maker-checker manifest transition"]
  E --> F["Production country-pack gate: 12/12"]
  F --> G["Skills 13, 14, 17, and 18"]
  G --> H["Controlled production rollout"]
```

## Residual risk and handoff

Engineering automation can prove packet shape, integrity, consistency, fail-closed behavior, and auditability. It cannot prove that Cameroon law was interpreted correctly. The next accountable handoff is to the compliance/legal owner to appoint and validate the qualified reviewer. Engineering can continue non-production HRIS/payroll testing in parallel under the development restrictions above.
