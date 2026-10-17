# Close notification provenance

FA-CASH-COMMAND primary / FA-CLOSE-PACK supporting dependency. Branch `codex/migration-control-plane-release-2026-08-29`; HEAD `62a56036a5ac9b37236a20c9b148052199069479`; evidence date 2026-10-04. Previous turn classified as progress: it implemented and verified departed-requester supervision. This milestone preserves that work and the full workflow-modernization objective.

## Findings and correction

The accountant work desk displayed the original evidence request's notification status on submitted responses. In `readClientWork`, both pending requests and response-review rows used `close-assurance-finding:<finding>:missing-evidence-requested:<request-correlation>:notification`. A request could therefore be shown as processed while its response notification was still pending, failed or absent.

Response rows now read the exact `close-assurance-missing-evidence-request:<request>:response-submitted:<response-correlation>:notification` record under the `close.assurance.missing_evidence.response_submitted` event. Unanswered requests retain their own event/key. The database query binds the tenant, notification channel, event name and key together; the map also includes the event name. Missing or mismatched evidence stays `UNKNOWN`. A database read failure still fails the read rather than producing a successful empty or unknown result.

The EN/FR interface now names the observed stage: **Request notification / Notification de demande** or **Response review notification / Notification de revue de la réponse**. Existing processed-status wording still says recipient delivery is unverified. The correction changes no request, response, approval, financial record, event or outbox state in application code.

## Delivery investigation — still incomplete

Current Close producers atomically record business events and notification outbox messages. The response event's `ownerId` is still the original requester. The current work-desk review queue is accessible to authorized accountant reviewers independently of that requester, and the prior supervision milestone permits another same-tenant manager to continue work.

No Close notification delivery consumer was found among current `runBusinessEventOutboxWorker` callers. Existing callers cover finance-statement exports and reconciliation-signature notifications. The generic worker supports exact leases, retry/backoff, failure and dead-letter states, but it is not itself a Close delivery destination. The reconciliation worker publishes to a reconciliation-specific inbox; reusing that table for Close would misclassify the domain. The local notification provider and legacy `NotificationMenu` do not supply durable Close notification publication.

Therefore this milestone corrects observable status provenance; it does **not** implement delivery, reroute messages, mark messages sent, create a scheduler or prove that a person was notified. The remaining implementation must provide a durable Close destination and current-authority audience resolution, integrate actual delivery with the existing outbox leases/idempotency, expose operator failure/recovery, and verify the complete trigger → publication → authorized visibility → retry chain. Original authorship must remain unchanged. A team audience must continue to enforce current module, tenant/mandate and review permissions; a requester's departure must not erase the obligation or authorize a broadcast to unrelated users.

## Bounded verification

Acceptance criteria: unanswered requests use request-event state; submitted responses use response-event state; original request success cannot hide response failure; mismatched or missing event evidence is unknown; notification read errors propagate; delegated access remains required; EN/FR labels identify the stage; rendering has no business effects.

The inspected `lanes/environment/verify-close-evidence-recovery.cjs` directly invokes Jest, `tsc --noEmit --pretty false` and changed-file ESLint without migration/seed hooks. **636 tests in 24 suites passed; zero failures or skips. TypeScript and lint passed.**

- [Focused tests](evidence/close-evidence-recovery-jest-863ac07b-d5bf-4bf9-aba2-1e7f8355a58e.json)
- [TypeScript](evidence/close-evidence-recovery-typecheck-abd87918-dbeb-4561-a6f2-6312f5e8e1be.json)
- [Lint](evidence/close-evidence-recovery-lint-707d34ca-f7f7-444b-8335-e4e7d259a708.json)

`lanes/environment/close-notification-provenance-runtime.cjs --run` passed seven owned-PostgreSQL scenarios: request failure; sent request contrasted with pending, failed, dead-lettered and sent response states; missing response-event match; revoked delegated mandate. [Runtime receipt](lanes/environment/close-notification-provenance-043336ec-1b1c-424b-85a9-f8b90fe5bcae.json). Full source records, financial and outside-fixture fingerprints were preserved.

These contrasting outbox statuses are **explicit synthetic test states**, not proof of real delivery. Fixtures are isolated in the owned loopback database `stoquify_local_registration_20260906_01`; the synthetic mandate document expressly disclaims a real customer approval. No migrations, resets, live activations, payments or external messages were performed.

Both actual EN/FR browser checks passed against the verified owned app and exact runtime receipt. [Browser receipt and six screenshots](lanes/environment/close-notification-provenance-browser-39b9226b-bd93-4a47-9138-a833db8ce77e.json). The screens show the response-review failure despite the original request being in a synthetic sent state. Keyboard refresh preserves that result. Automated checks confirmed no horizontal overflow at 1440/768/320px and reduced-motion preference. The French 320px screenshot was visually inspected: stage, failure guidance and review action fit the existing dashboard theme. Source, financial and outside-fixture fingerprints matched; reading the screens changed no source evidence.

Development navigation-to-work-desk times were 32.041 seconds for the first English visit and 2.415 seconds for French. They include development route loading, have no controlled before/after baseline, and do not establish production performance. Compiled portfolio route SHA256: `d0ebcbdf797d78e67f83b823b389bcd1b889758544a297ef92024b9a240b25a8`. No full build, screen-reader audit or browser-zoom check was performed. Publication validates all passing receipts against current source bindings.

## User and operator guidance

Open `/en/dashboard/accounting/accountant-portfolio` or `/fr/dashboard/accounting/accountant-portfolio`. An authorized accountant needs current home-organization audit/review permissions, home accounting access, and an active client review mandate plus client Close access. The existing access administrator supplies these permissions and the client supplies the actual mandate evidence. A request reference alone grants no access.

For an unanswered item, the displayed status concerns the request notification. Once a response is submitted, the displayed status concerns the review notification generated by that response. Do not infer that the reviewer was notified because the original request was processed. `UNKNOWN` means the matching event record was not available; `FAILED` and `DEAD_LETTER` require investigation. The evidence review remains subject to its own independent approval controls.

Operators should inspect the notification outbox in the exact client organization, event and idempotency-key scope described above. Retain source events and their errors. There is currently no verified Close delivery command to recommend. Do not manually mark messages `SENT` to remove a warning. Implement and verify the missing destination/consumer before enabling scheduled processing, and preserve the distinction between durable publication and personal receipt.

## Rollout and reviews

Ship the service mapping and localized component labels together. No schema migration or backfill is required. Reverting this correction restores misleading provenance and is not a recovery step for delivery failures. Existing source events and outbox records need no mutation for the corrected display. No deployment occurred.

Architecture/backend/data: exact event/key mapping with bounded tenant reads; no new source of business truth. Security/privacy: existing before/after delegated authority retained; no response bodies added to list rows. Audit/finance: no record or financial mutation from reads; simulation separated from operational proof. Workflow/UI/localization: stage-specific EN/FR labels in the existing work desk. SRE/integrations: missing consumer is explicit; retry states are observable and not treated as delivery. Product/operations: failed review notifications are no longer obscured by request success. Statutory calculations, payroll, inventory/POS, AI and commercial packaging are not applicable because their behavior does not change. These are engineering reviews, not professional certification.

The full goal remains active: 270 discovered workflows, 4 Complete—verified, 2 In progress, 264 Queued, 191 unmapped entries, incomplete discovery. Parent workflows remain unfinished. Delivery, departed-requester notification routing, delegated pending-request replacement/recovery compatibility, full accessibility/zoom, remaining authority races, capacity and original Cash/Close handoffs remain required. The separately rejected all-period posting helper remains unapplied.
