import { notFound } from "next/navigation"

import { getBrandById } from "@/actions/brands/getBrandsAction"
import { ModernBrandForm } from "@/components/brands/ModernBrandForm"
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth"
import { pickLocale } from "@/i18n/routing"
import { routeByKey, withInventorySurfaceAccess } from "../../../inventory-route-access"

interface BrandEditPageProps {
  params: Promise<{ locale: string; id: string }>
}

async function BrandEditPageImpl({ params }: BrandEditPageProps) {
  await checkPermission("inventory.brands.update")

  const { locale: rawLocale, id } = await params
  const locale = pickLocale(rawLocale)
  const user = await getAuthenticatedUser()

  if (!user?.organizationId) {
    notFound()
  }

  const brandResult = await getBrandById(id, user.organizationId)

  if (!brandResult.success || !brandResult.data) {
    notFound()
  }

  return (
    <ModernBrandForm
      mode="edit"
      organizationId={user.organizationId}
      initialData={brandResult.data}
      returnHref={`/${locale}/dashboard/inventory/brands`}
    />
  )
}



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-brands-edit")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-brands-edit")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => BrandEditPageImpl(props),
  })
}
