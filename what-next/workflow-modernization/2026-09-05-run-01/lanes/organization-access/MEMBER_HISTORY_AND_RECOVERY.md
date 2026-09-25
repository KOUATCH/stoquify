# Member history, exports and refresh recovery

Current implementation checkpoint: 2026-09-06, source v30. This updates the history and refresh limitations recorded in `MEMBER_ACCESS.md`; its original v29 evidence remains historical.

Open **Settings → Users → Member access** for an existing member. The route is `/{en|fr}/dashboard/settings/users/update/{memberId}` inside the existing authenticated shell. Select the member from the directory; do not invent an identifier or use a different organization's link.

## Read older records

An authorized audit reader can inspect role changes, deactivation and reactivation in pages of up to 20 records. **Older records** and **Newer records** keep the original upper boundary, so newly added changes do not shift records between pages. **Reload current history** starts a new view with current records. The page displays its scope and recorded-through time in UTC. An empty history appears only after successful reads; a failure hides the records and export controls and offers reload.

Each entry exposes a bounded reason, timestamp, change reference, acting-user reference and added/removed role references. It excludes raw audit payloads, session proof, fingerprints, IP addresses and user-agent data. Current `users.read` and `controls.audit.read` permissions are required, along with a usable same-organization account. The member may be inactive; account deactivation does not erase these records.

## Download a reviewed page

1. Open the page of records you need. A download contains only that page, at most 20 records. Older pages can be downloaded separately.
2. Choose **Export this page (CSV)**. This requires the separate `reports.export` permission. Ask an authorized role administrator for access if the screen explains that download is unavailable; audit-read access alone does not permit export.
3. If prompted, enter your own current password and confirm it. Obtain this from your normal account credentials, never from another approver. Password confirmation does not automatically export: choose **Export this page** again.
4. Keep the CSV and its export reference together in an organization-approved private location. The file contains organization/member scope, generation time, recorded-through time, page boundary, row count, watermark, page hash and the reviewed records.
5. If the browser blocks downloading, use **Download prepared page again**. This retries the already prepared file without issuing another export. A failed preparation has no confirmed file; review the current history and retry.

Current authority, the exact password-confirmed session and the reviewed page hash are rechecked in the service. The export audit must commit before a file is returned. CSV cells neutralize spreadsheet-formula prefixes. The server records the SHA-256 of the exact UTF-8 bytes; those bytes travel encoded and are restored for download. This avoids the UTF-8 marker loss found in the first real browser run. English and French downloaded files now match their recorded audit hashes.

The export reference is a download audit record, not a product approval or signature certificate. A file hash proves byte equality, not signer identity. Nothing in this workflow clears X1 or grants release approval.

## Recover an unfinished access change

Role selection, reason, reviewed role baseline and any outstanding request identifier are retained in session storage for this actor, organization and member, for up to 24 hours in the same tab. Passwords and session credentials are never stored there. If storage is unavailable, the screen explains that the draft cannot be retained.

After refresh, the page restores the draft only after loading the authenticated member view. It never submits automatically. If current roles or their definitions changed, reload and compare the preserved selection before a new review. If the previous result is uncertain, review and choose **Retry same request**. The server checks current authority and returns the original receipt when appropriate, including when the requested roles are already the current state. A successful receipt clears the stored draft. A definite denial does not become success.

The actual EN/FR browser test interrupted the response after the 24th access change committed. Refresh and explicit retry recovered its original receipt; the audit count stayed at 24. Closing the tab is not covered by session storage recovery. If the tab is gone, inspect current roles and history before creating a new decision. Do not copy a saved request into another organization or account.

## Information and owners

| Needed information | Where to obtain it | Responsible person |
| --- | --- | --- |
| Member to inspect | Current organization's Users directory | Organization administrator or audit reader |
| Business reason and required roles | Member's manager and reviewed role catalogue | Authorized access administrator |
| Audit-read and export authority | Current assigned role permissions, managed through the existing role workflow | Role administrator; separate controls remain effective |
| Current password | Your normal sign-in credential | Acting user only |
| Change or export reference | Recorded receipt and access history | Acting administrator/audit reader |
| Private retention location, duration and deletion policy | Organization's approved records policy; no value is fabricated by the software | Organization records owner with applicable expert review |

## Retention and rollout boundaries

No schema change, migration, live customer change, external email or deployment is included. Roll out source through the existing release process. Review the role/export permissions for a chosen authorized cohort; do not backfill broad grants. Check failed history reads, export failures and unknown mutation results. Source rollback does not reverse a member decision, restore revoked sessions or remove audit evidence; a correction is a separately authorized change.

Current `AuditLog` records belong to an organization through `onDelete: Cascade` in `prisma/schema.prisma`. Scoped source searches found no demonstrated production audit purge or organization-deletion path in the reviewed services/actions. This is not a retention guarantee: organization deletion, legal holds, records retention and audit immutability still need explicit policy and lifecycle review. No arbitrary statutory period or deletion behavior was introduced.

## Verification and review responsibilities

The receipt `../../evidence/member-history-receipt.json` binds current source, 90 focused tests in six suites, seven real PostgreSQL checks, two complete EN/FR browser checks, exact CSV hashes, screenshots, typecheck, lint and service-boundary scans. All runtime changes used fresh synthetic members and roles in owned local databases. Existing organizations, grants and credentials outside those fixtures were unchanged. Desktop, tablet and narrow-mobile reflow, reduced motion, paging focus, dialog Escape/return and failure recovery were checked. Native screen-reader operation, actual browser zoom and comprehensive contrast checks remain open. Development route-ready observations were 8.306 seconds EN and 6.401 seconds FR; these are not approved-budget or production-performance passes.

Architecture/backend/API review covers thin actions, service-owned paging and export state, bounded reads and coordinated locks. Data/security/privacy review covers tenant/object scope, current explicit export authority, session freshness, redaction and mandatory audit. Frontend/workflow/product/accessibility/localization review covers discoverable history, distinct read/export permissions, honest preparation/download states and draft recovery. Quality/SRE/rollout review covers byte mismatch reproduction, database rollback, real interrupted responses, source bindings and unchanged authority. Finance/internal-controls and audit/records review covers durable access/export evidence and retained records; no financial posting or calculation changed. SaaS packaging review confirms no subscription or module entitlement changes. Statutory/country-pack, POS/offline, purchasing/AP, payroll, payments/providers, ledger/close, analytics and AI business behavior are **not applicable** to this batch because it changes member-access history and browser recovery only; they remain in the platform register. These are engineering reviews, not professional approvals.

The whole-platform assignment remains active. Continue with remaining organization/access workflows and the unreconciled platform inventory; this checkpoint does not certify the platform complete.
