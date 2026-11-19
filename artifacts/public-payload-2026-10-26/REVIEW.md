# Public payload and stable workflow sizing

Development-only continuation of the public performance review. No deployment, migration, account creation, enquiry or upload submission.

## Scope and reasoning

The public workflow library rendered the same 32 inert scene reserves twice when an animated module was selected: once in `WorkflowDemoPlaceholder`, once in `ProductWorkflowDemo`. One complete guide has 1,548 descendant elements. Both copies were sent in initial HTML and hydrated even though neither was visible.

The placeholder now includes its scene guide only when a guided workflow, rather than a module walkthrough, is selected. The active module supplies the same guide otherwise. All 23 workflows, 18 catalogue entries, playback scenes, content, links and labels remain. The other intrinsic text reserves remain to preserve layout stability.

Reduced motion previously hid the guide's progress space through an ancestor selector. A narrow CSS rule retains that invisible footprint; the active demo also retains the placeholder's invisible playback-hint space when motion is off. This avoids replacing duplicate DOM with a fixed pixel height that could clip longer French text.

The 80-case browser sizing experiment covered EN/FR, eight modules and widths 1440/1024/768/390/320. Removing the duplicate plus reserving the hint initially shortened the component by 12px; inspecting computed styles traced this to the reduced-motion progress selector. The final CSS addresses that cause. These experiments modified only temporary browser DOM; final verification must use the compiled source below. The first probe failed because it attempted to use the hidden mobile selector at desktop width; the corrected probe uses visible controls. Its failed result is retained, not counted as a pass.

Global translation-provider restructuring is excluded: choosing messages solely from the initial request in a shared layout could leave missing translations after client navigation into another route family. No middleware, authentication or locale-provider behavior is changed.

Follow-up source inspection confirms public translation consumers predominantly request `landing.*`, while `app/[locale]/layout.tsx` provides full application and payment bundles to every route. A future reduction should use explicit route-group/provider boundaries, with regression coverage for navigation among public, authentication and dashboard routes and for the direct locale routes. Do not condition a persistent shared provider solely on the initial URL. This is a separate change from the sizing optimization being verified here.

Guidance: project workflow, command registry, design master and public/auth contract; project UI/UX Pro Max `ux-guidelines.csv` Performance/Lazy Loading and Typography/Font Loading support deferring unnecessary work while reserving layout space. Existing theme/tokens remain authoritative. The unrelated chip-reflow search result was not used. Existing graph_app metadata was consulted for discovery; current route and component source controlled the change.

## Verification ledger

- Workflow contract: passed; 196 commands remain unclassified. Actual runners inspected separately.
- Source inspection: duplicate sizing guides and reduced-motion selector confirmed. Existing unrelated work preserved.
- Mocked component tests: **93 passed / two suites**, `CinematicLanding.test.tsx` and `ProductWorkflowDemo.test.tsx`, using the reviewed isolated `scripts/jest.landing-showcase.config.cjs` runner. The initial run took 302.215 seconds; the final-source repeat also passed, exit 0, in 435.043 seconds (`component-tests-final.log`). They cover existing selection/playback behavior plus the single-guide bound across animated and guided workflows; they do not prove rendered geometry. All four current source/test hashes matched after verification.
- Application build: **passed on continuation**, build `YS9pWduMNOwMa5URyMJSI`; see resumed verification below. Earlier preflights were blocked by another active build and less than 1 GiB available memory. That work was left untouched and the gate was not bypassed. The subsequent preflight cleared normally.
- Corrected browser-only sizing experiment: EN at 1440 and 390 pixels passed across five representative animated and guided workflows each, with **zero height difference from the original layout**. The next 320-pixel animated-mode navigation exceeded 120 seconds while waiting for load, so this experiment stopped before French verification. Its partial results are retained in `candidate-probe.json`; it is not final compiled-source evidence.
- Compiled core-page checks: **24 passed**, six routes × EN/FR × 1440/390 pixels, plus **24 rapid missing-page recoveries**. No horizontal overflow, failed loaded images, page errors, recovery errors or axe WCAG A/AA violations were recorded. This is automated browser evidence, not complete accessibility certification.
- Initial compiled workflow sweep: five viewport/locale cases passed; French at 320 pixels with normal motion failed with a **16px height range**. The original failure is retained in `workflow-browser-before-status-fix/` and `verify-workflows-before-status-fix.log`.
- Final source-CSS workflow sweep: **678 workflow/step states passed**, EN/FR × 1440/390 reduced motion and 320 normal motion. All six cases have zero height variation, no horizontal overflow, one sizing guide, 23 workflows, 18 catalogue entries, no page errors and no axe violations. Desktop Home/End selection passed. This used the exact two final CSS rules overlaid on the otherwise unchanged compiled application; it is **not a post-fix rebuilt artifact**. See `workflow-browser-source-css/source-css-provenance.json` and `results.json`.
- Additional touch emulation: EN/390 and FR/320 with normal motion passed selection, step, resume and replay checks across four representative animated/guided workflows, **20 measured states, zero height range or horizontal overflow** (`mobile-controls.json`). Clean full-page-derived crops `en-390-touch-workflow.png` and `fr-320-touch-workflow.png` were visually inspected. These use the same source-CSS overlay and are emulated Chrome checks, not physical-device tests.
- Real database, live authentication, email, uploads and deployed-host checks: not run.

No post-change loading-speed claim is made. The structural duplicate was removed in source and verified in component tests and the successful full build. Browser verification subsequently found and corrected a narrow-screen CSS defect. The final CSS rebuild is blocked by another active build; this limitation is separate from the passing source-CSS rendered checks. Earlier temporary preview servers were stopped before this continuation started the new build's preview.

## Resumed verification

