"use client"

import { ItemWithInventoryLevelsPayload } from "@/types/itemTypes"
import { getLocaleFromPathname, localizePath } from "@/i18n/routing"
import { DEFAULT_LOCALE } from "@/types/bilingual"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useState } from "react"

export const useItemManagement = () => {
  const router = useRouter()
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE
  const localizedHref = useCallback((href: string) => localizePath(href, locale), [locale])
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ItemWithInventoryLevelsPayload | null>(null)

  const handleAddClick = useCallback(() => {
    setFormDialogOpen(true)
  }, [])

  const handleEditClick = useCallback((item: ItemWithInventoryLevelsPayload) => {
    router.push(localizedHref(`/dashboard/inventory/items/${item.id}/edit`))
  }, [localizedHref, router])

  const handleDeleteClick = useCallback((item: ItemWithInventoryLevelsPayload) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }, [])

  const resetFormToDefaults = useCallback(() => {
    setItemToDelete(null)
  }, [])

  return {
    formDialogOpen,
    setFormDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    itemToDelete,
    setItemToDelete,
    handleAddClick,
    handleEditClick,
    handleDeleteClick,
    resetFormToDefaults,
  }
}
