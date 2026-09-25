# Workflow modernization verification environment

Evidence date: 2026-09-05. This document preserves the initial read-only dashboard/module baseline and links the subsequently authorized workflow checks below. This is not full workflow or release certification.

## Reusable environment

The existing owned development server remains running at `http://127.0.0.1:3107`, unified session `87013`. Its confirmed process tree is helper14224 → Next26804 → listener30240. The dedicated output is `.next-modern-modules-integration`. No process was restarted or stopped, and ports3000/43187 were not operated.

The read-only guard confirmed database `stoquify_local_modern_modules_20260905_01`, five exclusively owned organizations, and all four module integration migrations. `process-and-readiness.json` records the exact check. The inspected helper is `scripts/modern-modules-local-verification.js`; its `status` command is read-only. Credentials remain in the existing private ignored fixture file; this report and screenshots contain no passwords, session tokens or database credentials.

Both `DATABASE_URL` and `DIRECT_URL` must remain bound to the exact synthetic target when using the helper. Do not use its create/seed/migration operations for routine verification. Further business fixture work needs a specifically owned prefix and a fresh target/ownership check.

## Baseline results

| Observation | Result | Useful response | Evidence |
|---|---|---:|---|
| EN dashboard | Loaded, no browser error | 31,737ms | `en-dashboard-desktop.png` |
| EN module settings | Hydrated, no browser error | 9,333ms | `en-modules-desktop.png` |
| Initial FR dashboard/modules | Failed/incomplete: syntax error followed by global fallback; module hydration did not complete | Not a pass | Initial receipt and `fr-modules-failure.png` preserved |
| Fresh-profile FR dashboard | Loaded, no browser error | 17,056ms | `fr-dashboard-desktop-fr-retry.png`, `fr-dashboard-mobile-fr-retry.png` |
| Fresh-profile FR module settings | Hydrated, no browser error | 8,783ms | `fr-modules-desktop-fr-retry.png`, `fr-modules-mobile-fr-retry.png` |

The six final screenshots above were visually inspected. French390px screenshots have measured document width390px and show actual application content. They are viewport baselines, not proof of every lower section, keyboard path or responsive state. The mobile module page has its existing fixed review action; its preparation panel continues below the fold.

`environment-baseline.json` preserves the initial attempt. One concurrently edited source, `messages/en.json`, changed during that attempt. The original browser handler captured the syntax-error message but not its stack; an exact cause cannot be attributed. `environment-baseline-fr-retry.json` is a separate warm retry after dictionary edits were frozen; its source hashes remained stable, and it contains no browser errors. Do not relabel the initial failure as successful.

The earlier helper preflight used the wrong Prisma model name (`employee` instead of `payrollEmployee`) and stopped before launching a browser. `preflight-model-name-failed.json` preserves that driver error. No failed count was replaced with zero.

Both browser attempts used real email/password sign-in and verified the returned session identity. Browser requests were restricted to the local origin; no external origins were requested. Read-only database snapshots before/after showed unchanged business records, permissions, grants, stops and configuration. Normal sign-in/session/audit effects are outside that business snapshot. All browser contexts are closed. No business fixture mutations were performed.

The timings include development compilation/warm-up and have no approved performance budget; they are observations, not performance certification.

## Available synthetic scenarios

| Fixture | Current state | Reusable limits |
|---|---|---|
| `legacy_en_desktop` |19 active grants; active revision1/requested3; no accounting setup | Broad eligibility; lacks mutation permissions and operational setup |
| `retailer_en_desktop` | Active revision10; Inventory new work stopped; accounting READY; one location/provider | Read-only retailer; separate denied user has only `dashboard.read` |
| `retailer_fr_mobile` | Active revision7; Inventory stopped; accounting READY; three locations, one item/provider | Existing transfer-read/create permissions support stopped-transfer denial; not a positive new-transfer fixture |
| `service_en_desktop` | Active revision4; no stops; accounting READY; one provider | Existing history113 records; read-only service/history; no purchasing mutation authority |
| `service_fr_mobile` | Active revision8; Accounting manual entries stopped; accounting READY; one provider | Existing journal-create permission supports stopped-entry denial |

