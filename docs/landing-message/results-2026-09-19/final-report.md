# Landing message — implementation and verification

19 September 2026 · Local workspace verification · No deployment or database migration performed

## Outcome and release status

The landing, standard login and standard registration pages have been simplified in English and French. The implementation is in place, but **unqualified completion/release approval is withheld**: registration's existing Terms and Privacy destinations return HTTP 404, and live account/email verification requires separate evidence. Approved policy URLs or text have been requested; no legal policy was invented and no consent rule was removed.

The code gates pass. Core public-page layouts and form interactions are verified locally; successful live login/sign-out and real email onboarding are not certified because the configured database lacks the existing synthetic test account. The outstanding policy links and account fixture are explicit completion blockers, not roadmap items presented as working features.

## Message and implementation

The primary audience is owners and managers of retail and distribution businesses in OHADA markets. The central problem is fragmented sales, stock, purchasing and payment records. The three benefits are reviewing daily issues, following movements back to their source, and preparing accounting review.

Successful registration creates organization details and an administrator account awaiting email verification. Users then verify, sign in and configure the enabled workflows, locations, items, team access and initial records. It does not promise automatic activation of every module or connection to a bank, provider or tax authority.

| Surface | Targeted change |
| --- | --- |
| Landing | Twelve composed sections reduced to six main sections; one primary registration action; three practical benefits; one concrete sale-to-accounting explanation. |
| Navigation | Four direct section links; retained mobile menu, scrollspy, localized destinations and old section bookmark targets. |
| Proof | Hero records explicitly labeled illustrative; existing product image kept unchanged and uncropped, with its July date and historical/non-live status visible in both languages. |
| Getting started | Immediate account creation separated from later configuration; existing adoption/package details retained in an expandable section. |
| Login | Existing form centered; promotional catalogue removed; heading shortened; field errors associated with inputs; recovery, password visibility and theme controls retained. |
| Registration | Existing three-step form retained; shorter introduction; stacked mobile step labels; email verification and setup next steps below the form. |
| Locale switching | Standard auth-page language links now preserve return, referral and invitation query parameters. |

The public-first-impression skill guided the form-first layout, scoped product proof and conditional claims. The report-publishing skill produces matching Markdown/PDF files in this dated folder.

## Authentication and business-rule preservation

[Exact source comparison](../verification-2026-09-19/auth-behavior-preservation.json) against the pre-implementation working tree confirms unchanged blocks for:

- Login submission, error handling and redirect execution.
- Login return-URL policy.
- Registration step validation, navigation and submission.
- Referral/invitation inputs and registration defaults.

No identity service, schema, tenant authorization, module entitlement, financial posting or payment rule was changed by this implementation. Existing unrelated user edits were preserved. The comparison baseline is the initial working tree, not Git HEAD.

## Verification results

| Check | Result | Evidence |
| --- | --- | --- |
| Identity, daily-action, stock-event and sales-posting tests | PASS — 107 tests / 4 suites | [JSON](../capability-tests-2026-09-19.json) |
| Purchasing and reconciliation service tests | PASS — 42 tests / 2 suites | [JSON](../verification-2026-09-19/purchasing-reconciliation-tests.json) |
| Public content, navigation, color contract and auth regression tests | PASS — 64 tests / 11 suites | [JSON](../verification-2026-09-19/unit-tests.json) · [command/result](../verification-2026-09-19/unit-result.json) |
| Full repository lint scope | PASS — no errors, 7 warnings outside the edited pages | [log](../verification-2026-09-19/lint.log) · [command/result](../verification-2026-09-19/lint-result.json) |
| Final responsive auth refinements | PASS — focused lint, no diagnostics; regression suite rerun | [command/result](../verification-2026-09-19/authLint-result.json) |
| TypeScript | PASS — exit 0, no diagnostics | [command/result](../verification-2026-09-19/typecheck-result.json) |
| EN/FR, desktop/mobile browser matrix | 35 PASS; 4 FAIL, all existing Terms/Privacy destinations. Twelve route/viewport captures pass, with no page errors or horizontal overflow. | [JSON](../verification-2026-09-19/browser-results.json) |
| Live authentication boundary | PASS — anonymous session absent (200), anonymous permissions denied (401). Successful sign-in BLOCKED: synthetic fixture rejected with 401 `INVALID_EMAIL_OR_PASSWORD`; server reports user not found. | [JSON](../verification-2026-09-19/live-auth-results.json) |
| Existing registration policy links | FAIL — Terms and Privacy return 404 in both English and French | Browser destination checks; approved content/URLs needed |

The 213 isolated tests use mocks where defined by their suites. They are not a production or real-provider certification. Browser checks explicitly distinguish real rendering/navigation/validation from mocked pending and failed sign-in responses. No new organization, purchase, sale or payment was created. No real verification or password-reset email was requested.

An initial regression run found a missing `Rocket` import on registration's final step; it was restored and the complete focused suite passed afterward. A French spelling test incorrectly rejected the valid present-tense verb “enregistre”; that false positive was corrected. The loaded local machine exceeded one default five-second test limit, so the final run uses a 30-second per-test limit. No business assertion was removed.

Visual inspection at 320 pixels also caught step-label overlap despite a passing overall page-width check. Labels were stacked at narrow widths and the auth logo constrained to its container. The final screenshot matrix and regression tests were rerun after these refinements.

An earlier CSS `zoom` diagnostic caused overflow because content scaling does not reproduce responsive viewport breakpoints. Its [raw results](../verification-2026-09-19/browser-original-css-zoom-results.json) are retained. The final check uses 320- and 720-pixel layout viewports instead; 720 is the layout-width equivalent of halving a 1440-pixel desktop viewport. This is not a native browser/OS zoom or screen-reader certification. Initial recovery/guide navigation delays were also rechecked after local compilation.

