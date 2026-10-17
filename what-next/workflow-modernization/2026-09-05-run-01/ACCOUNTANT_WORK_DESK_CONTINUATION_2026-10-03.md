# Accountant work-desk continuation and current authority

Primary FA-CASH-COMMAND; supporting FA-CLOSE-PACK. Previous turn completed scoped continuation in the tenant Close workbench. This milestone connects the separate delegated accountant work desk to complete bounded reads and direct review detail. Neither parent workflow is closed by this correction.

Baseline: branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`; register SHA256 `6e48d14ac1145ff4a2f02ac1c72a7172945b32893638b2211ce34ad16e4caf51`. Shared changes preserved. 270 workflows /17 families; 264 Queued, two In progress, four Complete—verified; 191 unmapped entries, discovery incomplete.

## Selected acceptance criteria

- Pending requests and submitted reviews remain reachable beyond 100 records for each permitted client, across periods.
- Detail lookup targets the chosen request under current delegated access, independently of the first summary page.
- List projections remain redacted; current mandate, home-role/account/module and target-module access are required before returning data.
- Loading a client continuation does not reload other clients or discard the open review, notes, confirmation or retry command.
- Page failure preserves work; revoked access removes that client's rows and private detail.
- Actual EN/FR, keyboard, narrow-layout and independent acceptance behavior is verified against persisted records.

## Delivered behavior and decisions

The work desk previously discarded all pending requests above 100 and inherited the review queue's non-paged refusal above 100. Its detail endpoint searched only that queue's first batch. It now returns separate continuation positions for pending requests and reviews per client, with bounded creation-time/ID queries and current authorization on every page. The review queue supports an explicit all-period paged mode; period-scoped tenant workbench behavior remains available. Normal continuation is not reported as malformed evidence.

Client-list pagination still bounds fanout to ten clients. A per-client continuation reads only the requested queue and that client's notification statuses. Private request/response bodies and employee IDs remain absent from summaries. Direct detail narrows the authorized request without hiding ambiguous evidence for its finding.

Home permissions are now re-derived from current same-tenant roles, account usability and accounting-module access. Client access is checked before and after collection; the aggregate also rechecks home authority before returning metadata collected from earlier clients. The actual acceptance writer retains existing fresh-password, independent-review, session, module and delegated-consent controls.

EN/FR controls append and deduplicate permitted rows, retain the other queue's continuation and existing client-list position, and preserve review notes and confirmation. Failed loading can be retried. A forbidden continuation removes that client's rows and detail. Long names wrap in narrow cards. Pagination is a live read, so refresh includes records inserted before the continuation position.

## Verification

Final static verification passed: **431 tests across thirteen suites, zero failures/skips**, in `evidence/close-evidence-recovery-jest-6a45875f-4b1b-4ee4-b6dd-984db625982b.json`; no-emit TypeScript in `evidence/close-evidence-recovery-typecheck-7576569f-9ab7-48aa-b3e2-e0132e1c2484.json`; changed-file lint in `evidence/close-evidence-recovery-lint-74aea3f3-c2d9-4702-a1c3-4d77016c682e.json`. All bind unchanged current source.

An initial expanded test run had 428 passes and one failure: its generic module-denial fixture now denied the home module before reaching the intended client-module assertion. The fixture was made scope-specific and a separate home-denial test was added. Receipt: `evidence/close-evidence-recovery-jest-fc52c7d6-1997-4ccd-b5b1-e93cea4ce736.json`. Subsequent 430-test runs passed; the final aggregate-authority assertion adds one further case.

Final database verification passed all eleven checks in `lanes/environment/close-evidence-workflow-runtime-4bc1b99b-e32f-4440-9ae9-98a1d8c43445.json`. It retained the six tenant workbench capacity checks and added delegated traversal of 204 pending requests and 103 reviews, redacted summary projections, direct source-bound detail beyond page one, foreign-client refusal, and actual persisted mandate/home-role revocation between collection and return. Source, financial and outside-fixture observations passed. The initial `de57c48e-2f54-4002-8d72-f2dbea29840e` receipt predates the additional aggregate home-authority check and remains historical evidence.

Capacity findings/comments and the local delegated mandate are explicitly synthetic fixtures. The mandate has a saved scope record and hash stating that it is not a real professional approval. One actual request/response and replacement preview are created through domain services for integration verification. The revocation checks schedule committed fixture changes after the real queue read; they do not replace an authorization result. Financial and outside-fixture observations are checked. No migration, seed command, reset, external delivery, real payment, live activation or certification is authorized by this work.

Actual delegated browser verification passed both EN and FR journeys in `lanes/environment/accountant-work-pages-browser-b51fec43-4f08-44b9-8794-73d1023729c5.json`. Each loaded two pending-request continuations and one review continuation, opened a source-bound response beyond the first page, preserved notes and the review confirmation while loading, required fresh password verification, and required a separate explicit acceptance afterward. Exactly one acceptance per journey was persisted by the delegated reviewer; the finding resolved while the original missing-evidence observation remained retained. Source, financial and outside-fixture checks passed, with no browser errors recorded.

Both languages were checked at 1440, 768 and 320 CSS pixels with reduced motion; document and work-desk widths had no horizontal overflow. Twelve actual screenshots accompany the receipt under the same directory, including `accountant-work-pages-b51fec43-4f08-44b9-8794-73d1023729c5-fr-review-320.png`. Keyboard-driven review/acceptance was exercised; comprehensive screen-reader and zoom testing remains open. Route readiness measured 27,950 ms for the first EN development visit and 1,640 ms for the later FR visit. These are individual local development observations, affected by cold compilation and fixture load; they establish no production performance budget or certification. The identity-verified temporary listener on `127.0.0.1:3110` was stopped after completion; its launcher exited successfully.

## Operation and remaining work

Open `/en/dashboard/accounting/accountant-portfolio` or `/fr/dashboard/accounting/accountant-portfolio`. Use the client's separate controls to load more unanswered requests or reviews. Open a response, review its retained source observation, and enter notes. Loading more work preserves that review. If access is revoked, ask the organization's authorized access owner to inspect the existing mandate and home role/module state; a file link alone does not restore authority.

Historical finding localization and assessment context, requester tracking and recipient replacement, complete accessibility/zoom, other authority interleavings, notifications/delivery and original Cash/Close domain handoffs remain required. The prior rejected manual-posting proposal remains unapplied. No new workflow closure or X1 clearance is claimed.

Architecture, service/data, IAM/privacy, workflow/localization, audit, quality and operations reviews apply. Ledger, statutory, inventory, payroll and billing calculations are unchanged; certification in those domains is not applicable to this continuation correction.
