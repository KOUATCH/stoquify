"use client"

import { notify } from "@/lib/notifications/notify"
import type React from "react"

import addItemSuppliers from "@/actions/item-suppliers/addItemSuppliers"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Check, Loader2, Search, Users, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
// import { notify } from "@/hooks/notify"

type Supplier = {
  id: string
  name: string
  email?: string
  phone?: string | null
}

interface ItemSupplierModalProps {
  itemId: string
  suppliers: Supplier[]
  existingSupplierIds?: string[]
  triggerButtonText?: string
  triggerButtonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
}

// Custom hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export const AddSuppliersToItemModal = ({
  itemId,
  suppliers,
  existingSupplierIds = [],
  triggerButtonText = "Add Item Suppliers",
  triggerButtonVariant = "default",
}: ItemSupplierModalProps) => {
  const router = useRouter()
  // const { notification } = notify()

  // State management
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Available suppliers (excluding existing ones)
  const availableSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => !existingSupplierIds.includes(supplier.id))
  }, [suppliers, existingSupplierIds])

  // Filtered suppliers based on search
  const filteredSuppliers = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return suppliers

    return suppliers.filter(
      (supplier) =>
        supplier.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        supplier.phone?.includes(debouncedSearchQuery),
    )
  }, [suppliers, debouncedSearchQuery])

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery("")
      setSelectedSuppliers([])
      setError(null)
    }
  }, [open])

  // Handle supplier selection toggle
  const toggleSupplier = useCallback(
    (supplierId: string) => {
      if (existingSupplierIds.includes(supplierId)) return

      setSelectedSuppliers((prev) =>
        prev.includes(supplierId) ? prev.filter((id) => id !== supplierId) : [...prev, supplierId],
      )
      setError(null)
    },
    [existingSupplierIds],
  )

  // Select all available suppliers
  const selectAllAvailable = useCallback(() => {
    const availableIds = filteredSuppliers
      .filter((supplier) => !existingSupplierIds.includes(supplier.id))
      .map((supplier) => supplier.id)
    setSelectedSuppliers(availableIds)
  }, [filteredSuppliers, existingSupplierIds])

  // Deselect all suppliers
  const deselectAll = useCallback(() => {
    setSelectedSuppliers([])
  }, [])

  // Handle form submission
  const handleSubmit = async () => {
    if (selectedSuppliers.length === 0) {
      setError("Please select at least one supplier")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await addItemSuppliers(itemId, selectedSuppliers)
      if (!result.success) {
        throw new Error(result.error || "Failed to add suppliers")
      }
      notify.success(`Successfully added ${selectedSuppliers.length} supplier${selectedSuppliers.length !== 1 ? "s" : ""}`)
      // notify({
      //   title: "Success!",
      //   description: `Successfully added ${selectedSuppliers.length} supplier${selectedSuppliers.length !== 1 ? "s" : ""}`,
      // })

      setOpen(false)
      router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add suppliers"
      setError(errorMessage)
      notify.error(errorMessage)
      // notify({
      //   title: "Error",
      //   description: errorMessage,
      //   variant: "destructive",
      // })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle dialog close with confirmation if there are unsaved changes
  const handleClose = () => {
    if (selectedSuppliers.length > 0) {
      setShowConfirmDialog(true)
    } else {
      setOpen(false)
    }
  }

  const confirmClose = () => {
    setShowConfirmDialog(false)
    setOpen(false)
  }

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && !isSubmitting) {
      handleClose()
    }
  }

  const availableCount = availableSuppliers.length
  const selectedCount = selectedSuppliers.length

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant={triggerButtonVariant} className="dashboard-button-primary min-h-10 gap-2 rounded-lg">
            <Users className="h-4 w-4" />
            {triggerButtonText}
          </Button>
        </DialogTrigger>

        <DialogContent className="dashboard-landing-theme dark enterprise-floating-surface flex max-h-[90vh] w-[calc(100%-2rem)] flex-col rounded-lg sm:max-w-xl" onKeyDown={handleKeyDown}>
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 break-words">
              <Users className="h-5 w-5" />
              Add Suppliers to Item
            </DialogTitle>
            <DialogDescription className="text-[var(--dash-text-soft)]">
              Select suppliers to associate with this item. You can search by name, email, or phone number.
            </DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--dash-text-soft)]" />
            <Input
              placeholder="Search suppliers by name, email, or phone..."
              aria-label="Search available suppliers"
              className="dashboard-control h-10 ps-10 pe-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSubmitting}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute end-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery("")}
                aria-label="Clear available supplier search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Selection Controls */}
          {availableCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-2 break-words">
                <Badge variant="outline" className="dashboard-filter-chip">
                  {selectedCount} of {availableCount} selected
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="dashboard-button-secondary"
                  onClick={selectAllAvailable}
                  disabled={isSubmitting || selectedCount === availableCount}
                >
                  Select All
                </Button>
                <Button variant="ghost" size="sm" className="dashboard-button-secondary" onClick={deselectAll} disabled={isSubmitting || selectedCount === 0}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          <Separator className="bg-[var(--dash-border-subtle)]" />

          {/* Suppliers List */}
          <ScrollArea className="min-h-0 max-h-[360px] flex-1 overflow-y-auto rounded-lg border border-[var(--dash-border-subtle)]">
            <div className="p-4">
              {filteredSuppliers.length > 0 ? (
                <div className="space-y-3">
                  {filteredSuppliers.map((supplier) => {
                    const isExisting = existingSupplierIds.includes(supplier.id)
                    const isSelected = selectedSuppliers.includes(supplier.id)

                    return (
                      <div
                        key={supplier.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${isExisting
                          ? "border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]"
                          : isSelected
                            ? "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)]"
                            : "border-[var(--dash-border-subtle)] hover:bg-[var(--dash-brand-soft)]"
                          }`}
                      >
                        <div className="flex items-center justify-center mt-0.5">
                          {isExisting ? (
                            <div className="h-4 w-4 flex items-center justify-center rounded-sm border border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]">
                              <Check className="h-3 w-3" />
                            </div>
                          ) : (
                            <Checkbox
                              className="border-[var(--dash-border)] data-[state=checked]:bg-[var(--dash-brand)] data-[state=checked]:text-white"
                              id={`supplier-${supplier.id}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleSupplier(supplier.id)}
                              disabled={isSubmitting}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={`supplier-${supplier.id}`}
                            className={`block text-sm font-medium leading-none cursor-pointer ${isExisting ? "text-[var(--dash-text-soft)]" : ""
                              }`}
                          >
                            <div className="flex flex-wrap items-center gap-2 break-words">
                              {supplier.name}
                              {isExisting && (
                                <Badge variant="outline" className="border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-xs text-[var(--dash-success)]">
                                  Already Added
                                </Badge>
                              )}
                            </div>
                            {(supplier.email || supplier.phone) && (
                              <div className="mt-2 space-y-1 break-all text-xs text-[var(--dash-text-soft)]">
                                {supplier.email && <div>{supplier.email}</div>}
                                {supplier.phone && <div>{supplier.phone}</div>}
                              </div>
                            )}
                          </Label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Search className="h-8 w-8 text-[var(--dash-text-soft)] mb-2" />
                  <p className="text-sm text-[var(--dash-text-soft)]">
                    {searchQuery ? "No suppliers found matching your search" : "No suppliers available"}
                  </p>
                  {searchQuery && (
                    <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="mt-2 text-[var(--dash-brand-strong)]">
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Error Display */}
          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-lg border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] p-3">
              <AlertCircle className="h-4 w-4 text-[var(--dash-danger)]" />
              <p className="text-sm text-[var(--dash-danger)]">{error}</p>
            </div>
          )}

          {/* Dialog Footer */}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex-1 text-sm text-[var(--dash-text-soft)]">
              {selectedCount > 0 && (
                <span>
                  {selectedCount} supplier{selectedCount !== 1 ? "s" : ""} selected
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="dashboard-button-secondary" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={selectedCount === 0 || isSubmitting} className="dashboard-button-primary min-h-10 gap-2 rounded-lg">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Adding..." : `Add Selected (${selectedCount})`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="dashboard-landing-theme dark enterprise-floating-surface w-[calc(100%-2rem)] rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--dash-text-soft)]">
              You have selected {selectedCount} supplier{selectedCount !== 1 ? "s" : ""}. Are you sure you want to close
              without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dashboard-button-secondary">Continue editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose} className="border border-[var(--dash-danger)] bg-[var(--dash-danger-soft)] text-[var(--dash-danger)] hover:bg-[var(--dash-danger)] hover:text-white">
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default AddSuppliersToItemModal
