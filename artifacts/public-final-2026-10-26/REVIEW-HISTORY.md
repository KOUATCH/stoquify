# Final public-site build, performance and browser review

Status: in progress. Development-only verification; no deployment, real registration, email, uploads or database writes.

## Scope

The requested close-out covers the final mobile control correction, public loading performance, all 22 previously reviewed public routes, and broader browser/accessibility checks. Existing unrelated changes remain untouched. This run uses isolated output `.next-public-final-20261026` and preview port 4334.

## Changes

- Locale context remains at the shared locale layout, with no full application message payload. The public route layout provides only `landing` messages. Authentication, dashboard and every other routable locale family explicitly provide the full configured vocabulary through `ApplicationMessages`. Route boundaries, rather than initial-request URL detection, govern delivery during client navigation.
- The existing public vocabulary is preserved. Main message JSON serialization falls from 333,547 to 57,384 bytes EN and from 382,806 to 63,486 bytes FR before compression; these are message-only sizes, not measured full-page speedups.
- The localized dashboard image now has high fetch priority. Earlier throttled samples showed its image load completing near LCP in three of four mobile samples, with one substantial render-delay outlier. This keeps the current artwork and brand intact and addresses priority while the smaller translation payload reduces competing delivery and hydration work.
- Follow-up measurements showed priority and translation scoping alone were insufficient: mobile EN remained 10.96–11.27 seconds and FR 12.30–13.70 seconds, with 5–6 seconds between image download and display. The initial screen now uses CSS matching the photograph's crop, with the existing JavaScript animation taking over after measurement. Public login/registration links no longer prefetch full application messages. Intermediate results and the preceding successful build are retained under `priority-only/`; final measurements follow the rebuild containing these additional changes.
- The previously verified small-screen controls correction is included in the actual build; no source-CSS overlay is enabled in this run's workflow runner.
- Build scope correction: `tsconfig.json` excludes only `docs/command-center/phase-13-source-integration-2026-10-26/browser-entry.tsx`. That separate synthetic UI fixture has its own explicit Webpack entry/loader in `browser.cjs`; the application's broad TS include accidentally pulled in its undeclared fixture-only Window globals. The fixture and its own runner are unchanged. Application type checking remains enabled.
- Generic missing-page recovery now uses EN/FR copy, language-preserving home links, the shared current logo, a primary heading/main landmark and a fluid illustration. Its four mocked tests passed; browser status, reflow, accessibility, home and back navigation are checked separately in `recovery.cjs`.

## Guidance and source evidence

Repository workflow/command registry, design master and public/auth contract; ECC verification-loop adapted to reviewed local lanes; project UI/UX Pro Max `ux-guidelines.csv` Content Jumping and Font Loading guidance. No new typography or layout system was introduced. The generic alt-text recommendation does not change decorative screenshots already marked as illustrative/hidden from assistive technology.

Existing graph nodes `locale_layout_tsx` / `locale_layout_localelayout` (community 3) and root-layout community 52 were used for discovery; current source and route inventory controlled the provider change. Installed next-intl server provider source was inspected to verify explicit messages prevent automatic inheritance of the full configured bundle.

## Verification ledger

- **Final build passed**, exit 0, build ID `wZiHuxJzfJTqNqnQd7Gby`, valid standalone output, no timeout and zero orphaned build chains. Compilation completed in 2.2 minutes; configured types/lint and all 11 generated entries passed. `build-final.log` is the final source build, including the scaled initial disclosure and generic recovery screen. `tsconfig-built.json` preserves its configuration; only the temporary generated-type include was removed afterward.

