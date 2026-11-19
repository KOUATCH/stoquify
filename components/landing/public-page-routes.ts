import type { CinematicModuleId } from "./cinematic-modules"

// Public discovery destinations only. Workspace routes retain their existing
// session, organization, permission and module checks.
export const productDestinations = {
  pos: { workspace: "/dashboard/pos", workflow: "sellToCash" },
  inventory: { workspace: "/dashboard/inventory", workflow: "stockToSale" },
  finance: { workspace: "/dashboard/finance/reconciliation", workflow: "paymentReconciliation" },
  accounting: { workspace: "/dashboard/accounting", workflow: "accountingCloseAssurance" },
  hris: { workspace: "/dashboard/people", workflow: "peopleToPay" },
  payroll: { workspace: "/dashboard/payroll", workflow: "peopleToPay" },
  payables: { workspace: "/dashboard/purchases/payables", workflow: "procureToPay" },
  receivables: { workspace: "/dashboard/finance/receivables", workflow: "customerToCollection" },
} as const satisfies Record<CinematicModuleId, { workspace: string; workflow: string }>

export function isProductId(value: string): value is CinematicModuleId {
  return Object.prototype.hasOwnProperty.call(productDestinations, value)
}

export function usesCinematicShell(path: string) {
  return path === "/" || path === "/workflows" || path === "/products" || path.startsWith("/products/") ||
    path === "/pricing" || path.startsWith("/offers/") || path === "/get-started" || path === "/contact" || path === "/privacy" || path === "/terms"
}
