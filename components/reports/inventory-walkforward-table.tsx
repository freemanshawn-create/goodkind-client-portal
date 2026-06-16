"use client";

import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";
import type { InventoryWalkforward, InventoryWalkforwardRow } from "@/data/types";

interface Props {
  report: InventoryWalkforward;
}

/** Columns: key on the row, label for header + CSV, and whether it's a movement. */
const COLUMNS: {
  key: keyof InventoryWalkforwardRow;
  label: string;
  numeric: boolean;
}[] = [
  { key: "itemCode", label: "Item Code", numeric: false },
  { key: "sku", label: "SKU", numeric: false },
  { key: "description", label: "Description", numeric: false },
  { key: "openingBalance", label: "Opening", numeric: true },
  { key: "received", label: "Received", numeric: true },
  { key: "produced", label: "Produced", numeric: true },
  { key: "consumed", label: "Consumed", numeric: true },
  { key: "adjusted", label: "Adjusted", numeric: true },
  { key: "cycled", label: "Cycled", numeric: true },
  { key: "scrapWarehouse", label: "Scrap (WH)", numeric: true },
  { key: "scrapProduction", label: "Scrap (Prod)", numeric: true },
  { key: "shipped", label: "Shipped", numeric: true },
  { key: "toFromRnD", label: "To/From R&D", numeric: true },
  { key: "endingBalance", label: "Ending", numeric: true },
];

const numberFmt = new Intl.NumberFormat("en-US");

function NumCell({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-muted-foreground/50">—</span>;
  }
  return (
    <span className={value < 0 ? "text-red-600" : ""}>
      {numberFmt.format(value)}
    </span>
  );
}

/** Build a CSV string from the rows, escaping fields as needed. */
function toCsv(rows: InventoryWalkforwardRow[]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = COLUMNS.map((c) => c.label).join(",");
  const body = rows
    .map((r) => COLUMNS.map((c) => esc(r[c.key])).join(","))
    .join("\n");
  return header + "\n" + body;
}

export function InventoryWalkforwardTable({ report }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery) return report.rows;
    const q = searchQuery.toLowerCase();
    return report.rows.filter(
      (r) =>
        r.itemCode.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
    );
  }, [report.rows, searchQuery]);

  const handleExport = useCallback(() => {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-walkforward_${format(
      report.weekStart,
      "yyyy-MM-dd"
    )}_${format(report.weekEnd, "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filtered, report.weekStart, report.weekEnd]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search item code, SKU, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="shrink-0"
        >
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/50">
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className={`whitespace-nowrap px-3 py-3 text-xs font-medium text-muted-foreground ${
                        c.numeric ? "text-right" : "text-left"
                      }`}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.itemCode}
                    className="border-b border-border/50 transition-colors hover:bg-card/30"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs font-mono">
                      {row.itemCode}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs font-mono text-muted-foreground">
                      {row.sku || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{row.description}</td>
                    {COLUMNS.filter((c) => c.numeric).map((c) => (
                      <td
                        key={c.key}
                        className="whitespace-nowrap px-3 py-2.5 text-right text-xs tabular-nums"
                      >
                        <NumCell value={row[c.key] as number} />
                      </td>
                    ))}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      className="px-4 py-12 text-center text-sm text-muted-foreground"
                    >
                      No items with activity this week.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length}{" "}
        {filtered.length === 1 ? "item" : "items"} with activity. Negative values
        (in red) reflect outflows.
      </p>
    </div>
  );
}
