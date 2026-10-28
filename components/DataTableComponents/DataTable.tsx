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
import { ArrowDown, ArrowUp, ArrowUpDown, Download, FilterX, Plus, RefreshCw } from "lucide-react";
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

export type TableLocale = "en" | "fr";

export type TableCopy = {
  actions: string;
  addNew: string;
  allTime: string;
  clearFilters: string;
  clearSearch: string;
  dateRange: string;
  filter: string;
  firstPage: string;
  last7Days: string;
  lastPage: string;
  loading: string;
  nextPage: string;
  noResults: string;
  of: string;
  page: string;
  previousPage: string;
  refresh: string;
  rowsPerPage: string;
  search: string;
  searchBy: string;
  export: string;
  sortBy: string;
  sortedAscending: string;
  sortedDescending: string;
  sortedNone: string;
  selectedRowsLabel: string;
  tableFallback: string;
  thisMonth: string;
  thisYear: string;
  today: string;
  viewColumns: string;
  yesterday: string;
};

const DEFAULT_TABLE_COPY: Record<TableLocale, TableCopy> = {
  en: {
    actions: "Actions",
    addNew: "Add New",
    allTime: "All time",
    clearFilters: "Clear filters",
    clearSearch: "Clear table search",
    dateRange: "Date range",
    filter: "Filter",
    firstPage: "Go to first page",
    last7Days: "Last 7 days",
    lastPage: "Go to last page",
    loading: "Loading data...",
    nextPage: "Go to next page",
    export: "Export",
    noResults: "No results.",
    of: "of",
    page: "Page",
    previousPage: "Go to previous page",
    refresh: "Refresh",
    rowsPerPage: "Rows per page",
    search: "Search table data...",
    searchBy: "Search by",
    selectedRowsLabel: "row(s) selected.",
    sortBy: "Sort",
    sortedAscending: "sorted ascending",
    sortedDescending: "sorted descending",
    sortedNone: "not sorted",
    tableFallback: "Data table",
    thisMonth: "This month",
    thisYear: "This year",
    today: "Today",
    viewColumns: "View columns",
    yesterday: "Yesterday",
  },
  fr: {
    actions: "Actions",
    addNew: "Ajouter",
    allTime: "Toutes les dates",
    clearFilters: "Effacer les filtres",
    clearSearch: "Effacer la recherche",
    dateRange: "Période",
    filter: "Filtrer",
    firstPage: "Aller à la première page",
    last7Days: "7 derniers jours",
    lastPage: "Aller à la dernière page",
    loading: "Chargement...",
    nextPage: "Aller à la page suivante",
    export: "Exporter",
    noResults: "Aucun résultat.",
    of: "sur",
    page: "Page",
    previousPage: "Aller à la page précédente",
    refresh: "Actualiser",
    rowsPerPage: "Lignes par page",
    search: "Rechercher dans le tableau...",
    searchBy: "Rechercher par",
    selectedRowsLabel: "lignes sélectionnées.",
    sortBy: "Trier",
    sortedAscending: "tri croissant",
    sortedDescending: "tri décroissant",
    sortedNone: "non trié",
    tableFallback: "Tableau de données",
    thisMonth: "Ce mois-ci",
    thisYear: "Cette année",
    today: "Aujourd'hui",
    viewColumns: "Colonnes",
    yesterday: "Hier",
  },
};

