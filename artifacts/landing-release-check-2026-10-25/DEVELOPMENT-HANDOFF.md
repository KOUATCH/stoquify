# Development build and public-page verification

This project remains under development, as confirmed by the owner during this task. A successful optimized local build is an engineering check, not deployment approval or a statement that every product workflow is ready for production. No live contact destination, company details, policy text, production secrets, or delivery channel was invented or activated.

## Information to provide when launch is planned

| Information | Exact detail needed | Use |
|---|---|---|
| Enquiry contact | The monitored public sales/enquiry email address and confirmation of who handles requests. | Email-draft action and public contact link. No password or mailbox credentials needed. |
| Booking, optional | The approved full HTTPS booking URL, if appointments should be offered. | Optional booking action. An email-only process is supported. |
| Company identity | The exact approved public company/legal name, including the correct spelling and suffix. | Company identity in the public footer/contact area. |
| Privacy policy | The approved HTTPS privacy-policy URL. Supply EN and FR links if they are separate, or a shared bilingual policy page. | Public privacy link; the policy should match the actual enquiry process. |
| Terms | The approved HTTPS terms/service-terms URL, with the same EN/FR distinction. | Public terms link. |
| Website origin | The final canonical HTTPS website address, including whether it uses `www`. | Canonical URLs, EN/FR alternate links and final-host metadata checks. |

Current configuration has one privacy URL and one terms URL, so a shared bilingual page works directly. If separate language-specific URLs are provided, locale-specific configuration should be added before launch. Do not silently link French visitors to an unrelated policy or invent a translation.

If policies have not been prepared, it is enough to mark them pending during development. Creating them later will require approved content and the relevant company/data-handling facts; this task does not substitute generated legal text for approval. Country/provider/package availability and commercial promises also need an accountable product/commercial owner before a public campaign.

## Configuration distinction

The local strict release-settings report is intentionally separate from the build/browser checks. This development environment is missing production signing/encryption keys, uses a non-production public origin, and leaves some live delivery channels disabled. Those settings were **not** changed. Production-host secrets must be configured and checked securely by the deployment owner when a release is scheduled; they should not be pasted into this chat. See `local-release-config.json` for setting names only—no secret values are recorded.

## Scope of the code correction

The browser fixtures in `docs/command-center/phase-4-2026-10-24/browser-entry.tsx` and `docs/command-center/phase-6-integration-2026-10-24/browser-entry.tsx` now have local types for their test controls, a discriminated state pairing each dashboard with its own data, and a checked mounting element. Their commit/revoke behavior is preserved, including all four phase-6 follow-up flags. Application type checking and release safeguards remain enabled. Existing unrelated working-tree changes are preserved.

The isolated regression harness in this evidence folder also mocks current follow-up and branch-close server-action imports. It does not disable the `server-only` boundary or call the database. These are test-harness adaptations, not application changes.

The generated Prisma client was stale relative to the already-present advisory/practice revision models in the source schema. Generation refreshed its JavaScript and types but Windows prevented replacement of an engine DLL held by another development server. The existing DLL was verified byte-for-byte against the installed Prisma 6.19.3 engine. The generated embedded schema was verified against the source, then its companion schema file was completed from that embedded schema. The normal client check subsequently passed and reused the matching client. See `client-recovery.json` and `complete-client-schema-copy.cjs` for the exact bounded recovery. No schema source change, migration, database connection or application data mutation was performed for this correction.

`scripts/ensure-prisma-client.js` now compares relation punctuation independently of formatting whitespace. This prevents Prisma's formatter from causing unnecessary client regeneration while preserving actual referential-action, field-order, string and engine-version checks. Two regression cases were added in `scripts/__tests__/ensure-prisma-client.test.js`.

## Verification ledger

Source revision at the start of this work: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, with extensive pre-existing uncommitted development changes. Results apply to the local working tree, not a committed release or an independently deployed environment.

