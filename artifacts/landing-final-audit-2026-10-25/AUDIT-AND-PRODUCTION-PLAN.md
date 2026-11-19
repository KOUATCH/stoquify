# Stoquify landing page: final business and production audit
**Date:** 25 October 2026  
**Scope:** English and French landing page; desktop and mobile, with additional narrow-phone and tablet checks.  
**Decision:** **Needs one focused production pass before a broad public launch.** The presentation is credible enough for a supervised product demonstration, but the acquisition journey and several production details are unfinished.

This is an audit of the current working tree, based on HEAD `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886` plus pre-existing changes. It is not certification of the deployed site or of every underlying business module. No application source was changed, no database tests or migrations were run, and no transactions, registrations or enquiries were submitted.

## 1. Executive judgement

Stoquify has a strong proposition: daily operations, people records, payments and accounting can share an intelligible record, including work with an authorized accounting firm. The page now presents real breadth, uses a coherent visual identity, explains boundaries honestly, and contains functioning interactive demonstrations.

Its main weakness is no longer a lack of sections. It is a lack of hierarchy. Visitors encounter several overlapping explanations of the same product, a large workflow library, another module catalog, extensive scope conditions, and several different ways to “explore.” They still cannot clearly progress from a tailored quotation promise to a quotation conversation.

**Keep:** the new identity, the connected-record story, the accounting-firm journey, the HRIS/payroll distinction, the honest sample-data disclosures, and the stable component layouts.

**Change before launch:** unreadable mobile selectors in dark mode; the commercial next step; French capture/metadata quality; visible trust and contact information; and the amount of repeated information in the default journey.

**Do not add another large marketing section.** Give existing sections distinct jobs and remove duplicate explanations. Preserve all supported workflows through the library and detail pages.

### Reasoned scorecard

These are editorial assessments, not measured conversion rates or compliance certifications.

| Dimension | Assessment / 10 | Reason |
|---|---:|---|
| Visual identity and consistency | 8 | Recognizable blue mark, coherent surfaces, restrained controls and credible business imagery. |
| Product and module coverage | 8 | 18 module/workspace presentations and 23 workflows, including accounting-firm and employee journeys. |
| Positioning and first-visit clarity | 6 | Strong sale-to-close idea, but many audiences, acronyms and control-oriented explanations compete. |
| Purchase decision and conversion | 4 | Quotation-based proposition with no evident direct quotation/contact action in the reviewed public journey. |
| Trust and proof | 5 | Clear illustrative-data disclosures; limited customer/outcome proof and incomplete visible company/contact/policy information. |
| English/French presentation | 6 | Main content is bilingual; French metadata remains English and the dashboard capture contains mixed-language/internal labels. |
| Responsive layout and interaction | 7 | Stable switching and no measured page-width overflow in the main matrix; mobile selectors have a serious contrast defect and page length is excessive. |
| Accessibility | Needs fixes | Automated snapshots are encouraging but identified contrast/name issues; a screen-reader and real-device audit remains necessary. |
| Production performance and underlying module readiness | Not scored | Development-server observations and mocked tests cannot establish these. |

## 2. Evidence, coverage and limits

### What was actually checked

- Current landing components, shared shell, offer/cost/FAQ copy, module/workflow data, brand/preview implementations and metadata.
- Relevant project workflow and design contracts.
- Rendered Chromium pages in English and French at **1440 × 1000** and **390 × 844**.
- Automated selection of all **23 workflows, six sale-story scenes, five HR/payroll stages, 18 module presentations and three setup steps** in each of those four combinations: **220 settled selected-state observations**.
- Representative actual browser clicks: later workflow Next/selection, accounting-firm selection, story selection, offer choice, cost disclosure, FAQ, language/theme switch, mobile menu and preview dialog.
- Escape dismissed the mobile menu. The accounting preview dialog opened, Escape closed it, and focus returned to its trigger.
- Additional French checks at **320 × 740** and **768 × 1024**; no document-width overflow in those observations. These were spot checks, not complete additional state sweeps.
- Current dashboard image asset and rendered computer-screen overlays for branding/localization.
- Desktop English and mobile French Lighthouse snapshots.
- `agent:workflow:check` passed.
- The inspected isolated landing Jest configuration passed **3 suites / 94 tests**. These are mocked/component tests, not database or live business-workflow tests.

