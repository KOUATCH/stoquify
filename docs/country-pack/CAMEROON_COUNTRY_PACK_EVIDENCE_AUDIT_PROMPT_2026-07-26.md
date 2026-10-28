# Cameroon Country-Pack Evidence Audit Prompt

Review the complete Cameroon country-pack evidence packet at:

`docs/HR-Payroll/evidence/country-packs/CM/2026-07-19`

Determine exactly what is required to complete the statutory country-pack approval workflow legitimately and without avoidable implementation friction.

## Required work

1. Inventory every source artifact, manifest, review template, handoff document, hash, legal reference, fixture family, effective date, and approval requirement in the packet.
2. Validate file existence, byte length, SHA-256 integrity, internal consistency, and traceability between the retained sources, `manifest.json`, the review decision, and the country-pack implementation.
3. Extract all information that can be established objectively from the existing evidence.
4. Identify every field that cannot legitimately be completed from repository evidence, including reviewer identity, professional qualifications, independent legal interpretation, conflict-of-interest declaration, fixture approval decisions, signatures, and production authorization.
5. Prepare—but do not fabricate, infer, or self-approve—the reviewer and authorized-operator artifacts required by the workflow.
6. Produce an exact maker–checker workflow covering:
   - qualified reviewer appointment;
   - independent source-hash recomputation;
   - fixture-family review and independent tie-out;
   - signed approval;
   - reviewer and signature verification;
   - controlled manifest transition;
   - replacement of symbolic `sourceEvidenceHash` values;
   - final country-pack and release-gate execution.
7. Map each blocker to its precise evidence requirement, responsible owner, file, field, command, and acceptance criterion.
8. Run all safe, read-only integrity and preflight checks.
9. Do not disable, weaken, bypass, mock, or hardcode any gate. Preserve `productionUseAllowed: false` until authentic qualified approval is complete.
10. Return:
    - information extracted;
    - evidence already complete;
    - evidence still missing;
    - artifacts prepared;
    - actions requiring a qualified human reviewer;
    - actions requiring an authorized operator;
    - exact remediation sequence;
    - commands to rerun;
    - final readiness decision.

## Success criteria

The packet is as complete and reviewer-ready as repository evidence permits, with:

- no fabricated approval or identity;
- no premature production-state transition;
- every objective artifact and hash independently validated;
- every human-authority dependency clearly assigned;
- a precise path to a 12/12 qualified-review preflight;
- a precise path to a 12/12 production country-pack gate;
- a final enterprise release-gate rerun after those conditions pass.
