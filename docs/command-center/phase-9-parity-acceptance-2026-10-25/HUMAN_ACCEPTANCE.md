# Command Center human acceptance handoff

These checks require a person using the product. Automated browser checks, synthetic fixtures and developer judgments do not count as completion.

Use a newly provisioned disposable workspace with synthetic records. Never reuse production credentials or send external messages. Capture the tested source revision, browser, operating system, assistive technology version, locale, role, viewport and date.

| Check | Procedure | Acceptance | Status |
| --- | --- | --- | --- |
| Screen reader | On Manager, Owner and Daily Digest, use landmark and heading navigation; switch Brief/Command/Investigate; inspect a filter, loading/unavailable state and proof drawer. Repeat with English and French, including location manager access. | One main landmark; meaningful headings and control names; mode state, errors and status updates announced; drawer title and focus return understandable; no inaccessible permitted action. | Requires human run |
| Native zoom | At actual browser zoom 200% and 400%, navigate all three modes and follow-up controls by keyboard on each page. | Content remains readable; controls and focus remain reachable and unobscured; no lost operation or two-dimensional page scrolling except genuinely two-dimensional data. | Requires human run; viewport emulation is separate evidence |
| Productivity | Recruit representative manager, location manager and owner users. Give equivalent synthetic scenarios before/after, without coaching: identify highest priority, explain its source, identify next action and assigned follow-up. Record participant and task counts, completion time, errors, assistance and failures. | Proposed top-priority/next-step target: 30 seconds. Report actual distribution and failure cases; product owner confirms threshold. Do not infer improvement from automated timings. | Requires representative users |
| Representative workload | Agree realistic locations, users, source actions and follow-ups, then test in a disposable environment under representative concurrency. Separate cold start, server response, interaction and database timings. | Product owner agrees response-time and capacity thresholds before certification; preserve all permitted queue items and disclose limits. | Requires agreed workload and thresholds |

Record results per task and participant using anonymous IDs. Keep failed observations in the report. A successful automated run does not close these rows or authorize production deployment.
