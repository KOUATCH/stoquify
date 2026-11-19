# Linked public pages: consistency and usability review

Development work only. Changes are saved in the shared codebase, without deployment, a commit, schema promotion, production configuration changes or real form submissions.

The task-owned standalone preview on port 4331 was stopped after verification; other development servers were left untouched.

## Scope and baseline

The earlier landing, pricing, workflows and contact work did not establish an equally detailed review of every product, offer and account-entry page. This pass closes that evidence gap for the public visitor journey. It does not certify the protected application behind the workspace links.

Baseline: 16 routes × EN/FR × 1440/390 pixels = 64 cases. No horizontal overflow was found, including the 320 px spot checks. Sixty-three accessibility scans completed without detected violations; one French desktop offer scan was interrupted by a local-origin/CSP prefetch issue. This baseline is not reported as 64 passing scans. Final checks use the configured localhost origin, retain CSP, and disable unnecessary protected-destination prefetches.

Source and screenshot findings:

- The product index emphasized eight preview pages without the full 18 module/workspace presentations.
- Product guides needed concrete capabilities, intended users and the records exchanged between teams. Their previews lacked the shared logo and felt detached from the details.
- Excessive heading and section gaps made product/offer/setup pages taller than needed.
- Product and offer discovery actions went directly to account creation rather than preserving the selected planning interest.
- French pages inherited a generic English browser title.
- Password recovery linked back to older landing/sign-in routes; its shared French shell included missing accents and an inconsistent logo subtitle.

## Changes

- Reused the complete 18-entry module catalogue on `/products`; retained all eight detailed product guides and the accounting-firm collaboration entry.
- Added capabilities, intended users, inputs and outputs to each product guide using the existing bilingual catalogue data. Integrated the current branded preview and details within one bordered component.
- Added scoped compact styles for product, offer and setup pages, retaining responsive stacking and visible focus indicators.
- Connected product and offer planning buttons to the appropriate contact interest. Existing customers retain their protected workspace destination; signed-in component behavior remains covered by mocked tests.
- Kept setup links and guidance, with a clearer distinction between a new workspace and an invitation to an existing organization.
- Added localized, route-specific metadata for products, offers, pricing, workflows, setup and account entry. Auth pages retain no-index/no-referrer controls.
- Corrected recovery home/sign-in destinations and French shell typography. No authentication or recovery action logic changed.
- Balanced the four setup cards in two columns on desktop and one on mobile.
- Added bilingual, no-index publication-status pages for `/privacy` and `/terms`, which registration already linked to. They display approved policy links when configured and clearly state when publication is pending; no legal terms or company details were invented.
- Removed duplicate not-found exceptions from dynamic product/offer metadata. Invalid routes retain the page-level not-found response and localized, no-index metadata.
- Allowed registration's action row to wrap, fixing 10 px horizontal overflow on the French security step at 320 px. No form submission or consent behavior changed.

## Verification ledger

Source inspection: project workflow, design system and public/auth contract; public route/link inventory; metadata, shared previews and auth form controls reviewed.

Mocked tests: **127 distinct scoped tests passed across the final runs**. The public rerun passed 107 of 108 tests; its one failure was an outdated expectation that `/privacy` retained the old shell. That expectation was corrected to use an unrelated route, and two explicit policy-shell tests were added. The focused rerun passed all three (49 unrelated tests skipped), giving 110 public checks plus the 17 passing login/recovery checks. These use mocked services and do not demonstrate real database, session or email behavior. Logs: `unit-tests-final.log`, `policy-shell-tests.log`, `auth-tests.log`; earlier `unit-tests.log` and `metadata-tests.log` are retained.

Completed browser matrix: **20 routes × EN/FR × desktop/mobile = 80 cases**, using application build `17c6HJs93qi6Va1tcP1I3`. Routes: landing, products index, all eight product guides, all three offer guides, pricing, workflows, setup, contact, login, registration and password recovery. All returned 200, reported the correct document language and localized title, and had no missing images, visible clipped text, horizontal overflow or uncaught page errors. Mobile cases also passed 320 px overflow checks. **156 axe scans had zero detected violations**, covering both themes where the page supports them. See `final/audit.json` and its screenshots. The initial local-server-startup failure and baseline CSP finding are retained in separate logs rather than counted as passes.

Visual inspection: actual desktop and mobile screenshots were reviewed across every product-preview type, the catalogue, offers, setup, registration and recovery, including French text. This complements automated measurements; it is not a claim that every possible device or content state was inspected manually.

Application build: **passed**, ID `T_bXzizHINIQ9j5YvR5EF`, with compilation, lint/type checks, static generation and standalone packaging complete; wrapper exit 0, valid output, no remaining orphan build chains. Existing unrelated lint warnings remain in `build-complete-scope.log`. This build precedes only the final one-class registration button-wrap correction. The temporary generated TypeScript include was removed after the build.

Focused final-build browser matrix: **28 cases passed** (seven routes × EN/FR × 1440/390 px), including the new privacy/terms status pages, setup, HRIS, finance and invalid product/offer URLs. Correct language/title, no horizontal overflow or uncaught errors; mobile also checked at 320 px. Setup has two card columns on desktop and one on mobile. **56 additional axe scans passed** across both themes. See `final-delta/results.json` and screenshots. Invalid URLs use Next.js's streamed not-found response, which can have HTTP 200 after headers have been sent; their metadata is no-index and their recovery controls are present.

