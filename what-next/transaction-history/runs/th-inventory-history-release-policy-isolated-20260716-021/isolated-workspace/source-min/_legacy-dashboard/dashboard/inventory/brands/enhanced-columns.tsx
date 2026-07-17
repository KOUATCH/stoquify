"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Archive, Copy, Edit, Eye, MoreHorizontal, Package } from "lucide-react"
import Link from "next/link"

import SortableColumn from "@/components/DataTableColumns/SortableColumn"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { BrandDTO } from "@/types/brand"

export type EnhancedBrand = BrandDTO

type BrandColumnOptions = {
  onArchive: (brand: BrandDTO) => void
  basePath?: string
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function createEnhancedBrandsColumns({
  onArchive,
  basePath = "/dashboard/inventory/brands",
}: BrandColumnOptions): ColumnDef<EnhancedBrand>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all brands"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={`Select ${row.original.nameEn}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "nameEn",
      header: ({ column }) => <SortableColumn column={column} title="Brand" />,
      cell: ({ row }) => {
        const brand = row.original

        return (
          <div className="flex min-w-[220px] items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted text-sm font-semibold text-muted-foreground">
              {getInitials(brand.nameEn)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{brand.nameEn}</p>
              <p className="truncate text-xs text-muted-foreground">{brand.nameFr || "No French name"}</p>
            </div>
          </div>
        )
      },
      filterFn: (row, _id, value) => {
        const searchValue = String(value).toLowerCase()
        const brand = row.original
        return [brand.nameEn, brand.nameFr, brand.slug, brand.descriptionEn, brand.descriptionFr]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(searchValue))
      },
    },
    {
      accessorKey: "slug",
      header: ({ column }) => <SortableColumn column={column} title="Slug" />,
      cell: ({ row }) => (
        <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
          {row.original.slug}
        </code>
      ),
    },
    {
      accessorKey: "itemCount",
      header: ({ column }) => <SortableColumn column={column} title="Items" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span>{row.original.itemCount ?? 0}</span>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => <SortableColumn column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "secondary" : "outline"}>
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
        <div className="text-sm text-muted-foreground">{formatDate(row.original.updatedAt)}</div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableColumn column={column} title="Created" />,
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const brand = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open brand actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(brand.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`${basePath}/${brand.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${basePath}/${brand.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Brand
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${basePath}/${brand.id}/products`}>
                  <Package className="mr-2 h-4 w-4" />
                  View Items
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onArchive(brand)}>
                <Archive className="mr-2 h-4 w-4" />
                Archive Brand
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}

export const enhancedBrandsColumns: ColumnDef<EnhancedBrand>[] = createEnhancedBrandsColumns({
  onArchive: () => undefined,
})
