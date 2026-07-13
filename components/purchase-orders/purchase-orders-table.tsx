"use client";

import { useState, useMemo, useCallback } from "react";
import { format, isValid } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import type { PurchaseOrder } from "@/data/types";

interface PurchaseOrdersTableProps {
  open: PurchaseOrder[];
  completed: PurchaseOrder[];
}

function fmtDate(date: Date | undefined): string {
  if (!date || !isValid(date)) return "—";
  return format(date, "MMM d, yyyy");
}

function fmtQty(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

const TABLE_HEADERS = [
  { label: "Customer PO", className: "" },
  { label: "SO #", className: "hidden lg:table-cell" },
  { label: "Product Code", className: "hidden md:table-cell" },
  { label: "Product", className: "" },
  { label: "Due Date", className: "hidden sm:table-cell" },
  { label: "Ordered", className: "hidden md:table-cell text-right" },
  { label: "Unit", className: "hidden lg:table-cell" },
  { label: "Remaining", className: "text-right" },
];

function POTable({
  entries,
  emptyMessage,
}: {
  entries: PurchaseOrder[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border">
                {TABLE_HEADERS.map((h) => (
                  <th
                    key={h.label}
                    className={`bg-card px-4 py-3 text-left text-xs font-medium text-muted-foreground ${h.className}`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((po) => (
                <tr
                  key={po.id}
                  className="border-b border-border/50 transition-colors hover:bg-card/30"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs font-medium">
                    {po.poNumber || "—"}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                    {po.soNumber}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-xs font-mono text-muted-foreground md:table-cell">
                    {po.productCode || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium leading-tight">
                      {po.productName}
                    </p>
                    <p className="text-xs text-muted-foreground sm:hidden">
                      Due: {fmtDate(po.dueDate)}
                    </p>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-xs sm:table-cell">
                    {fmtDate(po.dueDate)}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-right text-xs tabular-nums md:table-cell">
                    {fmtQty(po.orderedQuantity)}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                    {po.salesUnit}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs tabular-nums">
                    <span
                      className={
                        po.remainingQuantity > 0
                          ? "font-medium text-amber-700"
                          : "text-green-700"
                      }
                    >
                      {po.remainingQuantity > 0
                        ? fmtQty(po.remainingQuantity)
                        : "Fulfilled"}
                    </span>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td
                    colSpan={TABLE_HEADERS.length}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function PurchaseOrdersTable({
  open,
  completed,
}: PurchaseOrdersTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const filterEntries = useCallback(
    (entries: PurchaseOrder[]) => {
      if (!searchQuery) return entries;
      const q = searchQuery.toLowerCase();
      return entries.filter(
        (e) =>
          e.productName.toLowerCase().includes(q) ||
          e.productCode.toLowerCase().includes(q) ||
          e.poNumber.toLowerCase().includes(q) ||
          e.soNumber.toLowerCase().includes(q)
      );
    },
    [searchQuery]
  );

  const filteredOpen = useMemo(
    () => filterEntries(open),
    [open, filterEntries]
  );
  const filteredCompleted = useMemo(
    () => filterEntries(completed),
    [completed, filterEntries]
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search PO #, SO #, product code, product..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Open order lines */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">
          Open Order Lines
          <span className="ml-2 font-normal text-muted-foreground">
            ({filteredOpen.length})
          </span>
        </h3>
        <POTable
          entries={filteredOpen}
          emptyMessage="No open order lines."
        />
      </div>

      {/* Completed order lines (collapsible) */}
      <div className="space-y-3">
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary"
        >
          {showCompleted ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          Completed Order Lines
          <span className="font-normal text-muted-foreground">
            ({filteredCompleted.length})
          </span>
        </button>

        {showCompleted && (
          <POTable
            entries={filteredCompleted}
            emptyMessage="No completed order lines in the past 12 months."
          />
        )}
      </div>
    </div>
  );
}
