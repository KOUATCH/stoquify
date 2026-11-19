# Source, scope and storage decisions

## Shared source map

| Family | Logical scope/window | Fresh evidence and clearance | Existing destination |
|---|---|---|---|
| Payment suspense | Tenant, current state | Current open statuses and exact retained IDs/revisions; all prior IDs must be explicitly RESOLVED/WRITTEN_OFF before clear | Finance reconciliation |
| Stock availability | Tenant or authorized location, current state | Inventory snapshot completeness plus exact unavailable inventory IDs; positive available stock for every retained member proves clearance; deletion/exclusion does not | Inventory items |
| Receiving | Tenant or authorized location, current overdue state | Existing pending PO statuses and expected delivery date; retained IDs must explicitly be RECEIVED/COMPLETED; cancellation is unknown | Purchase orders |
| Recorded inventory loss | Tenant or authorized location, exact normalized UTC page interval | Existing loss summary plus exact completed-loss line IDs, timestamps and evidence hashes; changing an equal-value record invalidates review; historical loss remains recorded | Inventory loss control |
| Close obligations | Tenant, current state across retained accounting periods | Existing close reader over all retained period boundaries, current findings/runs/certified proof; disappearance of prior periods is unknown | Accounting close |
| Payroll forecast proof | Tenant, current rolling next-30-days UTC horizon | Existing forecast reader with actual transaction-bound payment proof, period IDs and declaration/run bindings including declaration-only obligations; disappearance/aging-out of retained evidence is unknown | Payroll |
| Employee balance recovery | Tenant, current state | Exact open/partially-settled case revisions; retained IDs must explicitly be SETTLED before clear | Payroll payments |

The close/forecast scopes above are explicit policies for the new shared follow-up projection. They do not alter existing center summary queries, organization business-day rules or financial calculations. Current-state keys exclude page name, locale and daily/weekly display interval. Loss uses its reporting interval. Logical identity includes tenant + location/tenant scope + source + source-window version. Retained-member sets are bounded at 1,000; incomplete/capped evidence is unavailable. There is no claim that 1,000 records is full enterprise-scale coverage.

Every read and mutation checks current persisted session, organization, usable account, roles/memberships, source permissions and module/dependency entitlements. Owner and tenant Manager require existing tenant-wide operating authority. Nonwide Digest readers may read only their otherwise permitted aggregates and cannot mutate tenant coordination. Location scope requires current manager responsibility or current tenant-wide authority. Tenant aggregate assignment requires both actor and assignee to have tenant-wide authority; location assignees must independently qualify for that location. Delegation requires controls.manage; without it, only self-assignment/update of unowned or self-owned work is available. Payroll families also require payment-reconciliation permissions and module access.

Available location names are derived server-side from the same tenant and current active/nondeleted location responsibility. The URL selector cannot grant access. Switching scope clears old content. All centers can query the same allowed location identity; no tenant and location aggregates are silently merged. Cross-center consistency is refreshed on explicit reload or focus, not pushed in real time.

## Storage and reuse

Authorized reads synchronize current source observations and retain attributable observation events; they are not read-only database operations. Six additive models store only coordination: occurrence, immutable event, review state, immutable receipt, notice, and actor preference. No private monetary/payroll payload is copied into a generic task record. Source hashes/member references stay server-side except the opaque revision tokens needed for optimistic concurrency; primary business copy uses labels. The recent UI history explicitly shows at most five events, while all immutable events remain retained.

Existing assurance incidents, accountant requests, reconciliation and branch close retain their own lifecycle and guarded commands. Generic aggregate coordination does not supersede an incident owner or a source approval. Unsupported source/scope adapters fail closed. Repeated unchanged detection does not insert a new occurrence or enqueue notices.

## Notification delivery decision

The existing signal rule and notification preference decision functions are reused. Their general background worker is not used: these are user-initiated coordination transitions with recipient/source authority rechecked inside the same transaction, delivered only as in-app panel notices on authorized reads. Queue insertion is atomic with assignment/event. Publication is atomic with the permitted read; failure leaves PENDING, and the next visit retries the same identity. There is no external delivery side effect, so an external transport retry/backoff/dead-letter claim would be misleading.

The actor can disable in-app follow-up notices or specify UTC quiet hours. Pending notices resume on a later authorized visit outside quiet hours. Published notices are retained until marked read and are not presented as repeated new transitions. The current owner, active condition and current source permissions gate every notice. There are no notifications to real users in fixture verification.
