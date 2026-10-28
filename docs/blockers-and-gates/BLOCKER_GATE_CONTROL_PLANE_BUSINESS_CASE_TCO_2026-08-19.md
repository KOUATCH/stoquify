# Stoquify Blocker and Gate Control Plane — business case and three-year TCO

Prepared: 2026-08-19  
Decision horizon: G1 pilot now; platform expansion only after measured evidence  
Currency status: formulas are currency-neutral; euro examples are illustrative, not budgets or quotes  
Recommended decision: **BUILD_G1_PILOT_ONLY**

## Executive financial finding

The G1 pilot is justified as a controlled learning and risk-reduction investment, not yet as a proven labor-savings project.

Under the illustrative base scenario, three-year pilot labor savings are about 1,419 hours while the pilot's build, assurance, operation and governance effort is about 3,640 hours. At an equal loaded rate, direct labor savings alone recover about 39% of the modeled effort. The remaining value would need to come from avoided release delay, reduced control incidents, audit/procurement value, customer trust or a higher actual workflow volume. None of those values is currently verified.

Under the high-volume scenario, modeled labor savings can approximately cover the pilot effort before infrastructure, provider and qualified-review fees. Under the low scenario, a bespoke system is clearly uneconomic.

Therefore:

- build the smallest reusable G1 pilot;
- instrument actual cost and value;
- do not approve full platform expansion until a second-domain pilot and measured break-even case pass;
- obtain provider quotes only if governance says external signature evidence is required.

## What is known versus assumed

### Repository facts

- G1 has 11 decisions and 33 role obligations.
- G1 technical checks pass 13/13, but authenticated approvals are 0/11.
- POS remains 0/10 because G1 is the first dependency.
- The wider enterprise report records 3/12 blockers ready and 9 open.
- The repository has a broad assurance, evidence, authentication and event foundation that can be reused.
- A filename-based inventory found 55 gate/readiness/preflight scripts and 441 JSON/SHA-256 gate/evidence/approval/readiness/manifest artifacts.
- No general runtime authority, approval, evidence-envelope and verifier aggregate is currently implemented.

### Unknown business inputs

- actual monthly gate runs by environment and tenant;
- average preparation, coordination and rework hours;
- loaded labor rates by role and location;
- annual audit or customer-assurance preparation effort;
- release-delay days attributable specifically to evidence ambiguity;
- incident probability and loss attributable to stale authority or evidence;
- customer procurement wins/losses affected by this capability;
- willingness to pay and packaging elasticity;
- external provider contract, identity-verification and envelope fees;
- storage, retention, residency and qualified-review costs.

All scenario numbers below are explicit planning assumptions. Replace them with pilot measurements before platform authorization.

## Cost model

### Variables

```text
H       = loaded hourly cost in the chosen currency
C_rm    = loaded cost per role-month = 160 × H
RM      = internal role-months
I3      = three-year incremental infrastructure/storage/observability cost
V3      = three-year external-provider license, envelope and identity cost
Q3      = three-year external qualified security/privacy/legal/statutory review cost
D3      = migration/data-cleanup cost not covered by role-month estimates

Three-year TCO = (RM × 160 × H) + I3 + V3 + Q3 + D3
```

Opportunity cost is represented by the same internal role-months: those people cannot do other work while assigned here. Do not add a second labor line for opportunity cost unless it measures a distinct lost contribution and avoids double counting.

### G1 pilot effort assumptions

The pilot includes governance design, additive schema/service work, G1 import, authority workflow, authenticated approvals, evidence envelopes, independent verification, observe-mode gate handoff, UI, tests, runbooks and three years of modest support. It excludes full cross-domain gate migration.

| Cost component in role-months | Low | Base | High | Included work |
| --- | ---: | ---: | ---: | --- |
| Governance, product and architecture | 1.00 | 1.50 | 2.50 | Authority source, terminology, policy, ADR and acceptance. |
| Backend, data and integration build | 2.50 | 4.00 | 6.00 | Additive models, services, events, G1 adapter and verifier. |
| Security, IAM and privacy | 0.75 | 1.25 | 2.00 | Threat controls, fresh auth, permission/tenant/SoD review. |
| Frontend, workflow UX, accessibility and EN/FR | 1.00 | 2.00 | 3.00 | Authority workbench, inbox, G1 status and robust states. |
| QA, migration assurance, SRE and recovery | 1.50 | 2.50 | 4.00 | Tests, observe parity, chaos, telemetry and runbooks. |
| Initial documentation, training and review | 0.50 | 1.00 | 2.00 | Operating procedures, reviewer and support enablement. |
| **Initial pilot subtotal** | **7.25** | **12.25** | **19.50** |  |
| Three-year maintenance/operations | 3.00 | 6.00 | 10.50 | On-call, upgrades, reconciliation and incident handling. |
| Independent security/data/control reviews | 0.75 | 1.50 | 3.00 | Review cycles and penetration/assurance support. |
| Ongoing governance/training | 1.50 | 3.00 | 4.50 | Authority stewardship, policy review and staff changes. |
| **Three-year pilot total RM** | **12.50** | **22.75** | **37.50** | Excludes `I3`, `V3`, `Q3`, `D3`. |
| **Three-year pilot total hours** | **2,000** | **3,640** | **6,000** | Uses 160 hours per role-month. |