### Measured dimensions

Section heights below include their heading/context, not only the visual preview. All selected states in each group settled to the same rounded height at that breakpoint.

| Group | EN desktop | FR desktop | EN mobile | FR mobile |
|---|---:|---:|---:|---:|
| Connected workflow library: 23 states | 1,140 px | 1,140 px | 1,809 px | 1,824 px |
| Sale story: six states | 1,116 px | 1,116 px | 1,740 px | 1,756 px |
| HRIS/payroll: five stages | 964 px | 964 px | 2,068 px | 2,068 px |
| Module catalog: 18 states | 850 px | 870 px | 1,327 px | 1,333 px |
| Workspace setup: three steps | 785 px | 800 px | 1,373 px | 1,407 px |
| Whole page, initial/default disclosures | 14,709 px | 14,810 px | 24,074 px | 24,421 px |

The mobile page therefore spans roughly **28–29 viewport heights** at 844 px. The desktop hero reserves **250vh**, or 2,500 px at the measured desktop viewport. The page can be geometrically stable while still asking for too much scrolling.

Early measurements taken during transitions were inconsistent; they were repeated after settling. **The audit does not report a persistent size-changing defect in these components.**

### Automated accessibility/SEO results

| Snapshot | Accessibility | Best practices | SEO |
|---|---:|---:|---:|
| English desktop, local development server | 100 | 100 | 83 |
| French mobile, local development server | 97 | 100 | 100 |

Do not interpret these as launch certification. The English snapshot flagged robots handling during local development; the later server returned a 404 for robots.txt and scored differently. Production crawl behavior remains to be checked. An SEO score of 100 also did not catch the French page's English title and description.

The mobile contrast result measured **1.05:1** on the module selector. Direct rendered inspection found the same near-white-on-white appearance in the workflow selector. Experimental label/name checks flagged the logo tagline and numbered story tabs. Review and resolve these semantically; do not remove useful accessible labels just to improve a score.

The optional llms.txt finding is **not a launch blocker**.

### Limits

- No production build, production-host audit, database tests, payroll execution, payment execution, country certification or authenticated end-to-end run.
- No measured conversion analytics, prospect interviews or usability study. Commercial conclusions below are reasoned hypotheses based on the page, not observed conversion losses.
- No real iOS/Safari/Android device or assistive-technology certification.
- The browser disconnected/restarted during the session and the development server experienced compilation delays. Successful rendered observations were retained; those environment delays are not presented as production performance results.
- Visual and functional coverage of default/representative states is broader than detailed visual inspection of every possible state combination.
- The working tree contains substantial pre-existing changes. Those were preserved.

## 3. The goods, weaknesses and missing decisions

### What is genuinely good

1. **A distinct business story.** “From your first sale to your month-end close” connects a familiar action to an important outcome.
2. **Accounting-firm collaboration is visible.** Invitation/mandate, client portfolio and evidence review are represented. The firm starts with existing records rather than being described only as an export recipient.
3. **HRIS and payroll have separate responsibilities.** People, contracts, time, payroll, payments and declarations form a meaningful sequence.
4. **The page avoids invented commercial promises.** It does not fabricate a free trial, universal country coverage, instant activation or an automatic statutory guarantee.
5. **Interactive sections mostly work.** Selecting a module changes its information; later workflow journeys have functioning steps and playback controls.
6. **The logo correction is substantially complete on the reviewed surface.** The new mark appears in navigation, preview chrome, dashboard capture and photographed computer overlays.
7. **Stable layouts are already achieved.** Preserve that progress.

### What is weak or confusing

