# Graph Report - app  (2026-08-09)

## Corpus Check
- 290 files · ~77,330 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 622 nodes · 472 edges · 37 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 50|Community 50]]

## God Nodes (most connected - your core abstractions)
1. `MockRbacError` - 19 edges
2. `FinanceRouteAccess()` - 14 edges
3. `Icon()` - 13 edges
4. `params()` - 10 edges
5. `NotFound()` - 7 edges
6. `request()` - 7 edges
7. `params()` - 6 edges
8. `resultPath()` - 6 edges
9. `createIcon()` - 6 edges
10. `get()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `NotFound()` --calls--> `LocaleLayout()`  [INFERRED]
  not-found.tsx → [locale]\layout.tsx
- `NotFound()` --calls--> `WorkflowAssuranceIncidentDetailPage()`  [INFERRED]
  not-found.tsx → [locale]\(dashboard)\dashboard\assurance\control-tower\incidents\[incidentId]\page.tsx
- `NotFound()` --calls--> `BrandEditPage()`  [INFERRED]
  not-found.tsx → [locale]\(dashboard)\dashboard\inventory\brands\[id]\edit\page.tsx
- `NotFound()` --calls--> `CategoryEditPage()`  [INFERRED]
  not-found.tsx → [locale]\(dashboard)\dashboard\inventory\categories\[id]\edit\page.tsx
- `NotFound()` --calls--> `PurchaseOrderEditPage()`  [INFERRED]
  not-found.tsx → [locale]\(dashboard)\dashboard\purchase-orders\[id]\edit\page.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (7): constructor(), createIcon(), get(), MockLink(), MockRbacError, params(), purchaseOrder()

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (14): FinanceAnalyticsPage(), FinanceCashDrawerPage(), FinanceCashFlowPage(), FinanceCostsPage(), FinanceRouteAccess(), FinanceDashboardPage(), FinancePayablesPage(), FinancePaymentsPage() (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (9): optionalText(), POST(), requestIpAddress(), requiredText(), handleCreateItem(), generateSimpleSKU(), handleGenerateSKU(), constructor() (+1 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (7): NotFound(), BrandEditPage(), CategoryEditPage(), PurchaseOrderEditPage(), page(), WorkflowAssuranceIncidentDetailPage(), LocaleLayout()

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (2): formatAccountingMoney(), signedMoney()

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (1): Icon()

### Community 6 - "Community 6"
Cohesion: 0.23
Nodes (3): AgentReconcilerInvocationError, params(), request()

### Community 7 - "Community 7"
Cohesion: 0.36
Nodes (4): actionIdentity(), errorMessage(), load(), submitAction()

### Community 8 - "Community 8"
Cohesion: 0.43
Nodes (6): closePeriod(), createFiscalYear(), ensureJournals(), markReady(), resultPath(), saveSettings()

### Community 9 - "Community 9"
Cohesion: 0.46
Nodes (7): formatCurrency(), getItemStockSnapshot(), ItemsPage(), matchesStockFilter(), normalizeStockFilter(), toNumberParam(), toStringParam()

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (2): formatDate(), t()

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (2): handleClose(), handleKeyDown()

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (2): isFinanceNotification(), matchesFilter()

### Community 14 - "Community 14"
Cohesion: 0.8
Nodes (4): GET(), invocationErrorResponse(), POST(), reconcilerAuthFailure()

### Community 15 - "Community 15"
Cohesion: 0.7
Nodes (4): GET(), getSupportedUploadContentType(), invalidFilePathResponse(), unsupportedFileTypeResponse()

### Community 16 - "Community 16"
Cohesion: 0.4
Nodes (1): dashboardHrefFromParams()

### Community 17 - "Community 17"
Cohesion: 0.6
Nodes (3): postEntry(), resultPath(), reverseEntry()

### Community 18 - "Community 18"
Cohesion: 0.5
Nodes (2): clearFilters(), resetPage()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (2): allow(), MockRbacError

### Community 20 - "Community 20"
Cohesion: 0.83
Nodes (3): archiveAccount(), createAccount(), resultPath()

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (2): createIcon(), get()

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (2): AppearanceSettingsClient(), labels()

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (2): GET(), requestIpAddress()

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (2): GET(), requestIpAddress()

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (2): CloseAssurancePage(), normalizeLocale()

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (2): CloseAssurancePeriodPage(), normalizeLocale()

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (2): AccountingControlCenterPage(), normalizeLocale()

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (2): createEntry(), resultPath()

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (2): AnalyticsPage(), pickLocale()

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (2): DailyHabitDigestPage(), pickLocale()

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (2): CashCommandPage(), pickLocale()

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (2): pickLocale(), StockToCashFlowPage()

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (2): ManagerActionCenterPage(), pickLocale()

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (2): OwnerWarRoomPage(), pickLocale()

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (2): createIcon(), get()

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (1): MockRbacError

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (1): MockRbacError

## Knowledge Gaps
- **1 isolated node(s):** `AgentReconcilerInvocationError`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 4`** (13 nodes): `accountingDate()`, `AccountingMessage()`, `AccountingPageShell()`, `AccountingPanel()`, `AccountingStatCard()`, `formatAccountingMoney()`, `accountingDate()`, `firstParam()`, `reportHref()`, `reportView()`, `signedMoney()`, `accounting-ui.tsx`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 5`** (13 nodes): `page.test.tsx`, `page.test.tsx`, `page.test.tsx`, `page.test.tsx`, `page.test.tsx`, `page.test.tsx`, `page.test.tsx`, `page.test.tsx`, `page.test.tsx`, `page.test.tsx`, `page.test.tsx`, `Icon()`, `line()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (8 nodes): `page.tsx`, `formatDate()`, `loadSecurityState()`, `revokeOtherSessionsAction()`, `riskClass()`, `riskForPermission()`, `statusBadge()`, `t()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (6 nodes): `AddSuppliersToItemModal.tsx`, `confirmClose()`, `handleClose()`, `handleKeyDown()`, `handleSubmit()`, `useDebounce()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (6 nodes): `NotificationsSettingsClient.tsx`, `formatDateTime()`, `getLabels()`, `isFinanceNotification()`, `matchesFilter()`, `notificationTone()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (5 nodes): `dashboardHrefFromParams()`, `DashboardPageError()`, `DashboardShellError()`, `error.tsx`, `error.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (5 nodes): `trial-balance-table.tsx`, `clearFilters()`, `formatMoney()`, `hasPostedActivity()`, `resetPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (5 nodes): `page-boundary.test.tsx`, `page-boundary.test.tsx`, `allow()`, `MockRbacError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (4 nodes): `ReportsClient.test.tsx`, `createIcon()`, `get()`, `renderReportsClient()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (4 nodes): `AppearanceSettingsClient()`, `labels()`, `StateRow()`, `AppearanceSettingsClient.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (3 nodes): `route.ts`, `GET()`, `requestIpAddress()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (3 nodes): `route.ts`, `GET()`, `requestIpAddress()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (3 nodes): `CloseAssurancePage()`, `normalizeLocale()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (3 nodes): `page.tsx`, `CloseAssurancePeriodPage()`, `normalizeLocale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (3 nodes): `AccountingControlCenterPage()`, `normalizeLocale()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (3 nodes): `page.tsx`, `createEntry()`, `resultPath()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (3 nodes): `AnalyticsPage()`, `pickLocale()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (3 nodes): `DailyHabitDigestPage()`, `pickLocale()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (3 nodes): `CashCommandPage()`, `pickLocale()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (3 nodes): `page.tsx`, `pickLocale()`, `StockToCashFlowPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (3 nodes): `page.tsx`, `ManagerActionCenterPage()`, `pickLocale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (3 nodes): `page.tsx`, `OwnerWarRoomPage()`, `pickLocale()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (3 nodes): `error.test.tsx`, `createIcon()`, `get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (3 nodes): `layout-boundary.test.tsx`, `MockRbacError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (3 nodes): `layout.test.tsx`, `MockRbacError`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MockRbacError` connect `Community 0` to `Community 5`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `Icon()` connect `Community 5` to `Community 0`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `FinanceRouteAccess()` (e.g. with `FinanceDashboardPage()` and `FinanceAnalyticsPage()`) actually correct?**
  _`FinanceRouteAccess()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `NotFound()` (e.g. with `LocaleLayout()` and `WorkflowAssuranceIncidentDetailPage()`) actually correct?**
  _`NotFound()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `AgentReconcilerInvocationError` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._