# HR-06 — Complete People discovery

Status: VERIFIED for the scoped service, action and component journey. Baseline 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886 plus inherited edits. HR-05 exact authority and denial evidence passes in this same candidate.

Owned production changes: services/payroll/employee.service.ts; new services/hris/people-directory-query.ts; actions/hris/employee.actions.ts; components/hris/HrisEmployeeDirectoryTable.tsx; People page.tsx, loading.tsx and error.tsx. Relevant action/query/database tests and the synthetic browser harness are owned. Generic table hooks and unrelated routes are unchanged.

Search (name/job/department), exact department and status filters run in the database under the authorized tenant/team IDs. Offset pages use displayName then unique id ordering. Filtered and authorized totals are explicit; existing summary readiness/mapping counts are labeled as page-only. Each page/count operation uses a repeatable-read transaction. Navigation requests see current data: concurrent inserts, renames or removals may change page boundaries between requests, while a stable dataset has no duplicate/omitted records. No new index or migration was needed for the tested 200-person data.

GET filters preserve locale and browser history, reset the page on submission and clamp stale page numbers. EN/FR labels, a keyboard-focusable horizontal table region, empty state, localized loading/denial and retryable failure are present. Failures do not become zero counts. Server actions whitelist filters and derive actor/tenant from protect/RBAC.

| Acceptance | Result and artifact |
|---|---|
| AC01 PASS | postgres.json: 0/1/50/51/100/200, direct last-record search and count. |
| AC02 PASS | postgres.json: duplicate names, exact ID set over every page, clamp. Snapshot policy above. |
| AC03 PASS | postgres.json: manager has 199 remaining active reports, cannot see other tenant's last record; exact profile remains redacted. |
| AC04 PASS | browser/results.json: EN/FR at 360/768/1440, keyboard search, next/back, scoped roles and no outer-page horizontal overflow. Six screenshots; French 360 visually inspected. |
| AC05 PASS | unit.json: count failure propagates; browser error shows unavailable/retry and no table/count. |

Source inspection is distinct from tests. Mocked/pure lane: 55 tests across eight suites (including HR-05 regressions), all passed. Real PostgreSQL: 12 cases (four HR-05, seven discovery, one browser matrix), 39 intentionally deselected earlier cases, cleanup passed. Focused TypeScript: zero diagnostics. Browser uses actual React components and actual service/PostgreSQL with a synthetic role-cookie and Next navigation boundary. It is not full Better Auth/session/middleware or screen-reader certification. The denied/own fixture roles fail the real service before data; manager has its real relationship subset. Failure injection is explicitly synthetic.

Initial postgres-initial-timeout.json records a 30-second manager case timeout while compiler/build work ran. Redundant current-time relationship predicates were removed from the current-only scope query; the same 30-second per-case bound then passed. The browser matrix has its own 180-second bound. This is synthetic functional evidence, not a production performance benchmark.

Review: complete authorized predicates precede pagination; counts do not disclose another tenant/team; raw sensitive fields are not searched. No employee master duplication, permission expansion, provider or statutory rule change. Architecture, IAM, data/QA, HR workflow and localized UX apply. AI, inventory, payments/rates and deployment are not applicable. Rollback: restore compatible UI/service pair; disable discovery or label any capped fallback incomplete. Preserve employee/history data. Next: HR-07 admission assurance, then HR-08 aggregate decision.
