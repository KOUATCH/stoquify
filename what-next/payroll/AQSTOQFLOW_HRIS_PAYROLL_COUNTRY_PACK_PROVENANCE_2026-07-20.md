# AqStoqFlow HRIS/Payroll Country-Pack Development Readiness

Date: 2026-07-20  
Skill: `aqstoqflow-hris-payroll-12-country-pack-provenance`  
Development status: **READY_FOR_DEVELOPMENT_TESTING — 11/11**  
Production status: **BLOCKED — 10/12**  
Development handoff: Skill 13 may proceed only in deterministic development and sandbox mode.  
Production handoff: Skill 13 remains blocked as a production-readiness claim.

## Executive Decision

The country-pack controls now distinguish development readiness from statutory production readiness without weakening either boundary.

Development, fixture validation, UI work, integration testing, local pilots, and external sandbox/UAT work may continue under the separate command:

```text
npm run statutory:country-pack:dev:gate
```

The result is `READY_FOR_DEVELOPMENT_TESTING` only while all retained source bytes remain intact, production-use flags remain false, legal non-claims remain explicit, adapters remain sandbox constrained, live provider/authority controls remain fail-closed, fixture and unsupported-country harnesses remain present, and the independent production gate remains blocked on expert approval.

The production policy chain still uses:

```text
npm run statutory:country-pack:gate
```

That gate remains blocked by `source_artifact_hash_verification` and `source_artifact_expert_approval`. No statutory formula, fixture expectation, source-evidence claim, reviewer field, production flag, payment path, declaration path, or authority adapter was promoted.

## Architectural Assessment

The previous architecture had one production-oriented gate serving two different questions:

1. Is the implementation safe enough for deterministic development and sandbox testing?
2. Is the country pack legally and operationally approved for production?

Because the second question correctly requires qualified external evidence, using that single gate as a roadmap prerequisite stopped unrelated development work. Making the production gate pass early would have created false assurance.

The implemented two-track model keeps the production gate authoritative while adding a narrower development gate that treats missing expert approval as an expected production blocker, not a development failure.

The available consolidated architecture graph confirms that the country-pack fixture runner, country-pack hooks, and Cameroon sandbox adapter are separate surfaces. The new gate preserves that separation and does not introduce a second regulatory registry or formula source.

## Scope and Files Inspected

- `scripts/statutory-country-pack-production-gate.js`
- `scripts/__tests__/statutory-country-pack-production-gate.test.js`
- `scripts/regulatory-hardcode-gate.js`
- `services/regulatory/hardcode-detector.ts`
- `services/regulatory/country-packs/cameroon.ts`
- `services/regulatory/country-packs/resolve.ts`
- `services/regulatory/country-packs/validation.ts`
- `services/regulatory/country-packs/schemas.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`
- `services/payroll/payroll-country-pack-fixture-runner.ts`
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
- `services/payroll/payroll-adapter-registry.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/compliance/adapters/fake-sandbox.ts`
- `services/compliance/adapters/cameroon-dgi-sandbox.ts`
- `services/compliance/fiscal-document.service.ts`
- `services/compliance/certification-outbox.service.ts`
- the Cameroon source-artifact manifest and reviewer intake under `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/`
- current production-readiness evidence
- relevant nodes in `graphify-out/ordered-code-graph.json`

## Files Changed

- `scripts/statutory-country-pack-development-gate.js`
  - Added the independent development/sandbox gate and separate Markdown/JSON evidence outputs.
- `scripts/__tests__/statutory-country-pack-development-gate.test.js`
  - Added pass and negative coverage for source mutation, accidental production enablement, sandbox escape, and loss of production-gate separation.
- `package.json`
  - Added `statutory:country-pack:dev:gate`; the production `policy:gates` chain remains wired to `statutory:country-pack:gate`.
- `services/regulatory/hardcode-detector.ts`
  - Excluded `.codex-assurance-prisma`, a generated Prisma client directory, from production-source scanning.
- `scripts/__tests__/regulatory-hardcode-gate.test.js`
  - Added a generated-Prisma exclusion fixture.
- `what-next/statutory-country-pack-development-readiness.md`
- `what-next/statutory-country-pack-development-readiness.json`
- refreshed production-readiness evidence and this report

Existing unrelated working-tree changes were preserved and were not staged, reverted, or committed.

## Development Gate Contract

The development gate passes only when all 11 controls are ready:

1. development evidence manifest exists;
2. retained artifact bytes match recorded SHA-256 digests and byte lengths;
3. manifest and artifact production-use flags remain false and review status remains pending;
4. legal-interpretation and approval non-claims remain explicit;
5. Cameroon production automation remains disabled;
6. fake and Cameroon sandbox adapters reject other environments;
7. production fiscal creation and authority submission remain blocked;
8. payment and authority adapter certification guards remain present;
9. golden-fixture drift and unsupported-country fail-closed harnesses remain present;
10. the production gate remains blocked on qualified expert approval;
11. development and production CI commands remain separate.

The generated report explicitly records:

