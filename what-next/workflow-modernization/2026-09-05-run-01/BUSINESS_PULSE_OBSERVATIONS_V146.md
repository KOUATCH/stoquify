# Business pulse: evidence before prioritization

## Findings

Current source assigned high severity to a sales decrease of 100,000 currency units without an organization-specific policy; it used the same cutoff for XAF, EUR and USD. Five low-stock items triggered another escalation. Risk scores of 30, 50, 55, 75 or 80 were constants. A negative daily comparison was presented as monetary impact. The data contained no measured loss, demand, trading-hours assessment, assigned task, deadline or owner, yet suggestions said Today, Sales manager and Inventory lead.

The comparison uses today's recorded orders and the whole previous calendar day. Treating it as a like-for-like performance decline was unsupported. Zero completed transactions independently created a risk even when no operating schedule was known. Empty action copy implied no urgent action, and the risk component colored the first two positions as danger irrespective of assessed severity.

## Delivered changes

- Preserve the actual sales, transaction and stock observations and useful links. Explain the asymmetric comparison explicitly in EN/FR. Changes use neutral movement semantics rather than improved/worsened performance judgments.
- Replace Business pulse's risk payload with a typed unassessed observation: informational severity, null score, null urgency and null monetary impact. The existing assessed-risk contract and its producers retain their types and values.
- Remove inferred zero-activity risk, arbitrary escalation thresholds, assigned owners and deadlines. A zero day remains visible in the actual KPI. Suggested reviews remain available without claiming an assignment.
- Explain that an empty list does not establish healthy operations, full source coverage or absence of risk. The stock and sales observation details and their limitations are both visible.
- Make shared radar color follow severity rather than row number, show unassessed urgency explicitly, and retain currency minor units for other consumers' monetary values. Shared empty copy now avoids an unsupported absence-of-risk inference. Business pulse overrides the action board's empty copy.
- Stop filling sourceMaxUpdatedAt with the report-generation timestamp. The source-update maximum is not queried and is now null. A fresh local read still does not prove synchronization completeness.

Historical graph hint `analytics_get_sales_analytics_ts` locates the legacy analytics action family; current source confirms Business pulse uses the service composition, link resolver and shared BI display. The shared radar is also used by CashCommandDashboard and OwnerWarRoomDashboard; their focused render regressions passed. This does not validate their scoring methodologies, which remain separate review work.

## Operator guidance

Open `/en/dashboard/analytics` or `/fr/dashboard/analytics`. Read the period, site and comparison explanation. Use Suggested reviews / Examens suggérés to investigate observations; no task has been assigned by this report. Display order is not an urgency ranking.

For sales interpretation, obtain actual opening hours and a suitable comparable trading period from the location manager, then use the scoped sales report. A negative difference is not proof of loss, fraud or missed sales. For stock, obtain demand, lead-time and incoming-stock information from the authorized inventory/purchasing operator. The source reorder point remains the configured per-location inventory value. Actual work assignment belongs in an authorized work process with a real assignee and deadline.

No new input, approval record or subscription is needed to use these observations. If the organization wants automated scored priorities later, it must specify and validate the relevant policy and evidence; this batch does not fabricate one or clear X1.

## Verification and limits

Final receipts and source hashes are in `evidence/pulse-observations-v146.json`. Focused service and shared BI tests include three currencies, large differences, fifty low-stock items, zero activity, nullable assessment fields, no assignments, the full-day comparison limitation and neutral rank coloring. Cash and owner dashboard render checks cover the affected shared consumer boundary.

Owned PostgreSQL and actual EN/FR browser journeys cover zero activity and two populated observations. A real POS sale is committed through the domain service; only its orderDate is then backdated in the isolated reporting fixture to exercise the previous-day bucket. This date edit is fixture setup, not proof of a production correction workflow. Read snapshots compare the fixture's financial and stock records before/after; they do not enumerate every database table. Six screenshots cover desktop, tablet and mobile, with keyboard focus and no page errors. French mobile was visually inspected; some shared badge strings remain English.

No migration, provider operation, external message, live activation or deployment. Local route timings are development observations, not production benchmarks. A migration-bearing default build was not invoked. Full screen-reader, zoom, localization and long-running data freshness coverage remain incomplete.

## Review and rollout

Architecture/backend/data: observed facts and assessed risks are distinct types; stored domain facts and transactions are unchanged. Security/IAM/privacy: existing permission resolver and destination controls are retained; no access expansion. Product/UX/accessibility/localization: explanatory limits and EN/FR text are visible; full accessibility remains open. Finance/controls/audit: no measured-loss or assignment claim is inferred from a comparison; no posting or approval changed. QA/SRE/support: focused regressions and owned runtime evidence, no production performance claim. Statutory/country-pack, payroll, AP, providers, offline replay, AI/agent execution and commercial packaging: not applicable to these read-only changes; their domain transitions are unchanged.

Roll out through the existing reviewed application release process after remaining release requirements. If rollback is needed, revert only this batch's seven production files as a reviewed patch; preserve unrelated changes and do not reset the branch. No database rollback is required. Returning to the previous presentation reintroduces unsupported assessments and must be recorded.

Remaining engineering work includes full Business pulse localization, source completeness and actual freshness, precise stock drill-through, inactive-site semantics, pointer stability, failed-load recovery, accessibility, volume performance and the rest of the platform workflow register. The whole assignment remains incomplete.
