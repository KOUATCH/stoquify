# Stoquify landing product refresh — 2026-10-18

## Follow-up: complete workspace setup

After commit `1bf88f00`, review identified an incomplete setup section: the inherited `.convergence svg` sizing stretched module icons to the full card width, crowded their labels and pushed the setup steps below a large empty gap. Selecting a setup step did not change the illustration.

The landing-only `CinematicSetup` component replaces that section with three controlled steps and matching original account-verification, operations/module and opening-data previews. Explicit icon dimensions prevent the inherited sizing defect. Finite entrance motion follows each selection; the page pause control and reduced-motion CSS disable it. EN/FR copy retains account-verification, module-access and review requirements. The register route is unchanged; previews are explicitly illustrative.

Follow-up verification: 16 isolated component tests passed (including both locale setup interactions), focused ESLint passed, and the focused TypeScript program reported 0 errors. Browser checks covered all three setup states in EN/FR at actual CSS widths 320, 391, 768, 1024 and 1440: 30 states, one active step, matching preview, no page/preview horizontal overflow and no oversized icons. Home/End selection and focus, pause behavior (`animation-name: none`) and the final console were checked in the browser; no warnings/errors were reported. OS-level reduced-motion emulation, physical devices, screen-reader certification, application build and database tests were not run. Skill search: project UI/UX Pro Max `ux-guidelines.csv`, Animation/Continuous Animation informed finite motion; unrelated loading and haptic recommendations were not used.

Evidence: `setup-browser-checks.json`, `setup-en-desktop.jpg`, `setup-fr-desktop.jpg` and `setup-fr-mobile.jpg` in the local review folder below. Verification was recorded before the requested local commit; no push or deployment was performed.

---

Verification snapshot recorded before the requested local commit. No push, deployment, migration or application build performed for this refresh.

## Result and scope

The landing page now introduces sales, stock, people and financial review with targeted English and French copy. The six interactive demonstrations cover POS, inventory, finance, accounting, HRIS and payroll. Original interface illustrations replace the generic artwork in the product, workflow and onboarding sections.

The courtyard hero uses an original generated image with a front-facing laptop. A real HTML interface starts inside its screen and expands into a readable table as the visitor scrolls. The animation reverses on scrolling back. Its final size accounts for short desktop windows; faded hero controls leave keyboard navigation. Mobile, reduced-motion and paused modes keep a static interface inside the laptop. Failed artwork falls back to readable content.

Scope: `components/landing/cinematic-{hero,product,chapters,shell,modules}.tsx`, `cinematic.css`, the isolated landing tests/config, `public/landing/cinematic/stoquify-courtyard-front.webp`, its provenance manifest and this review note. The capabilities catalog and existing account, workflow, locale and module/country disclosures remain. No route, shared application shell, domain service, schema, dependency or global design-token changes were made by this refresh. Existing unrelated working-tree edits were preserved.

## Reference and intentional adaptations

The live [Mercury homepage](https://mercury.com/) was inspected in the browser. Its desktop product section combines accordion controls with a large animated product presentation; its hero moves from a laptop into an interface. These interaction principles informed the implementation.

| Reference behavior | Stoquify implementation |
| --- | --- |
| Four product categories with large animated media | Six manually selectable Stoquify modules with original HTML/CSS scenes |
| Active category expands its explanation | Selected category expands its bilingual description and updates the preview and workflow link |
| Video-based product choreography | Finite receipt, record, transfer and interface entrance animations; no third-party footage |
| Laptop-to-interface hero | Original courtyard and front-facing laptop, with a spatially anchored table transition |
| Desktop accordion layout | Desktop accordion; compact two-column selector grid on smaller screens |

This is an adaptation, not a frame-for-frame recreation. Stoquify retains its own brand, business semantics and routes. Keyboard users can select with arrows, Home and End. One active workflow link follows all selectors, keeping mobile keyboard order consistent with the visual order. Existing `#flow-tab-0` through `#flow-tab-3` meanings remain; HRIS and payroll extend them to indices 4 and 5.

## Content and artwork truth

- POS: an illustrative sale receipt and connected stock movement.
- Inventory: locations, transfer and count-review examples.
- Finance: evidence comparison with review still pending.
- Accounting: a simplified balanced journal example awaiting review.
- HRIS: fictional employee, contract and time-input records.
- Payroll: draft input-readiness and payslip illustration with country rules still pending.

All demonstrations identify their records as fictional/non-live. They do not claim production transactions, completed reconciliations, payroll approval or universal country support.

The new hero WebP is 1672 × 941, 227,978 bytes. It was generated from the prior original Stoquify courtyard asset, then compressed with Sharp. The full generation prompts and source chain are in `public/landing/cinematic/reference-manifest.json`. The other new artwork is original code-native interface illustration using installed Lucide icons. The landing components reference no Mercury image or video assets. The prior removal of `hero-start.webp` and `hero-scrub.mp4` was already part of the local artwork changes.

## Verification

### Source and static checks

- Project workflow contract check passed; it did not execute application/database commands.
- Focused ESLint passed on the changed landing components and test file; the final hero adjustment was checked again.
- Focused TypeScript no-emit program passed: 0 owned errors and 0 dependency diagnostics.
- Landing CSS selectors remain scoped beneath `.cinematic-home`.
- Focused `git diff --check` passed. Git emitted only its existing LF/CRLF normalization warning for the isolated Jest config.

### Mocked component tests

Isolated command: `node node_modules/jest/bin/jest.js --config components/landing/__tests__/jest.cinematic.config.cjs --runInBand`.

14 tests passed. Coverage includes non-home chrome, EN/FR and signed-in routing, menu dismissal/focus, mobile/reduced-motion handling, pause/resume, failed-image fallback, six-module selection, legacy deep links, keyboard selection, and laptop anchoring/scroll reversal. These run in jsdom without application configuration or persistence; they are not real database or browser tests.

### Rendered browser checks

- EN and FR, all six module states at CSS widths 320, 390, 768, 1024 and 1440: 60 states total, one active selector each, no detected page or preview horizontal overflow. Wide layouts were also checked for artwork clipping.
- After moving the workflow link below the selectors, desktop screenshots were refreshed in both languages and the 390px EN/FR layouts were checked again.
- At 927 × 521, the final expanded interface occupies vertical coordinates 98–469, clear of the header and viewport edges. Scrolling back to the top restored the laptop-sized interface, hero opacity 1 and keyboard eligibility.
- Browser pause and selection/keyboard behavior checked. The final desktop console check returned no warnings or errors.
- Reduced-motion and failed-image behavior have mocked/source evidence; an OS-level reduced-motion browser run was not performed.

Evidence is saved in the local review folder:
`C:/Users/J COMPUTER/.codex/visualizations/2026/10/17/01a14986-a7f8-7350-a8ad-640a68b55867/mercury-prototype/product-refresh/`.

The folder contains `index.html`, full EN/FR desktop screenshots, a final FR mobile screenshot, laptop transition frames, `mobile-checks.json` (24 states), and `desktop-tablet-checks.json` (36 states). Earlier IAB screenshots may be cropped by the app panel; the full desktop review images come from the dedicated browser capture.

### Not run

No full application build, real database tests, migrations, physical-device checks or screen-reader certification. This is a landing-page review, not a release certification.

## Review

Open `http://localhost:3000/en` and `http://localhost:3000/fr`. Scroll the hero, switch through all six modules, use the keyboard selectors and pause control, and follow the existing workflow links. The local review gallery provides screenshots and a Mercury-reference comparison alongside the intentional adaptations above.
