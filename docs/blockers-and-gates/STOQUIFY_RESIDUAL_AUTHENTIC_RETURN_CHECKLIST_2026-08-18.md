# Stoquify residual authentic-return checklist — 2026-08-18

Use this as the intake contract for every remaining blocker. Do not place secret values in repository evidence. A return is accepted only when its identity, role, authority, timestamp, target hash, decision, and retained artifact validate under the named live consumer.

## Immediate repository-owned correction

| Priority | Owner / role | Exact field or control | Required return format | Target path | Acceptance condition |
| --- | --- | --- | --- | --- | --- |
| 1 | POS product owner + POS engineering owner | `cash_only_and_store_credit_runtime_control` and D-03 scope | One explicit decision: restore `const tenderMethods: TenderMethod[] = ["CASH"]` under contract 0.2.0, or produce a formally superseding contract with named-provider evidence and approvals | `components/pos/ProfessionalPOSSystem.tsx` and, only for a supersession, a new frozen G1 contract/register version | G1 technical checks 13/13 and focused POS gate tests pass; no contract is weakened silently |

## G1 D-01–D-11 approval returns

For each row below, return one `decisionApprovals[]` object with the exact frozen `selectedOption`, non-empty rationale, effective/review versioning, evidence links, affected capabilities, rollback/disable policy, and one approval object for every required role. Every approval object must include `accountableApprover`, exact `approverRole`, `authorityReference`, `freshAuthenticatedAt`, `approvedAt` within ten minutes, `signatureReference`, and a lowercase 64-character `signatureEvidenceSha256`.

Target: `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json`

| Decision | Required accountable roles | Additional evidence required before approval |
| --- | --- | --- |
| D-01 | Product owner; Financial controller; Payments owner | Cash/store-credit behavior matches the frozen option |
| D-02 | Retail operations owner; POS architect; Security owner | Explicit acceptance/treatment of the active-drawer-claim gap |
| D-03 | Payments owner; Treasury owner; Security owner | Electronic tender disabled, or named-provider scope formally supersedes the contract |
| D-04 | Product owner; Risk owner; Retail operations owner | Offline capture remains disabled for current scope |
| D-05 | Retail operations owner; QA owner; Support owner | Physical matrix or signed production exclusion |
| D-06 | Financial controller; Retail operations owner; Risk owner | Current full-sale-only limit and missing partial-return/maker-checker scope explicitly accepted |
| D-07 | Product owner; Financial controller; Qualified Cameroon reviewer | Qualified country-pack review and checker verification |
| D-08 | SRE owner; Product owner; Support owner | Measured service baseline after D-05 scope is fixed |
| D-09 | Financial controller; O2C product owner; Qualified accounting reviewer | Delivered-quantity recognition decision and implementation evidence |
| D-10 | Inventory controller; Fulfillment owner; Accounting owner | Reservation/issue/COGS policy and aggregate evidence |
| D-11 | Financial controller; Treasury owner; Retail operations owner | Business-day/statement/reconciliation/close separation evidence |

## Destructive-migration return

