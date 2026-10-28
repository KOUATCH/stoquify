# G1/G2 blocker resolution plan — 2026-08-20

Generated: `2026-08-20T14:46:52.784138Z`

Classification: **BUILD-READY PLAN — NO APPROVAL OR RELEASE CLAIM**

## Outcome and sequence

The safest path is: **establish real authority → prepare complete decision evidence → collect deliberate human approvals → independently verify → pass G1 → close and certify G2 → consider broad release gates**. Engineering may prepare G2 while G1 is open, but it must not label G2 passed or enable production.

## What to fix first — plain language

1. Name and independently verify the real people who legally/organizationally hold the 17 required G1 roles. The synthetic database personas are test data, not authority.
2. Finish the missing decision evidence, especially the hardware/support matrix or exclusion, qualified Cameroon review, measured service baseline and qualified accounting review.
3. Have the appointed people approve their exact decisions after fresh MFA authentication, within ten minutes, against contract hash `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db`.
4. Have a separate verifier rehash and validate every approval before the live register is minimally populated; then rerun only the narrow G1 gate.
5. In parallel, fix G2's cart races, versioning, silent quantity clamp, unified access, cashier privilege/PII controls and receipt-secret evidence.

## Dependency-aware work plan

| Order | Action | Owner | Exact input | Expected output | Verification | Stop condition | Complexity | Change type |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Authorize the G1 roster | Governance/HR/security owner | Exact legal entity/tenant plus real people mapped by stable subject ID to all 17 canonical roles | Effective-dated, scope-specific appointment register | Independent identity/authority/SoD review | Stop if identity, authority, tenant or scope is ambiguous | Medium | Governance/data |
| 2 | Close decision prerequisites | Decision owners, QA/SRE, qualified reviewers | Current evidence packets; signed D-05 matrix or exclusion; D-07 country review; D-08 baseline; D-09 accounting review | Eleven review-ready decision packets bound to contract 0.2.0/hash | Evidence owner and independent checker rehash every artifact | Stop on missing, stale or self-certified evidence | Medium | External evidence/governance |
| 3 | Collect authentic approvals | 17 appointed role holders and approval-workflow custodian | Exact decision, option, contract path/version/hash, rationale, expiry, rollback policy and evidence links | 33 role approvals in 11 decision envelopes | MFA/fresh auth; approval within 600 seconds; immutable audit export | Stop on stale auth, wrong role/tenant, typed-name-only or image-only signature | Medium | Governance/evidence |
| 4 | Independently verify and populate | Independent verifier plus register custodian | Immutable approval exports and authority records | Minimal live-register update with resolvable signature hashes | Rehash, role match, SoD/COI, time window and contract binding; rerun narrow G1 gate | Stop if producer equals verifier or any byte/policy/authority drift occurs | Medium | Data/governance |
| 5 | Close G2 cart integrity | POS/database/API engineering | A05-A08 contracts approved for implementation | Unique draft/line invariants, commandId/version contract, typed stale result, no clamp | Additive migration checks plus PostgreSQL concurrency tests | Stop on destructive migration, lost update or silent change of user intent | Large | Code/schema |
| 6 | Close G2 access/privacy | Security/platform/POS/privacy | B01-B06 current surface inventory and policy decisions | Unified descriptor, module alignment, exact cashier allowlist, scope/SoD/DTO controls | Positive/negative server-side access matrix | Stop on cross-tenant/location exposure, substring permissions or self-approval | Large | Code/config/governance |
| 7 | Complete G2 operational evidence | SRE/security/quality | Managed receipt secret and A09/B09 test plan | Configured secret plus full race, abuse, retention and safe-error evidence | Receipt config release gate and clean-candidate evidence bundle | Stop if a secret is printed or evidence is not independently reproducible | Medium | Infrastructure/evidence |
| 8 | Run gates in order | Release assurance | G1 validator 11/11 and all narrow G2 prerequisites current | G1 pass, then independent G2 assessment; only later broader policy/release evaluation | Canonical no-write validators and manifest verification | Stop immediately on first predecessor, drift or evidence blocker | Small | Release operations |

## G1 completion acceptance conditions