function resolveTableCopy(locale: TableLocale, override?: Partial<TableCopy>) {
  return {
    ...DEFAULT_TABLE_COPY[locale],
    ...(override ?? {}),
  };
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
  searchContainerClassName?: string;
  singleRowControls?: boolean;
  showSearch?: boolean;
  showDateFilters?: boolean;
  showToolbar?: boolean;
  variant?: "default" | "landing";
  onRefresh?: () => void;
  onVisibleDataChange?: (visibleData: TData[]) => void;
  actions?: LegacyTableActions<TData>;
  filters?: LegacyTableFilters<TData>;
  renderRowActions?: (item: TData) => ReactNode;
  emptyState?: ReactNode;
  locale?: TableLocale;
  copy?: Partial<TableCopy>;
  caption?: string;
  showSelectionSummary?: boolean;
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
  renderRowActions?: (item: TData) => ReactNode,
  actionsLabel = "Actions"
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
      header: actionsLabel,
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
  emptyMessage,
  searchKey,
  searchPlaceholder,
  searchContainerClassName,
  singleRowControls = true,
  showSearch = true,
  showDateFilters = true,
  showToolbar = true,
  variant = "default",
  onRefresh,
  onVisibleDataChange,
  actions,
  filters,
  renderRowActions,
  emptyState,
  locale = "en",
  copy,
  caption,
  showSelectionSummary = true,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [searchResults, setSearchResults] = useState(data);
  const [dateFilteredData, setDateFilteredData] = useState(data);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const [filterResetKey, setFilterResetKey] = useState(0);
  const isLanding = variant === "landing";
  const isLegacyShape = Boolean(title || subtitle || keyField || actions || renderRowActions || emptyState);
  const hasTableControls = showSearch || showDateFilters || showToolbar || Boolean(filters?.additionalFilters);
  const tableCopy = resolveTableCopy(locale, copy);
  const resolvedSearchPlaceholder =
    searchPlaceholder ?? (searchKey ? `${tableCopy.searchBy} ${String(searchKey)}...` : tableCopy.search);
  const hasCaption = caption || title || subtitle || tableCopy.tableFallback;

  const tableColumns = React.useMemo(
    () =>
      isLegacyShape
        ? createLegacyColumnDefs(columns as Column<TData>[], renderRowActions, tableCopy.actions)
        : (columns as ColumnDef<TData, any>[]),
    [columns, isLegacyShape, renderRowActions, tableCopy.actions]
  );

  React.useEffect(() => {
    setSearchResults(data);
    setDateFilteredData(data);
    setIsSearchActive(false);
    setIsDateFilterActive(false);
    setFilterResetKey((key) => key + 1);
  }, [data]);

  const tableData = React.useMemo(() => {
    if (isSearchActive && isDateFilterActive) {
      return intersectRows(searchResults, dateFilteredData, keyField);
    }

    if (isSearchActive) return searchResults;
    if (isDateFilterActive) return dateFilteredData;
    return data;
  }, [data, dateFilteredData, isDateFilterActive, isSearchActive, keyField, searchResults]);

  React.useEffect(() => {
    onVisibleDataChange?.(tableData);
  }, [onVisibleDataChange, tableData]);

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
  const hasActiveTableFilters = isSearchActive || isDateFilterActive || columnFilters.length > 0;

  const clearTableFilters = () => {
    setSearchResults(data);
    setDateFilteredData(data);
    setIsSearchActive(false);
    setIsDateFilterActive(false);
    table.resetColumnFilters();
    table.setPageIndex(0);
    setFilterResetKey((key) => key + 1);
  };

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
                  {tableCopy.refresh}
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
                {tableCopy.export}
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
                {tableCopy.addNew}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasTableControls ? (
        <div
          className={cn(
            "dashboard-table-toolbar flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
            isLanding && "rounded-lg border border-[var(--dash-border-subtle)] bg-[var(--dash-surface)]/70 p-3",
            singleRowControls && "xl:flex-nowrap"
          )}
        >
          {showSearch ? (
            <div
              className={cn(
                "w-full min-w-0 flex-1",
                searchContainerClassName ?? (singleRowControls ? "xl:min-w-0" : "lg:min-w-[18rem]")
              )}
            >
              <SearchBar
                data={data}
                onSearch={setSearchResults}
                setIsSearchActive={setIsSearchActive}
                placeholder={resolvedSearchPlaceholder}
                clearButtonLabel={tableCopy.clearSearch}
                resetKey={filterResetKey}
                variant={variant}
              />
            </div>
          ) : null}
          {(showDateFilters || showToolbar || filters?.additionalFilters) ? (
            <div
              className={cn(
                "flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:flex-1 lg:justify-end",
                singleRowControls && "xl:flex-none xl:flex-nowrap"
              )}
            >
              {showDateFilters ? (
                <>
                  <DateRangeFilter
                    data={data}
                    onFilter={setDateFilteredData}
                    setIsDateFilterActive={setIsDateFilterActive}
                    locale={locale}
                    placeholder={tableCopy.dateRange}
                    resetKey={filterResetKey}
                    variant={variant}
                    className={singleRowControls ? "xl:w-36 xl:shrink-0 xl:[&_button]:w-36 xl:[&_button]:overflow-hidden xl:[&_button]:whitespace-nowrap" : undefined}
                  />
                  <DateFilters
                    data={data}
                    onFilter={setDateFilteredData}
                    setIsDateFilterActive={setIsDateFilterActive}
                    locale={locale}
                    label={tableCopy.filter}
                    copy={tableCopy}
                    resetKey={filterResetKey}
                    variant={variant}
                    className={singleRowControls ? "xl:w-28 xl:shrink-0" : undefined}
                  />
                </>
              ) : null}
              {filters?.additionalFilters}
              {hasActiveTableFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearTableFilters}
                  className={cn("h-9 rounded-lg", isLanding && "text-[var(--dash-text-soft)] hover:bg-[var(--dash-brand-soft)] hover:text-[var(--dash-text)]")}
                >
                  <FilterX className="h-4 w-4" aria-hidden="true" />
                  {tableCopy.clearFilters}
                </Button>
              ) : null}
              {showToolbar ? <DataTableViewOptions table={table} label={tableCopy.viewColumns} /> : null}
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
                {tableCopy.loading}
              </div>
            </div>
          ) : null}
          <Table>
            <caption className="sr-only">{hasCaption}</caption>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      aria-sort={
                        header.column.getCanSort()
                          ? header.column.getIsSorted() === "asc"
                            ? "ascending"
                            : header.column.getIsSorted() === "desc"
                              ? "descending"
                              : "none"
                          : undefined
                      }
                      className={cn(isLanding && "px-3")}
                    >
                      {header.isPlaceholder
                        ? null
                        : header.column.getCanSort() && typeof header.column.columnDef.header === "string"
                          ? (
                            <button
                              type="button"
                              onClick={() => header.column.toggleSorting(header.column.getIsSorted() === "asc")}
                              aria-label={`${tableCopy.sortBy} ${header.column.columnDef.header}, ${
                                header.column.getIsSorted() === "asc"
                                  ? tableCopy.sortedAscending
                                  : header.column.getIsSorted() === "desc"
                                    ? tableCopy.sortedDescending
                                    : tableCopy.sortedNone
                              }`}
                              className="inline-flex w-full items-center gap-2 text-left text-sm font-medium"
                            >
                              <span>{header.column.columnDef.header}</span>
                              {header.column.getIsSorted() === "asc" ? (
                                <ArrowUp className="h-3.5 w-3.5 text-[var(--dash-brand)]" aria-hidden="true" />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ArrowDown className="h-3.5 w-3.5 text-[var(--dash-brand)]" aria-hidden="true" />
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 text-[var(--dash-text-faint)]" aria-hidden="true" />
                              )}
                            </button>
                          )
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
                    {emptyState || emptyMessage || tableCopy.noResults}
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
      <DataTablePagination
        table={table}
        variant={variant}
        copy={tableCopy}
        showSelectionCount={showSelectionSummary}
      />
    </div>
  );
}
