# Actual journal stopped-submit verification

Executed 2026-09-05, 16:17:06–16:19:05 UTC, after the parent released the rebuilt isolated server. This is the executed follow-up to the earlier preparation record in `ACCOUNTING_CREATE_FOLLOWUP.md`.

**Passed: 4/4 observations; process exit 0; application source hashes unchanged.** Both browser contexts and the browser closed before the server was released for the next verification task.

Evidence: [receipt](diagnostics/journal-stopped-submit-2026-09-05T16-17-06-656Z/receipt.json), [English screenshot](diagnostics/journal-stopped-submit-2026-09-05T16-17-06-656Z/journal-stopped-submit-en.png), [French screenshot](diagnostics/journal-stopped-submit-2026-09-05T16-17-06-656Z/journal-stopped-submit-fr.png). Both saved screenshots were visually inspected; the full six-line draft, retained header fields, readable localized denial and recovery link, and localized submit button are visible.

| Check | Observed result |
| --- | --- |
| Actual module review and password step-up | Accounting's explicit manual-journal stop reached durable `RETAINED`; request/event evidence is recorded. Existing grants and active workspace modules were preserved. No direct policy SQL was used. |
| English journal submission | Localized stopped-work response focused its alert, all 29 named values remained unchanged, and the create page stayed open without query-string data. |
| French journal submission | The same behavior passed with French denial, next-action explanation, recovery link and submit label. |
| Browser errors | None. |

For each submission, journal entries remained **0 → 0**, journal lines **0 → 0**, and successful manual-journal-create audit events **0 → 0**. These counts came from successful scoped database reads; they are not fallback values. The six entered lines were balanced and used the fixture's existing eligible accounts, manual journal and current open period.

Only the existing synthetic `service_fr_mobile` tenant in `stoquify_local_modern_modules_20260905_01` was used. Its administrator role received the two preauthorized missing permissions, `accounting.accounts.read` and `accounting.journal.create`; the receipt retains the before/after lists and exact additions. Authentication and fresh assurance came from real fixture-password flows. No domain setup, financial rows, grants, sessions or approvals were fabricated by direct writes. The reviewed Accounting stop remains recorded on this disposable fixture; the helper deliberately refuses to reset or silently reactivate it on rerun.

The helper's first sandboxed attempt was denied when creating its evidence directory and exited before fixture or browser activity. The narrowly reviewed rerun saved the evidence and completed the checks. No application source, schema, POS/offline behavior or replay gate changed during this proof.

The reported 49.656 seconds for English and 12.110 seconds for French cover route loading, database checks, filling the entire draft, submission and assertions in the local development environment. They are not isolated server-route latency measurements or performance certification. The unrelated historical English journal-field labels remain outside this focused failure-flow localization, as described in the implementation record.