Registration: **eight further screen-state checks passed** (company/security × EN/FR × desktop/mobile), including mobile reflow at 320 px. Eight axe scans reported zero violations, the Back action retained the fictional draft, and zero mutation requests occurred. The final `flex-wrap` class was applied to the preview's existing action row using the already-compiled utility to verify the exact source change; the full build was not repeated for that one-class adjustment. See `registration/results.json`, `registration-wrap-final.log` and the 320 px screenshots. The original overflow and an initial incorrect test selector are retained in separate logs.

Interaction checks: **all four EN/FR desktop/mobile cases passed**: 72 module selections with zero panel-height variation, desktop keyboard navigation, three planning-interest links per case, language preservation, three 200% text-resizing cases per viewport/locale, protected sign-in callback, both missing-page recovery buttons and recovery navigation. No page errors were recorded in the completed cases. The English completion is in `interactions-settled-final.log`, the French completion in `interactions-french-final.log`, and all four results in `interactions/results.json`.

Transition diagnostics: earlier rapid hard-navigation runs intermittently reported React 419 at invalid URLs. All fresh-page matrix cases and a separate four-route recovery diagnostic passed without that error; the diagnostic followed each recovery link successfully. The completed EN/FR sequences also passed without errors. The runner now waits for navigation to settle around recovery rather than interrupting a streaming transition. These observations do not establish exhaustive rapid-navigation robustness; retain the interrupted-stream scenario as a technical follow-up. One French run hit a 30-second background-network-idle timeout and was rerun separately; it is not counted as a pass.

Overall rendered coverage: **22 distinct public routes**, each in EN/FR at desktop/mobile widths, plus focused follow-ups and registration steps. **220 completed axe scans detected zero violations** (156 initial final-matrix scans + 56 focused final-build scans + 8 registration-state scans). This count includes repeated routes and does not imply 220 distinct pages.

Build history: the first build exposed TypeScript treating reference snapshots in the evidence folder as source; those snapshots were renamed to `.txt`. The next Next.js build completed compilation, lint/type checks, static generation and standalone output successfully; the wrapper subsequently flagged an unrelated build in `.codex-tmp/phase10-5b6c850591/candidate`. Its separate checkout/output was verified and left untouched. The final build uses the root checkout's dedicated `.next-landing-release-20261025` output with the wrapper's explicit `--allow-orphans` option. One intermediate rebuild was intentionally cancelled to include the two policy routes. This is application-build evidence, not certification of the separate production-secret or deployment gates.

Real database tests: not run. No accounts, enquiries, reset emails or business records were created.

## Remaining development/release boundaries

This is responsive desktop Chrome testing, not physical iOS/Android testing or a screen-reader certification. Automated accessibility scans supplement visual, keyboard and reflow checks.

The earlier first-load performance findings remain open; compact layouts do not prove a fast cold load. Production contact/company/policy/origin configuration remains intentionally pending while the project is under development. Protected dashboards, live authentication, email delivery and deployed-host behavior need their own authorized verification.

The final preview also needed two 45-second first-request attempts before responding; a later request completed in about 0.27 seconds. This workstation observation reinforces the open cold-start concern and is not a production performance benchmark. Do not describe these pages as launch-certified.

Registration's existing consent logic was not changed. The policy status pages make the missing publication explicit; approved terms and privacy content are still required before accepting real public registrations at launch.

## Reproduction and local scope

The browser runners target only `http://localhost:4331`. `audit.cjs`, `final-delta.cjs` and `interactions.cjs` navigate and inspect public pages without submitting forms. `registration-steps.cjs` blocks non-GET/HEAD/OPTIONS requests, enters fictional client-side values and stops before account submission.

Commands reviewed and used:

```text
npm run agent:workflow:check
node scripts/build-app-safe.js --skip-clean --allow-orphans --timeout-ms 3600000
node node_modules/jest/bin/jest.js --config scripts/jest.landing-showcase.config.cjs --runInBand
node node_modules/jest/bin/jest.js --config scripts/jest.landing-showcase.config.cjs --runInBand --runTestsByPath components/landing/__tests__/CinematicLanding.test.tsx --testNamePattern "unrelated public routes|policy publication route"
node node_modules/jest/bin/jest.js --config artifacts/linked-public-pages-2026-10-25/jest.auth-review.cjs --runInBand
```

The build used `NEXT_DIST_DIR=.next-landing-release-20261025` and an 8192 MB Node heap. Standalone preview preparation copies only public/static assets into that isolated build. No schema promotion or deployment command ran. Changes remain uncommitted alongside unrelated work; rollback must use owned hunks rather than a whole-worktree reset. The principal owned areas are the public detail components/styles/catalogue, public and auth route metadata, recovery navigation/copy, and their scoped tests/evidence.

## October 26 follow-up

See [public loading and navigation follow-up](../public-performance-2026-10-26/REVIEW.md) for the next isolated build, deferred public startup imports, 10 mocked boundary tests, 24 core-route checks, 32 rapid/interrupted recovery checks and eight registration screen states. The registration wrapping fix is now verified in the actual compiled build, without a browser-injected patch. React 419 did not recur in those bounded recovery checks. First-load performance remains open; the report retains all timings and the slow outlier, with workstation contention disclosed. This follow-up does not replace the broader route inventory or certify live authentication, email, policies or deployment.
