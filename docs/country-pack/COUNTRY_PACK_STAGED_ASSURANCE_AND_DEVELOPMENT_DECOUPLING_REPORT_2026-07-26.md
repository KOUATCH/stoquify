# Country-Pack Staged Assurance and Development Decoupling Report

**Date:** 2026-07-26  
**Decision:** Separate core integration, country-pack development, jurisdiction review, and production activation  
**Core integration:** `READY_FOR_CORE_INTEGRATION`  
**Production:** `BLOCKED_PENDING_QUALIFIED_REVIEW`

## Executive decision

Regulatory approval and signatures are not software-development prerequisites. They are production-authority prerequisites.

The repository already contained most of the correct isolation architecture: a regulatory capability port, watermarked non-authoritative decisions, a production override, sandbox-only adapters, deferred POS fiscalization, a direct-import boundary, and separate development and production country-pack gates.

One remaining coupling was incorrectly positioned. The ordinary `verify:repo` integration chain ran the evidence-bearing country-pack development gate. That gate required the Cameroon evidence manifest and expected production to remain pending expert approval. Consequently:

- unrelated platform development could fail if the Cameroon evidence packet was absent or changed;
- the integration chain still depended on a country-specific source packet;
- the development gate would fail after the country pack became approved because it explicitly expected production use to remain disabled.

This coupling has been removed. Core integration now runs a new source-independent regulatory isolation gate. Country-pack development, expert review, and production promotion remain separate commands.

## Why the approval controls exist

| Control | Risk controlled | Required during core development? | Required for production promotion? |
|---|---|---:|---:|
| Source artifact hash verification | Source replacement, corruption, or evidence tampering | No | Yes |
| Expert approval | Incorrect legal interpretation, obsolete rate, missing exception | No | Yes |
| Independent fixture tie-outs | Calculation drift, incorrect ceiling, category, or rounding | No | Yes |
| Reviewer qualifications | Approval outside professional competence | No | Yes |
| Conflict declaration | Self-approval and biased review | No | Yes |
| Signed approval artifact | Repudiation and unverifiable decision history | No | Yes |
| Maker–checker verification | Forged signature, incomplete return, unauthorized promotion | No | Yes |
| `EXPERT_REVIEWED` | Truthful professional-review classification | No | Yes |
| `REGULATOR_CONFIRMED` | Explicit regulator-confirmation claim | No | Only if that stronger claim is made |

The controls protect statutory outcomes and claims. They do not improve the correctness of generic UI components, database abstractions, inventory workflows, accounting infrastructure, or the regulatory port itself.

## Dependency and graph impact

The knowledge graph places Country Pack, Compliance Center, Fiscal Document, Business Event, Audit, Error Handling, and Close Blocker in Community 1, a 187-node backend control community. It separately identifies:

- the Ledger-Backed Compliance Control Plane;
- the Enterprise POS Delivery Flow;
- Community 14, containing the Pan-OHADA Compliance Adapter Pattern and Compliance Adapter Registry;
- Community 16, containing the compliance read-model and country-pack metadata resolvers.

This confirms that deleting country-pack controls would affect multiple financial and compliance consumers. The correct intervention is a narrow boundary and release-profile split, not removal of the regulatory system.

## Staged assurance architecture

### Stage A — Core integration

Purpose:

- platform architecture;
- unrelated feature development;
- generic payroll, accounting, inventory, purchasing, POS, and UI work;
- port, schema, contract, and integration tests.

Requirements:

- regulatory decision contract exists;
- provisional results are watermarked;
- production resolution fails closed;
- production deployment overrides requested sandbox modes;
- feature modules cannot import country-pack implementation files directly;
- sandbox adapters self-enforce;
- live authority paths remain blocked.

Not required:

- country-pack evidence directory;
- regulator signature;
- expert approval;
- fixture tie-out;
- production authorization.

Command:

```powershell
npm run statutory:country-pack:integration:gate
```

### Stage B — Country-pack development

Purpose:

- source-backed provisional country-pack construction;
- sandbox calculations;
- deterministic golden fixtures;
- integration and regression testing;
- reviewer-packet preparation.

