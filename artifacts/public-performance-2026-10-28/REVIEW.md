# Public-page performance pass — 28 October 2026

Implemented and verified a focused performance improvement. All 18 catalogue entries and 23 workflow choices remain available. Mobile loading improved in the matched local comparison, but it is still too slow to consider performance finished.

## Changes

- The public shell now defines the detailed current logo artwork once. Preview logos reference that drawing, preserving their existing names, geometry and theme colors. Standalone captures still render their own artwork when outside the shell.
- The hero dashboard has English/French responsive images at 480, 1,000 and 1,600 pixels, retaining the original 2,400-pixel fallback. Browser image selection accounts for the small mobile screen and expanded desktop preview.
- Added a 640-pixel version of the existing hero photograph. Both opening images retain high priority, explicit dimensions and the earlier CSS positioning that works before hydration.
- No module, workflow, sizing guide, translation, form behavior or business capability was removed. No dependency or framework upgrade was made.

The two opening image files selected in the standard mobile measurements total 65,338 bytes in English and 66,174 bytes in French, versus 291,518 / 305,136 before (approximately 78% less). The original artwork remains intact. See assets.json and asset-validation.json.

## Build and source provenance

Final standalone build: **0erlfOxLMDbLrpMlj5qfg**, in .next-public-performance-20261028. The reviewed safe build wrapper passed compilation, configured lint/type validation, 11/11 generated entries and standalone packaging, with exit 0 and no orphaned build chains. Existing unrelated lint warnings and next-intl cache warnings remain. See build.log.

The first attempt failed because three task-owned before-snapshot files used a .tsx extension and were included by the broad TypeScript configuration. They were renamed to .txt; compiler coverage was not weakened. The successful build used the corrected evidence files. The temporary generated-type include was removed afterwards only after verifying that it was the sole configuration difference; tsconfig.built.json preserves the compiled configuration.

All 11 owned source/asset hashes match source-hashes.json. Scoped diff validation passed. Unrelated working-tree changes were preserved. No commit, deployment, migration or account creation was performed.

## Verification by evidence type

**Source inspection:** current logo constants, shell/provider boundaries, standalone fallback, responsive image dimensions and prior build provenance. All 23 paths in the previous source manifest matched before this pass.

**Mocked/component tests:** 53 tests passed in the maintained landing suite, including a new test for shared references, independent provider IDs and fallback artwork. This run preceded the final refinement of the image sizes attribute; the final attribute was subsequently covered by the successful build and rendered image-selection checks.

**Real database/service tests:** not run. Public navigation checks did not submit account or enquiry forms.

**Rendered browser checks on the final build:**

- 18 visual cases: Chrome, Firefox and WebKit × English/French × desktop 1440px, mobile 390px at 3× density, and narrow mobile 320px at 2× density.
- 108 logo screenshot comparisons against the previous build, covering workflow, catalogue and closing logos in both themes. All passed. Firefox and WebKit comparisons were pixel-identical; the maximum Chrome mean channel difference was 0.031 on a 0–255 scale.
- All shared references resolved to the current logo artwork. All 18 catalogue panels and 23 workflow options remained present. No overflow, runtime errors or automated accessibility violations were found in these cases.
- 678 workflow states across six EN/FR viewport/motion cases: zero component-height variation, zero overflow, no runtime errors or automated accessibility violations.
- Four Chrome linked-page interaction cases: all 18 catalogue selections, pricing paths, four cost panels, 12 decision questions, language switching, offer/contact handoffs, 200% text resizing on three pages, protected-route redirects, missing-page recovery, and public/auth/public client navigation passed.
- 12 pre-hydration cases across the three engines: the preview loaded and aligned before application bundles ran. Inline React streaming bootstrap remained enabled; these are not claims of complete no-JavaScript functionality.

Manual review included the rebuilt English desktop hero, French high-density mobile hero, and French mobile hero before hydration. This targeted pass complements the earlier full-route review; it does not claim another complete 264-route audit. WebKit automation is not actual Safari/iPhone testing, and spoken screen-reader verification remains outstanding.

## Matched local loading comparison

Baseline build: 5rEuulwFG0K_PbQZ6DkW1. Both servers were warm; each sample used a fresh Chrome context/cache. Mobile: 390px, default 1× density, 4× CPU slowdown, 150ms RTT and 200,000 bytes/second. Two samples per locale/viewport, with no concurrent task-owned build or browser suite. Exploratory results are retained separately and excluded from this comparison.

| Locale / viewport | Before LCP (seconds) | After LCP (seconds) |
| --- | --- | --- |
| English desktop | 2.740, 2.284 | 3.196, 2.416 |
| English mobile | 10.300, 14.392 | 9.280, 8.096 |
| French desktop | 3.376, 2.752 | 2.256, 2.104 |
| French mobile | 15.920, 10.428 | 8.704, 7.364 |

Mobile pair-average LCP improved by 29.6% in English and 39.0% in French. Desktop results were mixed: English was slower in this small sample (including higher first-byte time), while French improved. These local synthetic samples vary and are not field-performance guarantees.

Decoded HTML fell from 804,631 to 545,454 bytes in English and from 820,618 to 561,441 in French, approximately 32%. Recorded mobile resource transfer fell from 649,478 to 423,452 bytes and from 663,097 to 424,290 respectively; this resource sum excludes the navigation response. No duplicate full-size dashboard download was recorded. Mobile layout shift stayed below 0.0001 and overflow stayed at zero.

## Remaining priority

Mobile LCP is still 7.4–9.3 seconds in this run. The main photograph finished loading about 3.5–4.2 seconds before it was painted. Roughly 6,600 DOM elements remain. The next investigation should profile main-thread hydration/style/layout work and reduce the initial cost of inactive previews while preserving their stable sizes, all workflow choices, bilingual content, keyboard access and early display. Do not remove the existing sizing guides without equivalent layout evidence.

Actual-device Safari/iPhone and spoken screen-reader testing remain separate outstanding checks. Launch-specific contact/company/policy configuration remains deferred because the project is under development.

## Evidence and rollback

See summary.json, baseline.json, after.json, measurement-exits.json, followup-exits.json, visual-*/results.json, workflow-browser/results.json, interactions-chrome/results.json and prehydration-*/results.json. Before snapshots of the three implementation files are retained as plain text. A rollback should restore only this pass's responsive image attributes and logo-provider changes, remove its new test and seven derived image assets, and preserve all earlier/unrelated edits.

Final aggregate assertions passed. Both task-owned preview servers were stopped after identity checks; build output and verification artifacts remain available. See cleanup.json.
