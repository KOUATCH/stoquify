# Company profile: implementation and operating guide

Evidence date: 2026-09-06. Scope: OA-PROFILE-READ and OA-PROFILE-UPDATE, with the four retained shortcut actions and the existing API read service. This is a bounded implementation checkpoint in the wider workflow review. It is not a completed platform review, X1 decision, release approval or professional certification.

## What changed and why

The existing company route, shell, sidebar entry, query cache and shared controls remain the entry point. `OrganizationSettingsForm` now consumes a server-derived update affordance. Read-only users can inspect the profile and review panels; they have no save action. A missing record shows a retryable unavailable state. A failed refresh keeps the previous profile and the draft visible while preventing a blind save.

The profile input contract validates bounded names/text, EN/FR locale, timezone, currency syntax, real dates and a valid annual calendar start. All five write actions call one service. Each save carries the exact `updatedAt` of the profile reviewed. The transaction locks the organization and checks current active tenant, active/verified actor, tenant-owned role membership/permission and the exact current session's real password assurance. It updates only submitted fields and writes the before/after audit in the same transaction. The revision increases monotonically, including two updates within one millisecond. An audit failure rolls back the profile.

A stale request cannot overwrite a newer profile. A duplicate request with an old revision cannot create another update. After a lost response, the form keeps the draft and asks the user to reload and compare. This is revision-based recovery, not durable request-result retrieval: the application does not infer whether an unconfirmed request committed. A fresh read supplies the actual saved state.

Background refresh no longer replaces unsaved edits. During comparison, the user can keep their edits or use the saved version. Keeping edits copies only fields changed against the original reviewed version onto the newest profile; concurrent changes to untouched fields survive. A tenant change remounts the editor and clears the prior tenant's draft. Only confirmed server results update the cache; in-flight stale reads are cancelled before installing that result.

Password confirmation uses the existing step-up action. It does not grant permissions or sign a product approval. The user explicitly saves again after confirmation. A revoked role, changed membership or expired session still prevents the write.

## Currency and operating dates

Changing `Organization.currency` directly would relabel existing money in POS receipts, cash payment history and inventory history. Verified consumers include `services/pos/receipt.service.ts`, `services/pos/pos.service.ts`, `services/pos/cash-payment-history.service.ts` and `services/inventory/inventory-read.service.ts`. These readers do not all preserve an independently authoritative historical currency.

Currency is therefore read-only in this editor. Both general and shortcut writes reject a different currency, even if it is a valid three-letter value. The currency selected at organization creation remains the operating value. This restriction is a deliberate correction to unsafe existing behavior. A controlled currency migration is still missing engineering work; a signature or profile edit is not a substitute. Do not bypass this guard to make a test or customer request pass.

Timezone and calendar values remain operating defaults. They do not perform FX conversion, approve country setup, create or reopen accounting periods, or certify financial readiness. Accounting base currency and calendar remain owned by their existing domain services. Broader consequences of time and inventory-start changes require continued connected-workflow review.

## What the user does

1. Open **Settings → Company** at `/en/dashboard/settings/company` or `/fr/dashboard/settings/company`.
2. Review identity, regional settings and operating calendar. Change only the intended values, then open **Review**.
3. Select **Save organization**. If prompted, enter the password for the currently signed-in account and select **Confirm identity**. Check the draft and save again.
4. If another person changed the record, select **Load latest for comparison**. Compare the saved value with your draft. Choose **Keep my edits and review** to preserve your edited fields while retaining other current values, or **Use the saved version** to discard the draft.
5. After an interrupted save, use the same comparison process. Do not assume either success or failure from a lost response. The saved profile and audit are the evidence of the actual outcome.

French equivalents are shown in the same workflow. Feedback is inline and receives keyboard focus. Separate global success/error notifications were removed from the general profile hook after actual mobile screenshots showed stacked notifications obscuring the form. Long French review labels wrap. Passwords are cleared from the confirmation input after every verification attempt.

## Information needed and where to find it

| Input | Who supplies it | Where to obtain it / meaning |
| --- | --- | --- |
| Company name and business address | Authorized organization administrator | The organization's current business records; confirm the spelling and address used operationally. This form does not authenticate a statutory identity. |
| Industry, country, region | Organization administrator / operations owner | Actual operating context. Changing country text does not install or approve a country pack. |
| Timezone | Operations owner | The timezone used for the organization's daily cutoffs and reporting. Coordinate changes with affected users because date boundaries can shift. |
| Default language | Organization administrator | Choose English or French for the organization default; the currently viewed route keeps its chosen language. |
| Annual start and inventory start date | Authorized operations/accounting owner | The organization's existing operating plan and stock-start records. Obtain domain review where changing dates affects established activity. These entries are not proof that accounting setup is complete. |
| Current password | The signed-in person | Their own credential. Do not send it to an administrator, put it in a document, or paste it into this task. |
| Reviewed revision, tenant, actor, audit reference | Supplied by Stoquify | The application obtains these from the authenticated context and saved record. The user must not invent or copy them manually. |
| A requested currency change | Operations/accounting and engineering owners | State the existing currency, requested currency, reason, effective date and affected historical activity. A dedicated migration design, implementation and verification are required; this editor cannot execute it. |

