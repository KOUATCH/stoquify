import getOrgBrands from "@/actions/brands/getOrgBrands"
import getOrgCategories from "@/actions/categories/getOrgCategories"
import { createItemAction } from "@/actions/item/items"
import getOrgTaxRates from "@/actions/taxRate/getOrgTaxRates"
import getOrgUnits from "@/actions/units/getOrgUnits"
import { ModernCreateItemForm } from "@/components/inventory/ModernCreateItemForm"
import { Button } from "@/components/ui/button"
import { getAuthenticatedUser } from "@/config/useAuth"
import { localizedRedirect } from "@/i18n/server-routing"
import { ArrowLeft, Package } from "lucide-react"
import { revalidatePath } from "next/cache"

async function handleCreateItem(formData: FormData) {
  "use server"

  const user = await getAuthenticatedUser()
  if (!user?.organizationId) {
    throw new Error("Organization not found")
  }

  const text = (key: string) => String(formData.get(key) ?? "").trim()
  const optionalText = (key: string) => {
    const value = text(key)
    return value.length > 0 ? value : null
  }
  const optionalNumber = (key: string) => {
    const value = text(key)
    return value.length > 0 ? Number(value) : null
  }

  const data = {
    nameEn: text("nameEn"),
    nameFr: optionalText("nameFr"),
    descriptionEn: optionalText("descriptionEn"),
    descriptionFr: optionalText("descriptionFr"),
    sku: text("sku"),
    costPrice: optionalNumber("costPrice") ?? 0,
    sellingPrice: optionalNumber("sellingPrice") ?? 0,
    tax: optionalNumber("tax"),
    thumbnail: optionalText("thumbnail"),
    imageUrls: optionalText("imageUrls"),
    organizationId: user.organizationId,
    categoryId: optionalText("categoryId"),
    brandId: optionalText("brandId"),
    unitId: optionalText("unitId"),
    taxRateId: optionalText("taxRateId"),
    barcode: optionalText("barcode"),
    weight: optionalNumber("weight"),
    dimensions: optionalText("dimensions"),
    minStockLevel: optionalNumber("minStockLevel") ?? 0,
    maxStockLevel: optionalNumber("maxStockLevel"),
    unitOfMeasure: optionalText("unitOfMeasure"),
    isActive: formData.get("isActive") !== "false",
    isSerialTracked: formData.get("isSerialTracked") === "true",
    slug: optionalText("slug"),
  }

  const result = await createItemAction(data)

  if (result.success) {
    revalidatePath("/dashboard/inventory/items")
    await localizedRedirect("/dashboard/inventory/items")
  } else {
    throw new Error(result.error)
  }
}

export default async function CreateItemPage() {
  const user = await getAuthenticatedUser()

  if (!user?.organizationId) {
    return (
      <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
        <div className="dashboard-landing-content mx-auto w-full max-w-[88rem] min-w-0 px-4 py-8 sm:px-6">
          <div className="dashboard-glass-panel mx-auto max-w-md rounded-lg px-6 py-14 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-danger-soft)]">
              <Package className="h-8 w-8 text-[var(--dash-danger)]" />
            </div>
            <h3 className="mb-3 text-xl font-semibold text-[var(--dash-text)]">
              Organization Required
            </h3>
            <p className="mb-6 text-sm text-[var(--dash-text-soft)]">
              No organization found for the current user.
            </p>
            <form action={async () => {
              "use server"
              await localizedRedirect("/dashboard/inventory/items")
            }}>
              <Button
                type="submit"
                variant="outline"
                className="!rounded-lg !border !border-[var(--dash-border-subtle)] !bg-[rgba(24,38,45,0.66)] !text-[var(--dash-text-muted)] hover:!border-[var(--dash-brand)] hover:!bg-[var(--dash-brand-soft)] hover:!text-[var(--dash-text)]"
              >
                <ArrowLeft className="me-2 h-4 w-4" />
                Back to Items
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const organizationId = user.organizationId

  const [categoriesResult, brandsResult, unitsResult, taxRatesResult] = await Promise.all([
    getOrgCategories(organizationId),
    getOrgBrands(organizationId),
    getOrgUnits(organizationId),
    getOrgTaxRates(organizationId),
  ])

  const categories = categoriesResult?.success ? (categoriesResult.data ?? []) : []
  const brands = brandsResult?.success ? (brandsResult.data ?? []) : []
  const units = unitsResult?.success ? (unitsResult.data ?? []) : []
  const taxRates = taxRatesResult?.success ? (taxRatesResult.data ?? []) : []

  return (
    <ModernCreateItemForm
      action={handleCreateItem}
      isLoading={false}
      categories={categories}
      brands={brands}
      units={units.map((unit) => ({
        id: unit.id,
        nameEn: unit.nameEn ?? unit.name,
        nameFr: unit.nameFr ?? null,
        symbol: unit.symbol,
      }))}
      taxRate={taxRates.map((tr) => ({
        id: tr.id,
        rate: Number(tr.rate),
        nameEn: tr.nameEn ?? tr.taxRateName,
        nameFr: tr.nameFr ?? null,
      }))}
      organizationId={organizationId}
    />
  )
}
