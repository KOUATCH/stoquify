import { getRoleById } from "@/actions/roles/getRoleById";
import NotFound from "@/app/not-found";
import RoleForm from "@/components/Forms/RoleForm";
import { checkPermission } from "@/config/useAuth";
import { routeByKey, withSettingsSurfaceAccess } from "../../../settings-route-access"

async function pageImpl({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await checkPermission("roles.update");

  const id = (await params).id;
  const { data } = await getRoleById(id);
  if (!id || !data) {
    return NotFound();
  }
  return <RoleForm editingId={id} initialData={data} />;
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
