# Graph Report - actions  (2026-08-09)

## Corpus Check
- 227 files · ~85,496 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1044 nodes · 1284 edges · 71 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 92 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 119|Community 119]]

## God Nodes (most connected - your core abstractions)
1. `safeLoggedActionErrorMessage()` - 50 edges
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
- `createBulkCategories()` --calls--> `createCategory()`  [INFERRED]
  categories\createBulkCategories.ts → categories\getCategoriesAction.ts
- `actionError()` --calls--> `safeActionErrorMessage()`  [INFERRED]
  categories\getCategoriesAction.ts → _shared\safe-action-responses.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (32): registerUser(), signInWithCredentials(), boundedError(), createBulkCategories(), emptyResult(), normalizeCreateInput(), normalizeImageUrl(), createLocation() (+24 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (30): createItemAction(), updateItemFromFormAction(), addItemSuppliers(), getActionErrorMessage(), getActionErrorMessage(), getItemWithSuppliersById(), getOrgLocations(), createOrganizationSettings() (+22 more)

### Community 2 - "Community 2"
Cohesion: 0.2
Nodes (26): approvePurchaseOrder(), bulkUpdatePurchaseOrderStatus(), cancelPurchaseOrder(), clonePurchaseOrder(), closePurchaseOrder(), createPurchaseOrder(), deletePurchaseOrder(), exportPurchaseOrders() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (19): createCustomer(), deleteCustomer(), emptyToNull(), getCustomer(), getCustomerOrders(), getCustomers(), requireCustomerAccess(), toCreateInput() (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.24
Nodes (14): asRecord(), booleanValue(), defaultPayrollSetupWindow(), dryRunValue(), employeeSourceMode(), firstValue(), isoDate(), numberValue() (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.28
Nodes (14): deletePhoto(), deletePhotoLocally(), requireInventoryPhotoWrite(), savePhotoLocally(), uploadPhoto(), buildLocalStoragePath(), defaultStorageConfiguration(), ensureLocalStorageDirectories() (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.3
Nodes (13): createActionTaxRate(), normalizeTaxRateInput(), getOrgTaxRates(), assertOrganizationAccess(), cleanText(), createManagedTaxRate(), deleteManagedTaxRate(), getActionErrorMessage() (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.23
Nodes (9): signBranchDailyCloseAction(), asRecord(), booleanValue(), certificationInput(), certifyPayrollPilotCycleAction(), firstValue(), signoff(), signoffBundle() (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.2
Nodes (8): getAccountingDashboardSummaryAction(), getCashReconciliationReports(), getDashboardSummary(), getProductPerformance(), getSalesAnalytics(), getUserPerformance(), salesAnalyticsInput(), salesAnalyticsLocationInput()

### Community 13 - "Community 13"
Cohesion: 0.41
Nodes (12): assertOrganizationAccess(), cleanText(), createManagedCustomer(), deleteManagedCustomer(), getActionErrorMessage(), getCustomerAnalyticsData(), getCustomerManagementData(), hasPermission() (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.41
Nodes (12): assertOrganizationAccess(), cleanText(), createManagedSupplier(), deleteManagedSupplier(), getActionErrorMessage(), getSupplierAnalyticsData(), getSupplierManagementData(), hasPermission() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (2): asRecord(), ownRequestFields()

### Community 17 - "Community 17"
Cohesion: 0.3
Nodes (8): asRecord(), countryPackReviewIntakeInput(), firstValue(), parseProposedCountryPack(), resolveBaseCountryPack(), reviewTopicEvidence(), stringValue(), targetFamilies()

### Community 18 - "Community 18"
Cohesion: 0.44
Nodes (11): createItemSupplier(), deleteItemSupplier(), getAllOrgItemSuppliers(), getItemSupplierActionErrorMessage(), getItemSupplierById(), getItemSuppliers(), getItemSuppliersByItemId(), itemSupplierActionError() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.44
Nodes (10): actionError(), createCategory(), deleteCategory(), getCategoryById(), getOrgCategories(), normalizeCreateInput(), normalizeImageUrl(), normalizeUpdateInput() (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.55
Nodes (10): archiveManagedLocation(), assertOrganizationAccess(), cleanText(), createManagedLocation(), getActionErrorMessage(), getLocationManagementData(), getValidationMessage(), observeSettingsLocationAccess() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.55
Nodes (10): archiveManagedTerminal(), assertOrganizationAccess(), cleanText(), createManagedTerminal(), getActionErrorMessage(), getTerminalManagementData(), getValidationResult(), observePOSTerminalModuleAccess() (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.47
Nodes (9): actionError(), createBrand(), deleteBrand(), getBrandById(), getOrgBrands(), normalizeCreateInput(), normalizeUpdateInput(), requireBrandAction() (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.36
Nodes (6): getOfflineSyncDashboardAction(), offlineActionErrorCode(), registerOfflineDeviceAction(), replayOfflineSaleEnvelopeAction(), syncOfflineEventsAction(), withOfflineActionContract()

### Community 30 - "Community 30"
Cohesion: 0.43
Nodes (6): configureCountryAdapterPilotAction(), disableCountryAdapterAction(), errorCodeFor(), recordCountryAdapterReviewAction(), rotateCountryAdapterCredentialAction(), withOk()

### Community 31 - "Community 31"
Cohesion: 0.32
Nodes (3): asRecord(), getProofTrailAction(), requireSubjectType()

### Community 32 - "Community 32"
Cohesion: 0.36
Nodes (3): asRecord(), certificationFields(), correctionFields()

### Community 33 - "Community 33"
Cohesion: 0.36
Nodes (4): createCountSummary(), dateValue(), postedCountSummary(), submittedCountSummary()

### Community 34 - "Community 34"
Cohesion: 0.36
Nodes (5): actionPayload(), asRecord(), inconsistentScope(), normalizedLocationIds(), resolveTrustedLocationScope()

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (1): FreshAuthRequiredError

### Community 41 - "Community 41"
Cohesion: 0.38
Nodes (3): asRecord(), decisionFields(), readFields()

### Community 43 - "Community 43"
Cohesion: 0.43
Nodes (4): decimal(), frozenCountSession(), postedCountResult(), submittedCountSession()

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (1): MockRbacError

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 46 - "Community 46"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 47 - "Community 47"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 48 - "Community 48"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 49 - "Community 49"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 50 - "Community 50"
Cohesion: 0.29
Nodes (1): MockRbacError

### Community 51 - "Community 51"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 52 - "Community 52"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 53 - "Community 53"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 54 - "Community 54"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 55 - "Community 55"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 56 - "Community 56"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 57 - "Community 57"
Cohesion: 0.29
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 60 - "Community 60"
Cohesion: 0.6
Nodes (5): analyticsReportInput(), getCashFlowReport(), getCashierPerformanceReport(), getFinancialSummaryReport(), getItemPerformanceReport()

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 64 - "Community 64"
Cohesion: 0.33
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 65 - "Community 65"
Cohesion: 0.4
Nodes (2): asRecord(), enqueuePayload()

### Community 67 - "Community 67"
Cohesion: 0.67
Nodes (5): getPOSCatalogAction(), getPOSLocationsAction(), getPOSTerminalsAction(), observePOSCatalogModuleAccess(), optionalStringField()

### Community 68 - "Community 68"
Cohesion: 0.47
Nodes (3): getGoodsReceiptsForPurchaseOrder(), getPurchaseOrdersSummary(), scopedOrg()

### Community 70 - "Community 70"
Cohesion: 0.6
Nodes (4): dailyReportInput(), financialAnalyticsInput(), getDailyReportData(), getFinancialMetrics()

### Community 71 - "Community 71"
Cohesion: 0.4
Nodes (2): MockFreshAuthRequiredError, MockRbacError

### Community 72 - "Community 72"
Cohesion: 0.5
Nodes (2): actionPayload(), asRecord()

### Community 76 - "Community 76"
Cohesion: 0.4
Nodes (1): MockRbacError

### Community 77 - "Community 77"
Cohesion: 0.4
Nodes (1): MockRbacError

### Community 79 - "Community 79"
Cohesion: 0.7
Nodes (4): enforceCashPaymentModules(), getCashPaymentHistoryAction(), hasAny(), prepareCashPaymentHistoryExportAction()

### Community 80 - "Community 80"
Cohesion: 0.8
Nodes (4): failure(), isAuthenticationBoundaryError(), stepUpWithPasswordAction(), toActionResult()

### Community 85 - "Community 85"
Cohesion: 0.83
Nodes (3): getAllDashboardData(), getDashboardMetrics(), requireDashboardReadContext()

### Community 88 - "Community 88"
Cohesion: 0.5
Nodes (1): MockFreshAuthRequiredError

### Community 89 - "Community 89"
Cohesion: 0.5
Nodes (1): MockFreshAuthRequiredError

### Community 90 - "Community 90"
Cohesion: 0.5
Nodes (1): MockFreshAuthRequiredError

### Community 91 - "Community 91"
Cohesion: 0.5
Nodes (1): MockFreshAuthRequiredError

### Community 92 - "Community 92"
Cohesion: 0.5
Nodes (1): MockFreshAuthRequiredError

### Community 94 - "Community 94"
Cohesion: 0.5
Nodes (1): MockRbacError

### Community 98 - "Community 98"
Cohesion: 0.5
Nodes (1): MockRbacError

### Community 99 - "Community 99"
Cohesion: 0.5
Nodes (1): MockRbacError

### Community 100 - "Community 100"
Cohesion: 0.5
Nodes (1): MockRbacError

### Community 101 - "Community 101"
Cohesion: 0.83
Nodes (3): enforceAPHistoryModule(), getAPHistoryAction(), prepareAPHistoryExportAction()

### Community 102 - "Community 102"
Cohesion: 0.67
Nodes (2): displayRoleName(), withDisplayRoleName()

### Community 103 - "Community 103"
Cohesion: 0.5
Nodes (1): MockFreshAuthRequiredError

### Community 104 - "Community 104"
Cohesion: 0.67
Nodes (1): MockRbacError

### Community 112 - "Community 112"
Cohesion: 1.0
Nodes (2): listItemsAction(), normalizeArgs()

### Community 115 - "Community 115"
Cohesion: 1.0
Nodes (2): managerActionCenterData(), managerActionCenterResult()

### Community 119 - "Community 119"
Cohesion: 1.0
Nodes (2): getCashDrawerDashboardAction(), optionalStringField()

## Knowledge Gaps
- **1 isolated node(s):** `MockFreshAuthRequiredError`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 16`** (12 nodes): `applyApprovedHrisPaymentDestinationChangeAction()`, `approveHrisPaymentDestinationChangeAction()`, `asRecord()`, `getHrisPaymentDestinationStatusAction()`, `getOwnHrisPaymentDestinationStatusAction()`, `managedMutation()`, `ownRequestFields()`, `rejectHrisPaymentDestinationChangeAction()`, `requestHrisPaymentDestinationChangeAction()`, `requestOwnHrisPaymentDestinationChangeAction()`, `revalidatePaymentDestinationPaths()`, `payment-destination.actions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (7 nodes): `branch-daily-close-sign-off.actions.test.ts`, `freshAuthFixture()`, `FreshAuthRequiredError`, `.constructor()`, `setContextOverride()`, `signOffFixture()`, `validInput()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (7 nodes): `inventoryLossReadActions.test.ts`, `locationAccess()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`, `tenantAccess()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (7 nodes): `inventoryMovementHistoryActions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (7 nodes): `inventoryMovementHistoryBackgroundExportActions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (7 nodes): `payroll-compensation.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (7 nodes): `payroll-contract.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (7 nodes): `payroll-control.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (7 nodes): `payroll-country-pack-review-intake.actions.test.ts`, `certificate()`, `intakeInput()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (7 nodes): `payroll-employee.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (7 nodes): `payroll-payment-evidence.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (7 nodes): `payroll-payment-reconciliation.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (7 nodes): `payroll-payslip-self-service.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (7 nodes): `payroll-register.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (7 nodes): `tender.actions.test.ts`, `expectPosModuleGate()`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (7 nodes): `ap-control.actions.test.ts`, `invoiceInput()`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (6 nodes): `compliance-center.actions.test.ts`, `expectComplianceModuleGate()`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (6 nodes): `employee.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `MockRbacError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (6 nodes): `asRecord()`, `createInventoryMovementHistoryBackgroundExportDownloadGrantAction()`, `enqueueInventoryMovementHistoryBackgroundExportAction()`, `enqueuePayload()`, `getInventoryMovementHistoryBackgroundExportStatusAction()`, `inventoryMovementHistoryBackgroundExportActions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (5 nodes): `country-adapter-pilot.actions.test.ts`, `expectComplianceModuleGate()`, `MockFreshAuthRequiredError`, `MockRbacError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (5 nodes): `actionPayload()`, `asRecord()`, `exportInventoryMovementHistoryAction()`, `getInventoryMovementHistoryAction()`, `inventoryMovementHistoryActions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (5 nodes): `payroll-command-read-model.actions.test.ts`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (5 nodes): `payroll-setup.actions.test.ts`, `MockRbacError`, `.constructor()`, `moduleDecision()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (4 nodes): `approval-inbox.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (4 nodes): `compensation.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (4 nodes): `lifecycle.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (4 nodes): `payment-destination.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (4 nodes): `time-leave.actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (4 nodes): `reconciliation-workbench.actions.test.ts`, `MockRbacError`, `.constructor()`, `moduleDecision()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 98`** (4 nodes): `catalog.actions.test.ts`, `MockRbacError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (4 nodes): `drawer-dashboard.actions.test.ts`, `MockRbacError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (4 nodes): `terminal-management.actions.test.ts`, `MockRbacError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (4 nodes): `displayRoleName()`, `displayUserName()`, `role-utils.ts`, `withDisplayRoleName()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 103`** (4 nodes): `role-actions.test.ts`, `MockFreshAuthRequiredError`, `.constructor()`, `rbacContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 104`** (3 nodes): `settings.actions.test.ts`, `MockRbacError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (3 nodes): `listItemsAction()`, `normalizeArgs()`, `listItemsAction.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 115`** (3 nodes): `manager-action-center.actions.test.ts`, `managerActionCenterData()`, `managerActionCenterResult()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 119`** (3 nodes): `getCashDrawerDashboardAction()`, `optionalStringField()`, `drawer-dashboard.actions.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `safeLoggedActionErrorMessage()` connect `Community 1` to `Community 0`, `Community 7`, `Community 8`, `Community 13`, `Community 15`, `Community 18`, `Community 21`, `Community 22`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `normalizeOptions()` connect `Community 0` to `Community 1`, `Community 3`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `safeActionErrorMessage()` connect `Community 0` to `Community 24`, `Community 19`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 47 inferred relationships involving `safeLoggedActionErrorMessage()` (e.g. with `getCustomerManagementData()` and `getCustomerAnalyticsData()`) actually correct?**
  _`safeLoggedActionErrorMessage()` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `safeSuccessActionErrorResult()` (e.g. with `registerUser()` and `signInWithCredentials()`) actually correct?**
  _`safeSuccessActionErrorResult()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MockFreshAuthRequiredError` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._