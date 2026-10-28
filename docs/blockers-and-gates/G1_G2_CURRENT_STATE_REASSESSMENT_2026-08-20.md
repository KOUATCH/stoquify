# Stoquify G1/G2 current-state reassessment — 2026-08-20

Generated: `2026-08-20T14:46:52.784138Z`

Classification: **ASSESSMENT ONLY — NOT PRODUCTION, LEGAL, ACCOUNTING, SECURITY OR REGULATORY CERTIFICATION**

## Executive state of affairs

- **G1 technical contract:** **13/13 PASS_CURRENT**. The former cash-only UI mismatch is resolved; the current UI and runtime conform to the frozen cash-only/store-credit-disabled development scope.
- **G1 decisions:** **0/11 approved**. Every D-01 through D-11 decision still lacks validator-acceptable, authority-backed human approvals.
- **G1 role obligations:** **0/33 accepted** across **17 canonical roles**. Status distribution: {'OPEN_AUTHORITY_EVIDENCE': 31, 'OPEN_EXTERNAL_EVIDENCE': 2}.
- **Enterprise POS gate sequence:** **0/10 passed**; the canonical program validator reports **G1 as the first blocker**.
- **G2:** not eligible to pass because G1 is open, and it also has intrinsic work remaining. Across 18 controls: {'PASS_WITH_LIMITATIONS': 4, 'OPEN_TECHNICAL': 12, 'OPEN_EXTERNAL_EVIDENCE': 1, 'PASS_CURRENT': 1}.
- **Release recommendation:** **NO-GO**. Continue development-only preflight; do not claim G1, G2 or production readiness.

The core distinction is simple: the engineering blueprint now passes its 13 technical checks, but no authorized human has yet accepted the 11 decisions in the form the validator requires. G2 is the next engineering/control layer; useful portions work locally, but it cannot pass today even if G1 were magically approved because independent cart-integrity, access, privacy and production-secret blockers remain.

## Plain-language explanation

Think of G1 as the approved rulebook and G2 as the lock-and-safety system built from that rulebook. Engineers have made the rulebook internally consistent. The organization must still prove who is allowed to approve each rule, capture their deliberate approval after fresh login/MFA, and preserve evidence another person can verify. Test users, job titles, typed names and pictures of signatures do not prove this.

The HRIS reseed is useful for development: it now provides role, employee, contract, org-unit, position and assignment coverage. It is explicitly synthetic. It helps test workflows but gives **zero governance or approval credit**.

## Canonical definitions and validators

- G1 contract: `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json`, version `0.2.0`, SHA-256 `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db`.
- Live approval register: `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json`, SHA-256 `49e19d9ed6c83df23010264ffff4bb92dbe63ba4c2e7a8e3acdc42c0e4fe8340`, current status `OPEN_NO_APPROVALS`.
- G1 no-write command: `npm run pos:g1:contract:gate` → `scripts/pos-g1-contract-gate.js`.
- G2/program sources: `docs/pos-enterprise-grade-audit/EXECUTION_07_G2_G9_GATE_STATUS.json` and `docs/pos-enterprise-grade-audit/EXECUTION_07_G2_G9_GATE_CLOSURE_PROGRAM.json`.
- Enterprise no-write command: `npm run pos:enterprise:program:gate` → `scripts/pos-enterprise-program-gate.js`.
- Canonical dependency: **G1 → G2**. G2 preflight may proceed, but G2 cannot be declared passed until G1 passes.

## As-of baseline and hash reconciliation

- Commit: `35b4cc6a06a50ee11de5bfce6b04993e38bd589a`.
- Branch: `codex/service-boundary-burndown`.
- Worktree: **dirty**. Relevant modified/untracked source includes POS actions/services/components/tests, `package.json`, `prisma/schema.prisma`, seed files, POS migrations, gate scripts and both evidence directories.
- The G1 and G2 canonical manifests match their current listed bytes.
- The canonical gate scripts and evidence bundles are currently **untracked**, so the commit alone cannot reproduce this assessment.

