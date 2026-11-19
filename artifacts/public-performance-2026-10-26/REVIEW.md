# Public-page loading and navigation follow-up

Development-only work, following the linked-page review. No deployment, schema promotion, real account creation, enquiries or upload submissions.

## Inspected load path and scope

- The public home layout imported `lib/auth-server.ts`, which statically imports authentication and RBAC. Even a visitor with no session cookie paid that module-initialization cost.
- The root layout reads upload metadata from `app/api/uploadthing/core.ts`. That module imported both server authorization and shared error classes; the latter import Prisma through canonical error handling. These imports were needed for upload execution, not metadata rendering.
- Public pages also receive the full locale message bundle (391,134 bytes EN / 447,421 bytes FR on disk before compression). Reducing its scope would affect shared locale layouts and is not included in this narrow fix.

The public session helper now checks only for the existing normal/secure session-token cookies before importing the existing validator. Cookie presence never grants access. The installed Better Auth `api/routes/session.mjs` likewise requires the signed session token before reading cached session data. Upload session, organization, module, permission and managed-upload refusal behavior remain in place; only import timing changed.

## Verification ledger

- Workflow contract: passed; 196 commands remain unclassified. Actual verification runners were inspected separately.
- Baseline: previous application build `T_bXzizHINIQ9j5YvR5EF`, local port 4332. Two English desktop navigations and one English mobile navigation exceeded 120 seconds; a separate setup-page request connected in approximately 2 ms but received no first byte within 10 seconds. The baseline browser run was stopped after repeated timeouts. These are failed availability samples, not usable LCP measurements. Workstation contention prevents a controlled speed claim.
- Mocked boundary tests: **10 passed across three suites** (`boundary-tests-focused.log`). They verify deferred metadata imports, anonymous cookie-free behavior, validation of normal/secure cookies, and the existing upload denial/allow decisions. The initial overly broad test discovery run was stopped and the runner restricted to the two test directories. No real database/session/upload integration certification is claimed.
- Application build: **passed**, exit 0, valid isolated output `.next-public-performance-20261026`, build ID `e9IxSs9RnIp3arbOh5P9e`. Compilation, type checking and all 11 generated pages completed. Existing lint warnings and the next-intl cache-analysis warning remain in `build.log`. No schema promotion ran. The generated temporary-output include was removed from tsconfig after completion.
- First anonymous HTTP response from the new standalone preview: **200**, first byte **6.388 seconds**, complete response **6.516 seconds**, 1,231,292 bytes. This is a single local cold-server observation, not a comparative speed certification.
- Post-change rendered public checks: **24/24 passed**: `/en` and `/fr` home, products, pricing, workflows, contact and get-started at 1440 and 390 pixels. All returned 200, retained the selected document language, had zero horizontal overflow and zero axe WCAG 2 A/AA + 2.1 AA violations. Landing retained all **23 workflow options and 18 catalogue panels**. No browser errors were recorded. Full-page screenshots and details are in `browser/`.
- Rapid recovery: **24/24 passed**, deliberately following missing product/offer recovery links as soon as visible, without network-idle waits. The additional protected-destination → sign-in redirect → immediate missing-page interruption sequence passed **8/8** in EN/FR at both widths (`interrupted-auth-navigation.json`). The earlier React 419 was not reproduced in these cases; this is bounded regression evidence, not proof of every possible streaming interruption.
- Registration steps: **8/8 company/security screen states passed** across EN/FR and 1440/390 pixels, plus four 320-pixel reflow spot checks. All eight axe scans had zero detected violations; no horizontal overflow, page errors or mutation requests occurred. Back navigation retained the fictional company name, and terms/privacy links retained the locale. Final submission was never activated. Results/screenshots are in `registration/`; the French 320-pixel security screenshot confirms the built action buttons wrap within the card.
- Real database, live session validation, upload execution, account creation, email delivery and deployment: **not run**. Mocked authorization tests do not certify these integrations.

## Loading observations and remaining priority

Eight fresh-cache browser samples completed with HTTP 200, no page errors, no horizontal overflow and recorded CLS 0. Mobile samples used desktop Chrome at 390 pixels, 4x CPU throttling, 150 ms latency and 200,000 bytes/s download; these are synthetic responsive checks, not physical devices or field metrics. `after.json` retains every sample, including the slow outlier.

