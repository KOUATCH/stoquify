import getOrgBrands from "@/actions/brands/getOrgBrands"
import getOrgCategories from "@/actions/categories/getOrgCategories"
import getOrgTaxRates from "@/actions/taxRate/getOrgTaxRates"
import getOrgUnits from "@/actions/units/getOrgUnits"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { getItemEditDTO } from "@/services/item/item.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { redirect } from "next/navigation"
import EditItemClient from "./EditItemClient"

interface Props {
  params: Promise<{ id: string; locale: string }>
}

export default async function ItemsEditPage({ params }: Props) {
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
      <main className="container mx-auto max-w-3xl px-4 py-12" aria-labelledby="item-not-found-title">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
          <h1 id="item-not-found-title" className="text-xl font-semibold">Item not found</h1>
          <p className="mt-2 text-sm">
            This item does not exist in your organization or is no longer available.
          </p>
        </div>
      </main>
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
    <main className="container mx-auto px-4 py-6 sm:px-6 sm:py-8">
      <EditItemClient
        itemData={itemData}
        initialBrandData={brands}
        initialUnitData={units}
        initialTaxRateData={taxRates}
        initialCategoryData={categories}
      />
    </main>
  )
}
