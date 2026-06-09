"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { ItemSupplierDTO } from "@/types/itemSuppliers"
import { Clock, DollarSign, Package, Search, Star, X } from "lucide-react"
import { useMemo, useState } from "react"

interface SuppliersListProps {
  itemSuppliers: ItemSupplierDTO[] | null
  selectedSupplier: ItemSupplierDTO | null
  onSelectSupplier: (supplier: ItemSupplierDTO) => void
}

export default function SuppliersList({ itemSuppliers, selectedSupplier, onSelectSupplier }: SuppliersListProps) {
  const [searchQuery, setSearchQuery] = useState("")

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
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Item Suppliers</h2>
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No suppliers found for this item.</p>
          <p className="text-sm">Add suppliers using the button above.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <h2 className="font-semibold text-xl text-blue-950">Item Suppliers ({itemSuppliers.length})</h2>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers by name, SKU, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10 pe-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute end-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={clearSearch}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Search Results Info */}
        {searchQuery && (
          <div className="text-sm text-muted-foreground">
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

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredSuppliers && filteredSuppliers.length > 0 ? (
            filteredSuppliers.map((itemSupplier) => (
              <Button
                key={itemSupplier.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start p-4 h-auto text-start hover:bg-accent/50",
                  selectedSupplier?.id === itemSupplier.id && "bg-accent",
                )}
                onClick={() => onSelectSupplier(itemSupplier)}
              >
                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground text-base">
                      {itemSupplier.supplier?.name || itemSupplier.supplierSku || "Unknown Supplier"}
                    </h3>
                    {itemSupplier.isPreferred && (
                      <Badge variant="default" className="ms-2 shrink-0">
                        <Star className="h-3 w-3 me-1" />
                        Preferred
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
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
                    {itemSupplier.unitCost && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 shrink-0" />
                        <span>${itemSupplier?.unitCost ? itemSupplier?.unitCost.toString() : "N/A"}</span>
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
                    <div className="text-sm text-muted-foreground truncate">{itemSupplier.supplier.email}</div>
                  )}
                </div>
              </Button>
            ))
          ) : searchQuery ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No suppliers found matching "{searchQuery}"</p>
              <Button variant="link" onClick={clearSearch} className="mt-2">
                Clear search
              </Button>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  )
}
