import getItemWithSuppliersById from "@/actions/item-suppliers/getItemWithSuppliers"
import getBriefItemById from "@/actions/itemsShow/getBriefItemById"
import getOrgSuppliers from "@/actions/suppliers/getOrgSuppliers"
import { Button } from "@/components/ui/button"
import { TableLoading } from "@/components/ui/data-table"
import { ArrowLeft } from 'lucide-react'
import { Link } from "@/i18n/navigation"
import { Suspense } from "react"
import AddSuppliersToItemModal from "./AddSuppliersToItemModal"
import LayoutItemSuppliers from "./LayoutItemSuppliers"

interface ItemDetailspageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

const page = async ({ params }: ItemDetailspageProps) => {
  const { id } = await params

  const { data: item, success } = await getBriefItemById(id)
  const itemSuppliers = await getItemWithSuppliersById(id)
  const allSuppliers = await getOrgSuppliers({ pageSize: 200, isActive: true })
  // const theSupllier = await getSupplierById(id)

  if (!success || !item) {
    return <div className="text-3xl font-bold">Not found</div>
  }
  const suppliers = allSuppliers.success ? allSuppliers.data.data : []
  // Extract the actual supplier relations from the response
  const supplierRelations = itemSuppliers.data

  console.log("supplierRelations", supplierRelations)
  const existingSupplierIdsForTheItem = supplierRelations?.map(
    (itemSupplier) => itemSupplier?.supplierItems.supplierId,
  ) || []

  return (
    <div className="container py-8">
      <Suspense fallback={<TableLoading title="Item data" />}>
        <div className="container">
          <div className="mb-9 space-y-4">
            <div className="flex items-center gap-2">
              <Link href="/dashboard/inventory/items">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Back to item</span>
                </Button>
              </Link>
              <div className="text-muted-foreground text-sm">
                <Link href="/dashboard/inventory/items" className="hover:underline">
                  Items
                </Link>
                <span>Suppliers</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{item?.name}</h1>
                <p>
                  SKU: {item?.sku} . Last Updated: {item?.updatedAt.toString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AddSuppliersToItemModal
                  itemId={id}
                  suppliers={suppliers?.map(supplier => ({ ...supplier, email: supplier.email ?? undefined }))}
                  existingSupplierIds={existingSupplierIdsForTheItem}
                />
              </div>
            </div>
          </div>
          <LayoutItemSuppliers
            itemId={id}
            itemSuppliers={
              supplierRelations
                ? supplierRelations.map(rel => ({
                  ...rel,
                  lastPurchaseDate: rel.supplierItems.lastPurchaseDate === null ? undefined : rel.supplierItems.lastPurchaseDate,
                  // updatedAt and createdAt properties removed as they do not exist on rel
                }))
                : null
            }
            allSuppliers={suppliers ? suppliers.map(sup => ({ ...sup, email: sup.email ?? undefined })) : []}
          />
        </div>
      </Suspense>
    </div>
  )
}

export default page
