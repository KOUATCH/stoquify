# AF05 permission and state matrix

Updated 20 October 2026. These are presentation and service boundaries, not a replacement permission store.

| Actor or condition | Visible behavior | Authoritative boundary |
| --- | --- | --- |
| Current firm manager with invite permission and accounting read access | Firm-owned engagement metadata and bounded staff/setup choices | Protected action plus persistent AF04 management session/RBAC/module check before and after the read |
| Manager without a named client mandate | No setup choice for that client; instructions to request client action | AF04 CREATE independently requires the current named mandate |
| Eligible staff with no current consent | Client action required; expiry/revocation shown separately | No assignment or enrollment creates consent |
| Foreign-home accountant | Excluded from firm staff choices; separate-reviewer limitation stated | AF04 rejects foreign staff even on a forged direct command |
| Consent exists, no assignment | Consent and unassigned state shown separately | Unlinked mandates retain existing compatibility semantics |
| Assignment exists, no enrollment | Explicit enrollment required | The grant link is created only by AF04 ENROLL |
| Enrolled draft/suspended/ended engagement | Corresponding restriction visible | Shared delegated resolver denies managed financial access |
| Expired assignment or engagement | Outside-window state | Server dates and AF04 resolver; browser does not extend dates |
| Staff account, action permission or module missing | Unavailable/required state; no “ready” claim | Existing usable-account, RBAC and module intersection |
| Current managed read access | Observation as of the last check | Posting, review, export and independence are checked again by their domains |
| Manager without review authority | Work summary unavailable | Existing delegated work-desk authorization; metadata management alone is insufficient |
| Client owner with invite permission | Named mandate grant/revoke and redacted invitation delivery | Existing client-scoped actions; fresh authentication on mutations |
| Missing/stale identity or lost permission/module | Private workspace cleared, safe message and retry/identity recovery | Current protect/session/module checks; no authority inferred from navigation |
| Loading/transport failure | Busy status or safe retry; no stale private cards | In-flight sequence invalidation; exact command preserved on uncertain mutation |
| Partial selectors/list/work | Explicit partial labels and engagement continuation | No invented firm-wide totals |
| Failed/deferred/exhausted delivery | Acceptance and delivery remain separate; scheduled retry/operator explanation | Existing durable invitation/outbox records; no UI-owned delivery state |

EN/FR copy, native labels, existing modal focus management, visible keyboard focus and mobile reflow follow the page contract. Executed component and rendered-browser evidence is recorded separately in RESULT.md.
