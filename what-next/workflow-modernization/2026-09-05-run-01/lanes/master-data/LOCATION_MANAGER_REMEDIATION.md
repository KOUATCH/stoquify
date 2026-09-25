# Legacy location manager assignment

Evidence date: 2026-09-05. Workflows MD-LOC-03 and MD-LOC-04. Source: services/location/location.service.ts, updateLegacyLocationByIdForOrg, through actions/locations/updateLocationById.ts.

The legacy update accepted raw managerId after resolving only the location's organization. This allowed a foreign or inactive manager reference even though the management path already required an active same-organization user. Four of seven regression cases failed before the correction.

The existing validation helper now accepts a transaction client. The legacy update resolves the location first and validates any supplied manager in that same transaction before writing. An omitted field preserves the current manager; null or empty text clears it. No schema or manager-authority policy was introduced. The existing management paths retain their current behavior.

Verification: seven service regressions and four existing action authorization/scope tests passed (11/11, 6.653s); two-file lint passed. Combined typecheck passed after this correction, session 66025, tool receipt aba48d. Tests mock database collaborators and do not prove a concurrent manager deactivation is serialized with assignment. Real database and browser verification remain required.

Other location findings remain open: multiple default selection, post-commit aggregate refresh failure, deactivation with operating sessions and retained obligations. This bounded correction does not close the whole location workflow.
