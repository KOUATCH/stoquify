# AF06 request-resolution metric definitions

Updated 20 October 2026. These are measurement contracts for a later authorized pilot, not implemented dashboards or observed customer outcomes. AF06 creates no analytics store and invents no time-saving result.

## Measurement population

Use authorized, retained request identities and their existing lifecycle/history timestamps. Select a disclosed client/engagement cohort and UTC reporting interval. Resolve current permitted history using the existing domain readers; exclude contradictory records from success numerators and report their count separately.

Do not calculate firm totals from the bounded UI page. A future aggregate must exhaust and reconcile all authorized pages or disclose incomplete coverage. Requests outside the viewer's current authority are not exposed merely for analytics. Preserve original author attribution when ownership changes.

## Definitions

| Metric | Definition | Interpretation and limit |
|---|---|---|
| Request-to-response elapsed time | First valid retained response timestamp minus original request timestamp; median and p90 among responded requests | Measures client response latency. Show unanswered age and count separately to avoid survivor bias. |
| Response-to-acceptance elapsed time | Valid independent acceptance timestamp minus accepted response timestamp; median and p90 | Measures review latency, not financial resolution or certification. Separate pending review age. |
| Request-to-acceptance elapsed time | Valid acceptance timestamp minus original request timestamp | End-to-end evidence lifecycle duration. Include cohort size, accepted share and uncompleted requests. |
| Overdue unanswered requests | Unanswered valid requests with original `dueAt` earlier than the reporting observation | The original deadline remains after recipient reassignment. No inferred review SLA. |
| Pending independent review | Valid submitted responses without current retained acceptance or authorized supersession | State must come from domain resolution, not a notification or attachment count. |
| Source-change rejection rate | Distinct acceptance attempts rejected for changed/unverified source divided by all observed acceptance attempts | Requires a reviewed attempt-event denominator. Do not infer attempts from accepted comments alone; not currently measured by AF06. |
| Notification health | Existing outbox status and verified in-app publication, grouped by request/response notification identity | Queue processing and publication are distinct from recipient delivery/read or evidence completion. |
| Recipient recovery | Requests with retained recipient changes; response latency before/after change and unavailable-owner count | Original request and deadline retained. Do not attribute causal improvement without a comparison cohort. |
| Reopened or disputed evidence | Retained domain events/findings that invalidate or challenge previous evidence | Do not invent a reopened state from a generic source refresh. Use the actual domain contract. |
| Duplicate suppression | Exact replay observations and changed-payload conflicts, if reliable audit events exist | One persisted request is not proof of the number of retries. No new replay counter is introduced. |
| Authority loss | Requests whose former staff no longer have access; retained work visible to the current authorized team | Report without exposing revoked staff's private session information. Assignment removal is not work completion. |
| Coverage completeness | Authorized clients/periods/queues fully traversed divided by the declared cohort, with unavailable/partial sources disclosed | A partial cohort cannot support a complete workload or success-rate claim. |

## Pilot evaluation

Baseline the same cohort before enabling the new composer: evidence turnaround, manual follow-up effort and unresolved age. Use a disclosed pilot window and compare by client size, evidence case and reporting period. The product aim is shorter correct resolution with fewer manual handoffs, not more visits or notifications.

Measure successful firm visits by a meaningful outcome: one valid request, a recovered recipient, an independently reviewed response, or an explained blocked case. Do not treat page views, refreshes or repeated failed requests as value.

No commercial promise, monetary savings, compliance guarantee or release gate is inferred from synthetic timings. Agree thresholds and data access with the later pilot owner under AF16. AF08 workpapers can consume the retained accepted-evidence trail without duplicating its source of truth.
