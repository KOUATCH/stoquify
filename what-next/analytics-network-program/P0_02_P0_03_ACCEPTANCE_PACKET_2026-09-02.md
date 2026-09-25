# P0-02 / P0-03 acceptance packet

Date: 2026-09-02  
Status: **Reconciled; precise blockers remain. Neither package is accepted.**  
Active packages: **P0-02 and P0-03 — 2/2**  
Selected skill: `001-aqstoqflow-program-orchestrator`

## Result

P0-02 is technically verified for its ownership-design scope and awaits accountable owner acceptance. P0-03 has a verified normalization contract and a prepared remediation design, but its registered runtime criteria remain unmet. Repository TypeScript validation still reports the same four earlier diagnostics: **4 still present, 0 resolved, 0 new**.

The detailed [evidence record](P0_02_P0_03_ACCEPTANCE_EVIDENCE_2026-09-02.json) contains current source hashes, exact compiler output, the initial test failure and successful targeted rerun, owner decisions, and the downstream handoff. The [program status register](PROGRAM_STATUS_REGISTER.json) remains the live execution record; the August 30 report remains historical evidence.

## Current baseline and verification

- Branch: `codex/migration-control-plane-release-2026-08-29`.
- Commit: `a05a41ef66cd5d98fd69ae3df18225795f912232`.
- Dirty worktree: 176 status entries at the refresh snapshot. Existing changes are retained.
- Schema hash still matches the August 30 baseline. No migration or database operation ran.
- `npm run typecheck`: exit 1, four diagnostics below. A second run after the concurrent capture changes produced the same four diagnostics and no new ones. This is the configured TypeScript scope, including existing exclusions.
- Focused Jest checks: **18 context tests, 8 route-audit tests, and 23 sidebar tests now pass**. The initial 49-test run had one sidebar ordering failure; its 23-test suite passed after the fix. This is a combined result across two runs, not a claimed all-green initial run.
- Registry checks: 12 unique surfaces/routes; 53 declared target KPIs with exactly one owner and canonical drill-through each; all listed pages, catalogs, sidebar entries and implementation paths exist.
- No runtime financial tie-out, database boundary test, browser rerun, or access-denial certification is claimed.

### The four TypeScript blockers

| ID / owner | Current diagnostic | Exact next engineering action |
|---|---|---|
| P0-TC-01 — Payments UI | [PaymentReconciliationWorkbench.tsx:513](../../components/finance/PaymentReconciliationWorkbench.tsx) — TS2322, Date[] filters do not fit string[] | Serialize validated date filters at the canonical query boundary; preserve period semantics and query fingerprints. |
| P0-TC-02 — Payments UI | [PaymentReconciliationWorkbench.tsx:563](../../components/finance/PaymentReconciliationWorkbench.tsx) — same mismatch | Apply the same contract to the main query and certificate-export query; verify their agreement. |
| P0-TC-03 — Accounting export / controls engineering | [finance-statement-export.service.ts:188](../../services/accounting/finance-statement-export.service.ts) — TS2741, missing watermarkId | Bind the request to a real watermark using the existing export-safety mechanism and retain the audit/artifact association. Do not weaken the type or insert a dummy ID. |
| P0-TC-04 — Accounting export engineering | [finance-statement-export.service.ts:322](../../services/accounting/finance-statement-export.service.ts) — TS7053, JSON missing from MIME map | Align accepted formats, enabled table contracts, renderer and MIME map. Support JSON end to end or reject/narrow it before lookup; verify both allowed and unsupported formats. |

These are engineering repairs, not requests for permission to ignore a failed gate. Their source hashes are recorded so the next implementation can proceed without rediscovering the failures. The existing user-owned financial changes were inspected and remain unmodified in this refresh.

## Acceptance matrix

