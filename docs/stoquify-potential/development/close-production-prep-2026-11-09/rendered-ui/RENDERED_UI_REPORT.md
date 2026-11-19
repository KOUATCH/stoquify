# Close assurance rendered fixture

The final attempt, [`attempt-f0c36448e7/RESULT.json`](attempt-f0c36448e7/RESULT.json), passed on 2026-11-09. It rendered the real close assurance component, hooks, query provider, child components and existing Tailwind/theme tokens in installed headless Edge. Authentication, permissions and server actions were explicitly mocked. This is rendered UI evidence, not an authenticated application, database, hosted build or end-to-end qualification.

[`SOURCE_BINDING.json`](attempt-f0c36448e7/SOURCE_BINDING.json) binds the current imported source, fixture code and generated bundle/CSS. The runner checked those source hashes again after all scenarios completed. [`RUNNER_REVIEW.json`](attempt-f0c36448e7/RUNNER_REVIEW.json) records the reviewed side effects and isolated environment. No Next configuration, dotenv, application server, database or provider was started.

The four combinations were English and French at viewport widths 390 and 1440. Each recorded these eight cases:

1. Permission loading hides the private workspace.
2. Ready permissions without close-read access hide the private workspace.
3. Keyboard recovery focuses the password input and requires manual retry after fresh authentication.
4. The downloaded retained bytes match their SHA-256 and are labelled historical without a current certification claim.
5. Pending exports disable their command button.
6. Actor changes discard a late export response and clear private state.
7. The actual period selector discards an export response from the previous period.
8. Loss of current authority hides private state and discards a late export response.

All four original-file downloads have SHA-256 `f500b0192fdab24d7c889915e4cbcd0e7c3b4d53163eff889825de539b12d20e`. All observed requests used the owned loopback origin; the browser route rejected external requests. There were no page or console errors, and document width matched each viewport. The owned browser and static server both closed.

Automated axe checks reported zero violations in these states and an incomplete color-contrast assessment. This does not establish full accessibility or screen-reader support. Screenshots have no prior visual regression baseline. English mobile and French desktop screenshots were visually inspected.

- [English mobile](attempt-f0c36448e7/en-historical-390.png)
- [English desktop](attempt-f0c36448e7/en-historical-1440.png)
- [French mobile](attempt-f0c36448e7/fr-historical-390.png)
- [French desktop](attempt-f0c36448e7/fr-historical-1440.png)

Earlier attempt receipts remain intact. They capture fixture alias/import setup errors, sandboxed Edge startup failures, and axe following a relative CSS import under the deliberately strict `connect-src 'none'` policy. The final fixture inlines the exact hash-bound local CSS import while retaining that policy. Installed Edge required the reviewed runner to execute outside the process sandbox; no user browser profile was opened.

The reviewed runner is `node docs/stoquify-potential/development/close-production-prep-2026-11-09/rendered-ui/run-rendered.cjs`. It accepts no target or authority overrides and writes each new attempt to its own directory. Review its current definition before another execution.
