import { inventoryMovementHistoryTypes } from "@/types/inventoryMovementHistory"
import { defineCanonicalTableContract } from "./table-system-contract"

export const inventoryMovementsTableContract = defineCanonicalTableContract({
  id: "inventory.movements",
  version: 1,
  route: "/dashboard/inventory/movements",
  module: "inventory",
  archetype: "ledger",
  dataOwnership: "server-cursor",
  rowId: "id",
  labels: { en: "Inventory movement history", fr: "Historique des mouvements de stock" },
  access: { readPermission: "inventory.levels.read", requiredModule: "inventory", tenantScoped: true, redactionPolicy: "inventory-history-operational-v1" },
  query: {
    searchParam: "search", defaultPageSize: 50, maxPageSize: 100, allowedPageSizes: [25, 50, 100],
    // The service owns a fixed effectiveAt/recordedAt/id descending order.
    allowedSorts: [],
    allowedFilters: [{ id: "type", values: inventoryMovementHistoryTypes }, { id: "itemId" }, { id: "locationId" }, { id: "dateFrom" }, { id: "dateTo" }, { id: "effectiveAsOf" }, { id: "direction", values: ["next", "previous"] }],
  },
  columns: { allowed: [
    { id: "identity", label: { en: "Item", fr: "Article" }, defaultVisible: true, hideable: false },
    { id: "type", label: { en: "Type", fr: "Type" }, defaultVisible: true },
    { id: "quantity", label: { en: "Quantity", fr: "Quantité" }, defaultVisible: true, alignment: "right" },
    { id: "value", label: { en: "Value", fr: "Valeur" }, defaultVisible: true, alignment: "right" },
    { id: "effectiveAt", label: { en: "Effective time", fr: "Date d’effet" }, defaultVisible: true },
    { id: "recordedAt", label: { en: "Recorded time", fr: "Date d’enregistrement" }, defaultVisible: false },
    { id: "location", label: { en: "Location", fr: "Site" }, defaultVisible: true },
    { id: "reference", label: { en: "Reference", fr: "Référence" }, defaultVisible: true },
    { id: "actions", label: { en: "Details", fr: "Détails" }, defaultVisible: true, hideable: false, exportable: false, frozen: "end" },
  ] },
  selection: { enabled: false, allowedScopes: [], clearOnQueryChange: true },
  actions: [{ id: "details", requiredPermission: "inventory.levels.read", requiredModule: "inventory", protectedAction: false, mutatesBusinessTruth: false }],
  export: { enabled: true, requiredPermission: "reports.export", requiredModule: "inventory", sourceReadModel: "readInventoryMovementHistory", serverFinalized: true, formats: ["json"] },
  builtInViews: [],
})
