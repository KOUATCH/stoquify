"use client";
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
}
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DataTablePagination<TData>({
  table,
  variant = "default",
}: DataTablePaginationProps<TData>) {
  const isLanding = variant === "landing";

  return (
    <div className={cn("flex min-w-0 flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between", isLanding && "dashboard-table-pagination text-[var(--dash-text-soft)]")}>
      <div className={cn("min-w-0 flex-1 text-sm text-muted-foreground", isLanding && "text-[var(--dash-text-soft)]")}>
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger aria-label="Rows per page" className={cn("h-8 w-[70px]", isLanding && "dashboard-control rounded-lg border-[var(--dash-border-subtle)]")}>
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
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className={cn("hidden h-8 w-8 p-0 lg:flex", isLanding && "dashboard-button-secondary rounded-lg")}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <DoubleArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className={cn("h-8 w-8 p-0", isLanding && "dashboard-button-secondary rounded-lg")}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className={cn("h-8 w-8 p-0", isLanding && "dashboard-button-secondary rounded-lg")}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className={cn("hidden h-8 w-8 p-0 lg:flex", isLanding && "dashboard-button-secondary rounded-lg")}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <DoubleArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