| Evidence class | Result |
|---|---|
| Source/configuration inspection | Build wrapper, command definitions, client guard, generated-client provenance, shared logo artwork and public contact configuration inspected. |
| Workflow contract | `npm run agent:workflow:check` passed; unclassified scripts still require individual review. |
| Focused lint | The two fixture entries, client helper and helper test file passed the existing ESLint rules. See `changed-files-lint.log`. |
| Full project type check | Passed, exit 0, using the existing project configuration and an isolated incremental cache. See `typecheck.log` (empty means no diagnostics). No exclusions or error-skipping settings were added. |
| Optimized application build | Passed, exit 0, via `NEXT_DIST_DIR=.next-landing-release-20261025 node scripts/build-app-safe.js --skip-clean --timeout-ms 1800000`, with an 8 GB Node heap. Compilation, built-in lint/types, static-page generation and standalone packaging completed. Final build ID: `qA-ptcppB_HatiLf4Jhzs`. The earlier passing build before the loading fix was `htDCLQaxEahgXU83nYwSn`. Existing unrelated lint warnings remain. See `production-build.log`. |
| Mocked unit tests | Prisma client helper: 19 passed. See `prisma-reuse-tests.log`. These exercise temporary fixtures and mocked process execution. |
| Rendered synthetic fixture checks | Phase 4 and phase 6: 8 cases each, EN/FR across four dashboards, desktop/mobile controls; no page errors or business-action calls. See `fixture-controls.json` and `fixture-phase6-controls.json`. |
| Broader historical fixture runner | Failed its existing daily-digest “Source” link assertion. This is not claimed as passing; the focused control regression above checks the behavior changed here. See `fixture-regression.log`. |
| Real database tests | Not run. This public-page/build task did not authorize schema promotion or business-data tests. |

Earlier diagnostics are retained: `production-build-timeout.log`, `production-build-type-error.log`, and `typecheck-remaining-errors.log`. They describe attempts before the final corrections, not the final verification result.

The build's temporary addition of `.next-landing-release-20261025/types/**/*.ts` to `tsconfig.json` was removed after completion; all pre-existing configuration was retained. The normal `npm run build` includes production-secret enforcement. This task deliberately verified the application build separately from that production release gate; it does not claim that development settings satisfy the deployment gate.

## Optimized local browser verification

The completed standalone build was served at `http://127.0.0.1:4331` only. No deployment, login, real enquiry, email send or business mutation was performed. The full interaction matrix below was run on build `htDCLQaxEahgXU83nYwSn`; its interactive component code is unchanged by the subsequent loading-placeholder correction. Final-build checks are stored in `after-loading-fix/`.

- **220 selection states passed:** 23 workflows, 6 sale/story states, 5 HR/payroll panels, 18 module presentations and 3 setup steps, each in EN/FR at 1440 and 390 pixels. All five component groups had a measured height range of **0 px** when switching selections. The 15 guided workflows advanced correctly in each combination. See `browser-evidence.json`.
- **Responsive layout passed:** landing pages at 1440, 768, 390 and 320 pixels in both languages; no horizontal overflow or overlap between the hero actions and disclosure. Desktop paused hero height returned to 1000 px in a 1000 px viewport. See `final-evidence.json`.
- **Accessibility automation passed:** 8 axe scans covering EN/FR, desktop/mobile and dark/light themes; zero detected WCAG A/AA violations. Automated scans are not a complete accessibility certification. Firm-preview dialogs closed on Escape and restored focus in all four combinations.
- **Related pages passed:** pricing and workflows in EN/FR at 1440, 390 and 320 pixels, 12 cases total. Fourteen linked public-route requests returned HTTP 200. The first related-page run hit a 30-second cold-start timeout; it passed on the same build with a 90-second allowance. See `related-pages.json` and the retained timeout log.
- **Contact handoff passed:** four local brief downloads with fictional organization names; selected interest and locale carried through. No delivery or receipt is claimed.
- **Preview and branding review:** inspected desktop/mobile heroes, the workflow, catalog, cost/FAQ, people and contact layouts, and the accounting-firm laptop preview. The inspected PC/laptop overlays and header/footer use the current logo. The initial animation-disabled workflow capture fast-forwarded the native animation into an empty frame; natural-playback and reduced-motion checks both show its content in all four locale/width combinations. Use the `*-workflow-natural.png` and `*-workflow-reduced.png` images for that visual evidence, not the fast-forwarded capture. See `preview-visual-check.json`.

These are responsive Chrome checks on this workstation. Physical iOS/Android browsers, native mobile selectors, real screen-reader use, approved mail-client delivery, and deployed HTTPS/canonical-origin behavior remain separate future-release checks.

## First-load finding and correction

