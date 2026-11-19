# AF08 workpaper contract

**Version:** 1. **Date:** 20 October 2026.  
**Boundary:** a bounded, source-linked workpaper binder for an individual client and completed accounting period. This contract adds no ledger, settlement approval, filing capability, external audit opinion or close certification.

## Sources and availability

The four fixed pilot headings are cash/settlement, accounts receivable, accounts payable and inventory. Accounts enter a heading through the `scheduleKind` on their existing balance-sheet supporting evidence. The binder does not infer an accounting classification from a country-specific account number.

`readBalanceSheetPopulation` supplies the current balance-sheet account/currency population. `readBalanceSheetClose` validates the latest independent supporting-evidence approval and recomputes the existing `readBalanceSheetSnapshot`. The snapshot checks the tenant, completed period, account currency, recording cutoff, posted/reversed journal lines, supporting-source revision and four-column reconciliation.

| Displayed field | Existing authority | Behavior when unavailable |
|---|---|---|
| Opening balance | Existing ledger snapshot before the inclusive period start | No amount |
| Additions/reductions | Existing normal-balance ledger movements during the inclusive period | No amount |
| Closing balance | Existing opening plus additions minus reductions | No amount |
| Supporting totals | Existing itemized balance-sheet evidence calculation | No amount |
| Differences | Existing exact Decimal comparison of all four columns | No positive review |
| Evidence identity | Retained evidence ID/hash, source hash/revision and independent approval identity/time | Missing/changed status |

No FX conversion or cross-currency aggregate is introduced. Every account row inherits the binder's client, period and inclusive UTC boundaries, and carries its currency, source revision, source hash, evidence identity and availability. CSV repeats client and period on each account row. PDF prints scope on the cover, account/currency/source details within each schedule, and the same publication watermark on every page.

A heading with no retained supporting schedule is **UNAVAILABLE**, not zero. Changed, unapproved, invalid, revoked or unreconciled evidence cannot expose its diagnostic snapshot amounts as current figures. A separately approved `ZERO_ACTIVITY` schedule may legitimately report zero.

Accounts outside the four classified pilot headings remain disclosed in an appendix/list. Their amounts are outside this binder's scope. “REVIEWED” concerns only the four explicitly classified pilot schedules; it does not certify whole-ledger classification completeness. Cash support does not replace provider settlement reconciliation, and these schedules are not AR/AP aging or an inventory quantity valuation replacement. Those domain read models and the existing Close pack remain authoritative for their separate controls.

## Current source binding

Each request verifies live authority before acquiring the sorted accounting-period locks and the existing tenant source-revision lock. The transaction uses Read Committed, then reads the post-lock database clock and the latest unambiguous, non-voided, non-running/non-draft Close assessment.

The source hash binds the client, period boundaries, selected run, current tenant source revision and account/currency/evidence snapshots. The observation timestamp is excluded from this identity, so an unchanged reload does not manufacture a new financial version.

Reads and exports recompute current evidence rather than trusting a background job or cached review label. Any relevant source change conservatively invalidates the whole pilot binder for re-review. This is broader than a future per-schedule impact calculation, and intentionally cannot leave an affected schedule with an unqualified current approval.

## Preparation and independent review

Versioned metadata is stored on the existing `AccountantReview` table:

- Namespace `review-workpaper-v1`.
- Exact source hash, decision, optional preparation ID, idempotency key and command hash.
- Existing actor, timestamp and conclusion fields.
- Generic record status remains `OPEN`; AF08 never sets `APPROVED_FOR_CLOSE`.

Decisions are append-only through this service. `PREPARED` records a conclusion against the displayed source hash. `REVIEWED` and `CHANGES_REQUESTED` must reference the latest current preparation and be made by a different actor. A positive review requires all four pilot headings to have current reconciled support. It remains a workpaper review, not an external approval or close certification.

Only the latest decision can be displayed as current. Earlier decisions remain visible as historical even if their sources have not changed. Source drift produces `STALE`. A new preparation supersedes the former positive review and requires another independent review.

Exact retries return the retained decision. Reusing a key with different actor/payload conflicts. Existing client consent, firm assignment and domain permissions remain separate requirements; a firm-role label supplies no financial authorization.

## Authorization and session controls

The service reuses AF04/AF06 organization, module, actor, role, membership, exact-session, named-mandate, engagement and assignment locks. Current authority is checked again after business-lock waits using the database clock.

