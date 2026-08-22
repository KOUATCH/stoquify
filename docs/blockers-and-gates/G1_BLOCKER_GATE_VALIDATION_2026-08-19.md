# G1 blocker and gate validation - 2026-08-19

## Decision

**GO for controlled G1 approval collection. NO-GO for G2 evaluation, enforcement promotion, or production authorization.**

The G1 technical contract is ready: all 13 technical checks pass, the cash-only POS rule is enforced in the inspected candidate, the contract hash is stable, the approval working packet exactly represents all 11 decisions and 33 required role obligations, and the relevant focused tests pass.

G1 itself remains correctly blocked because no accountable decision has yet received all of its required authenticated human approvals. The current score is **0/11 approved decisions and 0/33 completed decision-role approval obligations**. This is now a human governance and evidence-collection step, not a remaining G1 software defect.

## Current gate result

| Measure | Result | Interpretation |
| --- | ---: | --- |
| G1 technical checks | 13/13 pass | Ready for accountable review |
| G1 approved decisions | 0/11 | Blocked on authentic human approvals |
| Required role obligations | 33 | Three exact roles for each of 11 decisions |
| Completed role obligations | 0/33 | All identity/evidence fields remain deliberately blank |
| Enterprise POS gates | 0/10 | G1 is the first dependency blocker |
| Workflow Assurance runtime tables | 7/7 | Runtime persistence foundation is present |
| Workflow Assurance migration records | 3/3 | Required assurance migrations are recorded |
| Workflow Assurance static checks | 38/38 | Static definitions and action routes are ready |
| Workflow Assurance indexes | 11/11 | Required query/index contracts are present |
| Workflow Assurance engine-health gates | 2/2 | Static health visibility checks are present |

The Workflow Assurance results prove technical readiness only. They do not authorize enforce mode and do not replace human approval.

## Frozen artifacts and independent hashes

| Artifact | SHA-256 | Result |
| --- | --- | --- |
| `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json` | `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db` | Independently recomputed; matches the live register and working packet |
| `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json` | `49e19d9ed6c83df23010264ffff4bb92dbe63ba4c2e7a8e3acdc42c0e4fe8340` | Stable empty live register; no approval records inserted |
| `docs/blockers-and-gates/G1_DECISION_APPROVAL_WORKING_TEMPLATE_20260818.json` | `00494ca9b8c367fea575b0569807d3aa578e0aa34afb3e2ef3d7a9418f11fad0` | Signer-ready preparation packet; not approval evidence |
| `docs/Compliance/Complaince authorization validation.docx` | `cdca6c7d2bf6513b84301713e529cfea9d6dc8f218a4acdb8d51bc538d626f3f` | Stable file, but zero approval credit |

Do not edit the frozen contract. A content change creates a new hash and invalidates approvals bound to the hash above.

## Approval-packet preflight

The working template was compared programmatically with the frozen contract:

- 11 decision records are present and unique.
- Every selected option exactly matches its frozen decision.
- Every required role exactly matches its decision contract.
- There are exactly 33 approval obligations.
- Contract hash in the packet exactly matches the independently recomputed hash.
- There are zero decision or role mismatches.
- All 33 accountable identity fields are unresolved, as required until authoritative people are confirmed.

The packet is structurally ready for a controlled approval workflow. It must not be copied into the live approval register in its current state.

## What the existing signature images mean

The authorization DOCX is stable and contains two handwritten-image files, but the evidence assessment finds no trusted digital-signature part or authenticated audit trail binding those images to a verified identity, authority, decision, timestamp, fresh-authentication event, and the exact G1 contract hash. The images therefore receive zero approval credit.

This does not mean a drawn signature is forbidden. It means the picture alone is insufficient. It can be included inside a tamper-evident signing envelope, but the verified identity, authentication event, decision binding, timestamps, audit trail, immutable export, and evidence hash are what make the approval count.

## What must happen next

### 1. Establish the authoritative role roster

An authorized HR, security, governance, or corporate-secretary owner must confirm the real person assigned to every required G1 role. Use stable identity-provider subject IDs or controlled authority-record references, not display names as identity keys. Resolve role conflicts and segregation-of-duties questions before signing.

This step cannot be inferred safely from ordinary application roles, ambiguous names in the DOCX, source-code ownership, or database display names.

### 2. Create controlled signing envelopes

Use `docs/blockers-and-gates/G1_DECISION_APPROVAL_WORKING_TEMPLATE_20260818.json` to prepare one envelope per decision, or a signer envelope that explicitly lists every covered decision. Each envelope must display:

- decision ID and title;
- exact selected option;
- contract artifact ID and version;
- contract path;
- full contract SHA-256;
- rationale, evidence links, affected capabilities, and rollback/disable policy;
- exact approver role.

An internal organization-controlled approval workflow is sufficient if it provides identity, authority, fresh authentication, immutable audit evidence, independent verification, and export. A full external legal e-signature platform is not required for these internal operational approvals.