On continuation at 15:59 local time, the workflow contract passed again and all four owned source/test hashes still matched the 93-test result. A fresh preflight reported zero orphaned build chains and absent isolated output. The inspected builder then started with `.next-public-payload-20261026`; `build.log` records this attempt. **Build passed, exit 0, valid standalone output, build ID `YS9pWduMNOwMa5URyMJSI`.** Compilation, type checking and all 11 generated pages passed; existing lint and next-intl cache-analysis warnings remain in the log. No migrations ran. The temporary output's generated tsconfig include was removed afterwards, and all four source/test hashes still matched. The public route and server dependency manifests referenced no previous temporary builds/artifacts in the inspected path filters.

ECC verification-loop is applied through the project's reviewed build/test/browser lanes, without generic broad tests, migrations or secret-printing searches. Workflow browser results now use `workflow-browser/`, separate from the core-page runner's `browser/`, to prevent either result file from overwriting the other.

The new standalone server reported ready in 10.7 seconds. Its first anonymous EN HTTP response returned **200**, first byte **47.581 seconds**, complete response **47.637 seconds**, **1,117,067 bytes** (`cold-server.json`). The previous build's response was 1,231,292 bytes: 114,225 fewer bytes (about 9.3%). This confirms a smaller response, not a cold-start speed improvement; the new cold response was slower in this local run. Browser measurements follow this first plain request, using the same sequence as the earlier review.

## Compiled loading measurements

All eight fresh-cache EN/FR desktop/mobile samples returned 200 with zero page errors, recorded CLS 0 and zero horizontal overflow. Mobile uses responsive Chrome at 390 pixels with 4x CPU throttling, 150 ms latency and 200,000 bytes/s download, not a physical phone. Approximately 5.8 GiB of workstation memory was available during the observed measurement stage; this differs from the earlier heavily contended run. These are separate local runs, not controlled field performance comparisons.

| Locale / width | Decoded HTML bytes | DOM elements | LCP samples |
| --- | ---: | ---: | --- |
| EN / 1440 | 1,117,067 | 6,750–6,769 | 4.784 s / 4.516 s |
| EN / 390 throttled | 1,117,067 | 6,751–6,752 | 11.868 s / 11.864 s |
| FR / 1440 | 1,179,121 | 6,757–6,769 | 4.956 s / 4.612 s |
| FR / 390 throttled | 1,179,121 | 6,751 | 13.288 s / 10.880 s |

Compared with the previous build, decoded HTML fell **9.28% EN / 8.89% FR** and the DOM fell from roughly 8,300 to roughly 6,750 elements (about **19% fewer**). This measures HTML markup and rendered elements, not a 9% reduction in compressed total network transfer. Static image assets are unchanged. `comparison.json` preserves previous and current ranges; `after.json` includes LCP image paths/load/render times and resource sizes.

**Mobile rendering and cold-start performance remain open.** The localized dashboard capture is the LCP element in these samples. Smaller markup is confirmed, but mobile timings did not consistently improve and the cold response was slower. Do not present this change as a validated loading-speed or production-readiness improvement. The next scoped performance investigation is route-group translation delivery and the measured image-to-render delay, preserving all workflow content.

## Narrow-screen correction and remaining rebuild

Computed geometry traced the French 320px failure to playback status being squeezed between Pause and Replay: the status occupied four lines while hovering, versus two after pausing. Reserving more status text in the placeholder alone did not help because the placeholder deliberately no longer includes a duplicate scene guide while an animated module is selected. The targeted fix uses two equal button columns and gives status its own row at widths up to 540px. It preserves natural content height and existing touch targets, without clipping or fixed section heights. The corrected French 320px normal-motion layout is 1641.921875px tall throughout the tested workflow states; the extra row makes the controls readable and stable.

`source-hashes-built.json` identifies the four files in successful build `YS9pWduMNOwMa5URyMJSI`. `source-hashes.json` identifies the current files: only `product-workflow.css` differs after that build. The CSS overlay runner parses that file, extracts the two actual control rules, asserts their count and records the file hash and base build ID. There are no browser-only substitute app changes in that run.

The safe rebuild preflight returned `blocked-orphaned-build` while the separate AF16 release build was active. A final preflight returned the same block, exit 1. Its processes were left untouched; no bypass flag was used (`rebuild-preflight.log`, `rebuild-preflight-final.log`). Once it clears, stop this task's preview if still running, preserve the existing build log, and rebuild the task-owned `.next-public-payload-20261026` output with the inspected safe builder and `--skip-clean --timeout-ms 3600000`. This may reuse its own cache; do not modify another task's output. Inspect/remove only this output's generated tsconfig include afterwards, rerun `prepare-preview.cjs`, and restart localhost:4332. Run `verify-workflows.cjs` **without** `SOURCE_CONTROL_CSS=1` to close the final compiled-artifact verification gap.

Core checks in this continuation cover home, products, pricing, workflows, contact and get-started. They do not recertify every route from the earlier linked-page review. Sampled desktop/mobile English/French screenshots were visually inspected for current branding, readable text, aligned cards and compact controls. Element screenshots can show the sticky header midway through a tall captured element because of capture scrolling; these are not treated as evidence of a page overlap defect.

## Owned scope and rollback

This pass changes `cinematic-product.tsx`, `product-workflow-demo.tsx`, `product-workflow.css` and focused assertions in `CinematicLanding.test.tsx`. Roll back only this pass's guide ownership, reduced-motion reservation and assertions; preserve earlier landing-page work and unrelated edits. Work remains local and uncommitted.

All task-owned test/browser runners completed. The verified preview server on port 4332 was stopped after checks; the other task's build and preview processes were not changed. No remote deployment occurred. The final narrow-screen correction is a separate two-rule CSS addition and can be rolled back independently.