- Workflow contract passed (196 unclassified package commands). Actual build/test runners inspected separately.
- Four mocked message-boundary tests passed. They verify public/full vocabulary separation for EN/FR, invalid-locale rejection, vocabulary preservation, and explicit full-message coverage for every non-public routable locale family. The first attempt encountered next-intl ESM routing in Jest; the focused test now mocks routing configuration, with browser locale/navigation checks required separately.
- **107 component tests passed across five suites**, exit 0, 192.535 seconds with a 2 GiB Node heap. Combined with the four boundary tests: **111 passing scoped mocked/component tests**. The resumed run started after compilation when at least 3.5 GiB was free, and completed before performance measurements. See `component-tests.log` and `message-tests-final.log`.
- After the early-render/prefetch change, all 52 affected landing tests passed again with the maintained `scripts/jest.landing-showcase.config.cjs` lane. A first rerun using the older cinematic-only configuration failed four tests because that configuration lacks the shared `IntersectionObserver` mock; the failed log is retained, and the application was not altered to hide that test-environment gap. Four new generic recovery tests passed in 9.658 seconds. Total distinct passing tests across these scoped runs: 115.
- Initial-preview geometry prototype: 42 EN/FR comparisons across seven desktop/mobile/landscape sizes and three engines passed. Maximum difference from the existing measured position was 0.486px Chrome, 0.450px Firefox and 0.657px WebKit. This prototype used source CSS on the intermediate preview and is **not** final-build evidence; the final `prehydration.cjs` checks use only built assets with application bundles blocked while inline streaming bootstrap remains enabled. Two earlier prototype failures are retained: the harness initially double-scaled the old build, and the first mobile formula missed the production layout's 300px photo height. Both were corrected before the successful 42-case run.
- The next intermediate compilation was deliberately stopped before completion to include the generic recovery correction. `build-render-interrupted.log` is not counted as a passing build. `build-final.log` records the subsequent final-source build.
- **Intermediate application build passed**, exit 0, valid standalone output, zero orphaned build chains, build ID `PgtfgLRslewLYAtKPfOej`. The corrected attempt compiled in 5.2 minutes, passed configured type/lint checks, generated all 11 static entries and completed packaging. Existing application lint/cache warnings remain in `build.log`. No schema promotion ran. The build-added temporary tsconfig include was removed afterwards; the narrow fixture exclusion remains. All owned source hashes matched after the build; the final tsconfig hash is recorded separately from `tsconfig-built.json` in the same manifest.
- First build compiled in 19.1 minutes, then failed type checking on the separate documentation fixture's `window.fixtureBusinessCalls`. Evidence is retained in `build-attempt-1.log`. The corrected application build reuses only this task's cache, without skipping types or lint. Its temporary generated configuration is recorded in `tsconfig-built.json`.
- Resource handling: available physical memory fell to about 436 MiB during compilation. This task's secondary five-suite Jest process used about 1.3 GiB; it was deliberately stopped and subsequently rerun successfully after the build. That interrupted run is not counted as a test pass. Other tasks were not stopped.
- Browser runtime smoke checks: Firefox 151.0 and WebKit 26.5 both launched and closed successfully from installed runtimes. Chrome remains available. Firefox mobile means a narrow viewport/touch configuration; WebKit uses mobile emulation. Neither is a physical iPhone or actual Safari application.
- Native screen-reader inspection: unavailable. Initial computer-use discovery timed out; retry returned `Native apps: Error: computer-use request timed out: list_apps`, with no native apps exposed. Windows Narrator executable exists, NVDA was not found at the checked standard installation paths. No spoken-output test is claimed. Keyboard/focus, ARIA-tree, live-status and automated accessibility checks supplement but cannot replace actual screen-reader testing.

## Final checks

`site-audit.cjs`: 22 routes × EN/FR × desktop/mobile, in Chrome, Firefox and WebKit; screenshots, loaded images, locale/title, clipping/overflow, 320px reflow and axe scans in both supported themes. Routes include home, products, eight product guides, three offer guides, pricing, workflows, get-started, contact, login, register, recovery, privacy and terms.

`workflows.cjs`: all 23 workflow options/steps in six locale/viewport/motion cases, 18 retained catalogue entries, constant height and keyboard selection, using only built CSS. `interactions.cjs`: module catalogue, language preservation, planning links, 200% text reflow, protected redirect and missing-page recovery. `registration.cjs`: fictional local drafts with non-read requests blocked and no submission. `accessibility-interactions.cjs`: keyboard skip/menu behavior, ARIA snapshots and local brief download/status with no transmission. `measure.cjs`: fresh-cache desktop/mobile samples using the preceding run's throttling protocol, without simultaneous task-owned browser checks.

## Remaining launch boundaries

Approved company/contact/policy/host configuration remains deferred as requested. Real authentication/email and hosted-environment verification are separate launch work. No public launch certification follows from local browser or mocked tests.

## Early-render test boundary

The first no-JavaScript probe left streamed content in the loading fallback: a zero-size hidden stream segment cannot certify visible preview rendering. Chrome/WebKit failed the caption assertion, and the Firefox probe stalled and was stopped with only its owned process tree. Logs and the screenshot are retained with `nojs` suffixes. The corrected check blocks all application chunks while permitting React’s inline streaming bootstrap, requires the photo to be visible, and checks image loading, nonzero geometry, matching placement and caption scaling before `data-positioned` is set. This is pre-hydration evidence, not a claim of full no-JavaScript support.

## Final-build loading measurements

Same local Chrome protocol before and after: fresh browser contexts/caches, two samples per language/viewport; mobile uses 4x CPU slowdown, 150ms RTT and 200,000 bytes/s. Task-owned browser suites and builds were not running during measurement. These are local synthetic samples, not field results or a guarantee.

| Language / viewport | Baseline LCP, seconds (both samples) | Final LCP, seconds (both samples) |
| --- | --- | --- |
| English desktop | 33.720, 4.352 | 14.904, 1.660 |
| English mobile | 10.904, 11.532 | 7.168, 7.012 |
| French desktop | 3.808, 4.516 | 1.828, 1.716 |
| French mobile | 15.064, 14.032 | 6.900, 9.092 |

The first English desktop sample in each run had a large server first-byte outlier (28.710s before, 12.800s after); both are retained rather than removed. A separate first-response sample also remained slow. No server-start performance guarantee is inferred.

Decoded document size fell from 1,117,067 to 804,592 bytes in English (28.0%) and from 1,179,121 to 820,579 bytes in French (30.4%). Mobile sample averages improved by 36.8% and 45.0% respectively. Final mobile LCP is the photograph, with the preview no longer waiting for application hydration; EN photo load-to-paint delay was approximately 249–278ms. Final mobile CLS was below 0.00003 and measured overflow was zero.

