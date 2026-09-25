# Terminal deactivation versus shift opening

2026-09-13. Bounded continuation of the whole-platform assignment, using the previously selected `007-aqstoqflow-pos-ledger-controls` skill. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`; unrelated working-tree changes retained. Source inventory: `evidence/source-baseline-v124.json`.

## Finding and correction

Historical action graph node `pos_terminal_management_actions_archivemanagedterminal`, community 22, points to the archive action. Current source confirms the route → TerminalManagementDashboard → useArchiveManagedTerminal → archiveManagedTerminal → archiveTerminalForManagement path. `openPOSShift` already claims a terminal atomically using its active flag and empty session link. Archive checked availability first, then updated only by terminal ID, allowing an intervening opening to be overwritten.

The owned PostgreSQL verifier reproduced this with the **actual openPOSShift service** between the archive read and write. Both operations succeeded, leaving an inactive station with a live session (`9df366`). This can interrupt the cashier's operating workspace and makes displayed availability disagree with the continuing shift.

Archive now conditionally updates the same station row using terminal ID, organization ID and a null current-session link. A lost claim returns the existing actionable active-session error. The update and opening claim serialize on the station row: opening first prevents archive; archiving first prevents opening. No broad transaction refactor, schema change, deletion or automatic replay was added. Existing terminal and shift history is retained.

This patch corrects only the archive path. `updateTerminalForManagement` also checks restrictions before its write and remains an outstanding separate defect, including its ability to deactivate through edit. Do not infer that all deactivation paths are fixed.

## Verification and exact scope

All commands use bundled Node `C:/Users/J COMPUTER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe` from the repository. No migration-bearing build or wrapper ran.

- `what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-terminal-race-v124.cjs`: before reproduction passed, receipt `9df366`, report `lanes/environment/terminal-race-v124-before-f1336a18-82e0-4f04-94dd-124428239569.json`.
- Same script with `--after`: corrected behavior passed, receipt `420e69`, report `lanes/environment/terminal-race-v124-after-06f8c4c4-7325-422d-a657-ba35f06b6bd5.json`. Actual concurrent opening retains one active session and active terminal; archive rejects. Cross-tenant access rejects. Repeated idle archive is safe; a subsequent opening rejects without creating an orphan session. No payment or journal created. Source hashes stable.
- `node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/pos/__tests__/terminal-archive.service.test.ts services/pos/__tests__/pos.service.test.ts actions/pos/__tests__/terminal-management.actions.test.ts`: 48 tests / three suites passed (`7f3fd8`). Includes opening admission/claim and action tenant/permission coverage.
- `node_modules/typescript/bin/tsc --noEmit --pretty false`: passed (`8d077b`).
- `node_modules/eslint/bin/eslint.js services/pos/terminal-management.service.ts services/pos/__tests__/terminal-archive.service.test.ts`: passed (`2ee110`).

The database guard verifies owned local provenance before creating synthetic organization records in `stoquify_local_registration_20260906_01`. No live customer or provider operation. This is actual service/database verification with controlled interleaving, not an EN/FR terminal-management browser visit. That visit, UI rejection/retry, dialog keyboard/focus, mobile and role-change coverage remain incomplete. Earlier POS screenshots do not verify this route.

## User, operator and rollout guidance

Route: `/en/dashboard/settings/terminals` or `/fr/dashboard/settings/terminals`. The organization administrator supplies current terminal-management authority (existing action permission `pos.session.start`; reads require their existing route/action permissions), selects the terminal and confirms deactivation. The terminal ID and session state come from current organization records. No approval record or manual database ID is required.

If the terminal acquired an active shift before confirmation, the action rejects. Refresh the terminal list, identify the cashier and complete the normal authorized shift-close process before trying deactivation again. Do not clear the session link manually. An already inactive, idle terminal may be submitted again without deleting its history. This does not resolve unknown outcomes in other operations.

No migration/backfill or deployment performed. Before a release cohort, verify both archive and edit/deactivate paths and the actual UI. Reverting this service change reintroduces the demonstrated race; restore the prior application version only through the existing authorized recovery process with the affected operation contained. No X1, release or professional certification is asserted.

## Review accountability

| Responsibility | Result |
| --- | --- |
| Architecture/backend/distributed systems/API | Current route/action/service chain inspected; atomic competing claims verified. |
| Database/data integrity | Real PostgreSQL interleaving, retained history, tenant denial and absence of orphan sessions checked. |
| IAM/privacy/fraud | Existing action identity and permission checks retained; write now includes tenant ID. Full role/module/read-only lifecycle remains open. |
| Product/operations | Cashier's active terminal is preserved; administrator receives existing active-session rejection and can recover through normal shift closure. |
| Frontend/design/EN-FR/accessibility | No presentation changed. Current dialog has no rejection catch/pending disable; localized errors and complete browser recovery require further work. No UI compliance claim. |
| Finance/controls/ledger/audit | Opening float follows the existing service; no payments/postings. Continuing shift retained; full close-to-ledger proof remains unverified. |
| Quality/release/SRE | Before/after persisted evidence plus focused tests, typecheck and lint. No performance improvement or release readiness asserted. |
| SaaS/modules | Existing new-work guard on opening retained. Observe/read-only enforcement remains a separate review item. |
| POS/offline/events/providers | Online station lifecycle boundary reviewed; offline/event/provider behavior unchanged and not verified by this test. |
| Statutory/country; purchasing/AP; HRIS/payroll; analytics; AI/agents | Not applicable to this bounded correction: no behavior in these domains changed. They remain within the whole-platform assignment. |

Next: fix transactional terminal-edit restrictions and their drawer/location effects, complete localized terminal UI rejection/recovery, visit the actual terminal workflows, then continue the remaining POS and platform register. This slice does not mark a whole workflow complete.
