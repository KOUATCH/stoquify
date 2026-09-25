# Statement history verification attempts

Preserves unsuccessful and interrupted observations; a failed tool/report write is not a passed command.

- Source continuation: branch `codex/migration-control-plane-release-2026-08-29`, head `a05a41ef66cd5d98fd69ae3df18225795f912232`; 625 dirty entries at initial history inspection (`60fde1`). Existing changes preserved.
- Focused history service tests: 8 passed (`73bfa7`). Initial six-suite run: 40 passed (`65a741`). Expanded seven-suite run: 48 passed (`af698f`, `statement-history-tests-02.json`).
- Earlier typecheck passed (`ed6d70`) before the final localized revocation recovery edit. Changed-file lint passed (`8953d4`). Those receipts are historical until the final source binding is captured.
- Real PostgreSQL checks: five passed (`d6cca3`, `statement-history-postgres-95c19f0f-9e4.json`), source stable and original financial/role hashes unchanged.
- First EN/FR browser attempt (`statement-history-browser-c1fa8e23-b0d.json`, terminal `d0923a`) failed on an ambiguous alert selector that also matched global live regions. The driver was narrowed to the named statement history region; product assertions were retained.
- Second browser attempt `20e1623d-edc` left screenshots but no final receipt before interruption. It is incomplete and is not counted as passing. The old execution cells and verification processes no longer existed on 2026-09-07.
- Recovery inspected actual owned fixture permissions (`e6bdf6`): both readers retained only `dashboard.read` and `profile.read`; both had zero temporary module configurations/grants. No restoration mutation was necessary.
- Access regression execution on 2026-09-07: all 29 tests/four suites passed, but report writing failed with filesystem EPERM; terminal exit 1 (`21f023`). This is a test assertion pass with a report-write failure, not a successful terminal command.
- Typecheck overlapped local app startup and failed because seven generated `.next-workflow-statement/types` files disappeared during refresh (`d6102d`). Final verification must run after the app finishes generating route types; no source/type suppression is authorized.
- Owned local app restarted with external fetch/provider delivery disabled (`82a88b`, session 24674). Browser rerun started (`8c4e50`, session 41623). Results pending at this entry.

No database reset, production mutation, external message or simulated approval was used. A prior routine patch filesystem failure was retried successfully; it was not an automatic approval-review rejection.

## Final continuation results

- Browser `87285d11-929` failed both locales before opening a historical copy because the driver focused a disabled action during refresh. The driver now explicitly waits for enabled state and verifies focus before pressing Enter. Original financial/permission hashes were unchanged (`2abd8c`).
- Browser `8e0e3e0a-4ba` verified historical copy lost-acknowledgement/reload, new-tab history and revocation/retry, then failed at an empty stylesheet argument in the test harness (`0b18c5`). Both locales restored their original state. The harness was corrected to provide whitespace content. No product assertion was weakened.
- Fresh owned PostgreSQL fixtures were created without deleting prior records. Five checks passed, source stable and original financial/role hashes unchanged (`558051`, `statement-history-postgres-cef5d114-085.json`).
- Final browser `ea4be3e4-82f` passed both locales (`bde72e`), with 32 screenshots and 16 width/text cases. Original financial, role, configuration and grant hashes were unchanged. Direct queue action was denied under real read-only module configuration; history remained available.
- Final focused tests: 48/seven suites (`09163f`). Access regression rerun: 29/four suites with report successfully saved (`aca28b`). Typecheck passed after route generation stabilized (`4408b3`); changed-file lint passed (`fa7f7c`).
- Source v41 captured (`c044a2`): 2,592 source/config/test files, 907 tests, 149 pages, 18 route handlers, 158 action sources and 32 background candidates. These are discovery counts, not workflow completion.
- Published checkpoint (`dc113f`) binds 30 source/test files, the final verification and screenshots. See `statement-history-receipt.json` and `statement-history-tool-checks.json`. Three actual screenshots were visually inspected: FR 320px/200%, EN read-only and FR revocation. The revocation image captures the follow-up read while loading; database assertions and later screenshots verify the final state.
- An existing header spacing defect (`then`/`share`, `puis`/`partagez`) is visible and remains queued for the next wording correction. Native zoom, native assistive technology and a comprehensive contrast review remain unverified.