| Operation | Current home permission | Named client capability | Fresh password |
|---|---|---|---|
| Read | `accounting.close.read` | READ | Live session; no additional step-up |
| Prepare / copy headings | `accounting.close.finding.comment` plus close read | REVIEW | Live session |
| Review / request changes | `accounting.close.accountant.review` plus close read | REVIEW | At most 300 seconds |
| Export | `accounting.exports.create` plus close read | EXPORT | At most 300 seconds |

All routes/actions retain the existing module protections. Writes and exports recheck authority even for an idempotent replay. Client IDs, displayed controls, old snapshots and request bodies are not authorization. The action adapters derive home organization and session proof from `protect` and the existing trusted context adapters.

## Retention, export and redaction

`ClosePackExport` retains a `workpaper-json` publication with `isCertified=false`. Its versioned metadata contains the canonical, redacted JSON, command hash and retry key. Existing JSON trust packs and certified Close packs remain available through their own controls.

The same publication key can render JSON, CSV and PDF. Changing the format does not change its canonical identity. The portal reuses that key while the source/review hashes stay unchanged. Every request still checks current source, current review and current authority; an old publication cannot be silently reissued as current after drift.

Exports reuse `accounting.export` sensitive-action policy, financial sensitivity, durable watermark generation and export audit. The audit records canonical hash, byte-level artifact hash, format, actor and retained publication identity. Rendering occurs before persistence; an error rolls back the publication/audit transaction. A lost response can be retried without duplicating the canonical record.

All formats use the retained redacted object. They omit raw source items/descriptions, customer/supplier details, attachments and free-text conclusions. Decision identity, actor ID, time and conclusion hash remain traceable. JSON retains the redaction marker; the PDF/CSV show the review state/hash and scope.

CSV shares the existing AR export's escaping helper. Text beginning with spreadsheet formula prefixes, including after whitespace/control characters, receives a leading apostrophe; quotes are escaped. Amounts remain exact decimal strings. The PDF uses the installed jsPDF/autotable libraries, the retained timestamp and a deterministic document ID.

## Roll-forward

An authorized preparer can select an earlier period of the same client with a retained workpaper preparation. The service stores only the four heading names and origin period on an existing `AccountantComment`, together with actor/retry/audit metadata.

It does not copy figures, evidence hashes, conclusions, approvals, assignments or availability. The target period must have its own eligible Close assessment and is read from its own current sources. Existing engagement assignments and AF06 evidence requests remain the places to allocate work; AF08 adds no competing assignment system.

## Bounds and operational behavior

- At most 50 balance-sheet account/currency population entries per client-period in this pilot. A larger population is rejected explicitly; it is not truncated into an apparently complete binder.
- At most 100 retained workpaper decisions per period in this pilot. The UI displays the latest ten, while the bounded service and canonical export retain the full permitted history.
- The earlier-period picker shows the latest ten earlier periods.
- The existing source-control read may scan retained ledger history. The account cap is not a promise of a maximum number of underlying journal lines.
- Transactions use the existing source-lock discipline with a 20-second timeout and 10-second maximum lock wait.
- This bounded synchronous summary does not enqueue the separate finance statement export pipeline. Larger-population delivery requires a deliberately designed asynchronous extension before widening the cap.
- No migration, new dependency, delivery worker or live provider connection is required by AF08.

## UI and recovery

The existing Accountant Portal hosts the binder with dashboard tokens and shared buttons. English/French controls cover load, missing support, preparation, independent review, changes requested, copy-headings, password step-up, explicit retry and three download formats.

A failed or denied refresh removes current client figures. A scope change unmounts the scoped form; late responses are ignored. Hiding the tab clears visible private data and draft text. Drafts are not persisted in browser storage. An uncertain submission retains its exact key while the form remains mounted, and fresh authentication never automatically replays it.

The pilot's service checks are authoritative even where a button is visible to an actor whose current mandate no longer permits the operation. The error state directs the user to refresh and check the mandate.

## Rollout and rollback

Enable through the existing Accountant Portal, role/mandate permissions and accounting/Close module entitlements only after the relevant schema/runtime and AF04/AF06 controls are deployed. Trial with explicitly enrolled synthetic or approved pilot clients within the stated bounds.

Observe conflicts, denied actions, fresh-auth failures, source-control unavailability, export failures and transaction latency. Investigate unexpected errors using the existing protected-action correlation/audit trail. Do not treat a “REVIEWED” label as a release or statutory certification.

To roll back the surface, remove its portal integration and disable the new write/export adapters while retaining the guarded read service and stored records. Do not delete `AccountantReview`, `AccountantComment`, `ClosePackExport` metadata or source evidence. Existing Close evidence and JSON packs remain the fallback. Historical publications remain retained; this phase does not add a separate historical-file delivery endpoint.