### 3. Require fresh authentication and deliberate approval

Each signer must re-authenticate immediately before approving. The repository already contains a tenant-bound fresh-authentication check in `lib/security/auth-session.ts`; however, no generic G1 approval service currently persists authority assignments, approval requests, signed evidence envelopes, or independent verification results.

For every approval:

- record `freshAuthenticatedAt` from the trusted workflow clock;
- obtain the decision no later than ten minutes afterward;
- record `approvedAt` from the trusted workflow clock;
- require deliberate approve/reject intent;
- do not treat authentication, role assignment, page access, or a typed name as approval.

### 4. Export, hash, and independently verify evidence

Export the completed immutable approval artifact and its audit trail. Compute SHA-256 over the exact final evidence bytes and record a durable verification reference. A checker who did not prepare the evidence must verify:

- signer identity and stable subject reference;
- exact role authority and delegation period;
- decision and selected-option match;
- contract hash match;
- fresh-authentication timing;
- signature/evidence reference resolution;
- recomputed evidence hash;
- segregation-of-duties result.

The evidence producer must not silently self-certify its own output.

### 5. Populate the live register only after verification

For each decision, copy only verified fields into `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json`. Set a decision to `APPROVED` only when all three exact role approvals are present and valid. Partial decisions remain pending and receive no G1 decision credit.

The live gate requires, for each approval, a verified accountable identity, exact role, authority reference, fresh-authentication time, approval time within ten minutes, signature reference, and a lowercase 64-character evidence SHA-256. The decision record also requires the exact option, non-empty rationale, effective version, review/expiry time, evidence links, affected capabilities, and rollback/disable policy.

### 6. Rerun the two narrow gates

After all 33 obligations are independently verified:

```powershell
npm run pos:g1:contract:gate
npm run pos:enterprise:program:gate
```

The expected valid outcome is G1 `PASSED`, 11/11 approved decisions, and the program's first blocker advancing to G2. G2 will become eligible for assessment; it will not pass automatically.

## Decision-role obligations

| Decision | Required roles | Current result |
| --- | --- | --- |
| D-01 | Product owner; Financial controller; Payments owner | 0/3 |
| D-02 | Retail operations owner; POS architect; Security owner | 0/3 |
| D-03 | Payments owner; Treasury owner; Security owner | 0/3 |
| D-04 | Product owner; Risk owner; Retail operations owner | 0/3 |
| D-05 | Retail operations owner; QA owner; Support owner | 0/3 |
| D-06 | Financial controller; Retail operations owner; Risk owner | 0/3 |
| D-07 | Product owner; Financial controller; Qualified Cameroon country-pack reviewer | 0/3 |
| D-08 | SRE owner; Product owner; Support owner | 0/3 |
| D-09 | Financial controller; Order-to-cash product owner; Qualified accounting reviewer | 0/3 |
| D-10 | Inventory controller; Fulfillment owner; Accounting owner | 0/3 |
| D-11 | Financial controller; Treasury owner; Retail operations owner | 0/3 |

## Verification performed

| Validation | Result |
| --- | --- |
| `node scripts/workflow-assurance-runtime-table-check.js --mode fail` | PASS — 7/7 tables and 3/3 migrations |
| `node scripts/workflow-assurance-release-gate.js --mode fail` | PASS — 38/38 checks, 11/11 indexes, 2/2 engine-health gates |
| `node scripts/kontava-moat-release-gate.js --mode fail` | PASS — 8/8 seed scenarios, 6/6 backfill checks, 8/8 release gates |
| G1 working-template programmatic preflight | PASS — 11 decisions, 33 obligations, zero mismatches |
| Seven focused Jest suites | PASS — 47/47 tests |
| `npm run prisma:validate` | PASS |
| `npm run typecheck` | PASS |
| `npm run pos:g1:contract:gate` | Expected nonzero — 13/13 technical checks; 0/11 approvals |
| `npm run pos:enterprise:program:gate` | Expected nonzero — 0/10 gates; first blocker G1 |

The focused tests covered the G1 contract validator, enterprise dependency controller, Workflow Assurance runtime/static gates, fresh authentication, cash-only POS behavior, and receipt-token visibility.

## Deliberately not performed

- No names, authority records, signatures, timestamps, or evidence hashes were fabricated.
- No migration, reset, reseed, tenant mutation, enforce-mode promotion, or production action was performed.
- `policy:gates` and `verify:release` were not run because G1 remains ineligible and those broad commands write many unrelated evidence files in the already modified worktree. They cannot create approval credit.
- The saved destructive-migration review remains a separate release blocker; it was not modified or treated as approved.
- No claim is made that internal operational approval evidence is a legally enforceable signature in any jurisdiction.

## Exit condition

G1 may be declared passed only when the live gate independently reports 13/13 technical checks and 11/11 valid decision approvals against the unchanged contract hash. Until then, the permitted next logical step is authenticated human approval collection—not G2 implementation or production release.