### Illustrative currency conversion

At **H = €60/hour** only as a transparent example:

| Scenario | Internal pilot effort | Internal cost | External/infra additions |
| --- | ---: | ---: | --- |
| Low | 2,000 h | €120,000 | Add `I3 + V3 + Q3 + D3`. |
| Base | 3,640 h | €218,400 | Add `I3 + V3 + Q3 + D3`. |
| High | 6,000 h | €360,000 | Add `I3 + V3 + Q3 + D3`. |

These are not bids. They are sensitivity examples. Use actual Stoquify loaded costs and reviewed vendor quotes.

### Full platform expansion effort

If the pilot passes, full expansion would add domain adapters, policy migrations, persistent composite gates, more UI, operational hardening and commercial support.

| Increment beyond pilot, role-months | Low | Base | High |
| --- | ---: | ---: | ---: |
| Domain adapters and policy migration | 5.0 | 10.0 | 18.0 |
| Composite gate/dependency platform | 2.0 | 4.0 | 7.0 |
| Enterprise hardening and commercial packaging | 1.5 | 3.0 | 5.0 |
| Additional three-year platform support | 3.0 | 6.0 | 10.0 |
| **Incremental expansion** | **11.5** | **23.0** | **40.0** |
| **Pilot plus platform total** | **24.0** | **45.75** | **77.5** |
| **Total hours** | **3,840** | **7,320** | **12,400** |

At the illustrative €60/hour, internal three-year totals would be €230,400, €439,200 and €744,000 before external/infra additions. This is why a platform-wide commitment requires evidence beyond the immediate G1 need.

## Value model

### Formulas

```text
Annual gate-preparation hours = monthly gate runs × manual hours per run × 12

Annual addressable hours =
  annual gate-preparation hours
  + (monthly rework/coordination hours × 12)
  + annual audit/assurance-preparation hours

Annual realized hours saved = annual addressable hours × automation capture rate

Annual labor value = annual realized hours saved × H

Three-year labor value =
  annual labor value × (year-1 adoption factor + year-2 factor + year-3 factor)
```

The scenarios use an adoption curve of 50% in Year 1 and 100% in Years 2 and 3, for a 2.5 multiplier. The automation capture rate excludes deliberate human decision time; the system should accelerate preparation and coordination, not eliminate accountable review.

### Low/base/high workload assumptions

| Input | Low | Base | High | Evidence status |
| --- | ---: | ---: | ---: | --- |
| Gate/control runs per month | 4 | 12 | 30 | Assumption; instrument. |
| Manual preparation hours per run | 2 | 5 | 8 | Assumption; time study required. |
| Rework/coordination hours per month | 4 | 16 | 40 | Assumption; ticket/calendar evidence required. |
| Audit/assurance prep hours per year | 40 | 120 | 300 | Assumption; finance/audit validation required. |
| Automation capture rate | 30% | 55% | 70% | Assumption; must exclude human judgment. |
| Year-1 adoption factor | 50% | 50% | 50% | Planning assumption. |

### Calculated labor value

| Calculation | Low | Base | High |
| --- | ---: | ---: | ---: |
| Annual gate-preparation hours | 96 | 720 | 2,880 |
| Annual rework/coordination hours | 48 | 192 | 480 |
| Annual audit/assurance hours | 40 | 120 | 300 |
| **Annual addressable hours** | **184** | **1,032** | **3,660** |
| **Annual realized hours saved** | **55** | **568** | **2,562** |
| **Three-year realized hours saved** | **138** | **1,419** | **6,405** |
| Three-year labor value at €60/hour, illustrative | €8,280 | €85,140 | €384,300 |

Rounding explains minor differences between displayed values and exact multiplication.

## Direct labor break-even

At a common internal hourly rate, compare hours rather than currency:

| Scenario | Pilot effort hours | Three-year hours saved | Direct labor recovery | Finding |
| --- | ---: | ---: | ---: | --- |
| Low | 2,000 | 138 | 7% | Do not build for labor savings. |
| Base | 3,640 | 1,419 | 39% | Requires substantial non-labor value or lower delivery cost. |
| High | 6,000 | 6,405 | 107% | Approximately breaks even before external/infra costs. |

For the illustrative base scenario:

```text
Uncovered three-year value requirement before external/infra costs
= 3,640 effort hours − 1,419 saved hours
= 2,221 hours of equivalent non-labor value

At €60/hour = €133,260
```

The approved business case must show where this gap comes from: measured release-delay reduction, avoided incidents, audit/procurement savings, revenue/retention or a much smaller build. Do not fill it with a generic “risk reduction” percentage.

## Non-labor value model

Use these formulas only with verified inputs:

```text
Annual release-delay value =
  avoided delay days × approved cost/value per delay day

Annual incident expected-loss reduction =
  (current incident probability × current loss)
  − (residual probability × residual loss)

Annual audit/procurement value =
  avoided external review fees
  + reduced internal assurance hours × H
  + verified deal contribution attributable to the capability

Annual support value =
  avoided gate-status tickets × average handling hours × H

Risk-adjusted three-year NPV =
  discounted verified benefits
  − discounted TCO
```

Required evidence for each benefit:

- incident register and root-cause attribution;
- release calendar with blocker categories and delay duration;
- audit/procurement invoices or internal time records;
- CRM evidence linking assurance capability to a decision;
- support tickets tagged to gate/evidence explanations;
- finance-approved discount rate and risk-adjustment method.

## Build, buy, hybrid and defer comparison

### Weighted scoring method

Criteria and weights total 100:

- G1 closure fit 12
- platform reuse 10
- security/tenant safety 10
- authority/policy fit 10
- auditability/evidence integrity 10
- delivery speed 8
- three-year TCO 8
- operational complexity 7
- domain flexibility 7
- vendor lock-in 5
- UX 5
- commercial differentiation 4
- reversibility 4

Scores are 1–5 review judgments based on current evidence.

| Option | Score / 5 | Cost/value assessment | Decision |
| --- | ---: | --- | --- |
| A. Manual/status quo | 2.68 | Lowest build cost but recurring manual cost, weak runtime authenticity and poor scalability. | Keep only as fail-closed fallback. |
| B. G1-specific implementation | 3.69 | Faster and cheaper initially; high risk of another one-off evidence model. | Use only if implemented through reusable Assurance contracts. |
| C. Extend Workflow Assurance | **4.46** | Best reuse and long-term option value; moderate initial effort and concentration risk. | Selected pilot boundary. |
| D. Standalone service | 3.30 | Strong isolation but duplicated foundations, distributed-system cost and premature operations. | Defer until extraction triggers exist. |
| E. Buy generic approval/e-sign | 2.70 | Faster commodity routing/signatures; still needs Stoquify authority, hashes, policy, adapters and invalidation. | Not a core replacement. |
| F. Internal core plus external e-sign | 3.98 | Best eventual answer where portable signatures are required; adds provider cost and integration risk. | Preserve as optional adapter. |
| G. Defer all work | 2.44 | Avoids spend but leaves known G1/manual-control gap and no learning. | Reject if G1/platform assurance remains strategic. |

### Current external market evidence