- **A product encyclopedia precedes a clear buying decision.** Repeated workflow, responsibility, business-story and catalog sections compete.
- **“Sur devis / Tailored quote” lacks an evident enquiry endpoint.** Account creation and additional exploration are not equivalent to requesting a quote.
- **The commercial fit selector does not carry a prospect's selection into an enquiry.** The FAQ explicitly says selection does not submit it.
- **Retail positioning and package scope require careful explanation.** POS is central to the hero, but is separately scoped from Operations Core. This is disclosed, yet visitors need the practical implication earlier.
- **Control language often leads the message.** “Scope,” “evidence,” “reviewed configuration,” “handoff” and “country pack” are accurate but can obscure the outcome for a shop owner.
- **Some module descriptions remain generic.** Commercial agents is the clearest example: the page names a domain more strongly than it demonstrates a useful task.
- **The same “workflow preview” label covers two different experiences.** The first eight show changing illustrative records; subsequent journeys primarily advance a highlighted step list while supporting checks remain static.
- **Mobile compactness is not solved by alignment alone.** The HR section occupies about 2.45 screens; the workflow library about 2.15 screens before considering other sections.

### Decisions visitors still need help making

| Audience | What works | What remains unclear |
|---|---|---|
| Owner / SME manager | Sale-to-close narrative and operating overview | Which starting path fits my business, what must be prepared, who helps and what happens after contact? |
| Retailer / cashier / stock team | POS, inventory and receipt examples | What requires the POS extension, devices, provider setup or separately reviewed continuity? |
| Finance team | Receivables, payables, reconciliation and close | Which records/imports/providers are supported for my rollout and what proof is needed? |
| Accounting firm | Scoped access, portfolio and review work desk | How does a firm start, how are multiple clients scoped commercially, and who approves each relationship? |
| HR / payroll team | Five-stage process and explicit approval boundaries | Which countries and services are actually supported, what inputs are needed, and what remains a manual/external step? |
| New visitor comparing alternatives | Broad capability coverage | Why choose Stoquify now, what concrete proof supports it, and how do I obtain a useful response? |

Country/provider availability should come from an approved current register. Do not invent a public coverage list or imply that every source-code action is released.

## 4. Section-by-section decisions