**Remaining performance work:** 6.9–9.1 seconds is an improvement, not a fast-loading certification. The page still sends about 0.8MB of decoded HTML and roughly 6,750 DOM nodes while retaining all modules. The next measured optimization should reduce repeated/initial hidden-panel markup and deliver responsive preview artwork while preserving readable detail, stable heights, accessibility and all workflow choices. Hosted cache/compression/first-byte behavior also needs measurement on the eventual deployment. No further architectural rewrite was mixed into this final verification.

## Final workflow and source checks

All 678 workflow states passed in six EN/FR viewport/motion cases; every measured component height range was zero. Both additional 390px/320px touch cases passed all 20 states with zero height variation. All 23 workflow options and 18 catalogue entries remain present. These checks used built CSS without overlays.

All 21 tracked source hashes matched the final-build manifest. Scoped git diff whitespace validation passed; existing CRLF normalization warnings are informational. No files were staged or committed.

## Visual review evidence

Manually inspected all six English desktop homepage panels, French mobile upper/middle panels and normal viewport captures of the final setup, resources, closing and footer sections. Also inspected French desktop pricing/workflows and French mobile contact, registration and HRIS plus English mobile pricing. Current Stoquify marks appear in the inspected headers, footers, embedded previews and device scenes. This is representative visual inspection alongside automated route coverage, not a claim that every screenshot was individually judged.

A very long Chrome mobile full-page capture repeated upper content after roughly 16,384px. A fresh viewport-by-viewport review of the 20,689px French page confirmed one hero, one h1 and one footer in the DOM and correctly rendered lower sections. Reliable lower-page captures are in visual-review/fr-mobile-viewports; the faulty long capture is retained as a capture limitation, not treated as page-layout evidence.

## Test execution diagnostics

Concurrent browser suites reached the existing per-process request limit (200 requests per minute), producing HTTP 429 on several Firefox/WebKit routes and a Chrome navigation timeout. Original failures are preserved with rate-limit-attempt names. Remaining suites were resumed sequentially with navigation pacing; application rate limits were not weakened. A later restricted process could not access localhost (EACCES); the same local checks were resumed with approved local network access.

## Accessibility findings requiring follow-up

The focused manual review of axe incomplete results found two real semantic improvements: components/landing/capability-overview.tsx:24 and components/landing/cinematic-business-story.tsx:212 place aria-label on generic div containers. The labels may be ignored by assistive technology; the visible children/headings remain available. Give these named containers an appropriate group role (or remove the redundant labels if they add no useful grouping), then verify the accessible tree. The two containers have now been corrected with role="group". A final rebuild and build-specific route/accessibility matrix will verify that correction; the comprehensive preceding review is preserved separately.

The other ARIA incomplete result concerns Radix dialog controls whose target is mounted only when the preview opens. A focused dialog interaction check verifies the target, label, Escape closure and focus restoration. Color-contrast incomplete results remain manual-review items, particularly over imagery; representative screenshots were inspected but do not constitute exhaustive contrast certification.

All 16 preview-dialog cases passed: EN/FR × desktop/mobile × three home previews plus one workflow preview. Each opens a real labelled dialog matching aria-controls, closes with Escape and restores trigger focus. The closed-state reference warning is explained by conditional mounting.

Chrome final route, interaction, registration and keyboard/download suites all passed. Two test-only selector ambiguities were corrected: a hidden responsive recovery link and the framework’s additional empty status announcer. Failed attempts remain preserved; no product behavior was changed to satisfy those selectors. Firefox and WebKit continue sequentially from their previously passed route cases.

External verification still required: actual Safari on an iPhone, plus spoken screen-reader use (for example VoiceOver on that device). Verify navigation and dialog focus, headings/group names, form labels/errors, module/step selection and the local brief status announcement. Browser emulation and saved ARIA snapshots do not prove spoken output or physical touch behavior.

WebKit keyboard investigation: ordinary Tab and Alt+Tab skipped anchors in this installed runtime and first focused the Products button. A temporary DOM experiment adding tabindex=0 made Skip to content the first Tab stop. The source skip link now has tabIndex={0}; the final build will verify this improvement without overlays. Default-probe and experiment outputs are retained separately.

## Accessibility correction rebuild

The final build 5rEuulwFG0K_PbQZ6DkW1 passed compilation (2.8 minutes), application type/lint validation, 11/11 generated entries and standalone packaging, with zero orphaned build chains. See build-accessibility-final.log. Only the generated type include was removed afterwards; all 23 owned source hashes are recorded. Relative to the comprehensive review build wZiHuxJzfJTqNqnQd7Gby, the final change adds two named group roles and an explicit tabIndex=0 on the skip link.

All four WebKit keyboard/ARIA-tree/download-status cases passed on this rebuilt application without overlays. All 52 affected landing-component tests passed again in 125.426 seconds. The full final-build public-route matrix is now running. Performance measurements remain attributed to the preceding build; the final changes are the three accessibility attributes recorded in semantic-correction.json.
