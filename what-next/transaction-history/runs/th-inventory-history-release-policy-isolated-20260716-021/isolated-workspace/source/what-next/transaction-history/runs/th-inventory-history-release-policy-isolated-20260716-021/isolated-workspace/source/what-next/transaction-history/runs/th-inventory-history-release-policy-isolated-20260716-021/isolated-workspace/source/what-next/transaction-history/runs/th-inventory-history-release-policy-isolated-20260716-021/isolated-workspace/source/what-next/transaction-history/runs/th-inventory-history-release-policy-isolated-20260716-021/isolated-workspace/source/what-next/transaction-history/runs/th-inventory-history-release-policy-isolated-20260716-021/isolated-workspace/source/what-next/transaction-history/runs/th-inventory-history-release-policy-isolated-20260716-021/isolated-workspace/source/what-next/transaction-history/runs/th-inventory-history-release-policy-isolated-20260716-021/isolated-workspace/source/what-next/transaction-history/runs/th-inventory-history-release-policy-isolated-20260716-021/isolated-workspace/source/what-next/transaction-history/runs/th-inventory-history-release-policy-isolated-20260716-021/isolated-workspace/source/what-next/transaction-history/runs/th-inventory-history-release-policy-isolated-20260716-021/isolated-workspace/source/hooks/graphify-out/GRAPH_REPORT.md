# Graph Report - hooks  (2026-07-14)

## Corpus Check
- 36 files · ~22,267 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 255 nodes · 252 edges · 9 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]

## God Nodes (most connected - your core abstractions)
1. `usePurchaseOrderActions()` - 11 edges
2. `getBaseMutationOptions()` - 6 edges
3. `useAccountingControlCenter()` - 5 edges
4. `useOrgBrands()` - 3 edges
5. `useOrgCategories()` - 3 edges
6. `toNumberOrUndefined()` - 3 edges
7. `useCreatePurchaseOrder()` - 3 edges
8. `useSubmitPurchaseOrder()` - 3 edges
9. `useApprovePurchaseOrder()` - 3 edges
10. `useCancelPurchaseOrder()` - 3 edges

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
Cohesion: 0.28
Nodes (3): useAllOrgBrands(), useBriefBrandsByOrgId(), useOrgBrands()

### Community 8 - "Community 8"
Cohesion: 0.28
Nodes (3): useAllOrgCategories(), useBriefCategoriesByOrgId(), useOrgCategories()

### Community 12 - "Community 12"
Cohesion: 0.48
Nodes (5): getQueryOrganizationId(), useAccountingControlCenter(), useAccountingPeriods(), useAccountingSetupReadiness(), usePostingRules()

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (2): toItemSupplierDTO(), toNumberOrUndefined()

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (2): toActionError(), unwrapComplianceCenterActionResult()

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (2): useClientAuth(), useOrgAuth()

## Knowledge Gaps
- **Thin community `Community 23`** (4 nodes): `toItemSupplierDTO()`, `toNumberOrUndefined()`, `useUpdateItemSupplier()`, `useAllItemSuppliers.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (4 nodes): `toActionError()`, `useComplianceCenter.ts`, `unwrapComplianceCenterActionResult()`, `useComplianceCenter()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (3 nodes): `useClientAuth()`, `useOrgAuth()`, `useClientAuth.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._