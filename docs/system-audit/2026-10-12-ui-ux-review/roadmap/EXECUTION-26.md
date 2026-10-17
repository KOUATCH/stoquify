# Delivery 26 — local recovery, queue navigation and appearance scope

Date: 17 October 2026. Scope: recover local development, verify non-submitting Super Admin journal navigation and correct the misleading light-theme affordance. Existing unrelated edits preserved. No stored permissions, migration, seed, journal submission or posting performed.

## Runtime recovery

The prior Windows Prisma engine rename failure was no longer actively held by a discovered project Node process at inspection. The current, already-modified `ensure-prisma-client.js` reported the generated client current and reused it without replacing the engine DLL. This turn did not modify that helper or claim ownership of its existing normalization changes. No process was killed and no Prisma generation was required.

`npm run dev` started the server on port 3000 with isolated output `.next-dev-session-5DPDgl`. An earlier `npm run dev -- --port 3000` attempt lost the flag in npm argument forwarding and failed with a directory error; it did not start a server. The successful server remains running. Cold compilation took 263.7 seconds for the journal form and 109.7 seconds for the queue. This explains substantial waiting, but is not a permanent browser-debugger repair or a complete performance diagnosis.

## Changes owned by this delivery

- Removed the dashboard top-bar theme toggle and replaced the dashboard account-menu checkbox with EN/FR fixed-dark appearance guidance. Other consumers of the account menu retain the existing preference checkbox.
- Added the dark class and native `color-scheme: dark` to the authenticated dashboard wrapper. Saved global preferences remain untouched by mounting the dashboard.
- Appearance settings now state that the theme preference applies outside the dashboard and separately display the dashboard's fixed dark appearance. Updated metadata description.
- Added an EN/FR journal-route loading boundary with a polite status announcement, reduced-motion support and decorative skeletons. The existing locale-aware queue link, destinations, server guards and financial actions are unchanged. This supplies transition feedback for slow reads rather than replacing correct navigation code.

The design master and UI constitution require the authenticated dark workspace. This is an affordance and consistency correction, not implementation or acceptance of a new light dashboard palette.

## Verification evidence

### Source and command review

Reviewed ECC workflow/routing, command registry, startup/preparation helpers, design master/constitution, current components and journal navigation. Existing graph node `dashboard_navbar_tsx` (community 77) was supplementary; current source determined behavior. Applied project UI/UX Pro Max skill; theme search returned no matching guidance, and unrelated feedback search results were rejected. No design generation or installation.

`npm run agent:workflow:check` passed. Scope-limited `git diff --check` and ESLint of all six changed production files passed (exit 0). No production build, full TypeScript pass or schema promotion was run.

### Mocked component tests

Seven tests pass under `jest.delivery26.config.cjs`: fixed appearance notice in EN/FR without changing saved light preference; non-dashboard theme toggle still functional; EN/FR appearance preferences and scope; EN/FR journal loading announcement without a nested main landmark. Initial test-runner ESM failures were corrected with the installed Lucide CommonJS mapping and a routing-definition mock. These are component tests, not database or permission-boundary certification.

### Rendered browser checks

Built-in browser, existing Super Admin session, Wilkinson - Feeney 001. Recovered a working tab; old connection-error tab left untouched. No form values entered and no submit control activated.

| Route / state | Result |
|---|---|
| EN journal form → queue, Enter | Destination `/en/dashboard/accounting/journals` and heading `Journal entries` observed after delayed transition. |
| FR journal form → queue, Enter | Destination `/fr/dashboard/accounting/journals` and heading `Écritures comptables` observed. Screenshot saved. |
| EN/FR account menu | Localized fixed-dark guidance visible; no misleading theme checkbox. |
| FR appearance settings, saved light | `Clair` selected, root HTML class `light`, dashboard main computed color-scheme `dark`. Settings explicitly distinguish preference and workspace appearance. |
| FR journal form, saved light | Full form visible; journal selector remains empty; computed background `rgb(31,49,57)`, text `rgb(247,250,248)`, native color-scheme `dark`. Actual CSS viewport 436×414, document client/scroll widths 424/424. |
| Restoration | Original `Sombre` preference restored and HTML class `dark` confirmed. No viewport override applied during this delivery; normal panel measured 436×414. Working tab retained. |

The new loading component passes mocked tests; its transient live announcement was not captured. Pointer activation was interrupted by browser focus/snapshot timeouts, so pointer acceptance remains less certain than the observed EN/FR keyboard destinations. Earlier Delivery 25 responsive/arrow checks remain historical evidence; this delivery does not recertify the full matrix.

### Real database observation and unresolved issue

Form lookup reads succeeded (five manual journals, four eligible accounts). Both queue locales rendered their honest unavailable-count state. Server logs identify Prisma `P2022` on the protected `accounting.journal.read` / `JournalEntry` read (`DATABASE_UNAVAILABLE`, 503). Navigation itself returns a page; healthy populated queue acceptance is blocked by this database/schema mismatch. No exact missing column was established. No guard was weakened and no migration was run to hide or bypass the failure.

Next database step: inspect the configured database's schema and migration state read-only, identify the exact missing column, then prepare a reviewed schema-reconciliation plan. Applying any migration remains outside this UI delivery's boundaries. Owner/Cashier, assistive technology and broader responsive acceptance remain open.

## Screenshots

- [English fixed appearance notice](evidence/delivery26-en-fixed-appearance.png)
- [French queue reached by keyboard](evidence/delivery26-fr-queue-keyboard.png)
- [French appearance settings, original dark preference restored](evidence/delivery26-fr-appearance-restored.png)
