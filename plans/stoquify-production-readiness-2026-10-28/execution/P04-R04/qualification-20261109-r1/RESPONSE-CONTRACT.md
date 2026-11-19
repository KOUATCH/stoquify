# P04-R04 response contract

Candidate p04-r04-20261109-ef3f203a9ded covers only actions/item/listItemsAction.ts, the sibling list action consumed by useListItems. The earlier nine-path R03 repair and all unrelated source remain unchanged.

Success remains {success:true,data}; failure remains {success:false,error:string}. Object and positional argument normalization, Zod defaults/validation, inventory.items.read guard, server-owned ctx.orgId override, service count/findMany queries, filtering/sorting/pagination and empty result shape are unchanged. The read service has no explicit business-error branches, so no mutation-message allowlist is imported or introduced.

All arbitrary error messages, thrown strings, provider codes, Prisma details, typed unknown errors and validation issue data use fixed public text through the existing safeLoggedActionErrorMessage. Invalid input uses its fixed form-review message. UNAUTHENTICATED/NO_ACTIVE_ORG map to Unauthenticated; FORBIDDEN, ACCOUNT_LOCKED and EMAIL_NOT_VERIFIED select fixed existing recovery messages. Codes never authorize a request. FreshAuth recovery and Next redirect/not-found control flow retain the existing shared helper behavior. Safe logging emits code/status/correlation/category/severity/retryability rather than raw exception detail.

The actual hook query function is unit-exercised with useQuery mocked; this is response-envelope compatibility, not rendered UI or HTTP qualification. Native verification executes actual action/RBAC/service/PostgreSQL with explicit Better Auth/Next adapter stubs. Session expiry/revocation/signature/browser proof remains P04-V02. Denied business-state snapshots must distinguish allowed security-audit effects.

Source hashes and inert pre-repair snapshots are retained. The old supplemental finding incorrectly located the original catch at76–80; this refresh records71–75, with raw message at73. Historical evidence is preserved.

Recovery: revert only owned import/catch hunks against the captured baseline while preserving unrelated changes; unsafe action stays outside production admission. No production data/schema/flag changes or deployment. Stop only verified owned fixture processes; retain data and failed evidence. Fresh reviewed identities are required for repeat runs.
