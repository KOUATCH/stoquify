# Stoquify Founder Pipeline Assessment

**Date:** 2026-10-16
**Skill:** founder-pipeline
**Scope:** Pipeline routing and a preliminary review of repository business documents.
**Next skill:** pressure-test
**Demand evidence:** UNCLEAR in the reviewed material; no formal pressure-test verdict issued.

## Pipeline status

No `founder-outputs/` directory existed when this assessment began. None of the standard pipeline outputs was present. This file records routing only; it does not satisfy the pressure-test, customer-archetype, or verdict prerequisites.

Stoquify already has a product concept and commercial strategy documents, so optional problem-discovery is unnecessary for choosing the next step. Run pressure-test first, then customer-archetype using the resulting evidence. Do not infer completed validation from existing implementation or strategy documents.

## Working product description

The reviewed documents position Stoquify as an operating platform for SMBs, initially focused on Cameroon and the wider OHADA context, connecting sales, stock, cash, purchasing, and accountant handoff. They also describe broader finance, payroll, compliance, and intelligence ambitions.

The clearest initial value hypothesis is helping an owner understand daily cash and stock discrepancies and give their accountant usable supporting records. This describes intended customer value, not verified product capability or a statutory guarantee.

## What the documents establish

| Area | Evidence | Assessment |
|---|---|---|
| Customer problem | Strategy documents repeatedly identify cash discrepancies, stock loss, supplier balances, and accountant handoff | Concrete problem hypotheses suitable for interviews |
| Target buyer | Owner-managed retail, distribution, and multi-branch businesses appear in the prospect and package documents | Several candidate segments; a single validated initial customer profile is not established |
| Demand | The prospect report explicitly distinguishes prospecting from a confirmed sales pipeline | Prospect names and proposed pain points do not demonstrate willingness to buy |
| Commercial model | The package strategy explicitly labels charging units as hypotheses and calls for interviews, cost models, and design-partner quotes | Pricing and delivery economics need validation |
| Scope | The documents cover operations, finance, payroll, compliance, production, and intelligence | Broad scope creates a hypothesis that onboarding and delivery complexity could obscure the first purchase reason |

## Evidence missing from this review

The reviewed material did not establish completed customer interviews with dated observations, measured current workaround costs, accepted paid-pilot terms, actual purchase decisions, or retained customer usage. This is a limitation of the inspected evidence, not a claim that Stoquify has no customers or that such records do not exist elsewhere.

The June market strategy includes numerical success probabilities without a reproducible estimation method in that document. They are not used as validation evidence here. Historical implementation/readiness statements in the July documents were not re-certified.

## Recommended next step: pressure-test

Use the existing business concept as the starting point. Bring the following evidence for one actual prospective or current customer:

1. Their business type, location, operating scale, and the person who decides to buy.
2. A recent specific cash, stock, or accountant-handoff problem and how they handled it.
3. The current workaround and its measured time or money cost, with the period and source.
4. What they currently pay for relevant tools or assistance.
5. What they have actually committed to: payment, an accepted quote, staff time, access to relevant records, or a scheduled pilot. Distinguish each from compliments or general interest.
6. What would make them keep their current process instead of adopting Stoquify.

If customer evidence already exists, supply it before collecting more. Avoid inventing interview responses, prices, savings, or conversion estimates. Start with the buyer and workflow for which the founder has the best direct evidence; segment selection remains provisional until that evidence is reviewed.

Suggested next prompt:

> Use $pressure-test to evaluate Stoquify's demand for daily cash and stock control with accountant handoff. Use existing customer evidence first, distinguish observed behavior from assumptions, and ask me for missing facts.

## Sources inspected

- `docs/go to market/AQSTOQFLOW_OHADA_MARKET_POTENTIAL_AND_ADOPTION_STRATEGY_2026-06-29.md`: intended value proposition, segment candidates, and strategic hypotheses.
- `docs/go to market/AQSTOQFLOW_CAMEROON_GTM_PROSPECT_REPORT_2026-06-29.md`: prospecting caveat, buyer profiles, proposed discovery and pilots.
- `docs/landing page/landing-packages-adoption-commercial-strategy.md`: package hypotheses, quote-led commercial approach, and pricing-validation sequence.
- `docs/landing-page/STOQUIFY_EARLY_STAGE_FOUNDER_LANDING_EXECUTION_PROMPT_2026-07-27.md`: intended founder journey and restrictions on unsupported public claims.
- `README.md`: reviewed for orientation; its generic RBAC introduction was not used as the business definition.
- The invoked `founder-pipeline` skill: routing rules and required output dependencies.

## Verification and limits

- Checked the local pipeline output directory and inspected the documents listed above.
- No external market research, customer contact, live customer-data query, or product capability audit was performed.
- No application changes were made. Unit, database, and browser tests were not run; they would not establish customer demand.
- No BUILD / KILL / PIVOT verdict is justified by this routing assessment alone.
