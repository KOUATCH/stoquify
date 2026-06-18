import getOrgBrands from "@/actions/brands/getOrgBrands"
import getOrgCategories from "@/actions/categories/getOrgCategories"
import getOrgTaxRates from "@/actions/taxRate/getOrgTaxRates"
import getOrgUnits from "@/actions/units/getOrgUnits"
import { getAuthenticatedUser } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { getItemEditDTO } from "@/services/item/item.service"
import { redirect } from "next/navigation"
import EditItemClient from "./EditItemClient"

interface Props {
  params: Promise<{ id: string; locale: string }>
}

export default async function ItemsEditPage({ params }: Props) {
  const { id, locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const user = await getAuthenticatedUser()
  const userOrg = user?.organizationId
  if (!userOrg) redirect(localizePath("/login", locale))

  const itemData = await getItemEditDTO(userOrg, id)
  if (!itemData) {
    return (
      <div className="container mx-auto py-8">
        <div className="p-6 border border-red-200 rounded-lg bg-red-50">Item not found.</div>
      </div>
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
    <div className="container mx-auto py-8">
      <EditItemClient
        itemData={itemData as never}
        initialBrandData={brands as never}
        initialUnitData={units as never}
        initialTaxRateData={taxRates as never}
        initialCategoryData={categories as never}
      />
    </div>
  )
}