| Artifact | Expected/baseline SHA-256 | Current SHA-256 | Disposition |
| --- | --- | --- | --- |
| docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json | 11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db | 11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db | MATCH |
| docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.md | e5ec986c0903f182a8dae90f34f28e1746c00bbadf89058a4a69b6292f2004f1 | e5ec986c0903f182a8dae90f34f28e1746c00bbadf89058a4a69b6292f2004f1 | MATCH |
| docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json | 49e19d9ed6c83df23010264ffff4bb92dbe63ba4c2e7a8e3acdc42c0e4fe8340 | 49e19d9ed6c83df23010264ffff4bb92dbe63ba4c2e7a8e3acdc42c0e4fe8340 | MATCH |
| docs/pos-enterprise-grade-audit/EXECUTION_07_G2_G9_GATE_STATUS.json | b90889814f3a0ef37f02a6c00e5e46afbde52d2dc3f68a532ab1d5ba0e508d5c | b90889814f3a0ef37f02a6c00e5e46afbde52d2dc3f68a532ab1d5ba0e508d5c | MATCH |
| docs/pos-enterprise-grade-audit/EXECUTION_07_G2_G9_GATE_CLOSURE_PROGRAM.json | 95058c201dad8c9693d2a96830ce492828a5245baaf7bac36f92a97059e195f2 | 95058c201dad8c9693d2a96830ce492828a5245baaf7bac36f92a97059e195f2 | MATCH |
| scripts/pos-g1-contract-gate.js | 855f50521a8e803b82af3be1ccf9b984c43739f6e8be03daff3bda1164bc4d57 | 855f50521a8e803b82af3be1ccf9b984c43739f6e8be03daff3bda1164bc4d57 | MATCH |
| scripts/pos-enterprise-program-gate.js | b94836327ae7ae4afeb2aa6a5a327a66e4d219e259d161d6fcbcca4fbb7dc0f1 | b94836327ae7ae4afeb2aa6a5a327a66e4d219e259d161d6fcbcca4fbb7dc0f1 | MATCH |
| package.json | prior rolling bundles differ | e2a7ed33dad946720f5f974cfeab31a3099b02f684c17d2155c32e0a37eb9132 | CURRENT DRIFT FROM HISTORICAL BUNDLES |
| prisma/schema.prisma | prior rolling bundles differ | 3a6f74890ef0e76a31f7a36aeaa73fdd30116ab4a3b0d58bb22f8f7adc41a15c | CURRENT DRIFT FROM HISTORICAL BUNDLES |

The approval register's source assessment refers to `docs/Compliance/Complaince authorization validation.docx` at historical SHA-256 `cdca6c7d...`; that path does not currently resolve. A different untracked working DOCX exists under `docs/blockers-and-gates/` and was open/locked during hashing. It receives **zero approval credit** and is classified **INCONSISTENT_EVIDENCE** until an immutable export is closed, hashed and independently bound to verified signers and decisions.

## G1 scorecard

| Dimension | Current | Required | Disposition |
| --- | ---: | ---: | --- |
| Technical checks | 13 | 13 | PASS_CURRENT |
| Decisions accepted | 0 | 11 | OPEN_AUTHORITY_EVIDENCE |
| Decision-role obligations accepted | 0 | 33 | OPEN_AUTHORITY_EVIDENCE / OPEN_EXTERNAL_EVIDENCE |
| Canonical roles with verified authoritative subjects | 0 | 17 | OPEN_AUTHORITY_EVIDENCE |
| Overall G1 | blocked | passed | Canonical validator exit 1 |

### All 13 G1 technical checks

| ID | Canonical check | Status | Requirement |
| --- | --- | --- | --- |
| G1-T01 | canonical_g1_numbering | PASS_CURRENT | Canonical gate numbering is unambiguous |
| G1-T02 | decision_set_d01_through_d11 | PASS_CURRENT | Decision set is exactly D-01 through D-11 |
| G1-T03 | decisions_have_selected_fail_closed_options | PASS_CURRENT | Every decision has a selected fail-closed option |
| G1-T04 | limited_development_scope_is_fail_closed | PASS_CURRENT | Development scope is explicitly limited and fail-closed |
| G1-T05 | state_machine_catalog_complete | PASS_CURRENT | Required state-machine catalogue exists |
| G1-T06 | runtime_mappings_and_gaps_are_explicit | PASS_CURRENT | Runtime mappings and known gaps are explicit |
| G1-T07 | accounting_inventory_event_catalog_complete | PASS_CURRENT | Accounting and inventory event catalogue exists |
| G1-T08 | single_sale_finalizer_preserved | PASS_CURRENT | Single authoritative sale finalizer is preserved |
| G1-T09 | cash_only_and_store_credit_runtime_control | PASS_CURRENT | Cash-only UI and runtime control match the frozen scope |
| G1-T10 | refund_void_fresh_auth_and_compensation_contract | PASS_CURRENT | Refund/void controls require fresh authentication and compensation |
| G1-T11 | stock_and_cogs_event_ownership | PASS_CURRENT | Stock and COGS event ownership is explicit |
| G1-T12 | contract_candidate_disclaims_approval | PASS_CURRENT | Technical contract does not claim human approval |
| G1-T13 | detached_approval_register_binds_exact_contract_hash | PASS_CURRENT | Detached register binds the exact contract hash |

