# Stoquify production-unblocking execution register

**Started:** 22 August 2026  
**Starting branch:** `codex/service-boundary-burndown`  
**Starting commit:** `7736416bd57fc45d3b618ba397850d39320ac3e1`  
**Program method:** One Goal Agent; one active code-changing work package; external evidence may be collected in parallel but cannot promote the program  
**Production authorization:** `NO`

## Promotion rule

A package advances only after its required implementation evidence, independent verification, owner acceptance, and decision artifact are saved under `evidence/WP-XX/`. Any HIGH or CRITICAL invariant failure blocks promotion. No local, static, fixture, or sandbox result may be relabelled as production proof.

## Work-package register

| Package | Status | Decision | Active boundary |
|---|---|---|---|
| WP0 — Program control and live baseline | BLOCKED_EXTERNAL_INPUT | NO_PROMOTION | Owner identities, acceptance references, and pilot-scope approval |
| WP1 — Release-verification ratification | NOT_AUTHORIZED | PENDING_WP0 | Current-candidate build, migration, and authenticated smoke |
| WP2 — Ordered internal gap-plan sweep | NOT_AUTHORIZED | PENDING_WP1 | Proof, invalidation, assurance, access, provider, dashboard, narrow enforcement |
| WP3 — Skill 015 promotion and conformance | NOT_AUTHORIZED | PENDING_WP0_WP1 | Official DGI contract and external sandbox evidence |
| WP4 — Statutory expert approval | NOT_AUTHORIZED | PENDING_WP3 | Qualified reviewer and independent checker |
| WP5 — Managed secrets/provider evidence | NOT_AUTHORIZED | PENDING_WP0 | Managed references, credential rotation, callback and provider proof |
| WP6 — Managed database/migration certification | NOT_AUTHORIZED | PENDING_WP0 | Exact-hash approvals, managed target, backup/restore and reconciliation |
| WP7 — Operational and resilience readiness | NOT_AUTHORIZED | PENDING_WP5_WP6 | CI, scheduler, alerting, observability, DR and owners |
| WP8 — UX, accessibility, localization and support | NOT_AUTHORIZED | PENDING_WP2_WP7 | Authenticated EN/FR human-facing evidence |
| WP9 — Clean immutable freeze | NOT_AUTHORIZED | PENDING_WP2_WP4_TO_WP8 | Candidate manifest, hashes and approvals |
| WP10 — Full release verification and Gate 017 | NOT_AUTHORIZED | PENDING_WP9 | Policy chain, `verify:release`, enterprise and Phase 2B gates |
| WP11 — Controlled pilot | NOT_AUTHORIZED | PENDING_WP10 | Allowlisted monitored pilot and rollback |
| WP12 — Phase 3 production decision | NOT_AUTHORIZED | PENDING_WP11 | Artifact-bound 34-check independent decision |

## WP0 live findings

- Document archive: prompt Markdown/PDF and roadmap Markdown/PDF saved and validated under `docs/gates-and-blockers/`.
- Country Adapter Pilot: READY `16/16`; production authority certified: no.
- Statutory country pack: BLOCKED `11/12`; missing `source_artifact_expert_approval`.
- Migration safety: BLOCKED `8/9`; 13 exact-hash destructive findings remain unapproved.
- Raw-error boundary: BLOCKED; 8 active medium findings and 125 allowed findings.
- Enterprise release: BLOCKED; 3/12 ready, 9 open, 9 human interventions required.
- External evidence intake: `EXTERNAL_EVIDENCE_REQUIRED`; 1/6 checks passed, 70 blockers.
- Former Windows report lock: not reproduced; the file accepted an exclusive read/write open. Treat as a closed environment-specific blocker unless CI reproduces it.
- B02 payroll immutability proof: READY within the isolated non-production PostgreSQL control; 9/9 triggers, 14/14 forbidden mutations, and 3/3 allowed lifecycle transitions passed. This is not production-database proof or production authorization.
- Git state at request start: only the prior user-requested roadmap was untracked; no unrelated inherited modification was present.

## WP0 promotion blockers

1. Database owner identity, acceptance reference, and accepted-at time are missing.
2. Managed-secrets owner identity, acceptance reference, and accepted-at time are missing.
3. Statutory owner identity, acceptance reference, and accepted-at time are missing.
4. Credential-rotation owner identity, acceptance reference, and accepted-at time are missing.
5. Operations owner identity, acceptance reference, and accepted-at time are missing.
6. Product, security, release, rollout, rollback, support, pilot, incident, on-call, accessibility, reviewer, checker, provider, and final-review identities are not yet bound.
7. Cameroon is the existing technical pilot, but the pilot country and bounded capability scope lack an explicit steering decision.

No identity, approval, reference, or production authority was fabricated.

## Immediate handoff

WP0 remains the only active package. Supply the named owner/approver identities and references using the schemes accepted by the existing gates, and explicitly approve or replace the proposed Cameroon DGI pilot scope. After independent validation, WP0 may issue `APPROVED_FOR_WP1_AND_EXTERNAL_EVIDENCE_COLLECTION`.

