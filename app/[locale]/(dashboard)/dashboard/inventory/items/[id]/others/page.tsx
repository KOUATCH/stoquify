
import { checkPermission } from "@/config/useAuth"
import { routeByKey, withInventorySurfaceAccess } from "../../../inventory-route-access"

const pageImpl = async ({ params }: { params: Promise<{ id: string }> }) => {
  await checkPermission("inventory.items.read")


  const id = (await params)?.id
  return (

    <div> These are the suppliers for the item - {id}</div>
  )
}



export default async function InventoryRoutePage(props: any = {}) {
  const surface = routeByKey("inventory-items-others")

  if (!surface) {
    throw new Error("Missing inventory route surface definition: inventory-items-others")
  }

  return withInventorySurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => pageImpl(props),
  })
}