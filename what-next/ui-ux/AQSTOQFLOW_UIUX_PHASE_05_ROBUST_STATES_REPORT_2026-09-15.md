# Robust states — analytics access

Applied `aqstoqflow-uiux-05-robust-states` to the shared analytics access wrapper. Distinguishes five RBAC failure reasons in EN/FR, offers appropriate existing recovery routes, preserves authority and reuses DashboardRouteState.

Scope, operating guidance, review responsibilities, verification and limits: [Analytics access record](../workflow-modernization/2026-09-05-run-01/ANALYTICS_ACCESS_V149.md). Machine-readable receipts: [Evidence](../workflow-modernization/2026-09-05-run-01/evidence/analytics-access-v149.json).

Full dashboard, authentication, accessibility and platform release verification remain incomplete. No migration, production deployment, external message, live payment or X1 clearance.


## Daily Digest follow-up

Applied the same robust-states skill to Daily Digest access, loading and fresh-server retry, with server-owned timezone correction. [Implementation, review and limits](../workflow-modernization/2026-09-05-run-01/DAILY_DIGEST_RECOVERY_V154.md); [source-bound evidence](../workflow-modernization/2026-09-05-run-01/evidence/digest-recovery-v154.json). 32 tests and owned EN/FR recovery passed; complete workflow and release remain unverified.
