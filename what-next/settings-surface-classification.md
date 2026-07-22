# Stoquify Settings Surface Classification

Report-only evidence. This artifact does not enable module entitlement enforcement or modify business actions.

## CI Ratchet

Fail mode: this gate exits non-zero when any settings surface requires review. Module entitlement enforcement remains report-only.

- Gate status: ready
- Gate mode: fail
- Active-finding baseline: 0
- Current active findings: 0
- Module entitlement enforcement: report-only

## Summary

- Generated at: 2026-07-19T20:40:11.371Z
- Source inventory generated at: 2026-07-19T20:40:11.360Z
- Classified records: 37
- Active review findings: 0
- Status allowed-public: 4
- Status delegated: 3
- Status helper: 3
- Status protected: 26
- Status protected-mixed: 1

## Reviewed Public And Token Boundaries

| File | Authorization boundary | Disposition |
|---|---|---|
| actions/users/createInvitedUser.ts | token-bound-invitation | Preserve invitation-token redemption and single-use expiry checks. |
| actions/users/createUser.ts | public-registration | Preserve public registration; assess abuse resistance separately. |
| actions/users/sendResetLink.ts | public-reset-request | Preserve enumeration-resistant responses; assess rate limiting separately. |
| actions/users/verifyOtp.ts | otp-bound-verification | Preserve OTP verification and expiry checks in the identity service. |

## Non-Executable Helpers

| File | Execution boundary | Disposition |
|---|---|---|
| actions/brands/getOrgBrands.ts | delegated-re-export | Inspect and classify the delegated implementation instead of this shim. |
| actions/categories/createBulkCategories.ts | helper-module | Exclude this file from executable action permission findings. |
| actions/categories/createCategory.ts | delegated-re-export | Inspect and classify the delegated implementation instead of this shim. |
| actions/categories/getOrgCategories.ts | delegated-re-export | Inspect and classify the delegated implementation instead of this shim. |
| actions/roles/role-auth.ts | helper-module | Exclude this file from executable action permission findings. |
| actions/roles/role-utils.ts | helper-module | Exclude this file from executable action permission findings. |

## Active Findings

| File | Authorization boundary | Findings | Recommended action |
|---|---|---|---|

## Complete Classification

| File | Execution | Authorization | Status | Permission | Module | Fresh auth | Tenant evidence | Module observe |
|---|---|---|---|---|---|---|---|---|
| actions/brands/getBrandsAction.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | assertCanUseOrganization(; ctx.orgId | present |
| actions/brands/getOrgBrands.ts | delegated-re-export | delegated-re-export | delegated | inherited-from-delegate | inherited-from-delegate | inherited-from-delegate | not-detected | inherited-from-delegate |
| actions/categories/createBulkCategories.ts | helper-module | helper-module | helper | not-applicable | not-an-executable-surface | not-applicable | not-detected | not-applicable |
| actions/categories/createCategory.ts | delegated-re-export | delegated-re-export | delegated | inherited-from-delegate | inherited-from-delegate | inherited-from-delegate | not-detected | inherited-from-delegate |
| actions/categories/getCategoriesAction.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | assertCanUseOrganization(; ctx.orgId | present |
| actions/categories/getOrgCategories.ts | delegated-re-export | delegated-re-export | delegated | inherited-from-delegate | inherited-from-delegate | inherited-from-delegate | not-detected | inherited-from-delegate |
| actions/locations/createLocation.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | ctx.orgId | present |
| actions/locations/deleteLocation.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | ctx.orgId | present |
| actions/locations/getOrgLocations.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | resolveActionOrganization( | present |
| actions/locations/location-management-actions.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | assertCanUseOrganization( | present |
| actions/locations/updateLocationById.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | ctx.orgId | present |
| actions/modules/module-control.actions.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | ctx.orgId | present |
| actions/organization/organization-settings-actions.ts | server-action | rbac-protected | protected | required-and-present | module-observed | present | assertCanUseOrganization(; ctx.orgId | present |
| actions/roles/createRole.ts | server-action | rbac-protected | protected | required-and-present | module-observed | present | ctx.orgId | present |
| actions/roles/getOrgRoles.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | ctx.orgId | present |
| actions/roles/getRoleById.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | ctx.orgId | present |
| actions/roles/role-auth.ts | helper-module | helper-module | helper | not-applicable | not-an-executable-surface | not-applicable | not-detected | not-applicable |
| actions/roles/role-utils.ts | helper-module | helper-module | helper | not-applicable | not-an-executable-surface | not-applicable | not-detected | not-applicable |
| actions/roles/updateRole.ts | server-action | rbac-protected | protected | required-and-present | module-observed | present | ctx.orgId | present |
| actions/storage/photo-upload-actions.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | assertCanUseOrganization(; ctx.orgId | present |
| actions/storage/storage-config-actions.ts | server-action | rbac-protected | protected | required-and-present | module-observed | present | assertCanUseOrganization(; ctx.orgId | present |
| actions/taxRate/createActionTaxRate.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | assertCanUseOrganization( | present |
| actions/taxRate/getOrgTaxRates.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | ctx.orgId | present |
| actions/taxRate/tax-rate-management-actions.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | assertCanUseOrganization(; ctx.orgId | present |
| actions/units/deleteUnit.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | ctx.orgId | present |
| actions/units/getOrgUnits.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | resolveActionOrganization( | present |
| actions/units/unit-management-actions.ts | server-action | rbac-protected | protected | required-and-present | module-not-detected | not-detected | assertCanUseOrganization( | not-detected |
| actions/users/createInvitedUser.ts | server-action | token-bound-invitation | allowed-public | reviewed-token-exception | identity-outside-module-entitlement | not-detected | not-detected | not-detected |
| actions/users/createUser.ts | server-action | public-registration | allowed-public | reviewed-public-exception | identity-outside-module-entitlement | not-detected | not-detected | not-detected |
| actions/users/deleteUser.ts | server-action | rbac-protected | protected | required-and-present | module-observed | present | ctx.orgId | present |
| actions/users/getOrgInvites.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | assertCanUseOrganization(; ctx.orgId | present |
| actions/users/getOrgUsers.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | assertCanUseOrganization(; ctx.orgId | present |
| actions/users/getUserById.ts | server-action | rbac-protected | protected | required-and-present | module-observed | not-detected | ctx.orgId | present |
| actions/users/sendInvite.ts | server-action | rbac-protected | protected | required-and-present | module-observed | present | ctx.orgId | present |
| actions/users/sendResetLink.ts | server-action | public-reset-request | allowed-public | reviewed-public-exception | identity-outside-module-entitlement | not-detected | not-detected | not-detected |
| actions/users/updateUserPassword.ts | server-action | mixed-protected-and-token-bound | protected-mixed | required-and-present | settings-protected-plus-identity-token | present | ctx.orgId | present |
| actions/users/verifyOtp.ts | server-action | otp-bound-verification | allowed-public | reviewed-token-exception | identity-outside-module-entitlement | not-detected | not-detected | not-detected |

