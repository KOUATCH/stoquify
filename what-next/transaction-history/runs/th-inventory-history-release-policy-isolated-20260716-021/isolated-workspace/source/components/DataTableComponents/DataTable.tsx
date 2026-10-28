"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import * as React from "react";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, ListFilter, Plus, RefreshCw } from "lucide-react";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableViewOptions } from "./DataTableViewOptions";
import DateFilters from "./DateFilters";
import DateRangeFilter from "./DateRangeFilter";
import SearchBar from "./SearchBar";

export interface Column<TData> {
  header: string;
  accessorKey: keyof TData | ((row: TData) => unknown);
  cell?: (row: TData) => ReactNode;
}

interface LegacyTableActions<TData> {
  onAdd?: () => void;
  onEdit?: (item: TData) => void;
  onDelete?: (item: TData) => void;
  onExport?: (filteredData: TData[]) => void;
}

interface LegacyTableFilters<TData> {
  searchFields?: (keyof TData)[];
  enableDateFilter?: boolean;
  getItemDate?: (item: TData) => Date | string;
  additionalFilters?: ReactNode;
}

interface DataTableProps<TData> {
  columns: ColumnDef<any, any>[] | Column<any>[];
  data: TData[];
  model?: string;
  title?: string;
  subtitle?: string;
  keyField?: keyof TData;
  isLoading?: boolean;
  emptyMessage?: string;
  searchKey?: keyof TData | string;
  searchPlaceholder?: string;
  showSearch?: boolean;
  showDateFilters?: boolean;
  showToolbar?: boolean;
  variant?: "default" | "landing";
  onRefresh?: () => void;
  actions?: LegacyTableActions<TData>;
  filters?: LegacyTableFilters<TData>;
  renderRowActions?: (item: TData) => ReactNode;
  emptyState?: ReactNode;
}

function getAccessorId<TData>(accessor: Column<TData>["accessorKey"], index: number) {
  return typeof accessor === "function" ? `computed_${index}` : String(accessor);
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
}

function getRowIdentity<TData>(item: TData, keyField?: keyof TData) {
  if (item && typeof item === "object") {
    if (keyField) {
      const value = (item as Record<PropertyKey, unknown>)[keyField as PropertyKey];
      if (value !== null && value !== undefined) return value;
    }

    if ("id" in item) {
      const value = (item as { id?: unknown }).id;
      if (value !== null && value !== undefined) return value;
    }
  }

  return item;
}

function intersectRows<TData>(primary: TData[], secondary: TData[], keyField?: keyof TData) {
  const secondaryKeys = new Set(secondary.map((item) => getRowIdentity(item, keyField)));

  return primary.filter((item) => secondaryKeys.has(getRowIdentity(item, keyField)));
}

function createLegacyColumnDefs<TData>(
  columns: Column<TData>[],
  renderRowActions?: (item: TData) => ReactNode
): ColumnDef<TData, unknown>[] {
  const tableColumns: ColumnDef<TData, unknown>[] = columns.map((column, index) => {
    const accessor = column.accessorKey;

    return {
      id: getAccessorId(accessor, index),
      header: column.header,
      accessorFn: (row) => (typeof accessor === "function" ? accessor(row) : row[accessor]),
      cell: ({ row, getValue }) => (column.cell ? column.cell(row.original) : formatCellValue(getValue())),
    };
  });

  if (renderRowActions) {
    tableColumns.push({
      id: "__row_actions",
      header: "Actions",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          {renderRowActions(row.original)}
        </div>
      ),
    });
  }

  return tableColumns;
}

