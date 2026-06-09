"use server"

import getOrgBrands from "@/actions/brands/getOrgBrands"
import getOrgCategories from "@/actions/categories/getOrgCategories"
import getBriefOrgItems from "@/actions/itemsShow/getBriefOrgItems"
import getOrgTaxRates from "@/actions/taxRate/getOrgTaxRates"
import getOrgUnits from "@/actions/units/getOrgUnits"
import { TableLoading } from "@/components/ui/data-table"
import ItemManagement from "@/components/ui/groups/inventory/ItemManagement"
import { getAuthenticatedUser } from "@/config/useAuth"
import { getTranslations } from "next-intl/server"
import { Suspense } from "react"

export default async function ItemsPage() {
  const t = await getTranslations()
  const user = await getAuthenticatedUser()
  const userOrg = user?.organizationId

  if (!userOrg) {
    return (
      <div className="container py-8">
        <div className="text-sm text-muted-foreground">{t("purchaseOrders.orgRequired.subtitle")}</div>
      </div>
    )
  }

  const [itemsRes, brandsRes, unitsRes, taxRatesRes, catsRes] = await Promise.all([
    getBriefOrgItems(userOrg).catch(() => null),
    getOrgBrands(userOrg).catch(() => null),
    getOrgUnits(userOrg).catch(() => null),
    getOrgTaxRates(userOrg).catch(() => null),
    getOrgCategories(userOrg).catch(() => null),
  ])

  const initialItemData = (itemsRes as { data?: unknown[] } | null)?.data ?? []
  const initialCategoryData = catsRes?.success ? (catsRes.data ?? []) : []
  const initialBrandData = brandsRes?.success ? (brandsRes.data ?? []) : []
  const initialUnitData = unitsRes?.success ? (unitsRes.data ?? []) : []
  const initialTaxRateData = taxRatesRes?.success ? (taxRatesRes.data ?? []) : []

  return (
    <div className="container py-8">
      <Suspense fallback={<TableLoading title={t("items.loadingItems")} />}>
        <ItemManagement
          title={t("nav.items")}
          editingId=""
          organizationId={userOrg}
          initialItemData={initialItemData as never}
          initialCategoryData={initialCategoryData as never}
          initialBrandData={initialBrandData as never}
          initialUnitData={initialUnitData as never}
          initialTaxRateData={initialTaxRateData as never}
        />
      </Suspense>
    </div>
  )
}
