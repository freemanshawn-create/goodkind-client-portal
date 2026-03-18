"use client";

import { Fragment, useState, useMemo, useCallback } from "react";
import { format, isValid } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Search,
  Lock,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  BatchEntry,
  BomItem,
  BomInventoryStatus,
  BomSummaryStatus,
} from "@/data/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScheduleTableProps {
  upcoming: BatchEntry[];
  past: BatchEntry[];
  bomItems: BomItem[];
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmtDate(date: Date | undefined): string {
  if (!date || !isValid(date)) return "\u2014";
  return format(date, "MMM d, yyyy");
}

function fmtShortDate(date: Date | undefined): string {
  if (!date || !isValid(date)) return "\u2014";
  return format(date, "MMM d");
}

function fmtYield(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

// ---------------------------------------------------------------------------
// BOM helpers
// ---------------------------------------------------------------------------

function getBomSummary(items: BomItem[]): BomSummaryStatus {
  if (items.length === 0) return "all-clear";
  if (items.some((i) => i.inventoryStatus === "none")) return "at-risk";
  if (items.some((i) => i.inventoryStatus === "inbound")) return "partial-risk";
  return "all-clear";
}

function SummaryDot({ status }: { status: BomSummaryStatus }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        status === "all-clear"
          ? "bg-green-500"
          : status === "partial-risk"
            ? "bg-amber-500"
            : "bg-red-500"
      }`}
    />
  );
}

function StatusDot({ status }: { status: BomInventoryStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          status === "on-hand"
            ? "bg-green-500"
            : status === "inbound"
              ? "bg-amber-500"
              : "bg-red-500"
        }`}
      />
      <span className="text-xs">
        {status === "on-hand"
          ? "On Hand"
          : status === "inbound"
            ? "Inbound"
            : "Not Available"}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Lock status badge (reused from before)
// ---------------------------------------------------------------------------

function LockStatus({ entry }: { entry: BatchEntry }) {
  if (entry.status === "locked" || entry.status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        <Lock className="h-3 w-3" />
        Locked
      </span>
    );
  }
  if (entry.status === "pending-lock" && entry.lockDate) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        <CalendarDays className="h-3 w-3" />
        {format(entry.lockDate, "MMM d")}
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">{"\u2014"}</span>;
}

// ---------------------------------------------------------------------------
// BOM detail panel (expanded row content)
// ---------------------------------------------------------------------------

function BomDetailPanel({ items }: { items: BomItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No component data available for this batch.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Client-Provided Components
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-1 rounded-md border border-border/50 bg-card/40 px-3 py-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{item.partName}</span>
              <StatusDot status={item.inventoryStatus} />
            </div>
            <div className="text-[11px] text-muted-foreground">
              {item.inventoryStatus === "on-hand" && (
                <span>{fmtYield(item.quantityOnHand)} on hand</span>
              )}
              {item.inventoryStatus === "inbound" && (
                <span>
                  {fmtYield(item.quantityInbound)} inbound
                  {item.poNumber && ` (${item.poNumber})`}
                  {item.expectedDate &&
                    ` \u2014 ETA ${fmtShortDate(item.expectedDate)}`}
                </span>
              )}
              {item.inventoryStatus === "none" && (
                <span className="text-red-600">
                  Needed: {fmtYield(item.quantityRequired)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table headers
// ---------------------------------------------------------------------------

const TABLE_HEADERS = [
  { label: "Compound", className: "" },
  { label: "Fill", className: "" },
  { label: "Batch #", className: "hidden sm:table-cell" },
  { label: "Product", className: "" },
  { label: "Yield", className: "hidden md:table-cell text-right" },
  { label: "SO #", className: "hidden lg:table-cell" },
  { label: "PO #", className: "hidden lg:table-cell" },
  { label: "Due", className: "hidden sm:table-cell" },
  { label: "Lock Status", className: "" },
  { label: "Parts", className: "text-center" },
];

// ---------------------------------------------------------------------------
// Batch table (shared between upcoming and past sections)
// ---------------------------------------------------------------------------

function BatchTable({
  entries,
  bomItems,
  emptyMessage,
}: {
  entries: BatchEntry[];
  bomItems: BomItem[];
  emptyMessage: string;
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const bomByBatch = useMemo(() => {
    const map = new Map<string, BomItem[]>();
    for (const item of bomItems) {
      const list = map.get(item.batchId) ?? [];
      list.push(item);
      map.set(item.batchId, list);
    }
    return map;
  }, [bomItems]);

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
              {entries.map((entry) => {
                const entryBom = bomByBatch.get(entry.id) ?? [];
                const summary = getBomSummary(entryBom);
                const isExpanded = expandedRows.has(entry.id);

                return (
                  <Fragment key={entry.id}>
                    <tr
                      onClick={() => toggleRow(entry.id)}
                      className="border-b border-border/50 cursor-pointer transition-colors hover:bg-card/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {fmtShortDate(entry.compoundDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {fmtShortDate(entry.fillDate)}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-xs font-mono text-muted-foreground sm:table-cell">
                        {entry.batchNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium leading-tight">
                          {entry.productName}
                        </p>
                        <p className="text-xs text-muted-foreground sm:hidden">
                          {entry.batchNumber}
                        </p>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-right text-xs tabular-nums md:table-cell">
                        {fmtYield(entry.yield)}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                        {entry.salesOrder ?? "\u2014"}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                        {entry.purchaseOrder ?? "\u2014"}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-xs sm:table-cell">
                        {fmtDate(entry.dueDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <LockStatus entry={entry} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <SummaryDot status={summary} />
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="border-b border-border/50 bg-card/20">
                        <td
                          colSpan={TABLE_HEADERS.length}
                          className="px-6 py-4"
                        >
                          <BomDetailPanel items={entryBom} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ScheduleTable({ upcoming, past, bomItems }: ScheduleTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showPast, setShowPast] = useState(false);

  const filterEntries = useCallback(
    (entries: BatchEntry[]) => {
      if (!searchQuery) return entries;
      const q = searchQuery.toLowerCase();
      return entries.filter(
        (e) =>
          e.productName.toLowerCase().includes(q) ||
          e.batchNumber.toLowerCase().includes(q) ||
          (e.salesOrder && e.salesOrder.toLowerCase().includes(q)) ||
          (e.purchaseOrder && e.purchaseOrder.toLowerCase().includes(q))
      );
    },
    [searchQuery]
  );

  const filteredUpcoming = useMemo(
    () => filterEntries(upcoming),
    [upcoming, filterEntries]
  );
  const filteredPast = useMemo(
    () => filterEntries(past),
    [past, filterEntries]
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search product, batch #, SO #, PO #..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Upcoming section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">
          Upcoming &mdash; Next 45 Days
          <span className="ml-2 font-normal text-muted-foreground">
            ({filteredUpcoming.length}{" "}
            {filteredUpcoming.length === 1 ? "batch" : "batches"})
          </span>
        </h3>
        <BatchTable
          entries={filteredUpcoming}
          bomItems={bomItems}
          emptyMessage="No upcoming batches in the next 45 days."
        />
      </div>

      {/* Past section (collapsible) */}
      <div className="space-y-3">
        <button
          onClick={() => setShowPast(!showPast)}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary"
        >
          {showPast ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          Completed Batches
          <span className="font-normal text-muted-foreground">
            ({filteredPast.length})
          </span>
        </button>

        {showPast && (
          <BatchTable
            entries={filteredPast}
            bomItems={bomItems}
            emptyMessage="No completed batches in the past 12 months."
          />
        )}
      </div>
    </div>
  );
}
