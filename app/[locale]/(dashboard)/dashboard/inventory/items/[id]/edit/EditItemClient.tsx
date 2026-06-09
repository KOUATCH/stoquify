"use client"

import ModernItemFormForEditing from "@/components/dashboard/items/ModernItemFormForEditing"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { DEFAULT_LOCALE } from "@/types/bilingual"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

interface EditItemClientProps {
  itemData: unknown
  initialBrandData: unknown[]
  initialUnitData: unknown[]
  initialTaxRateData: unknown[]
  initialCategoryData: unknown[]
}

export default function EditItemClient({
  itemData,
  initialBrandData,
  initialUnitData,
  initialTaxRateData,
  initialCategoryData,
}: EditItemClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE
  const itemsHref = localizePath("/dashboard/inventory/items", locale)
  const [open, setOpen] = useState(true)

  return (
    <ModernItemFormForEditing
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) router.push(itemsHref)
      }}
      itemData={itemData as never}
      onSuccess={() => {
        setOpen(false)
        router.push(itemsHref)
      }}
      initialBrandData={initialBrandData as never}
      initialUnitData={initialUnitData as never}
      initialCategoryData={initialCategoryData as never}
      initialTaxRateData={initialTaxRateData as never}
    />
  )
}