- Docusign publishes per-user plans with annual envelope allowances, audit trails and optional identity verification; enhanced organizational/SSO limits require sales engagement. Public prices and allowances vary by locale and may change, so only a formal quote belongs in `V3`. [Docusign pricing](https://ecom.docusign.com/plans-and-pricing/esignature)
- Adobe lists Acrobat Sign Solutions for advanced authentication, enterprise integration, compliance features and workflow automation, with enterprise pricing by sales contact. [Adobe business pricing](https://www.adobe.com/acrobat/business/pricing-plans.html)
- Microsoft Power Automate supports document/process approvals, multiple approvers and approval-center/email interaction. It can supply generic routing, but its tutorial explicitly leaves security to organizational practices; Stoquify domain authority and evidence controls still need implementation. [Microsoft approvals](https://learn.microsoft.com/en-us/power-automate/modern-approvals)

Vendor pricing above is not quoted into the model because the required API, region, identity, volume, support and data-residency package is unknown.

## Risk-adjusted cost register

| Cost/risk | Likelihood | Impact | Financial treatment / mitigation |
| --- | --- | --- | --- |
| Governance decisions delayed | High until owners are named | High | Phase 0 timebox; no engineering start without inputs. |
| Scope expands into full e-signature product | Medium | High | Explicit non-goal; provider-neutral adapter. |
| Central policy/canonicalizer defect | Medium | High | Versioning, golden vectors, observe mode and domain fail-closed checks. |
| Authority roster becomes stale | Medium | High | Stewardship SLA, expiry, reconciliation and revocation tests. |
| Privacy/retention burden | Medium | High | Data minimization, classification, redaction and deletion/retention review. |
| Adoption friction from fresh auth/reapproval | Medium | Medium | Usability tests, passkey option, recovery and measured abandonment. |
| Domain adapter cost underestimated | High for full expansion | High | Second-domain pilot before portfolio authorization. |
| Operations/support underestimated | Medium | Medium-high | Instrument backlog, on-call, storage and reconciliation effort. |
| Vendor fees/lock-in | Medium if external signing required | Medium-high | Obtain multi-provider quotes; keep core contract provider-neutral. |
| False certification claim | Low with controls | High | Clear evidence grades and qualified-review boundary. |
| Commercial demand fails | Medium | Medium-high | Discovery and pricing validation before packaging investment. |
| Opportunity cost | Certain | High | Fund a fixed pilot team/timebox and compare against displaced roadmap work. |

## Pilot investment guardrails

### Funding gate

Fund the pilot only with:

- an approved maximum role-month budget;
- named governance, product, security, data and G1 owners;
- one test tenant and no destructive historical backfill;
- fixed Phase 0–2 scope;
- explicit instrumentation and a post-pilot investment review.

### Required pilot measurements

- actual engineering and review hours by work package;
- manual G1 preparation and coordination baseline;
- median/p95 approval obligation age;
- percentage routed correctly on first attempt;
- rework due to invalid/missing evidence;
- verifier/invalidation latency and failure reason;
- support contacts and training time;
- storage, job, notification and operational cost;
- security/privacy defects and false-positive blocker rate;
- second-domain adapter effort estimate.

### Pilot success thresholds to approve expansion

Thresholds are proposals requiring sponsor approval:

- 100% of G1 policy imports consistently produce 11 decisions/33 obligations.
- 0 unresolved cross-tenant, replay, SoD or evidence-integrity defects.
- 100% of deliberate corruption cases fail closed with deterministic reasons.
- At least 50% reduction in non-judgment preparation/coordination time for the measured G1 workflow.
- At least 95% of eligible obligations routed to the correct confirmed authority on first attempt.
- Evidence export independent verification succeeds in 100% of pilot acceptance samples.
- A second-domain spike reuses core contracts with no domain-truth centralization and within the approved effort threshold.
- Risk-adjusted three-year value meets or exceeds measured three-year TCO, or the executive sponsor explicitly accepts and documents the strategic gap.

### Kill/defer thresholds

- Authority ownership remains unresolved after the Phase 0 timebox.
- Any high-severity tenant-isolation or evidence-integrity issue is unresolved.
- Build forecast exceeds the approved pilot budget by more than the sponsor's tolerance.
- Preparation/coordination time falls by less than 20% after stabilization.
- More than 20% of obligations require manual repair because the authority model cannot represent reality.
- A second domain requires a parallel approval/evidence model rather than bounded extension.
- External provider or retention costs make the approved TCO threshold fail.
- Customer and auditor discovery finds no material value beyond one internal gate.

## Commercialization decision gates

Do not package as a paid product until:

1. At least one internal pilot and one second-domain pilot pass.
2. Customer interviews reveal repeated, high-priority needs.
3. A pricing test shows willingness to pay or measurable retention/procurement value.
4. Support and implementation unit economics are understood.
5. Security, privacy, accessibility and records governance reviews pass.
6. Claims are limited to evidence actually produced; no legal/statutory certification is implied.

Potential business models remain hypotheses:

- include basic gate safety in the platform;
- sell advanced authority/workflow/evidence administration in an Assurance tier;
- bundle stronger SSO, external auditor, retention and provider integration in Enterprise;
- charge professional services for implementation and policy mapping;
- pass through external signature/identity costs transparently.

## Final investment recommendation

**BUILD_G1_PILOT_ONLY.**

The repository makes a G1 pilot technically credible and strategically useful. It does not yet make a platform-wide financial case credible. Approve a fixed, reversible pilot whose primary outputs are authentic G1 workflow capability and measured investment evidence. Preserve the optional hybrid signature boundary. Defer platform expansion, product packaging and a standalone service until the pilot, a second-domain test and a risk-adjusted TCO review pass.

This recommendation does not approve G1, production release, statutory compliance or legal signature validity.

