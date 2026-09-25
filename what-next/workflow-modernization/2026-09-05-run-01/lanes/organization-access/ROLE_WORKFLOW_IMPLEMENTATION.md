# Role creation and editing — implementation continuation

Evidence date: 2026-09-06. Branch: `codex/migration-control-plane-release-2026-08-29`. Commit baseline: `a05a41ef66cd5d98fd69ae3df18225795f912232`; implementation is in the existing dirty working tree. Unrelated changes are retained. This continues OA-ROLE-CREATE and OA-ROLE-UPDATE; it does not close the platform workflow review.

## Delivered behavior

- The existing `/en/dashboard/settings/roles/new` and `/fr/dashboard/settings/roles/new` routes open an actual server-owned catalogue. Editing uses the existing locale route `/dashboard/settings/roles/update/<role-id>`.
- English/French names, a bounded purpose description, searchable grouped permissions, explicit unavailable controls and a separate consequence review replace the legacy checkbox form. Existing unknown permission values remain visible and retained until explicitly removed. A selected permission is a draft choice, not an approval or operational health result.
- The editor uses the existing dashboard page theme, inherited navigation, shared controls, focus feedback and responsive layout. Actual screenshots exposed a missing page-level token scope and duplicate generic notifications; both were corrected. Access-denied guidance now has EN/FR text, attention semantics and a useful administrator handoff.
- Every create/update passes the actual password-confirmed session to the role service. Current organization, account, role membership, permissions and session assurance are checked under transaction locks. A stale role version cannot overwrite a newer record.
- Create and update requests carry an in-tab request identifier. The role and mandatory audit record commit together. The same accepted command returns its existing result without another mutation; changing a previously accepted command or replaying after another edit requires a new review. Audit failure rolls back the role.
- Additions require assignment authority and the grant ceiling; removals require removal authority. A test exposed that canonical assignment/removal names share old aliases. These checks now use stored grants so a canonical assignment permission does not imply canonical removal permission. Explicit historical grants that intentionally covered both remain supported. Critical accounting permissions cannot be granted through wildcard status.
- Renaming preserves the existing canonical role code. Empty descriptions can be cleared. Duplicate names and invalid inputs have distinct recoverable feedback.
- A role edit cannot remove the final currently active, verified, unlocked role custodian if one exists. The measured custodian capabilities are `roles.read`, `roles.create`, `roles.update`, explicit-or-recognized-legacy role permission assignment/removal, `users.invite` and `users.roles.assign`. This preserves an existing custodian; it does not assume that every organization already has one.
- Authorized audit readers see the latest ten role-change records, their recorded time, record ID and recorded permission deltas. Absent details in older records remain explicitly unavailable. A failed history query is an error, not a successful empty history. Audit-command fingerprints and private session material are not returned in this view.

## How to use it

1. Open the role creation route in your current organization, or edit an existing role through its ID route. You need the corresponding role-create/update permission; the server checks it again when saving.
2. Enter the English role name; optionally add its French name. Obtain these names and the responsibility description from the job/responsibility definition agreed with the relevant manager. These are role labels, not employee names.
3. Select the permissions needed for that work. Use the manager's responsibility list and the organization's access matrix. Unavailable controls explain that your authority does not permit the change. Higher-impact labels help identify consequential operations, but do not substitute for the operation's own required controls.
4. Review the permission additions/removals and outstanding responsibilities of people with that role. Removing an operating permission does not delete business records or cancel their obligations.
5. If requested, enter your own current password in the application, confirm identity and explicitly save again. Do not send passwords in chat or place them in reports.
6. Use the saved status and, with `controls.audit.read`, the recent history section to inspect the actual result. These records establish a role change, not a professional or product approval.

## Recovery

