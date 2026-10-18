# Cinematic public homepage — 17 October 2026

## Original Stoquify artwork update

This section records the first artwork replacement. The subsequent front-facing laptop, six-module showcase and current verification are documented in [the 18 October product refresh](STOQUIFY_LANDING_PRODUCT_REFRESH_2026-10-18.md).

At the user’s request, the live homepage now replaces the reference photo and camera video with original AI-generated Stoquify artwork: `public/landing/cinematic/stoquify-courtyard.webp` (1672 × 941, 289,722 bytes). The built-in image-generation tool created a coastal trading courtyard viewed from a shaded workspace, with warm stone, teal storefronts, greenery and a curved counter. No reference image was supplied. The complete prompt and provenance are recorded in `public/landing/cinematic/reference-manifest.json`.

The earlier Mercury poster and MP4 have been removed from the application asset directory. Scroll now applies a gentle scale/pan directly to the original image while retaining the workspace reveal, CTA fade/inert behavior, pause control and static mobile/reduced-motion presentation. This is image-based camera movement, not generated video. The lower-page code illustrations were already original and remain unchanged. Earlier media/video verification sections below describe the previous implementation, not the current asset pipeline.

Verification: workflow contract, focused ESLint, focused non-emitting TypeScript and CSS scope checks passed; all 11 focused component tests passed, including original-image scrolling, pause/resume, static mobile/reduced motion and image-error fallback. Browser checks confirmed the local image loads, no video element remains, scroll/reveal/pause behavior works and French mobile content fits at 390 × 844 without horizontal overflow. The new artwork was inspected on the EN page at 927 × 521. Screenshots are retained in the prototype artifact folder under `original-artwork/`.

## Decision and scope

The user approved implementing the reviewed Mercury-style Stoquify prototype, preserving its visuals and motion, Stoquify branding, EN/FR content and existing routes. This decision applies only to the locale homepage. It does not adopt a new authenticated theme or change business behavior.

The homepage uses the approved landscape camera sequence, an illustrative Stoquify workspace overlay, manual product disclosures, keyboard-operated workflow tabs, dark and pale editorial sections, artwork reveals and a motion pause control. Pale marketing sections and pill-shaped marketing CTAs are scoped exceptions under the public/auth page contract. The existing logo component, product-blue action identity, typography dependencies and shared product tokens remain in use. No font or animation dependency was added.

`LandingRouteShell` selects cinematic chrome only when the locale-aware pathname is `/`. Other public routes retain their existing header and footer. The server layout still obtains the session with the existing `getSession`; the new client shell receives only its Boolean presence. All navigation uses the existing locale-aware Link. Register, login, dashboard and workflow routes are unchanged.

The existing capability catalogue and GettingStarted/adoption content remain rendered. Existing section bookmarks are retained: overview, problem, workflow, product, modules, pricing, get-started, adoption-options, people-to-pay, daily-control, automation, trust and use-cases. The gallery presentation is replaced by clearly labelled illustrative product previews. No illustrative number is presented as live or measured business performance.

## Implementation boundaries

- New components and stylesheet: `components/landing/cinematic-*`.
- Homepage composition and public layout integration: `app/[locale]/(home)/page.tsx` and `layout.tsx`.
- Local media: `public/landing/cinematic/hero-start.webp` (124,392 bytes) and `hero-scrub.mp4` (4,793,016 bytes). These are the same Mercury reference media used in the approved prototype, not original Stoquify artwork. Source URLs are recorded in `reference-manifest.json` without local machine paths.
- Every CSS selector is scoped to `.cinematic-home`; animation names have a `cinematic-` prefix. Shared globals, existing public contours, auth/dashboard components, routing configuration, messages, backend, database and packages were not edited.
- Existing unrelated working-tree changes were preserved. No commit or deployment was made.

The server renders a static poster first. The video source is attached only after client checks permit motion and the viewport exceeds 760px. Pausing removes the source, and reduced-motion preferences disable animation. A failed video falls back to a readable static hero. Camera progress follows native scroll; no wheel interception or scroll-jacking is used. Faded CTAs become inert. Effects remove listeners and observers on unmount; offscreen decorative animation pauses.

## Verification

Source and compiler evidence:

- `npm run agent:workflow:check` passed. The command definition, lifecycle and registry were inspected first.
- Focused ESLint on the five new TSX components and homepage/layout passed.
- Focused non-emitting TypeScript compilation of the new landing components and their imports passed. This is not a whole-repository typecheck or production build. It caught SVG gradient tag casing during implementation; the casing was corrected.
- A PostCSS selector inspection found zero selectors outside `.cinematic-home` (excluding namespaced keyframes).
- Existing content/navigation source tests: 3 suites, 17 tests passed. Only assertions affected by the new composition were updated.

Mocked component evidence:

`node node_modules/jest/bin/jest.js --config components/landing/__tests__/jest.cinematic.config.cjs --runInBand --no-cache`

11 tests passed: unchanged non-home chrome; signed-in and French links; menu dismissal/focus; mobile and reduced-motion media gating; pause; video failure; product selection/deep links; keyboard workflow navigation. The isolated Next/Jest configuration does not load app config, dotenv, persistence or global test setup.

