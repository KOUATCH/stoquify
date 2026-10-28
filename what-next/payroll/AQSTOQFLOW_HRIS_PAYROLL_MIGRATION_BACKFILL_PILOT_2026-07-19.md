# AqStoqFlow HRIS/Payroll Migration and Backfill Pilot

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-17-migration-backfill-pilot`  
Status: **Stopped — statutory and downstream proof prerequisites are not satisfied**  
Next handoff: `aqstoqflow-hris-payroll-18-final-readiness` is blocked; return first to `aqstoqflow-hris-payroll-12-country-pack-provenance`.

## Executive Decision

Do not execute a fresh migration/backfill pilot or advance to final readiness from the current evidence state.

The existing 2026-07-17 local pilot artifacts demonstrate a useful dry-run planner, stable hashes, correction-only rollback, redaction, and fail-closed behavior. They are historical controlled-pilot evidence, not current unrestricted-release evidence. Skill 17 explicitly requires country-pack provenance, payments/declarations proof, and close assurance as prerequisites. The current chain is not satisfied:

- the statutory production gate is blocked at 10/12;
- `source_artifact_hash_verification` is not ready;
- `source_artifact_expert_approval` is not ready;
- Skill 13 is stopped because Skill 12 is not satisfied;
- Skill 14 verified focused fail-closed controls but withheld end-to-end production certification.

The user's development authorization and the 2026-07-17 owner acceptance are valid only for controlled local development/pilot work. They do not constitute qualified Cameroon statutory approval and cannot unblock these prerequisite gates.

No database command, remediation script, pilot CLI, production migration, or tenant mutation was run in this tranche.

## Scope Inspected

- `C:/Users/J COMPUTER/.codex/skills/aqstoqflow-hris-payroll-17-migration-backfill-pilot/SKILL.md`
- `docs/HR-Payroll/README.md`
- the governing HRIS/payroll blueprint, deep analysis, execution roadmap, and skill-system blueprint
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_INPUT_READINESS_GATE_2026-07-19.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SNAPSHOT_CORRECTION_2026-07-19.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_COUNTRY_PACK_PROVENANCE_2026-07-19.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PAYMENTS_DECLARATIONS_PROOF_2026-07-19.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ACCOUNTING_CLOSE_ASSURANCE_2026-07-19.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_BROWSER_ACCESSIBILITY_RELEASE_2026-07-19.md`
- `what-next/statutory-country-pack-production-readiness.json`
- `services/hris/migration-backfill-pilot.service.ts`
- `services/hris/__tests__/migration-backfill-pilot.service.test.ts`
- `scripts/hris-migration-backfill-pilot.ts`
- `scripts/hris-migration-backfill-pilot.js`
- `scripts/hris-migration-pilot-remediate-local.js`
- the 2026-07-17 dry-run, rerun, remediation, fail-gate, signoff-ready, owner-acceptance, and final-readiness artifacts
- the available consolidated architecture graph in `graphify-out/`

The documented split action graph was not present. The consolidated graph contains the payroll pilot-cycle certification surface, but it does not provide current indexed coverage for the HRIS migration pilot implementation. Direct source and evidence inspection therefore remained authoritative for this tranche.

## Existing Pilot Evidence Audit

The latest historical signoff-ready evidence reports:

| Control | Historical result |
| --- | --- |
| Tenant | Redacted reference for `org_payroll_e2e_local` |
| Dry-run only | Yes |
| Mutation mode available | No |
| Employees scanned | 1 |
| Adoptable projections | 1 |
| Legacy-unverified projections | 0 |
| Blockers/warnings | 0 / 0 |
| Rollback strategy | `CORRECTION_ONLY` |
| Mutation/destructive-operation count | 0 / 0 |
| Immutable evidence preserved | Yes |
| Close-pack state embedded in JSON | `PENDING_OWNER_SIGNOFF` |

The post-remediation rerun and signoff-ready artifacts contain the same stable hashes:

- source projection: `sha256:505d71157d80e7a4111f22c1aec277e260f3d966432d1e42bd20787fe9895c6c`;
- correction plan: `sha256:4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`;
- immutable evidence before/after: `sha256:b6669fa086160dcf839c8eef3a18295cde6bd0e59bb1575ea3145c42eeefbc46`;
- reconciliation: `sha256:fd48b8f98d09e01b0d6630f78718f2207edd461bdc8dc8e7e3401555740cccfa`;
- plan: `sha256:3a04f52c32263fb704b9905f31dfac7562a677e3cd17f27097b621796a41db4d`.

