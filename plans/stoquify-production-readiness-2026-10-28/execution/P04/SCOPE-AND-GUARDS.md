# P04 scope and guard register

Current-source technical qualification authorized on 29 October 2026. Production admission remains blocked. Machine authority: [scope-and-guard-register.json](scope-and-guard-register.json).

- [Action exports and per-entry boundaries](actions-review/server-action-exports.json):748 actions exports plus 2 app module exports; 676 actions rows remain inventory-only.
- [App-local candidates](actions-review/app-local-server-actions.json):13 total app module/inline records, overlapping the 2 module entries above.
- [Routes, pages and layouts](routes-review/route-page-guard-register.json):22 handler files/30 method exports,190 pages,21 layouts;185 page continuations remain unqualified.
- [Shared guard review](guard-review/REVIEW.md): live actor/tenant/permission/session/module/location invariants and limits.
- [Findings and gap dispositions](findings-register.json): three confirmed defects and six remaining qualification/decision groups.

All entries are inventoried for qualification. No row is production-admitted by this packet. A guard-name match, page-shell authentication, observe-mode module declaration or mocked check cannot qualify an independently callable read/mutation.

The synthetic native roles are branch_manager, branch_reader, custom Admin and a foreign-tenant wildcard role. Changed/inactive/locked/unverified user/organization and stale/revoked/expired session states are explicit negative fixtures. Tenant/location/module boundaries and their guard owners are recorded in the linked machine files. These are source/fixture roles, not a production-account census.

See [RESULT.md](RESULT.md) for executed evidence, no-business-write assertion scope, remaining blockers and the exact next action.
