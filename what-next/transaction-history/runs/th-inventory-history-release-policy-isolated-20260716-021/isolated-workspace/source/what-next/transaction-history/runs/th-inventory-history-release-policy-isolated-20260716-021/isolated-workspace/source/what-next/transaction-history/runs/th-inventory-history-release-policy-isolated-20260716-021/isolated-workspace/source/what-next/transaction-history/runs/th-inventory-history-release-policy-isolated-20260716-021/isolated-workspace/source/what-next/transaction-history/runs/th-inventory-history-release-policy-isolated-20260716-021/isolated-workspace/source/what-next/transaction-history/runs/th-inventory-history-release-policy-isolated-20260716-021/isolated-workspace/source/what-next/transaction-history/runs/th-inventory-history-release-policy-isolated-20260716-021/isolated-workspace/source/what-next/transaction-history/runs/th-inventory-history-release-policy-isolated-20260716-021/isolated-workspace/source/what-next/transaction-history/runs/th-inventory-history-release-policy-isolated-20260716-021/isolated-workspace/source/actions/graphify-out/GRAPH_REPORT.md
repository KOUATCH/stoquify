# Graph Report - actions  (2026-07-14)

## Corpus Check
- 171 files · ~59,759 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 757 nodes · 1007 edges · 45 communities detected
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 87 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 79|Community 79]]

