# v140 — Find retained conflict records and recover review notes

Evidence date: 2026-09-13. Bounded history/recovery implementation; the complete platform assignment remains unfinished. Final source/branch/working-tree evidence: `evidence/source-baseline-v140.json`. Commands, receipts and screenshots: `evidence/pos-offline-history-v140.json`.

## Finding and delivered correction

The existing POS strip offered review only when its open-conflict count was positive. The panel exposed the first ten open conflicts; it could not browse older/closed records. Its detail DTO omitted the stored resolution note/actor/time, and the UI showed no durable audit timeline. A note survived a failed save in memory but was lost on record switch or refresh.

The strip now keeps its review entry for authorized readers even when the open queue is empty. **Browse all conflicts** opens a register in the existing panel, scoped to the selected location/terminal and server-derived tenant. It pages twenty records at a time, filters open/closed/all statuses, and finds an exact conflict or source-event reference. Created-time/ID keyset paging handles tied timestamps and does not duplicate earlier rows when newer records arrive. Each page is a current read, with an observed time and matching count; it is not an immutable multi-page snapshot. Reload newest to see newer arrivals.

The detail now exposes the retained resolution note, actor and timestamp. Closed rows are read-only. A separately paged timeline displays whitelisted review and recorded-replay-resolution audits: action, time, actor ID, note, audit ID and supported replay/journal references. Other audit actions, raw changes, IP addresses and accepted/payment payloads are not returned. Empty audit history means no matching audit is recorded; it does not establish that the conflict was reviewed or approved.

Unsaved notes are retained in sessionStorage, separately for organization, account and conflict, for at most 24 hours. The client loads a draft only after successfully reading the current authorized record. It stores no password, preview authority, activation state or pending financial command. Successful review/resolution clears the draft; closed-record reads show the saved resolution note and discard a stale local draft. Denied browser storage preserves the note in memory and displays the refresh limitation. Tab closure, another browser/device, expiry or cleared storage can remove a draft. This is not server-synchronized draft storage.

## Operator procedure and required information

Open `/en/dashboard/pos` or `/fr/dashboard/pos`, select the location and terminal, then **Review conflicts / Examiner les conflits**.

1. Select **Browse all conflicts / Parcourir tous les conflits**. Choose open reviews, resolved/dismissed records, or all statuses. Use Older/Newer page controls to move through records.
2. To find a specific record, paste its exact conflict ID or source offline-event ID. Obtain these from an existing conflict detail, prior support/audit record, or the row reference shown in the register. This is an exact-reference search, not a free-text or order-number search.
3. Select a record. Focus moves to its details below the register. Inspect its status and source reference. Resolved records show the stored resolution note, actor ID and UTC timestamp. A retained issue type describes the recorded conflict; it does not negate its current resolved status.
4. Review the audit timeline. Audit, replay and posting-batch identifiers are server-sourced; do not invent or paste replacement identifiers into a note to establish proof. Actor IDs identify the recorded account; use the organization's existing account directory when its human identity must be confirmed.
5. For an open record, type the review note. Switching records and refreshing this tab can restore it within the stated retention window. Reload current evidence before saving after changes. Notes are drafts until explicitly submitted through the existing protected review or independently verified resolution action.
6. If loading records fails, use Retry records. A failed query is shown as unavailable, not as an empty successful history. If draft storage is unavailable, keep the page open or copy the note before leaving.

`pos.transactions.read` allows retained record inspection. `controls.manage` plus current POS transaction access and fresh authentication remain required for review/resolution mutations. History browsing does not grant those permissions, change entitlements, clear an offline gate or activate production replay. Administrators assign roles through existing organization controls.

## Implementation and review responsibilities