| Section | Evaluation | Recommended final treatment |
|---|---|---|
| Header/navigation | Clear identity and essential routes. Mobile menu works. | Keep compact. Add a genuine commercial CTA once its destination is operational. Preserve language and chosen theme across the journey. |
| Hero | Strong headline, relevant SME imagery and real dashboard capture. The desktop scroll treatment is lengthy. | Keep headline; shorten supporting copy; use one primary enquiry/demo action and one secondary product action if assisted onboarding is the chosen model. Reduce the 250vh scroll requirement. |
| Connected workflow library | Complete breadth, wider left panel, stable selection. Later journeys are simpler; mobile selectors are unreadable in dark mode. | Fix selectors first. Group workflows by responsibility and improve discoverability. Retain all 23. Distinguish a guided sequence from a richer product demonstration. |
| A sale is the beginning of the record | Best narrative bridge between operations and accounting. Stable width/height. Number-only navigation is less self-explanatory. | Make this the main proof story. Add concise visible step names where space permits. Keep the source-to-close continuity; reduce repeated surrounding explanation. |
| One workspace / connected responsibilities | Good role and handoff explanation, but overlaps the module catalog and business story. | Reduce to a concise role map with optional detail. Every role should answer “what I do, what I pass on, who reviews it.” |
| Your business keeps moving | Relevant human context and attractive computer imagery. Three large stories add considerable length. | Keep the strongest examples and tighter copy; let the detailed accounting-firm journey carry unique information rather than restating the opening proposition. |
| Accounting-firm journey | A differentiator, not an optional omission. | Retain invite/consent → client/period → review/conclusion. Give firms an explicit entry action and explain how they collaborate with the client's existing workspace. |
| OHADA accounting | Sensible qualification and source-linked record story. | Lead with an intelligible result: explain a balance, find a source, identify an unresolved close item. Keep statutory/country limits precise and adjacent to the relevant claim. |
| Dedicated HRIS and payroll | Substantive and organized; all five states work. Very tall on mobile. | Keep all five stages and role boundaries. Default to three concise capabilities plus one visible record example per stage; expand secondary explanations. Avoid presenting payment approval as execution or a declaration draft as official acceptance. |
| Module catalog | 18 entries now exist and change correctly. A second large navigation surface duplicates some workflows. | Use it for fit/completeness: user, useful task, result, dependency and detail link. Keep the full inventory accessible without forcing all breadth into the main reading path. |
| Offers and pricing | Honest three-path model and useful scope distinctions. Quotation promise has no clear next action. | Show “best for / included scope / separately scoped / next step.” Route selected interest into a real enquiry. Clarify the POS extension without changing the commercial model by accident. |
| MAKE THE WHOLE COST CLEAR | Four useful cost categories and working expandable detail. No numerical prices are invented. | Keep it as a compact quotation checklist. Distinguish recurring software, one-time setup and separately agreed external costs where approved. Make “request a scoped quote” actionable. No fake calculator. |
| BEFORE YOU CHOOSE | Useful 12-question coverage; several answers sound defensive or refer visitors to more pages. | Surface the five most consequential questions, with all others still accessible. Each answer should settle a decision and offer one relevant next action. Rewrite “this page does not promise…” into clear availability/process language. |
| A PRACTICAL START / setup | Three steps, preparation/result/next information, stable preview. | Keep structure. Clarify account creation versus activation and who assists. Offer an honest preparation checklist instead of repeating generic configuration language. |
| Resources | Good internal pathways; not yet strong evidence or practical takeaways. | Label destination types accurately. Prioritize a real onboarding checklist, sample close-review output or HR/payroll input checklist when approved and maintained. Do not call navigation cards downloadable resources. |
| Closing section | Coherent return to day/close narrative. | Finish with one clear action, one reassurance and a brief expectation of what follows. Avoid restarting the product explanation. |
| Footer | Current brand and useful navigation. | Add verified company/contact information and appropriate privacy/terms destinations. Have the relevant owner approve policy content; this audit makes no legal compliance determination. |

## 5. Module and workflow completeness

The earlier concern that modules were not presented is **no longer accurate**. The landing page now has the following 18 presentations. Their presence is verified; their production readiness is not implied.

| Presentation | Final editorial need |
|---|---|
| Inventory | Keep location, movement and count examples; make the resulting stock decision concrete. |
| Sales & customers | Distinguish orders/delivery/customer work from receivables collection. |
| Point of sale | Explain receipt/payment/stock continuity and separately scoped package/device requirements. |
| Purchasing & suppliers | Distinguish ordering/receiving from supplier invoice and payment approval. |
| Commercial agents | Replace broad phrases with a verified task, result and example; do not invent commission features. |
| Finance | Explain its umbrella role so it does not appear to duplicate AR/AP and reconciliation. |
| Cash drawer | Show the shift, expected/count difference and accountability outcome. |
| Payment reconciliation | Explain evidence/import/provider prerequisites and treatment of unmatched items. |
| OHADA accounting | Show source → entry → balance, with reviewed configuration limits. |
| Close assurance | Explain readiness findings and reviewer responsibility without implying automatic statutory certification. |
| Compliance | State supported country/document scope and current limitations from approved evidence. |
| HRIS workspace | Present employee/contract/organization records; preserve the distinction from a separately sold entitlement. |
| Presence & time | Show time exceptions, approval and the handoff to payroll preparation. |
| Payroll | Explain preparation, review, payslips and country support; keep execution/acceptance separate. |
| Analytics | Give a decision-oriented example instead of another generic dashboard promise. |
| Reports | Differentiate retained/shareable records from analytical exploration. |
| Operating dashboard | Show the first useful action a manager takes from an exception. |
| Workspace settings | Explain permissions, locations and configuration as the common foundation. |