`runtimeConformance` remains `PARTIAL_WITH_EXPLICIT_GAPS`. A technical-check pass means the frozen contract honestly describes those gaps and fails closed; it does not claim all target state machines or production features are implemented.

### D-01 through D-11

| Decision | Title | Current implementation declaration | Required roles | Primary status | Exact blocker |
| --- | --- | --- | --- | --- | --- |
| D-01 | Store-credit tender disposition | ENFORCED_DEVELOPMENT_SCOPE | Product owner, Financial controller, Payments owner | OPEN_AUTHORITY_EVIDENCE | 0/3 required role approvals are validator-acceptable for D-01. |
| D-02 | Physical terminal/register and drawer session boundary | PARTIALLY_ENFORCED | Retail operations owner, POS architect, Security owner | OPEN_AUTHORITY_EVIDENCE | 0/3 required role approvals are validator-acceptable for D-02. |
| D-03 | First electronic payment provider | DISABLED_CURRENT_SCOPE | Payments owner, Treasury owner, Security owner | OPEN_AUTHORITY_EVIDENCE | 0/3 required role approvals are validator-acceptable for D-03. |
| D-04 | Offline tender policy | DISABLED_CURRENT_SCOPE | Product owner, Risk owner, Retail operations owner | OPEN_AUTHORITY_EVIDENCE | 0/3 required role approvals are validator-acceptable for D-04. |
| D-05 | Browser, terminal and peripheral support matrix | DEVELOPMENT_MATRIX_DECLARED_NOT_PHYSICALLY_CERTIFIED | Retail operations owner, QA owner, Support owner | OPEN_AUTHORITY_EVIDENCE | 0/3 required role approvals are validator-acceptable for D-05. |
| D-06 | Returns, voids and refunds policy | FRESH_AUTH_AND_COMPENSATING_EVENTS_PRESENT_PARTIAL_RETURN_AND_MAKER_CHECKER_MISSING | Financial controller, Retail operations owner, Risk owner | OPEN_AUTHORITY_EVIDENCE | 0/3 required role approvals are validator-acceptable for D-06. |
| D-07 | Pilot country, currency, language and fiscal profile | DEVELOPMENT_ONLY_COUNTRY_PACK_FAILS_CLOSED_FOR_PRODUCTION | Product owner, Financial controller, Qualified Cameroon country-pack reviewer | OPEN_AUTHORITY_EVIDENCE | 0/3 required role approvals are validator-acceptable for D-07. |
| D-08 | Pilot service levels and error budgets | TARGET_CONTRACT_NOT_BASELINED | SRE owner, Product owner, Support owner | OPEN_AUTHORITY_EVIDENCE | 0/3 required role approvals are validator-acceptable for D-08. |
| D-09 | Delivery invoice recognition event | NOT_IMPLEMENTED_AS_DELIVERY_O2C_AGGREGATES | Financial controller, Order-to-cash product owner, Qualified accounting reviewer | OPEN_AUTHORITY_EVIDENCE | 0/3 required role approvals are validator-acceptable for D-09. |
| D-10 | Reservation, availability and goods-issue policy | IMMEDIATE_POS_GOODS_ISSUE_PRESENT_DELIVERY_RESERVATION_AGGREGATE_NOT_IMPLEMENTED | Inventory controller, Fulfillment owner, Accounting owner | OPEN_AUTHORITY_EVIDENCE | 0/3 required role approvals are validator-acceptable for D-10. |
| D-11 | Business-day, statement, reconciliation and accounting-close boundary | SESSION_STATEMENT_RECONCILIATION_AND_ACCOUNTING_PERIOD_PRESENT_BUSINESS_DAY_AGGREGATE_MISSING | Financial controller, Treasury owner, Retail operations owner | OPEN_AUTHORITY_EVIDENCE | 0/3 required role approvals are validator-acceptable for D-11. |

### All 33 decision-role obligations

