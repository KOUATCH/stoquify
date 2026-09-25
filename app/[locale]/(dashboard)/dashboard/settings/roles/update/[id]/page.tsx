import RoleForm from "@/components/Forms/RoleForm";
import { requirePermission } from "@/lib/security/rbac";
import { routeByKey, withSettingsSurfaceAccess } from "../../../settings-route-access"

async function pageImpl({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePermission("roles.update");

  const id = (await params).id;
  return <div className="dashboard-landing-theme min-h-screen overflow-x-hidden"><RoleForm editingId={id} organizationId={ctx.orgId} actorId={ctx.userId} /></div>;
}



export default async function SettingsRoutePage(props: any = {}) {
  const surface = routeByKey("settings-roles-update")

  if (!surface) {
    throw new Error("Missing settings route surface definition: settings-roles-update")
  }

  return withSettingsSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => pageImpl(props),
  })
}