This supports historical idempotency and reversibility for that local snapshot. It does not prove that the current database snapshot, schema, statutory evidence, or downstream proof chain is ready today.

## Data Ownership

- HRIS owns employee identity, source lineage, contracts, approvals, compensation facts, payment-destination provenance, and People Core adoption decisions.
- Payroll may retain compatibility storage during transition but must consume only certified HRIS-backed facts.
- Accounting owns ledger truth and must not be reconciled against unproven migrated facts.
- Assurance owns dry-run evidence, hashes, reconciliation, close-pack state, and signoff lineage.

The migration planner must not create a second employee master, infer HRIS facts from payroll outputs, or rewrite immutable payroll history.

## Tenant and RBAC Decision

- The historical pilot is scoped to the deterministic local tenant `org_payroll_e2e_local` and uses a redacted organization reference.
- The migration service queries the selected organization and tenant-owned compatibility records; mutation mode is intentionally unavailable in the planner.
- Existing controlled-local owner acceptance does not authorize another tenant, production data, cross-tenant rollout, or unrestricted release.
- No permission or tenant boundary was changed in this tranche.

## Audit and Redaction Decision

- No tenant data was read through a newly executed pilot command in this tranche.
- No database mutation or correction event was created.
- No owner or statutory signoff was self-issued.
- Existing evidence is redacted and declares that raw person data, salary, payment-destination values, documents, and proof hashes are excluded.
- Historical rollback evidence is correction-only, with zero mutation and destructive-operation counts and unchanged immutable-evidence hashes.
- The local remediation script remains restricted to non-production organization IDs ending in `_local`, but it was not executed.

## Gates Run

| Gate | Result |
| --- | --- |
| Skill 17 contract and prerequisites | **Failed/blocked** |
| Current statutory country-pack production gate | **Blocked: 10/12 ready** |
| Source artifact hash verification | **Blocked** |
| Qualified source artifact expert approval | **Blocked** |
| Skill 13 payments/declarations prerequisite | **Stopped upstream** |
| Skill 14 end-to-end close certification | **Withheld upstream** |
| Historical dry-run/rerun hash comparison | Passed for the 2026-07-17 local snapshot |
| Historical rollback/correction evidence | Passed for the 2026-07-17 local snapshot: zero mutations and immutable evidence preserved |
| Historical controlled-local owner acceptance | Present, explicitly not production or statutory approval |
| Fresh pilot CLI, fail gate, and database reconciliation | Not run because prerequisites failed |

## Current Blockers

1. Bind each active Cameroon source-evidence reference to a retained authoritative artifact with a real 64-character SHA-256 digest.
2. Retain qualified signed expert approval that identifies the reviewer, professional capacity, reviewed artifact hashes, effective dates, fixture-family decisions, and approval date.
3. Rerun Skill 12 and obtain a passing 12/12 statutory production gate.
4. Rerun Skill 13 against the corrected country-pack provenance and close payment/declaration proof blockers.
5. Rerun Skill 14 and obtain current end-to-end accounting-close assurance.
6. Rerun Skill 17 against a stable current tenant snapshot, then capture fresh dry-run diff, idempotency rerun, fail-gate, reconciliation, rollback/correction simulation, and close-pack signoff.

## Skipped Checks

- Fresh tenant dry run and dry-run diff.
- Current database reconciliation.
- Current idempotency rerun.
- Current rollback/correction simulation.
- Current fail-closed CLI execution.
- Remediation script execution.
- Production migration or backfill.
- Full repository test, typecheck, lint, build, and release gates.

These checks were skipped because the Skill 17 workflow requires an immediate stop when a prerequisite fails. Running them would create misleading current-readiness evidence.

## Residual Risk

- The 2026-07-17 evidence can drift from the current schema, tenant snapshot, and control implementation.
- Historical hash stability proves repeatability only for that captured local snapshot.
- The embedded close pack remains `PENDING_OWNER_SIGNOFF`; the separate user acceptance narrows this to controlled local development and cannot be promoted to statutory or production approval.
- The consolidated architecture graph does not currently index the HRIS migration pilot surface, reducing graph-based impact confidence until the graph is refreshed.
- A fresh pilot cannot establish production readiness while upstream statutory and proof gates remain blocked.

## Handoff Decision

Do not hand off to `aqstoqflow-hris-payroll-18-final-readiness`.

Return to `aqstoqflow-hris-payroll-12-country-pack-provenance` for evidence binding and qualified approval. After Skills 12, 13, and 14 pass, rerun this Skill 17 pilot against the current tenant snapshot. Only a fresh reversible, idempotent, reconciled, redacted, and signed-off pilot may proceed to Skill 18.