| Obligation | Decision | Canonical role | Primary status | Exact blocker | Next action |
| --- | --- | --- | --- | --- | --- |
| G1-D01-01 | D-01 | Product owner | OPEN_AUTHORITY_EVIDENCE | No verified Product owner or authentic approval evidence. | Confirm the real Product owner by stable subject ID and exact authority; obtain fresh-authenticated artifact-bound approval; export, hash and independently verify the evidence. |
| G1-D01-02 | D-01 | Financial controller | OPEN_AUTHORITY_EVIDENCE | No verified Financial controller or authentic approval evidence. | Confirm exact finance authority; approve the liability and accounting boundary after fresh authentication; export, hash and independently verify the evidence. |
| G1-D01-03 | D-01 | Payments owner | OPEN_AUTHORITY_EVIDENCE | No verified Payments owner or authentic approval evidence. | Confirm payments authority; approve cash-only/store-credit rejection after fresh authentication; export, hash and independently verify the evidence. |
| G1-D02-01 | D-02 | Retail operations owner | OPEN_AUTHORITY_EVIDENCE | No verified Retail operations owner or authentic approval evidence. | Confirm retail operations authority and approve the terminal/session/drawer operating boundary with its stated limitation. |
| G1-D02-02 | D-02 | POS architect | OPEN_AUTHORITY_EVIDENCE | No verified POS architect or authentic approval evidence. | Confirm architecture authority and approve the CAS/session/drawer invariant and documented gap after evidence review. |
| G1-D02-03 | D-02 | Security owner | OPEN_AUTHORITY_EVIDENCE | No verified Security owner or authentic approval evidence. | Confirm security authority and approve tenant/session ownership, race and recovery controls with the documented gap. |
| G1-D03-01 | D-03 | Payments owner | OPEN_AUTHORITY_EVIDENCE | No verified Payments owner or authentic approval evidence. | Confirm payments authority and approve continued electronic-tender disablement until a governed provider exists. |
| G1-D03-02 | D-03 | Treasury owner | OPEN_AUTHORITY_EVIDENCE | No verified Treasury owner or authentic approval evidence. | Confirm treasury authority and approve the provider/settlement fail-closed boundary. |
| G1-D03-03 | D-03 | Security owner | OPEN_AUTHORITY_EVIDENCE | No verified Security owner or authentic approval evidence. | Confirm security authority and approve continued disablement until provider security, credential and kill-switch controls exist. |
| G1-D04-01 | D-04 | Product owner | OPEN_AUTHORITY_EVIDENCE | No verified Product owner or authentic approval evidence. | Confirm product authority and approve continued offline-capture disablement after reviewing replay gaps. |
| G1-D04-02 | D-04 | Risk owner | OPEN_AUTHORITY_EVIDENCE | No verified Risk owner or authentic approval evidence. | Confirm risk authority and accept the fail-closed offline policy and residual limitations. |
| G1-D04-03 | D-04 | Retail operations owner | OPEN_AUTHORITY_EVIDENCE | No verified Retail operations owner or authentic approval evidence. | Confirm operations authority and approve the online-only operating procedure and recovery route. |
| G1-D05-01 | D-05 | Retail operations owner | OPEN_AUTHORITY_EVIDENCE | No verified Retail operations owner or authentic approval evidence. | Confirm operations authority and approve the explicit development-only hardware exclusion. |
| G1-D05-02 | D-05 | QA owner | OPEN_AUTHORITY_EVIDENCE | No verified QA owner or authentic approval evidence. | Confirm QA authority, verify the stated matrix evidence and approve only the development claim. |
| G1-D05-03 | D-05 | Support owner | OPEN_AUTHORITY_EVIDENCE | No verified Support owner or authentic approval evidence. | Confirm support authority and approve the supportability exclusions and recovery communication. |
| G1-D06-01 | D-06 | Financial controller | OPEN_AUTHORITY_EVIDENCE | No verified Financial controller or authentic approval evidence. | Confirm finance authority and approve the compensating accounting boundary and declared limitations. |
| G1-D06-02 | D-06 | Retail operations owner | OPEN_AUTHORITY_EVIDENCE | No verified Retail operations owner or authentic approval evidence. | Confirm operations authority and approve full-sale-only correction procedures and escalation for unsupported partial returns. |
| G1-D06-03 | D-06 | Risk owner | OPEN_AUTHORITY_EVIDENCE | No verified Risk owner or authentic approval evidence. | Confirm risk authority and approve residual fraud, partial-return and maker-checker limitations. |
| G1-D07-01 | D-07 | Product owner | OPEN_AUTHORITY_EVIDENCE | No verified Product owner or authentic approval evidence. | Confirm product authority and approve only the Cameroon development scope, not production or statutory certification. |
| G1-D07-02 | D-07 | Financial controller | OPEN_AUTHORITY_EVIDENCE | No verified Financial controller or authentic approval evidence. | Confirm finance authority and approve XAF/accounting development scope without making statutory claims. |
| G1-D07-03 | D-07 | Qualified Cameroon country-pack reviewer | OPEN_EXTERNAL_EVIDENCE | No named qualified Cameroon reviewer or authentic approval evidence. | Provide dated qualification evidence, stable identity and scoped appointment; review source provenance and approve development-only use. |
| G1-D08-01 | D-08 | SRE owner | OPEN_AUTHORITY_EVIDENCE | No verified SRE owner or authentic approval evidence. | Confirm SRE authority and approve the no-SLO claim until support and measurement evidence exists. |
| G1-D08-02 | D-08 | Product owner | OPEN_AUTHORITY_EVIDENCE | No verified Product owner or authentic approval evidence. | Confirm product authority and approve the prohibition on production reliability claims. |
| G1-D08-03 | D-08 | Support owner | OPEN_AUTHORITY_EVIDENCE | No verified Support owner or authentic approval evidence. | Confirm support authority and approve the communication and escalation boundary while no SLO exists. |
| G1-D09-01 | D-09 | Financial controller | OPEN_AUTHORITY_EVIDENCE | No verified Financial controller or authentic approval evidence. | Confirm finance authority and approve the delivery/invoice/revenue recognition boundary with the implementation gap explicit. |
| G1-D09-02 | D-09 | Order-to-cash product owner | OPEN_AUTHORITY_EVIDENCE | No verified Order-to-cash product owner or authentic approval evidence. | Confirm O2C authority and approve the process boundary from order confirmation through accepted delivery to invoice. |
| G1-D09-03 | D-09 | Qualified accounting reviewer | OPEN_EXTERNAL_EVIDENCE | No named qualified accounting reviewer or authentic approval evidence. | Provide qualification evidence and review the proposed recognition boundary; do not claim legal/accounting certification beyond the reviewed scope. |
| G1-D10-01 | D-10 | Inventory controller | OPEN_AUTHORITY_EVIDENCE | No verified Inventory controller or authentic approval evidence. | Confirm inventory-control authority and approve reservation versus physical-issue ownership and evidence requirements. |
| G1-D10-02 | D-10 | Fulfillment owner | OPEN_AUTHORITY_EVIDENCE | No verified Fulfillment owner or authentic approval evidence. | Confirm fulfillment authority and approve the physical goods-issue source of truth and exception procedure. |
| G1-D10-03 | D-10 | Accounting owner | OPEN_AUTHORITY_EVIDENCE | No verified Accounting owner or authentic approval evidence. | Confirm accounting authority and approve physical issue as the COGS recognition source with exactly-once evidence. |
| G1-D11-01 | D-11 | Financial controller | OPEN_AUTHORITY_EVIDENCE | No verified Financial controller or authentic approval evidence. | Confirm finance authority and approve the distinct reconciliation/close boundaries and fail-closed sign-off rule. |
| G1-D11-02 | D-11 | Treasury owner | OPEN_AUTHORITY_EVIDENCE | No verified Treasury owner or authentic approval evidence. | Confirm treasury authority and approve statement/reconciliation separation and unresolved-cash fail-closed behavior. |
| G1-D11-03 | D-11 | Retail operations owner | OPEN_AUTHORITY_EVIDENCE | No verified Retail operations owner or authentic approval evidence. | Confirm operations authority and approve session/drawer/business-day procedures and exception handoffs. |

