import { getRoleById } from "@/actions/roles/getRoleById";
import NotFound from "@/app/not-found";
import RoleForm from "@/components/Forms/RoleForm";
import { checkPermission } from "@/config/useAuth";

export default async function page({
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