| Locale / width | LCP samples | First-byte samples |
| --- | --- | --- |
| EN / 1440 | 57.288 s, 5.052 s | 9.847 s, 0.637 s |
| FR / 1440 | 3.732 s, 5.444 s | 0.462 s, 0.404 s |
| EN / 390 throttled | 8.524 s, 10.912 s | 0.253 s, 0.524 s |
| FR / 390 throttled | 9.388 s, 11.680 s | 0.369 s, 0.428 s |

**First-load performance remains open.** The prior baseline failed to produce usable comparable samples, and this workstation is contended. No percentage speedup is claimed. This change removes demonstrably unnecessary server initialization, but does not establish production performance readiness.

Next targeted work should profile and reduce the public response/rendering cost while preserving all modules: decoded HTML is 1,231,292 bytes EN / 1,294,215 bytes FR, with roughly 8,300 DOM nodes. Audit which translation namespaces must reach public client components, and which hidden previews can render on demand without changing panel dimensions, keyboard semantics or initial content. The largest recorded resources include the bakery image (~229 kB) and localized dashboard image (~190 kB); assess critical-image delivery using the existing logo assets. Repeat the same measurement protocol on a quiet workstation and an authorized hosting preview before setting release performance claims. Do not weaken CSP, suppress hydration errors or remove workflows to improve scores.

## Reproduction and provenance

Current application and test hashes in `source-hashes.json` were rechecked against disk after the build and all matched, including the earlier registration wrapping fix. The new build, rather than a browser-injected CSS patch, is used for this follow-up. The scoped source changes are only the anonymous public session helper/home layout and deferred upload authorization/error imports; prior public-page changes remain intact.

Visual spot review covered the English mobile contact page, French desktop setup guide, French mobile pricing overview and French 320-pixel registration security step. These show the current logo and retained page structure; the tall pricing capture supports an overall layout check rather than a full text-legibility certification. The earlier 22-route visual/content review remains the wider coverage record; this pass adds six core-route regressions and registration states, not a new claim of retesting every linked route.

Reviewed commands: the focused `jest.config.cjs` runner (10 mocked tests); `node scripts/build-app-safe.js --skip-clean --timeout-ms 3600000` with the isolated `NEXT_DIST_DIR` and 8192 MB heap; `prepare-preview.cjs`; `measure.cjs after`; `browser-check.cjs`; `interrupted-auth-navigation.cjs`; and the submission-blocking `registration-steps.cjs`. Browser scripts target only localhost:4332. Source inspection, mocked tests, build checks and browser checks are separate evidence classes.

Rollback only the owned import-timing changes and new helper/tests, preserving previous home-layout contact wiring and unrelated working-tree work. Do not reset the whole working tree.

At 14:50–14:51 local time the workstation reported approximately 0.56 GiB available out of 23.9 GiB physical memory. Other tasks were left running; only this review's baseline browser/server and the overly broad test discovery process were stopped. Resource contention is a material limitation of the timings.

Post-build measurements separate the first plain HTTP response from fresh-browser rendering. This avoids confusing server initialization with asset transfer, hydration or route prefetching. No competing task-owned test runner is started during those measurements.

## Guidance and limits

Project UI/UX Pro Max search (`ux-guidelines.csv`, Performance: Lazy Loading / Code Splitting; Typography: Font Loading) supported deferring unnecessary loading without changing layout or fonts. ECC security-review was applied to preserve server-owned validation and existing denials, not to introduce a new authentication scheme.

The prior React 419 observation means React recovered from an unfinished server Suspense boundary, according to the [official decoder](https://react.dev/errors/419). The [Next.js not-found documentation](https://nextjs.org/docs/app/api-reference/functions/not-found) describes the intentional thrown not-found signal and streamed responses. Installed source is Next 15.5.27; current online docs describe newer versions, so no newer API or upgrade is adopted. The follow-up retains proper not-found behavior and records rapid-navigation errors rather than suppressing them.

Owned application files: public home layout, new `lib/public-session.ts`, upload route definition's deferred imports, and their focused tests. Earlier landing/page edits and unrelated work remain intact. All work remains local and uncommitted.