For every row above: verified subject ID is absent; fresh-authentication evidence is absent; approval timestamp is absent; SoD/COI for an authentic appointee is unverified; signature/evidence reference and SHA-256 are absent; independent verification is absent. Approval must be within **600 seconds** of fresh authentication and bind the exact contract hash, selected option and version.

## HRIS, identity and authority finding

The development database currently reports 2 organizations, 84 compliance roles, 88 users, 108 payroll employees/contracts, 14 org units, 84 positions, 84 employment assignments, 82 reporting relationships and 0 delegations. This is a major improvement for **development test coverage** compared with the earlier sparse database.

It does not resolve G1 because the report itself classifies the personas as `SYNTHETIC_DEVELOPMENT_PERSONA`, their authority as `RBAC_AND_HRIS_CONTEXT_ONLY`, signatures as `NOT_STORED_NOT_CLAIMED`, and external qualification as `NOT_CLAIMED`. Distinct seeded maker/checker user IDs prove a test-data invariant, not real appointment authority or approval intent.

## G2 intrinsic scorecard and predecessor status

| Dimension | Current |
| --- | --- |
| G1 dependency | BLOCKED_BY_PREDECESSOR |
| PASS_CURRENT | 1 / 18 |
| PASS_WITH_LIMITATIONS | 4 / 18 |
| OPEN_TECHNICAL | 12 / 18 |
| OPEN_EXTERNAL_EVIDENCE | 1 / 18 |
| Could pass intrinsically if G1 passed today | 5 / 18 |
| Overall G2 | Not eligible and intrinsically incomplete |

