# AF03 capability contract

This describes the required AF04 intersection. AF03 implements schema constraints and a temporary revoked-mandate enrollment fence, not the future access resolver.

| Situation | Read | Export | Request/review work | Financial mutation |
| --- | --- | --- | --- | --- |
| Unlinked legacy READ_ONLY mandate | Existing resolver | Denied | Denied | Existing domain controls only |
| Unlinked legacy REVIEWER/PREPARER mandate | Existing resolver | Existing resolver permits, subject to caller controls | Existing resolver permits, subject to caller controls | No automatic authority |
| Firm owner/manager without named mandate | Denied | Denied | Denied | Denied |
| Assignment without named mandate | Denied | Denied | Denied | Denied |
| AF03 linked mandate | Denied: must remain revoked | Denied | Denied | Denied |
| Future active managed mandate + current active engagement + current assignment | Intersection of all scopes/windows/permissions | Denied if any ceiling READ_ONLY; domain permissions still required | Denied if any ceiling READ_ONLY; independent review still required | Existing protected domain commands only |
| Suspended/ended/expired engagement or ended/missing assignment | Denied | Denied | Denied | Denied |
| Revoked/expired mandate, missing authority read, inactive actor/client/firm, wrong staff home | Denied | Denied | Denied | Denied |
| External reviewer outside firm | Separate explicit legacy mandate only | Existing mandate and domain controls | Existing mandate and independence controls | No automatic authority |

PREPARER and REVIEWER are not a new ordered permission ladder. Current resolver treats both as non-read-only for EXPORT/REVIEW; this phase preserves that behavior. A future role distinction must be a separately reviewed domain change. Client organization IDs, free-text firm names, engagement ownership and assignment labels are not authority.
