# Stoquify Landing Page Skill Suite Map

## Dependency Order

| Skill | Primary Phase | Depends On | Produces |
| --- | --- | --- | --- |
| `stoquify-landing-00-orchestrator` | All | Roadmap and current evidence | phase plan, status register, evidence checklist |
| `stoquify-landing-01-positioning-clarity` | P0 | sales-motion decision, current hero copy | clearer hero/category promise |
| `stoquify-landing-02-cta-conversion-flow` | P0/P1 | positioning decision, adoption truth | coherent CTA and click-path map |
| `stoquify-landing-03-proof-trust-claims` | P0/P1/P2 | evidence owners and approved claims | proof inventory, sample-data labels, trust block |
| `stoquify-landing-04-information-architecture` | P0/P1/P2 | positioning and buyer paths | simplified homepage structure |
| `stoquify-landing-05-ui-visual-system` | P0/P1/P2 | IA decisions, screenshot assets | polished visual hierarchy and responsive treatment |
| `stoquify-landing-06-accessibility-performance` | P0/P2 | current UI implementation | accessibility, reduced-motion, screenshot, and performance evidence |
| `stoquify-landing-07-localization-ohada` | P0/P1/P2/P3 | approved English copy and OHADA claims | EN/FR parity and OHADA-safe copy |
| `stoquify-landing-08-implementation-release-gate` | All | focused implementation slices | go/no-go certification report |
| `stoquify-landing-09-seo-growth-experiments` | P1/P2/P3 | stable positioning and CTA | analytics map, SEO plan, experiment gates |
| `stoquify-landing-10-product-pages-expansion` | P2/P3 | homepage IA and module readiness | dedicated product-page plan or implementation |

## Roadmap Mapping

| Roadmap item | Owning skill |
| --- | --- |
| P0.1 Hero Category Reset | `stoquify-landing-01-positioning-clarity` |
| P0.2 CTA And Sales-Motion Alignment | `stoquify-landing-02-cta-conversion-flow` |
| P0.3 Public Proof Block | `stoquify-landing-03-proof-trust-claims` |
| P0.4 Sample Data And Demo Boundary Labeling | `stoquify-landing-03-proof-trust-claims` |
| P0.5 Public-To-Auth Link Cleanup | `stoquify-landing-02-cta-conversion-flow` |
| P0.6 First-Page Density Compression | `stoquify-landing-04-information-architecture` |
| P0.7 Fresh Production Readiness Baseline | `stoquify-landing-06-accessibility-performance`, `stoquify-landing-08-implementation-release-gate` |
| P1.1 Buyer Pathway Section | `stoquify-landing-04-information-architecture`, `stoquify-landing-01-positioning-clarity` |
| P1.2 OHADA-Ready Workflow Visual | `stoquify-landing-07-localization-ohada`, `stoquify-landing-05-ui-visual-system` |
| P1.3 Product Proof And Screenshot Upgrade | `stoquify-landing-05-ui-visual-system`, `stoquify-landing-03-proof-trust-claims` |
| P1.4 Security, Privacy, And Compliance Trust Path | `stoquify-landing-03-proof-trust-claims` |
| P1.5 Adoption And Pricing Expectation Clarity | `stoquify-landing-02-cta-conversion-flow` |
| P1.6 Use Case Compression | `stoquify-landing-04-information-architecture` |
| P1.7 Conversion Analytics Event Map | `stoquify-landing-09-seo-growth-experiments` |
| P2.1 Dedicated Product And Module Pages | `stoquify-landing-10-product-pages-expansion` |
| P2.2 Short Product Demo Or Guided Walkthrough | `stoquify-landing-05-ui-visual-system`, `stoquify-landing-03-proof-trust-claims` |
| P2.3 Case Studies And Advisor Proof | `stoquify-landing-03-proof-trust-claims` |
| P2.4 Performance Budget And Asset Optimization | `stoquify-landing-06-accessibility-performance` |
| P2.5 Francophone OHADA Copy Polish | `stoquify-landing-07-localization-ohada` |
| P2.6 SEO And Content Cluster | `stoquify-landing-09-seo-growth-experiments` |
| P3.1 Hero A/B Testing | `stoquify-landing-09-seo-growth-experiments` |
| P3.2 ROI Or Close-Risk Calculator | `stoquify-landing-09-seo-growth-experiments` |
| P3.3 Country And Industry Landing Variants | `stoquify-landing-07-localization-ohada`, `stoquify-landing-09-seo-growth-experiments` |
| P3.4 Accountant And Partner Hub | `stoquify-landing-10-product-pages-expansion`, `stoquify-landing-03-proof-trust-claims` |

## Release Gate Rule

Do not claim the landing page has reached a 9+/10 level until these gates pass:

- positioning clarity gate
- CTA route-smoke gate
- public claims inventory gate
- sample-data/provenance gate
- EN/FR parity gate
- responsive screenshot gate
- accessibility and reduced-motion gate
- production build gate
- performance budget gate or documented remediation
- public claims, demo/sample labels, protected-route transitions, privacy assertions, RBAC/trust statements, and OHADA/SYSCOHADA claims must have evidence, labels, or approved fallback wording
