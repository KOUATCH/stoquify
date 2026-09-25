# Settings, access and workspace composition

[Guide home](../README.md) · [Shared controls](../shared-controls.md) · [Detailed control notes](../control-notes.md) · [Metric dictionary](../metric-dictionary.md)

Evidence: source reviewed 2026-09-06. Dashboard interaction is blocked by sign-in. Instructions below describe implementation, not a completed live walkthrough.

Settings establish organization context and access. Read the full review before applying changes: drafts, current configuration, permission grants, operational stops and successful preparation are different things. This chapter also covers account and notification demonstration routes.

## Pages in this chapter

- [Change password](#change-password)
- [Notification demonstration](#notification-demonstration)
- [Appearance](#appearance)
- [Company settings](#company-settings)
- [Data onboarding](#data-onboarding)
- [Create location](#create-location)
- [/en/dashboard/settings/locations/new](#shared-entry-settingslocationsnew)
- [Locations](#locations)
- [Edit location](#edit-location)
- [Module control center](#module-control-center)
- [Notification settings and tests](#notification-settings-and-tests)
- [/en/dashboard/settings/organization](#redirect-settingsorganization)
- [Create role](#create-role)
- [Role administration](#role-administration)
- [Edit role](#edit-role)
- [Security settings](#security-settings)
- [Create tax rate](#create-tax-rate)
- [Tax rates](#tax-rates)
- [Edit tax rate](#edit-tax-rate)
- [Terminals](#terminals)
- [Users and invitations](#users-and-invitations)
- [Member access](#member-access)

## Change password

**Open:** [/en/dashboard/change-password](http://localhost:3000/en/dashboard/change-password). **Reach it:** Change Password. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** profile.password.update. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Current, new and confirm-password fields with password policy/error handling.

**How to use it.**

1. Enter the current password and a matching new/confirmation value that meets the displayed policy; submit only when ready and follow the sign-in/success instructions.

**Confirm the outcome.** Follow the returned success/sign-in instructions and confirm that the new credential works through normal sign-in. A rejected form is not a completed password change.

**Get value from it.** Replace an account credential through its supported protected workflow.

**Limits and recovery.** The source enforces strength/history/breach-related checks; a rejected password is not a transport failure to repeatedly resubmit. This documentation inspection did not change credentials. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/change-password/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/change-password/change-password-route-data-access.ts:20>).

## Notification demonstration

**Open:** [/en/dashboard/notifications-demo](http://localhost:3000/en/dashboard/notifications-demo). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** communication.notifications.read. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** A notification test surface with synthetic notification actions.

**How to use it.**

1. Use only for deliberate presentation testing; return to operational evidence pages for real alerts and transactions.

**Confirm the outcome.** Inspect the visible notification/read-count state in the current session. Reloading can clear the queue; only the sound preference persists in browser storage.

**Get value from it.** Understand notification presentation without mistaking demonstrations for business records.

**Limits and recovery.** Demonstration functionality. Test buttons can change the local notification queue; they are not evidence of a production event pipeline. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/notifications-demo/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/notifications-demo/notifications-demo-route-data-access.ts:27>).

## Appearance

**Open:** [/en/dashboard/settings/appearance](http://localhost:3000/en/dashboard/settings/appearance). **Reach it:** Appearance. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** DASHBOARD_READ. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Light, Dark and System theme choices and the resolved appearance.

**How to use it.**

1. Choose the desired theme.
2. System follows the device preference; inspect the result in this browser.

**Confirm the outcome.** Inspect the active Light/Dark/System theme and its browser-persisted preference; no server command receipt is involved.

**Get value from it.** Use a comfortable, readable theme for long work sessions.

**Limits and recovery.** This is a browser-persisted theme setting. There is no complete saved custom-palette, layout-preset or global-density settings model on this page; individual tables can have their own density controls. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/appearance/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:35>).

## Company settings

**Open:** [/en/dashboard/settings/company](http://localhost:3000/en/dashboard/settings/company). **Reach it:** Company. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** COMPANY_READ. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** The active organization record, relation counts, setup links and three count cards above a full-width Gross paid payment total.

**How to use it.**

1. Confirm the organization identity.
2. Open its settings form to review editable organization data.
3. Use the displayed comparison/review flow before saving; resolve stale revisions with Load latest comparison.
4. Registration/sign-in handoff controls open the appropriate external page for another organization.
5. The reviewed CSV flow prepares scope before protected download.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Keep currency and organization identity consistent for downstream operations and use setup links to complete missing foundations.

**Limits and recovery.** The current amount label is Gross paid payment total. It adds all non-deleted PAID payments, including both sales and purchases, across all dates before refund deductions. It is neither revenue nor cash balance. Relation counts do not filter each relation for active/deleted state. Currency is read-only in this form; this directory exposes the current organization only. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/company/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:42>).

## Data onboarding

**Open:** [/en/dashboard/settings/data-onboarding](http://localhost:3000/en/dashboard/settings/data-onboarding). **Reach it:** Data onboarding. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** Authenticated organization and route guard; exact permission set not statically resolved. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** A governed master-data import workbench for customers, suppliers and items, with template, dry validation, approval, commit and evidence.

**How to use it.**

1. Choose the target and Download template.
2. Prepare a CSV within 5 MB and 1,000 rows.
3. Run dry validation, inspect mapped fields/errors/risks and correct the file.
4. Record the explicit approval for the exact source/mapping evidence, then Commit through the domain owners when allowed.
5. Export the evidence manifest and inspect created results.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Onboard consistent master data with reviewable validation before operational use.

**Limits and recovery.** Dry validation may persist a run/evidence record. Zero validation errors is not permission to skip approval; a changed file or mapping needs fresh review. Do not treat this as a transaction/ledger import. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/data-onboarding/page.tsx:1>).

## Create location

**Open:** [/en/dashboard/settings/locations/create](http://localhost:3000/en/dashboard/settings/locations/create). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** locations.create. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** The location dashboard with the create dialog, including name/code/type, manager, address/contact and policy options.

**How to use it.**

1. Enter required identity and intended manager/type, review policy checkboxes, save and confirm the new row before configuring its terminal or inventory.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Create a clear physical/operational scope before recording movements and sales.

**Limits and recovery.** No additional route-specific gap was established in this source review. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/locations/create/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:71>).

## Shared entry: /settings/locations/new

**Open:** [/en/dashboard/settings/locations/new](http://localhost:3000/en/dashboard/settings/locations/new). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** shared implementation; runtime blocked.

This route renders a shared implementation rather than a separate business process. Use [/en/dashboard/settings/locations/create](http://localhost:3000/en/dashboard/settings/locations/create) and [the canonical guide](settings.md#create-location). 

**Access:** locations.create. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/settings/locations/new/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/locations/new/page.tsx:1>).

## Locations

**Open:** [/en/dashboard/settings/locations](http://localhost:3000/en/dashboard/settings/locations). **Reach it:** Locations. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** locations.read. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Locations with type, manager, address/contact, active/setup indicators, filters and links to stock, transfers, POS and drawers.

**How to use it.**

1. Search/filter by status, type, setup or date; set visible columns/density and select rows for export as needed.
2. Create or edit a location, review default/approval/negative-stock settings and save.
3. Follow inventory/POS links to complete operational setup.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Make stock and cash responsibility explicit by location.

**Limits and recovery.** Changing approval/default/negative-stock policy affects future behavior; location creation alone does not create a usable POS terminal or open shift. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/locations/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:64>).

## Edit location

**Open:** `/en/dashboard/settings/locations/[id]/edit`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** locations.update. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** The selected location in the shared management form.

**How to use it.**

1. Review identity, responsibility and operational policy changes, then save.
2. Confirm the current record and downstream setup links.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Keep locations accurate without confusing an administrative edit with moving stock.

**Limits and recovery.** No additional route-specific gap was established in this source review. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/locations/[id]/edit/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:85>).

## Module control center

**Open:** [/en/dashboard/settings/modules](http://localhost:3000/en/dashboard/settings/modules). **Reach it:** Modules. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** MANAGE_SYSTEM_SETTINGS. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Foundation, package/composition and individual-module state, selection/dependencies, operational readiness/stops and review/identity controls.

**How to use it.**

1. Start with the active foundation and package composition.
2. Inspect module dependencies and readiness; select only the capabilities your workflows need.
3. Review the complete proposed change and confirm identity before applying any protected selection or operational command.
4. Reload the server result and inspect what is selected, granted, provisioned and usable.

**Confirm the outcome.** Compare Requested revision and Active workspace revision, inspect preparation conditions and the recorded change history, and verify whether the intended workspace is actually active.

**Get value from it.** Keep the workspace aligned with actual operating needs and discover the specific access/setup blocker when a module is unavailable.

**Limits and recovery.** Selection, commercial grant, provisioning, operational availability and user permission are separate conditions. This page is not a checkout/payment form and does not automatically grant user permissions. Some stop controls are supported only for specific modules/workflows; see the module-control notes. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:92>).

## Notification settings and tests

**Open:** [/en/dashboard/settings/notifications](http://localhost:3000/en/dashboard/settings/notifications). **Reach it:** Notifications. **Evidence state:** partial; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** communication.notifications.read. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Sound preference, a temporary notification queue and test controls.

**How to use it.**

1. Toggle sound as desired.
2. Send test, Security alert and Payment update add synthetic notifications for presentation testing.
3. Mark all read changes queue state; Clear queue removes the local list.

**Confirm the outcome.** Inspect the visible notification/read-count state in the current session. Reloading can clear the queue; only the sound preference persists in browser storage.

**Get value from it.** Check how alerts appear and sound before relying on the interface during operations.

**Limits and recovery.** Only the sound preference persists in browser storage; the queue is session memory. These are not real security events/payments and do not establish a durable email/push-subscription preference center. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/notifications/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:99>).

## Redirect: /settings/organization

**Open:** [/en/dashboard/settings/organization](http://localhost:3000/en/dashboard/settings/organization). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** redirect; runtime blocked.

This route redirects after its access checks. Use [/en/dashboard/settings/company](http://localhost:3000/en/dashboard/settings/company) and [the canonical guide](settings.md#company-settings). 

**Access:** COMPANY_READ. The destination performs its own checks.

**Evidence:** [app/[locale]/(dashboard)/dashboard/settings/organization/page.tsx:1](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/organization/page.tsx:1>).

## Create role

**Open:** [/en/dashboard/settings/roles/new](http://localhost:3000/en/dashboard/settings/roles/new). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** roles.create. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** English/French names, description, reviewed permission/risk catalogue, proposed changes, identity confirmation and history.

**How to use it.**

1. Enter the role's purpose, select only required permissions, inspect risk and any disabled/out-of-authority grants, then review and confirm the protected command.
2. Check server history and the resulting role.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Build comprehensible access bundles with evidence of who changed them.

**Limits and recovery.** Uneditable grants may need to remain preserved. A local checkbox selection is not a saved permission change. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/roles/new/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:120>).

## Role administration

**Open:** [/en/dashboard/settings/roles](http://localhost:3000/en/dashboard/settings/roles). **Reach it:** Roles & Permissions. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** READ_ROLES. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Roles and their permission-related summaries, search/selection and create/edit navigation.

**How to use it.**

1. Search for an existing role before Add Role.
2. Open it to inspect its permission set and review process.
3. Verify saved role changes from the directory/history.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Use reusable roles rather than ad hoc access assumptions.

**Limits and recovery.** A role name is not a guarantee of its permissions; assess its actual grant set and your authority to change it. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/roles/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:113>).

## Edit role

**Open:** `/en/dashboard/settings/roles/update/[id]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** roles.update. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** English/French names, description, reviewed permission/risk catalogue, proposed changes, identity confirmation and history.

**How to use it.**

1. Enter the role's purpose, select only required permissions, inspect risk and any disabled/out-of-authority grants, then review and confirm the protected command.
2. Check server history and the resulting role.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Build comprehensible access bundles with evidence of who changed them.

**Limits and recovery.** Uneditable grants may need to remain preserved. A local checkbox selection is not a saved permission change. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/roles/update/[id]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:127>).

## Security settings

**Open:** [/en/dashboard/settings/security](http://localhost:3000/en/dashboard/settings/security). **Reach it:** Security. **Evidence state:** partial; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** profile.read. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Password/credential readiness, session counts, recent login/security indicators, role/permission context and links to password maintenance.

**How to use it.**

1. Inspect current session and account state.
2. Change password opens the dedicated form.
3. Sign out other sessions revokes the other sessions; confirm their removal afterward.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Review active access and remove sessions that should no longer be valid.

**Limits and recovery.** The current page does not supply a finished MFA enrolment/challenge flow. A two-factor readiness label or navigation description should not be presented as an available toggle. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/security/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:134>).

## Create tax rate

**Open:** [/en/dashboard/settings/tax-rates/create](http://localhost:3000/en/dashboard/settings/tax-rates/create). **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** taxes.create. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** The tax-rate dashboard with its create dialog.

**How to use it.**

1. Enter name/type/rate and active state, validate the percentage field and save.
2. Verify the new rate before assigning it to an item or transaction.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Prepare a reviewed rate before operational users need it.

**Limits and recovery.** No additional route-specific gap was established in this source review. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/tax-rates/create/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:149>).

## Tax rates

**Open:** [/en/dashboard/settings/tax-rates](http://localhost:3000/en/dashboard/settings/tax-rates). **Reach it:** Tax Rates. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** taxes.read. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Configured tax names, rates, types and activity with create/edit/remove controls and list presentation filters.

**How to use it.**

1. Find the intended tax.
2. Create/Edit with bilingual names, type, percentage and active state; review before saving and verify the row.
3. Inspect use/confirmation before Remove.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Apply consistent configured rates to supported product/order calculations.

**Limits and recovery.** A configured percentage is application data, not tax-law advice or proof the rate is legally correct for a country/product/date. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/tax-rates/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:142>).

## Edit tax rate

**Open:** `/en/dashboard/settings/tax-rates/[id]/edit`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** taxes.update. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** The selected tax rate in the shared management form.

**How to use it.**

1. Review the intended name/type/rate/activity changes and save.
2. Confirm the result and consider affected future uses.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Keep tax master data deliberate and consistent.

**Limits and recovery.** Changing a configuration does not imply automatic recalculation of historical transactions. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/tax-rates/[id]/edit/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:156>).

## Terminals

**Open:** [/en/dashboard/settings/terminals](http://localhost:3000/en/dashboard/settings/terminals). **Reach it:** Terminals. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** POS_STATION_READ. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Terminal identity/number, location, assigned cashier, cash-drawer/session links, filters and active state.

**How to use it.**

1. Create or Edit a terminal, choosing location and valid cashier/drawer where required; review its generated/entered number.
2. Use Open POS or drawer links to inspect operation.
3. Deactivate only after checking live session consequences.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Give each checkout a traceable location, operator and drawer context.

**Limits and recovery.** A terminal record does not open a shift or establish payment-provider authority. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/terminals/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:163>).

## Users and invitations

**Open:** [/en/dashboard/settings/users](http://localhost:3000/en/dashboard/settings/users). **Reach it:** Users & Invites. **Evidence state:** partial; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** READ_USERS. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. 

**What it shows.** Organization member counts, activation/verification/role filters and an invitation register with Awaiting acceptance, Accepted, Expired and Cancelled states. Delivery-attempt history is separate.

**How to use it.**

1. Search/filter members, inspect activation/verification/roles and switch Users/Invitations tabs.
2. Invite user opens Email address and an authorized Role; Record invitation persists the reviewed request.
3. Inspect its receipt/history and Refresh invitations before retrying an uncertain result.
4. Replace invitation and Cancel invitation require their own review; use member access for an accepted invitation.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Add the right person with the right access while preserving an invitation trail.

**Limits and recovery.** Email delivery is disabled in the reviewed build. Recording an invitation or delivery request is not sending email. Verification, activation, accepted invitation and effective permissions are separate states. Deactivation is a protected action that revokes sessions and pending links while retaining business history; self/last-administrator safeguards apply. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/users/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:170>).

## Member access

**Open:** `/en/dashboard/settings/users/update/[id]`. **Reach it:** Direct/contextual link; no exact sidebar entry. **Evidence state:** source-only; runtime blocked.

**Audience.** Organization owners, authorized administrators and individual account users.

**Prerequisites and access.** users.read. Each page has its own read authority; profile, role, membership, import, module and export commands require additional rights and may require current-password confirmation. Open an existing authorized record through the parent list; brackets in this route represent its ID.

**What it shows.** A selected member's current/proposed role assignments, review differences, identity confirmation and command history.

**How to use it.**

1. Select intended roles, review changes and reasons, confirm identity and submit the protected access change.
2. Reload history/current membership to verify the result; resolve stale comparisons before retrying.

**Confirm the outcome.** Inspect the saved value and the command receipt or change history where provided. For a read-only view, check its scope and refresh time.

**Get value from it.** Keep access changes accountable and appropriately scoped.

**Limits and recovery.** Viewing a member does not grant authority to change every role. Self-access and last-custodian safeguards may block a change; this is not a general personal-profile editor. For a protected write with an uncertain result, use the offered same-request retry; compare the latest record after a conflict. For presentation preferences, inspect the visible local state. [Shared recovery guidance](../shared-controls.md#recovery-without-duplicating-work) covers empty, denied, stale and failed states.

**Connections.** [Workflows](../workflows.md) · [Role routines](../role-playbooks.md) · [Control evidence](../controls.csv) · [Technical notes](../technical-evidence.md).

[Page source](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/users/update/[id]/page.tsx:1>) · [Access definition](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts:177>).

