# AqStoqFlow / Stoquify blocker-gate control plane — next actions

Prepared: 2026-08-18  
Run type: architecture and implementation-readiness assessment  
Implementation performed: no

## Outcome

The recommended system is an additive **Approval, Attestation, Evidence and Gate extension to the existing Workflow Assurance module**. A new standalone service and a complete in-house e-signature platform are not justified for the first implementation.

Stoquify already has the control-tower, assurance checks/runs/findings/incidents, alerts, waivers, fresh authentication, RBAC, business events/outbox, evidence redaction and strong domain sign-off patterns needed for the foundation.

The next build must supply:

1. authoritative governance role/delegation records;
2. artifact and canonical-digest versioning;
3. versioned decision/approval policies;
4. authenticated approval entries and evidence envelopes;
5. independent verification; and
6. a verified manifest adapter into the existing G1 gate.

## Current verified state

- G1 technical checks: 13/13 pass.
- G1 authenticated decisions: 0/11.
- Required G1 decision-role entries: 33.
- POS program: 0/10 gates passed; first blocker G1.
- G1 contract SHA-256 independently verified:
  `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db`
- Prisma schema validation: pass.
- TypeScript typecheck: pass.
- Focused G1/program suites: 2 passed; 4 tests passed.
- `policy:gates`: skipped because the candidate is not eligible.
- `verify:release`: skipped because the candidate is not eligible.
- Production authorization: false.

## Required human decisions before implementation

1. Name the owner of the authoritative governance-role roster.
2. Approve stable authority codes and their scope/effective-date rules.
3. Confirm which same-person multi-role combinations G1 permits or forbids.
4. Define accepted qualification evidence for Cameroon and accounting reviewers.
5. Approve evidence retention, redaction and export policies.
6. Decide whether any G1 decision requires an external e-signature provider or whether authenticated internal attestation is sufficient.
7. Approve the proposed architecture ADR.

Do not fill these values from ambiguous DOCX names or ordinary application roles.

## Recommended implementation order

1. Complete Phase 0 governance decisions.
2. Build and test the versioned canonical-digest contract.
3. Review the additive Prisma model design.
4. Implement authority/delegation and artifact registries.
5. Import the exact G1 artifact and decision policy; assert 11 decisions/33 obligations.
6. Implement fresh-authenticated approval entries and evidence envelopes.
7. Implement independent verification and invalidation.
8. Generate a verified G1 manifest and compare it with the existing gate.
9. Extend the Assurance Control Tower and approval inbox.
10. Move from observe mode to enforcement only after parity, security and governance review.

## Safety boundary

- Agents may collect and explain evidence but cannot approve.
- Application roles cannot silently become governance authority.
- Existing handwritten images remain non-authoritative attachments.
- Historical evidence remains preserved and superseded, not overwritten.
- The current G1 gate remains fail closed throughout the transition.
- No code or migration should be implemented until the authority source and G1 policy decisions are approved.

## Artifacts produced

- `docs/blockers-and-gates/BLOCKER_GATE_CONTROL_PLANE_PLAIN_LANGUAGE_GUIDE_2026-08-18.md`
- `docs/blockers-and-gates/BLOCKER_GATE_CONTROL_PLANE_CURRENT_STATE_ASSESSMENT_2026-08-18.md`
- `docs/blockers-and-gates/BLOCKER_GATE_CONTROL_PLANE_TARGET_ARCHITECTURE_2026-08-18.md`
- `docs/blockers-and-gates/BLOCKER_GATE_CONTROL_PLANE_IMPLEMENTATION_PLAN_2026-08-18.md`
- `docs/blockers-and-gates/BLOCKER_GATE_CONTROL_PLANE_CONTROL_CATALOG_2026-08-18.json`
- `docs/blockers-and-gates/BLOCKER_GATE_CONTROL_PLANE_ARCHITECTURE_DECISION_2026-08-18.md`
- `docs/blockers-and-gates/BLOCKER_GATE_CONTROL_PLANE_ARTIFACT_MANIFEST_20260818.sha256`

PDF twins are generated for the four principal reports.

## Next authorization point

The next safe execution prompt is:

> Implement Phase 0 and prepare the reviewed additive schema design for the G1 authority, artifact, policy, approval, evidence-envelope and verification pilot. Do not generate or apply a migration until the schema design and governance authority-source decisions are approved.
