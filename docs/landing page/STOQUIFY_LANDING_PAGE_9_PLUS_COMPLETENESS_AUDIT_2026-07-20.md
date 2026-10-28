# Stoquify Landing Page 9+ Completeness Audit

Date: 2026-07-20

## Executive Verdict

The current landing page is materially stronger than the baseline described in the 9+ roadmap. The hero now names the category directly, the core POS-inventory-OHADA wedge is visible immediately, sample data is labelled, a real product screenshot appears early, and most public CTAs have been redirected into a scoped adoption journey.

It is not yet a 9+/10 landing page under the roadmap's own acceptance contract.

- Current presentation-quality estimate: **8.0/10**
- Current roadmap-completeness score: **6.5/10**
- Release recommendation for a high-visibility growth campaign: **NEEDS WORK**
- Main reason: the page still behaves like a complete platform catalogue rather than a focused acquisition journey.

The completeness score uses the roadmap's 13 final acceptance criteria with `Complete = 1`, `Partial = 0.5`, and `Missing/Premature = 0`. Six criteria are complete, five are partial, and two are missing: `8.5 / 13 = 65.4%`.

## Authoritative Source

The authoritative source for this audit is:

`docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`

Why this source was selected:

- It is explicitly named the Stoquify Landing Page 9+ Roadmap.
- It is dated 2026-07-19 and is newer and more landing-specific than the general platform, UI/UX, go-to-market, module, payroll, and referral roadmaps.
- Its paired PDF has the same date and subject.
- The implementation report `STOQUIFY_LANDING_PAGE_SKILL_EXECUTION_REPORT_2026-07-19.md` explicitly treats it as the governing landing-page roadmap.

## Evidence Reviewed

Primary implementation:

- `app/[locale]/(home)/page.tsx`
- `app/[locale]/(home)/layout.tsx`
- `app/layout.tsx`
- `components/landing/*`
- `messages/en.json`
- `messages/fr.json`

Architecture and product context:

- `graphify-out/GRAPH_REPORT.md`
- `docs/landing page/STOQUIFY_LANDING_PAGE_SKILL_EXECUTION_REPORT_2026-07-19.md`
- `what-next/ui-ux/stoquify-landing-release-gate-2026-07-19.md`
- `what-next/ui-ux/product-command-screenshot-report-2026-07-19.md`

Verification contracts:

- `scripts/__tests__/landing-public-content.test.js`
- `scripts/__tests__/landing-navigation-localization.test.js`
- `scripts/public-content-browser-smoke.js`
- `scripts/landing-navigation-localization-browser-smoke.js`
- `scripts/product-command-screenshot-browser-smoke.js`

Saved browser evidence:

- `what-next/ui-ux/screenshots/2026-07-19/public-home-desktop.png` - 1440 x 10,824
- `what-next/ui-ux/screenshots/2026-07-19/public-home-mobile.png` - 390 x 20,542
- EN/FR Product Command, use-case, navigation, login, and registration captures under `what-next/ui-ux/screenshots/2026-07-19/`

Focused gates rerun during this audit:

- `npm run ui:gate:public-content` - passed, 7/7 tests
- `npm run ui:gate:landing-navigation-localization` - passed, 5/5 tests

The green gates prove consistency with the current source. They do not prove roadmap completeness because several assertions preserve pre-roadmap density.

## Dimension Scorecard

These scores are source-and-evidence estimates, not substitutes for buyer testing or Lighthouse measurements.

| Dimension | Roadmap baseline | Current estimate | Target | Assessment |
| --- | ---: | ---: | ---: | --- |
| First impression and brand signal | 8.0 | 8.9 | 9.2 | Premium and credible; category is now concrete |
| Instant category simplicity | 6.5 | 9.2 | 9.1 | Target reached in hero copy |
| Product clarity | 7.0 | 7.8 | 9.2 | Breadth is clear, but the 17-card workflow obscures the simple operating model |
| Visual design quality | 8.5 | 9.0 | 9.3 | Strong visual system and real screenshot proof |
| Messaging quality | 7.5 | 8.2 | 9.2 | Hero improved; lower-page copy and CTAs are not fully coherent |
| Trust and credibility | 7.0 | 7.5 | 9.3 | Proof boundaries improved; public trust path remains incomplete |
| Conversion efficiency | 6.5 | 7.0 | 9.1 | Most CTAs align; one prominent scenario CTA still promises workspace creation |
| Responsive/accessibility/performance posture | 7.5 | 7.6 | 9.2 | Browser evidence is good; Lighthouse and full tablet certification are absent |
| OHADA/SYSCOHADA market fit | 9.0 | 9.2 | 9.5 | Central and concrete, with generally responsible qualification |
| Information-density control | 6.5 | 5.8 | 9.2 | Still the largest gap: 12 sections, 17 workflow cards, 14 scenarios, and 20,542 mobile pixels |

