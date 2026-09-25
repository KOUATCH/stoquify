# AQSTOQFLOW UI/UX Phase 06: Inventory Items Table Normalization

Date: 2026-08-28  
Module: Inventory items  
Status: NOW pilot implemented

## Scope

Normalized only `components/ui/groups/inventory/ItemManagement.tsx` against the shared canonical table contract. No other inventory table was migrated.

## Implemented

- Registered contract `inventory.items` as a tenant-scoped master-reference surface using the existing TanStack table.
- Preserved protected item mutations and the existing inventory service truth.
- Added stable item IDs, canonical query fingerprints, explicit selection scope, versioned column visibility/order preferences, bilingual density controls, robust state announcements, sortable header semantics, and URL-backed debounced search.
- Kept the existing stock URL filter and represented it in the canonical query.
- Added an Export Evidence worksheet with tenant, permission, module, source-model, redaction, query, scope, locale, time-zone, and correlation metadata.

## Verification

The shared contract and registry suites passed in the final focused run. Inventory authenticated browser evidence was not captured because approved credentials and seeded data were not provided.

## Boundary

The existing XLSX path remains client-generated and is not a server authorization certificate. Certified export remains dependent on future server finalization of the canonical request.

