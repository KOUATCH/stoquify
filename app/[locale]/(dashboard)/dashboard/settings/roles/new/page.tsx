import RoleForm from "@/components/Forms/RoleForm";
import { checkPermission } from "@/config/useAuth";
import { routeByKey, withSettingsSurfaceAccess } from "../../settings-route-access"

async function pageImpl() {
  await checkPermission("roles.create");

  return <RoleForm />;
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
