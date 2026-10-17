# Close evidence workbench continuation

Primary FA-CASH-COMMAND; supporting FA-CLOSE-PACK. Previous turn delivered verified recipient eligibility and exact replay after revocation. This milestone addresses the existing Close workbench's inaccessible work beyond bounded lists. It does not close either parent workflow or redefine the full modernization goal.

Baseline: branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`; register SHA256 `c8fe1d2542e2fc88f9cd01e7f80bd07a4b0e8d61604a3d762279ef9205a19ea1`. Shared changes preserved. 270 workflows /17 families, 264 Queued, two In progress, four Complete—verified, 191 unmapped entries; discovery incomplete.

## Closure criterion and implementation

The selected criterion is that permitted work in the selected period remains reachable beyond the first batch, including findings, assigned requests, review responses and eligible colleagues. Review detail must not depend on membership in the first review batch. Failed continuation must preserve the draft and existing results. Tenant, role, period and private-response boundaries remain effective.

Previously, assigned/review queues were limited before the workbench filtered by period; review queues refused all work above 100 findings. Colleague eligibility was evaluated after a fixed first batch without continuation. Detail lookup searched only the bounded review list.

The protected read action now accepts a validated continuation kind and cursor. The service validates cursor scope against the server-derived tenant and actor and selected period; cursors are positions, never authority. Each page rechecks current account, role and module permissions. Findings and queues use stable creation-time/ID keysets, so resolving the boundary row does not invalidate later pages. Colleague candidates use ID keysets and can advance even when a batch contains no eligible person. Queries stay bounded at 100 rows plus a continuation indicator; no limit was raised.

The selected period is part of request/review database predicates. Review detail targets the requested record inside the existing authorized tenant/delegated-access query while retaining validation of all evidence for that finding. Paged comment reads are limited per finding: an ambiguous finding yields a blocker without consuming another finding's evidence budget. Normal continuation is distinguished from incomplete evidence in queue metadata.

EN/FR load-more controls append only the requested collection, deduplicate retained records and preserve the active form, recipient choice and exact pending command. An empty ineligible colleague batch explains how to check the next batch before requesting access changes. A restored recipient outside the first batch remains selected and is revalidated on submission. Failures retain prior results and drafts; changed permissions discard privileged rows. Refresh restarts the current read; continuation is a live view, not an immutable snapshot, so newly inserted earlier-position records require refresh.

## Verification

Final focused verification: **360 tests across ten suites, zero failures/skips**, passed in `evidence/close-evidence-recovery-jest-f129c21b-00bc-407d-a3a5-e8526343f98c.json`. Tests cover scope refusal, current authority, period-before-limit predicates, continuation after an empty ineligible batch, per-finding ambiguity, direct review lookup, retained drafts on failed page loads, deduplication and revoked-permission UI behavior, plus existing evidence lifecycle regressions. Final no-emit TypeScript passed in `evidence/close-evidence-recovery-typecheck-bc088251-c7c7-4cd5-9344-78aa84d58636.json`; changed-file lint passed in `evidence/close-evidence-recovery-lint-df66c448-b559-4589-aaf1-67b40e5c4e0c.json`. All final receipts bind stable current source. Initial pre-clarification checks remain historical.

Six final database checks passed in `lanes/environment/close-evidence-workflow-runtime-c5a94d34-ea17-4b1b-aba2-769bf6d9d91d.json`:

- All 102 synthetic unrequested findings were reachable without duplicates.
- All 204 assigned requests were reachable; 102 older requests from another period were excluded before limits.
- All 102 reviews were reachable; direct authorized detail beyond page one worked and an unauthorized actor was refused.
- An empty batch among 101 ineligible colleagues continued to the eligible recipient.
- Cross-period and cross-actor cursors were refused.
- Resolving the boundary finding did not hide the two remaining reviews.

The capacity records are explicit synthetic database fixtures, not real approvals or accounting evidence. Assessment collection and all read models used actual services. Source bindings, financial records and observations outside the fixture stayed unchanged. No migrations, seed commands, resets, external messages, real payments or live activation occurred. The earlier passing capacity receipt `48605efe-07da-43d4-b50e-9851c5498848` is retained as superseded source evidence.

Both actual EN/FR browser journeys passed in `lanes/environment/close-evidence-browser-7dde20da-1d63-4cd8-95d0-aaa760f17784.json`. Each used continuation once for findings, once for colleagues, four times for assigned requests (before and after response refresh), and once for reviews. The journeys retained a request draft through reload, submitted a response, refused acceptance after authentication expired, verified identity without implicit acceptance, and explicitly accepted. Each exact finding was RESOLVED with exactly one persisted acceptance by the independent reviewer; direct review lookup then refused the closed request. Original missing evidence was retained.

Fourteen actual viewport screenshots are listed in the browser receipt; EN narrow queue and FR submitted-response views were visually inspected. Controls, feedback, and form labels were bilingual; source-owned historical finding text still needs localization, as already recorded. Keyboard activation/focus checks and 1440/768/320px reflow with reduced motion passed; no page errors or horizontal overflow. Full screen-reader/zoom certification is not claimed. Actual route-to-ready observations were 5.475–8.272s on the local development server, not a production performance budget. The server was stopped after verification.

Browser source/build bindings, financial equality and outside-fixture observations passed. The failed attempts below are retained and excluded from passing counts. Final static checks are recorded separately.

Retained browser attempts: `close-evidence-browser-8a918e66-cbcc-400f-9d56-05ee96aa6baf.json` failed because a global submitted-status locator matched more than 100 rows. `close-evidence-browser-2758628c-a2d0-4203-9e8a-65f28773a356.json` then exposed test synchronization against the post-save first-page refresh. The driver now waits for refresh completion, loads the specific request, scopes review by its source identity, and confirms the exact persisted resolved finding and independent acceptance record. These were verification-driver corrections; the receipts remain failures and do not count as passing journeys.

## Operation and remaining requirements

Open `/en/dashboard/accounting/close` or `/fr/dashboard/accounting/close`, select the accounting period, and use the relevant load-more control. When no eligible colleague appears but “Check more colleagues” remains available, continue checking. If a page fails, retry that control; the draft is retained. Refresh after source or access changes. Every write still rechecks current authority and recipient eligibility.

The separate accountant work-desk callers still use the legacy bounded summary contract and need their own continuation/detail integration. Their existing fail-closed behavior was preserved and is not claimed complete by this workbench change. Historical finding localization and assessment context, requester tracking/recipient replacement, remaining authority races, complete accessibility/zoom, and original Cash/Close handoffs remain open. No workflow closure or release/X1 clearance is claimed.

Architecture, data, security/privacy, workflow/localization, quality, audit and operations perspectives apply. Ledger, statutory, payroll, inventory and billing calculations are unchanged; their domain certification is not applicable to this read-model/UI correction.
