import getOrgBrands from "@/actions/brands/getOrgBrands"
import getOrgCategories from "@/actions/categories/getOrgCategories"
import { createItemAction } from "@/actions/item/items"
import { getOrgLocations } from "@/actions/locations/getOrgLocations"
import getOrgTaxRates from "@/actions/taxRate/getOrgTaxRates"
import getOrgUnits from "@/actions/units/getOrgUnits"
import { CreateItemWizard } from "@/components/inventory/CreateItemWizard"
import { Button } from "@/components/ui/button"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { pickLocale } from "@/i18n/routing"
import { generateSimpleSKU } from "@/lib/generateSKU"
import { createOrganizationMoneyFormatter } from "@/lib/i18n/organization-money"
import { ArrowLeft, Package } from "lucide-react"
import { localizedRedirect } from "@/i18n/server-routing"
import { revalidatePath } from "next/cache"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getOrganizationSettingsForOrg } from "@/services/organization/organization-settings.service"
import { getLocale } from "next-intl/server"
import { routeByKey, withInventorySurfaceAccess } from "../../inventory-route-access"

async function handleCreateItem(formData: FormData) {
  "use server"

  await checkPermission("inventory.items.create")

  const user = await getAuthenticatedUser()
  if (!user?.organizationId) {
    return {
      success: false,
      error: "Organization not found",
    }
  }

  const text = (key: string) => String(formData.get(key) ?? "").trim()
  const optionalText = (key: string) => {
    const value = text(key)
    return value.length > 0 ? value : null
  }

  const parseNumber = (
    key: string,
    options: {
      required?: boolean
      fallback?: number | null
      min?: number
      max?: number
    } = {},
  ) => {
    const value = text(key)

    if (!value) {
      return options.required ? Number.NaN : (options.fallback ?? null)
    }

    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      return Number.NaN
    }

    if (typeof options.min === "number" && parsed < options.min) {
      return Number.NaN
    }

    if (typeof options.max === "number" && parsed > options.max) {
      return Number.NaN
    }

    return parsed
  }

  const toBoolean = (key: string, fallback: boolean) => {
    const raw = formData.get(key)
    if (raw === null) return fallback
    if (typeof raw !== "string") return fallback

    const normalized = raw.trim().toLowerCase()
    if (["true", "1", "on", "yes"].includes(normalized)) {
      return true
    }
    if (["false", "0", "off", "no"].includes(normalized)) {
      return false
    }

    return fallback
  }

  const openingQuantity = parseNumber("initialInventory.quantity", { fallback: 0, min: 0 })
  const openingLocationId = optionalText("initialInventory.locationId")
  const initialInventory = typeof openingQuantity === "number" && openingQuantity > 0
    ? {
        locationId: openingLocationId ?? "",
        quantity: openingQuantity,
        unitCost: parseNumber("initialInventory.unitCost", { fallback: 0, min: 0 }) ?? 0,
        notes: optionalText("initialInventory.notes") ?? undefined,
        referenceNumber: optionalText("initialInventory.referenceNumber") ?? undefined,
      }
    : undefined

  const data = {
    nameEn: text("nameEn"),
    nameFr: optionalText("nameFr"),
    descriptionEn: optionalText("descriptionEn"),
    descriptionFr: optionalText("descriptionFr"),
    sku: optionalText("sku") || generateSimpleSKU(9, "ITEM"),
    costPrice: parseNumber("costPrice", { required: true, fallback: 0, min: 0 }),
    sellingPrice: parseNumber("sellingPrice", { required: true, fallback: 0, min: 0 }),
    tax: parseNumber("tax", { min: 0, max: 1000 }),
    thumbnail: optionalText("thumbnail"),
    imageUrls: optionalText("imageUrls"),
    organizationId: user.organizationId,
    categoryId: optionalText("categoryId"),
    brandId: optionalText("brandId"),
    unitId: optionalText("unitId"),
    taxRateId: optionalText("taxRateId"),
    barcode: optionalText("barcode"),
    weight: parseNumber("weight", { min: 0 }),
    dimensions: optionalText("dimensions"),
    minStockLevel: parseNumber("minStockLevel", { required: true, fallback: 0, min: 0 }),
    maxStockLevel: parseNumber("maxStockLevel", { fallback: null, min: 0 }),
    unitOfMeasure: optionalText("unitOfMeasure"),
    isActive: toBoolean("isActive", true),
    isSerialTracked: toBoolean("isSerialTracked", false),
    slug: optionalText("slug"),
    initialInventory,
  }

  const result = await createItemAction(data)

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    }
  }

  revalidatePath("/dashboard/inventory/items")

  return {
    success: true,
    redirect: "/dashboard/inventory/items",
  }
}

async function CreateItemPageImpl() {
  await checkPermission("inventory.items.create")
  const locale = pickLocale(await getLocale())

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
  await observeModuleAccess({
    organizationId,
    userId: user.id,
    actorPermissions: user.permissions,
    moduleSlug: "inventory",
    surfaceType: "page",
    surface: "/dashboard/inventory/items/create",
    accessIntent: "write",
    mode: "observe",
  })


  const [organizationSettings, categoriesResult, brandsResult, unitsResult, taxRatesResult, locationsResult] = await Promise.all([
    getOrganizationSettingsForOrg(organizationId),
    getOrgCategories(organizationId),
    getOrgBrands(organizationId),
    getOrgUnits(organizationId),
    getOrgTaxRates(organizationId),
    getOrgLocations(organizationId),
  ])
  const organizationCurrency = organizationSettings?.currency
  createOrganizationMoneyFormatter({
    organizationId,
    locale,
    currency: organizationCurrency,
  })
  const currency = organizationCurrency!.trim().toUpperCase()

  const categories = categoriesResult?.success ? (categoriesResult.data ?? []) : []
  const brands = brandsResult?.success ? (brandsResult.data ?? []) : []
  const units = unitsResult?.success ? (unitsResult.data ?? []) : []
  const taxRates = taxRatesResult?.success ? (taxRatesResult.data ?? []) : []
  const locations = locationsResult?.success
    ? (locationsResult.data ?? []).filter((location) => location.isActive !== false)
    : []
  const referenceDataWarnings = [
    !categoriesResult?.success ? "Categories could not be loaded." : null,
    !brandsResult?.success ? "Brands could not be loaded." : null,
    !unitsResult?.success ? "Units could not be loaded." : null,
    !taxRatesResult?.success ? "Tax rates could not be loaded." : null,
    !locationsResult?.success ? "Locations could not be loaded, so opening stock is unavailable." : null,
  ].filter((message): message is string => Boolean(message))

  return (
    <CreateItemWizard
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
      locations={locations.map((location) => ({
        id: location.id,
        name: location.name,
        code: location.code,
      }))}
      referenceDataWarnings={referenceDataWarnings}
      organizationId={organizationId}
      currency={currency}
      locale={locale}
    />
  )
}



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-items-create")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-items-create")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => CreateItemPageImpl(),
  })
}
