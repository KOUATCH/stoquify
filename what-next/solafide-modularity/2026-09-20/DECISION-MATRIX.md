# Modularity decision matrix

**20 September 2026 · planning judgments, not measured vendor scores**

The options are changes Stoquify could make. Solafide and Odoo are evidence sources, not products assigned numerical quality scores. The shared comparison assumes the current Stoquify services remain available for reuse.

## Architecture and experience

- **A:** Targeted current-model repairs; retain the catalog-led experience.
- **B:** Solafide-inspired industry/suite presentation on the current backend.
- **C:** Strengthened domain-module contracts and lifecycle consistency.
- **D1:** Workflow-first composition over existing services.
- **D2:** Replacement capability kernel or executable plugin/service platform.

Scale: 1 = poor fit/high burden; 3 = mixed; 5 = strong fit/low burden. Higher migration and cost scores mean less disruption and lower expected burden.

| Criterion | Weight | A | B | C | D1 | D2 |
|---|---:|---:|---:|---:|---:|---:|
| Customer comprehension and activation | 15% | 3 | 4 | 4 | 5 | 4 |
| End-to-end task completion | 15% | 3 | 3 | 4 | 5 | 4 |
| Financial correctness and access control | 20% | 4 | 3 | 5 | 4 | 3 |
| Dependencies and lifecycle clarity | 10% | 3 | 2 | 5 | 4 | 3 |
| Maintainability and extension burden | 10% | 4 | 3 | 4 | 3 | 2 |
| Migration/reversibility | 10% | 5 | 4 | 4 | 4 | 1 |
| Reliability and operating cost | 10% | 4 | 4 | 4 | 3 | 1 |
| Packaging clarity | 5% | 3 | 4 | 4 | 4 | 3 |
| Defensible differentiation | 5% | 2 | 2 | 4 | 5 | 5 |
| **Weighted result / 5** | **100%** | **3.55** | **3.25** | **4.30** | **4.15** | **2.90** |

Formula: sum(score × percentage weight) / 100.

Scores express potential under a competent, completed implementation. C's score of 5 for integrity is not a claim that today's product has achieved perfect integrity. Correctness and security are mandatory acceptance gates regardless of weighted score.

### Rationale and uncertainties

**A** preserves the most investment and can close specific risk fastest. It leaves much of the selection burden unchanged. Choose it alone if the current configuration experience already meets observed customer needs.

**B** improves commercial comprehension without requiring risky data movement. Its architecture and control benefits are small because it changes presentation. Its score is intentionally not boosted by unverified Solafide runtime claims.

**C** matches the implemented direction: durable grants, command history, dependency resolution and selected continuation already exist. The main costs are complete authority coverage, metadata reconciliation, and integrated verification. It is the preferred engineering investment.

**D1** can improve customer experience through existing presets and composer contracts, but introduces recipe lifecycle/versioning and overlap handling. Adoption and differentiation scores are hypotheses to be tested; recipes alone are easily copied. Reliable outcome completion and recovery would make them valuable.

**D2** offers the most theoretical extension flexibility. It also introduces broad migration, compatibility, execution isolation and operational responsibilities without measured demand. The score would change if independent deployment, partner code execution, or resource isolation became proven requirements.

### Sensitivity

If comprehension/task completion each receive 25%, integrity 15%, differentiation 10%, and each remaining criterion 5%, results become:

| A | B | C | D1 | D2 |
|---:|---:|---:|---:|---:|
| 3.25 | 3.25 | 4.20 | 4.50 | 3.45 |

D1 becomes first when adoption matters more and its benefit is assumed. If a pilot finds no comprehension or completion improvement, reduce those two D1 scores from 5 to 3: its original weighted result falls to 3.55. That supports C with targeted UX changes instead.

The preferred program is **C as the engineering foundation, D1 as a bounded customer-experience experiment, A as its immediate repair phase, and selected B presentation practices**. These are layers and phases, not four concurrent rebuilds.

## Commercial alternatives

Commercial packaging does not dictate deployment architecture.

| Commercial choice | Benefits | Costs and risks | Disposition |
|---|---|---|---|
| Charge separately for each internal module | Fine segmentation and visible expansion choices | Dependency charges, confusing bundles, many entitlement combinations and support paths | Avoid as the default; reserve separately priced additions for distinct value/cost. |
| Small number of outcome bundles | Clear jobs and predictable starting choices | Overlapping workflows can hide exclusions or create arbitrary upsells | Preferred pilot hypothesis; explain full prerequisites and inclusion. |
| Odoo-inspired broad-suite subscription | Reduces app-by-app purchasing decisions | Per-seat economics may penalize frontline adoption; high-support customers can be underpriced | Compare with bundles; no claim that Odoo's exact price metric fits Stoquify. |
| Fine-grained usage per capability | Aligns some infrastructure cost to use | Unpredictable bills and fear of essential operations; difficult support explanation | Limit to optional measurable cost drivers, never essential integrity. |

The official [Odoo pricing page](https://www.odoo.com/pricing) supports the broad-suite benchmark. Stoquify price amounts, free tiers, limits, payroll country charges and partner compensation remain proposals pending cost and customer evidence.

## Decision conditions

Proceed with a recipe-led pilot only if its domain workflow is already supported, the necessary authority is explicit, setup limitations are visible, and no new public capability is implied by a template.

Do not let a high aggregate score compensate for an unauthorized effect, lost evidence, duplicate posting, inaccessible retained obligation, or unsupported statutory promise.

Reconsider service extraction only for a named workload with measured deployment, scaling, reliability or isolation pressure. An extension marketplace requires a separate business case and security/support model.