- `productionUseAllowed: false`;
- `legalApprovalClaimed: false`;
- `livePaymentsAllowed: false`;
- `liveDeclarationsAllowed: false`;
- `liveAuthoritySubmissionsAllowed: false`.

## Data Ownership

- HRIS owns people and employment truth.
- Payroll consumes certified HRIS snapshots and owns calculation/run truth.
- Country packs supply versioned candidate regulatory configuration during development; they do not become legally approved merely because source bytes are retained.
- Accounting owns ledger truth.
- Assurance owns the separate development and production evidence states.

No UI, fixture, or development gate may create statutory approval or production payroll truth.

## Tenant and RBAC Decision

- The gate is static and tenant-independent; it does not read or mutate tenant records.
- Development execution remains restricted to deterministic local tenants, synthetic data, and sandbox/UAT endpoints with no legal effect.
- Existing HRIS/payroll RBAC, tenant scope, and self-service redaction controls were not changed.
- No development status grants a user new permission or provider/authority credential.

## Audit and Redaction Decision

- Gate outputs contain control state, relative evidence paths, counts, and blocker identifiers only.
- They do not include employee data, salary values, payment destinations, credentials, raw provider payloads, or authority payloads.
- The development gate is read-only except for writing its Markdown and JSON evidence reports.
- It does not publish country packs, enqueue declarations, release payments, call authorities, or generate approval artifacts.

## Gates Run

| Gate | Result |
| --- | --- |
| Development-gate syntax check | Passed |
| New development-gate suite | 1 suite, 5 tests passed |
| Development and hardcode JS regression bundle | 2 suites, 8 tests passed |
| Existing country-pack, fixture-runner, production-gate, and hardcode bundle | 4 suites, 39 tests passed |
| Total focused tests | 44 tests passed across the bounded suites |
| `npm run statutory:country-pack:dev:gate` | Passed: `READY_FOR_DEVELOPMENT_TESTING`, 11/11 |
| Production statutory gate | Expected block: 10/12, exit code 1 |
| Full regulatory-hardcode gate | Passed: 0 active findings |
| Scoped `git diff --check` | Passed after removing one pre-existing EOF blank line in the touched detector file |

The first unconstrained Jest attempts timed out while traversing large generated/nested workspace trees and left two transient child processes that later exited. Definitive focused runs used a temporary scripts-root Jest configuration, which was removed after the tests completed.

## Baseline-Gap Delta

| Measure | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Explicit development-readiness checks | 0 | 11 | +11 |
| Development blockers | roadmap stopped by production gate | 0 | development unblocked |
| Development status | not represented | `READY_FOR_DEVELOPMENT_TESTING` | explicit |
| Production checks ready | 10/12 | 10/12 | 0 |
| Production blockers | 2 | 2 | 0 |
| Production policy-chain weakening | 0 | 0 | 0 |
| Statutory formulas changed | 0 | 0 | 0 |
| Live payment/declaration/authority paths enabled | 0 | 0 | 0 |

## Permitted and Prohibited Testing

Permitted now:

- local and CI fixture execution;
- deterministic payroll calculation tests clearly labelled non-certified;
- HRIS/payroll integration and UI development;
- synthetic tenant pilots;
- fake-sandbox and Cameroon sandbox adapter tests;
- external provider or authority sandbox/UAT testing when the endpoint has no legal or financial effect;
- redacted reconciliation, retry, idempotency, and failure-mode tests.

Still prohibited:

- production payroll reliance on unreviewed statutory outputs;
- real employee disbursements;
- legally effective declarations or fiscal submissions;
- production authority/provider endpoints;
- production credentials or real payment destinations in development evidence;
- any claim that fixtures or formulas are legally certified;
- changing `productionUseAllowed` or reviewer fields without retained signed evidence.

## Transition to Controlled Live Testing

“Live testing” must be split into two classes:

### External sandbox or UAT with no legal effect

This may proceed under the development gate only when:

- the external endpoint is contractually identified as sandbox/UAT;
- synthetic or explicitly approved non-production data is used;
- adapter environment enforcement rejects production;
- credentials are sandbox-scoped and retained outside the country pack;
- retries and idempotency are bounded;
- responses are redacted and cannot create accounting, payment, declaration, or legal truth;
- cleanup and evidence retention are documented.

### Production-like or legally effective testing

This remains blocked until all production prerequisites are satisfied. A “test” is production-like if it uses real employee money, real production credentials, a legally effective authority channel, or produces a filing/payment that must be reversed or reconciled in production.

## Exact Production Transition

1. A qualified Cameroon payroll/social-security reviewer independently recomputes retained source digests.
2. The reviewer completes every required fixture-family decision, legal provision reference, effective window, limitation, and independent calculation tie-out.
3. A signed approval artifact is retained and hashed.
4. An authorized operator validates reviewer identity/capacity and updates the manifest without changing formulas beyond the approved decision.
5. Approved `sourceEvidenceHash` values are bound to retained artifact digests.
6. `productionUseAllowed` changes only if the signed decision explicitly permits it.
7. Skill 12 and the production gate must pass 12/12.
8. Skills 13 and 14 must be rerun for payment/declaration proof and accounting-close assurance.
9. Skill 17 migration/backfill must be rerun against a current stable snapshot with idempotency, reconciliation, rollback, and owner signoff.
10. Skill 18 final readiness must pass before production rollout.

