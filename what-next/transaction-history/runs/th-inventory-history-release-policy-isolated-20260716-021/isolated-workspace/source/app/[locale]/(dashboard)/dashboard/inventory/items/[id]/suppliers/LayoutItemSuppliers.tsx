"use client"

import { ItemSupplierDTO } from "@/types/itemSuppliers"
import { useState } from "react"
import SupplierEditForm from "./SupplierEditForm"
import SuppliersList from "./SuppliersList"


interface Supplier {
  id: string
  name: string
  email?: string
}

interface ItemSuppliersLayoutProps {
  itemId: string
  itemSuppliers: ItemSupplierDTO[] | null
  // Assuming allSuppliers is an array of suppliers available in the system
  // This is used to populate the dropdown or selection list in the form
  allSuppliers: Supplier[] | null
}

export default function LayoutItemSuppliers({ itemId, itemSuppliers, allSuppliers }: ItemSuppliersLayoutProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<ItemSupplierDTO | null>(null)
  const allItemSuppliers = itemSuppliers?.map((itSup => {
    return {
      ...itSup,
      isPreferred: itSup.isPreferred ?? false, // Ensure isPreferred is always a boolean
      supplierSku: itSup.supplierSku ?? null, // Ensure supplierSku is never undefined
      notes: itSup.notes ?? null, // Ensure notes is never undefined
      createdAt: new Date(itSup.createdAt), // Convert to Date object
      updatedAt: new Date(itSup.updatedAt), // Convert to Date object
    }
  })) || []
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-600px)]">
      {/* Left Column - Suppliers List */}
      <div className="border rounded-lg">
        <SuppliersList
          itemSuppliers={allItemSuppliers}
          selectedSupplier={selectedSupplier}
          onSelectSupplier={setSelectedSupplier}
        />
      </div>

      {/* Right Column - Edit Form */}
      <div className="border rounded-lg">
        <SupplierEditForm
          itemId={itemId}
          selectedSupplier={selectedSupplier}
          onUpdate={(updatedSupplier) => {
            // Ensure isPreferred is always a boolean
            setSelectedSupplier({
              ...updatedSupplier,
              isPreferred: updatedSupplier.isPreferred ?? false,
              supplierSku: updatedSupplier.supplierSku ?? null,
              notes: updatedSupplier.notes ?? null,
              createdAt: new Date(updatedSupplier.createdAt),
              updatedAt: new Date(updatedSupplier.updatedAt),
            })
          }}
        />
      </div>
    </div>
  )
}
