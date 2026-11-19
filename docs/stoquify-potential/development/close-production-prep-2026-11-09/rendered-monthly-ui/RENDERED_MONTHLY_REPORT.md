# Monthly reconciliation rendered fixture

[`attempt-84f64b33a3/RESULT.json`](attempt-84f64b33a3/RESULT.json) passed on 2026-11-09. The real payment reconciliation workbench, child components, read/run hooks, query provider and English/French messages rendered in installed headless Edge. Authentication, permission snapshots and backend actions were explicitly mocked. No real account, provider statement or financial operation was connected.

[`SOURCE_READY.json`](SOURCE_READY.json) records the four source hashes supplied by the UI owner through the parent agent after its focused unit qualification. The runner checked them before compilation and after all scenarios. [`SOURCE_BINDING.json`](attempt-84f64b33a3/SOURCE_BINDING.json), SHA-256 `261e9cc0692a99c6a4ae8ee792f815541ab285e26aeb685fe6e29391d70b1521`, binds the actual imported source, fixture code and generated assets. [`RUNNER_REVIEW.json`](attempt-84f64b33a3/RUNNER_REVIEW.json) records the reviewed execution boundary.

Each locale ran at widths 390 and 1440, with eight recorded cases:

1. Daily coverage is the default; its command carries the actual current date and no accounting period.
2. Monthly execution stays disabled until an authorized stored period is selected; no arbitrary period/date input is offered.
3. Keyboard selection returns focus to the real selector, and the monthly command contains only `providerAccountId` and `accountingPeriodId`.
4. The localized import hint explains that observed transaction dates alone do not establish full-period coverage.
5. Removing the selected period from the current catalog disables execution.
6. Pending execution is disabled; a response arriving after a different period is selected produces no completion notification.
7. Changing actor restores the daily selection and fences the previous actor's late run result.
8. Revoking run authority fences a late error without automatically repeating the command.

The actual mock action payloads are retained in each result entry. For example, monthly execution submitted `{ "providerAccountId": "monthly-fixture-account", "accountingPeriodId": "monthly-fixture-june" }`, without a synthesized `businessDate`, start or end date.

All 16 observed browser requests used the owned loopback origin. External requests were rejected by the browser route, and the static server used `connect-src 'none'`. No page/console errors or horizontal document overflow occurred. The owned Edge process and static server both closed. English mobile and French desktop screenshots were visually inspected.

- [English mobile](attempt-84f64b33a3/en-monthly-390.png)
- [English desktop](attempt-84f64b33a3/en-monthly-1440.png)
- [French mobile](attempt-84f64b33a3/fr-monthly-390.png)
- [French desktop](attempt-84f64b33a3/fr-monthly-1440.png)

Automated axe checks recorded zero violations and an incomplete color-contrast assessment. There is no prior visual baseline, screen-reader evaluation or full accessibility claim. Notifications were captured mock-provider calls; the real toast transport was not exercised. Synthetic run receipts establish no reconciliation coverage or certificate validity.

The fixture uses installed Webpack with an explicit TypeScript loader, current Tailwind/theme CSS and the reviewed existing sign-review CSS module. It loads no Next configuration, dotenv, application server or database, and adds no Node polyfill. The BI/table barrels resolve to the same real consumed exports, excluding unrelated modules. Framework `next/link` is explicitly replaced with a static anchor because no Next router exists in the fixture; route prefetch/navigation integration is outside scope. The first preserved attempt, `attempt-2ad5bfed91`, compiled and closed cleanly but could not mount the unconfigured Next Link runtime. The final attempt uses this stated boundary.

The reviewed command is `node docs/stoquify-potential/development/close-production-prep-2026-11-09/rendered-monthly-ui/run-rendered.cjs`. It accepts no target/authority overrides, verifies the owner-confirmed hashes and writes a new attempt each time. Review the current script before another execution. This is rendered component evidence, not authenticated application, PostgreSQL, hosted-origin build or end-to-end qualification.