| Package criterion | Current result | Disposition |
|---|---|---|
| P0-02: one canonical job per route | 12/12 unique routes, present in code and navigation | Technically verified |
| P0-02: every declared KPI has one owner | Expanded the seven illustrative entries to 53 explicit semantic/source owners and canonical routes | Technically verified as proposed design |
| P0-02: action and drill-through ownership | Canonical job/action ownership recorded; source domains retain corrective writes | Owner review pending; individual runtime guards belong to P0-06 |
| P0-02: route/sidebar verification | Seven route suites pass; Purchases submenu ordering corrected and sidebar suite passes | Technically verified |
| P0-02: Product/UX/domain design acceptance | No accountable acceptance record found in current program decisions | **AN-D03 pending** |
| P0-03: explicit context and unsupported-state contract | Existing normalizer verified with 18 tests; no default currency; blank explicit location blocked | Contract slice verified |
| P0-03: midnight/DST/cutoff/XAF/XOF/decimal cases | Added ten boundary/invalid-context cases | Explicit-input normalization only; source-query cutoff proof remains |
| P0-03: target read-model rules and Business Pulse design | Twelve surface/model families covered in the [remediation design](P0_03_ANALYTICAL_CONTEXT_REMEDIATION_DESIGN_2026-09-02.md) | **AN-D04 / AN-D12 pending** |
| P0-03: no hard-coded XAF, organization-calendar boundaries, fixed-precision totals | Business Pulse still has XAF fallback, server-local day helpers and number-based monetary reductions; no runtime caller uses the new resolver | **Runtime work remains under current registered criteria** |
| P0-03: unambiguous completion scope | Roadmap calls for approved design; work-package registry also demands runtime results | **AN-D11 pending; no criterion silently waived** |
| Both: repository verification gate | Four unchanged TypeScript failures | **Blocked** |

The proposed 13-week forecast and future advisory/cohort fields in the ownership map are target designs. Existing routes and screenshots do not establish their implementation.

## Exact owner decisions

No new permission is needed for this evidence refresh or the requested execution order. The remaining decisions establish accountable ownership and business semantics. The program skill's universal gates prohibit advancing an unresolved HIGH invariant, and the current program requires owner acceptance of these inputs. A full G0 phase exit is not required to start P0-04/P0-06; those packages help produce G0.

| Record | Who decides | Concrete decision / recommendation | What it authorizes |
|---|---|---|---|
| **AN-D03** | Product Program Lead, with UX Architecture and Finance/Payments/Accounting/Purchasing/Data review | Accept or revise ownership registry v1.1.0: 12 canonical jobs, all 53 KPI owners, canonical drill-throughs, secondary-surface rules and source write ownership. Recommend acceptance of this design. | P0-02 owner acceptance; no route deletion, new financial authority or runtime access certification. |
| **AN-D04** | Finance Owner with Finance Platform, Data/BI and Accounting | Accept or revise remediation design v1, including the target-model context matrix, explicit periods, Decimal aggregation, per-client money separation and blocked-state rules. | The implementation design; not a claim that Business Pulse is fixed. |
| **AN-D11** | Product Program Lead + Finance Owner, with Data/BI | Recommend **strict runtime completion in P0-03**. Alternative: explicitly amend P0-03 to design-only and move all three runtime criteria and release dependencies to P1-01. | A clear completion boundary. An amendment must be recorded in the roadmap/registry before design-only acceptance. |
| **AN-D12** | Finance Owner with Accounting/Data/BI | Supply the supported-currency catalog/list and version; approve display rounding, currency precision, organization-calendar periods, forecast-start convention and elapsed-age versus business-day SLA treatment. | Exact policy inputs for implementation. Intl accepts XYZ with two minor units, so current format validation is insufficient to establish currency eligibility. |

Reviewed ownership registry SHA-256: `2868970ffceece00ab1c039b2618cb42585e0a809a6e0ec61f7f1a1492129193`  
Reviewed remediation design SHA-256: `7d3c5320e30da395813564852d7c9cdcd07fd3f1998188145078424cb29094c3`

For each decision, record: decision ID, APPROVE/REVISE/REJECT, the named accountable person and role, reviewed version/hash, rationale/conditions, decision timestamp and evidence reference. AN-D12 also needs the actual policy inputs. A traceable internal decision can be recorded from the accountable person's response in this task; the separate production approval contract remains unchanged. No names, timestamps, signatures or decisions have been inferred from seeded users.

## Reconciliation of newer evidence

