# Graph Report - aqstoqflow  (2026-06-09)

## Corpus Check
- 554 files · ~1,549,855 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2221 nodes · 3008 edges · 72 communities detected
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 472 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]

## God Nodes (most connected - your core abstractions)
1. `localizePath()` - 55 edges
2. `pickLocale()` - 47 edges
3. `SystemMonitor` - 40 edges
4. `useNotifications()` - 36 edges
5. `getSession()` - 31 edges
6. `ResilientDatabase` - 29 edges
7. `CircuitBreaker` - 23 edges
8. `ErrorHandler` - 23 edges
9. `scopedOrg()` - 22 edges
10. `requireOrg()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `handleCreatePurchaseOrder()` --calls--> `localizedRedirect()`  [INFERRED]
  app\[locale]\(dashboard)\dashboard\purchase-orders\new\page.tsx → i18n\server-routing.ts
- `localizedHref()` --calls--> `localizePath()`  [INFERRED]
  components\auth\EnhancedLoginForm.tsx → i18n\routing.ts
- `localizedHref()` --calls--> `localizePath()`  [INFERRED]
  components\Forms\ForgotPasswordForm.tsx → i18n\routing.ts
- `registerUser()` --calls--> `logSecurityEvent()`  [INFERRED]
  actions\auth.ts → lib\security\audit-log.ts
- `registerUser()` --calls--> `VerifyEmail()`  [INFERRED]
  actions\auth.ts → components\email-templates\verify-email.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (105): RootLayout(), NotFound(), HomePage(), applySecurityHeaders(), getClientIP(), getLocaleRequestHeaders(), getSafeLocalizedRedirectPath(), isAuthenticated() (+97 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (49): createErrorNotification(), getCategoryString(), useFormErrorHandler(), useServerActionHandler(), useCreateALocation(), useDeleteLocation(), useOrgLocationsNew(), useUpdateALocation() (+41 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (67): GET(), ChangePass(), checkAllPermissions(), checkAnyPermission(), checkPermission(), getAuthenticatedUser(), redirectForAuthError(), redirectWithRequestLocale() (+59 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (62): getFinanceDashboardAction(), addPOSCartLineAction(), getActivePOSCartAction(), removePOSCartLineAction(), updatePOSCartLineAction(), getPOSCatalogAction(), getPOSLocationsAction(), getPOSTerminalsAction() (+54 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (65): PurchaseOrderEditPage(), CreatePurchaseOrderPage(), handleCreatePurchaseOrder(), applyInventoryReceipt(), approvePurchaseOrder(), assertDateRange(), assertUniqueItems(), bulkUpdateStatus() (+57 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (40): normalizeSlug(), registerUser(), resolveUniqueOrganizationSlug(), signInWithCredentials(), toPrismaLocale(), localizedHref(), onSubmit(), localizedHref() (+32 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (32): ResetPasswordEmail(), handleResend(), localizedHref(), onSubmit(), localizedHref(), onSubmit(), saveRole(), localizedHref() (+24 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (5): createAlert(), getNodeMemoryUsage(), getNodePackageVersion(), startSystemMonitoring(), SystemMonitor

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (39): avatarSvg(), brandSvg(), categorySvg(), clearSeededData(), day(), ensureSeedImages(), escapeXml(), hashPassword() (+31 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (14): categorizeError(), getErrorCode(), getRuntimeErrorName(), getUserMessage(), hashString(), isKnownPrismaErrorName(), isPrismaKnownRequestError(), shouldRetry() (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (17): actionError(), async(), cashTenderOptions(), clampCartLineQuantity(), commitQuantityDraft(), createTenderLine(), getCartLineQuantityOnHand(), handleAddItem() (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.1
Nodes (28): createBrand(), deleteBrand(), getBrandById(), listBrands(), slugify(), toDTO(), updateBrand(), assertParentBelongsToOrg() (+20 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (3): dbOperation(), dbTransaction(), ResilientDatabase

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (4): CircuitBreaker, CircuitBreakerManager, createCircuitBreaker(), executeWithCircuitBreaker()

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (23): buildSupplierManagementRows(), createSupplier(), createSupplierForManagement(), getSupplierDetailAnalyticsForOrg(), getSupplierManagementDataForOrg(), nextSupplierCode(), reloadSupplierManagementRow(), removeSupplierForManagement() (+15 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (24): assertUniqueTaxRateName(), cleanText(), createTaxRate(), createTaxRateForManagement(), deleteTaxRate(), getTaxRate(), getTaxRateManagementDataForOrg(), reloadTaxRateManagementRow() (+16 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (21): archiveLocationForManagement(), assertManagerBelongsToOrg(), cleanText(), createLocationForManagement(), getLocationManagementDataForOrg(), listLocations(), normalizeCode(), resolveUniqueLocationCode() (+13 more)

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (23): buildCustomerManagementRows(), createCustomer(), createCustomerForManagement(), getCustomerDetailAnalyticsForOrg(), getCustomerManagementDataForOrg(), nextCustomerCode(), reloadCustomerManagementRow(), removeCustomerForManagement() (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (23): assertUniqueUnitIdentity(), cleanText(), createUnit(), createUnitForManagement(), deleteUnit(), getUnit(), getUnitManagementDataForOrg(), reloadUnitManagementRow() (+15 more)

### Community 19 - "Community 19"
Cohesion: 0.16
Nodes (19): seedRbacTestDemo(), clearDatabase(), seedCommercialAgents(), seedFinanceDemo(), hashPassword(), seedIntegratedRbacDemo(), now(), runCurrentSeed() (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.19
Nodes (20): createCustomer(), deleteCustomer(), emptyToNull(), getCustomer(), getCustomerOrders(), getCustomers(), getUserOrganizationId(), mapCustomer() (+12 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (14): getBaseMutationOptions(), useApprovePurchaseOrder(), useBulkDeletePurchaseOrders(), useBulkUpdatePurchaseOrderStatus(), useCancelPurchaseOrder(), useClosePurchaseOrder(), useCreatePurchaseOrder(), useDeletePurchaseOrder() (+6 more)

### Community 22 - "Community 22"
Cohesion: 0.25
Nodes (19): build_skus(), find_item_header(), fmt_money(), fmt_number(), fmt_percent(), ingredient_group(), is_ingredient_name(), is_number() (+11 more)

### Community 23 - "Community 23"
Cohesion: 0.19
Nodes (13): commitPOSSale(), cleanJson(), digitalReceiptUrl(), displayName(), findSalesReceipt(), getPublicSalesReceipt(), getSalesReceipt(), normalizePhoneNumber() (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.16
Nodes (2): executeFinancialOperation(), FinancialSafety

### Community 25 - "Community 25"
Cohesion: 0.19
Nodes (13): addAging(), ageBucket(), dateKey(), endOfDay(), getFinanceDashboard(), resolveDateRange(), startOfDay(), startOfMonth() (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.16
Nodes (6): alertText(), defaultCustomRange(), inputDate(), KpiCard(), metricToneClass(), money()

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (3): toBriefItemSupplierDTO(), toItemSupplierDTO(), toNumberOrUndefined()

### Community 28 - "Community 28"
Cohesion: 0.24
Nodes (11): buildAllSalesWhere(), buildSalesWhere(), getAllDashboardData(), getChange(), getDashboardMetrics(), getPeriodRange(), isUsableOrganization(), resolveDashboardOrganizationId() (+3 more)

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (12): deletePhoto(), deletePhotoLocally(), requireMatchingOrganization(), savePhotoLocally(), uploadPhoto(), buildLocalStoragePath(), defaultStorageConfiguration(), ensureLocalStorageDirectories() (+4 more)

### Community 30 - "Community 30"
Cohesion: 0.14
Nodes (3): exportDataToExcel(), handleExportData(), handleExportData()

### Community 31 - "Community 31"
Cohesion: 0.18
Nodes (4): formatCurrency(), formatNumber(), getDefaultCreateForm(), submitCreateOrganization()

### Community 35 - "Community 35"
Cohesion: 0.2
Nodes (4): alertText(), defaultCustomRange(), inputDate(), money()

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (3): NotificationIcon(), if(), getPerformanceBadge()

### Community 38 - "Community 38"
Cohesion: 0.3
Nodes (9): currencyThresholds(), dateKey(), endOfDay(), getCashDrawerDashboard(), resolveDateRange(), startOfDay(), startOfMonth(), sumBy() (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.27
Nodes (7): createInventoryTransaction(), displayName(), mapItem(), mapTransfer(), mapUser(), toNumber(), updateInventoryForTransfer()

### Community 41 - "Community 41"
Cohesion: 0.29
Nodes (7): guardItem(), handleBasicInfoSubmit(), handleItemDetailsSubmit(), handleItemPricingSubmit(), handleItemStockSubmit(), handleRelationsSubmit(), handleTrackingSubmit()

### Community 42 - "Community 42"
Cohesion: 0.25
Nodes (8): handleChange(), handleChange(), filterByDateRange(), filterByLast7Days(), filterByThisMonth(), filterByThisYear(), filterByToday(), filterByYesterday()

### Community 43 - "Community 43"
Cohesion: 0.2
Nodes (2): getDefaultForm(), submitForm()

### Community 45 - "Community 45"
Cohesion: 0.2
Nodes (2): formatNumber(), formatPercent()

### Community 46 - "Community 46"
Cohesion: 0.44
Nodes (9): displayUser(), getCashFlowReport(), getCashierPerformanceReport(), getFinancialSummaryReport(), getItemPerformanceReport(), getSalesOrders(), periodLabel(), scopedLocationId() (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.44
Nodes (9): createId(), dispatch(), isOptions(), normalizeAction(), normalizeFromArgs(), normalizeInput(), normalizeType(), show() (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (5): fetchDailyData(), getDailyReportData(), getFinancialMetrics(), getSalesOrders(), toNumber()

### Community 52 - "Community 52"
Cohesion: 0.31
Nodes (4): handleNext(), handleStepClick(), initializeEditMode(), validateStep()

### Community 55 - "Community 55"
Cohesion: 0.28
Nodes (3): useAllOrgBrands(), useBriefBrandsByOrgId(), useOrgBrands()

### Community 56 - "Community 56"
Cohesion: 0.28
Nodes (3): useAllOrgCategories(), useBriefCategoriesByOrgId(), useOrgCategories()

### Community 57 - "Community 57"
Cohesion: 0.25
Nodes (1): ErrorBoundary

### Community 60 - "Community 60"
Cohesion: 0.29
Nodes (2): getDashboardSummary(), getSalesAnalytics()

### Community 61 - "Community 61"
Cohesion: 0.29
Nodes (4): addItemSuppliers(), handleClose(), handleKeyDown(), handleSubmit()

### Community 63 - "Community 63"
Cohesion: 0.5
Nodes (7): all_files_under(), concat_all(), grade_assertion(), grade_run(), main(), Programmatic grader for professional-dashboard-creator evals.  Reads each eval_m, read_text()

### Community 64 - "Community 64"
Cohesion: 0.36
Nodes (4): buildCrudMutationNotification(), getFriendlyErrorMessage(), safeString(), titleCase()

### Community 65 - "Community 65"
Cohesion: 0.32
Nodes (4): createStockFlowActionWrapper(), isStructuredActionError(), normalizeActionError(), withErrorHandling()

### Community 66 - "Community 66"
Cohesion: 0.48
Nodes (5): handleAddLine(), handleSubmit(), itemDisplayName(), itemSku(), resetForm()

### Community 70 - "Community 70"
Cohesion: 0.47
Nodes (3): handleCreateOrder(), handleNavigation(), localizedHref()

### Community 71 - "Community 71"
Cohesion: 0.47
Nodes (4): DateColumn(), getPastDays(), timeAgo(), getNormalDate()

### Community 75 - "Community 75"
Cohesion: 0.33
Nodes (1): ErrorBoundary

### Community 77 - "Community 77"
Cohesion: 0.8
Nodes (5): ensureItem(), ensureLocation(), ensureOrganization(), now(), seedProductionData()

### Community 79 - "Community 79"
Cohesion: 0.5
Nodes (2): generateSimpleSKU(), handleGenerateSKU()

### Community 81 - "Community 81"
Cohesion: 0.6
Nodes (3): clearSearch(), handleSearch(), runSearch()

### Community 83 - "Community 83"
Cohesion: 0.5
Nodes (2): createNotificationCallback(), setupErrorNotificationIntegration()

### Community 85 - "Community 85"
Cohesion: 0.5
Nodes (2): sendInvite(), sendInvitation()

### Community 90 - "Community 90"
Cohesion: 0.67
Nodes (2): getStockStatusBadge(), getTrendIcon()

### Community 92 - "Community 92"
Cohesion: 0.67
Nodes (2): toItemSupplierDTO(), toNumberOrUndefined()

### Community 93 - "Community 93"
Cohesion: 0.67
Nodes (2): sink(), write()

### Community 95 - "Community 95"
Cohesion: 0.83
Nodes (3): clean_value(), load_model_module(), main()

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (2): listItemsAction(), normalizeArgs()

### Community 97 - "Community 97"
Cohesion: 1.0
Nodes (2): mapItemDTO(), toNumber()

### Community 106 - "Community 106"
Cohesion: 0.67
Nodes (1): Build a schema-correct benchmark.json + upgrade grading.json files.

### Community 109 - "Community 109"
Cohesion: 1.0
Nodes (2): getRequestAuditContext(), readHeader()

### Community 111 - "Community 111"
Cohesion: 1.0
Nodes (2): toNumber(), updateInventoryLevels()

### Community 112 - "Community 112"
Cohesion: 1.0
Nodes (2): main(), updateFile()

### Community 113 - "Community 113"
Cohesion: 0.67
Nodes (1): MockRbacError

## Knowledge Gaps
- **2 isolated node(s):** `Build a schema-correct benchmark.json + upgrade grading.json files.`, `Programmatic grader for professional-dashboard-creator evals.  Reads each eval_m`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 24`** (18 nodes): `executeFinancialOperation()`, `FinancialSafety`, `.checkIdempotency()`, `.constructor()`, `.createJournalEntries()`, `.executeCompensatingActions()`, `.executeFinancialSaga()`, `.executeFinancialSagaStep()`, `.executeFinancialTransaction()`, `.getAuditTrail()`, `.getInstance()`, `.handleFinancialError()`, `.reconcileFinancialBalances()`, `.recordAuditEntry()`, `.roundToCurrencyPrecision()`, `.validateCurrencyAmount()`, `.validateFinancialTransaction()`, `financial-safety.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (11 nodes): `LocationsManagementDashboard.tsx`, `ContactLine()`, `CountPill()`, `dashboardPath()`, `escapeCsv()`, `formatCurrency()`, `formatDate()`, `formatNumber()`, `formFromLocation()`, `getDefaultForm()`, `submitForm()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (11 nodes): `TaxRatesManagementDashboard.tsx`, `dashboardPath()`, `escapeCsv()`, `formatDate()`, `formatNumber()`, `formatPercent()`, `formFromTaxRate()`, `getDefaultForm()`, `getRateBand()`, `SortIcon()`, `toneClass()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (9 nodes): `ErrorBoundary`, `.componentDidCatch()`, `.constructor()`, `.getDerivedStateFromError()`, `.logErrorToSystem()`, `.render()`, `ErrorFallbackComponent()`, `WithErrorBoundaryComponent()`, `client-error-boundary.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (8 nodes): `getSalesAnalytics.ts`, `displayName()`, `getCashReconciliationReports()`, `getDashboardSummary()`, `getProductPerformance()`, `getSalesAnalytics()`, `getUserPerformance()`, `toNumber()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (6 nodes): `ErrorBoundary`, `.componentDidCatch()`, `.constructor()`, `.getDerivedStateFromError()`, `.render()`, `error-boundary.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (5 nodes): `SupplierEditForm.tsx`, `cn()`, `generateSimpleSKU()`, `handleGenerateSKU()`, `handleReset()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (5 nodes): `createNotificationCallback()`, `mapCategoryToNotification()`, `mapSeverityToNotification()`, `setupErrorNotificationIntegration()`, `notification-integration.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (4 nodes): `sendInvite.ts`, `userInvitationForm.tsx`, `sendInvite()`, `sendInvitation()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (4 nodes): `item-performance-report.tsx`, `formatCurrency()`, `getStockStatusBadge()`, `getTrendIcon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (4 nodes): `toItemSupplierDTO()`, `toNumberOrUndefined()`, `useAllItemSuppliers.ts`, `useUpdateItemSupplier()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (4 nodes): `setLoggerSink()`, `sink()`, `logger.ts`, `write()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (3 nodes): `listItemsAction.ts`, `listItemsAction()`, `normalizeArgs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (3 nodes): `getBriefOrgItems.ts`, `mapItemDTO()`, `toNumber()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 106`** (3 nodes): `build_benchmark.py`, `agg()`, `Build a schema-correct benchmark.json + upgrade grading.json files.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (3 nodes): `getRequestAuditContext()`, `readHeader()`, `auth.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 111`** (3 nodes): `toNumber()`, `updateInventoryLevels()`, `update-inventory-levels.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (3 nodes): `main()`, `update-image-uploads.ts`, `updateFile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 113`** (3 nodes): `protect.test.ts`, `MockRbacError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `localizePath()` connect `Community 0` to `Community 2`, `Community 5`, `Community 70`, `Community 6`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `requireOrg()` connect `Community 3` to `Community 16`, `Community 17`, `Community 4`, `Community 14`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `getSession()` connect `Community 2` to `Community 0`, `Community 15`, `Community 16`, `Community 18`, `Community 28`, `Community 29`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Are the 52 inferred relationships involving `localizePath()` (e.g. with `getSafeLocalizedRedirectPath()` and `middleware()`) actually correct?**
  _`localizePath()` has 52 INFERRED edges - model-reasoned connections that need verification._
- **Are the 45 inferred relationships involving `pickLocale()` (e.g. with `middleware()` and `HomePage()`) actually correct?**
  _`pickLocale()` has 45 INFERRED edges - model-reasoned connections that need verification._
- **Are the 35 inferred relationships involving `useNotifications()` (e.g. with `CustomerOrdersPage()` and `EnhancedNotificationTest()`) actually correct?**
  _`useNotifications()` has 35 INFERRED edges - model-reasoned connections that need verification._
- **Are the 28 inferred relationships involving `getSession()` (e.g. with `resolveDashboardOrganizationId()` and `assertOrganizationAccess()`) actually correct?**
  _`getSession()` has 28 INFERRED edges - model-reasoned connections that need verification._