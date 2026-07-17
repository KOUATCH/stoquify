# Graph Report - app  (2026-07-14)

## Corpus Check
- 246 files · ~60,890 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 526 nodes · 379 edges · 30 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
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
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 43|Community 43]]

## God Nodes (most connected - your core abstractions)
1. `FinanceRouteAccess()` - 14 edges
2. `MockRbacError` - 14 edges
3. `Icon()` - 12 edges
4. `params()` - 8 edges
5. `NotFound()` - 7 edges
6. `resultPath()` - 6 edges
7. `ItemsPage()` - 5 edges
8. `params()` - 4 edges
9. `GET()` - 4 edges
10. `request()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `LocaleLayout()` --calls--> `NotFound()`  [INFERRED]
  [locale]\layout.tsx → not-found.tsx
- `WorkflowAssuranceIncidentDetailPage()` --calls--> `NotFound()`  [INFERRED]
  [locale]\(dashboard)\dashboard\assurance\control-tower\incidents\[incidentId]\page.tsx → not-found.tsx
- `BrandEditPage()` --calls--> `NotFound()`  [INFERRED]
  [locale]\(dashboard)\dashboard\inventory\brands\[id]\edit\page.tsx → not-found.tsx
- `CategoryEditPage()` --calls--> `NotFound()`  [INFERRED]
  [locale]\(dashboard)\dashboard\inventory\categories\[id]\edit\page.tsx → not-found.tsx
- `PurchaseOrderEditPage()` --calls--> `NotFound()`  [INFERRED]
  [locale]\(dashboard)\dashboard\purchase-orders\[id]\edit\page.tsx → not-found.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (7): createIcon(), get(), Icon(), MockLink(), MockRbacError, params(), purchaseOrder()

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (14): FinanceAnalyticsPage(), FinanceCashDrawerPage(), FinanceCashFlowPage(), FinanceCostsPage(), FinanceRouteAccess(), FinanceDashboardPage(), FinancePayablesPage(), FinancePaymentsPage() (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (7): NotFound(), BrandEditPage(), CategoryEditPage(), PurchaseOrderEditPage(), page(), WorkflowAssuranceIncidentDetailPage(), LocaleLayout()

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (5): handleCreateItem(), constructor(), params(), request(), text()

### Community 4 - "Community 4"
Cohesion: 0.43
Nodes (6): closePeriod(), createFiscalYear(), ensureJournals(), markReady(), resultPath(), saveSettings()

### Community 5 - "Community 5"
Cohesion: 0.46
Nodes (7): formatCurrency(), getItemStockSnapshot(), ItemsPage(), matchesStockFilter(), normalizeStockFilter(), toNumberParam(), toStringParam()

### Community 6 - "Community 6"
Cohesion: 0.29
Nodes (2): formatDate(), t()

### Community 9 - "Community 9"
Cohesion: 0.4
Nodes (2): handleClose(), handleKeyDown()

### Community 10 - "Community 10"
Cohesion: 0.4
Nodes (2): isFinanceNotification(), matchesFilter()

### Community 11 - "Community 11"
Cohesion: 0.7
Nodes (4): GET(), getSupportedUploadContentType(), invalidFilePathResponse(), unsupportedFileTypeResponse()

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (1): dashboardHrefFromParams()

### Community 13 - "Community 13"
Cohesion: 0.6
Nodes (3): postEntry(), resultPath(), reverseEntry()

### Community 14 - "Community 14"
Cohesion: 0.5
Nodes (2): generateSimpleSKU(), handleGenerateSKU()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (2): allow(), MockRbacError

### Community 16 - "Community 16"
Cohesion: 0.83
Nodes (3): archiveAccount(), createAccount(), resultPath()

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (2): createIcon(), get()

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (2): AppearanceSettingsClient(), labels()

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (2): CloseAssurancePage(), normalizeLocale()

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (2): CloseAssurancePeriodPage(), normalizeLocale()

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (2): AccountingControlCenterPage(), normalizeLocale()

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (2): createEntry(), resultPath()

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (2): AnalyticsPage(), pickLocale()

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (2): DailyHabitDigestPage(), pickLocale()

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (2): CashCommandPage(), pickLocale()

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (2): pickLocale(), StockToCashFlowPage()

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (2): ManagerActionCenterPage(), pickLocale()

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (2): OwnerWarRoomPage(), pickLocale()

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (1): MockRbacError

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (1): MockRbacError

## Knowledge Gaps
- **Thin community `Community 6`** (8 nodes): `page.tsx`, `formatDate()`, `loadSecurityState()`, `revokeOtherSessionsAction()`, `riskClass()`, `riskForPermission()`, `statusBadge()`, `t()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (6 nodes): `AddSuppliersToItemModal.tsx`, `confirmClose()`, `handleClose()`, `handleKeyDown()`, `handleSubmit()`, `useDebounce()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (6 nodes): `NotificationsSettingsClient.tsx`, `formatDateTime()`, `getLabels()`, `isFinanceNotification()`, `matchesFilter()`, `notificationTone()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (5 nodes): `dashboardHrefFromParams()`, `DashboardPageError()`, `DashboardShellError()`, `error.tsx`, `error.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (5 nodes): `SupplierEditForm.tsx`, `cn()`, `generateSimpleSKU()`, `handleGenerateSKU()`, `handleReset()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (5 nodes): `page-boundary.test.tsx`, `page-boundary.test.tsx`, `allow()`, `MockRbacError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (4 nodes): `ReportsClient.test.tsx`, `createIcon()`, `get()`, `renderReportsClient()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (4 nodes): `AppearanceSettingsClient()`, `labels()`, `StateRow()`, `AppearanceSettingsClient.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (3 nodes): `CloseAssurancePage()`, `normalizeLocale()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (3 nodes): `page.tsx`, `CloseAssurancePeriodPage()`, `normalizeLocale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (3 nodes): `AccountingControlCenterPage()`, `normalizeLocale()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (3 nodes): `page.tsx`, `createEntry()`, `resultPath()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (3 nodes): `AnalyticsPage()`, `pickLocale()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (3 nodes): `DailyHabitDigestPage()`, `pickLocale()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (3 nodes): `CashCommandPage()`, `pickLocale()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (3 nodes): `page.tsx`, `pickLocale()`, `StockToCashFlowPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (3 nodes): `page.tsx`, `ManagerActionCenterPage()`, `pickLocale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (3 nodes): `page.tsx`, `OwnerWarRoomPage()`, `pickLocale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (3 nodes): `error.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (3 nodes): `layout-boundary.test.tsx`, `MockRbacError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (3 nodes): `layout.test.tsx`, `MockRbacError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 13 inferred relationships involving `FinanceRouteAccess()` (e.g. with `FinanceDashboardPage()` and `FinanceAnalyticsPage()`) actually correct?**
  _`FinanceRouteAccess()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `NotFound()` (e.g. with `LocaleLayout()` and `WorkflowAssuranceIncidentDetailPage()`) actually correct?**
  _`NotFound()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._