At the initial baseline there were six users across the five organizations, including the denied user, and no customers, suppliers, sales orders, purchase orders, journal entries, payroll employees or payment transactions. Detailed actual permissions/grants and counts are in the baseline receipts. Subsequently authorized prefixed workflow fixtures are recorded separately below. The provider/setup rows are isolated synthetic readiness evidence and authorize no real payment provider or customer activity. Existing stops must be preserved.

The common administrator role has module configuration, dashboard, inventory read, sales/customer read, POS operate, finance/cash read, accounting report/journal read, reconciliation read and report read permissions. It does not supply supplier/purchasing/customer write or HR authority. New workflow mutation proof needs explicitly scoped new roles/records; changing these five accounts would invalidate their existing scenario contracts.

## Observed workflow navigation and gaps

Visible desktop groups are Command (Dashboard, Command Center), Operations (Inventory, Sales), Finance & Trust (Accounting, Finance), and Governance (Settings). The module page expands existing Settings entries including Appearance, Data onboarding, Locations and Modules. This observation covers visible navigation; unopened accordion contents and linked routes were not exercised.

The FR sidebar, header/search and navigation labels remain English. The FR dashboard also contains missing accents, English operational/source badges, and English shortcuts including “Reorder candidates”, “Open sales orders” and “Purchase orders to finish”. The period/location controls appear blank while a nearby summary shows the current scope. These are concrete follow-up UX/localization findings.

The dashboard exposes links to payroll, compliance, close, assurance, purchases/payables and other routes beyond the visible tenant configuration. Link presence alone does not establish an authorization bypass; direct-route/API permission behavior needs a separate negative test. The dashboard explicitly labels some disconnected detailed read models unavailable; that is distinct from successful zero counts in this empty synthetic dataset.

## Subsequent authorized workflow verification

The exact controls database now has separately owned reset-token and public statement verification fixtures. `POSTGRES_VERIFICATION.md` records real concurrent consumption, rollback and statement retry results, preserving the initial metadata-constraint failure and its focused corrected rerun. No original browser account was changed.

The browser database now has one newly authorized purchase-editor actor/limited role, supplier, item and location inside the existing legacy organization. Real service creation produced two drafts; subsequent native tests saved exact amounts, cloned each once, and cancelled the originals for the recovery test. Current exact IDs and states are in `browser-partial-outcomes-ef30b99c-48b21da20a.json`. `BROWSER_VERIFICATION_PROGRESS.md` distinguishes passed purchase financial/clone checks from the still-failed delayed recovery path. Do not reset or repeat completed effects blindly.

Two prefixed unverified identities were also authorized in that same organization. `EMAIL_VERIFICATION_BROWSER.md` binds the final2/2 valid-code browser passes, corrected320/390/1440 geometry, one verification audit and zero sessions per identity, the unchanged authentication services, and the preserved initial failures. Both codes have been consumed; they must not be retried or replaced merely to obtain another screenshot. The English desktop recovery screenshot is explicitly a loading-state capture; the later mobile sign-in capture is fully rendered.

All prior failed receipts remain intact. Final purchasing recovery on the two existing real draft clones passed2/2; `PURCHASE_RECOVERY_BROWSER.md` and `purchase-recovery-cbda867c.json` document retained copyable notes through the server's cancelled status. The clones now remain cancelled; the two original cancelled orders were unchanged. Read-only organization-listing scope passed7/7 in an explicitly read-only PostgreSQL transaction; `ORGANIZATION_SCOPE_POSTGRES.md` states its service/authentication and zero-payment limits. `VERIFICATION_INDEX.json` provides the current receipt map. No production target, external delivery, purchasing approval, payment or deployment is included.