## Priority Findings

### Critical

#### C1. The conversion promise is still inconsistent

The header, hero, buyer pathways, People/Payroll, and final CTA now lead to `/#pricing` and describe a scoped rollout. The adoption section then provides the deliberate `/register` handoff with a clear statement that activation is not instant self-service.

However, `components/landing/use-cases.tsx:167` still links directly to `/register`, while `messages/en.json:1796` says `Create your workspace`. This bypasses the qualifying adoption explanation and contradicts the roadmap's quote-led sales posture.

Required correction:

- Change the scenario CTA to the same qualified rollout intent used elsewhere.
- Allow `/register` only from the adoption handoff until true self-service is approved.
- Extend the CTA test to inventory every unauthenticated landing link, not only selected components.

### High

#### H1. The page has not completed the density reset

The current route renders 12 major sections. The saved full-page capture is 10,824 pixels tall on desktop and 20,542 pixels on mobile.

The main density sources are:

- 17 cards in `ConnectedWorkflow`
- 14 cards in `UseCases`
- a dedicated `PeopleToPay` section before trust
- a seven-module `ModuleDeepDives` tab surface
- a separate automation section
- nine section-navigation destinations

This directly conflicts with P0.6, P1.6, P2.1, and the roadmap's ideal five-item navigation.

#### H2. Passing tests preserve the wrong information architecture

Current gates explicitly enforce:

- 14 use cases in `landing-public-content.test.js:46`
- `slideCount === 14` and at least 14 indicators in `public-content-browser-smoke.js:112`
- all nine navigation targets in `landing-navigation-localization.test.js:170`
- the same nine targets in `landing-navigation-localization-browser-smoke.js:6`

These tests are internally correct but strategically stale. A roadmap implementation that compresses navigation and scenarios would fail until the contracts are rewritten.

#### H3. The trust path is too late and incomplete

`TrustSection` appears ninth, after People/Payroll, module deep dives, and automation. It covers permissions, audit trails, branch/device accountability, and ledger-connected finance, but does not yet provide the roadmap's complete public trust path:

- tenant isolation
- data redaction
- approved backups and recovery posture
- responsible sample/demo boundaries
- support and implementation safeguards
- evidence-linked security claims
- a dedicated public trust route or persistent trust link

The footer also has no privacy, security, trust-center, or terms destination.

#### H4. Performance is unmeasured against the roadmap budget

Production build and browser smokes have passed, and the real Product Command screenshot uses Next Image responsively. No evidence was found for:

- Lighthouse desktop 90+
- Lighthouse mobile 85+
- LCP below 2.5 seconds
- CLS below 0.1
- a documented waiver and remediation plan

The page includes two Embla carousels and remains exceptionally long on mobile. P2.4 and acceptance criterion 11 are not met.

#### H5. French is accented but not yet enterprise-polished

The French catalogue contains accents and the localization gate passes, but critical buyer copy still includes defects:

- `messages/fr.json:1785` contains `Adapté àux`, with incorrect capitalization and spelling.
- Hero dashboard text leaks `AP`, `RBAC`, `step-up`, and `mobile money`.
- Some phrases read as translated product language rather than native Francophone business language.

The current banned-word test does not catch these terms. P2.5 still requires a human Francophone OHADA review.

#### H6. Homepage depth has no public product-page outlet

Only the public home and waitlist routes exist in the `(home)` route group. There are no dedicated public pages for POS, inventory/purchasing, finance/reconciliation, OHADA accounting/close, compliance evidence, or HRIS/payroll.

