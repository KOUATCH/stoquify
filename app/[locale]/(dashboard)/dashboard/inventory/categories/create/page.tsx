import getOrgCategories from "@/actions/categories/getOrgCategories"
import { ModernCategoryForm } from "@/components/categories/ModernCategoryForm"
import { getAuthenticatedUser, checkPermission } from "@/config/useAuth"
import { pickLocale } from "@/i18n/routing"
import { routeByKey, withInventorySurfaceAccess } from "../../inventory-route-access"

type CreateCategoryPageProps = {
  params: Promise<{ locale: string }>
}

async function CreateCategoryPageImpl({ params }: CreateCategoryPageProps) {
  await checkPermission("inventory.categories.create")

  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  const user = await getAuthenticatedUser()
  const organizationId = user.organizationId
  const categoriesResult = await getOrgCategories(organizationId)

  return (
    <ModernCategoryForm
      organizationId={organizationId}
      categories={categoriesResult.data ?? []}
      returnHref={`/${locale}/dashboard/inventory/categories`}
    />
  )
}



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-categories-create")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-categories-create")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => CreateCategoryPageImpl(props),
  })
}
