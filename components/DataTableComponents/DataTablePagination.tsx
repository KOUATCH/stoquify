"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  variant?: "default" | "landing";
  locale?: "en" | "fr";
  showSelectionCount?: boolean;
  copy?: {
    rowsPerPage?: string;
    page?: string;
    of?: string;
    selectedRowsLabel?: string;
    firstPage?: string;
    previousPage?: string;
    nextPage?: string;
    lastPage?: string;
  };
}

export function DataTablePagination<TData>({
  table,
  variant = "default",
  locale = "en",
  showSelectionCount = true,
  copy,
}: DataTablePaginationProps<TData>) {
  const isLanding = variant === "landing";
  const paginationCopy = {
    ...(locale === "fr"
      ? {
        rowsPerPage: "Lignes par page",
        page: "Page",
        of: "sur",
        selectedRowsLabel: "lignes sélectionnées.",
        firstPage: "Aller à la première page",
        previousPage: "Aller à la page précédente",
        nextPage: "Aller à la page suivante",
        lastPage: "Aller à la dernière page",
      }
      : {
        rowsPerPage: "Rows per page",
        page: "Page",
        of: "of",
        selectedRowsLabel: "row(s) selected.",
        firstPage: "Go to first page",
        previousPage: "Go to previous page",
        nextPage: "Go to next page",
        lastPage: "Go to last page",
      }),
    ...copy,
  };
  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;
  const visibleRowCount = table.getFilteredRowModel().rows.length;

  return (
    <div className={cn("dashboard-table-pagination flex min-w-0 flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between", isLanding && "text-[var(--dash-text-soft)]")}>
      {showSelectionCount ? (
        <div className={cn("min-w-0 flex-1 text-sm text-muted-foreground", isLanding && "text-[var(--dash-text-soft)]")}>
          {selectedRowCount} {paginationCopy.of} {visibleRowCount} {paginationCopy.selectedRowsLabel}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{paginationCopy.rowsPerPage}</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger aria-label={paginationCopy.rowsPerPage} className={cn("h-8 w-[70px]", isLanding && "dashboard-control rounded-lg border-[var(--dash-border-subtle)]")}>
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          {paginationCopy.page} {table.getState().pagination.pageIndex + 1} {paginationCopy.of}{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className={cn("hidden h-8 w-8 p-0 lg:flex", isLanding && "dashboard-button-secondary rounded-lg")}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{paginationCopy.firstPage}</span>
            <DoubleArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className={cn("h-8 w-8 p-0", isLanding && "dashboard-button-secondary rounded-lg")}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{paginationCopy.previousPage}</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className={cn("h-8 w-8 p-0", isLanding && "dashboard-button-secondary rounded-lg")}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{paginationCopy.nextPage}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className={cn("hidden h-8 w-8 p-0 lg:flex", isLanding && "dashboard-button-secondary rounded-lg")}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{paginationCopy.lastPage}</span>
            <DoubleArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