As a result, `ModuleDeepDives`, People/Payroll, automation, and fourteen scenarios remain on the homepage because there is nowhere public to move them.

### Medium

#### M1. Buyer pathways are present but incomplete

`OperationsMap` now has four pathways and no protected dashboard links. This is a good P1.1 foundation.

Gaps:

- the four paths are retail control, cash/OHADA close, purchasing/suppliers, and regulated extensions rather than the roadmap's retail, inventory/purchasing, finance/close, and multi-branch leadership paths;
- cards do not separately state job, pain, outcome, and CTA;
- every card leads to the same adoption anchor;
- multi-branch leadership is not a first-class path.

#### M2. The workflow communicates breadth, not the simple OHADA flow

`ConnectedWorkflow` is an accessible 17-card carousel covering modules from POS through administration. P1.2 instead requires one compact visual:

`Sale -> Stock movement -> Purchase/receiving -> Payment -> Reconciliation -> OHADA posting -> Close evidence`

The current surface is a module catalogue labelled as a workflow.

#### M3. Adoption is transparent but not operationally explicit

The adoption section correctly avoids unsupported public prices, labels quote-led delivery, exposes dependencies, says activation is not instant self-service, and distinguishes paths, extensions, and services.

It does not show the promised post-CTA sequence:

`Discovery -> branch/process mapping -> data review -> pilot workspace -> training -> control sign-off -> rollout decision`

#### M4. SEO has a useful root description but no landing strategy

`app/layout.tsx` names the OHADA operating category, but the landing route has no localized metadata, canonical strategy, product-page keyword mapping, or content cluster. P2.6 is only partially represented.

#### M5. Conversion analytics are absent

No landing event map or implementation was found for hero CTA, workflow, buyer paths, trust, adoption, language switching, or public-to-auth transitions. Privacy/consent requirements and provider choice remain unresolved.

### Low / Roadmap-Dependent

- No guided 60-120 second product walkthrough.
- No approved customer, accountant, advisor, or rollout case study.
- No hero A/B test framework.
- No ROI or close-risk calculator.
- No country/industry landing variants.
- No accountant/partner hub.

These should not be built before the P0/P1 corrections, approved proof, analytics consent, and country-pack provenance are ready.

## Roadmap Traceability Matrix

