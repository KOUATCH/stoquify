"use client";

import { notify } from "@/lib/notifications/notify"
import createRole from "@/actions/roles/createRole";
import { updateRole } from "@/actions/roles/updateRole";
import { Card, CardContent } from "@/components/ui/card";
import { permissions } from "@/lib/permissions";
import { RoleFormData } from "@/types/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { CustomCheckbox } from "../FormInputs/CustomCheckbox";
import TextInput from "../FormInputs/TextInput";
import FormFooter from "./FormFooter";
import FormHeader from "./FormHeader";

type RoleFormInitialData = {
  nameEn?: string | null;
  nameFr?: string | null;
  description?: string | null;
  permissions?: string[] | null;
  organizationId?: string | null;
};

type RoleFormProps = {
  editingId?: string;
  initialData?: RoleFormInitialData | null;
};
const RoleForm = ({ editingId, initialData }: RoleFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RoleFormData>({
    defaultValues: {
      name: initialData?.nameEn || initialData?.nameFr || "",
      description: initialData?.description || "",
      permissions: initialData?.permissions || [],
      organizationId: initialData?.organizationId || ""
    },
  });

  async function saveRole(data: RoleFormData) {
    try {
      setLoading(true);
      const result = editingId
        ? await updateRole(editingId, data)
        : await createRole(data);

      if (!result.success) {
        notify.error(result?.error);
        return;
      }

      notify.success(
        editingId ? "Role updated successfully!" : "Role created successfully!"
      );
      router.push("/dashboard/settings/roles");
      router.refresh();
    } catch (error) {
      notify.error("Something went wrong!", { description: "The role could not be created" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }
  const handleModulePermissionChange = (
    moduleName: string,
    checked: boolean
  ) => {
    const currentPermissions = new Set(watch("permissions") || []);
    const modulePermissions = permissions.find(
      (p) => p.name === moduleName
    )?.permissions;
    if (!modulePermissions) return;
    Object.values(modulePermissions).forEach((permission) => {
      if (checked) {
        currentPermissions.add(permission);
      } else {
        currentPermissions.delete(permission);
      }
    });

    setValue("permissions", Array.from(currentPermissions));
  };

  return (
    <form onSubmit={handleSubmit(saveRole)} className="h-full">
      <FormHeader
        href="/roles"
        title="Role"
        parent="users"
        editingId={editingId}
        loading={loading}
      />

      <div className="max-w-4xl mx-auto space-y-6 py-8">
        {/* Basic Role Information */}
        <Card>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-3 pt-4 grid-cols-1 md:grid-cols-2">
                <TextInput
                  register={register}
                  errors={errors}
                  label="Role Name"
                  name="name"
                />
                <TextInput
                  register={register}
                  errors={errors}
                  label="Role Description"
                  name="description"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Section */}
        <Card>
          <CardContent>
            <h2 className="text-xl font-medium mt-6 mb-6">
              Select the Permissions the User will have access to.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {permissions.map((module) => (
                <div
                  key={module.name}
                  className="border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between ">
                      <span className="text-base font-medium">
                        {module.display}
                      </span>
                      <CustomCheckbox
                        onChange={(e) =>
                          handleModulePermissionChange(
                            module.name,
                            e.target.checked
                          )
                        }
                      />
                    </div>
                    <div className="ml-2">
                      {Object.entries(module.permissions).map(
                        ([action, permission]) => (
                          <div key={permission} className="flex items-center">
                            <CustomCheckbox
                              id={permission}
                              {...register(`permissions`)}
                              value={permission}
                              label={action}
                              defaultChecked={initialData?.permissions?.includes(
                                permission
                              )}
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <FormFooter
        href="/roles"
        editingId={editingId}
        loading={loading}
        title="Role"
        parent="users"
      />
    </form>
  );
}

export default RoleForm