The first optimized-build measurements exposed a real startup movement: the shared public `loading.tsx` rendered only a 40 px spinner, putting the footer at y=40 until streamed page content arrived. The layout-shift observer identified the footer as the moving element at both widths; see `layout-shift-diagnostic.json`. Before correction, accumulated non-input layout-shift values were 0.389 on desktop and 0.630/0.642 on mobile (EN/FR).

`app/[locale]/(home)/loading.tsx` now reserves a viewport-height loading region, centers the existing spinner, and supplies an EN/FR status announcement. It does not alter modules, workflows, prices or business actions. The final build and measurements after this correction are recorded separately below.

The pre-correction `production-extra.json` also verifies four EN/FR desktop/mobile cases with no failed assets or page errors, zero overflow at reflow/zoom checks, no clipped essential contact text at 200% text size, and visible focus outlines on eight sequential form controls. Page language, title, Open Graph/Twitter titles and the current brand icon are correct. Canonical/alternate links remain absent because no approved HTTPS public origin is configured in this development environment.

### Final build results after the loading correction

Build `qA-ptcppB_HatiLf4Jhzs` passed the complete optimized application build, including lint/type checking and standalone packaging. `loading-lint.log` also records a clean focused lint result. The five changed source files are identified in `changed-source-hashes.json`.

All four final EN/FR desktop/mobile checks in `after-loading-fix/production-extra.json` passed: **zero observed startup layout shift**, no page errors or failed assets, no horizontal overflow at 720 px reflow, no overflow with desktop 200% CSS-zoom simulation, and no overflow or clipped essential contact text with 200% text enlargement. All eight sequential contact controls retained visible focus outlines. This verifies the loading-region correction on the built output; it is not a native browser-zoom or screen-reader certification.

The final-build pricing/workflows rerun also passed all 12 EN/FR cases at 1440, 390 and 320 px: correct page language and heading, HTTP 200, no horizontal overflow and no JavaScript errors. See `after-loading-fix/related-pages.json`. The temporary localhost preview was stopped after verification; the user's other development servers were left running.

| Local cold-browser sample | LCP before loading correction | LCP after | Layout shift before → after |
|---|---:|---:|---:|
| English, 1440 px | 4.17 s | 78.12 s* | 0.389 → 0 |
| French, 1440 px | 4.15 s | 5.39 s | 0.389 → 0 |
| English, 390 px | 11.13 s | 11.30 s | 0.630 → 0 |
| French, 390 px | 10.85 s | 13.96 s | 0.642 → 0 |

*The first request after restarting the final standalone server had a 29.74 s response-start delay, unlike later samples (0.42–0.58 s). It is retained rather than discarded. These are single workstation samples with fresh browser caches, not comparable controlled experiments or field Core Web Vitals. Mobile samples used 4× CPU throttling, 150 ms network latency and 200,000 bytes/s download throughput. The layout-shift number is the sum of observed shifts without recent input; each pre-fix sample had one shift and the final samples had none.*

**Remaining development priority:** investigate first-request server latency and mobile loading cost on an isolated staging environment, repeat multiple samples, and optimize the initial payload/render path without dropping the 23 workflows or 18 module presentations. The loading fix addresses stability; it does not claim a loading-speed improvement. No launch performance approval is given.

## Scope and rollback

Five source files were changed for this task: the two dashboard fixture entries, the Prisma reuse helper and its regression tests, and the public loading component. Reverting should be limited to those task-owned changes; fixture originals are retained as `browser-entry.before.txt` and `phase6-browser-entry.before.txt`. Do not reset the repository or revert unrelated uncommitted work. Generated client/build files are local outputs; no migration needs reversing. The production configuration gate and the broader dashboard fixture assertion described above remain separate from the passing landing-page checks.

## Subsequent linked-page review

The later visitor-journey review is recorded in [the linked public-page report](../linked-public-pages-2026-10-25/REVIEW.md). It covers 22 public routes in EN/FR desktop/mobile, improves product/offer/setup presentation and account-entry consistency, and adds explicit policy publication-status pages. Its application build is `T_bXzizHINIQ9j5YvR5EF`; the final one-class registration wrap adjustment was verified separately in the browser. Use that report for current page scope, test evidence and the continuing cold-load/launch limitations. The earlier five-file scope above describes only this handoff's original build-fix task.