| Control | Requirement | Intrinsic status | Dependency | Could pass if G1 passed? | Independent blocker/limitation | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| M2-A01 | Durable finalization command registry | PASS_WITH_LIMITATIONS | BLOCKED_BY_PREDECESSOR | Yes | No intrinsic functional blocker found; evidence is local, the migration and gate bundle are untracked, and the candidate is dirty. | POS backend and database engineering |
| M2-A02 | Atomic claim and finalization idempotency | PASS_WITH_LIMITATIONS | BLOCKED_BY_PREDECESSOR | Yes | Local implementation and tests exist; clean-candidate and production-database evidence remain absent. | POS backend and database engineering |
| M2-A03 | Deterministic same-key replay | PASS_WITH_LIMITATIONS | BLOCKED_BY_PREDECESSOR | Yes | Locally verified only; full failure-injection evidence is not yet in a current G2 gate bundle. | POS backend and quality engineering |
| M2-A04 | Conflict-safe commit lifecycle and recovery | PASS_WITH_LIMITATIONS | BLOCKED_BY_PREDECESSOR | Yes | Local proof exists; correction-required lifecycle and production operational recovery evidence remain limited. | POS backend, SRE and operations |
| M2-A05 | One active draft and unique cart-line identity | OPEN_TECHNICAL | BLOCKED_BY_PREDECESSOR | No | Current code still uses find-then-create and no complete database uniqueness invariant was found. | POS domain and database engineering |
| M2-A06 | Cart version and command ID concurrency contract | OPEN_TECHNICAL | BLOCKED_BY_PREDECESSOR | No | SalesOrder now has a version field, but cart mutation schemas and services do not carry commandId/expectedVersion end to end. | POS API and domain engineering |
| M2-A07 | Typed stale-write authoritative result | OPEN_TECHNICAL | BLOCKED_BY_PREDECESSOR | No | No complete typed stale/conflict envelope carrying authoritative cart version/state was found. | POS API, frontend and workflow engineering |
| M2-A08 | No silent quantity clamp | OPEN_TECHNICAL | BLOCKED_BY_PREDECESSOR | No | updatePOSCartLine still reduces the requested quantity to quantityOnHand and may delete a line at zero. | POS domain, frontend and product |
| M2-A09 | Full cart, stock and retry race certification | OPEN_TECHNICAL | BLOCKED_BY_PREDECESSOR | No | Commit-result races have evidence, but the complete cart/line/availability/rollback matrix does not. | Quality, POS backend and database engineering |
| M2-B01 | Single POS surface access descriptor | OPEN_TECHNICAL | BLOCKED_BY_PREDECESSOR | No | A page route catalogue exists, but it does not yet govern every POS surface or module entitlement. | Security, frontend and platform architecture |
| M2-B02 | Consistent POS module entitlement | OPEN_TECHNICAL | BLOCKED_BY_PREDECESSOR | No | Navigation associates POS with sales while POS actions observe moduleSlug pos; the route descriptor does not enforce either module. | SaaS platform, RBAC and POS engineering |
| M2-B03 | Explicit cashier least-privilege allowlist | OPEN_TECHNICAL | BLOCKED_BY_PREDECESSOR | No | An explicit cashierPermissions list exists, but comprehensive-seed still derives cashier capabilities through broad substring matching. | IAM/security and data seeding |
| M2-B04 | Tenant, location and terminal negative matrix | OPEN_TECHNICAL | BLOCKED_BY_PREDECESSOR | No | Individual scope checks and tests exist, but complete terminal/location negative coverage is not demonstrated. | Security, POS backend and quality engineering |
| M2-B05 | Fresh authentication and maker-checker matrix | OPEN_TECHNICAL | BLOCKED_BY_PREDECESSOR | No | Refund and void use a 300-second fresh-auth rule, but a complete maker-checker/no-self-approval contract is absent. | IAM, risk and POS engineering |
| M2-B06 | Cashier-minimized DTO and redaction | OPEN_TECHNICAL | BLOCKED_BY_PREDECESSOR | No | Public-receipt redaction is tested, but cart/customer mappings still include contact, balance and credit fields without a complete cashier minimization proof. | Privacy, POS backend and frontend |
| M2-B07 | Receipt token signing, expiry and revocation | OPEN_EXTERNAL_EVIDENCE | BLOCKED_BY_PREDECESSOR | No | All 4 foundation checks pass, but release mode reports that the production receipt-token secret is not configured. | Security, SRE and secret custodian |
| M2-B08 | Explicit item/API read permission | PASS_CURRENT | BLOCKED_BY_PREDECESSOR | Yes | No intrinsic blocker found in the assessed route; broader POS surface unification remains B01/B02. | API and security engineering |
| M2-B09 | Privacy, abuse, retention and safe-error evidence | OPEN_TECHNICAL | BLOCKED_BY_PREDECESSOR | No | Focused tests pass, but the canonical closure program still lacks a complete mapped negative/retention/safe-error evidence bundle. | Security, privacy, quality and SRE |