Browser evidence and limits:

- Actual `/en` and `/fr` rendered in the running application, at the browser's reported 927 × 521 viewport, without horizontal overflow.
- Verified scroll-driven video progression, visible workspace overlay, product selection, arrow-key workflow selection, menu Escape/focus return, French content and links, French pause/source removal, and the pale chapter/header treatment.
- Actual `/fr/workflows` retained the original sticky header and had no `.cinematic-home` root after navigation.
- Follow-up mobile verification resolved the viewport discrepancy: requested browser dimensions were scaled by approximately 1.38. Dimensions were calibrated and verified with the rendered page's `innerWidth`/`innerHeight`. EN and FR were checked at actual CSS viewports of 320 × 811 and 390 × 844; the French menu was also checked at 375 × 666. These are browser viewport checks, not physical-device tests.
- Both locales had no document horizontal overflow. The narrow-screen check also inspected text/control bounds and card scroll dimensions so root clipping could not conceal overflowing text. French adoption options were expanded, the commercial tab was selected, and the longer payment story was checked.
- Fixed narrow illustration card text clipping with mobile-only type/spacing adjustments; added breathing room around the rotated story card; enlarged the menu, scroll cue and motion controls to 44px; added bottom safe-area spacing to the motion control. Localized the remaining stock-movement illustration label in French.
- Mobile hero video remained unloaded (`src` absent). Pause stopped the visible story animation; resume restarted it while keeping the video unloaded. French menu links fit in the short viewport; Escape dismissed the menu and restored trigger focus. No error/warning logs were captured in the final browser check.
- Follow-up verification passed: workflow contract check, focused ESLint for the changed chapter component, all 11 mocked component tests, and PostCSS parsing/scope inspection (zero unscoped selectors). No new changes to routes, shared styles, other pages or business logic were needed.
- Mobile screenshots are saved alongside the reviewed prototype in `mobile-verification/`: `en-390-hero.jpg`, `fr-390-hero.jpg`, `en-320-cards.jpg`, and `fr-320-cards.jpg`. The earlier temporary frame experiment was removed; framing protection remains unchanged.
- No real database tests, registration submissions, production build, screen-reader certification, OS-level reduced-motion emulation, performance benchmark or deployment was performed for this presentational change.

## Final desktop and tablet comparison

Follow-up browser verification covered EN and FR at measured CSS viewports of 1440 × 900 (desktop), 768 × 1024 (portrait tablet) and 1024 × 768 (landscape tablet), using the signed-in public homepage. The approved local prototype was inspected at matched desktop and portrait-tablet dimensions. Browser display scaling required different requested dimensions per origin; reported CSS dimensions, not requested sizes, identify this evidence.

- Source comparison: the camera MP4 has the same SHA-256 hash in the app and approved prototype. Scroll progress, text fade, overlay reveal/scale and decorative animation durations use the same formulas/timings. Existing Stoquify typography, branding, locale links, signed-in CTAs, capability catalogue and adoption disclosures remain intentional integration differences.
- Rendered comparison: hero type sizes, padding, grid gaps/columns, backgrounds and animation/transition durations matched the inspected prototype selectors. Geometry differed only by fractional-pixel rounding and browser scrollbar width. This is a sampled comparison, not a claim of whole-page pixel identity.
- Fixed a tablet illustration overflow reproduced at 768px (149px content inside a 135px card). Compact typography/padding and taller cards now contain the EN/FR text (157px content/client height). The tablet menu trigger is now 44px wide.
- Fixed 15 decorative northeast arrows that rendered as colored emoji in the application font stack: explicit Unicode text presentation restores the prototype’s plain arrows. This changes no routes or motion logic.
- Browser checks: no horizontal document overflow; localized menus and CTA bounds; product selection; French keyboard story selection and focus; pale chapter/header transition; visible/offscreen artwork behavior; pause removes the video source and pauses artwork, resume restores motion; desktop scroll camera reaches 6.22s at scroll 787px with the workspace overlay visible and faded CTAs inert.
- Fresh-load artwork behavior passed. Development hot reload briefly reset observed artwork state while editing; reloading restored the expected observation lifecycle. Captured logs contained a Next Fast Refresh reload warning, with no application error observed.
- Executed checks: workflow contract passed; focused ESLint on the four changed TSX components passed; all 11 isolated mocked component tests passed; PostCSS parse/scope inspection passed with zero unscoped selectors. No database tests, production build, deployment or physical-device/OS reduced-motion certification was performed.
- Evidence: matched captures, desktop computed-style metrics, change summary and before-files are stored in the prototype’s `desktop-tablet-verification/` folder. Viewport screenshot capture can crop the rendered browser surface; full-page capture was unavailable, so screenshots were supplemented by DOM bounds and measured viewport evidence.

This follow-up changes only `cinematic.css`, decorative arrow strings in four `cinematic-*.tsx` files and this landing verification note. Unrelated working-tree edits remain untouched.

## Rollback

Restore only the two homepage integration edits and remove the owned cinematic files/assets and new test files if rolling back. Preserve the pre-existing homepage edit and all unrelated working-tree changes; do not reset the repository wholesale. The original landing components remain available.
