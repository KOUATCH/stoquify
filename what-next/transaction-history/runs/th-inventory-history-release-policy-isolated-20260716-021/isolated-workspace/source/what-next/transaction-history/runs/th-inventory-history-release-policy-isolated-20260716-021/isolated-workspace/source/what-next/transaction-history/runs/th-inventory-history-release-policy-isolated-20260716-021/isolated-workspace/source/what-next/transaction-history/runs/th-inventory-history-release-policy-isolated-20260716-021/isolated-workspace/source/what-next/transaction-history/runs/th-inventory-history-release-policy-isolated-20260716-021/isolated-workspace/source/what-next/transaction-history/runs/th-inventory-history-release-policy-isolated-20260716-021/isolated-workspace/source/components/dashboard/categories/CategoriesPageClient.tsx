"use client"

import EnhancedCategoriesManagement from "@/components/inventory/EnhancedCategoriesManagement"
import type { CategoryDTO } from "@/types/category"

interface CategoriesPageClientProps {
  initialData: CategoryDTO[]
  organizationId: string
  basePath?: string
}

export default function CategoriesPageClient({
  initialData,
  organizationId,
  basePath = "/dashboard/inventory/categories",
}: CategoriesPageClientProps) {
  return (
    <EnhancedCategoriesManagement
      data={initialData}
      organizationId={organizationId}
      basePath={basePath}
    />
  )
}