## Verification and its limits

The initial validation reproduction failed all ten invalid-input cases before correction. Validation plus existing organization template/directory regressions then passed 26 checks. A later five-suite run passed 55 checks but exited with an evidence-file EPERM; the restriction was resolved without changing test scope. Subsequent action/hook/service checks passed; form failures first exposed required-marker label association, then a test harness that asserted before the query observer update. Both were corrected, with failures retained.

Real PostgreSQL proof `../environment/organization-profile-b2ec1639-8c1.json` passed 18 checks: EN/FR saved values and audit, stale duplicate, concurrent winner/loser, audit rollback/retry, read-only and missing assurance, cross-tenant/session rejection, currency rejection, shortcut parity, pre-commit authority revocation and five mutation-lock checks. Original organization/user/role/grant state remained unchanged. Only new owned synthetic fixtures were written. Password assurance came from the real step-up service.

The first actual browser proof `../environment/organization-profile-browser-browser-d3d173c0-687.json` passed both locales, each with denied, read-only, editor, real step-up, concurrent-tab conflict/merge and transport recovery. Each locale produced three audited profile changes. Viewports 390, 768 and 1440 passed horizontal-overflow checks; keyboard save and select focus return were observed. The dropdown background matched the dashboard surface (`rgb(31, 49, 57)`). The English/French development route observations were 5,395/5,050 ms; save observations including password confirmation were 3,129/2,968 ms. These are development observations, not approved performance budgets or production certification.

The final receipt records the later screenshot-driven UI correction, its browser result, exact tests, source hashes and current source baseline. Earlier successful receipts remain historical when a bound file changes. Service proof can remain relevant to unchanged service files without pretending that its earlier UI bindings prove a later UI revision.

Still open: actual assistive-technology testing, native browser zoom, comprehensive contrast, full API/route read parity, user-facing audit browsing, connected timezone/inventory-date effects, and complete organization directory/create/membership workflows. No full workflow is marked complete at this checkpoint.

## Rollout and recovery

No database schema or migration is required. Ship service, action, hook and form changes together: the service requires a reviewed revision and a verified server-session context. Old open clients receive a reload/conflict response rather than an unbound write. Do not restore the previous permissive direct writes during rollback. Keep server validation, revision checks and currency protection in any recovery release.

Use an isolated cohort first. Observe denied/stale/save failures, query freshness, audit counts and latency. If a write is uncertain, reload the scoped record and inspect its `ORGANIZATION_SETTINGS_UPDATED` audit through an authorized operations path. Preserve the audit and prior values. A correction is a new authorized change against the current revision; do not delete historical evidence. No rollout or production deployment has been performed.

## Review responsibilities

| Responsibility | Review result |
| --- | --- |
| Architecture/backend/API | Existing route/action/hook structure retained; one service owns all profile writes. API read service now excludes inactive/deleted tenants; transport parity remains to be completed. |
| Data/migrations/audit | Row-locked version comparison and mandatory same-transaction before/after audit verified in PostgreSQL. No migration. |
| Security/IAM/privacy | Server actor/tenant/session, current tenant roles and real fresh password assurance checked again at commit. Private credentials excluded from receipts/audit. |
| UX/design/accessibility/localization | Existing dashboard components and semantic tokens; EN/FR draft, stale, denied and recovery paths tested. No accessibility certification. |
| Product/operations/SaaS | Company profile remains tenant-scoped. It does not create an additional usable workspace, change billing, or establish commercial eligibility. |
| Finance/accounting/records | Direct currency relabelling prevented. Accounting setup and country-pack approval remain separate. Connected date effects remain under review. |
| Quality/SRE/rollout | Unit/action/hook/form, real DB and browser evidence retained. Development observations are not release/performance approval. Recovery steps above. |
| OHADA/statutory/country packs | No statutory rules changed; operating fields cannot establish statutory readiness. Expert certification not applicable to this bounded code correction. |
| Payments/providers/POS/inventory | Currency consumers informed the safeguard. No payments, offline replay or provider operations changed. |
| Purchasing/AP/HRIS/payroll/ledger | No domain writes changed; broader downstream review remains in their workflow lanes. |
| Analytics | Profile currency/timezone can affect interpretation of existing reports; no analytics completion claim. |
| AI/agents | Not applicable: this profile update has no agent decision, inference or autonomous activation. |

Next batch: finish profile evidence, then address organization directory affordances and the existing additional-organization creation handoff. Registration's final explicit guided submission remains due after the unchanged real IP cooldown at 2026-09-06T10:25:18.544Z. No reset or client-identity workaround is authorized.
