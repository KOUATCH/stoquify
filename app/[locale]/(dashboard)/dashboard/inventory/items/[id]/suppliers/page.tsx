import getItemWithSuppliersById from "@/actions/item-suppliers/getItemWithSuppliers"
import getBriefItemById from "@/actions/itemsShow/getBriefItemById"
import getOrgSuppliers from "@/actions/suppliers/getOrgSuppliers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TableLoading } from "@/components/ui/data-table"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { ArrowLeft, Truck } from 'lucide-react'
import { Link } from "@/i18n/navigation"
import { pickLocale } from "@/i18n/routing"
import { createOrganizationMoneyFormatter } from "@/lib/i18n/organization-money"
import { getOrganizationSettingsForOrg } from "@/services/organization/organization-settings.service"
import { Suspense } from "react"
import AddSuppliersToItemModal from "./AddSuppliersToItemModal"
import LayoutItemSuppliers from "./LayoutItemSuppliers"
import { routeByKey, withInventorySurfaceAccess } from "../../../inventory-route-access"

interface ItemDetailspageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

const pageImpl = async ({ params }: ItemDetailspageProps) => {
  await checkPermission("inventory.items.read")

  const { id, locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const user = await getAuthenticatedUser()
  const organizationId = user.organizationId
  const organizationSettings = await getOrganizationSettingsForOrg(organizationId)

  const { data: item, success } = await getBriefItemById(id)
  const itemSuppliers = await getItemWithSuppliersById(id)
  const allSuppliers = await getOrgSuppliers({ pageSize: 200, isActive: true })
  // const theSupllier = await getSupplierById(id)

  if (!success || !item) {
    return <div className="text-3xl font-bold">Not found</div>
  }
  const organizationCurrency = organizationSettings?.currency
  createOrganizationMoneyFormatter({
    organizationId,
    locale,
    currency: organizationCurrency,
  })
  const currency = organizationCurrency!.trim().toUpperCase()
  const suppliers = allSuppliers.success ? allSuppliers.data.data : []
  // Extract the actual supplier relations from the response
  const supplierRelations = itemSuppliers.data

  console.log("supplierRelations", supplierRelations)
  const existingSupplierIdsForTheItem = supplierRelations?.map(
    (itemSupplier) => itemSupplier?.supplierItems.supplierId,
  ) || []
  const itemPath = `/dashboard/inventory/items/${encodeURIComponent(id)}`
  const updatedAt = new Date(item.updatedAt)

  return (
    <div className="dashboard-landing-theme dark min-h-full text-[var(--dash-text)]">
      <Suspense fallback={<TableLoading title="Item data" />}>
        <div className="dashboard-landing-content mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" className="h-10 gap-2 px-0 text-[var(--dash-brand-strong)] hover:bg-transparent hover:text-[var(--dash-brand-strong)] hover:underline">
            <Link href={itemPath}><ArrowLeft aria-hidden="true" />Back to item</Link>
          </Button>
          <header className="dashboard-glass-panel overflow-hidden rounded-lg">
            <div className="flex flex-col justify-between gap-5 p-5 sm:p-6 lg:flex-row lg:items-start">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--dash-brand-soft)] text-[var(--dash-brand-strong)]"><Truck className="h-6 w-6" aria-hidden="true" /></div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--dash-text-soft)]">Item suppliers</p>
                    <Badge variant="outline" className="dashboard-filter-chip">{supplierRelations?.length ?? 0} linked</Badge>
                  </div>
                  <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{item.name}</h1>
                  <p className="max-w-2xl text-sm leading-6 text-[var(--dash-text-soft)]">Manage supplier relationships, purchase terms, and preferred suppliers for this item.</p>
                </div>
              </div>
              <div className="shrink-0">
                <AddSuppliersToItemModal
                  itemId={id}
                  suppliers={suppliers?.map(supplier => ({ ...supplier, email: supplier.email ?? undefined }))}
                  existingSupplierIds={existingSupplierIdsForTheItem}
                />
              </div>
            </div>
            <dl className="grid gap-4 border-t border-[var(--dash-border-subtle)] px-5 py-4 text-sm sm:grid-cols-3 sm:px-6">
              <div className="min-w-0 space-y-1"><dt className="text-xs text-[var(--dash-text-soft)]">SKU</dt><dd className="break-all font-mono font-medium">{item.sku}</dd></div>
              <div className="space-y-1"><dt className="text-xs text-[var(--dash-text-soft)]">Purchase currency</dt><dd className="font-medium">{currency}</dd></div>
              <div className="space-y-1"><dt className="text-xs text-[var(--dash-text-soft)]">Item updated</dt><dd><time dateTime={updatedAt.toISOString()}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(updatedAt)} UTC</time></dd></div>
            </dl>
          </header>
          <LayoutItemSuppliers
            itemId={id}
            organizationId={organizationId}
            currency={currency}
            locale={locale}
            itemSuppliers={
              supplierRelations
                ? supplierRelations.map(rel => ({
                  ...rel,
                  lastPurchaseDate: rel.supplierItems.lastPurchaseDate === null ? undefined : rel.supplierItems.lastPurchaseDate,
                  // updatedAt and createdAt properties removed as they do not exist on rel
                }))
                : null
            }
            allSuppliers={suppliers ? suppliers.map(sup => ({ ...sup, email: sup.email ?? undefined })) : []}
          />
        </div>
      </Suspense>
    </div>
  )
}



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-items-suppliers")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-items-suppliers")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => pageImpl(props),
  })
}
