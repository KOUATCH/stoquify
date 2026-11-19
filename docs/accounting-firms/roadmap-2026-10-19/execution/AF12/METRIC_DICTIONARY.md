# AF12 outcome metric dictionary

**Version:** 1, 25 October 2026. Implemented in `services/accounting/advisory-outcomes.service.ts` and `advisory-outcomes.contract.ts`. These are operational measurements, not claims of economic benefit or employee productivity.

## Cohort, authorization and observation window

The caller explicitly chooses one to ten active engagements and client accounting periods. Every client requires current named-accountant consent, an enrolled mandate, an active assignment and the applicable AF04 restrictions. Firm management permission, client Close read, evidence-request and finding-assignment permissions are checked inside the report transaction. A denial fails the entire report; it does not silently remove a client from the denominator.

The observation window is UTC `[from, to)`, at most 31 days, ending no later than the current time. The response includes the selected engagement/client/period identifiers, window, observation time and cohort count. It is complete only for that explicit authorized cohort. It is not a whole-firm total.

Request activity is **authorized client-period activity across requesters**, not an attribution of every request to the selected firm. Selecting the same client period under multiple engagements is rejected. Results remain per cohort; financial balances are never included or aggregated.

## Definitions

| Measure | Numerator or value | Denominator / eligibility | Missing data and exclusions |
|---|---|---|---|
| Request touches | Number of durable evidence requests created inside the window | All requests created in the selected client period and window | Zero is valid only after a complete authorized scan. Reminders, retries, page visits and notifications are not counted. Superseded requests remain touches and are separately excluded from durations. |
| Client waiting | Mean elapsed milliseconds from request creation to its validated client response | Non-superseded requests created inside the window | A response at or after `to`, absent response, invalid timestamp or inverted pair is missing; never zero. Response timestamps come from the existing typed request tracking projection. |
| Response-to-resolution delay | Mean elapsed milliseconds from validated response to independently accepted response | The same request-created cohort | Acceptance at or after `to`, absence, or invalid/inverted pair is missing. Acceptance is evidence-workflow resolution, not proof of financial reconciliation, filing or close certification. |
| Reviewer rework | Workpaper `CHANGES_REQUESTED` decisions; rate = these / (`REVIEWED` + `CHANGES_REQUESTED`) | AF08 workpaper review decisions created inside the window for the selected client period | Preparations are excluded. Zero review decisions produces a null rate. It measures review decisions, not unique jobs, employee performance or time spent. Advisory narrative revisions are not silently mixed into this AF08 measure. |
| Close duration | Elapsed milliseconds from first non-voided assessment's recorded `startedAt` to the period's recorded `closedAt` | One selected client period | Requires currently CLOSED status, a valid start, and a close timestamp inside the window. Missing starts, open/reopened periods, out-of-window closes and inverted pairs are missing. This is an elapsed span, potentially including pauses/rework; not active accounting effort. |
| Engagement activation | Elapsed milliseconds from engagement creation to its first recorded ACTIVE transition | One selected active engagement | First activation must occur inside the window. Earlier activation or missing/inverted timestamps is missing. This is engagement setup activation, not subscription conversion, successful onboarding or product usage. |

Duration objects disclose `eligible`, `measured`, `missing` and `elapsedMs` (mean). When `measured = 0`, `elapsedMs = null`. Valid coincident timestamps can produce zero elapsed time; absence cannot.

`activeWorkTimeMs` and `improvement` are always null in this version. `baseline` is `NOT_ESTABLISHED`. Client waiting and reviewer elapsed durations are separate measures; overlapping requests mean they must not be summed or subtracted from close duration to infer time saved.

## Coverage and failure behavior

The service uses the existing request tracking parser and retained acceptance bindings, not the sales/POS retention endpoint. It scans request pages, up to 1,000 source requests per client period. It reads at most 100 review decisions per client period/window. Exceeding either limit refuses the report instead of presenting a capped total. The pilot supports ten cohorts. Reads use a repeatable-read transaction and recheck live authority before returning.

Invalid typed evidence causes an explicit report failure rather than a favorable metric. No request bodies, recipient names, private notes, balances, currency sums or individual staff rankings are returned. `excludedRequests` records superseded requests excluded from duration eligibility. Coverage does not establish that off-platform work was captured.

## Interpretation and baseline

Use [PILOT_BASELINE_PROCEDURE.md](PILOT_BASELINE_PROCEDURE.md) to establish prospective coverage and compare like cohorts. Synthetic fixture durations prove timestamp handling, not customer value. Retain the period, observation window, cohort and metric version with any exported research evidence. Do not present a percentage improvement until a reviewed comparable baseline exists outside this version's null improvement field.
