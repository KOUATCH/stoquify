import type {
  CommercialModuleSlug,
  ModuleAccessIntent,
} from "@/services/modules/module-control-contracts"

export type PurchasesRouteSurfaceModule = {
  moduleSlug: CommercialModuleSlug
  surface: string
  accessIntent?: ModuleAccessIntent
  mode?: "observe" | "enforce"
  moduleLockedTitle?: string
  moduleLockedMessage?: string
}

export type PermissionMode = "single" | "all" | "any"

export type PurchasesRouteSurfaceCopy = string | Partial<Record<"en" | "fr", string>>

export type PurchasesRouteSurface = {
  key: string
  route: string
  resource: string
  title: string
  permissions: readonly string[]
  permissionMode?: PermissionMode
  noActiveOrgTitle?: PurchasesRouteSurfaceCopy
  permissionDeniedTitle?: PurchasesRouteSurfaceCopy
  noActiveOrgMessage?: PurchasesRouteSurfaceCopy
  permissionDeniedMessage?: PurchasesRouteSurfaceCopy
  primaryHref?: string
  module?: PurchasesRouteSurfaceModule
  modules?: PurchasesRouteSurfaceModule[]
}

export const purchasesRouteCatalog: PurchasesRouteSurface[] = [
  { key: "purchases-payment-recovery", route: "/dashboard/purchases/payables/payments/recovery", resource: "SupplierPayment", title: "Recover supplier payment posting", permissions: ["purchasing.ap.payment.release"], permissionDeniedTitle: { en: "Payment posting recovery is unavailable for this role", fr: "La reprise comptable des paiements est indisponible pour ce rôle" }, permissionDeniedMessage: { en: "Ask the administrator to review supplier payment recovery access.", fr: "Demandez à l’administrateur de vérifier les droits de reprise des paiements fournisseurs." }, primaryHref: "/dashboard/purchases/payables", module: { moduleSlug: "purchasing", surface: "/dashboard/purchases/payables/payments/recovery", accessIntent: "read", mode: "enforce" } },
  { key: "purchases-payment-record", route: "/dashboard/purchases/payables/payments/record", resource: "SupplierPayment", title: "Record a supplier payment", permissions: ["purchasing.ap.payment.release"], permissionDeniedTitle: { en: "Payment recording is unavailable for this role", fr: "L’enregistrement des paiements est indisponible pour ce rôle" }, permissionDeniedMessage: { en: "Ask the administrator to review supplier payment execution-recording access.", fr: "Demandez à l’administrateur de vérifier les droits d’enregistrement des paiements fournisseurs." }, primaryHref: "/dashboard/purchases/payables", module: { moduleSlug: "purchasing", surface: "/dashboard/purchases/payables/payments/record", accessIntent: "read", mode: "enforce" } },
  { key: "purchases-payment-request", route: "/dashboard/purchases/payables/payments/request", resource: "SupplierPayment", title: "Request a supplier payment", permissions: ["purchasing.ap.payment.request"], permissionDeniedTitle: { en: "Payment requests are unavailable for this role", fr: "Les demandes de paiement sont indisponibles pour ce rôle" }, permissionDeniedMessage: { en: "Ask the administrator to review supplier payment request access.", fr: "Demandez à l’administrateur de vérifier les droits de demande de paiement fournisseur." }, primaryHref: "/dashboard/purchases/payables", module: { moduleSlug: "purchasing", surface: "/dashboard/purchases/payables/payments/request", accessIntent: "read", mode: "enforce" } },
  { key: "purchases-payment-approve", route: "/dashboard/purchases/payables/payments/approve", resource: "SupplierPayment", title: "Review supplier payments", permissions: ["purchasing.ap.payment.approve"], permissionDeniedTitle: { en: "Payment approval is unavailable for this role", fr: "L’approbation des paiements est indisponible pour ce rôle" }, permissionDeniedMessage: { en: "Ask the administrator to review supplier payment approval access.", fr: "Demandez à l’administrateur de vérifier les droits d’approbation des paiements fournisseurs." }, primaryHref: "/dashboard/purchases/payables", module: { moduleSlug: "purchasing", surface: "/dashboard/purchases/payables/payments/approve", accessIntent: "read", mode: "enforce" } },
  { key: "purchases-invoice-correct", route: "/dashboard/purchases/payables/correct", resource: "SupplierInvoice", title: "Correct a supplier invoice", permissions: ["purchasing.ap.invoice.post"], permissionDeniedTitle: { en: "Invoice correction is unavailable for this role", fr: "La correction de facture est indisponible pour ce rôle" }, permissionDeniedMessage: { en: "Ask your administrator to review invoice preparation access.", fr: "Demandez à l’administrateur de vérifier les droits de préparation." }, primaryHref: "/dashboard/purchases/payables", module: { moduleSlug: "purchasing", surface: "/dashboard/purchases/payables/correct", accessIntent: "read", mode: "enforce" } },
  { key: "purchases-exception-request", route: "/dashboard/purchases/payables/exceptions/request", resource: "SupplierInvoiceMatchException", title: "Request an invoice exception", permissions: ["purchasing.ap.invoice.post"], permissionDeniedTitle: { en: "Invoice exceptions are not available for this role", fr: "Les dérogations de facture ne sont pas disponibles pour ce rôle" }, permissionDeniedMessage: { en: "Ask the organization administrator for the appropriate exception permission.", fr: "Demandez à l’administrateur le droit approprié pour les dérogations." }, primaryHref: "/dashboard/purchases/payables", module: { moduleSlug: "purchasing", surface: "/dashboard/purchases/payables/exceptions/request", accessIntent: "read", mode: "enforce" } },
  { key: "purchases-exception-review", route: "/dashboard/purchases/payables/exceptions/review", resource: "SupplierInvoiceMatchException", title: "Review invoice exceptions", permissions: ["purchasing.ap.match.review"], permissionDeniedTitle: { en: "Invoice exceptions are not available for this role", fr: "Les dérogations de facture ne sont pas disponibles pour ce rôle" }, permissionDeniedMessage: { en: "Ask the organization administrator for the appropriate exception permission.", fr: "Demandez à l’administrateur le droit approprié pour les dérogations." }, primaryHref: "/dashboard/purchases/payables", module: { moduleSlug: "purchasing", surface: "/dashboard/purchases/payables/exceptions/review", accessIntent: "read", mode: "enforce" } },
  {
    key: "purchases-invoice-approve",
    route: "/dashboard/purchases/payables/approve",
    resource: "SupplierInvoice",
    title: "Review supplier invoices",
    permissions: ["purchasing.ap.invoice.post"],
    permissionDeniedTitle: { en: "Invoice approval is not available for this role", fr: "L’approbation des factures n’est pas disponible pour ce rôle" },
    permissionDeniedMessage: { en: "Ask the organization administrator for invoice approval access.", fr: "Demandez à l’administrateur l’accès à l’approbation des factures." },
    primaryHref: "/dashboard/purchases/payables",
    module: { moduleSlug: "purchasing", surface: "/dashboard/purchases/payables/approve", accessIntent: "read", mode: "enforce" },
  },
  {
    key: "purchases-invoice-recovery",
    route: "/dashboard/purchases/payables/recovery",
    resource: "SupplierInvoice",
    title: "Recover invoice posting",
    permissions: ["purchasing.ap.invoice.post"],
    permissionDeniedTitle: { en: "Invoice recovery is not available for this role", fr: "La reprise comptable des factures n’est pas disponible pour ce rôle" },
    permissionDeniedMessage: { en: "Ask the organization administrator for invoice posting access.", fr: "Demandez à l’administrateur l’accès à la comptabilisation des factures." },
    primaryHref: "/dashboard/purchases/payables",
    module: { moduleSlug: "purchasing", surface: "/dashboard/purchases/payables/recovery", accessIntent: "read", mode: "enforce" },
  },
  {
    key: "purchases-invoice-prepare",
    route: "/dashboard/purchases/payables/prepare",
    resource: "SupplierInvoice",
    title: "Prepare a supplier invoice",
    permissions: ["purchasing.ap.invoice.post"],
    permissionDeniedTitle: { en: "Invoice preparation is not available for this role", fr: "La préparation de facture n’est pas disponible pour ce rôle" },
    permissionDeniedMessage: { en: "Ask the organization administrator for invoice preparation access.", fr: "Demandez à l’administrateur l’accès à la préparation des factures." },
    primaryHref: "/dashboard/purchases/payables",
    module: { moduleSlug: "purchasing", surface: "/dashboard/purchases/payables/prepare", accessIntent: "write", mode: "enforce" },
  },
  {
    key: "purchases-dashboard",
    route: "/dashboard/purchases",
    resource: "PurchaseOrder",
    title: "Purchase order dashboard",
    permissions: ["purchases.orders.read"],
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases",
      accessIntent: "read",
    },
  },
  {
    key: "purchases-detail",
    route: "/dashboard/purchases/[id]",
    resource: "PurchaseOrder",
    title: "Purchase order detail",
    permissions: ["purchases.orders.read"],
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases/[id]",
      accessIntent: "read",
    },
  },
  {
    key: "purchases-payables",
    route: "/dashboard/purchases/payables",
    resource: "APWorkbench",
    title: "AP workbench",
    permissions: ["purchasing.ap.invoice.view"],
    noActiveOrgTitle: "AP workbench needs an active organization",
    permissionDeniedTitle: {
      en: "AP workbench is not available for this role",
      fr: "L'atelier AP n'est pas disponible pour ce rôle",
    },
    noActiveOrgMessage:
      "Refresh your session from the dashboard so purchasing can load tenant-scoped AP controls.",
    permissionDeniedMessage:
      "Viewing the AP workbench requires purchasing AP read access. The denial was recorded by the RBAC guard.",
    primaryHref: "/dashboard/purchases",
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases/payables",
      accessIntent: "read",
    },
  },
  {
    key: "purchases-payables-history",
    route: "/dashboard/purchases/payables/history",
    resource: "SupplierAPHistory",
    title: "AP history",
    permissions: ["purchasing.ap.invoice.view", "finance.payables.read", "purchases.suppliers.read"],
    permissionMode: "any",
    permissionDeniedTitle: {
      en: "AP history is not available for this role",
      fr: "L'historique AP n'est pas disponible pour ce rôle",
    },
    primaryHref: "/dashboard/purchases/payables",
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases/payables/history",
      accessIntent: "read",
      mode: "enforce",
    },
  },
  {
    key: "purchases-suppliers",
    route: "/dashboard/purchases/suppliers",
    resource: "SupplierManagement",
    title: "Supplier management",
    permissions: ["purchases.suppliers.read"],
    permissionDeniedTitle: {
      en: "Supplier management is not available for this role",
      fr: "La gestion des fournisseurs n'est pas disponible pour ce role",
    },
    primaryHref: "/dashboard/purchases",
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases/suppliers",
      accessIntent: "read",
    },
  },
  {
    key: "purchases-suppliers-create",
    route: "/dashboard/purchases/suppliers/create",
    resource: "SupplierManagement",
    title: "Create supplier",
    permissions: ["purchases.suppliers.create"],
    permissionDeniedTitle: {
      en: "Supplier creation is not available for this role",
      fr: "La creation de fournisseurs n'est pas disponible pour ce role",
    },
    primaryHref: "/dashboard/purchases/suppliers",
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases/suppliers/create",
      accessIntent: "write",
    },
  },
  {
    key: "purchases-suppliers-detail",
    route: "/dashboard/purchases/suppliers/[id]",
    resource: "SupplierManagement",
    title: "Supplier analytics",
    permissions: ["purchases.suppliers.read"],
    permissionDeniedTitle: {
      en: "Supplier analytics are not available for this role",
      fr: "Les analyses fournisseur ne sont pas disponibles pour ce role",
    },
    primaryHref: "/dashboard/purchases/suppliers",
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases/suppliers/[id]",
      accessIntent: "read",
    },
  },
  {
    key: "purchases-suppliers-edit",
    route: "/dashboard/purchases/suppliers/[id]/edit",
    resource: "SupplierManagement",
    title: "Edit supplier",
    permissions: ["purchases.suppliers.update"],
    permissionDeniedTitle: {
      en: "Supplier editing is not available for this role",
      fr: "La modification des fournisseurs n'est pas disponible pour ce role",
    },
    primaryHref: "/dashboard/purchases/suppliers",
    module: {
      moduleSlug: "purchasing",
      surface: "/dashboard/purchases/suppliers/[id]/edit",
      accessIntent: "write",
    },
  },
]

export const purchasesRouteMap: Record<string, PurchasesRouteSurface> = Object.fromEntries(
  purchasesRouteCatalog.map((entry) => [entry.key, entry]),
)

export const purchasesRouteByRoute: Record<string, PurchasesRouteSurface> = Object.fromEntries(
  purchasesRouteCatalog.map((entry) => [entry.route, entry]),
)

const purchasesSurfaceByResource: Record<string, PurchasesRouteSurface> = Object.fromEntries(
  purchasesRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getPurchasesRouteSurface(key: string) {
  return purchasesRouteMap[key]
}

export function getPurchasesRouteSurfaceByRoute(route: string) {
  return purchasesRouteByRoute[route]
}

export function getPurchasesRouteSurfaceByResource(resource: string) {
  return purchasesSurfaceByResource[resource]
}
