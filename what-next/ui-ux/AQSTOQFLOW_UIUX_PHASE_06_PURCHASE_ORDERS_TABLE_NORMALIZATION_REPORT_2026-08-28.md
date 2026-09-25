# AQSTOQFLOW UI/UX Phase 06: Purchase Orders Table Normalization

Date: 2026-08-28  
Module: Purchase orders  
Status: NOW pilot implemented

## Scope

Normalized only `components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx` against the shared canonical table contract. Purchase-order detail, creation, analytics, and unrelated purchasing tables were not migrated.

## Implemented

- Registered contract `purchasing.purchase-orders` as a tenant-scoped work queue using the existing TanStack table.
- Preserved service-provided edit, approve, receive, cancel, archive, and create capability truth.
- Added stable purchase-order IDs, canonical query fingerprints, explicit selection scope, versioned column visibility/order preferences, bilingual density controls, robust state announcements, URL-backed debounced search, date-range query representation, and `aria-sort` state.
- Added an Export Evidence worksheet without bypassing existing actions.

## Verification

The final focused purchase-order suite passed 2 tests. The implemented focused total passed 4 suites and 24 tests after the final server-adapter assertion. Authenticated browser evidence was not captured because approved credentials and seeded data were not provided.

## Boundary

The existing XLSX path remains client-generated and is not a server authorization certificate. Certified export remains dependent on future server finalization of the canonical request.