- **Duplicate name:** choose another role name. Renaming an existing role does not change its canonical code.
- **Stale draft:** refresh the record, then keep your edited fields over the latest record or use that record. Permission additions/removals are combined with the newer selection; review again before saving. Conflicting field edits require the user's deliberate choice.
- **Uncertain response:** retain the current page and choose the same-save retry. The request identity and payload are retained in that tab. The database/browser checks include a response lost after commit; the retry creates no second audit.
- **Identity confirmation:** confirm in the application, then save again. Confirmation itself does not perform the role change.
- **Lost permission or locked/inactive account:** contact the current workspace administrator. No client-side choice restores authority.
- **Last administrator:** arrange another authorized active custodian before removing the final custodian's required role permissions. Do not bypass this check by editing stored grants directly.
- **Full tab closure or refresh with unsaved work:** draft/request persistence across a closed page is not implemented. Inspect the current role catalogue and records before recreating a potentially accepted request. In-tab recovery is verified separately from this remaining limitation.

## Rollout and operational limits

No schema change, migration, external provider activation, email, production deployment or existing-customer mutation was performed. Existing role IDs, routes and canonical codes are preserved. The additive request contract is wired to the existing form/actions; other callers must supply a unique command and, for updates, the reviewed role timestamp.

Deploy through the repository's normal reviewed release process after the remaining role/member checks. Observe role-command failures, lock timeouts, audit failures and stale-edit outcomes. On an uncertain save, inspect the scoped role/audit record before retrying. Do not roll back this service to the former unaudited writer to clear a failure. Reverting UI code requires retaining the new command contract, or disabling the affected write entry point until compatible UI is restored. No production performance budget or release certification is claimed.

Remaining engineering work includes role list/row-action authorization and failed-query presentation; complete member assignment/deactivation with coordinated custodian protection; invitation-grant alias implications; history pagination/export and retention review; tab-close draft recovery; native zoom, actual screen-reader and full contrast review; and wider workflow coverage. These are open engineering responsibilities, not fabricated external approvals.

## Review responsibilities

| Responsibility | Assessment and practical limit |
| --- | --- |
| Architecture/backend/API | Thin authenticated actions, service-owned read/write contracts and one transactional command boundary. Existing read-list compatibility is preserved; list navigation still requires review. |
| Data/migrations | Existing Role/AuditLog tables support durable request identity, revisions and atomic history. No migration. Historical permission values are retained explicitly. |
| Security/IAM/privacy | Current server-derived authority, tenant/object isolation, fresh session, grant/removal checks and audit-read gating. Scope includes role commands; other membership writers remain open. |
| Frontend/UX/localization/accessibility | Actual EN/FR form, denied state, drafts, review, focus and responsive paths. Permission identifiers remain visible for precise administration alongside translated subject/action labels. No accessibility certification. |
| Product/operations | Role purpose and consequences are explicit; existing records/obligations are retained. Requests are attributable changes, not approvals. |
| Finance/accounting/controls | Critical grants cannot rely on wildcard status. Existing financial operations retain their service controls. No posting, monetary or ledger behavior was changed or certified. |
| Audit/records | Mandatory atomic before/after/delta evidence, scoped audit-read history and honest older-record gaps. No signature, tamper-proof retention or professional approval claim. |
| Quality/release | Focused units/actions/forms plus guarded PostgreSQL and actual browser verification. Exact final receipts and source bindings are recorded in the checkpoint. Full release remains open. |
| SRE/performance | Bounded ten-second write transaction, organization-level serialization, ten-record history and safe retry. Development route times are observations only; no production certification. |
| SaaS/module packaging | Existing settings route and observe-mode module policy remain; role permissions do not establish commercial eligibility. No price/subscription change. |
| Statutory/country packs | Not applicable to rule calculation: no statutory or country configuration changed. Operational role changes still require the existing domain controls. |
| POS/offline, purchasing, payroll | Role access can affect these consumers, but their business transitions are unchanged. Platform-wide member lifecycle consistency remains an explicit dependency. |
| Events/providers | No new provider or external message. Existing invitation-role revision/authority boundaries and alias implications need connected verification. |
| Analytics/data governance | Retained audit records now identify role changes. No analytical measure or reporting pipeline changed. |
| AI/agent governance | No agent activation/approval is performed. Agent-related permission choices remain subject to the actual downstream approval controls. |

All entries are engineering review responsibilities. None is professional, release, X1 or security certification.
