import getOrgBrands from "@/actions/brands/getOrgBrands"
import getOrgCategories from "@/actions/categories/getOrgCategories"
import getOrgTaxRates from "@/actions/taxRate/getOrgTaxRates"
import getOrgUnits from "@/actions/units/getOrgUnits"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { getItemEditDTO } from "@/services/item/item.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { redirect } from "next/navigation"
import EditItemClient from "./EditItemClient"
import { routeByKey, withInventorySurfaceAccess } from "../../../inventory-route-access"

interface Props {
  params: Promise<{ id: string; locale: string }>
}

async function ItemsEditPageImpl({ params }: Props) {
  const { id, locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  await checkPermission("inventory.items.update")
  const user = await getAuthenticatedUser()
  const userOrg = user?.organizationId
  if (!userOrg) redirect(localizePath("/login", locale))

  const moduleDecision = await observeModuleAccess({
    organizationId: userOrg,
    userId: user.id,
    actorPermissions: user.permissions,
    moduleSlug: "inventory",
    surfaceType: "page",
    surface: "/dashboard/inventory/items/[id]/edit",
    accessIntent: "write",
    mode: "enforce",
  })
  if (!moduleDecision.allowed) redirect(localizePath("/unauthorized", locale))

  const itemData = await getItemEditDTO(userOrg, id)
  if (!itemData) {
    return (
      <DashboardRouteState kind="not_found" locale={locale} embedded
        title="Item not found"
        message="This item does not exist in your organization or is no longer available."
        primaryLabel="Back to items"
        primaryHref={localizePath("/dashboard/inventory/items", locale)} />
    )
  }

  const [brandsRes, unitsRes, taxRatesRes, categoriesRes] = await Promise.all([
    getOrgBrands(userOrg),
    getOrgUnits(userOrg),
    getOrgTaxRates(userOrg),
    getOrgCategories(userOrg),
  ])

  const brands = brandsRes.success ? (brandsRes.data ?? []) : []
  const units = unitsRes.success ? (unitsRes.data ?? []) : []
  const taxRates = taxRatesRes.success ? (taxRatesRes.data ?? []) : []
  const categories = categoriesRes.success ? (categoriesRes.data ?? []) : []

  return (
    <div className="min-w-0">
      <EditItemClient
        itemData={itemData}
        initialBrandData={brands}
        initialUnitData={units}
        initialTaxRateData={taxRates}
        initialCategoryData={categories}
      />
    </div>
  )
}



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-items-edit")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-items-edit")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => ItemsEditPageImpl(props),
  })
}
