import { routeByKey, withChangePasswordSurfaceAccess } from "./change-password-route-access"

import { getUserById } from "@/actions/users/getUserById"
import ChangePasswordForm from "@/components/Forms/ChangePasswordForm"
import { getAuthenticatedUser } from "@/config/useAuth"

export default async function ChangePass({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const surface = routeByKey("change-password")

  if (!surface) {
    throw new Error("Missing change-password route surface definition: change-password")
  }

  return withChangePasswordSurfaceAccess({
    params,
    surface,
    onAllowed: async () => {
      const user = await getAuthenticatedUser()
      const userDetails = await getUserById(user?.id ?? "")
      return (
        <div className="p-8">
          <ChangePasswordForm initialData={userDetails} editingId={user?.id} />
        </div>
      )
    },
  })
}
