# Module presentation and decision guides — 2026-10-23

## Implemented scope

- Landing module catalog: 17 available module-catalog entries plus the implemented HRIS workspace, organized into trade/stock, finance, people, insights and shared foundation. Each entry describes users, purpose, three capabilities, incoming records and outgoing records, with an existing public destination and adoption-path handoff.
- Accounting-firm collaboration is explained separately as scoped access, client portfolio and evidence/close review; it is not presented as an additional paid module.
- Internal content/administration catalog entries are excluded. Existing standalone pricing previews and their original eight product/deep-link relationships remain supported.
- Setup: all three steps now explain what to prepare, the result and the next step inside the stable shared frame.
- Cost guide: four visible categories with a shared, expandable detail panel describing agreed scope, cost drivers and questions to confirm. No prices or service commitments were invented.
- Decision guide: 12 questions in three groups, including module choice, opening data, accounting-firm access, registration, country/provider scope and commercial commitments. Each answer has a relevant localized link.
- Workflow navigation widened from 260px to approximately 40% of the desktop frame. All 23 journeys remain available. Improved narrow French label wrapping and removed the rotating selection marker's incidental overflow.
- Preserved canonical logo components, current device screenshots, theme/motion controls and unrelated working-tree work.

## Source and ownership

Source catalog: `services/modules/module-catalog.service.ts`, its control contracts, current public product destinations, existing workflow atlas, setup and offer copy. Available catalog status describes the product catalog; customer activation still depends on enabled modules, permissions, dependencies and country/provider configuration.

New implementation files: `landing-module-catalog-data.ts`, `landing-module-catalog.tsx`, `landing-decision-guide.tsx` under `components/landing/`.

Updated existing files: `cinematic-offers.tsx`, `cinematic-setup.tsx`, `landing-sections.css`, `product-workflow.css`, and scoped tests in `__tests__/CinematicLanding.test.tsx`. Earlier edits in these files were retained. Base HEAD: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`.

Read the current workflow, registry and public/auth contract; retained the already-reviewed design master and UI/UX skill guidance. Focused UX search returned heading hierarchy and breadcrumbs: applied heading hierarchy, rejected breadcrumbs as unnecessary for the flat landing page.

## Verification: source/static

- Workflow contract check passed: 196 package scripts remain outside its manifest. This check did not execute application/database commands.
- Catalog coverage test compares presentation IDs with the source catalog's available entries and excludes internal modules.
- ESLint passed for all five changed/new TypeScript implementation files.
- Targeted `git diff --check` passed, with Windows line-ending notices.

## Verification: mocked components

Inspected `scripts/jest.landing-showcase.config.cjs` and the mocked setup before execution. No real database used.

Initial full isolated landing run: 87 passed, two catalog-link assertions failed because the test navigation mock retains a slash before homepage fragments. Corrected those expectations; real rendered localized links were checked separately.

Focused rerun after the corrections: five passed, covering catalog selection, source-catalog coverage and decision/cost content in EN/FR. After refining the cost panel and keyboard scrolling, the final focused run passed all seven selected tests, with 83 intentionally skipped:

```text
node node_modules/jest/bin/jest.js --config scripts/jest.landing-showcase.config.cjs --runInBand --no-cache --testNamePattern 'module catalog|module presentation|setup steps|cost and decision'
```

The entire 90-test lane was not rerun after the final refinements. Targeted behavior checks passed; the earlier full-run result is recorded separately above.

## Verification: rendered browser

Public signed-out `/en` and `/fr` on the existing local development server. Checked 320, 768, 1024 and 1440 CSS-pixel widths, with desktop/mobile screenshots and light/dark review. No horizontal page overflow or visible clipping remained in the changed sections. The comparison table retains its intentional horizontal scroll region.

Observed stable frame heights (rounded CSS pixels):

| Locale / width | Module catalog | Setup | Workflow library |
| --- | --- | --- | --- |
| EN / 1440 | 603 across 18 entries | 513 across 3 steps | 764 across 23 journeys |
| FR / 1440 | 603 across 18 entries | 529 across 3 steps | 764 across 23 journeys |
| FR / 1024 | 663 across 18 entries | 547 across 3 steps | 784 across 23 journeys |
| FR / 768 | 678 across 18 entries | 859 across 3 steps | 1365 across 23 journeys |
| FR / 320 | 1094 across 18 entries | 1286 across 3 steps | 1614 across 23 journeys |
| EN / 320 | 1095 across 18 entries | 1238 across 3 steps | 1572 across sampled original/extended journeys |

English 768/1024 checks also found no overflow or clipped visible content. Phone layouts stack naturally and scroll with the page. Disclosure expansion is intentional; switching entries within the catalog/setup/workflow frames is stable.

The shared desktop cost detail panel measured 150px for all four selections. Enter opened the panel; selecting again closed it. Keyboard End selected the final catalog entry, kept it visible in its menu and exposed exactly one panel. Focus and resize handling keep the selected entry in view. Inactive catalog and cost panels are inert and hidden.

Expanded cost/decision content was checked at narrow widths. The page motion toggle disabled the added transitions (computed duration 0s); CSS also respects the reduced-motion preference. Temporarily doubled computed text sizes in the changed sections to test 200% text enlargement: English desktop and French 320px passed after fixing setup-control sizing/wrapping. Temporary browser styles were removed. This was text enlargement, not a claim of a full browser-zoom or screen-reader audit.

Final console review found no errors. Original dark theme and motion-on state restored. Existing dashboard image/logo provenance remains in `scripts/fixtures/landing-dashboard-capture.md`.

## Limits and rollback

No production build, real database tests, migration, commit or deployment. Source inspection, mocked component tests and rendered checks are separate evidence classes. This is not a backend functionality or accessibility certification. Revert only this follow-up's scoped hunks/files if rollback is required; the workspace contains earlier and unrelated changes.
