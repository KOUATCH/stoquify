# Graph Report - components  (2026-08-09)

## Corpus Check
- 306 files · ~268,456 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1173 nodes · 1089 edges · 71 communities detected
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 119|Community 119]]
- [[_COMMUNITY_Community 122|Community 122]]
- [[_COMMUNITY_Community 127|Community 127]]
- [[_COMMUNITY_Community 128|Community 128]]
- [[_COMMUNITY_Community 129|Community 129]]
- [[_COMMUNITY_Community 130|Community 130]]
- [[_COMMUNITY_Community 131|Community 131]]
- [[_COMMUNITY_Community 132|Community 132]]

## God Nodes (most connected - your core abstractions)
1. `String()` - 32 edges
2. `buildTodaysOperatingTruthModel()` - 13 edges
3. `withActionError()` - 9 edges
4. `actionError()` - 9 edges
5. `toErrorMessage()` - 8 edges
6. `resolveDashboardHref()` - 7 edges
7. `guardItem()` - 7 edges
8. `buildStatusItems()` - 6 edges
9. `buildKpis()` - 6 edges
10. `createStatement()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `String()` --calls--> `escapeCsv()`  [INFERRED]
  cash-command\CashCommandDashboard.tsx → locations\LocationsManagementDashboard.tsx
- `String()` --calls--> `displayValue()`  [INFERRED]
  cash-command\CashCommandDashboard.tsx → payroll\PayrollCommandCenter.tsx
- `String()` --calls--> `normalizeLocaleLabel()`  [INFERRED]
  cash-command\CashCommandDashboard.tsx → settings\OrganizationManagementTable.tsx
- `String()` --calls--> `escapeCsv()`  [INFERRED]
  cash-command\CashCommandDashboard.tsx → settings\OrganizationManagementTable.tsx
- `String()` --calls--> `escapeCsv()`  [INFERRED]
  cash-command\CashCommandDashboard.tsx → tax-rates\TaxRatesManagementDashboard.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (28): String(), escapeCsv(), formFromCustomer(), formatCellValue(), getAccessorId(), clearSearch(), handleSearch(), runSearch() (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (20): actionError(), async(), cashTenderOptions(), clampCartLineQuantity(), commitQuantityDraft(), createTenderLine(), getCartLineQuantityOnHand(), handleAddItem() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (16): buildActionItems(), buildEvidenceEvents(), buildKpis(), buildOnboarding(), buildShortcuts(), buildStatusItems(), buildTodaysOperatingTruthModel(), countAvailableSources() (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (12): AssuranceIncidentAcknowledgeButton(), handleAcknowledge(), handleSubmit(), notifyFailure(), notifySuccess(), defaultCustomRange(), inputDate(), useSpecializedFinanceDashboard() (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (13): actionErrorMessage(), downloadClosePack(), handleAssign(), handleCertifiedExport(), handleComment(), handleDraftExport(), handleReviewUpdate(), handleRun() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (9): defaults(), guardItem(), handleBasicInfoSubmit(), handleItemDetailsSubmit(), handleItemPricingSubmit(), handleItemStockSubmit(), handleRelationsSubmit(), handleTrackingSubmit() (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (4): actionInput(), displayValue(), evaluateIntake(), recordIntake()

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (9): exportStatus(), buildInventoryHistoryKpis(), formatDecimal(), formatHistoryDate(), formatMoney(), movementIcon(), movementTone(), MovementTypeBadge() (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (9): CompleteIntegratedDailySalesDashboard(), analyticsStockTone(), analyticsToneClass(), analyticsToneText(), analyticsTrendText(), CashFlowReportComponent(), getPerformanceColor(), getStockStatusBadge() (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (6): escapeCsv(), formatCurrency(), formatNumber(), getDefaultCreateForm(), normalizeLocaleLabel(), submitCreateOrganization()

### Community 10 - "Community 10"
Cohesion: 0.2
Nodes (3): finish(), nextKey(), noticeFromResponse()

### Community 11 - "Community 11"
Cohesion: 0.2
Nodes (4): alertText(), defaultCustomRange(), inputDate(), money()

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (3): escapeCsv(), formatNumber(), formatPercent()

### Community 13 - "Community 13"
Cohesion: 0.2
Nodes (2): defaultCustomRange(), inputDate()

### Community 14 - "Community 14"
Cohesion: 0.2
Nodes (3): escapeCsv(), getDefaultForm(), submitForm()

### Community 15 - "Community 15"
Cohesion: 0.2
Nodes (2): formatDate(), formatPeriod()

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (6): createIcon(), get(), renderControls(), createIcon(), get(), PurchaseOrdersRouteBoundary

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (2): downloadJson(), handleExport()

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (2): cn(), formatDateTime()

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (4): alertText(), defaultCustomRange(), inputDate(), money()

### Community 21 - "Community 21"
Cohesion: 0.44
Nodes (7): commandKey(), consentHash(), createStatement(), deliverStatement(), messageFromResult(), requireFreshPassword(), statementPeriodEnd()

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (2): handleExplicitSubmit(), handleSubmit()

### Community 24 - "Community 24"
Cohesion: 0.28
Nodes (3): loadProofTrail(), openBIProofTrail(), openProofTrail()

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (2): APControlWorkbench(), localeKey()

### Community 27 - "Community 27"
Cohesion: 0.29
Nodes (4): fetchDashboardData(), get(), makeIcon(), setDashboardData()

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (2): localizedHref(), onSubmit()

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (2): dashboardSeverityClass(), dashboardToneClass()

### Community 34 - "Community 34"
Cohesion: 0.38
Nodes (4): createIcon(), get(), suspenseFailure(), workbenchData()

### Community 35 - "Community 35"
Cohesion: 0.48
Nodes (5): handleAddLine(), handleSubmit(), itemDisplayName(), itemSku(), resetForm()

### Community 36 - "Community 36"
Cohesion: 0.29
Nodes (2): getWorkflowAtlasOutcomesForRole(), selectRole()

### Community 37 - "Community 37"
Cohesion: 0.38
Nodes (4): getCategoryToneClass(), getIconStyles(), getNotificationStyles(), notificationTone()

### Community 38 - "Community 38"
Cohesion: 0.38
Nodes (3): dateLabel(), joinValues(), readinessProofSubject()

### Community 40 - "Community 40"
Cohesion: 0.43
Nodes (4): dateLabel(), joinValues(), money(), payslipProofSubject()

### Community 41 - "Community 41"
Cohesion: 0.33
Nodes (2): onSubmit(), submit()

### Community 42 - "Community 42"
Cohesion: 0.33
Nodes (2): onSubmit(), submit()

### Community 44 - "Community 44"
Cohesion: 0.38
Nodes (4): get(), makeIcon(), recordedReviewCertificate(), reviewCertificate()

### Community 45 - "Community 45"
Cohesion: 0.43
Nodes (4): actionSuccess(), mutationState(), setupHooks(), shiftFixture()

### Community 49 - "Community 49"
Cohesion: 0.4
Nodes (2): localizedHref(), onSubmit()

### Community 50 - "Community 50"
Cohesion: 0.4
Nodes (2): formatDate(), formatPeriod()

### Community 52 - "Community 52"
Cohesion: 0.47
Nodes (3): handleCreateOrder(), handleNavigation(), localizedHref()

### Community 57 - "Community 57"
Cohesion: 0.47
Nodes (3): buildSupplierExportCsv(), buildSupplierExportHeaders(), buildSupplierExportRows()

### Community 58 - "Community 58"
Cohesion: 0.4
Nodes (3): dateSortingFn(), dateSortValue(), globalFilterFn()

### Community 60 - "Community 60"
Cohesion: 0.5
Nodes (2): handleLogout(), localizedHref()

### Community 64 - "Community 64"
Cohesion: 0.6
Nodes (4): createIcon(), get(), reachMediaStep(), reachPricingStep()

### Community 68 - "Community 68"
Cohesion: 0.5
Nodes (2): get(), makeIcon()

### Community 69 - "Community 69"
Cohesion: 0.5
Nodes (2): formatBIValue(), formatMoney()

### Community 71 - "Community 71"
Cohesion: 0.67
Nodes (2): get(), makeIcon()

### Community 77 - "Community 77"
Cohesion: 0.67
Nodes (2): handleLogout(), localizedHref()

### Community 79 - "Community 79"
Cohesion: 0.83
Nodes (3): DateColumn(), getPastDays(), timeAgo()

### Community 81 - "Community 81"
Cohesion: 0.67
Nodes (2): createIcon(), get()

### Community 84 - "Community 84"
Cohesion: 0.67
Nodes (2): createIcon(), get()

### Community 87 - "Community 87"
Cohesion: 0.67
Nodes (2): createIcon(), get()

### Community 88 - "Community 88"
Cohesion: 0.67
Nodes (2): createIcon(), get()

### Community 94 - "Community 94"
Cohesion: 0.67
Nodes (2): createIcon(), get()

### Community 95 - "Community 95"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 101 - "Community 101"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 103 - "Community 103"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 105 - "Community 105"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 106 - "Community 106"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 107 - "Community 107"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 108 - "Community 108"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 110 - "Community 110"
Cohesion: 1.0
Nodes (2): localizedHref(), onSubmit()

### Community 112 - "Community 112"
Cohesion: 1.0
Nodes (2): localizedHref(), onSubmit()

### Community 119 - "Community 119"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 122 - "Community 122"
Cohesion: 1.0
Nodes (2): handleTabKeyDown(), selectTab()

### Community 127 - "Community 127"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 128 - "Community 128"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 129 - "Community 129"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 130 - "Community 130"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 131 - "Community 131"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 132 - "Community 132"
Cohesion: 1.0
Nodes (2): createIcon(), get()

## Knowledge Gaps
- **Thin community `Community 13`** (11 nodes): `cn()`, `defaultCustomRange()`, `exportDurableCertificate()`, `inputDate()`, `metricAccent()`, `notificationTypeKey()`, `paymentTransactionProofSubject()`, `severityClass()`, `signDurableRun()`, `statusClass()`, `PaymentReconciliationWorkbench.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (11 nodes): `actionTone()`, `cn()`, `DetailLine()`, `formatDate()`, `formatDateTime()`, `formatNumber()`, `formatPeriod()`, `getStateNotice()`, `MetaLine()`, `snapshotStatusTone()`, `ManagerLocationActionCenterDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (10 nodes): `downloadJson()`, `formatDate()`, `formatMoney()`, `handleExport()`, `MetricTile()`, `Panel()`, `severityClass()`, `statusClass()`, `trustLabel()`, `AccountantPortal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (10 nodes): `cn()`, `compactHash()`, `formatDateTime()`, `formatMoney()`, `formatNumber()`, `metricAccent()`, `refreshComplianceCenter()`, `statusClass()`, `sumCounts()`, `ComplianceCenterDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (9 nodes): `getCurrentStepComponent()`, `handleCancel()`, `handleExplicitSubmit()`, `handleInvalidSubmit()`, `handleNext()`, `handlePrevious()`, `handleStepClick()`, `handleSubmit()`, `CreateItemWizard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (9 nodes): `APControlWorkbench()`, `dateTime()`, `EmptyState()`, `localeKey()`, `MetricCard()`, `money()`, `StatusBadge()`, `statusTone()`, `APControlWorkbench.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (7 nodes): `getStrengthColor()`, `getStrengthText()`, `localizedHref()`, `nextStep()`, `onSubmit()`, `prevStep()`, `EnhancedRegisterForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (7 nodes): `dashboardSeverityClass()`, `dashboardStatStyle()`, `dashboardToneBg()`, `dashboardToneClass()`, `dashboardToneText()`, `dashboardValueTone()`, `finance-dashboard-theme.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (7 nodes): `classNames()`, `getWorkflowAtlasOutcomesForRole()`, `getWorkflowAtlasWorkflowsForSelection()`, `workflow-atlas-data.ts`, `resetFilters()`, `selectRole()`, `workflow-atlas.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (7 nodes): `badge()`, `emptySignoffs()`, `inputClass()`, `onSubmit()`, `submit()`, `PayrollPilotCertificationPanel.tsx`, `updateSignoff()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (7 nodes): `compactCertificateLine()`, `defaultIdempotencyKey()`, `inputClass()`, `labelClass()`, `onSubmit()`, `submit()`, `PayrollProofBackfillExecutionPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (6 nodes): `getPasswordScore()`, `goBack()`, `goNext()`, `localizedHref()`, `onSubmit()`, `BeautifulRegisterForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (6 nodes): `BICommandBriefHeader()`, `formatDate()`, `formatDateTime()`, `formatPeriod()`, `MetaLine()`, `BICommandBriefHeader.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (5 nodes): `handleLogout()`, `isActiveHref()`, `localizedHref()`, `toSidebarDomId()`, `Sidebar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (5 nodes): `PayrollPaymentReconciliationWorkbench.test.tsx`, `fillSettlementProof()`, `get()`, `makeIcon()`, `reconciliationData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (5 nodes): `cn()`, `formatBIValue()`, `formatMoney()`, `openProofSubject()`, `StockToCashFlowDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (4 nodes): `AccountingControlCenter.test.tsx`, `controlCenterData()`, `get()`, `makeIcon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (4 nodes): `handleLogout()`, `localizedHref()`, `OrganizationBanner()`, `Navbar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (4 nodes): `HrisApprovalInbox.test.tsx`, `createIcon()`, `get()`, `inbox()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (4 nodes): `HrisMovementHistory.test.tsx`, `createIcon()`, `get()`, `history()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (4 nodes): `InventoryLossWorkbench.test.tsx`, `createIcon()`, `get()`, `hookState()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (4 nodes): `ManagerLocationActionCenterDashboard.test.tsx`, `createIcon()`, `get()`, `renderDashboard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (4 nodes): `item-performance-report.test.tsx`, `createIcon()`, `get()`, `report()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (3 nodes): `AgentCommandPanel.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (3 nodes): `CashCommandDashboard.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 103`** (3 nodes): `DailyHabitDigestDashboard.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 105`** (3 nodes): `command-center-primitives.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 106`** (3 nodes): `DashboardErrorState.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 107`** (3 nodes): `DashboardRouteState.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 108`** (3 nodes): `TransactionHistoryWorkbenchShell.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 110`** (3 nodes): `localizedHref()`, `onSubmit()`, `InvitedUserRegistration.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (3 nodes): `localizedHref()`, `onSubmit()`, `VerifyForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 119`** (3 nodes): `InventoryMovementHistoryWorkbench.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 122`** (3 nodes): `handleTabKeyDown()`, `selectTab()`, `module-deep-dives.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 127`** (3 nodes): `BranchDailyCloseReviewCommand.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 128`** (3 nodes): `BranchDailyCloseSignOffCommand.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 129`** (3 nodes): `BranchDailyCloseWorkspace.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 130`** (3 nodes): `ManagerActionCenterDashboard.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 131`** (3 nodes): `PaymentReconciliationSignOffCommand.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 132`** (3 nodes): `OwnerWarRoomDashboard.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `String()` connect `Community 0` to `Community 1`, `Community 68`, `Community 6`, `Community 9`, `Community 44`, `Community 12`, `Community 14`, `Community 58`, `Community 27`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `displayValue()` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `escapeCsv()` connect `Community 14` to `Community 0`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 31 inferred relationships involving `String()` (e.g. with `get()` and `formFromCustomer()`) actually correct?**
  _`String()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._