"use server"

import getOrgBrands from "@/actions/brands/getOrgBrands"
import getOrgCategories from "@/actions/categories/getOrgCategories"
import { getOrgItemsWithInventoryLevels } from "@/actions/itemsShow/getOrgItemsWithInventoryLevels"
import getOrgTaxRates from "@/actions/taxRate/getOrgTaxRates"
import getOrgUnits from "@/actions/units/getOrgUnits"
import { TableLoading } from "@/components/ui/data-table"
import ItemManagement from "@/components/ui/groups/inventory/ItemManagement"
import { getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"
import { Suspense } from "react"

export default async function ItemsNewPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const user = await getAuthenticatedUser()
  const userOrg = user?.organizationId
  if (!userOrg) redirect(localizePath("/login", locale))

  // Current action responses return flat arrays.
  const [itemsRes, brandsRes, unitsRes, taxRatesRes, catsRes] = await Promise.all([
    getOrgItemsWithInventoryLevels(userOrg),
    getOrgBrands(userOrg),
    getOrgUnits(userOrg),
    getOrgTaxRates(userOrg),
    getOrgCategories(userOrg),
  ])

  const items = itemsRes.success ? (itemsRes.data ?? []) : []
  const brands = brandsRes.success ? (brandsRes.data ?? []) : []
  const units = unitsRes.success ? (unitsRes.data ?? []) : []
  const taxRates = taxRatesRes.success ? (taxRatesRes.data ?? []) : []
  const categories = catsRes.success ? (catsRes.data ?? []) : []

  return (
    <div className="container py-8">
      <Suspense fallback={<TableLoading title="Item data" />}>
        <ItemManagement
          title="Items"
          editingId=""
          organizationId={userOrg}
          initialItemData={items as never}
          initialCategoryData={categories as never}
          initialBrandData={brands as never}
          initialUnitData={units as never}
          initialTaxRateData={taxRates as never}
        />
      </Suspense>
    </div>
  )
}
