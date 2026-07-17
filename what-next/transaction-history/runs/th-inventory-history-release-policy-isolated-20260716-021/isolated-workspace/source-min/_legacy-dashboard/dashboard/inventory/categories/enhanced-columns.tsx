"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Archive, Copy, Edit, Eye, FolderOpen, MoreHorizontal, Package } from "lucide-react"
import Link from "next/link"

import SortableColumn from "@/components/DataTableColumns/SortableColumn"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CategoryDTO } from "@/types/category"

export type EnhancedCategory = CategoryDTO

type CategoryColumnOptions = {
  onArchive: (category: CategoryDTO) => void
  basePath?: string
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

export function createEnhancedCategoriesColumns({
  onArchive,
  basePath = "/dashboard/inventory/categories",
}: CategoryColumnOptions): ColumnDef<EnhancedCategory>[] {
  const itemsPath = basePath.includes("/dashboard/")
    ? `${basePath.split("/dashboard/")[0]}/dashboard/inventory/items`
    : "/dashboard/inventory/items"

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all categories"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={`Select ${row.original.titleEn}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "titleEn",
      header: ({ column }) => <SortableColumn column={column} title="Category" />,
      cell: ({ row }) => {
        const category = row.original

        return (
          <div className="flex min-w-[240px] items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-brand-soft)] bg-cover bg-center text-[var(--dash-brand-strong)]"
              style={category.imageUrl ? { backgroundImage: `url("${category.imageUrl}")` } : undefined}
            >
              {category.imageUrl ? <span className="sr-only">{category.titleEn}</span> : (
                <FolderOpen className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--dash-text)]">{category.titleEn}</p>
              <p className="truncate text-xs text-[var(--dash-text-faint)]">{category.titleFr || "No French title"}</p>
            </div>
          </div>
        )
      },
      filterFn: (row, _id, value) => {
        const searchValue = String(value).toLowerCase()
        const category = row.original
        return [
          category.titleEn,
          category.titleFr,
          category.slug,
          category.descriptionEn,
          category.descriptionFr,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(searchValue))
      },
    },
    {
      accessorKey: "slug",
      header: ({ column }) => <SortableColumn column={column} title="Slug" />,
      cell: ({ row }) => (
        <code className="rounded-lg border border-[var(--dash-border-subtle)] bg-[rgba(24,38,45,0.72)] px-2 py-1 text-xs text-[var(--dash-text-soft)]">
          {row.original.slug}
        </code>
      ),
    },
    {
      accessorKey: "itemCount",
      header: ({ column }) => <SortableColumn column={column} title="Items" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm text-[var(--dash-text-muted)]">
          <Package className="h-4 w-4 text-[var(--dash-info)]" />
          <span>{row.original.itemCount ?? 0}</span>
        </div>
      ),
    },
    {
      accessorKey: "parentId",
      header: ({ column }) => <SortableColumn column={column} title="Hierarchy" />,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            "rounded-lg",
            row.original.parentId
              ? "border-[var(--dash-info)] bg-[var(--dash-info-soft)] text-[var(--dash-info)]"
              : "border-[var(--dash-gold)] bg-[var(--dash-gold-soft)] text-[var(--dash-gold)]",
          )}
        >
          {row.original.parentId ? "Child" : "Root"}
        </Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => <SortableColumn column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            "rounded-lg",
            row.original.isActive
              ? "border-[var(--dash-success)] bg-[var(--dash-success-soft)] text-[var(--dash-success)]"
              : "border-[var(--dash-border-subtle)] bg-[rgba(126,145,137,0.14)] text-[var(--dash-text-soft)]",
          )}
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
      filterFn: (row, _id, value) => {
        if (!value || value === "all") return true
        return value === "active" ? row.original.isActive : !row.original.isActive
      },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => <SortableColumn column={column} title="Updated" />,
      cell: ({ row }) => (
        <div className="text-sm text-[var(--dash-text-soft)]">{formatDate(row.original.updatedAt)}</div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableColumn column={column} title="Created" />,
      cell: ({ row }) => (
        <div className="text-sm text-[var(--dash-text-soft)]">{formatDate(row.original.createdAt)}</div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const category = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-brand-strong)]">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open category actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(category.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`${basePath}/${category.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${basePath}/${category.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Category
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${itemsPath}?category=${category.id}`}>
                  <Package className="mr-2 h-4 w-4" />
                  View Items
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onArchive(category)}>
                <Archive className="mr-2 h-4 w-4" />
                Archive Category
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

export const enhancedCategoriesColumns: ColumnDef<EnhancedCategory>[] = createEnhancedCategoriesColumns({
  onArchive: () => undefined,
})