### Key G2 findings

- A01-A04 are locally verified foundations, not production certification.
- A05-A09 remain open: database uniqueness, command/version concurrency, typed stale results, the silent quantity clamp and the complete race matrix.
- B01-B06 remain open: one access descriptor, module-slug consistency, exact cashier allowlist, complete scope matrix, maker-checker and PII-minimized DTOs.
- B07 correctly blocks in release mode because no managed production receipt signing secret is configured.
- B08 is current: the item API route's five focused permission tests pass.
- B09 needs a complete mapped privacy/abuse/retention/safe-error evidence bundle.

## Technical-versus-human blocker matrix

| Blocker class | Examples | Can engineering close it alone? | Required closer |
| --- | --- | --- | --- |
| Technical | G2 A05-A09, B01-B06, B09 | Yes, subject to reviewed policy inputs | Engineering, product, security and quality |
| Human decision | Accept D-01 through D-11 options/limitations | No | Appointed accountable role holders |
| Authority evidence | Stable subject, appointment, scope, dates, delegation, SoD/COI | No | HR/security/governance owner plus independent verifier |
| External/qualified evidence | D-05 matrix/exclusion, D-07 country review, D-08 baseline, D-09 accounting review, B07 managed secret | Partly | Qualified reviewer, operations/SRE or secret custodian |
| Predecessor | G2 declaration while G1 is open | No | G1 must first pass 11/11 |
| Evidence drift | Missing historical DOCX path; dirty/untracked candidate; package/schema changes | Engineering can freeze bytes; humans must reapprove affected scope | Evidence owner, release assurance and approvers |

## Dependency map

```text
Real identity + authority + SoD/COI
                 |
Current decision evidence packets
                 |
33 fresh-authenticated human approvals
                 |
Independent verification + live-register update
                 |
G1 validator = 11/11 PASSED
                 |
G2 intrinsic controls A01-A09 + B01-B09 certified
                 |
Enterprise program gate advances beyond G1/G2
                 |
Broader policy/release gates may become eligible
```

## Reconciliation with earlier reports

| Earlier conclusion | Current conclusion | Cause | Treatment |
| --- | --- | --- | --- |
| G1 technical 12/13; cash-only UI mismatch open | G1 technical 13/13 | UI now exposes only CASH and focused tests pass | Resolved/superseded |
| G1 approval 0/11 | Still 0/11 | Live register remains empty | Confirmed current |
| Sparse HRIS: no org units/positions/assignments | Development coverage now populated | 2026-08-20 synthetic compliance reseed | Development gap resolved; authority gap remains |
| G2 B08 needed current API proof | B08 PASS_CURRENT | Five focused item-route permission tests pass | Resolved for assessed route |
| G2 receipt foundation ready; secret missing | Same | Release config gate: 4/4 foundation checks, one missing secret blocker | Confirmed current |
| Historical DOCX hash/path treated as stable source | Current canonical source path missing; alternate working DOCX locked | Path/bytes no longer resolve as the assessed artifact | Inconsistent evidence; zero credit |
| Historical rolling package/schema hashes | Current hashes differ | Ongoing dirty-worktree development | Prior rolling candidate bindings are stale; no G1 approval existed to invalidate |

## Verification results

