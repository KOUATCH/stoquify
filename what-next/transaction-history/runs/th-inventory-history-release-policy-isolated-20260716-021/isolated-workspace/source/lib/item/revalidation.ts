import { revalidatePath, revalidateTag } from 'next/cache'

export function revalidateItem(id: string, organizationId: string) {
  revalidateTag("items")
  revalidateTag(`item-${id}`)
  revalidateTag(`org-${organizationId}-items`)
  revalidatePath("/dashboard/inventory/items")
  revalidatePath(`/dashboard/inventory/items/${id}`)
}