| Newer evidence | What it establishes | What it does not establish |
|---|---|---|
| [Dedicated replay report](../migrations/isolated-next-level-fresh-replay-20260830.md) | 80/80 migrations applied; zero unexpected structural drift; 226 intentional residual statements in the dedicated local database | Analytical currency/time/precision correctness or production migration approval |
| [September 1 local X1 manifest](../evidence/finance-x1/local-simulation/LOCAL-X1-20260901144339/manifest.local-simulation.json) | 42 authenticated local captures; 42/42 image hashes verified again | Ready AR history, complete runtime denial proof, owner acceptance or release authorization |
| [X1 approval intake](../evidence/finance-x1/X1_APPROVAL_INTAKE_PREFILLED_2026-09-01.md) | Identifies remaining traceable approvals and seeded role candidates | Candidate identity is not an approval |
| [X1 automation readiness](../evidence/finance-x1/X1_APPROVAL_AUTOMATION_READINESS_2026-08-31.md) | September 1 refresh still reports missing external configuration/signature | It does not clear P0 decisions; its blocker count has a different scope from X1 preflight |

The historical local AR image still depicts loading with zero rows. The earlier capture path did not require a terminal business state, and its usefulResultMs included later accessibility/capture work. That image remains unsuitable as populated-history or performance proof.

During final verification, both capture tests changed concurrently. They now use [finance-x1-route-observation.ts](../../tests/e2e/finance-x1-route-observation.ts), which checks visible terminal states, rejects loading/error results, and measures useful content before accessibility/screenshots. This implementation was inspected and hashed, but was not authored or browser-verified by this refresh. The AR queue now asks for verification of that existing work, seeded-row expectations, and replacement artifacts. It does not ask for a duplicate implementation. The existing 42 images remain local and non-authoritative.

X1 external signatures, provider configuration and production gates are separate from internal P0 package acceptance. They are not additional approval requests for drafting P0-04/P0-06.

## Prepared downstream handoff

**P0-04 — Data/BI / Engineering Lead.** Use the complete 53-entry ownership baseline and accepted P0-03 policy to define versioned metric contracts: formula, denominator, source owner, grain, scope, currency, freshness, evidence, exclusions and vocabulary. Separate exposure from proven loss. Accept only after schema/uniqueness checks and Finance/Accounting/Payments/Product/Data review. Entry: P0-02 and P0-03 accepted, relevant verification gate green, and a WIP slot.

**P0-06 — Security / Module Platform.** Reuse current catalogs, module inventory and source action/export/API paths to build the pilot access matrix. Cover server tenant/role/module checks, per-client grants, expiry/revocation, tokens, fresh authentication, maker-checker boundaries and scanner findings. Accept only with zero unexplained pilot findings and focused denial evidence. Entry: P0-02 accepted, relevant verification gate green, and a WIP slot. Do not require completed G0 to begin this work.

**AR verification assignment — first available capacity.** P0-VERIFY-AR-01 is assigned by role to D02 / Finance UI verification. A concurrent implementation is now present; verification and replacement captures remain queued. Validate that the shared helper enforces a route-specific terminal state before screenshot; seeded-populated scenarios must show expected rows, while legitimate empty/denied scenarios are checked separately. Persistent loading/error must fail. Record useful-content timing before axe/screenshots; recapture the affected EN/FR viewport matrix with new hashes while preserving local-only classification. This is a verification task within the consuming active package, not a third major package.

Current entry conditions are unmet, so P0-04/P0-06 have prepared inputs and acceptance criteria but are **not activated**. Do not repeat broad discovery: consume this packet, resolve its named decisions/engineering blockers, refresh only changed evidence and failed gates, then replace accepted packages within the two-package limit.

## Changes in this refresh

- Completed surface ownership and canonical drill-through metadata; corrected the Purchase Order Analytics catalog pointer.
- Added ten meaningful context boundary/invalid-input tests; fixed one sidebar ordering defect.
- Added the remediation design, this packet and machine-readable evidence.
- Updated the existing status and decision registers with current evidence, explicit blockers and the AR verification queue.

Source runtime financial logic, database state and existing evidence captures are unchanged.