| Roadmap item | Status | Current evidence | Gap to completion |
| --- | --- | --- | --- |
| P0.1 Hero Category Reset | **Complete** | Hero leads with POS, inventory, and OHADA accounting in one controlled flow | Run the five-reader comprehension test and retain EN/FR parity |
| P0.2 CTA And Sales-Motion Alignment | **Partial** | Header, hero, pathways, People/Payroll, and final CTA lead to adoption | Remove the direct scenario `/register` CTA and prove one consistent click path |
| P0.3 Public Proof Block | **Complete** | Real Product Command screenshot appears as the third section with provenance | Keep it approved and replace E2E-labelled data with a curated demo capture when available |
| P0.4 Sample Data And Demo Boundary Labeling | **Complete** | Hero says sample operating data; screenshot is classified as redacted product evidence | Maintain public-asset leakage review |
| P0.5 Public-To-Auth Link Cleanup | **Partial** | Protected module links were removed | Add complete link inventory, auth-transition intent, and analytics distinction |
| P0.6 First-Page Density Compression | **Partial** | Core wedge dominates the first sections; buyer pathways replaced a module grid | Reduce 12 sections, 17 workflow cards, 14 scenarios, and nine nav targets |
| P0.7 Fresh Production Readiness Baseline | **Partial** | Build, typecheck, EN/FR browser smokes, desktop/mobile captures, and no-overflow checks passed | Add full tablet route capture, reduced-motion evidence, and current production-like performance proof |
| P1.1 Buyer Pathway Section | **Partial** | Four pathway cards exist near the upper page | Add job/pain/outcome/CTA structure and a multi-branch leadership path |
| P1.2 OHADA-Ready Workflow Visual | **Partial** | Accessible workflow carousel contains the relevant modules | Replace it with a compact seven-stage business flow |
| P1.3 Product Proof And Screenshot Upgrade | **Complete** | Real 1440 x 1000 product screenshot, responsive smoke, provenance, and redaction label | Produce an optimized curated demo-tenant version if public campaign quality requires it |
| P1.4 Security, Privacy, And Compliance Trust Path | **Partial** | Four operational assurance cards exist | Add isolation, redaction, recovery, sample-data, support safeguards, evidence links, and public trust route |
| P1.5 Adoption And Pricing Expectation Clarity | **Partial** | Quote-led model, paths, extensions, dependencies, and non-instant activation are explicit | Show the seven-step adoption journey after CTA |
| P1.6 Use Case Compression | **Missing** | Fourteen outcome-led scenarios remain in a carousel | Show 3-5 on home and move the remainder to a public page or disclosure |
| P1.7 Conversion Analytics Event Map | **Missing** | No landing event contract found | Approve provider/consent posture, then add non-sensitive events |
| P2.1 Dedicated Product And Module Pages | **Missing** | No public product routes exist | Create six localized product routes with readiness and proof boundaries |
| P2.2 Short Product Demo Or Guided Walkthrough | **Missing** | No video or interactive walkthrough found | Create only with approved, redacted demo data and performance safeguards |
| P2.3 Case Studies And Advisor Proof | **Missing** | Product implementation evidence exists, but no approved external proof | Secure permission and evidence for 1-3 truthful artifacts |
| P2.4 Performance Budget And Asset Optimization | **Partial** | Next Image and responsive browser checks exist | Run production Lighthouse/trace and enforce LCP/CLS/score budgets |
| P2.5 Francophone OHADA Copy Polish | **Partial** | Accents and EN/FR parity gates exist | Correct visible defects and obtain human Francophone OHADA review |
| P2.6 SEO And Content Cluster | **Partial** | Root metadata is category-aware | Add localized landing metadata, public product routes, internal links, and keyword map |
| P3.1 Hero A/B Testing | **Premature** | No analytics or experiment framework | Start only after one canonical CTA and privacy-safe measurement exist |
| P3.2 ROI Or Close-Risk Calculator | **Premature** | No validated assumptions or calculator | Defer until finance assumptions and compliance review are approved |
| P3.3 Country And Industry Landing Variants | **Premature** | Country/compliance language exists | Defer until base page is 9+ and each country claim has provenance |
| P3.4 Accountant And Partner Hub | **Missing** | Accountant collaboration appears as one scenario | Validate the channel and capability, then create a dedicated public path |

## Platform Capability Representation

| Capability area | Landing representation | Truth/readiness assessment | Required treatment |
| --- | --- | --- | --- |
| POS and retail control | Hero, problem, product cards, workflow, pathways, scenarios, adoption | Strong and central | Keep as the primary acquisition wedge |
| Inventory, transfers, and valuation | Hero, problem, gallery, workflow, deep dives, scenarios | Strong but repeated | Keep one homepage proof point; move depth to a product page |
| Purchasing, receiving, suppliers, and AP | Problem, workflow, pathways, deep dives, scenarios, adoption | Strong and generally precise | Consolidate under inventory/purchasing public path |
| Payments and reconciliation | Hero, workflow, automation, scenarios, adoption | Strong but concept-heavy | Show visually in the compact operating flow |
| OHADA accounting and close | Hero, gallery, workflow, deep dives, trust, scenarios | Strong and differentiated | Keep central; avoid statutory guarantees |
| Compliance and country packs | Workflow, deep dives, scenarios, adoption | Present with some readiness qualification | Add provenance/readiness language because external statutory approval remains a release boundary |
| HRIS and payroll | Dedicated PeopleToPay section, workflow, deep dives, scenarios, adoption | Truthfully bounded but overrepresented before trust | Move to an extension/product page and retain controlled-pilot language |
| Offline and multi-branch operations | Workflow, trust, scenarios | Strong and concrete | Elevate multi-branch leadership into a buyer pathway |
| Security, permissions, and audit | Hero proof pills and TrustSection | Real but incomplete as public trust communication | Add approved isolation, redaction, recovery, and support safeguards |
| Automation and AI-assisted work | Rule examples and later-stage intelligence extension | Automation is represented; AI is not overclaimed | Keep lower or move to product depth; distinguish rules from AI |
| Production operations and intelligence | Adoption extensions labelled controlled beta/later-stage | Responsibly qualified | Keep off the core homepage path until readiness improves |

