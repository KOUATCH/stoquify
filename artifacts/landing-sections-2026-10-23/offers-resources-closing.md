# Offers, resources, closing and logo review

## Changes

- Refined the module explorer and pricing cards to the landing page's existing 1320px width, typography, tokens and spacing.
- Reserved layout space for all eight module previews and all three offer summaries. Inactive content is hidden and inert; keyboard selection and localized destinations remain intact.
- Integrated the shared foundation with the selected offer's next step. Preserved tailored-quote wording and scope qualifications. Rollout services are available through a keyboard-accessible disclosure; comparison and FAQ content remains available.
- Added descriptive resource cards with clear destinations and a compact closing panel addressing operations, HR/finance and accounting firms.
- Used the canonical PreviewLogo in the closing panel. Audited existing logo sources and rendered device previews; no replacement screenshot was necessary.

Owned files for this follow-up: `cinematic-offers.tsx`, `cinematic-chapters.tsx`, the added rules in `landing-sections.css`, active-panel selectors in `CinematicLanding.test.tsx`, and this note. Other work and earlier landing refinements remain unchanged. No commit or deployment.

## Source inspection

Reviewed the workflow, command registry, public/auth design contract, offer data and existing landing preview components. The focused UI/UX skill search returned heading balance, content truncation and realistic placeholders (`ux-guidelines.csv`); retained natural wrapping and complete content instead of truncating essential offer details. No framework or token changes.

The header/footer use `kit-logo.tsx`; live illustrative screens use `PreviewLogo`, both derived from `stoquify-logo-artwork.ts`. Inspected both localized dashboard WebP captures visually: both contain the current blue mark and Stoquify wordmark. Browser inspection confirmed canonical logo overlays in pharmacy, materials and accounting-firm screens; visually reviewed the materials PC and accounting-firm laptop. Existing capture provenance remains in `scripts/fixtures/landing-dashboard-capture.md`.

## Executed checks

- `npm run agent:workflow:check`: passed, 196 package commands remain outside the registry; no application or database commands executed by this check.
- `node node_modules/eslint/bin/eslint.js components/landing/cinematic-offers.tsx components/landing/cinematic-chapters.tsx --no-cache`: passed.
- `node node_modules/jest/bin/jest.js --config scripts/jest.landing-showcase.config.cjs --runInBand --no-cache --testNamePattern 'offer|pricing|chapters|photo|screen|logo|signed'`: **17 passed, 68 intentionally skipped**, two suites. Configuration and mocked setup inspected first. These are mocked component tests, not real database evidence.
- Targeted `git diff --check`: passed, with Windows line-ending notices.

## Rendered browser checks

Existing local server, public signed-out routes `/en` and `/fr`, dark/light themes, 1440px desktop, 768px tablet and 320px phone widths.

| Measurement | Before | After |
| --- | --- | --- |
| English desktop module explorer | 709px | 526px, all eight tabs |
| English desktop pricing section, disclosures closed | 2828px | 1821px |
| English desktop resources | 387px | 387px, now including descriptions and destination labels |
| English desktop closing | 511px | 446px, now including accounting firms |

French tablet: module explorer 708px for every tab; offer summary 211px for every choice. French 320px phone: explorer 1240px for every tab; offer summary 465px for every choice. Heights are rounded CSS pixels; stacked phone content scrolls naturally with the page.

No horizontal page overflow at the checked widths. At 320px, no overflowing visible descendants in the changed sections after the tab-label fix, except the explicitly labelled, intentionally horizontally scrollable comparison table. Expanded all comparison, rollout and FAQ content without page overflow. Verified French resource/signup links keep the locale.

Browser keyboard End focused and selected the final module tab with exactly one exposed tabpanel. Enter opened the rollout-services disclosure. Inactive preview panels remain inert. Restored the original dark theme after the light-theme check.

## Limits and rollback

No real database tests, production build, migration or deployment was performed. Rendered review is not a complete screen-reader/accessibility certification. Restore only this follow-up's scoped changes if rollback is required; the working tree contains unrelated and earlier landing work.