- The contract remains version `0.2.0` at `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json` with SHA-256 `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db`.
- All 17 canonical roles have real, tenant-scoped, effective-dated appointments tied to stable subject IDs.
- All 33 obligations have explicit decision intent, authority reference, fresh-authentication evidence, approval timestamp, signature/evidence reference and SHA-256.
- Approval occurs no earlier than authentication and no later than 600 seconds afterward.
- SoD/COI passes or an authentic, independently reviewed exception exists.
- An independent verifier resolves and rehashes evidence and confirms contract/role/time/tenant binding.
- The live register is updated only after the above facts exist; the canonical validator must report **11/11**.

## G2 work that may proceed before G1 passes

| Control | Intrinsic status | Owner | Resolution action |
| --- | --- | --- | --- |
| M2-A01 | PASS_WITH_LIMITATIONS | POS backend and database engineering | Commit/freeze the exact migration and repeat the PostgreSQL certification on a clean candidate. |
| M2-A02 | PASS_WITH_LIMITATIONS | POS backend and database engineering | Preserve the implementation and add it to a clean, reproducible G2 evidence run. |
| M2-A03 | PASS_WITH_LIMITATIONS | POS backend and quality engineering | Retain and include response-loss replay in the clean-candidate race suite. |
| M2-A04 | PASS_WITH_LIMITATIONS | POS backend, SRE and operations | Document and test operator recovery for non-terminal or conflicting claims on a clean candidate. |
| M2-A05 | OPEN_TECHNICAL | POS domain and database engineering | Measure duplicates, design additive unique invariants and certify concurrent creation without destructive migration. |
| M2-A06 | OPEN_TECHNICAL | POS API and domain engineering | Add an additive command/version contract, persist replay results and cover duplicate/lost-response cases. |
| M2-A07 | OPEN_TECHNICAL | POS API, frontend and workflow engineering | Define the result union, return authoritative state and implement explicit reconcile/retry UX. |
| M2-A08 | OPEN_TECHNICAL | POS domain, frontend and product | Replace silent clamp with a typed conflict and explicit user-controlled reconciliation. |
| M2-A09 | OPEN_TECHNICAL | Quality, POS backend and database engineering | Add isolated PostgreSQL concurrency cases after A05-A08 contracts are implemented. |
| M2-B01 | OPEN_TECHNICAL | Security, frontend and platform architecture | Define one server-authoritative descriptor and prove every POS entry point consumes it. |
| M2-B02 | OPEN_TECHNICAL | SaaS platform, RBAC and POS engineering | Choose the canonical product-module boundary and align navigation, route and action enforcement with tests. |
| M2-B03 | OPEN_TECHNICAL | IAM/security and data seeding | Remove substring-derived cashier grants and certify positive and negative permission snapshots. |
| M2-B04 | OPEN_TECHNICAL | Security, POS backend and quality engineering | Build the complete matrix and test every surface, including cross-tenant and cross-location denial. |
| M2-B05 | OPEN_TECHNICAL | IAM, risk and POS engineering | Define materiality/action policy, add distinct-subject approval and test the full matrix. |
| M2-B06 | OPEN_TECHNICAL | Privacy, POS backend and frontend | Define a cashier-specific DTO and verify no unnecessary PII crosses each POS boundary. |
| M2-B07 | OPEN_EXTERNAL_EVIDENCE | Security, SRE and secret custodian | Provision the secret in managed custody, rotate/test it and rerun the release configuration gate without exposing its value. |
| M2-B08 | PASS_CURRENT | API and security engineering | Preserve the explicit check and include it in the unified B01 access inventory. |
| M2-B09 | OPEN_TECHNICAL | Security, privacy, quality and SRE | Create the requirement-to-test matrix, fill missing negative cases and retain current clean-candidate evidence. |

## Work that must wait

- Do not declare G2 passed while G1 is open.
- Do not enable production POS, electronic/offline capture, statutory receipt claims or broad release activity.
- Do not run `policy:gates` or `verify:release` until G1 is 11/11, G2 narrow evidence is current, required external evidence exists, and report-writing side effects cannot overwrite unrelated work.

## Invalidation policy

Any affected approval must be recollected if the contract/version/hash, selected option, governing policy, evidence bytes, authority appointment, tenant/scope, qualification, authentication evidence or signature envelope changes. A path or display name alone is never sufficient.
