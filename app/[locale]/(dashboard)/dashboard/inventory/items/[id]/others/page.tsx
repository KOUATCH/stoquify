
import { checkPermission } from "@/config/useAuth"

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  await checkPermission("inventory.items.read")


  const id = (await params)?.id
  return (

    <div> These are the suppliers for the item - {id}</div>
  )
}

export default page