The 23 workflow entries include POS; inventory/locations; finance/reconciliation; OHADA/close; HRIS; payroll/review; AP/suppliers; AR/invoicing; sell/collect; payroll declarations; country rules/documents; daily management; team access; workflow checks; accountant invitation; accountant client portfolio; accountant evidence review; supplier payment approvals; stock counts/loss; employee self-service; financial reporting; cash follow-up; and opening data/setup.

**Preserve all of them.** Grouping/filtering should make this breadth discoverable, not silently delete firm or employee workflows.

Source spot checks found supporting accountant access/work-desk, employee/self-service and payroll/declaration functions. That supports the relevance of these domains, but cannot establish permissions, country coverage, integration behavior or release readiness without the appropriate business tests.

## 6. Specific defects and branding/localization findings

### Confirmed: mobile dropdown contrast

Both selectors in dark mode had foreground `rgb(247, 250, 248)` and background `rgb(255, 255, 255)`. Their selected labels were almost invisible. The French mobile Lighthouse result independently flagged the catalog selector at 1.05:1.

**Fix:** use a valid scoped foreground/background pair for the select and options; test both themes and native menus on actual mobile browsers. Ensure long French labels are still identifiable.

Evidence: [English mobile screenshot](./en-mobile-select-contrast.png), [French mobile Lighthouse report](./lighthouse-fr-mobile.json).

### Confirmed: incomplete French presentation

- French page `lang` is correctly `fr`, but its title and description remain English.
- The French dashboard capture uses the current logo, but includes “Pending proof,” “Operational,” “success,” “Ouvrir war room,” and “modele lecture dashboard,” along with accent/grammar issues.
- The captured app brand subtitle says “ENTERPRISE OS,” while landing branding says “OHADA OPERATING OS” / “SYSTÈME OPÉRATIONNEL OHADA.” This is a descriptor consistency question, **not evidence of an old logo mark**.
- “Un point de départ clair. La place pour grandir.” is understandable but less natural than the surrounding French.

**Fix:** approve terminology, correct the underlying demonstration copy, then recapture the real dashboard with fictional data. Do not disguise a product-language gap by inventing a fake screenshot.

### Confirmed: acquisition/trust gaps

The reviewed footer contains product/start/explore links, copyright and sample-data disclosure, but no evident contact, privacy or terms links. Landing and offer copy repeatedly describes a tailored quotation without a direct quotation enquiry action. Treat these as launch decisions, not decoration.

### Accessibility follow-up

Resolve visible-label/accessibility-name mismatches, including the zero-padded visible story numbers. Review automatic progression when focus enters a journey; its current source pauses on selecting a step but does not pause simply on focus/hover. Keep manual controls usable with reduced motion.

