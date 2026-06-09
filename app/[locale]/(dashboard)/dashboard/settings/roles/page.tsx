import getOrgRoles from "@/actions/roles/getOrgRoles";
import DataTable from "@/components/DataTableComponents/DataTable";
import TableHeader from "@/components/dashboard/Tables/TableHeader";
import { getAuthenticatedUser } from "@/config/useAuth";
import { localizePath, pickLocale } from "@/i18n/routing";
import { columns } from "./columns";

const page = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale: rawLocale } = await params;
  const locale = pickLocale(rawLocale);

  const user = await getAuthenticatedUser()
  const organizationId = user?.organizationId ?? ""
  const res = await getOrgRoles(organizationId);
  const roles = res.data || [];
  return (
    <div>
      <TableHeader
        title="Roles"
        model="role"
        linkTitle="Add Role"
        href={localizePath("/dashboard/settings/roles/new", locale)}
        data={roles}
        showImport={false}
      />
      {/* <CustomDataTable categories={categories} /> */}
      <DataTable
        columns={columns}
        data={roles}
        searchPlaceholder="Search roles or permissions"
        variant="landing"
      />
    </div>
  );
}
export default page
