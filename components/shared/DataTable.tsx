"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  emptyMessage?: string;
  pageCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  // Optional card renderer for mobile views
  mobileCardRender?: (row: TData) => React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  emptyMessage = "No records found.",
  pageCount = 1,
  currentPage = 1,
  onPageChange,
  mobileCardRender,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-3xl" />
        <Skeleton className="h-16 w-full rounded-3xl" />
        <Skeleton className="h-16 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop & Tablet Table View */}
      <div className={mobileCardRender ? "hidden md:block" : "block"}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Stacked Card View */}
      {mobileCardRender && (
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {data.length ? (
            data.map((item, index) => (
              <div
                key={index}
                className="rounded-3xl border border-border bg-card p-6 shadow-sm"
              >
                {mobileCardRender(item)}
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {pageCount > 1 && onPageChange && (
        <div className="flex items-center justify-between px-2 pt-2">
          <p className="text-base text-muted-foreground font-medium">
            Page <span className="text-foreground">{currentPage}</span> of{" "}
            <span className="text-foreground">{pageCount}</span>
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
              disabled={currentPage >= pageCount}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
