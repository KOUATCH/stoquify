import getOrgCategories from "@/actions/categories/getOrgCategories"
import { ModernCategoryForm } from "@/components/categories/ModernCategoryForm"
import { getAuthenticatedUser, checkPermission } from "@/config/useAuth"
import { pickLocale } from "@/i18n/routing"
import { PERMISSIONS } from "@/lib/permissions"

type CreateCategoryPageProps = {
  params: Promise<{ locale: string }>
}

export default async function CreateCategoryPage({ params }: CreateCategoryPageProps) {
  await checkPermission(PERMISSIONS.CREATE_CATEGORIES)

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