export default function DataTable<TData>({
  columns,
  data,
  title,
  subtitle,
  keyField,
  isLoading = false,
  emptyMessage = "No results.",
  searchKey,
  searchPlaceholder,
  showSearch = true,
  showDateFilters = true,
  showToolbar = true,
  variant = "default",
  onRefresh,
  actions,
  filters,
  renderRowActions,
  emptyState,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [searchResults, setSearchResults] = useState(data);
  const [dateFilteredData, setDateFilteredData] = useState(data);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const isLanding = variant === "landing";
  const isLegacyShape = Boolean(title || subtitle || keyField || actions || renderRowActions || emptyState);
  const hasTableControls = showSearch || showDateFilters || showToolbar || Boolean(filters?.additionalFilters);
  const resolvedSearchPlaceholder =
    searchPlaceholder ?? (searchKey ? `Search by ${String(searchKey)}...` : "Search table data...");

  const tableColumns = React.useMemo(
    () =>
      isLegacyShape
        ? createLegacyColumnDefs(columns as Column<TData>[], renderRowActions)
        : (columns as ColumnDef<TData, any>[]),
    [columns, isLegacyShape, renderRowActions]
  );

  React.useEffect(() => {
    setSearchResults(data);
    setDateFilteredData(data);
    setIsSearchActive(false);
    setIsDateFilterActive(false);
  }, [data]);

  const tableData = React.useMemo(() => {
    if (isSearchActive && isDateFilterActive) {
      return intersectRows(searchResults, dateFilteredData, keyField);
    }

    if (isSearchActive) return searchResults;
    if (isDateFilterActive) return dateFilteredData;
    return data;
  }, [data, dateFilteredData, isDateFilterActive, isSearchActive, keyField, searchResults]);

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const visibleData = table.getFilteredRowModel().rows.map((row) => row.original);
  const hasHeader = Boolean(title || subtitle || onRefresh || actions?.onExport || actions?.onAdd);

  return (
    <div className={cn("w-full min-w-0", isLanding ? "dashboard-data-table space-y-3" : "space-y-3")}>
      {hasHeader ? (
        <div
          className={cn(
            "flex min-w-0 flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between",
            isLanding
              ? "border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/70 text-[var(--dash-text)]"
              : "bg-background"
          )}
        >
          <div className="min-w-0">
            {title ? <h3 className="truncate text-base font-semibold">{title}</h3> : null}
            {subtitle ? <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {onRefresh ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className={cn("h-9 rounded-lg", isLanding && "dashboard-button-secondary")}
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                Refresh
              </Button>
            ) : null}
            {actions?.onExport ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => actions.onExport?.(visibleData)}
                className={cn("h-9 rounded-lg", isLanding && "dashboard-button-secondary")}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            ) : null}
            {actions?.onAdd ? (
              <Button
                type="button"
                size="sm"
                onClick={actions.onAdd}
                className={cn("h-9 rounded-lg", isLanding && "dashboard-button-create")}
              >
                <Plus className="h-4 w-4" />
                Add New
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasTableControls ? (
        <div
          className={cn(
            "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
            isLanding && "rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/70 p-3"
          )}
        >
          {showSearch ? (
            <div className="w-full min-w-0 flex-1 lg:min-w-[18rem]">
              <SearchBar
                data={data}
                onSearch={setSearchResults}
                setIsSearchActive={setIsSearchActive}
                placeholder={resolvedSearchPlaceholder}
                variant={variant}
              />
            </div>
          ) : null}
          {(showDateFilters || showToolbar || filters?.additionalFilters) ? (
            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
              {showDateFilters ? (
                <>
                  <DateRangeFilter
                    data={data}
                    onFilter={setDateFilteredData}
                    setIsDateFilterActive={setIsDateFilterActive}
                    variant={variant}
                  />
                  <DateFilters
                    data={data}
                    onFilter={setDateFilteredData}
                    setIsDateFilterActive={setIsDateFilterActive}
                    variant={variant}
                  />
                </>
              ) : null}
              {filters?.additionalFilters}
              {showToolbar ? (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("h-8 gap-1", isLanding && "dashboard-button-secondary rounded-lg")}
                      >
                        <ListFilter className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                          Filter
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem checked>
                        Active
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem>Draft</DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem>Archived</DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DataTableViewOptions table={table} />
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={cn("min-w-0 rounded-md border", isLanding && "dashboard-table-shell border-0")}>
        <div className="relative w-full overflow-x-auto">
          {isLoading ? (
            <div className="absolute inset-0 z-10 flex min-h-24 items-center justify-center bg-background/70 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading data...
              </div>
            </div>
          ) : null}
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(isLanding && "px-3")}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    className={cn(
                      isLanding
                        ? "hover:bg-[rgba(47,125,246,0.085)] data-[state=selected]:bg-[var(--dash-brand-soft)]"
                        : "hover:bg-muted/70",
                    )}
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={cn(isLanding && "px-3 py-3")}>
                        {cell.getIsAggregated()
                          ? flexRender(cell.column.columnDef.aggregatedCell, cell.getContext())
                          : flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={tableColumns.length}
                    className={cn("h-24 text-center", isLanding && "text-[var(--dash-text-soft)]")}
                  >
                    {emptyState || emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

            <TableFooter>
              {table.getFooterGroups().map((footerGroup) => (
                <TableRow key={footerGroup.id}>
                  {footerGroup.headers.map((footer) => (
                    <TableHead key={footer.id} colSpan={footer.colSpan}>
                      {footer.isPlaceholder
                        ? null
                        : flexRender(footer.column.columnDef.footer, footer.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableFooter>
          </Table>
        </div>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
