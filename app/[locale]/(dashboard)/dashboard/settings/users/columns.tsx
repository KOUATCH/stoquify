"use client";

import { Checkbox } from "@/components/ui/checkbox";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { userDirectoryCopy } from "@/components/settings/user-directory-copy";
import SortableColumn from "@/components/DataTableColumns/SortableColumn";
import type { SafeUser } from "@/lib/security/server-authz";
import { ColumnDef } from "@tanstack/react-table";

export type UserTableRow = SafeUser & {
  name: string;
  roleNames: string;
};

export function getUserColumns(locale: "en" | "fr", actorId: string, canDeactivate: boolean, onReview: (user: UserTableRow, trigger: HTMLButtonElement) => void): ColumnDef<UserTableRow>[] {
 const t = userDirectoryCopy[locale];
 return [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label={t.selectAll}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={`${t.selectRow} ${row.original.name}`}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableColumn column={column} title={t.name} />,
  },
  {
    accessorKey: "email",
    header: ({ column }) => <SortableColumn column={column} title={t.email} />,
  },
  {
    accessorKey: "roleNames",
    header: ({ column }) => <SortableColumn column={column} title={t.roles} />,
  },
  {
    accessorKey: "createdAt",
    header: t.created,
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(locale, { timeZone: "UTC" }),
  },
  {
    accessorKey: "isActive", header: t.status,
    cell: ({ row }) => <span>{row.original.isActive ? t.active : t.inactive}</span>,
  },
  {
    id: "actions",
    header: t.actions,
    cell: ({ row }) => {
      const user = row.original;
      return <div className="flex flex-wrap items-center gap-2">
        <Link className="rounded text-sm text-[var(--dash-brand)] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" href={`/${locale}/dashboard/settings/users/update/${encodeURIComponent(user.id)}`} aria-label={`${locale === "fr" ? "Accès du membre" : "Member access"} ${user.name}`}>{locale === "fr" ? "Accès du membre" : "Member access"}</Link>
        {user.id === actorId ? <span className="text-xs">{t.self}</span> : user.isActive && canDeactivate ? <Button type="button" variant="outline" className="h-auto whitespace-normal text-[var(--dash-danger)]" aria-label={`${t.deactivate} ${user.name}`} onClick={event => onReview(user, event.currentTarget)}>{t.deactivate}</Button> : null}
      </div>;
    },
  },
];
}