Use the [W3C carousel guidance](https://www.w3.org/WAI/tutorials/carousels/) for keyboard, focus, pause and announcement behavior. This is implementation guidance, not a claim that every observed journey currently violates WCAG.

### SEO and performance follow-up

The rendered head lacked canonical and hreflang link elements in the inspected DOM. Server/header alternate-link behavior was not certified. Add or verify locale metadata, canonical/alternate behavior, share previews and intended indexing on the production host.

A large client-rendered composition, mounted inactive states and global public-page providers deserve production measurement. Do not infer poor Core Web Vitals from a slow local development compilation. Production targets should follow [Core Web Vitals](https://web.dev/articles/vitals): LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the 75th percentile, with mobile and desktop evaluated separately. Before field data exists, use production-build lab measurements and disclose that limitation.

## 7. Concrete bilingual direction

These are proposed copy directions, subject to the verified commercial process.

| Purpose | English | Français |
|---|---|---|
| Hero support | Connect sales, stock, payments and people records to the work of your finance team and accounting firm. | Reliez ventes, stocks, paiements et dossiers du personnel au travail de votre équipe financière et de votre cabinet comptable. |
| Primary action, assisted route | Discuss your workspace | Parlons de votre espace de gestion |
| Secondary action | Explore the workflows | Découvrir les parcours |
| Pricing introduction | Start with your priorities. Confirm the scope and cost together. | Partez de vos priorités. Définissons ensemble le périmètre et le coût. |
| Quote action | Request a scoped quote | Demander un devis adapté |
| Accounting-firm entry | Explore the accounting-firm workspace | Découvrir l’espace du cabinet comptable |
| Setup reassurance | Prepare your records, team access and first workflow before going live. | Préparez vos données, les accès de l’équipe et votre premier parcours avant la mise en service. |
| Preview availability | Explore the examples without an account. Confirm access and setup when planning your rollout. | Découvrez les exemples sans compte. Les accès et la mise en place sont précisés lors de la préparation du déploiement. |

Do not publish a response-time promise, price, free trial, certification badge, customer quote or geographic coverage claim without evidence and an operational owner.

## 8. Prioritized final production plan

**Priority definitions:** P0 = necessary before broad acquisition; P1 = required final quality pass; P2 = worthwhile after the launch essentials. Effort is a relative estimate: S = localized work, M = several connected components/content decisions, L = a broader dependency. These are not delivery-date promises.

| ID / priority | Action | Why / owner | Effort and dependency | Acceptance |
|---|---|---|---|---|
| P0-1 | Fix dark-mode native selectors | Essential content selection is unreadable. UI owner. | S; scoped styles and browser checks. | Both selectors and option menus readable EN/FR, both themes, 320/390/768 widths; ≥4.5:1 normal text contrast. |
| P0-2 | Complete a genuine enquiry/quotation path | The promised tailored quote needs a real next step. Product/commercial + engineering. | M; confirmed recipient, process and appropriate data handling. | Chosen interest/locale retained; clear fields, error/success states and next expectation; test submission reaches the authorized destination. Do not submit a real enquiry during an audit. |
| P0-3 | Approve the public promise and trust basics | Countries, providers, offer inclusions and company identity must be defensible. Commercial/product owners. | M; current support register, reviewed company/policy copy. | Claims register with evidence/owner; real contact and approved policy links; POS/add-ons/support boundaries clear. |
| P1-1 | Consolidate the main reading journey | Too much repeated explanation and excessive scrolling. Product/design/content. | M; preserve the full inventory. | Each section has one job; full workflow/module coverage remains accessible; propose ≥25% default-page height reduction as a design target, without shrinking body text or hiding essential terms. |
| P1-2 | Clarify preview depth and module differentiation | Guided steps currently look weaker than animated module records. UI/content. | M; verified examples. | First eight demonstrations remain; all later journeys show a meaningful task/result; three firm journeys remain prominent; no claim of a live simulation. |
| P1-3 | Finish French copy, metadata and captures | Mixed language undermines trust and search presentation. French editor + product/engineering. | M; corrected demo source before recapture. | Locale-correct head metadata and UI copy; no unintended English/internal labels in French artwork; approved brand descriptor. |
| P1-4 | Close accessibility and motion gaps | Good automated scores are not sufficient. UI/QA. | S–M. | Keyboard order, tab navigation, focus return, visible focus, label matching, pause/replay and reduced motion verified; no serious automated violations in tested states. |
| P1-5 | Tighten pricing, cost, FAQ and setup | These sections must help a prospect make a decision. Commercial/content/UI. | M; P0-2/P0-3. | Included/separate scope intelligible; five key questions visible with remaining questions available; setup responsibility and next step clear. |
| P1-6 | Verify the production candidate | Local dev success does not establish launch quality. Engineering/QA. | M; reviewed build/check commands and staging target. | Production build, route checks, assets, locales, responsive matrix and performance evidence recorded; no production configuration/data mutation implicit in testing. |
| P1-7 | Establish minimal outcome measurement | Without it, the next “polish” cycle is opinion-driven. Product/analytics. | S–M; existing approved analytics/privacy approach. | Measure primary CTA, enquiry start/completion and selected interest without collecting sensitive business records; baseline before claiming improvement. |
| P2-1 | Add approved proof and useful resources | Stronger credibility and practical value. Commercial/content. | M; genuine material and permissions. | One real case study or measured pilot result when available; one useful maintained preparation resource. |
| P2-2 | Improve exploration tools only if needed | Large libraries can benefit from search/group filters. Product/UI. | M; usage evidence. | Search/grouping preserves all entries and accessibility; measure whether prospects use it. |

### Bounded implementation sequence

1. **Freeze the promises and route:** decide assisted enquiry versus a demonstrably complete self-service path; approve offer scope, contact ownership and terminology.
2. **Patch the concrete defects:** selectors, accessible names, French metadata/capture text and brand descriptor consistency.
3. **Edit the composition:** shorten the hero's scroll treatment; consolidate repetitive role/business/catalog prose; keep the sale story, firms and HR/payroll as the primary proof.
4. **Complete the four decision sections:** workflow library, practical start, total cost and pre-purchase questions; wire their next steps to the approved commercial route.
5. **Verify a bounded release candidate:** production-like rendering and performance, keyboard/reduced motion, EN/FR desktop/mobile, real-device spot checks and complete enquiry handoff.
6. **Release only with remaining risks documented:** do not let an attractive screenshot substitute for a functioning acquisition route or supported product claim.

This final pass should **not** rebuild all 23 workflows as animated applications, change package entitlements, redesign the authenticated product, add a speculative chatbot, invent customer proof, or expand into a new payment/pricing engine.

## 9. Release checklist

- [ ] Both language routes render correct content and metadata.
- [ ] 320, 390, 768, 1440 widths have no unintended document overflow or clipped controls.
- [ ] Workflow/story/HR/catalog/setup selection remains stable within each breakpoint; allow ≤2 px settled rounding variation.
- [ ] Long French content is readable without hiding business-critical details.
- [ ] Dark/light selectors, focus indicators and body copy meet appropriate contrast.
- [ ] All 23 workflows and 18 presentations remain reachable, including firm and employee journeys.
- [ ] Mobile select, desktop keyboard, step controls, disclosures, dialogs and menu all work.
- [ ] Reduced motion and global pause preserve access to all content.
- [ ] Logo/descriptor and localized screens are checked in header, footer, hero, laptop/PC art, dialogs and previews.
- [ ] Offer, workflow, resource, account and enquiry destinations work and preserve intended locale/context.
- [ ] The enquiry route has been tested with authorized test data and an accountable recipient.
- [ ] Approved company/contact/privacy/terms information is available.
- [ ] Country/provider/plan claims have an owner and current evidence.
- [ ] Production asset loading, canonical/alternate/indexing/share metadata and lab performance are recorded.
- [ ] Existing targeted tests pass; rendered checks and business/database tests are reported separately.
- [ ] No claim of universal country, payroll, payment or statutory readiness is made from this landing audit.

## 10. Evidence and source map

- [Selected-state evidence: EN desktop, EN mobile, FR mobile](./state-evidence.json)
- [French desktop state evidence](./fr-desktop-state-evidence.json)
- [English desktop Lighthouse](./lighthouse-en-desktop.json)
- [French mobile Lighthouse](./lighthouse-fr-mobile.json)
- [Mobile dropdown defect](./en-mobile-select-contrast.png)
- Shared shell/footer/theme: `components/landing/cinematic-shell.tsx`
- Workflow selection and sale story: `components/landing/cinematic-product.tsx`
- Guided workflow progression: `components/landing/journey-preview.tsx`
- Product demos: `components/landing/product-workflow-demo.tsx`, `product-workflow.css`
- Catalog content/layout: `landing-module-catalog-data.ts`, `landing-module-catalog.tsx`, `landing-sections.css`
- Pricing/cost/FAQ: `cinematic-offers.tsx`, `cinematic-offers-data.ts`, `landing-decision-guide.tsx`
- Photos/logo: `photo-workspace.tsx`, `preview-logo.tsx`
- French capture: `public/landing/cinematic/stoquify-dashboard-fr.webp`
- Hero scroll: `components/landing/cinematic.css:417`
- Default metadata: `app/layout.tsx:13`