| Sequence | Owner / role | Exact fields | Required evidence format | Target path | Acceptance condition |
| ---: | --- | --- | --- | --- | --- |
| 1 | Release manager | final commit, tree, clean state, current `package.json` and Prisma schema hashes | Clean-candidate freeze record | New superseding evidence bundle; do not overwrite the 2026-08-13/17 history | Candidate mode is production-frozen and zero source drift |
| 2 | Production database owner | redacted environment ID, engine/version, region, schema, selected path, history-before, aggregate profile | JSON with SHA-256 references; no credentials | Superseding `05-production-restore-evidence.json` / bundle `environment-census.json` | Approved remote target and `EMPTY_TARGET_EXECUTE` or `EXISTING_TARGET_RESOLVE_ONLY` is evidence-backed |
| 3 | Backup/recovery owner | snapshot/PITR ID, creation/retention, KMS reference, size, custodian, integrity ID | Provider-backed backup manifest JSON | Superseding bundle `backup-manifest.json` | Backup exists, is encrypted, retained, and independently restorable |
| 4 | Recovery operator | isolated target, network isolation, restore times, operation ID, logs, schema/history/object tie-outs, RPO/RTO | Restore evidence JSON/logs with hashes | Superseding bundle `restore-test.log` and production restore evidence | Independent restore and recovery objectives pass |
| 5 | Migration maker — identity must be resolved first | every final binding, target decision, 13 dispositions, fresh-auth record, maker signature | `maker-attestation.json` with detached signature or immutable enterprise approval | Superseding migration bundle | Signature occurs after final manifest; identity/authority maps unambiguously |
| 6 | Independent migration checker — distinct from maker/operator | independence/conflict declarations, recomputed hashes, control results, exact decision, later signature | `checker-decision.json`; decision exactly `REJECT_AND_REWORK` or `APPROVE_EXACT_HASH` | Superseding migration bundle | Checker verifies maker and signs after maker |
| 7 | Independent checker | one rationale/consequence acknowledgement per finding | 13 manually authored version-2 registry entries | `prisma/migration-risk-approvals.json` | `humanAuthored=true` is authored by the checker only after `APPROVE_EXACT_HASH`; 13/13 pass |

The current maker conflict is `SANGO MALO` versus `Tamen Marceline`; the checker conflict is `MAXIMILLIANO BONGA` versus `Yonga Springfield`. Return an authority-backed identity resolution before either signature is accepted.

## Cameroon qualified-review return

| Owner / role | Exact fields | Required evidence format | Target path | Acceptance condition |
| --- | --- | --- | --- | --- |
| Qualified Cameroon statutory reviewer | `fullName`, `professionalCapacity`, `organization`, `qualificationReference`, `qualificationEvidenceSha256`, conflict declaration | Qualified-review decision JSON plus retained qualification evidence | Current country-pack evidence directory as `review-decision.json` | Identity and professional capacity validate |
| Same reviewer | `startedAt`, `completedAt`; recomputation of every source digest | ISO-8601 timestamps and all reviewer-recomputed flags/hashes | `review-decision.json` | Review window valid and source digests independently recomputed |
| Same reviewer | Decisions for `pensionRatesBps`, `familyAllowanceRatesBps`, `occupationalRiskRatesBps`, `employerRules` | Each: decision, source provision, effective dates, independent tie-out SHA-256 | `review-decision.json` | All four complete and consistent |
| Same reviewer | final decision, approved/excluded families, effective dates, conditions | Final decision `APPROVED`, `REJECTED`, or `CHANGES_REQUIRED` | `review-decision.json` | Final decision matches every fixture-family decision |
| Same reviewer | signed artifact filename/hash/time/method | Detached cryptographic signature or immutable enterprise approval artifact | Same country-pack evidence directory | Artifact exists and SHA-256 matches |
| Independent authorized checker | identity, role, verification time/method, key/credential reference, conflict declaration, evidence path/hash | Checker verification JSON or immutable approval record | Same country-pack evidence directory and manifest required approval | Checker is distinct and verifies retained signature |
| Authorized maker/checker | `productionUseAllowed`, review statuses, requiredApproval fields | Manifest transition after preflight authorizes it | `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json` or a superseding dated manifest | Review preflight 12/12 and production gate 12/12 |

DGI, MINFI, and CNPS labels alone are not individual reviewer identities.

## Hardware return

| Owner / role | Exact fields | Required evidence format | Target path | Acceptance condition |
| --- | --- | --- | --- | --- |
| Retail operations owner; QA owner; Support owner | tested location/terminal/device IDs, model/firmware/driver, browser/OS, executed cases, timestamps, results, evidence hashes | Signed physical hardware matrix | Superseding `TEMPLATE-04` evidence packet and G1 D-05 approval | Printer, drawer, scanner, payment terminal, customer display, offline device, fallback/error states are proven |
| Same roles, if hardware is excluded | exact production exclusion, business consequences, supported receipt path, cash handling procedure, failure/fallback procedure, support runbook | Artifact-bound signed exclusion | `EXT-HARDWARE-MATRIX.verificationReference` and G1 D-05 evidence links | All three role approvals validate and unsupported hardware is impossible to present as ready |

