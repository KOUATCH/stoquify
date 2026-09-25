# v144 — Business pulse currency, calendar and snapshot

Evidence date: 13 September 2026. Branch codex/migration-control-plane-release-2026-08-29, commit a05a41ef66cd5d98fd69ae3df18225795f912232 plus preserved working changes. [Verification record](evidence/pulse-context-v144.json). The full workflow assignment remains active.

## Corrected behavior

An owned organization configured for EUR received XAF-labelled Business pulse data, including its no-location state. The currency was a constant in the composition service. Calendar boundaries used application-server time, while individual sales readers had moved to organization time; a summary could therefore mix incompatible day/week/month boundaries. Four sales reads and separate counts used independent snapshots.

The new business-pulse-snapshot service validates organization context, selects the default active site, validates explicit site ownership, reads one bounded calendar window of completed/delivered orders and obtains POS/inventory counts in one RepeatableRead transaction. Currency, timezone, period boundaries and observation time travel with the snapshot. Existing Sunday-start week convention is preserved and is now applied in the tenant calendar.

Today, yesterday, week and month derive from the same sales rows. The window begins at the earliest required boundary; it does not scan unlimited historical periods. Daylight-saving days use actual local midnight boundaries rather than an assumed 24 hours. Sales changes retain Decimal arithmetic through aggregation.

Both the brief header and metadata panel format periods using the supplied organization timezone. The timezone is displayed in EN/FR. Missing active site retains the real organization context and shows Unavailable/Indisponible in summary boxes, rather than zero sales. Source provenance uses information treatment instead of success treatment.

Currency rendering now respects currency minor units: EUR retains cents and XAF retains its standard precision. The shared KPI formatter required the same correction; its focused regression verifies €100.25. Header timezone support is optional, so other consumers keep their existing timezone behavior until independently migrated.

## Evidence and practical checks

Owned PostgreSQL checks reproduce EUR→XAF before the change, verify EUR and Auckland periods after it, and retain EUR when the active site is absent. A controlled real POS close is committed after the report reads its sales and before it counts active shifts: the report consistently returns the earlier active count of one, while a fresh read sees zero. The test intercepts the local test client's query boundary solely to schedule this real concurrent close; production code has no test hook.

Focused tests cover local month/week boundaries when the server remains in February, a 23-hour DST day, exactly one repeatable transaction, current tenant/location scope, no-site handling, missing organization, invalid timezone, failed operational count, KPI precision and brief date formatting. Existing analytics authorization and shared BI tests run with these changes.

Actual EN/FR browser journeys use EUR/Pacific-Auckland organizations and real POS draft → sale → void records. They verify exact rendered amounts, visible timezone, three widths, no-site unavailable values and existing permission policy. Eight final screenshots are retained. Local development route-ready observations are recorded, not treated as a production performance certification. Prior browser evidence remains historical where currency rounding was subsequently corrected.

## Use and recovery

Open /en/dashboard/analytics or /fr/dashboard/analytics. The overview accepts the existing reports.read OR dashboard.read policy. The detailed report actions still require reports.read.

The administrator supplies the organization's currency/timezone through existing organization setup/settings and maintains an active site through location settings. Obtain these from the organization's actual operating setup; do not substitute the computer timezone or an arbitrary currency. No additional approval reference or signed document is required for these reads. Changing a currency setting does not convert historical monetary values; this report does not implement currency conversion.

If no active site exists, create/reactivate the appropriate site through the existing authorized workflow and refresh. The unavailable state is a setup prerequisite, not proof of zero trading activity. Invalid/missing organization context or failed queries remain errors, not empty success. Full error-screen recovery and generated French content remain separate open work.

## Rollout and reviewer accountability

No schema, migration, backfill, deployment, provider call, live payment or X1 clearance. Ship the snapshot service, composition contract and affected UI together. Verify staging organizations with different currencies and timezones near month/DST boundaries; monitor query latency, failures and count consistency. The window is calendar-bounded but large-volume organizations still need database aggregation/performance review.

Rollback means a reviewed source change limited to this batch; no financial records should be changed. Former currency and mixed-snapshot calculations are known defective and must not be represented as validated output during recovery.

Architecture/backend/database: one service-owned repeatable snapshot, retained canonical action names, no financial writer changes. Finance/POS/audit: currency labels, monetary precision and consistent observation corrected; operational evidence only, no ledger/statu­tory certification. Security/privacy: existing route policy and explicit organization/location checks preserved. Frontend/design/accessibility/localization: existing shell, small optional header extension, EN/FR unavailable/timezone labels; no second design system. Quality/SRE/release: source-bound unit/database/browser checks with explicit volume and certification limits.

Purchasing/AP, HRIS/payroll, subscription/billing, AI/agents, provider integration and offline admission: not applicable to these read corrections; no behavior changed in those domains. Country/statutory/close: no rules, country readiness or professional approval changed.

## Remaining workflow work

Business pulse remains partially verified. Generated conclusions/actions and shared BI controls still contain English on the French route. Low-stock uses the existing fixed analytics threshold of ten; item-specific replenishment semantics need review. Full action/drill-through lifecycle, zero-activity risk language, explicit inactive-site behavior, operational-health claims, keyboard/enlarged-text/screen-reader coverage and error recovery remain open. Continue these and the wider platform register; no external decision blocks ordinary implementation.
