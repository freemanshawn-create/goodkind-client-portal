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
  if (!date || !isValid(date)) return "\u2014";
  return format(date, "MMM d, yyyy");
}

function fmtQty(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

const TABLE_HEADERS = [
  { label: "PO #", className: "" },
  { label: "SO #", className: "" },
  { label: "Product", className: "" },
  { label: "Due Date", className: "hidden sm:table-cell" },
  { label: "Total Qty", className: "hidden md:table-cell text-right" },
  { label: "Delivered", className: "hidden md:table-cell text-right" },
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card/50">
                {TABLE_HEADERS.map((h) => (
                  <th
                    key={h.label}
                    className={`px-4 py-3 text-left text-xs font-medium text-muted-foreground ${h.className}`}
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
                    {po.poNumber}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {po.soNumber}
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
                    {fmtQty(po.totalQuantity)}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-right text-xs tabular-nums md:table-cell">
                    {fmtQty(po.deliveredQuantity)}
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
          placeholder="Search PO #, SO #, product..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Open POs */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">
          Open Purchase Orders
          <span className="ml-2 font-normal text-muted-foreground">
            ({filteredOpen.length})
          </span>
        </h3>
        <POTable
          entries={filteredOpen}
          emptyMessage="No open purchase orders."
        />
      </div>

      {/* Completed POs (collapsible) */}
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
          Completed Purchase Orders
          <span className="font-normal text-muted-foreground">
            ({filteredCompleted.length})
          </span>
        </button>

        {showCompleted && (
          <POTable
            entries={filteredCompleted}
            emptyMessage="No completed purchase orders in the past 12 months."
          />
        )}
      </div>
    </div>
  );
}
