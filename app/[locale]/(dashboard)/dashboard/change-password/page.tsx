import { routeByKey, withChangePasswordSurfaceAccess } from "./change-password-route-access"

import ChangePasswordForm from "@/components/Forms/ChangePasswordForm"

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
    onAllowed: async (context) => {
      return (
        <div className="dashboard-landing-theme dark min-h-screen overflow-x-hidden">
          <div className="dashboard-landing-content p-4 sm:p-6 lg:p-8">
            <ChangePasswordForm editingId={context.userId} />
          </div>
        </div>
      )
    },
  })
}
