# Role catalogue and registration follow-through

Evidence date: 2026-09-06. Source baseline v25, branch `codex/migration-control-plane-release-2026-08-29`, HEAD `a05a41ef66cd5d98fd69ae3df18225795f912232`; dirty user work preserved.

## Delivered and verified

Open `/en/dashboard/settings/roles` or `/fr/dashboard/settings/roles` in the authenticated application. Readers can search role names/descriptions. Only authorized creators see Add Role; only authorized editors see the row menu. The menu keeps the locale when opening the existing editor. A failed role query shows retry guidance without false zero totals. Controls wait until the page is interactive before accepting input. Existing table, overlay, button and dashboard tokens are reused.

EN/FR browser proof verified actual filtering, hidden reader controls, editor navigation, Enter/Escape and focus return, dark overlay background, no page errors and reflow at 390/768/1440. Three unit cases cover failed reads and permission/localization props. Typecheck and changed-file lint passed. Exact source hashes, commands' result references, 12 screenshots and earlier failed attempts are in `../../evidence/role-catalogue-and-registration-receipt.json`. Browser latency is a local development observation, not a performance certification.

The separate French standard registration proof succeeded after the real IP cooldown expired. It created one unverified account, matching credential, password history and registration audit, then showed the French verification page. No active session or email-sent audit existed. No counter reset, client identity change, delivered email or completed onboarding is claimed.

## What the user supplies

- To browse: an existing organization account with `roles.read`, assigned by an authorized administrator. Search text comes from the role name or its description; no approval document is required for a read.
- To create/edit: use Add Role or the row menu. Supply the English name, optional French name and description, and only the necessary permissions from the service-owned choices. Obtain the job responsibilities from the role owner. The editor shows exact permission changes, requests your own password when fresh authentication is needed, and requires an explicit Save afterward. See `ROLE_WORKFLOW_IMPLEMENTATION.md` for stale/retry behavior.
- A missing editing control means this session lacks the corresponding permission. Contact your organization administrator; a catalogue checkbox does not grant authority.
- Registration: the verification code must come from the actual delivered message. The local proof environment deliberately has no delivery; its screenshot cannot supply a usable code or establish verified ownership.

## Remaining and recovery

Refresh a failed catalogue read; it performs no role mutation. There is no schema change. Reverting the page/columns restores the previous display but would restore the misleading failed-read behavior. Role command/audit records remain owned by their existing service.

Runtime database-outage presentation, native zoom, screen reader and complete contrast review remain open. French shell navigation outside this page still has English labels. Mobile proof captures the first fold, with widths checked independently. Member deactivation/assignment, coordinated last-administrator safety, and invitation aliases remain under review. Finance, statutory, tax and billing behavior: not applicable to this bounded read-only catalogue change. Identity registration delivery/onboarding remains a separate incomplete workflow. No whole-workflow/platform release, X1 or security certification.