Requirements:

- official-source artifacts retained and hash-valid;
- `productionUseAllowed: false`;
- pending-review non-claims;
- sandbox and live-submission guards;
- development fixtures and unsupported-country tests.

Approval and signatures remain unnecessary.

Command:

```powershell
npm run statutory:country-pack:dev:gate
```

### Stage C — Jurisdiction validation

Purpose:

- professional determination that a country pack may be promoted.

Requirements:

- independently verified source artifacts;
- 2026 effective-window decision;
- four-family review;
- independent fixture calculations and tie-out hashes;
- reviewer identity, competence, independence, and conflict declaration;
- signed approval;
- separate checker verification;
- explicit production-use decision.

Command:

```powershell
node scripts/statutory-country-pack-review-preflight.js --mode fail
```

Required result:

`READY_FOR_AUTHORIZED_MANIFEST_TRANSITION: 12/12`

### Stage D — Production activation

Purpose:

- country-pack-specific live statutory use.

Requirements:

- approved manifest state;
- approved retained source hashes;
- authoritative effective-date resolution;
- production adapter eligibility;
- policy, evidence, secret, migration, and enterprise release gates;
- tenant and jurisdiction activation controls;
- rollback, suspension, revocation, and audit evidence.

Command:

```powershell
npm run statutory:country-pack:gate
```

## Assurance lifecycle

The recommended promotion lifecycle is:

```text
DRAFT
  → SOURCE_VERIFIED
  → READY_FOR_EXPERT_REVIEW
  → EXPERT_REVIEWED
  → PRODUCTION_ELIGIBLE
  → ACTIVE
  → SUSPENDED or REVOKED
```

| Transition | Owner | Human approval |
|---|---|---:|
| `DRAFT → SOURCE_VERIFIED` | Evidence automation/operator | No; deterministic integrity checks |
| `SOURCE_VERIFIED → READY_FOR_EXPERT_REVIEW` | Country-pack owner | No; completeness checks |
| `READY_FOR_EXPERT_REVIEW → EXPERT_REVIEWED` | Qualified independent reviewer | Yes |
| `EXPERT_REVIEWED → PRODUCTION_ELIGIBLE` | Authorized checker | Yes |
| `PRODUCTION_ELIGIBLE → ACTIVE` | Release owner | Yes |
| `ACTIVE → SUSPENDED` | Compliance or release owner | Yes; emergency policy may accelerate |
| `SUSPENDED → ACTIVE` | Authorized checker and release owner | Yes |
| Any state `→ REVOKED` | Compliance/release authority | Yes; irreversible for that version |

`REGULATOR_CONFIRMED` is evidence classification, not a necessary lifecycle state. It may accompany `EXPERT_REVIEWED` only when explicit regulator evidence exists.

## Independent release tracks

| Track | Baseline gate | Country evidence | Human approval | May activate live statutory behavior |
|---|---|---:|---:|---:|
| Platform integration | Core integration gate | No | No | No |
| Country-pack development | Development gate | Yes | No | No |
| Country-pack certification | Review preflight | Yes | Yes | No |
| Tenant production activation | Production and release gates | Yes | Yes | Yes |

An unapproved Cameroon pack now blocks only:

- authoritative Cameroon statutory calculation;
- live Cameroon declarations;
- production authority submission;
- certified receipt claims;
- claims that Cameroon rules are legally approved.

It does not block generic platform integration.

## Provisional-mode specification

Permitted:

- deterministic fixture calculations;
- internal demos;
- sandbox and test environments;
- masked or synthetic operational scenarios;
- operational receipts whose fiscal status remains pending;
- non-authoritative payroll previews that cannot be paid, declared, posted as statutory truth, or included in certified close.

Mandatory behavior:

- decision kind `NON_AUTHORITATIVE`;
- watermark `NOT FOR STATUTORY USE`;
- `productionUseAllowed: false`;
- no production adapter;
- no live declaration or authority submission;
- no certification claim;
- retained provenance and fixture version;
- pending/deferred state when a pack is unavailable.

The existing POS fiscalization outbox and receipt contracts already implement the required pending and non-certification behavior.

## Gate disposition

