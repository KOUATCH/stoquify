"use client";

import { Checkbox } from "@/components/ui/checkbox";

import { deleteUser } from "@/actions/users/deleteUser";
import DateColumn from "@/components/DataTableColumns/DateColumn";
import NewActionColumn from "@/components/DataTableColumns/NewActionColumn";
import SortableColumn from "@/components/DataTableColumns/SortableColumn";
import type { SafeUser } from "@/lib/security/server-authz";
import { ColumnDef } from "@tanstack/react-table";

export type UserTableRow = SafeUser & {
  name: string;
  roleNames: string;
};

export const columns: ColumnDef<UserTableRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableColumn column={column} title="Name" />,
  },
  {
    accessorKey: "email",
    header: ({ column }) => <SortableColumn column={column} title="Email" />,
  },
  {
    accessorKey: "roleNames",
    header: ({ column }) => <SortableColumn column={column} title="Roles" />,
  },
  {
    accessorKey: "createdAt",
    header: "Date Created",
    cell: ({ row }) => <DateColumn row={row} accessorKey="createdAt" />,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
        const handleDeleteUser = async () => {
          const res = await deleteUser(user.id);
          if (res?.data?.id) {
            window.location.reload();
          }
        };
      return (
        <NewActionColumn 
        modelName="user"
        editEndpoint={`/dashboard/settings/users/update/${user.id}`}
        onDelete={handleDeleteUser}
        />
      );
    },
  },
];
