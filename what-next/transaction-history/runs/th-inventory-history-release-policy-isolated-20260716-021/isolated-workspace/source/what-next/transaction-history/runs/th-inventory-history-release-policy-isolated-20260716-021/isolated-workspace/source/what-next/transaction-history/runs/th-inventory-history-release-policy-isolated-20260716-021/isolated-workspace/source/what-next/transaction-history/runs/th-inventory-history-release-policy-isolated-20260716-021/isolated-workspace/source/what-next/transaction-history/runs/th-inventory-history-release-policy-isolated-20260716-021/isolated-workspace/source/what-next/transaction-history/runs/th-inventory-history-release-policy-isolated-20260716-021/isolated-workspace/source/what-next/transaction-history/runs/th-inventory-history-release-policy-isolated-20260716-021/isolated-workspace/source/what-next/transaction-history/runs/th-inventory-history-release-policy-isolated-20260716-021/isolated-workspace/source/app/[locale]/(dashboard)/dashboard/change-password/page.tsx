import { getUserById } from "@/actions/users/getUserById";
import ChangePasswordForm from "@/components/Forms/ChangePasswordForm";
import { checkPermission, getAuthenticatedUser } from "@/config/useAuth";

export default async function ChangePass() {
  await checkPermission("PASSWORD_READ");

  const user = await getAuthenticatedUser();
  const userDetails = await getUserById(user?.id ?? "");
  return (
    <div className="p-8">
      <ChangePasswordForm initialData={userDetails} editingId={user?.id} />
    </div>
  );
}
