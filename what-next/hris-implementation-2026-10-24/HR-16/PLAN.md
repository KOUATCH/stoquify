# HR-16 — Own-service and personal-data correction cases

IN_PROGRESS. Automatically follows HR-15 under the user's ordered-continuation instruction. HR-15 sealed 107 hashes, zero drift; 18 unit, 15 database/test-store, 60 shared correctness and 11 browser results. HR-12/13/14 scoped evidence remains historical and will be rechecked where touched. Baseline HEAD 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886 plus preserved shared changes.

Current gap: existing own profile/time/payslip owners exist; correction intake is NOT_CONFIGURED. HR-15 adds protected documents but its general-purpose API can serve explicitly authorized HR scope; own-mode must have a distinct server-owned boundary for dual-role users. No generic personal-data case model found in current Prisma schema; PayrollEmployeeBalanceCase is financial and unsuitable.

Bounded plan:
1. Strict own document endpoint and service mode; ignore browser employee selection and remove broader HR authority for own operations. Recheck active mapping/current roles under locks. Existing HR document API remains the explicit HR workspace.
2. Minimal correction case tied to the existing employee, immutable request identity, allowlisted proposed fields, assigned HR owner, retained versions/history and REQUESTED/RETURNED/APPROVED/REJECTED outcomes. Start with existing displayName/legalName source fields; compensation, bank, identifiers, roles, employment status and account email remain outside this owner and link to existing workflows.
3. Deployment-owned reviewed correction configuration supplies permitted field subset, qualified HR reviewer/support owner and policy version. Missing configuration is visibly unavailable; no real reviewer is invented. Submission derives employee from authenticated user. Amend returned requests retains history; duplicate requests/decisions recover exact receipts.
4. Independent current-scoped review with before/after, source version, acknowledgement and reason. Approval calls existing HR employee profile owner inside the same transaction; case/audit/applied business-event link commit together. Source changes cause stale review, never overwrite.
5. EN/FR own workspace connects profile, published schedule, time/leave requests, protected documents and available payslips. Existing published payroll results stay immutable. Show hours/days only from explicit policy units; unknown stays unknown.
6. Independent review, unit/action/component tests, real owned PostgreSQL case/apply/concurrency tests, dual-role/unlinked/revoked browser journeys at 360/768/1440; save evidence and append existing register.

Owned surfaces will be narrowed to new correction service/contract/actions/component and additive case migration; existing self-service/time/document wrappers only where integration requires it. No production schema, live invitation, external messages, country rule expansion or deployment.