| Responsibility | Current implementation/evidence |
| --- | --- |
| Architecture, backend, database | Existing offline-review service extended with fixed-size keyset reads and repeatable-read page/count consistency. Uses current device scope and audit indexes; no schema/migration. Historical graphs remain discovery hints; source confirms POS strip → review panel → protected actions → existing conflict/audit records. |
| Security, IAM, privacy | Server-derived actor/tenant, current read permission, device location/terminal filter, foreign-object denial, whitelisted audit fields. Browser caches include actor/organization identity. Drafts carry validated scope and bounded size/age, never authority. |
| Finance, reconciliation, ledger, statutory | History reads leave financial and audit state unchanged. Existing v139 resolution remains separate and protected; no new posting, payment, stock, country or legal-delivery rule. No professional certification. |
| Audit and records | Read original persisted notes, IDs and timestamps; include only known review/resolution actions. No audit creation by the history service. Existing protected-action access auditing remains part of the application framework. |
| UX, localization, accessibility | Existing dashboard surface/chrome/text tokens, Button/Input and shell. Explicit select/input label associations, detail focus with sticky-header offset, wrapped references, EN/FR labels, reader/closed states, paging and error recovery. Actual desktop/tablet/mobile/200% text screenshots inspected; no screen-reader or whole-POS accessibility certification. |
| Quality | 23 focused tests, PostgreSQL paging/redaction/isolation/read-effect checks, and actual EN/FR recovery/permission journeys. Initial incorrect test path and selector expectation are recorded, not counted as passes. |
| SRE, performance, rollout/support | Bounded page sizes and propagated query errors. Browser stage timing includes paging, record switching and reload/draft recovery; it is not a single-route latency or production budget. Operational guidance below; no deployment. |
| SaaS packaging | No packaging, billing or entitlement change. |
| HR/payroll, purchasing/AP, analytics, AI/agents, external providers | Not applicable to this bounded retained-conflict read/recovery path. These domains remain in the overall assignment. |

Files: `services/pos/offline-review.service.ts`; `actions/pos/offline-review.actions.ts`; `components/pos/offline/OfflineConflictReview.tsx`, `OfflineConflictHistory.tsx`, `OfflineSyncStatusStrip.tsx`, `review-note-draft.ts`; EN/FR messages and focused tests. Existing mutation services remain authoritative.

## Verification and observed corrections

Owned fixtures create synthetic cash sales and posted journals through existing POS services to establish realistic source evidence. Read-effect assertions compare against those fixture records; they do not claim that fixture setup performed no database writes. No real payment or production transaction occurred.

- PostgreSQL: 45 records, ties at one timestamp, and a newer insert between pages; all original records retrieved once. Open/closed/exact-reference/location/terminal/tenant filters checked. All 23 review audits retrieved over multiple pages; private/other-action fields excluded. Resolution note/actor/time and journal/replay audit remain discoverable. Failed reads propagate errors. Financial/audit snapshots unchanged by service reads.
- Browser: EN/FR actual localhost auth/actions, twenty-row page followed by four older records, keyboard paging, switching records and refresh restore notes. Recorded review plus independent resolution survives another reload. Injected failed history request displays a retryable failure without an empty-success message. Readers inspect closed history; revoked read permission hides it. History remains reachable with no open conflicts. Desktop 1440px, tablet 768px, mobile 320px and 200% text checked.
- Initial browser attempt reached paging/draft recovery but timed out locating the status select by its wrapping label. Explicit `htmlFor`/`id` association with separate label content corrected the interaction. The failed receipt is retained. Detail selection now scrolls/focuses below the sticky shell; the final browser source hashes are stable.
- Initial Jest command named a nonexistent hook test; three valid suites passed but that command failed. A new history test initially expected an isolated count string despite the rendered observation suffix; it now verifies the actual query-filter contract. Final focused tests passed. Final typecheck/lint receipts are in the aggregate.

## Rollout and recovery

No migration, backfill, production deployment, customer activation, external message, certificate issuance or X1 clearance. Verify through the existing application release process. To remove the UI feature, remove the new history entry/components/actions through a code rollback while retaining every conflict and audit row. Do not reverse sales, delete audits or reset resolved records to roll back a reader UI. Existing session drafts expire; successful saves clear them. Keep evidence and use a forward correction for any disputed record.

Selected skill remains `007-aqstoqflow-pos-ledger-controls`. Bounded tenant/read authority, data, private evidence, failure/recovery and EN/FR gates have evidence. Production offline replay/admission and end-to-end ingestion/signature/revocation/close gates remain open; previously rejected continuation changes remain unapplied.

The remaining work includes actual unposted-event correction/supersession, broader offline lifecycle verification, cross-device/server drafts if required, remaining unmapped workflows and the full platform completion audit. Completing this reader/recovery path does not complete the offline domain or the platform assignment.
