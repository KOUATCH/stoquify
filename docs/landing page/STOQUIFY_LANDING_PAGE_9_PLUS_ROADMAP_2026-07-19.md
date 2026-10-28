# Stoquify Landing Page 9+ Roadmap

Date: 2026-07-19

Source prompt: `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_PROMPT_2026-07-19.md`

Primary baseline: `what-next/STOQUIFY_LANDING_PAGE_COMPETITIVE_REVIEW_2026-07-19.md`

Goal: move the Stoquify public landing page to a 9+/10 quality bar across first impression, product clarity, visual quality, messaging, trust, conversion flow, responsiveness, accessibility, performance posture, and OHADA/SYSCOHADA market fit.

## Executive Outcome

The competitive review concluded that Stoquify is not underbuilt. The page is premium, serious, and differentiated, especially around ledger-first operations, OHADA/SYSCOHADA awareness, audit-ready controls, branch accountability, reconciliation, and close evidence.

The main gap is not design polish. The main gap is market-facing clarity.

To reach 9+/10, the landing page should preserve its premium operating-system identity while making the first-time buyer path simpler:

1. Lead with a concrete product category: POS, inventory, and OHADA accounting in one controlled flow.
2. Explain the core mechanism before listing the whole platform.
3. Move credible proof earlier.
4. Turn modules into buyer pathways instead of a dense catalogue.
5. Align the CTA with the real sales motion.
6. Label sample data and avoid unverified public claims.
7. Certify the page with production build, browser smoke, responsive screenshots, accessibility checks, and performance budgets.

Target classification after this roadmap: premium, focused, credible, and conversion-ready.

## Evidence Reviewed

Local landing implementation:

- `app/[locale]/(home)/page.tsx`
- `app/[locale]/(home)/landing.css`
- `app/[locale]/(home)/layout.tsx`
- `app/[locale]/(home)/landing-fonts.ts`
- `components/landing/*`
- `messages/en.json`
- `messages/fr.json`

Review and UI evidence:

