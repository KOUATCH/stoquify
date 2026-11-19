# HR-13 operating and rollout notes

## Verified software scope

Roster routes are `/[locale]/dashboard/people/roster` and `/[locale]/dashboard/people/me/schedule`. HR administration links to the selected employee; self-service links to the employee's published view. Exact supervisor scope is resolved by the existing organization owner. HR permission owns preparation/publication/import/repair; preparation and publication require different actors. Existing setup reviewer grants remain supported by the native schedule owner.

Office patterns retain all seven weekday capacities. Dated plans carry explicit local dates, timezone, timestamp offsets, shifts and unpaid breaks. The whole shift belongs once to its local start date. Finite plans expire into the older recurring pattern; the UI explains this fallback. Forward-start plans leave predecessor bounds/status/hash unchanged. Only a same-interval reviewed correction retires its predecessor. Historical plans and frozen payroll evidence remain retained.

Preview UTF-8 CSV with exact columns `sourceRecordId,employeeId,workDate,scheduledMinutes,workedMinutes,absenceMinutes,overtimeMinutes`. Guided import is bounded to 1–200 rows and 256 KiB. Native import remains bounded to 5,000 rows. Employee IDs and provider record IDs are explicit; scheduled minutes are not used as invented worked time. Import receipts reconcile new accepted, rejected and unchanged rows. Same source content can recover a retained receipt after a filename change. Changed provider values or a second validated daily total require the existing correction owner.

Invalid known observations remain REJECTED with OPEN anomalies. A new independently evidenced valid source record for the same employee/date can replace rejected input; anomaly repair links that replacement without deleting the original. A status-only dismissal is refused. Unknown employee/date/duplicate-identity input is rejected before a batch is created. Approved corrections retain the original observation and flow through the existing snapshot revision chain. Any contributing importer, including expanded cross-period source dates, cannot independently certify the period.

## Migration and generated client

`20261024143000_hris_schedule_revisions` adds revision default 1, predecessor relation and optional shift-plan JSON; replaces the date unique constraint with date+revision uniqueness and a partial ACTIVE date uniqueness constraint. Existing row data is retained. DDL first application and replay ran only on owned synthetic PostgreSQL 17 at loopback port 55464, database `stoquify_local_hris_20261024`; the preflight had zero schedule rows. This is not a deployed migration-history claim.

The isolated Prisma config loads no application environment or seed. Validation passed. Generation updated runtime/types but encountered the existing locked engine DLL. Recovery verified identical installed/package engine bytes, matching generated runtime inline schema and expected DMMF fields, then synchronized only the generated schema text. The project ensure-client verifier passed without generation fallback. No user process was stopped. Failed attempt and recovery logs are retained.

Before real deployment: quiesce old schedule writers, review actual legacy midnight/collision rows, apply the migration through the existing release gate, generate the matching client, then enable the new writer version. Do not run the historical role seed over revised schedules: its revision-1 upsert can conflict with retained history. The old date-only client and revised writer must not run concurrently. No live backfill or promotion was performed.

Rollback suspends new schedule publication/import/certification through existing access/module controls and retains all rows and snapshot lineage. Reverting to an old date-only writer after multiple revisions exist is unsafe. Do not delete revisions or undo consumed payroll; use existing correction workflows.

## Remaining pilot decisions and evidence limits

Choose an actual employer/team, reviewed office/shift patterns, break rules, overtime eligibility and attendance source before enabling a live pilot. Holiday work is blocked where the reviewed calendar excludes the date; no legal exception is invented. No new country admission, statutory rate, provider, biometric collection, scheduler, production policy or deployment was activated.

Browser evidence uses real components, CSS, service owners and PostgreSQL, with synthetic local HTTP roles/actions and navigation adapters. It does not prove a full authenticated Next.js session, production latency, all assistive technology, or a legal/accounting/privacy certification. The guided form creates a single dated shift/break and preserves additional retained intervals during revision; arbitrary split-plan authoring remains available in the validated native contract, not a new drag-and-drop editor. Manual evidence references remain until HR-14 introduces controlled review acknowledgements.
