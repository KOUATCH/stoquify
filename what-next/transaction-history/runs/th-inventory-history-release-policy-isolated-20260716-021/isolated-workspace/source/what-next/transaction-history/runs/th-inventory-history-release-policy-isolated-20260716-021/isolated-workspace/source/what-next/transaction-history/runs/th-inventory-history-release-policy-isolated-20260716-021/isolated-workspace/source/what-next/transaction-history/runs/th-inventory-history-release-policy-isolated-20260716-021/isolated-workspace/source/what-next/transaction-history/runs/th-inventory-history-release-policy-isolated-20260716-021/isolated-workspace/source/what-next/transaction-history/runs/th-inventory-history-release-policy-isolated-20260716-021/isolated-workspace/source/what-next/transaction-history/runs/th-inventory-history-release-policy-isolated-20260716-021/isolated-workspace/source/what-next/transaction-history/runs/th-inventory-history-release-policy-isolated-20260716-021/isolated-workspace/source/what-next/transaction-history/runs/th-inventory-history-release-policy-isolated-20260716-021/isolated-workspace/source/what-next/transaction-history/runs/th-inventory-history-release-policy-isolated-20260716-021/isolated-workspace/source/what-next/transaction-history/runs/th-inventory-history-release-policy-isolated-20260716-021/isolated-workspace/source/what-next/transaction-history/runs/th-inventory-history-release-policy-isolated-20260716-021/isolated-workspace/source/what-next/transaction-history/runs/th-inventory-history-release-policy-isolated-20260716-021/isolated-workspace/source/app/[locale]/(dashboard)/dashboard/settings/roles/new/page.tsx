import RoleForm from "@/components/Forms/RoleForm";
import { checkPermission } from "@/config/useAuth";

export default async function page() {
  await checkPermission("roles.create");

  return <RoleForm />;
}
