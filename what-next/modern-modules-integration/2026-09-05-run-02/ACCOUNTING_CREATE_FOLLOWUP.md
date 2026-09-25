# Journal form verification follow-up

Evidence date: 2026-09-05. This follows `ACCOUNTING_CREATE_FAILURE.md`; that earlier receipt remains the historical result before these additional changes.

The new form's idle submit label now uses the same EN/FR namespace as its pending and failure messages. Failed chart-account or journal lookups display a localized loading failure and retry link, and do not render a create form. A successful lookup that returns no eligible account or manual journal displays a separate setup notice. Neither query failure is treated as a successful empty result.

Only the existing create page, its new client form, the focused page test, and `moduleComposition.accountingCreate` message keys changed. Permission checks, protected server actions, financial validation, fresh-auth requirements where already applicable, and domain writes remain unchanged.

The final focused page suite passed **13/13 tests in 9.31 seconds** (tool session 43379, exit 0). It covers both failed lookup sources, French failure content, successful empty setup, retained values and focus after stopped-work denial, unknown transport outcomes, safe error classification, confirmed navigation, and duplicate-submit prevention. Scoped lint for the page, client form, and test passed (session 77855, exit 0). Full application build/typecheck and actual browser checks are coordinated by the parent task.

## Prepared actual browser proof

`diagnostics/journal-stopped-submit-browser.cjs` is prepared and passed JavaScript syntax checking. **The browser proof and its fixture preparation have not been executed as part of this preparation record.** Do not infer a browser pass from this document.

After the parent releases the rebuilt server at `http://127.0.0.1:3107/`, the helper can run with the explicit argument `--execute-reviewed-local-browser`. It is restricted to the existing synthetic `service_fr_mobile` tenant and the exact database `stoquify_local_modern_modules_20260905_01`. It checks all five fixture organization identities, their owner marker, the exact user identity, and exclusive membership of the fixture's existing administrator role before any permission update.

The only direct setup mutation permitted by the helper is adding missing `accounting.accounts.read` and `accounting.journal.create` permissions to that existing synthetic role. These are required by the actual account lookup and journal-create action; the role already has journal-read permission. The helper records before/after permissions and the precise additions. It does not seed accounts, journals, periods, providers, grants, approval records, or sessions, and does not change configuration policy through SQL.

The browser signs in using the fixture's existing password, reviews an explicit Accounting stop in the module workbench, submits through the real password step-up, and verifies the durable request/event and retained grants. It then submits a balanced six-line draft in English and French. Expected proof includes localized inline stopped-work feedback, focused error content, all form values retained, no redirect/query-string disclosure, and unchanged journal, line, and successful-create audit counts. Each language produces an actual form screenshot. Fresh per-run receipts record source hashes, checks, timings, fixture changes, and failures.

If the fixture is already stopped, the helper refuses another activation; inspect the prior receipt before preparing a bounded continuation. It never resets or silently reactivates the fixture. It does not modify POS/offline behavior or replay gates, run migrations, deploy, or provide production/customer approval. The shared create page's unrelated historical English labels are outside this narrowly localized failure-flow change.
