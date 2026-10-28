"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import DateColumn from "@/components/DataTableColumns/DateColumn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import SortableColumn from "@/components/DataTableColumns/SortableColumn";

type RoleTableRow = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date | string;
};

function RoleRowActions({ id, name }: { id: string; name: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-[var(--dash-text-soft)] hover:bg-[rgba(73,198,229,0.14)] hover:text-[var(--dash-text)]"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open actions for role {name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Role actions</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/settings/roles/update/${id}`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit role
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
    header: ({ column }) => <SortableColumn column={column} title="Role Title" />,
  },
  {
    accessorKey: "description",
    header: ({ column }) => <SortableColumn column={column} title="Description" />,
  },

  {
    accessorKey: "createdAt",
    header: "Date Created",
    cell: ({ row }) => <DateColumn row={row} accessorKey="createdAt" />,
  },
  {
    id: "actions",
    header: "",
    enableHiding: false,
    cell: ({ row }) => {
      const role = row.original;

      return (
        <div className="flex justify-end">
          <RoleRowActions id={role.id} name={role.name} />
        </div>
      );
    },
  },
];