| Command | Classification | Observed result |
| --- | --- | --- |
| git status --short | PASSED | Worktree captured; candidate is dirty with relevant modified and untracked POS, schema, migration, gate and evidence files. |
| npm run prisma:validate | PASSED | Prisma schema is valid. |
| npm run typecheck | PASSED | TypeScript typecheck passed. |
| npx --no-install jest scripts/__tests__/pos-g1-contract-gate.test.js scripts/__tests__/pos-enterprise-program-gate.test.js --runInBand | PASSED | 2 suites, 4 tests passed. |
| npm run pos:g1:contract:gate | BLOCKED_EXPECTED | Non-writing validator: 13/13 technical checks ready, runtime partial with explicit gaps, 0/11 decisions approved, overall BLOCKED. |
| npm run pos:enterprise:program:gate | BLOCKED_EXPECTED | Non-writing validator: control plane ready, first blocker G1, 0/10 enterprise gates passed, G2 dependency-blocked and partially implemented. |
| npx --no-install prisma migrate status | PASSED | Development database stoquify_dev_migrated_20260814/public reports 75 migrations and is up to date; this does not prove fresh-database portability. |
| focused G2/POS Jest set (9 suites) | PASSED | 9 suites, 104 tests passed: POS service, offline sync, receipts, tender/session/catalog actions, route/page audit, permissions and migration test. |
| focused shift-close/electronic-authority Jest set (4 suites) | PASSED | 4 suites, 34 tests passed. |
| npx --no-install jest 'app/api/v1/organisations/[id]/items/__tests__/route.test.ts' ... | FAILED_TOOLING_INVOCATION | Initial regex-pattern invocation matched no tests; no product test ran or failed. |
| npx --no-install jest --runTestsByPath 'app/api/v1/organisations/[id]/items/__tests__/route.test.ts' --runInBand | PASSED | 1 suite, 5 item API permission tests passed. |
| npm run receipt:token:config-gate:release | BLOCKED_EXPECTED | 4/4 token foundation checks ready; release blocked because the production signing secret is not configured; no secret value printed. |
| npm run policy:gates | SKIPPED_INELIGIBLE | Skipped: G1 is 0/11, G2 has intrinsic blockers, evidence is incomplete and the worktree contains user-owned modified reports. |
| npm run verify:release | SKIPPED_INELIGIBLE | Skipped for the same eligibility and non-overwrite reasons. |

## Review-board lens findings

| Lens | Finding |
| --- | --- |
| Enterprise/platform architecture | G1/G2 separation is sound; the current blocker is authority/approval, followed by G2 intrinsic controls. |
| Backend/distributed systems | Commit idempotency foundation is locally strong; cart mutation concurrency remains incomplete. |
| Database/migrations | Current DB is migration-current, but key A05 invariants are absent and an unrelated fresh-database portability defect remains documented. |
| Security/IAM/privacy/fraud | Fresh auth exists for refund/void; authority, maker-checker, unified access and cashier PII minimization remain incomplete. |
| Frontend/design system | Cash-only mismatch is resolved; typed stale/conflict UX remains missing. |
| Workflow/accessibility/localization | EN/FR development scope is declared; no new accessibility certification was attempted. Conflict/recovery content requires design. |
| Product/business process | Human acceptance of all 11 operating/accounting choices remains mandatory. |
| Finance/accounting/reconciliation | Contract boundaries are explicit; qualified accounting review and business-day target gaps remain. No accounting certification claimed. |
| Cameroon/OHADA | Qualified Cameroon review is absent. Legal/statutory conclusions remain subject to qualified review. |
| QA/release assurance | 147 focused tests pass; gate exit failures are expected blockers. Dirty/untracked evidence prevents release reproducibility. |
| SRE/DevSecOps | Receipt release secret is absent; production SLO baseline and clean-candidate evidence are missing. |
| Offline/provider integration | Offline/electronic capture remain fail-closed and disabled; no provider readiness claim is made. |
| Analytics/data governance | Evidence hashes and machine register are present; immutable authority/approval provenance is not. |
| AI/agent safety | Agents may collect and verify evidence but must not appoint people or perform human approvals. |
| SaaS packaging/billing/growth | Not applicable to the G1/G2 pass decision except B02's module-entitlement consistency. |

## Prioritized recommendation

1. Establish the authentic 17-role roster and independent SoD/COI verification.
2. Close the D-05, D-07, D-08 and D-09 evidence prerequisites and assemble all 11 decision packets.
3. Collect 33 fresh-authenticated, contract-bound approvals; independently rehash and verify them.
4. Populate the live register minimally and rerun only the G1 no-write validator; require 11/11.
5. In parallel close G2 A05-A09 and B01-B07/B09, preserving B08; then certify G2 after G1 passes.

See `docs/blockers-and-gates/G1_G2_BLOCKER_RESOLUTION_PLAN_2026-08-20.md` for owner/input/output/verification/stop-condition detail.

## Residual risks and release recommendation

- The contract honestly documents runtime gaps; approval of the contract is not proof that all target production features exist.
- Synthetic HRIS records can be mistaken for real authority if metadata is ignored.
- Approval evidence could be replayed after policy, artifact, authority or evidence drift unless deterministic invalidation is enforced.
- Untracked canonical artifacts and a dirty candidate prevent commit-only reproducibility.
- The alternate compliance DOCX was not hashable while open and is not the approval register's assessed path.
- Production receipt URLs remain blocked until secret custody is configured.

**Final disposition:** G1 is **BLOCKED** at 0/11 approvals despite 13/13 technical checks. G2 is **BLOCKED_BY_PREDECESSOR** and **intrinsically incomplete**. `policy:gates` and `verify:release` remain **SKIPPED_INELIGIBLE**. No production, legal, statutory, accounting or security certification is granted.
