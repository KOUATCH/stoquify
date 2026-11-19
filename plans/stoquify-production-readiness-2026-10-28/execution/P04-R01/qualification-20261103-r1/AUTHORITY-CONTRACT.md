# P04-R01 authority contract

3 November 2026. Authorized bounded repair; parent P04 and production gates remain blocked.

Operating scope currently derives from stored admin, administrator or super_admin codes (trimmed/lowercase), or stored wildcard super-user authority, plus dashboard.read. Codes are authority, including latent empty-permission reserved roles. Keep existing normalization; do not invent a second spelling policy.

A grantor must possess current effective tenant-wide operating authority to create or confer a reserved code, even with no permissions. Read actor permissions and codes from tenant-scoped persisted roles under the existing transaction locks; never trust supplied isSuperUser or a role label. Existing explicit permission-grant, role-management, freshness, tenant, custodian and no-self-change controls remain independently required. Wildcard does not bypass explicit permission-specific grant restrictions.

For ordinary role changes, compare recipient combined before/after effective authority. A location-limited grantor cannot activate tenant scope by adding dashboard.read to a recipient who already holds a reserved role, including through shared-role editing. Reactivation and replay must reauthorize the grant rather than treating the resulting elevated state as prior approval. Metadata-only edits and authorized reductions remain permitted where existing rules allow them.

Invitation issue/replacement, delivery and redemption must bind stored issuer codes and target code, with fresh issuer checks. New receipts record both codes and stored permissions. Existing ordinary-role receipts remain usable only against a current ordinary code; legacy reserved-role receipts lacking contemporaneous code evidence fail closed and require separate reviewed replacement. No evidence is rewritten, invitation automatically reissued or provider transport enabled.

Access-request preview/approval must apply the same ceiling and application must recheck in the locked member-access transaction. Previews cannot authorize a later mutation.

Verification must distinguish pure/mocked tests, native PostgreSQL/actions with authentication transport limitations, actual HTTP/browser evidence and hosted acceptance. Denials must preserve business state and expose no private payload. Evidence includes baseline/current hashes, negative and positive cases, composed authority, expired/revoked/changed authority, contention/rollback, cleanup and independent review.

Recovery: retain fixtures and evidence; do not roll back to exploitable policy, rewrite production roles, change production flags, commit, push or deploy. Original historical failure stays intact.

Custodian recovery refinement: where a usable tenant-wide grant custodian existed, role permission removal, member role removal and account deactivation must retain at least one. This combines the existing explicit role-custodian predicate with current effective tenant-wide operating authority; a permission-only custodian cannot restore a reserved role under the new ceiling. Existing fresh-tenant owner bootstrap remains outside delegation and unchanged. Metadata-only reserved role edits remain permitted because the stored code is immutable; permission additions require tenant-wide grant authority, while reductions retain both custody checks.