- `what-next/STOQUIFY_LANDING_PAGE_COMPETITIVE_REVIEW_2026-07-19.md`
- `docs/landing page/STOQUIFY_LANDING_PAGE_COMPETITIVE_REVIEW_2026-07-19.pdf`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_07_PUBLIC_FIRST_IMPRESSION_REPORT_2026-07-18.md`
- `what-next/ui-ux/landing-navigation-localization-report-2026-07-18.md`
- `what-next/ui-ux/landing-packages-adoption-report-2026-07-18.md`
- `what-next/ui-ux/product-command-screenshot-report-2026-07-19.md`

Existing page order from `app/[locale]/(home)/page.tsx`:

1. `LandingHero`
2. `DisconnectProblem`
3. `ProductGallery`
4. `ConnectedWorkflow`
5. `OperationsMap`
6. `PeopleToPay`
7. `ModuleDeepDives`
8. `AutomationSection`
9. `TrustSection`
10. `UseCases`
11. `PricingSection`
12. `FinalCTA`

Important baseline findings from the competitive review:

- The first 2-3 viewports should be simplified.
- The product category should be sharper.
- Stronger public proof is needed.
- Deeper module/control material should move into progressive sections or dedicated pages.
- CTA wording should match the quote-led commercial posture unless self-service provisioning is ready.
- Dashboard/demo metrics should be labeled as sample data if not live proof.
- Direct links from public module cards into protected dashboard routes should be softened or replaced.

## Score Lift Targets

| Dimension | Baseline | Target | Roadmap lever |
| --- | ---: | ---: | --- |
| First impression and brand signal | 8.0 | 9.2 | Keep premium control-room feel, simplify first message |
| Instant category simplicity | 6.5 | 9.1 | Lead with POS + inventory + OHADA accounting |
| Product clarity | 7.0 | 9.2 | Add workflow visual and buyer pathways |
| Visual design quality | 8.5 | 9.3 | Keep system, increase real product proof |
| Messaging quality | 7.5 | 9.2 | Rewrite hero, benefits, CTA, and adoption copy |
| Trust and credibility | 7.0 | 9.3 | Add truthful proof, trust center, security/compliance pathway |
| Conversion efficiency | 6.5 | 9.1 | Align CTA with demo/discovery or true self-service |
| Responsiveness/accessibility/performance posture | 7.5 | 9.2 | Production smoke, screenshots, accessibility and Lighthouse budgets |
| OHADA/SYSCOHADA market fit | 9.0 | 9.5 | Convert expertise into concrete buyer outcomes |
| Information-density control | 6.5 | 9.2 | Move deep modules to product pages and progressive disclosure |

Note: the original review scored "overkill risk" as high. The target here is not a high overkill score; it is a 9+ score for density control and buyer legibility.

## P0 Roadmap - Must Fix Before Public Growth Push

### P0.1 Hero Category Reset

Problem it solves: the current hero is premium but too abstract and dense for a cold visitor. "Ledger-first operating system" is differentiated, but the page should first anchor what the product does.

Target dimensions: first impression, product clarity, messaging, conversion flow.

Expected impact: High. This is the single highest-leverage change for 5-10 second comprehension.

Effort: Medium.

Dependencies: `messages/en.json`, `messages/fr.json`, `components/landing/hero.tsx`, CTA copy, hero metric labels, EN/FR parity review.

Recommended owner lens: product strategist, UI/UX specialist, senior frontend engineer, content lead.

Acceptance criteria:

- H1 or immediate subhead makes the core category obvious without requiring module-list parsing.
- Recommended message direction: "POS, inventory, and OHADA accounting in one controlled flow."
- Subhead explains the operating mechanism in one sentence: sales, stock, purchasing, payments, reconciliation, and close evidence stay connected.
- Hero copy uses no more than five product nouns before the first CTA.
- Payroll, HRIS, compliance, and automation appear as extensions after the core product is clear.
- English and French versions communicate the same product promise.

Verification method:

- Five-second comprehension test with at least 5 representative readers.
- EN/FR copy review.
- Browser screenshots for desktop, tablet, and mobile.
- Existing public content Jest tests updated for the new promise.

### P0.2 CTA And Sales-Motion Alignment

Problem it solves: the competitive review found tension between the registration CTA and the quote-led adoption posture.

Target dimensions: conversion flow, trust, product clarity.

Expected impact: High. A buyer should know what happens when they click.

Effort: Small to Medium.

Dependencies: sales/adoption decision, available onboarding flow, route behavior for `/register`, `PricingSection`, `FinalCTA`, header CTA.

Recommended owner lens: product strategist, SaaS growth advisor, frontend engineer.

Acceptance criteria:

- If self-service workspace creation is not fully ready, the primary CTA becomes demo/discovery oriented.
- Recommended primary CTA: "Book an OHADA operations demo."
- Recommended secondary CTA: "See the product workflow."
- Registration remains available only where the resulting flow is honest and useful.
- Pricing/adoption copy explains the next steps after contact.
- Header, hero, pricing/adoption, and final CTA use consistent conversion intent.

Verification method:

- Click-path smoke for CTA links.
- Copy inventory review across EN/FR.
- Browser route smoke confirms no CTA leads to a confusing dead end.

### P0.3 Public Proof Block

Problem it solves: Stoquify has strong internal proof language but fewer external credibility signals than Square, Shopify, Lightspeed, Odoo, or QuickBooks.

Target dimensions: trust, conversion flow, first impression.

Expected impact: High if proof is real; Medium if only implementation evidence is available.

Effort: Medium.

Dependencies: approved customer, pilot, advisor, accountant, implementation, or product evidence. Legal/commercial approval for any public names or metrics.

Recommended owner lens: product strategist, growth advisor, compliance reviewer.

Acceptance criteria:

- Add a proof band within the first 2-3 viewports.
- Use only verified claims.
- If customer logos are unavailable, use approved alternatives: accountant-reviewed workflow, pilot branch status, implementation screenshots, product evidence, or "sample workflow" labels.
- Every claim has an internal source owner and evidence file.
- No invented logos, customer counts, processed-volume numbers, compliance certifications, or testimonials.

Verification method:

- Public claims review checklist.
- Content source inventory saved under `what-next/` or `docs/landing page/`.
- `npm run policy:gates` before release if new trust/compliance claims are added.

### P0.4 Sample Data And Demo Boundary Labeling

Problem it solves: the hero dashboard and product visuals are strong, but simulated metrics can weaken trust if not labeled.

Target dimensions: trust, cyber-security posture, business credibility, messaging.

Expected impact: Medium to High.

Effort: Small.

Dependencies: hero dashboard copy, product gallery captions, screenshot provenance report.

Recommended owner lens: cyber-security architect, compliance reviewer, frontend engineer.

Acceptance criteria:

- Any non-live hero dashboard data is labeled as sample or demo operating data.
- Captions distinguish real product screenshots from designed mockups.
- No financial, customer, payroll, or tenant-sensitive data appears in public assets.
- Product screenshot provenance is documented.

Verification method:

- Static content search for metric labels.
- Screenshot review for public data leakage.
- `npm run policy:gates` if demo trust gates cover these claims.

### P0.5 Public-To-Auth Link Cleanup

Problem it solves: public module cards that link directly into protected dashboard routes can create a conversion break for unauthenticated visitors.

Target dimensions: conversion flow, UX, security posture.

Expected impact: Medium.

Effort: Medium.

Dependencies: `OperationsMap`, module cards, public product-detail anchors or pages, auth-aware route behavior.

Recommended owner lens: frontend engineer, UI/UX specialist, security/RBAC specialist.

Acceptance criteria:

- Public landing links lead to public information, demo booking, or a deliberate auth-aware transition.
- Protected route links clearly indicate sign-in or workspace requirement before redirect.
- No public CTA creates a confusing unauthorized or login-wall experience.
- Tracking distinguishes product exploration from account creation.

Verification method:

- Link map audit.
- Browser route smoke for all public CTAs.
- Manual unauthenticated click test on desktop and mobile.

### P0.6 First-Page Density Compression

Problem it solves: the current page carries homepage, platform narrative, module catalogue, assurance page, use cases, adoption, and conversion in one flow.

Target dimensions: product clarity, messaging, conversion, information-density control.

Expected impact: High.

Effort: Medium to Large.

Dependencies: page order, section navigation, `PeopleToPay`, `ModuleDeepDives`, `OperationsMap`, `UseCases`.

Recommended owner lens: UI/UX specialist, product strategist, frontend engineer.

Acceptance criteria:

- First 2-3 viewports focus on core wedge: POS, inventory, purchasing/payments, OHADA accounting, close proof.
- HRIS/payroll is repositioned as an extension unless it is a core acquisition wedge.
- Module deep dives move lower, collapse into progressive disclosure, or shift to dedicated pages.
- Navigation reduces visible cognitive load to 5 core items: Product, Workflow, Trust, Scenarios, Adoption.
- The visitor can understand the primary offer without interacting with tabs or carousels.

Verification method:

- Before/after first-viewport screenshot comparison.
- Five-second comprehension test.
- Landing navigation smoke in EN/FR.

### P0.7 Fresh Production Readiness Baseline

Problem it solves: prior browser evidence is strong, but the 9+ roadmap requires current production-style verification.

Target dimensions: responsiveness, accessibility, performance posture, trust.

Expected impact: Medium.

Effort: Small to Medium.

Dependencies: stable local dev or production preview server, Playwright browser availability.

Recommended owner lens: senior frontend engineer, QA/release reviewer.

Acceptance criteria:

- Production build completes.
- Landing route renders in EN and FR without hydration warnings.
- Screenshots exist for mobile, tablet, and desktop.
- No horizontal overflow.
- No blocking console errors.
- Reduced-motion behavior remains honored.

Verification method:

```powershell
npm run typecheck
npm run build:app
node scripts/public-content-browser-smoke.js --base-url http://localhost:3001
node scripts/landing-navigation-localization-browser-smoke.js --base-url http://localhost:3001
node scripts/ui-route-smoke-gate.js --base-url http://localhost:3001 --require-screenshots
```

## P1 Roadmap - Conversion And Trust Upgrades

### P1.1 Buyer Pathway Section

Problem it solves: competitors let buyers self-identify quickly. Stoquify currently gives a module map before buyer pathways are fully clear.

Target dimensions: product clarity, conversion, messaging.

Expected impact: High.

Effort: Medium.

Dependencies: content strategy, section ordering, possible new component.

Recommended owner lens: product strategist, UX specialist, growth advisor.

Acceptance criteria:

- Add 3-4 buyer paths near the top:
  - Retail and POS operators
  - Inventory and purchasing teams
  - Finance/accounting close teams
  - Multi-branch leadership
- Each path states job, pain, Stoquify outcome, and next CTA.
- Paths do not fragment into nine modules.
- OHADA relevance is included in each path where appropriate.

Verification method:

- Content review against actual implemented capabilities.
- Mobile scan test.
- CTA click-path test.

### P1.2 OHADA-Ready Workflow Visual

Problem it solves: the page explains the operating system in words, but needs a simple visual model.

Target dimensions: product clarity, OHADA/SYSCOHADA fit, visual quality, messaging.

Expected impact: High.

Effort: Medium.

Dependencies: product truth review, accounting/control copy, diagram component.

Recommended owner lens: OHADA/SYSCOHADA-aware platform architect, UI/UX specialist, content lead.

Acceptance criteria:

- Add a compact workflow visual:
  - Sale
  - Stock movement
  - Purchase/receiving
  - Payment
  - Reconciliation
  - OHADA posting
  - Close evidence
- The visual uses plain business labels, not internal architecture terms.
- The copy clarifies that Stoquify connects operational events to accounting evidence.
- No legal/accounting rules are hardcoded or overclaimed.

Verification method:

- Accounting/product review.
- EN/FR translation review.
- Responsive screenshot review.

### P1.3 Product Proof And Screenshot Upgrade

Problem it solves: product proof needs to feel real earlier and more often.

Target dimensions: visual quality, trust, product clarity.

Expected impact: High.

Effort: Medium.

Dependencies: approved product screenshots, screenshot provenance, image optimization.

Recommended owner lens: frontend engineer, UI/UX specialist, product strategist.

Acceptance criteria:

- Use at least one real product screenshot in the first 3-4 sections.
- Captions explain what the screenshot proves.
- Screenshot assets are optimized for desktop and mobile.
- No sensitive data appears.
- Product visual does not become too small or too dense on mobile.

Verification method:

```powershell
node scripts/product-command-screenshot-browser-smoke.js --base-url http://localhost:3001
```

Also run visual review on mobile, tablet, and desktop.

### P1.4 Security, Privacy, And Compliance Trust Path

Problem it solves: buyers asked to trust a system with payments, accounting, payroll, and close evidence need a visible trust path.

Target dimensions: trust, cyber-security posture, conversion.

Expected impact: High for serious buyers.

Effort: Medium to Large.

Dependencies: approved security posture, privacy posture, RBAC/audit language, support policy.

Recommended owner lens: cyber-security architect, compliance reviewer, product strategist.

Acceptance criteria:

- Add a public trust link or section that covers:
  - tenant isolation
  - RBAC and permissions
  - audit trails
  - data redaction
  - backups and recovery posture if approved
  - responsible demo/sample data boundaries
  - support and implementation safeguards
- Avoid claiming certifications or legal guarantees unless documented.
- Link trust language from hero/proof/adoption sections.

Verification method:

- Security copy review.
- Claims/evidence mapping.
- `npm run policy:gates` before public release.

### P1.5 Adoption And Pricing Expectation Clarity

Problem it solves: the current adoption section is quote-led, which is correct, but buyers need a clearer next-step promise.

Target dimensions: conversion flow, trust, messaging.

Expected impact: Medium to High.

Effort: Medium.

Dependencies: sales process, implementation playbook, support capacity.

Recommended owner lens: SaaS growth advisor, product strategist, implementation lead.

Acceptance criteria:

- Pricing/adoption section explains what happens after the CTA:
  - discovery call
  - branch/process mapping
  - data/import review
  - pilot workspace setup
  - training
  - controls sign-off
  - rollout decision
- If public prices are not approved, say the rollout is scoped rather than hiding the issue.
- Do not imply instant provisioning if it is not production-ready.

Verification method:

- Copy review against `landing-packages-adoption-report-2026-07-18.md`.
- CTA journey test.

### P1.6 Use Case Compression

Problem it solves: a large use-case carousel can show depth, but too many scenarios can dilute decision-making.

Target dimensions: messaging, conversion, information-density control.

Expected impact: Medium.

Effort: Medium.

Dependencies: `UseCases`, translation files, route screenshots.

Recommended owner lens: product strategist, UI/UX specialist, content lead.

Acceptance criteria:

- Main homepage shows 3-5 strongest scenarios.
- Additional scenarios move to a dedicated use-cases page or expandable section.
- Each visible scenario maps to one buyer path and one product proof point.
- Scenario labels are concrete and outcome-led.

Verification method:

- EN/FR content tests.
- Mobile screenshot check for carousel/card fit.

### P1.7 Conversion Analytics Event Map

Problem it solves: a 9+ landing page needs measurable conversion behavior, not only visual quality.

Target dimensions: conversion flow, SaaS growth readiness.

Expected impact: Medium.

Effort: Small to Medium.

Dependencies: analytics provider decision, privacy policy, consent requirements.

Recommended owner lens: growth advisor, frontend engineer, privacy reviewer.

Acceptance criteria:

- Define events for:
  - hero CTA click
  - product workflow click
  - buyer path click
  - trust link click
  - adoption CTA click
  - language switch
  - public-to-auth transition
- Event names avoid personal or sensitive payloads.
- Analytics respects privacy/consent requirements.

Verification method:

- Event map review.
- Local console/network smoke with test analytics disabled or sandboxed.

## P2 Roadmap - Premium Differentiation And Growth Improvements

### P2.1 Dedicated Product And Module Pages

Problem it solves: the homepage is carrying too much product depth.

Target dimensions: information-density control, product clarity, SEO, conversion.

Expected impact: High.

Effort: Large.

Dependencies: public routes, content model, module readiness review, localization.

Recommended owner lens: system architect, product strategist, frontend engineer.

Acceptance criteria:

- Create dedicated pages or routed sections for:
  - POS
  - Inventory and purchasing
  - Finance and reconciliation
  - OHADA accounting and close
  - Compliance evidence
  - HRIS/payroll extension
- Homepage links to these pages through public product exploration, not protected dashboard routes.
- Each page states capability, buyer, proof, trust controls, CTA, and module readiness.

Verification method:

- Route smoke.
- SEO metadata review.
- Link map audit.

### P2.2 Short Product Demo Or Guided Walkthrough

Problem it solves: competitors make the product feel tangible through demos, hardware imagery, screenshots, or videos.

Target dimensions: visual quality, trust, conversion.

Expected impact: Medium to High.

Effort: Medium to Large.

Dependencies: approved product story, demo tenant, redacted data, media production.

Recommended owner lens: product strategist, UI/UX specialist, frontend engineer.

Acceptance criteria:

- Add a 60-120 second guided product walkthrough or interactive demo.
- Uses redacted/sample data only.
- Demonstrates sale to stock to payment to reconciliation to close evidence.
- Video or walkthrough is lazy-loaded and does not harm LCP.

Verification method:

- Privacy review.
- Media performance review.
- Browser smoke on mobile and desktop.

### P2.3 Case Studies And Advisor Proof

Problem it solves: 9+ trust requires proof beyond product claims.

Target dimensions: trust, conversion, OHADA market fit.

Expected impact: High once truthful proof exists.

Effort: Medium.

Dependencies: customer/advisor approval, quote permissions, implementation results.

Recommended owner lens: growth advisor, product strategist, compliance reviewer.

Acceptance criteria:

- Publish 1-3 approved proof artifacts:
  - customer story
  - accountant/advisor endorsement
  - anonymized branch rollout case
  - implementation note
- Every quote and metric has permission and evidence.
- Proof maps to landing claims.

Verification method:

- Legal/commercial approval.
- Claims source inventory.

### P2.4 Performance Budget And Asset Optimization

Problem it solves: visual ambition must not degrade page speed.

Target dimensions: performance posture, visual quality, conversion.

Expected impact: Medium.

Effort: Medium.

Dependencies: current bundle analysis, image assets, animation cost review.

Recommended owner lens: senior frontend engineer.

Acceptance criteria:

- Landing route hits agreed budgets:
  - Lighthouse Performance 90+ on desktop
  - Lighthouse Performance 85+ on mobile, or documented limitation and remediation plan
  - CLS below 0.1
  - LCP below 2.5s on a production-like run
  - no long animation-driven layout shifts
- Product images are sized and lazy-loaded appropriately.
- Above-fold content avoids avoidable JavaScript dependency.

Verification method:

- Production build.
- Lighthouse or Playwright performance trace.
- Responsive screenshot pass.

### P2.5 Francophone OHADA Copy Polish

Problem it solves: the strongest market is likely Francophone OHADA-region SMBs, so French copy must not feel secondary.

Target dimensions: OHADA/SYSCOHADA fit, messaging, trust.

Expected impact: Medium to High.

Effort: Medium.

Dependencies: French-speaking reviewer, accounting vocabulary review.

Recommended owner lens: OHADA/SYSCOHADA-aware platform architect, content lead, localization reviewer.

Acceptance criteria:

- French hero and trust copy reads as native business French.
- OHADA/SYSCOHADA terms are correct and not overclaimed.
- CTA and adoption flow are equally clear in French.
- No English-first sentence structure leaks into critical buyer copy.

Verification method:

- Human French copy review.
- EN/FR parity test.
- Browser screenshot review for text fit.

### P2.6 SEO And Content Cluster

Problem it solves: Stoquify needs discoverability across POS, inventory, accounting, and OHADA-intent searches.

Target dimensions: SaaS growth readiness, product clarity, conversion.

Expected impact: Medium.

Effort: Medium to Large.

Dependencies: keyword strategy, public product pages, metadata, internal links.

Recommended owner lens: SaaS growth advisor, product strategist, frontend engineer.

Acceptance criteria:

- Landing metadata reflects the concrete category.
- Product pages target specific searches:
  - OHADA accounting software
  - POS inventory accounting
  - retail inventory OHADA
  - multi-branch POS accounting
  - reconciliation and close evidence
- No SEO copy undermines product truth.

Verification method:

- Metadata audit.
- Static route crawl.
- Search console setup if available.

## P3 Roadmap - Optional Experiments And Future Optimization

### P3.1 Hero A/B Testing

Problem it solves: the best balance between "operating system" and concrete category should be validated with buyers.

Target dimensions: conversion, messaging, first impression.

Expected impact: Medium.

Effort: Medium.

Dependencies: analytics, traffic, experimentation framework, consent/privacy review.

Recommended owner lens: growth advisor, product strategist.

Acceptance criteria:

- Test no more than 2-3 hero variants at once.
- Primary metric is qualified demo/adoption CTA click, not vanity engagement.
- No variant removes OHADA differentiation.

Verification method:

- Experiment readout with confidence notes and limitations.

### P3.2 ROI Or Close-Risk Calculator

Problem it solves: finance-led buyers may respond to quantified operational loss, reconciliation delay, stock variance, or close friction.

Target dimensions: conversion, trust, product clarity.

Expected impact: Medium if backed by realistic assumptions.

Effort: Medium to Large.

Dependencies: validated assumptions, legal/compliance review, analytics.

Recommended owner lens: business logic analyst, growth advisor, finance/control expert.

Acceptance criteria:

- Calculator uses transparent assumptions.
- No unverifiable savings promises.
- Outputs lead naturally to demo/adoption CTA.

Verification method:

- Assumption review.
- Edge-case input testing.

### P3.3 Country And Industry Landing Variants

Problem it solves: OHADA is regional, but buyer pains vary by country and industry.

Target dimensions: OHADA/SYSCOHADA fit, conversion, SEO.

Expected impact: Medium to High after base page reaches 9+.

Effort: Large.

Dependencies: country-pack provenance, legal/accounting review, localization.

Recommended owner lens: OHADA/SYSCOHADA-aware platform architect, product strategist, growth advisor.

Acceptance criteria:

- Create only country/industry pages where rules and claims have provenance.
- Avoid hardcoding statutory advice.
- Use local business examples and language.

Verification method:

- Country-pack provenance review.
- Content/legal review.

### P3.4 Accountant And Partner Hub

Problem it solves: accountant-led trust may be a major acquisition channel for OHADA SMBs.

Target dimensions: trust, growth readiness, OHADA fit.

Expected impact: Medium to High.

Effort: Medium to Large.

Dependencies: partner strategy, advisor content, onboarding process.

Recommended owner lens: SaaS growth advisor, product strategist, compliance reviewer.

Acceptance criteria:

- Dedicated partner/accountant page exists.
- Explains review workflows, close evidence, client controls, and collaboration model.
- Does not imply unsupported accountant portal capability if not production-ready.

Verification method:

- Capability review.
- Public claims review.

## Ideal Future Landing Page Structure

| Order | Section | Purpose | Main content | 9+ contribution |
| ---: | --- | --- | --- | --- |
| 1 | Hero | Anchor category and premium positioning | POS, inventory, and OHADA accounting in one controlled flow; demo/adoption CTA; product visual with sample-data label | First impression, clarity, conversion |
| 2 | Problem | Show buyer pain simply | disconnected tills, stock, purchases, payments, accounting, and close evidence | Messaging, empathy |
| 3 | Product Clarity | Explain what Stoquify does | one sentence and one compact product map | Product clarity |
| 4 | Workflow Visual | Make the operating model tangible | sale to stock to payment to reconciliation to OHADA posting to close evidence | OHADA fit, visual quality |
| 5 | Product Proof | Show real product surfaces | screenshots with captions and provenance | Trust, visual quality |
| 6 | Buyer Pathways | Let visitors self-identify | retail/POS, inventory/purchasing, finance/accounting, multi-branch leadership | Conversion, clarity |
| 7 | OHADA/SYSCOHADA Trust | Own the regional moat | accounting evidence, controls, country-pack provenance, close discipline | Differentiation, trust |
| 8 | Security/Compliance | Reduce risk anxiety | RBAC, tenant isolation, audit, redaction, data handling, sample-data boundaries | Trust |
| 9 | Use Cases | Show applied scenarios | 3-5 strongest scenarios, not the full library | Conversion, relevance |
| 10 | Adoption | Explain next steps | quote-led rollout, pilot, training, controls sign-off | Conversion |
| 11 | Final CTA | Capture intent | demo/assessment CTA plus product workflow CTA | Conversion |

## Current Section Treatment

| Current section/component | Treatment | Reason |
| --- | --- | --- |
| `LandingHero` | Simplify and sharpen | Keep premium visual style, reduce product noun overload, align CTA |
| `DisconnectProblem` | Keep and tighten | Good emotional/product setup; make pain more concrete |
| `ProductGallery` | Keep and move earlier if possible | Real product proof is a 9+ trust lever |
| `ConnectedWorkflow` | Simplify into clearer workflow visual | Strong idea, needs faster comprehension |
| `OperationsMap` | Convert from module map to buyer path or move lower | Current module breadth adds cognitive load |
| `PeopleToPay` | Move lower or dedicated extension page | Valuable, but distracts from initial POS/inventory/accounting wedge |
| `ModuleDeepDives` | Move to dedicated product/module pages | Too deep for homepage first decision path |
| `AutomationSection` | Keep lower, shorten | Useful premium signal after core story is understood |
| `TrustSection` | Strengthen and move earlier | Trust is a competitive gap and finance-led requirement |
| `UseCases` | Compress to strongest 3-5 | Avoid carousel fatigue and decision dilution |
| `PricingSection` | Reframe as adoption and rollout clarity | Quote-led is acceptable if transparent |
| `FinalCTA` | Keep and align with primary CTA | Conversion intent must stay consistent |
| `LandingSectionNavigation` | Reduce visible top-level choices | Five main links plus optional deeper menu |

## Implementation Sequence

### Sprint 0 - Proof And Positioning Prep

1. Confirm the actual sales motion: self-service, demo-led, or scoped rollout.
2. Inventory all public claims and assign evidence owners.
3. Decide which proof assets are approved for public use.
4. Confirm which modules are acquisition-core versus extension.
5. Approve the English hero promise, then localize to French.

Exit criteria:

- No CTA ambiguity.
- No unapproved proof claims.
- Core product wedge approved.

### Sprint 1 - P0 Landing Focus Pass

1. Rewrite hero and CTA copy.
2. Add sample/demo labels to dashboard visuals.
3. Fix public-to-auth links.
4. Compress navigation and early module density.
5. Add first proof band using approved evidence.
6. Run typecheck, route smoke, screenshots, and EN/FR content tests.

Exit criteria:

- Five-second comprehension target is met.
- CTA paths are coherent.
- No public visual uses unlabeled sample metrics.

### Sprint 2 - Trust And Workflow Pass

1. Add OHADA-ready workflow visual.
2. Add buyer pathway section.
3. Strengthen trust/security/compliance path.
4. Rewrite adoption/pricing section around clear next steps.
5. Compress use cases.
6. Re-run responsive and localization smoke.

Exit criteria:

- A buyer can explain how operations become accounting evidence.
- Trust path is visible before final CTA.
- Adoption next step is clear.

### Sprint 3 - Product Depth And Performance Pass

1. Move deep module material to dedicated pages or routed sections.
2. Upgrade screenshot/product proof presentation.
3. Optimize images and animation cost.
4. Run production build and performance checks.
5. Publish updated roadmap evidence report under `what-next/`.

Exit criteria:

- Homepage is lighter and clearer.
- Deep evaluators still have product depth.
- Performance and visual checks are documented.

### Sprint 4 - Growth And Market Fit Pass

1. Add approved case studies or advisor proof.
2. Add SEO metadata and product content cluster.
3. Introduce analytics event map.
4. Run limited hero/CTA experiments after baseline conversion tracking exists.

Exit criteria:

- Page has credible public proof.
- Conversion behavior is measurable.
- Growth experiments do not destabilize the core page.

## Verification Plan

Focused commands available in this repo:

```powershell
npm run typecheck
npm run build:app
npm test -- scripts/__tests__/landing-public-content.test.js scripts/__tests__/landing-navigation-localization.test.js
node scripts/public-content-browser-smoke.js --base-url http://localhost:3001
node scripts/landing-navigation-localization-browser-smoke.js --base-url http://localhost:3001
node scripts/product-command-screenshot-browser-smoke.js --base-url http://localhost:3001
node scripts/ui-route-smoke-gate.js --base-url http://localhost:3001 --require-screenshots
```

Release-level checks when public claims, security language, or broad route behavior changes:

```powershell
npm run policy:gates
```

Manual review gates:

- Five-second comprehension test.
- EN/FR copy parity review.
- Public claims/evidence review.
- Mobile/tablet/desktop screenshot review.
- CTA click-path review unauthenticated.
- Reduced-motion behavior review.
- Sensitive-data/public-asset review.

## 9+ Acceptance Criteria

The landing page should be considered 9+/10 only when all of the following are true:

1. A first-time visitor can state the product category within 5-10 seconds.
2. The hero communicates POS, inventory, and OHADA accounting before deeper platform breadth.
3. The CTA clearly matches the real sales motion.
4. Real proof appears before the visitor reaches the lower half of the page.
5. Every public metric, logo, testimonial, or compliance/security claim is backed by evidence.
6. Sample/demo data is labeled.
7. Public links do not unexpectedly dead-end into protected dashboard routes.
8. EN and FR pages preserve meaning, tone, and text fit.
9. Mobile, tablet, and desktop screenshots show no overlap, clipping, or horizontal overflow.
10. Production build and browser smoke pass.
11. Performance budgets are met or deviations are documented with a remediation plan.
12. Deep module detail is available without overwhelming the homepage.
13. OHADA/SYSCOHADA positioning remains central and concrete.

## Risk Controls

- Do not invent customer logos, testimonials, metrics, certification claims, uptime claims, or processed-volume claims.
- Do not imply self-service purchase or instant provisioning unless the product and onboarding flow support it.
- Do not hardcode statutory/legal/accounting advice into marketing copy.
- Do not expose tenant, customer, payroll, payment, receipt, or financial data in public screenshots.
- Do not remove OHADA/SYSCOHADA specificity while simplifying.
- Do not flatten the page into a generic POS landing page.
- Do not perform broad refactors while implementing roadmap items.
- Preserve existing accessibility behavior for section navigation, tabs, keyboard interactions, and reduced motion.
- Preserve bilingual parity.
- Keep public marketing claims tied to implemented capability or clearly marked roadmap/extension language.

## Recommended Immediate Next Prompt

```md
Act as a senior frontend/product implementation team for the Stoquify public landing page.

Using `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`, implement only the P0 landing focus pass:
- Rewrite hero and CTA copy in EN/FR around POS, inventory, and OHADA accounting.
- Align CTA language with the quote-led adoption posture unless self-service is confirmed ready.
- Label sample/demo dashboard data.
- Replace confusing public-to-auth dashboard links with public-safe exploration or auth-aware transitions.
- Compress the early module density without removing Stoquify's premium OHADA/SYSCOHADA positioning.
- Add a truthful proof placeholder or approved proof band without inventing claims.

Do not implement P1/P2/P3 yet.
Run focused landing content tests, typecheck, browser smoke, and responsive screenshots.
Save implementation evidence under `what-next/`.
```