## Provider, close, inventory, O2C, operations, and pilot returns

| Gate | Owner / role | Required return | Target field/path | Acceptance condition |
| --- | --- | --- | --- | --- |
| G3A | Payments, treasury, security | Named provider/merchant sandbox; official callback/statement contract; success/decline/timeout/unknown/duplicate/late-capture/reversal/refund/dispute/chargeback/settlement/mismatch evidence | `EXECUTION_07_G2_G9_GATE_CLOSURE_PROGRAM.json:externalEvidenceRegister[EXT-PROVIDER-SANDBOX]` | `status=VERIFIED` with durable `verificationReference` after G2 |
| G5 | Financial controller, retail close owner | Production-like business-day, declaration, statement, reconciliation, ledger/bank tie-out, suspense aging, late-correction invalidation | `externalEvidenceRegister[EXT-CLOSE-CYCLE]` | Verified close-cycle evidence after G3A/G3B/G4 |
| G6 | Inventory controller, fulfillment, accounting | Signed inventory-scope/unsupported-combination policy plus concurrency, reservation, fulfillment, reversal, no-oversell/no-duplicate-COGS proof | `externalEvidenceRegister[EXT-INVENTORY-POLICY]` | Verified after G2 |
| G7 | Financial controller, O2C owner, qualified accounting reviewer | Recognition, allocation/unapplied cash, returns/disposition, correction policy and cross-domain tie-out | `externalEvidenceRegister[EXT-AR-RETURNS-POLICY]` | Verified after G3A/G3B/G6 |
| G8 | SRE, security, support, release operations | Load, soak, loss, outage, backlog, backup/PITR/failover, rotation, penetration/privacy, alert delivery/ack, incident drill bundle | `externalEvidenceRegister[EXT-OPS-DRILLS]` | Verified after G3A–G7 |
| G9 | Pilot/production authority | R0–R6 entry snapshots, SLO/error budget, close/reconciliation cycles, incidents/support load, stop-condition evaluation, signed expand/hold/rollback decision | `externalEvidenceRegister[EXT-PILOT-COHORTS]` | Verified after G8 and separate pilot authorization |

## Enterprise external configuration and operations returns

| Blocker | Owner / role | Required return | Live destination |
| --- | --- | --- | --- |
| B03 | Production database/platform owner | Managed remote target reference, authorization, deployment operation ID, direct migration-history health | Refresh production preflight and `what-next/prisma-migration-history-health.json` |
| B04 | Security/platform secrets owner | Purpose-specific managed references, versions, owners, rotation evidence, HTTPS origin, live delivery flags | Refresh `what-next/release-secret-preflight.json` in release-enforced mode |
| B07 | Security credential owner | Environment/source/attestation/release bindings; 15 credential classifications; security owner and approval | `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_CREDENTIAL_ROTATION_REGISTER_2026-07-25.json` or superseding dated register |
| B08/B10 | Release operations, product/security approvers, six owner pairs | CI/governance evidence; product/security approvals; rollout, rollback, support, pilot, security-incident, on-call primary/backup acceptances; scheduler and alert proofs | Operational release evidence register or superseding dated register |
| B09 | Release manager | New clean candidate and zero-drift freeze | Superseding Phase 2A freeze attestation |
| B11 | Phase 2B authority | 23/23 artifact-bound entry decision after Gate 017 GO | Superseding Phase 2B decision |
| B12 | Phase 3 authority | Successful pilot exit and 34/34 production decision | Superseding Phase 3 decision |

## Return order

1. Resolve the cash-only contract mismatch and stabilize the source tree.
2. Complete repository-owned non-signature evidence and recompute current hashes.
3. Complete production target, backup, restore, provider, hardware, statutory, and operational evidence.
4. Generate the final manifests.
5. Obtain fresh-authenticated signatures/approvals over those exact final hashes.
6. Hash completed approval artifacts and update parent manifests/registers last.
7. Rerun focused gates, then `npm run policy:gates`.
8. Run `npm run verify:release` only when all authentic prerequisites exist and the candidate is clean.

