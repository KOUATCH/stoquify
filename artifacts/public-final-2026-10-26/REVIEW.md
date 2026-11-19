# Landing page and linked pages: final verification

Development verification completed on 26 October 2026. The final production compiler/standalone build passed, and all **264 final-build route cases passed**. Loading performance improved materially; further optimization and actual-device/spoken screen-reader verification remain.

## Outcome of the four requested steps

| Request | Result |
| --- | --- |
| Complete the final build | Passed compilation, configured type/lint checks, 11/11 generated entries and standalone packaging. No orphaned build chains. |
| Improve loading | Public translation delivery was reduced and the main preview can display before application hydration. Simulated mobile LCP improved from 10.9–15.1s to 6.9–9.1s across the recorded samples. |
| Consolidate the public-site review | 22 routes × English/French × desktop/mobile × three engines passed on the final build, with additional 320px reflow checks. |
| Broaden browser/accessibility verification | Chrome, Firefox and WebKit checks completed. Named-group semantics and a WebKit skip-link issue were fixed. Actual Safari/iPhone and spoken screen-reader testing remain unverified. |

## Code changes

- Public routes now receive the landing-page translation vocabulary. Authentication and every other routable application family retain the full configured vocabulary through an explicit provider. Public-to-auth and auth-to-public client navigation were checked in both languages.
- The localized dashboard preview has high image priority. Its initial position is rendered with CSS matching the device photograph; JavaScript takes over after positioning. Public identity links no longer prefetch the full application message payload.
- The final build includes the prior mobile workflow-control correction. All **18 catalogue entries and 23 workflow choices** remain present.
- Generic missing-page recovery now has English/French copy, language-preserving navigation, the current shared logo, appropriate landmarks and responsive artwork.
- Two labelled containers now have group semantics. The skip link has an explicit tab stop, which made it reachable with ordinary Tab in the installed WebKit runtime. The compiled version passed focus, visibility and activation checks.
- The build-scope error was fixed by excluding only the separate documentation browser fixture at docs/command-center/phase-13-source-integration-2026-10-26/browser-entry.tsx. That fixture has its own bundler; application type checking remains enabled.

## Build and evidence provenance

Final build: **5rEuulwFG0K_PbQZ6DkW1**, in .next-public-final-20261026. The reviewed safe build wrapper completed with exit 0; compilation took 2.8 minutes, types/lint passed, and standalone output was valid. Existing unrelated lint warnings remain. See build-accessibility-final.log.

The comprehensive review and performance build was **wZiHuxJzfJTqNqnQd7Gby**. The final rebuild added only two group roles and the skip-link tab stop, recorded in semantic-correction.json. A new route matrix and homepage accessibility checks were then run against the final build. WebKit’s complete keyboard/download-status suite and all 52 affected landing-component tests also passed after rebuilding.

All **23 tracked source hashes match** the final source snapshot. Only the generated build-type include was removed from tsconfig afterwards. Scoped diff validation passed. Unrelated working-tree changes were preserved; no commit or deployment was performed.

## Verification, separated by evidence type

**Source inspection:** translation boundaries, locale route coverage, preview positioning, shared logo artwork, recovery behavior and build scope were inspected. The final route checks compare the rendered shared logo mark with the current artwork signature.

**Mocked/component tests:** **115 distinct tests passed**: 107 landing/component tests, four message-boundary tests and four missing-page tests. The 52 affected landing tests passed again on the last source changes in 125.426 seconds; this rerun is not counted twice.

**Real database/service tests:** not run. Forms used fictional local drafts; account creation, email transmission, uploads and schema promotion were not exercised. Registration/enquiry interaction checks blocked mutation requests and recorded none.

**Rendered/browser checks:**

| Engine | Version | Comprehensive route cases | Final-build route cases |
| --- | --- | ---: | ---: |
| chrome | 155.0.8059.86 | 88 | 88 |
| firefox | 151.0 | 88 | 88 |
| webkit | 26.5 | 88 | 88 |

The comprehensive review covered loaded media, clipping, screenshots, both supported themes and automated accessibility checks. The final-build matrix checked status, locale/title, overflow, current logo artwork, loaded-image failures and runtime/translation errors. Every homepage case additionally verified named groups, visible skip-link focus/activation and both-theme accessibility scans. There were no final-run rate-limit waits.

Additional evidence:

