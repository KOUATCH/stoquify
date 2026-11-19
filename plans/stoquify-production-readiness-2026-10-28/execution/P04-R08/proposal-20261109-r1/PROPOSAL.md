# P04-R08 — item-list module enforcement

**Unimplemented; separate implementation authorization required.**

The independently reviewed EN and FR actual Refresh requests returned 506-byte responses containing new synthetic private item data after a committed inventory grant suspension. Current role permission remained valid. Native business/session/audit state did not change.

The exercised chain is getOrgItems → requirePermission('inventory.items.read') → listActiveItemPayloads. The inventoryAction wrapper handles errors; the page's withInventorySurfaceAccess module gate does not protect the directly callable server action. This finding does not invalidate the separately qualified upload-delivery module guards or R03's bounded error-response verdict.

Refresh these current call chains and aliases, then add the smallest authoritative server-side inventory read-module guard before private data access. Preserve current tenant/object/role checks, public error envelopes and authorized reads. Qualify actual signed-session suspend/restore negatives and positives with both response and native database evidence. Do not change production flags or treat hiding a UI control as enforcement.

Dependencies: P01, P02, P04-R01, P04-R03. R08 must precede R07's module-denial recovery qualification. R06 and R08 can be independently scoped under explicit file ownership; integrate their source changes into one refreshed candidate before closing dependent browser evidence.

Rollback leaves production admission blocked and preserves evidence. No commit, push, production data/flags or deployment. Exact first action: refresh the server-action/service/module guard map and hashes against [V02 evidence](../../P04-V02/qualification-20261109-r1/RESULT.md), then review one bounded repair and isolated verification recipe.