## Before/after evidence

Before: the saved **15 September 2026** run on localhost:3000, six routes with HTTP 200 and twelve full-page captures. These are the pre-implementation captures from the earlier attempt, not newly backdated screenshots. After: **19 September 2026**, the changed local workspace on 127.0.0.1:3010. Both use desktop 1440 × 1100 and mobile 390 × 844 viewports.

English measurements from the captures (CSS pixels; adoption details collapsed after the change):

| Page | Desktop before → after | Mobile before → after |
| --- | --- | --- |
| Landing | 11,994 → 3,701 | 24,731 → 5,873 |
| Login | 1,257 → 1,100 | 2,467 → 844 |
| Registration, first step | 1,447 → 1,100 | 2,817 → 1,295 |

After-page height includes the viewport's minimum height; these measurements describe layout, not user productivity or page-load performance. The English mobile login submit button ends at y=485, within the initial 844-pixel viewport.

The French after captures measure 3,850/6,171 pixels for landing (desktop/mobile), 1,100/844 for login, and 1,100/1,319 for registration. The after matrix explicitly uses light mode for auth; separate dark-mode validation captures are included. Before captures retain their original environment and theme settings.

| Page / viewport | English before | English after | French before | French after |
| --- | --- | --- | --- | --- |
| Landing / desktop | [PNG](../screenshots/before/public-home-desktop.png) | [PNG](../screenshots/after-2026-09-19/public-home-desktop.png) | [PNG](../screenshots/before/public-home-fr-desktop.png) | [PNG](../screenshots/after-2026-09-19/public-home-fr-desktop.png) |
| Landing / mobile | [PNG](../screenshots/before/public-home-mobile.png) | [PNG](../screenshots/after-2026-09-19/public-home-mobile.png) | [PNG](../screenshots/before/public-home-fr-mobile.png) | [PNG](../screenshots/after-2026-09-19/public-home-fr-mobile.png) |
| Login / desktop | [PNG](../screenshots/before/login-desktop.png) | [PNG](../screenshots/after-2026-09-19/login-desktop.png) | [PNG](../screenshots/before/login-fr-desktop.png) | [PNG](../screenshots/after-2026-09-19/login-fr-desktop.png) |
| Login / mobile | [PNG](../screenshots/before/login-mobile.png) | [PNG](../screenshots/after-2026-09-19/login-mobile.png) | [PNG](../screenshots/before/login-fr-mobile.png) | [PNG](../screenshots/after-2026-09-19/login-fr-mobile.png) |
| Registration / desktop | [PNG](../screenshots/before/register-desktop.png) | [PNG](../screenshots/after-2026-09-19/register-desktop.png) | [PNG](../screenshots/before/register-fr-desktop.png) | [PNG](../screenshots/after-2026-09-19/register-fr-desktop.png) |
| Registration / mobile | [PNG](../screenshots/before/register-mobile.png) | [PNG](../screenshots/after-2026-09-19/register-mobile.png) | [PNG](../screenshots/before/register-fr-mobile.png) | [PNG](../screenshots/after-2026-09-19/register-fr-mobile.png) |

Viewport-only and dark-mode validation captures are also saved beside the after images. See [claims assessment](claims-assessment.md) for the evidence and qualifications behind each major promise.

The machine-readable [evidence summary](../verification-2026-09-19/evidence-summary.json) indexes results, before/after PNG dimensions and hashes, and the final edited-source hashes. The claims PDF was checked as a three-page A4 document and visually inspected; the final report PDF is validated separately by the publisher.

## Remaining boundaries

1. Supply approved Terms and Privacy pages/URLs. The existing links are broken; inventing legal text or removing required consent would exceed this messaging change.
2. Provide an approved existing local E2E account and test mailbox. The default repository fixture is absent from the configured database. Successful live login, authenticated permission context, sign-out and complete new-account email onboarding remain unverified. Component/service tests cover success and recovery boundaries; no account was seeded or password changed.
3. Existing login behavior sends `rememberMe: true` regardless of the checkbox. It was not introduced or changed here; session-duration behavior needs a separate authorized auth change if that preference should be honored.
4. No production deployment, migrations, provider transactions or statutory submissions were performed. The normal `npm run build` includes migration steps, so it was not used for this UI task.
5. Local cold-compilation and concurrent workspace configuration changes caused long development waits. These observations are not a production performance benchmark.

## Reproduce

Run the existing local Next server with `NEXT_DIST_DIR=.next-landing-message`, `NEXTAUTH_URL=http://127.0.0.1:3010` and `NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3010`, on port 3010. These are process-local verification settings, not production policy changes.

```powershell
$env:NEXT_DIST_DIR='.next-landing-message'
$env:NEXTAUTH_URL='http://127.0.0.1:3010'
$env:NEXT_PUBLIC_BASE_URL='http://127.0.0.1:3010'
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 -p 3010
```

In another terminal:

```powershell
node scripts/landing-message-verification.js unit lint typecheck
node scripts/landing-message-browser-smoke.js
node scripts/landing-message-live-auth-check.js
node .agents/skills/docs-report-publisher/scripts/publish_reports.mjs landing-message/results-2026-09-19
```

The live-auth probe uses only the repository's existing synthetic fixture (or explicitly configured E2E credentials), never seeds data, and records no passwords or session tokens. It attempts sign-out if sign-in succeeds. Policy-destination failures intentionally keep the browser gate red until the missing pages are supplied.