The consolidated knowledge graph supports the core narrative: it identifies a `Ledger-First OHADA Operating Spine` and a `Connected SMB Operations Story`. The landing page's strongest positioning therefore matches the architecture; the issue is hierarchy and proof, not lack of platform breadth.

## 9+ Acceptance Criteria

| # | Criterion | Status | Evidence / decision |
| ---: | --- | --- | --- |
| 1 | First-time visitor identifies the category in 5-10 seconds | **Complete** | H1 explicitly names POS, inventory, and OHADA accounting; external five-reader test remains advisable |
| 2 | Hero communicates core wedge before platform breadth | **Complete** | Exact category-first hero implementation |
| 3 | CTA matches the real sales motion | **Partial** | Most CTAs are rollout-led; scenario CTA still promises workspace creation |
| 4 | Real proof appears before the lower half | **Complete** | Product proof is section three |
| 5 | Every public claim has evidence | **Partial** | Screenshot provenance exists; no complete claims-owner registry was found |
| 6 | Sample/demo data is labelled | **Complete** | Hero sample label and product screenshot classification are present |
| 7 | Public links avoid unexpected protected/auth dead ends | **Partial** | Protected module links were removed; use-case registration bypass and transition tracking remain |
| 8 | EN/FR preserve meaning, tone, and fit | **Partial** | Browser parity exists; visible French defects remain |
| 9 | Mobile/tablet/desktop show no clipping or overflow | **Partial** | Desktop/mobile full-route evidence and component tablet evidence exist; no full tablet certification |
| 10 | Production build and browser smoke pass | **Complete** | Release report records build/typecheck and browser-smoke success |
| 11 | Performance budgets are met or remediated | **Missing** | No Lighthouse/LCP/CLS evidence or waiver found |
| 12 | Deep detail exists without overwhelming home | **Missing** | Detail exists, but remains on the 20,542-pixel mobile homepage, so the non-overwhelming condition is not met |
| 13 | OHADA/SYSCOHADA remains central and concrete | **Complete** | Hero, workflow, accounting, close, and adoption preserve the regional moat |

## Recommended Information Architecture

### Primary navigation

Use exactly five section destinations:

1. Product
2. Workflow
3. Trust
4. Scenarios
5. Adoption

Language, login, and the primary rollout CTA remain separate utilities.

### Homepage order

1. **Hero** - category promise, two CTAs, labelled sample visual
2. **Problem** - disconnected sales, stock, buying, payments, accounting, and close evidence
3. **Controlled Workflow** - seven-stage sale-to-close visual visible without carousel interaction
4. **Product Proof** - real Product Command screenshot with caption and provenance
5. **Buyer Pathways** - retail/POS, inventory/purchasing, finance/close, multi-branch leadership
6. **OHADA And Trust** - regional accounting evidence plus approved security/privacy controls
7. **Operating Scenarios** - four strongest scenarios, one per buyer path
8. **Adoption** - progressive package disclosure plus the seven-step rollout journey
9. **Final CTA** - rollout request plus product workflow alternative

### Move off the homepage

- People/Payroll narrative -> `/product/hris-payroll`
- Seven module deep dives -> relevant product pages
- Full automation catalogue -> product/automation depth or adoption extensions
- Remaining ten use cases -> `/use-cases`
- Security/privacy detail -> `/trust`
- Product/module catalogue -> localized public product routes

### Recommended public routes

- `/product/pos-retail`
- `/product/inventory-purchasing`
- `/product/finance-reconciliation`
- `/product/ohada-accounting-close`
- `/product/compliance-evidence`
- `/product/hris-payroll`
- `/trust`
- `/use-cases`

Each route should state buyer, job, capability, proof, controls, readiness boundary, and CTA.

## Implementation-Ready Change Plan

### Immediate corrections

