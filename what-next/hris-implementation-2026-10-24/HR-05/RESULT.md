# HR-05 — Exact manager authority

Status: VERIFIED for scoped manager service/action/component criteria. Current HR-06 combined evidence supplies the integrated role/browser checks. Baseline 9ab93a2a1d81e37ef7e0b10357885b48a3bc5886 plus preserved inherited edits. HR-04 dependency evidence is retained.

Owned production files: services/hris/org.service.ts, employee.service.ts, manager-self-service.service.ts and services/payroll/org-manager-scope.service.ts. Focused tests and the isolated PostgreSQL suite are also owned. No migration or permission expansion.

Target authorization adds the exact employee predicate before any bounded query. Directory authorization collects the complete scope independently of display limits. Delegation org-unit filtering is part of the database predicate. Former-manager policy: the same relationship, assignments, positions, units and delegation must remain valid both now and at the requested date. Historical authority alone cannot grant current access. Inactive employee identities, expired/revoked delegation and durable authority removal fail closed; they cannot revive location compatibility. The legacy fallback remains current-only, read-only and unavailable once durable authority exists. This is a conservative engineering access decision; broader former-manager access requires a separately reviewed product/security grant.

Manager capabilities now derive from the resolved authority. Approval inbox visibility uses complete scope rather than the first displayed roster page. Existing independent approval and sensitive-field redaction remain intact.

| Acceptance | Evidence |
|---|---|
| AC01 PASS | Real PostgreSQL exact reports 2, 51, 200; full 200-ID scope with display limit 1. |
| AC02 PASS | Real foreign/unrelated denials; mocked facade/action tenant derivation. |
| AC03 PASS | Real delegation expiry/revokedAt, historical former-manager and inactive-actor denials. |
| AC04 PASS | Real PEOPLE_READ cannot grant APPROVAL_DECISION; own-only permission denied team scope. |
| AC05 PASS | Mocked minimized manager model strips private identifiers/payment/salary; capability and complete-scope approval tests. |

Verification: postgres.json contains four real database cases, 39 intentionally deselected earlier cases and successful bounded cleanup. unit.json contains current focused service/action results. These do not certify a full authenticated browser session. Focused typecheck has zero diagnostics. HR-06/unit.json has 55 combined mocked tests; HR-06/postgres.json and browser/results.json prove actual service/DB scope through synthetic role browser boundaries. Earlier HR-05/unit.json preserves action fixture failures (new pagination fields and missing logger.warn mock), repaired in HR-06.

Review: existing single employee master and exact tenant predicates; no raw SQL interpolation, new secret, role grant or provider call. Fresh identity/permissions remain derived by existing protect/RBAC actions. AI, inventory, accounting calculation and statutory rates are not applicable. Rollback: restrict affected team access; never substitute tenant-wide queries. Preserve authorization audit records. Next safe preparation: HR-06 scoped server discovery.
