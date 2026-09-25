# Invitation role choices — 2026-09-06

Further ID-03 correction after source v13. The users/settings page now obtains invitation choices from `services/users/user-invitation-options.service.ts`. The UI cannot turn these choices into grant authority; submission still enforces current server permissions, role policy and fresh authentication.

Previously any directory reader saw the invitation form, all readable organization roles appeared selectable, and failure to load roles looked like no roles existed. This sent users through avoidable entry/verification steps before an inevitable denial.

The service now distinguishes:

| State | User experience and source |
| --- | --- |
| Missing invitation/role-assignment authority | An explanation replaces the invitation entry. The user can still read invitations with their existing read permission. |
| Missing role-read authority | Explain the separate permission required to choose a role; no role definitions are queried or exposed. |
| Organization inactive/unavailable | Explain the organization prerequisite; no role query follows. |
| No grantable roles | Explain the lack of eligible roles without inventing role access. |
| Failed role read | Show a load failure and refresh action, distinct from no roles. |
| Ready | Offer current same-tenant roles within the inviter's explicit grant ceiling, using EN/FR names. |

The reader uses the existing grant policy: foreign roles, target wildcard roles and permissions outside the actor's explicit grant ceiling are excluded. Wildcard alone does not satisfy critical invitation authority. Grant authority does not silently create permission to read role definitions. Active organization and role reads use one repeatable-read transaction. Returned options contain only labels and IDs, with a check time; they do not serialize entire permission sets.

The page uses authenticated organization and permissions. Its read failure is logged through the safe action logger and displayed explicitly. The existing form accepts the server-owned availability state, clears any password/closes when availability is lost, and preserves its established ready-state workflow. No new permission, module grant, schema or migration is introduced.

## Operation and remaining work

Open `/en/dashboard/settings/users` or `/fr/dashboard/settings/users`. A user who only reads the directory sees why inviting is unavailable. An authorized inviter chooses from current eligible roles. If role-read access is missing, the organization administrator reviews that existing permission. If no suitable roles exist, the administrator reviews actual job responsibilities and the role definitions; the user does not fabricate role IDs. A failed read calls for refresh/support, not new role creation.

Input sources remain: colleague or verified organization directory for email; organization administrator and Roles & Permissions settings for role meaning/authority; the inviter's own current password for identity confirmation. Never provide a password or opaque invitation token in support evidence.

Roll out the reader, page, form and EN/FR resources together. Rollback is code-only and does not delete/change invitation records. Snapshot choices do not remove the writer's revalidation requirement.

Durable issuance/outbox, atomic issuance audit, original inviter/permission evidence, safe concurrent reissue and unknown provider outcomes remain open. Successful provider delivery is not part of this proof. Directory-wide localization, the existing generic unauthorized page, actual screen reader/native zoom and complete release assurance also remain open.

## Review accountability

- Architecture/backend/API: service-owned choice contract; existing authenticated page and authoritative writer retained.
- Database: read-only active organization/role snapshot; no migration; actual isolated database boundaries required.
- IAM/privacy: existing explicit grant ceiling and role-read permission retained; no excluded role details reach the chooser. No security certification.
- Frontend/workflow/accessibility/localization: distinguish inability, empty and failed read before collecting input; current shared components and EN/FR state explanations. Prior v13 keyboard/recovery evidence is historical, with current role-options/browser evidence recorded separately.
- Product/operations/SaaS: remove unproductive entry and verification for users without invitation authority. No commercial packaging or price change.
- Quality/release/SRE: focused regression, typecheck, scoped lint and local observations; no production performance or full-build pass claim.
- Audit/provider/events: unchanged and still incomplete for issuance; no fabricated signer/issuer history or external email verification.
- Finance/statutory/country packs, purchasing/AP, HRIS/payroll, reconciliation/ledger/close, POS/offline and AI/agents: not applicable to changed domain operations; no financial, statutory, employment, offline or agent state is changed. Role authority remains necessary for future access to those domains.

Source graphs remain discovery hints (actions community0; invitation form182; users route174/client175). The actual service policy and page callers were checked in current source.

Final source/test/runtime bindings are retained in `evidence/invitation-options-receipt.json` once this batch is verified. The broader assignment remains incomplete.


## Final verification binding

108/108 tests in six affected suites passed (ca8084,5.004s), typecheck passed (session86575/e4a895), five-file lint passed (e43fff), scoped diff check passed (1217c0). Actual PostgreSQL3/3 (lanes/environment/invitation-options-postgres-6d4cd386-aae.json); actual EN/FR browser2/2 (lanes/environment/invitation-options-browser-3d7177a5-536.json), source stable, original authority unchanged, eight screenshots. Canonical receipt: evidence/invitation-options-receipt.json.

Ready-route observations:5718msEN/5041msFR, local development only. Actual assurance evidence was verified in the retained session record; no post-confirmation invitation submission occurred.
