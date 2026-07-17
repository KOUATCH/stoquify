import { Skeleton } from "@/components/ui/skeleton"

export default function PurchaseOrdersLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}