## Current Production Blockers

- `source_artifact_hash_verification`
- `source_artifact_expert_approval`
- downstream production proof for Skills 13 and 14 remains stale/blocked until Skill 12 passes;
- current migration/backfill and final-readiness evidence cannot be promoted while those prerequisites remain blocked.

## Skipped Checks

- No production provider, payment, declaration, fiscal, or authority endpoint was invoked.
- No production credentials or tenant data were used.
- No full repository test, typecheck, lint, build, or release suite was claimed.
- No formula interpretation or legal review was performed.
- No approval artifact was created or inferred.

## Residual Risk

- Passing development checks proves engineering containment, not formula correctness under Cameroon law.
- Static source checks must continue to be backed by executable negative tests and sandbox runtime evidence.
- External sandbox behavior may differ from production provider or authority behavior.
- The development gate intentionally depends on the production gate remaining blocked for expert approval; the formal transition must remove this development status from release decisions rather than treating both gates as interchangeable.
- The broad dirty worktree remains outside this tranche.

## Handoff Decision

Proceed to `aqstoqflow-hris-payroll-13-payments-declarations-proof` only as a development/sandbox tranche. It may validate synthetic payment evidence, declaration lifecycle behavior, adapter fail-closed paths, redaction, idempotency, and reconciliation without live financial or legal effect.

Do not claim production readiness or advance the production chain until Skill 12 passes 12/12 with genuine qualified signed approval.

## Regularization Follow-up — 2026-07-20

A read-only qualified-review preflight and focused negative tests now make the remaining approval conditions executable without manufacturing legal judgment. The current packet passes 4/12 preflight conditions and remains `BLOCKED_PENDING_QUALIFIED_REVIEW`; `operatorUpdatesAllowed` and manifest `productionUseAllowed` are both false.

The condition owners, evidence requirements, ordered transition, stop conditions, rollback rules, audit/redaction boundaries, and exact commands are recorded in `AQSTOQFLOW_HRIS_PAYROLL_COUNTRY_PACK_REGULARIZATION_DOSSIER_2026-07-20.md`.

Engineering owns packet integrity and automation. The qualified reviewer owns legal interpretation, fixture decisions, effective dates, and signature. An authorized checker owns independent acceptance, and an authorized maker/checker pair owns the later manifest transition. No production flag or formula was changed in this follow-up.

## Qualified Review Dispatch — 2026-07-20

The internal development sequence is complete, so the next safe step is external commissioning rather than another engineering tranche. A hash-pinned dispatch packet is now ready at `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/QUALIFIED_REVIEW_DISPATCH_2026-07-20.md`, with its machine-readable inventory in `qualified-review-dispatch-manifest.json`.

The packet contains the retained source artifacts, provenance and integrity records, reviewer intake, decision template, and gate-unblock handoff. It requires the reviewer to return a completed `review-decision.json`, signed approval artifact, independent fixture tie-out evidence, and any additional authoritative sources relied on.

No reviewer decision, signature, legal interpretation, effective date, formula, fixture, manifest approval, or production flag was created or changed. The preflight remains 4/12 and the production country-pack gate remains 10/12 until genuine external evidence is returned and independently accepted.

### Accountable next owner

Compliance/legal must appoint and verify a qualified Cameroon payroll/social-security reviewer and transmit the packet. Engineering's next executable action begins only when authentic return artifacts are available: verify identity and signature, ingest without altering the decision, run `npm run statutory:country-pack:review:preflight`, and proceed to `npm run statutory:country-pack:gate` only if preflight passes without overrides.

## Reviewer Commissioning Checkpoint — 2026-07-20

A focused evidence-directory inspection found no `review-decision.json`, signed approval artifact, or independent fixture tie-out return. The dispatch packet is ready, but no named reviewer or delivery channel is available in repository evidence.

The active blocker is external coordination: compliance/legal must identify a reviewer, verify their qualifications and authority, agree the review scope and effective-date period, and transmit the unchanged hash-pinned packet. Engineering must not populate reviewer identity, decisions, qualifications, dates, or signatures on their behalf.

Data ownership remains unchanged: HRIS owns people truth, payroll consumes certified snapshots, the reviewer owns statutory interpretation, and engineering owns evidence integrity. No tenant or employee data was accessed, no RBAC path was invoked, and no new redaction action was required because the packet contains statutory sources and control documents rather than employee records.

No gate was rerun because the evidence inputs are unchanged. The latest verified results remain development 11/11, review preflight 4/12, and production 10/12 fail-closed. No production code, schema, formula, fixture, tenant data, approval state, or production flag changed.

The next handoff remains Skill 12 acceptance after authentic reviewer returns. Until then, there is no non-speculative internal engineering action in this dependency chain.
