# Graph Report - hooks  (2026-08-09)

## Corpus Check
- 44 files · ~25,882 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 308 nodes · 321 edges · 15 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 34|Community 34]]

## God Nodes (most connected - your core abstractions)
1. `usePurchaseOrderActions()` - 11 edges
2. `parseCashPaymentHistorySearchParams()` - 6 edges
3. `getBaseMutationOptions()` - 6 edges
4. `useAccountingControlCenter()` - 5 edges
5. `parseInventoryMovementHistorySearchParams()` - 5 edges
6. `parseAPHistorySearchParams()` - 4 edges
7. `dateOnlyToUtc()` - 4 edges
8. `parseSearchParams()` - 3 edges
9. `useOrgBrands()` - 3 edges
10. `useOrgCategories()` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.17
Nodes (14): getBaseMutationOptions(), useApprovePurchaseOrder(), useBulkDeletePurchaseOrders(), useBulkUpdatePurchaseOrderStatus(), useCancelPurchaseOrder(), useClosePurchaseOrder(), useCreatePurchaseOrder(), useDeletePurchaseOrder() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (3): toBriefItemSupplierDTO(), toItemSupplierDTO(), toNumberOrUndefined()

### Community 5 - "Community 5"
Cohesion: 0.23
Nodes (4): organizationKey(), periodKey(), useCloseAssurance(), useCloseEvidenceGraph()

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (8): enumValue(), filtersForCashPaymentHistoryAction(), filtersForCashPaymentHistoryExport(), isPageSize(), parseCashPaymentHistorySearchParams(), stringParam(), validDateOnly(), validDateTime()

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (7): dateOnlyToUtc(), defaultInventoryLossPeriod(), filtersForInventoryLossAction(), formatDateOnly(), inventoryLossPeriodError(), parseInventoryLossSearchParams(), validDateOnly()

### Community 9 - "Community 9"
Cohesion: 0.31
Nodes (7): filtersForInventoryMovementHistoryAction(), filtersForInventoryMovementHistoryExport(), isInventoryMovementType(), isPageSize(), parseInventoryMovementHistorySearchParams(), validDateOnly(), validDateTime()

### Community 10 - "Community 10"
Cohesion: 0.33
Nodes (6): enumValue(), filtersForAPHistoryAction(), filtersForAPHistoryExport(), parseAPHistorySearchParams(), stringParam(), validDateOnly()

### Community 11 - "Community 11"
Cohesion: 0.28
Nodes (3): useAllOrgBrands(), useBriefBrandsByOrgId(), useOrgBrands()

### Community 12 - "Community 12"
Cohesion: 0.28
Nodes (3): useAllOrgCategories(), useBriefCategoriesByOrgId(), useOrgCategories()

### Community 16 - "Community 16"
Cohesion: 0.48
Nodes (5): getQueryOrganizationId(), useAccountingControlCenter(), useAccountingPeriods(), useAccountingSetupReadiness(), usePostingRules()

### Community 21 - "Community 21"
Cohesion: 0.47
Nodes (3): parseSearchParams(), stringParam(), validDateOnly()

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (2): toItemSupplierDTO(), toNumberOrUndefined()

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (2): toActionError(), unwrapComplianceCenterActionResult()

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (2): useClientAuth(), useOrgAuth()

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (2): createIcon(), get()

## Knowledge Gaps
- **Thin community `Community 28`** (4 nodes): `toItemSupplierDTO()`, `toNumberOrUndefined()`, `useUpdateItemSupplier()`, `useAllItemSuppliers.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (4 nodes): `toActionError()`, `useComplianceCenter.ts`, `unwrapComplianceCenterActionResult()`, `useComplianceCenter()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (3 nodes): `useClientAuth()`, `useOrgAuth()`, `useClientAuth.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (3 nodes): `createIcon()`, `get()`, `useInventoryMovementHistoryWorkbench.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._