1. Align the use-case CTA with `Plan rollout`; remove its direct `/register` handoff.
2. Expand the CTA gate to inspect every public landing link and allow `/register` only inside adoption.
3. Reduce navigation to Product, Workflow, Trust, Scenarios, and Adoption.
4. Replace the 17-card workflow carousel with the seven-stage OHADA-ready business visual.
5. Show four scenarios on home; move or defer the other ten.
6. Move PeopleToPay, ModuleDeepDives, and Automation below adoption or remove them from home pending public product pages.
7. Move and strengthen trust before scenarios.
8. Correct French buyer copy, including `Adapté àux`, and remove unexplained AP/RBAC/step-up language.
9. Rewrite tests and browser smokes so they enforce the roadmap contract rather than 14 slides and nine navigation targets.

Exit gate:

- one conversion intent;
- five navigation items;
- 3-5 homepage scenarios;
- seven-stage workflow visible without interaction;
- no direct public-to-auth transition outside adoption;
- EN/FR review passed.

### Near-term upgrades

1. Add complete buyer-path content: job, pain, outcome, proof, CTA.
2. Add approved trust controls and a dedicated `/trust` route.
3. Add the seven-step adoption journey.
4. Add localized route metadata, canonical links, and social metadata.
5. Run a full claims/evidence-owner inventory.
6. Add full-page tablet browser evidence and reduced-motion certification.
7. Run production Lighthouse/Playwright traces and enforce the roadmap budgets.

### Roadmap-dependent additions

1. Create six localized product pages and the full use-case library.
2. Produce a redacted 60-120 second walkthrough.
3. Publish approved customer/advisor/accountant proof.
4. Select privacy-safe analytics and implement the event map.
5. Add A/B tests only after the canonical conversion path is stable.
6. Add country/industry variants only with country-pack provenance and review.
7. Validate the accountant channel before creating a partner hub.
8. Build a calculator only from transparent, approved assumptions.

## Required Test And Evidence Changes

Static gates:

- assert exactly five primary navigation destinations;
- assert 3-5 visible homepage scenarios;
- assert a seven-stage business workflow;
- inventory all landing links and permit `/register` only in adoption;
- assert the complete approved trust vocabulary;
- extend French checks for `AP`, `RBAC`, `step-up`, incorrect `àux`, and English-first phrasing;
- map every public claim to an evidence owner.

Browser gates:

- capture full EN/FR landing pages at mobile, tablet, and desktop;
- click every CTA as an unauthenticated visitor;
- verify the five navigation destinations and scrollspy;
- verify reduced motion;
- verify no horizontal overflow, clipping, hydration warning, failed request, or blocking console error;
- verify screenshot legibility and redaction.

Release gates:

- production build;
- Lighthouse desktop 90+;
- Lighthouse mobile 85+ or documented waiver;
- LCP below 2.5 seconds;
- CLS below 0.1;
- policy gates for any new security, compliance, statutory, or customer-proof claim.

## Residual Launch Risk

1. **Conversion risk:** the use-case CTA still creates a workspace expectation outside the scoped adoption explanation.
2. **Cognitive-load risk:** the 20,542-pixel mobile page asks cold visitors to process too much breadth.
3. **Trust risk:** public security/privacy posture is incomplete, and external proof is absent.
4. **Statutory-claim risk:** country-pack expert approval remains an external release boundary; marketing must stay qualified.
5. **Localization risk:** passing structural tests do not replace a human Francophone OHADA review.
6. **Performance risk:** no production-like Lighthouse/LCP/CLS evidence exists.
7. **Proof risk:** the current screenshot visibly contains E2E-labelled data, though it is accurately classified and provenance-backed.
8. **Measurement risk:** no privacy-approved conversion event map exists.

## Final Decision

Stoquify's landing page now communicates the correct product category and possesses a credible visual and product-proof foundation. It represents the core operating mission truthfully: POS, stock, purchasing, payments, reconciliation, OHADA accounting, and close evidence are connected, while HRIS/payroll and regulated capabilities are generally presented as controlled extensions.

The page should not yet be declared 9+ complete. The next work should be subtraction and sequencing, not more homepage cards:

1. unify conversion truth;
2. compress navigation, workflow, scenarios, and deep modules;
3. elevate and complete trust;
4. polish French with a human reviewer;
5. create public product-depth routes;
6. certify performance and analytics.

Once the immediate and near-term gates pass, the page can credibly move from a strong 8/10 presentation to the roadmap's 9+ standard.