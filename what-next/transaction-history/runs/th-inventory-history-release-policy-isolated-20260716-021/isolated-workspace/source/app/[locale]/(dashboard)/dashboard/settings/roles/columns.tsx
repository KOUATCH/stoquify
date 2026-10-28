"use client";

import { Checkbox } from "@/components/ui/checkbox";

import DateColumn from "@/components/DataTableColumns/DateColumn";

import { ColumnDef } from "@tanstack/react-table";

import ActionColumn from "@/components/DataTableColumns/ActionColumn";
import SortableColumn from "@/components/DataTableColumns/SortableColumn";

type RoleTableRow = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date | string;
};

export const columns: ColumnDef<RoleTableRow>[] = [
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
    header: ({ column }) => (
      <SortableColumn column={column} title="Role Title" />
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <SortableColumn column={column} title="Description" />
    ),
  },

  {
    accessorKey: "createdAt",
    header: "Date Created",
    cell: ({ row }) => <DateColumn row={row} accessorKey="createdAt" />,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const role = row.original;
      return (
        <ActionColumn
          row={row}
          model="role"
          editEndpoint={`roles/update/${role.id}`}
          id={role.id}
        />
      );
    },
  },
];
