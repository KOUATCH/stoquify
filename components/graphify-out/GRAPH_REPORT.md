# Graph Report - components  (2026-07-14)

## Corpus Check
- 245 files · ~219,698 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 928 nodes · 857 edges · 52 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]

## God Nodes (most connected - your core abstractions)
1. `String()` - 32 edges
2. `buildTodaysOperatingTruthModel()` - 13 edges
3. `actionError()` - 9 edges
4. `toErrorMessage()` - 8 edges
5. `resolveDashboardHref()` - 7 edges
6. `guardItem()` - 7 edges
7. `buildStatusItems()` - 6 edges
8. `buildKpis()` - 6 edges
9. `formatNumber()` - 5 edges
10. `useNotifications()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `escapeCsv()` --calls--> `String()`  [INFERRED]
  locations\LocationsManagementDashboard.tsx → cash-command\CashCommandDashboard.tsx
- `displayValue()` --calls--> `String()`  [INFERRED]
  payroll\PayrollCommandCenter.tsx → cash-command\CashCommandDashboard.tsx
- `normalizeLocaleLabel()` --calls--> `String()`  [INFERRED]
  settings\OrganizationManagementTable.tsx → cash-command\CashCommandDashboard.tsx
- `escapeCsv()` --calls--> `String()`  [INFERRED]
  settings\OrganizationManagementTable.tsx → cash-command\CashCommandDashboard.tsx
- `formFromSupplier()` --calls--> `String()`  [INFERRED]
  suppliers\SupplierManagementDashboard.tsx → cash-command\CashCommandDashboard.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (25): String(), escapeCsv(), formFromCustomer(), formatCellValue(), getAccessorId(), clearSearch(), handleSearch(), runSearch() (+17 more)

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
Cohesion: 0.11
Nodes (4): actionInput(), displayValue(), evaluateIntake(), recordIntake()

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (9): CompleteIntegratedDailySalesDashboard(), analyticsStockTone(), analyticsToneClass(), analyticsToneText(), analyticsTrendText(), CashFlowReportComponent(), getPerformanceColor(), getStockStatusBadge() (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (7): downloadClosePack(), handleCertifiedExport(), handleDraftExport(), handleRun(), MetricTile(), selectedOpenFinding(), toneClass()

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (6): escapeCsv(), formatCurrency(), formatNumber(), getDefaultCreateForm(), normalizeLocaleLabel(), submitCreateOrganization()

### Community 8 - "Community 8"
Cohesion: 0.2
Nodes (3): finish(), nextKey(), noticeFromResponse()

### Community 9 - "Community 9"
Cohesion: 0.2
Nodes (4): alertText(), defaultCustomRange(), inputDate(), money()

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (7): guardItem(), handleBasicInfoSubmit(), handleItemDetailsSubmit(), handleItemPricingSubmit(), handleItemStockSubmit(), handleRelationsSubmit(), handleTrackingSubmit()

### Community 11 - "Community 11"
Cohesion: 0.2
Nodes (2): defaultCustomRange(), inputDate()

### Community 12 - "Community 12"
Cohesion: 0.2
Nodes (3): escapeCsv(), getDefaultForm(), submitForm()

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (2): escapeCsv(), formFromSupplier()

### Community 14 - "Community 14"
Cohesion: 0.2
Nodes (3): escapeCsv(), formatNumber(), formatPercent()

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (2): downloadJson(), handleExport()

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (2): cn(), formatDateTime()

### Community 18 - "Community 18"
Cohesion: 0.24
Nodes (4): alertText(), defaultCustomRange(), inputDate(), money()

### Community 20 - "Community 20"
Cohesion: 0.28
Nodes (3): loadProofTrail(), openBIProofTrail(), openProofTrail()

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (2): APControlWorkbench(), localeKey()

### Community 23 - "Community 23"
Cohesion: 0.22
Nodes (1): escapeCsv()

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (2): localizedHref(), onSubmit()

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (2): dashboardSeverityClass(), dashboardToneClass()

### Community 28 - "Community 28"
Cohesion: 0.38
Nodes (4): createIcon(), get(), suspenseFailure(), workbenchData()

### Community 29 - "Community 29"
Cohesion: 0.48
Nodes (5): handleAddLine(), handleSubmit(), itemDisplayName(), itemSku(), resetForm()

### Community 30 - "Community 30"
Cohesion: 0.38
Nodes (4): getCategoryToneClass(), getIconStyles(), getNotificationStyles(), notificationTone()

### Community 31 - "Community 31"
Cohesion: 0.38
Nodes (3): dateLabel(), joinValues(), readinessProofSubject()

### Community 33 - "Community 33"
Cohesion: 0.43
Nodes (4): dateLabel(), joinValues(), money(), payslipProofSubject()

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (2): onSubmit(), submit()

### Community 35 - "Community 35"
Cohesion: 0.33
Nodes (2): onSubmit(), submit()

### Community 37 - "Community 37"
Cohesion: 0.38
Nodes (4): get(), makeIcon(), recordedReviewCertificate(), reviewCertificate()

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (3): createIcon(), get(), PurchaseOrdersRouteBoundary

### Community 41 - "Community 41"
Cohesion: 0.4
Nodes (2): localizedHref(), onSubmit()

### Community 42 - "Community 42"
Cohesion: 0.4
Nodes (2): formatDate(), formatPeriod()

### Community 44 - "Community 44"
Cohesion: 0.47
Nodes (3): handleCreateOrder(), handleNavigation(), localizedHref()

### Community 48 - "Community 48"
Cohesion: 0.4
Nodes (3): dateSortingFn(), dateSortValue(), globalFilterFn()

### Community 50 - "Community 50"
Cohesion: 0.5
Nodes (2): handleLogout(), localizedHref()

### Community 56 - "Community 56"
Cohesion: 0.5
Nodes (2): get(), makeIcon()

### Community 57 - "Community 57"
Cohesion: 0.5
Nodes (2): get(), makeIcon()

### Community 58 - "Community 58"
Cohesion: 0.5
Nodes (2): formatBIValue(), formatMoney()

### Community 64 - "Community 64"
Cohesion: 0.67
Nodes (2): handleLogout(), localizedHref()

### Community 66 - "Community 66"
Cohesion: 0.83
Nodes (3): DateColumn(), getPastDays(), timeAgo()

### Community 74 - "Community 74"
Cohesion: 0.67
Nodes (2): createIcon(), get()

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (2): localizedHref(), onSubmit()

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (2): localizedHref(), onSubmit()

### Community 95 - "Community 95"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (2): createIcon(), get()

## Knowledge Gaps
- **Thin community `Community 11`** (11 nodes): `cn()`, `defaultCustomRange()`, `exportDurableCertificate()`, `inputDate()`, `metricAccent()`, `notificationTypeKey()`, `paymentTransactionProofSubject()`, `severityClass()`, `signDurableRun()`, `statusClass()`, `PaymentReconciliationWorkbench.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (11 nodes): `escapeCsv()`, `formatCurrency()`, `formatDate()`, `formatNumber()`, `formFromSupplier()`, `getDefaultForm()`, `initials()`, `isOverCreditLimit()`, `SortIcon()`, `toneClass()`, `SupplierManagementDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (10 nodes): `downloadJson()`, `formatDate()`, `formatMoney()`, `handleExport()`, `MetricTile()`, `Panel()`, `severityClass()`, `statusClass()`, `trustLabel()`, `AccountantPortal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (10 nodes): `cn()`, `compactHash()`, `formatDateTime()`, `formatMoney()`, `formatNumber()`, `metricAccent()`, `refreshComplianceCenter()`, `statusClass()`, `sumCounts()`, `ComplianceCenterDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (9 nodes): `APControlWorkbench()`, `dateTime()`, `EmptyState()`, `localeKey()`, `MetricCard()`, `money()`, `StatusBadge()`, `statusTone()`, `APControlWorkbench.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (9 nodes): `dashboardPath()`, `escapeCsv()`, `formatDate()`, `formatNumber()`, `formFromUnit()`, `getDefaultForm()`, `SortIcon()`, `toneClass()`, `UnitsManagementDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (7 nodes): `getStrengthColor()`, `getStrengthText()`, `localizedHref()`, `nextStep()`, `onSubmit()`, `prevStep()`, `EnhancedRegisterForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (7 nodes): `dashboardSeverityClass()`, `dashboardStatStyle()`, `dashboardToneBg()`, `dashboardToneClass()`, `dashboardToneText()`, `dashboardValueTone()`, `finance-dashboard-theme.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (7 nodes): `badge()`, `emptySignoffs()`, `inputClass()`, `onSubmit()`, `submit()`, `PayrollPilotCertificationPanel.tsx`, `updateSignoff()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (7 nodes): `compactCertificateLine()`, `defaultIdempotencyKey()`, `inputClass()`, `labelClass()`, `onSubmit()`, `submit()`, `PayrollProofBackfillExecutionPanel.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (6 nodes): `getPasswordScore()`, `goBack()`, `goNext()`, `localizedHref()`, `onSubmit()`, `BeautifulRegisterForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (6 nodes): `BICommandBriefHeader()`, `formatDate()`, `formatDateTime()`, `formatPeriod()`, `MetaLine()`, `BICommandBriefHeader.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (5 nodes): `handleLogout()`, `isActiveHref()`, `localizedHref()`, `toSidebarDomId()`, `Sidebar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (5 nodes): `PayrollEmployeeBalanceWorkbench.test.tsx`, `fillSettlementForm()`, `get()`, `makeIcon()`, `workbenchData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (5 nodes): `PayrollPaymentReconciliationWorkbench.test.tsx`, `fillSettlementProof()`, `get()`, `makeIcon()`, `reconciliationData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (5 nodes): `cn()`, `formatBIValue()`, `formatMoney()`, `openProofSubject()`, `StockToCashFlowDashboard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (4 nodes): `handleLogout()`, `localizedHref()`, `OrganizationBanner()`, `Navbar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (4 nodes): `item-performance-report.test.tsx`, `createIcon()`, `get()`, `report()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (3 nodes): `CashCommandDashboard.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (3 nodes): `DailyHabitDigestDashboard.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (3 nodes): `command-center-primitives.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (3 nodes): `DashboardErrorState.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (3 nodes): `DashboardRouteState.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (3 nodes): `localizedHref()`, `onSubmit()`, `InvitedUserRegistration.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (3 nodes): `localizedHref()`, `onSubmit()`, `VerifyForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (3 nodes): `ManagerActionCenterDashboard.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (3 nodes): `OwnerWarRoomDashboard.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `String()` connect `Community 0` to `Community 1`, `Community 4`, `Community 37`, `Community 7`, `Community 12`, `Community 13`, `Community 14`, `Community 48`, `Community 23`, `Community 56`, `Community 57`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `displayValue()` connect `Community 4` to `Community 0`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `actionError()` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 31 inferred relationships involving `String()` (e.g. with `get()` and `formFromCustomer()`) actually correct?**
  _`String()` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._