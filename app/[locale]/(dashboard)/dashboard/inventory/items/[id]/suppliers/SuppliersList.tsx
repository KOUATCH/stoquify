"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { createOrganizationMoneyFormatter } from "@/lib/i18n/organization-money"
import { ItemSupplierDTO } from "@/types/itemSuppliers"
import { Clock, Coins, Package, Search, Star, X } from "lucide-react"
import { useMemo, useState } from "react"

interface SuppliersListProps {
  itemSuppliers: ItemSupplierDTO[] | null
  selectedSupplier: ItemSupplierDTO | null
  onSelectSupplier: (supplier: ItemSupplierDTO) => void
  organizationId: string
  currency: string
  locale: string
}

export default function SuppliersList({
  itemSuppliers,
  selectedSupplier,
  onSelectSupplier,
  organizationId,
  currency,
  locale,
}: SuppliersListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const moneyFormatter = useMemo(
    () => createOrganizationMoneyFormatter({ organizationId, locale, currency }),
    [currency, locale, organizationId],
  )

  // Filter suppliers based on search query
  const filteredSuppliers = useMemo(() => {
    if (!itemSuppliers || !searchQuery.trim()) {
      return itemSuppliers
    }

    const query = searchQuery.toLowerCase().trim()
    return itemSuppliers.filter((itemSupplier) => {
      const supplierName = itemSupplier.supplier?.name?.toLowerCase() || ""
      const supplierSku = itemSupplier.supplierSku?.toLowerCase() || ""
      const supplierEmail = itemSupplier.supplier?.email?.toLowerCase() || ""

      return supplierName.includes(query) || supplierSku.includes(query) || supplierEmail.includes(query)
    })
  }, [itemSuppliers, searchQuery])

  const clearSearch = () => {
    setSearchQuery("")
  }

  if (!itemSuppliers || itemSuppliers.length === 0) {
    return (
      <div className="min-h-[320px] p-5 sm:p-6">
        <h2 className="text-lg font-semibold mb-4">Item Suppliers</h2>
        <div className="text-center py-8 text-[var(--dash-text-soft)]">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No suppliers found for this item.</p>
          <p className="text-sm">Add suppliers using the button above.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-4 border-b border-[var(--dash-border-subtle)] p-5">
        <h2 className="text-lg font-semibold text-[var(--dash-text)]">Item Suppliers <span className="text-sm font-normal text-[var(--dash-text-soft)]">({itemSuppliers.length})</span></h2>
        <p className="text-sm leading-6 text-[var(--dash-text-soft)]">Select a supplier to review pricing and purchase terms.</p>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--dash-text-soft)]" aria-hidden="true" />
          <Input
            aria-label="Search item suppliers"
            placeholder="Search by name, SKU, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="dashboard-control h-10 rounded-lg ps-10 pe-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute end-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={clearSearch}
              aria-label="Clear supplier search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="text-sm text-[var(--dash-text-soft)]" role="status">
            {filteredSuppliers?.length === 0 ? (
              <span>No suppliers found matching "{searchQuery}"</span>
            ) : (
              <span>
                Showing {filteredSuppliers?.length} of {itemSuppliers.length} suppliers
              </span>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="max-h-[600px] overflow-y-auto">
        <div className="p-2 space-y-2">
          {filteredSuppliers && filteredSuppliers.length > 0 ? (
            filteredSuppliers.map((itemSupplier) => (
              <Button
                key={itemSupplier.id}
                variant="ghost"
                className={cn(
                  "h-auto w-full min-w-0 justify-start whitespace-normal rounded-lg border p-4 text-start transition-colors focus-visible:ring-[var(--dash-focus)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]",
                  selectedSupplier?.id === itemSupplier.id
                    ? "border-[var(--dash-brand)] bg-[var(--dash-brand-soft)]"
                    : "border-[var(--dash-border-subtle)] bg-transparent",
                )}
                aria-pressed={selectedSupplier?.id === itemSupplier.id}
                onClick={() => onSelectSupplier(itemSupplier)}
              >
                <div className="min-w-0 flex-1 space-y-3 w-full">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words text-base font-semibold text-[var(--dash-text)]">
                      {itemSupplier.supplier?.name || itemSupplier.supplierSku || "Unknown Supplier"}
                    </h3>
                    {itemSupplier.isPreferred && (
                      <Badge variant="outline" className="shrink-0 border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]">
                        <Star className="h-3 w-3 me-1" />
                        Preferred
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-sm text-[var(--dash-text-soft)] min-[440px]:grid-cols-2">
                    {itemSupplier.supplierSku && (
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 shrink-0" />
                        <span className="truncate">SKU: {itemSupplier.supplierSku}</span>
                      </div>
                    )}
                    {itemSupplier.leadTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{itemSupplier.leadTime} days</span>
                      </div>
                    )}
                    {itemSupplier.unitCost !== undefined && itemSupplier.unitCost !== null && (
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3 shrink-0" />
                        <span>{moneyFormatter.format(itemSupplier.unitCost)}</span>
                      </div>
                    )}
                    {itemSupplier.minOrderQty && (
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 shrink-0" />
                        <span>Min: {itemSupplier.minOrderQty}</span>
                      </div>
                    )}
                  </div>
                  {itemSupplier.supplier?.email && (
                    <div className="text-sm text-[var(--dash-text-soft)] truncate">{itemSupplier.supplier.email}</div>
                  )}
                </div>
              </Button>
            ))
          ) : searchQuery ? (
            <div className="text-center py-8 text-[var(--dash-text-soft)]">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No suppliers found matching "{searchQuery}"</p>
              <Button variant="link" onClick={clearSearch} className="mt-2 text-[var(--dash-brand-strong)]">
                Clear search
              </Button>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  )
}