## God Nodes (most connected - your core abstractions)
1. `safeLoggedActionErrorMessage()` - 48 edges
2. `scopedOrg()` - 21 edges
3. `safeSuccessActionErrorResult()` - 13 edges
4. `response()` - 12 edges
5. `revalidatePurchaseOrderWorkflow()` - 11 edges
6. `itemSupplierActionError()` - 10 edges
7. `safeServerActionErrorResult()` - 9 edges
8. `logSafeActionWarning()` - 9 edges
9. `assertOrganizationAccess()` - 8 edges
10. `updateManagedLocation()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `registerUser()` --calls--> `safeSuccessActionErrorResult()`  [INFERRED]
  auth.ts → _shared\safe-action-responses.ts
- `signInWithCredentials()` --calls--> `safeSuccessActionErrorResult()`  [INFERRED]
  auth.ts → _shared\safe-action-responses.ts
- `actionError()` --calls--> `safeActionErrorMessage()`  [INFERRED]
  brands\getBrandsAction.ts → _shared\safe-action-responses.ts
- `createBulkCategories()` --calls--> `logSafeActionWarning()`  [INFERRED]
  categories\createBulkCategories.ts → _shared\safe-action-responses.ts
- `actionError()` --calls--> `safeActionErrorMessage()`  [INFERRED]
  categories\getCategoriesAction.ts → _shared\safe-action-responses.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (27): registerUser(), signInWithCredentials(), createLocation(), deleteLocation(), updateLocationById(), createRole(), getOrgRoles(), getRoleById() (+19 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (31): assertOrganizationAccess(), cleanText(), createManagedCustomer(), deleteManagedCustomer(), getActionErrorMessage(), getCustomerAnalyticsData(), getCustomerManagementData(), hasPermission() (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.2
Nodes (26): approvePurchaseOrder(), bulkUpdatePurchaseOrderStatus(), cancelPurchaseOrder(), clonePurchaseOrder(), closePurchaseOrder(), createPurchaseOrder(), deletePurchaseOrder(), exportPurchaseOrders() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (19): createCustomer(), deleteCustomer(), emptyToNull(), getCustomer(), getCustomerOrders(), getCustomers(), requireCustomerAccess(), toCreateInput() (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.24
Nodes (14): asRecord(), booleanValue(), defaultPayrollSetupWindow(), dryRunValue(), employeeSourceMode(), firstValue(), isoDate(), numberValue() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.28
Nodes (14): deletePhoto(), deletePhotoLocally(), requireInventoryPhotoWrite(), savePhotoLocally(), uploadPhoto(), buildLocalStoragePath(), defaultStorageConfiguration(), ensureLocalStorageDirectories() (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.3
Nodes (13): createActionTaxRate(), normalizeTaxRateInput(), getOrgTaxRates(), assertOrganizationAccess(), cleanText(), createManagedTaxRate(), deleteManagedTaxRate(), getActionErrorMessage() (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.33
Nodes (11): createBulkCategories(), actionError(), createCategory(), deleteCategory(), getCategoryById(), getOrgCategories(), normalizeCreateInput(), normalizeImageUrl() (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.41
Nodes (12): assertOrganizationAccess(), cleanText(), createManagedSupplier(), deleteManagedSupplier(), getActionErrorMessage(), getSupplierAnalyticsData(), getSupplierManagementData(), hasPermission() (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.3
Nodes (8): asRecord(), countryPackReviewIntakeInput(), firstValue(), parseProposedCountryPack(), resolveBaseCountryPack(), reviewTopicEvidence(), stringValue(), targetFamilies()

### Community 13 - "Community 13"
Cohesion: 0.44
Nodes (11): createItemSupplier(), deleteItemSupplier(), getAllOrgItemSuppliers(), getItemSupplierActionErrorMessage(), getItemSupplierById(), getItemSuppliers(), getItemSuppliersByItemId(), itemSupplierActionError() (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.55
Nodes (10): archiveManagedLocation(), assertOrganizationAccess(), cleanText(), createManagedLocation(), getActionErrorMessage(), getLocationManagementData(), getValidationMessage(), observeSettingsLocationAccess() (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.55
Nodes (10): archiveManagedTerminal(), assertOrganizationAccess(), cleanText(), createManagedTerminal(), getActionErrorMessage(), getTerminalManagementData(), getValidationResult(), observePOSTerminalModuleAccess() (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.47
Nodes (9): actionError(), createBrand(), deleteBrand(), getBrandById(), getOrgBrands(), normalizeCreateInput(), normalizeUpdateInput(), requireBrandAction() (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.56
Nodes (9): assertOrganizationAccess(), cleanText(), createManagedUnit(), deleteManagedUnit(), getActionErrorMessage(), getUnitManagementData(), getValidationMessage(), revalidateUnitPaths() (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.5
Nodes (8): asRecord(), booleanValue(), certificationInput(), certifyPayrollPilotCycleAction(), firstValue(), signoff(), signoffBundle(), stringValue()

### Community 24 - "Community 24"
Cohesion: 0.43
Nodes (7): getCashReconciliationReports(), getDashboardSummary(), getProductPerformance(), getSalesAnalytics(), getUserPerformance(), salesAnalyticsInput(), salesAnalyticsLocationInput()

### Community 26 - "Community 26"
Cohesion: 0.32
Nodes (3): asRecord(), getProofTrailAction(), requireSubjectType()

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 34 - "Community 34"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 35 - "Community 35"
Cohesion: 0.29
Nodes (1): MockRbacError

### Community 36 - "Community 36"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 37 - "Community 37"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 44 - "Community 44"
Cohesion: 0.6
Nodes (5): analyticsReportInput(), getCashFlowReport(), getCashierPerformanceReport(), getFinancialSummaryReport(), getItemPerformanceReport()

### Community 47 - "Community 47"
Cohesion: 0.33
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (5): getPOSCatalogAction(), getPOSLocationsAction(), getPOSTerminalsAction(), observePOSCatalogModuleAccess(), optionalStringField()

### Community 50 - "Community 50"
Cohesion: 0.47
Nodes (3): getGoodsReceiptsForPurchaseOrder(), getPurchaseOrdersSummary(), scopedOrg()

### Community 52 - "Community 52"
Cohesion: 0.6
Nodes (4): dailyReportInput(), financialAnalyticsInput(), getDailyReportData(), getFinancialMetrics()

### Community 56 - "Community 56"
Cohesion: 0.4
Nodes (1): MockRbacError

### Community 57 - "Community 57"
Cohesion: 0.4
Nodes (1): MockRbacError

### Community 60 - "Community 60"
Cohesion: 0.83
Nodes (3): getAllDashboardData(), getDashboardMetrics(), requireDashboardReadContext()

### Community 61 - "Community 61"
Cohesion: 0.5
Nodes (1): MockFreshAuthRequiredError

### Community 65 - "Community 65"
Cohesion: 0.5
Nodes (1): MockRbacError

### Community 66 - "Community 66"
Cohesion: 0.5
Nodes (1): MockRbacError

### Community 67 - "Community 67"
Cohesion: 0.5
Nodes (1): MockRbacError

### Community 68 - "Community 68"
Cohesion: 0.67
Nodes (2): displayRoleName(), withDisplayRoleName()

### Community 69 - "Community 69"
Cohesion: 0.5
Nodes (1): MockFreshAuthRequiredError

### Community 70 - "Community 70"
Cohesion: 0.67
Nodes (1): MockRbacError

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (2): listItemsAction(), normalizeArgs()

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (2): getCashDrawerDashboardAction(), optionalStringField()

## Knowledge Gaps
- **Thin community `Community 32`** (7 nodes): `payroll-compensation.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (7 nodes): `payroll-contract.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (7 nodes): `payroll-control.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (7 nodes): `payroll-country-pack-review-intake.actions.test.ts`, `certificate()`, `intakeInput()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (7 nodes): `payroll-employee.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (7 nodes): `payroll-payment-evidence.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (7 nodes): `payroll-payment-reconciliation.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (7 nodes): `payroll-payslip-self-service.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (7 nodes): `payroll-register.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (7 nodes): `ap-control.actions.test.ts`, `invoiceInput()`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (6 nodes): `employee.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (5 nodes): `payroll-command-read-model.actions.test.ts`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (5 nodes): `payroll-setup.actions.test.ts`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (4 nodes): `lifecycle.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (4 nodes): `catalog.actions.test.ts`, `MockRbacError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (4 nodes): `drawer-dashboard.actions.test.ts`, `MockRbacError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (4 nodes): `terminal-management.actions.test.ts`, `MockRbacError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (4 nodes): `displayRoleName()`, `displayUserName()`, `role-utils.ts`, `withDisplayRoleName()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (4 nodes): `role-actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (3 nodes): `settings.actions.test.ts`, `MockRbacError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (3 nodes): `listItemsAction()`, `normalizeArgs()`, `listItemsAction.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (3 nodes): `getCashDrawerDashboardAction()`, `optionalStringField()`, `drawer-dashboard.actions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `safeLoggedActionErrorMessage()` connect `Community 1` to `Community 0`, `Community 6`, `Community 7`, `Community 9`, `Community 13`, `Community 15`, `Community 16`, `Community 20`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `normalizeOptions()` connect `Community 0` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 45 inferred relationships involving `safeLoggedActionErrorMessage()` (e.g. with `getCustomerManagementData()` and `getCustomerAnalyticsData()`) actually correct?**
  _`safeLoggedActionErrorMessage()` has 45 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `safeSuccessActionErrorResult()` (e.g. with `registerUser()` and `signInWithCredentials()`) actually correct?**
  _`safeSuccessActionErrorResult()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._