import RoleForm from "@/components/Forms/RoleForm";
import { requirePermission } from "@/lib/security/rbac";
import { routeByKey, withSettingsSurfaceAccess } from "../../settings-route-access"

async function pageImpl() {
  const ctx = await requirePermission("roles.create");

  return <div className="dashboard-landing-theme min-h-screen overflow-x-hidden"><RoleForm organizationId={ctx.orgId} actorId={ctx.userId} /></div>;
}



export default async function SettingsRoutePage(props: any = {}) {
  const surface = routeByKey("settings-roles-new")

  if (!surface) {
    throw new Error("Missing settings route surface definition: settings-roles-new")
  }

  return withSettingsSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => pageImpl(),
  })
}