- **678 workflow states** across six locale/viewport/motion cases: all passed, with zero measured component-height variation.
- **20 additional touch-control states** at 390px/320px: passed, also with zero height variation.
- **216 catalogue selections**, plus pricing paths, four cost categories and all 12 decision questions in each interaction case: passed with stable panels.
- **24 registration states**, **12 keyboard/ARIA-tree/local-download cases**, **12 generic 404 recovery cases**, and **12 pre-hydration preview checks**: passed.
- **16 preview-dialog cases in Chrome** verified labels, mounted control targets, Escape closure and focus restoration.

The 22 routes comprise the homepage, product catalogue, eight product guides, three offer guides, pricing, workflows, setup, contact, sign-in, registration, password recovery, privacy and terms.

## Loading measurements

Same local Chrome protocol before/after: fresh browser contexts/caches; mobile used 4× CPU slowdown, 150ms RTT and 200,000 bytes/s. Two samples were recorded per language/viewport, without simultaneous task-owned builds or browser suites. LCP measures when the largest visible content is painted, not when every resource has finished loading.

| Language / viewport | Before LCP, seconds | After performance changes, seconds |
| --- | --- | --- |
| English desktop | 33.720, 4.352 | 14.904, 1.660 |
| English mobile | 10.904, 11.532 | 7.168, 7.012 |
| French desktop | 3.808, 4.516 | 1.828, 1.716 |
| French mobile | 15.064, 14.032 | 6.900, 9.092 |

English/French mobile pair averages improved by approximately **37% / 45%**. Decoded HTML fell from 1,117,067 to 804,592 bytes in English (**28%**) and from 1,179,121 to 820,579 bytes in French (**30%**). Mobile layout shift stayed below 0.00003.

The first English desktop sample had a large server first-byte outlier in both runs (28.710s before; 12.800s after). Those samples are retained. These are local synthetic results, not field guarantees. Measurements belong to the performance build; the subsequent rebuild changed only the three accessibility attributes described above.

**Performance remains the main improvement area.** The page still contains roughly 0.8MB of decoded HTML and 6,750 DOM nodes. The next measured work should reduce initial hidden-panel rendering/payload, review responsive preview delivery, and measure cold server/cache behavior on the eventual host while preserving every module, workflow and stable layout.

## Visual and accessibility review

Manually reviewed the English desktop homepage throughout, French mobile upper/middle/lower sections, pricing, workflows, contact, registration, HRIS, cross-browser samples and the rebuilt French mobile hero. Current branding was confirmed in these views, including device previews. Automated route coverage does not mean every screenshot was individually judged.

One very long Chrome mobile screenshot repeated upper content beyond roughly 16,384px. Normal viewport captures confirmed the actual French page has one hero and one footer and correctly renders its lower sections. Reliable captures are retained under visual-review/fr-mobile-viewports.

The two generic-container ARIA findings were corrected and no longer appear in final homepage scans. Closed preview-dialog reference warnings were checked through actual dialog interaction. Contrast-related manual-review flags remain recorded; automated passes are **not a full WCAG certification**.

Actual Safari on a physical iPhone and spoken screen-reader output were unavailable in this session. WebKit emulation, keyboard tests and ARIA snapshots do not replace those checks. The installed WebKit runtime skipped ordinary anchors with its default Tab traversal; the explicit skip-link stop was tested and fixed in the final build. Broader native Safari/VoiceOver navigation still needs real-device verification.

Launch company/contact/policy/hosting configuration remains deferred, as requested for this development project.

## Evidence files

- [Consolidated machine-readable result](<E:/ohada saas/Focused projects/stoquify/artifacts/public-final-2026-10-26/summary.json>)
- [Detailed execution history](<E:/ohada saas/Focused projects/stoquify/artifacts/public-final-2026-10-26/REVIEW-HISTORY.md>)
- [Final build log](<E:/ohada saas/Focused projects/stoquify/artifacts/public-final-2026-10-26/build-accessibility-final.log>)
- [Final source manifest](<E:/ohada saas/Focused projects/stoquify/artifacts/public-final-2026-10-26/source-hashes.json>)
- [Scoped diff/source check](<E:/ohada saas/Focused projects/stoquify/artifacts/public-final-2026-10-26/owned-diff-check.json>)

Browser folders, final-build-* results, interaction/form/keyboard evidence, performance samples and screenshots are retained beside this report. Early failures from rate limiting, restricted localhost access and test-selector/readiness issues were preserved and corrected without weakening application controls.

The task-owned temporary preview was stopped after verification. Build output, screenshots and evidence remain available.