### Retained

- regulatory direct-import boundary;
- sandbox adapter environment guards;
- production authority-submission block;
- source integrity;
- expert review;
- independent tie-outs;
- maker–checker;
- production country-pack gate;
- policy and enterprise release gates.

### Split

- core platform integration from country-pack development evidence;
- country-pack development from expert review;
- expert review from authorized manifest transition;
- platform release from tenant country-pack activation.

### Automated

- boundary scanning;
- provisional-watermark verification;
- production override verification;
- source hashing;
- schema and fixture validation;
- signature-file integrity;
- evidence completeness;
- gate reporting.

### Human only

- legal interpretation;
- effective-law determination;
- reviewer independence and competence;
- approval decision;
- signature authenticity and authority;
- production authorization.

### Removed from ordinary integration

- country-specific source packet presence;
- country-pack expert approval;
- regulator signature;
- requirement that the production gate remain blocked.

No production control was removed.

## Implementation changes

### New core integration gate

Added:

- `scripts/statutory-country-pack-integration-gate.js`
- `scripts/__tests__/statutory-country-pack-integration-gate.test.js`

The gate has eight checks and does not read the country-pack evidence directory.

### CI/policy wiring

Updated `package.json`:

- added `statutory:country-pack:integration:gate`;
- changed `policy:gates:integration` to use the new core gate;
- retained `statutory:country-pack:dev:gate` as the evidence-bearing Stage B command;
- retained `statutory:country-pack:gate` in the production policy chain.

### Development gate compatibility

Updated:

- `scripts/statutory-country-pack-development-gate.js`
- `scripts/__tests__/statutory-country-pack-development-gate.test.js`

The development gate now verifies the four-track separation without requiring itself to remain in the core integration chain.

### Typed error completion

Updated:

- `services/compliance/fiscalization-outbox.service.ts`
- `services/regulatory/regulatory-capability.service.ts`

Six raw-error findings in the regulatory-isolation slice were converted to typed `BusinessRuleError`, `ConflictError`, or non-exposed `ApplicationError` handling. This allowed the full integration policy chain to pass.

## Verification results

| Verification | Result |
|---|---|
| Core country-pack integration gate | 8/8, `READY_FOR_CORE_INTEGRATION` |
| Country-pack development gate | 11/11, `READY_FOR_DEVELOPMENT_TESTING` |
| Regulatory import boundary | Ready; 1,382 files; zero violations |
| Full `policy:gates:integration` | Passed end-to-end |
| Raw-error boundary | Zero active findings |
| TypeScript typecheck | Passed |
| Focused regression tests | 7 suites, 26/26 passed |
| Qualified-review preflight | 4/12, correctly blocked |
| Production country-pack gate | 10/12, correctly blocked |

Production blockers remain:

- `source_artifact_hash_verification`
- `source_artifact_expert_approval`

They no longer affect core integration.

## Continuous evidence without development friction

Country-pack teams should collect evidence incrementally:

1. retain the official source when adding a fixture;
2. record the legal reference and effective window;
3. preserve provisional status and non-claims;
4. maintain deterministic scenarios;
5. generate the review package continuously;
6. defer reviewer identity, independent decisions, signatures, and promotion authorization until jurisdiction validation.

This prevents end-stage evidence reconstruction without putting human signatures on the development critical path.

## Residual risks

- `REGULATOR_CONFIRMED` labels in the Cameroon implementation remain stronger than the retained approval evidence; production gating prevents them from authorizing live use.
- The country-pack assurance lifecycle is currently expressed through existing header, manifest, review, and release states rather than one persisted lifecycle record.
- Tenant-specific country-pack activation should remain separately entitled and auditable when production promotion is eventually completed.
- Source expiry, supersession monitoring, and scheduled re-review remain operational responsibilities.

## Final recommendation

Keep the staged architecture implemented here.

Do not require regulator signatures or expert approval for core development, feature integration, sandbox testing, or provisional country-pack construction. Require them only at jurisdiction validation and production promotion.

Continue collecting lightweight provenance and fixtures during development so final review is fast, but keep legal judgment and signatures outside the ordinary engineering critical path.

