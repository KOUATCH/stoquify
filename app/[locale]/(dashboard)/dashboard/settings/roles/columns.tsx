"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { Edit, MoreHorizontal } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import DataTable from "@/components/DataTableComponents/DataTable"
import SortableColumn from "@/components/DataTableColumns/SortableColumn"

type RoleTableRow = { id: string; name: string; nameEn?: string; nameFr?: string | null; description: string | null; createdAt: Date | string }
const copy = {
  en: { actions: "Role actions", open: "Open actions for role", edit: "Edit role", selectAll: "Select all roles on this page", select: "Select role", title: "Role title", description: "Description", created: "Created (UTC)", search: "Search role names or descriptions" },
  fr: { actions: "Actions du rôle", open: "Ouvrir les actions du rôle", edit: "Modifier le rôle", selectAll: "Sélectionner les rôles de cette page", select: "Sélectionner le rôle", title: "Nom du rôle", description: "Description", created: "Créé le (UTC)", search: "Rechercher un nom ou une description de rôle" },
} as const
const displayName = (role: RoleTableRow, locale: "en" | "fr") => locale === "fr" ? role.nameFr || role.nameEn || role.name : role.nameEn || role.name || role.nameFr || ""

function RoleRowActions({ role, locale }: { role: RoleTableRow; locale: "en" | "fr" }) {
  const t = copy[locale]
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]">
      <MoreHorizontal className="h-4 w-4" aria-hidden /><span className="sr-only">{t.open} {displayName(role, locale)}</span>
    </Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-52">
      <DropdownMenuLabel>{t.actions}</DropdownMenuLabel>
      <DropdownMenuItem asChild><Link href={"/" + locale + "/dashboard/settings/roles/update/" + role.id}><Edit className="mr-2 h-4 w-4" aria-hidden />{t.edit}</Link></DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
}

export function RoleTable({ data, locale, canUpdate }: { data: RoleTableRow[]; locale: "en" | "fr"; canUpdate: boolean }) {
  const [interactive, setInteractive] = useState(false)
  useEffect(() => setInteractive(true), [])
  const columns = useMemo<ColumnDef<RoleTableRow>[]>(() => {
    const t = copy[locale]
    const definitions: ColumnDef<RoleTableRow>[] = [
      { id: "select", header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")} onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)} aria-label={t.selectAll} />,
        cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={value => row.toggleSelected(!!value)} aria-label={t.select + " " + displayName(row.original, locale)} />, enableSorting: false, enableHiding: false },
      { id: "name", accessorFn: row => displayName(row, locale), header: ({ column }) => <SortableColumn column={column} title={t.title} /> },
      { accessorKey: "description", header: ({ column }) => <SortableColumn column={column} title={t.description} /> },
      { accessorKey: "createdAt", header: t.created, cell: ({ row }) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(row.original.createdAt)) },
    ]
    if (canUpdate) definitions.push({ id: "actions", header: "", enableHiding: false, cell: ({ row }) => <div className="flex justify-end"><RoleRowActions role={row.original} locale={locale} /></div> })
    return definitions
  }, [locale, canUpdate])
  return <fieldset disabled={!interactive} aria-busy={!interactive} className="min-w-0">
    <legend className="sr-only">{locale === "fr" ? "Catalogue des rôles" : "Role catalogue"}</legend>
    <DataTable columns={columns} data={data} locale={locale} searchPlaceholder={copy[locale].search} variant="landing" />
  </fieldset>
}
