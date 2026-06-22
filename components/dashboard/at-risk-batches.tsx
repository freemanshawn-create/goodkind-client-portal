import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCalendarDate } from "@/lib/format";
import { ROUTES } from "@/lib/constants";
import type { BatchEntry, BomItem } from "@/data/types";

interface AtRiskBatchesProps {
  batches: BatchEntry[];
  bomItems: BomItem[];
}

/**
 * A batch is "at risk" if any of its client-supplied BOM components has
 * inventory status === "none" (red) — neither on hand nor inbound.
 */
export function AtRiskBatches({ batches, bomItems }: AtRiskBatchesProps) {
  // Index BOM items by batchId, find the worst status per batch
  const itemsByBatch = new Map<string, BomItem[]>();
  for (const item of bomItems) {
    const arr = itemsByBatch.get(item.batchId) ?? [];
    arr.push(item);
    itemsByBatch.set(item.batchId, arr);
  }

  const atRisk = batches
    .filter((b) => {
      const items = itemsByBatch.get(b.id) ?? [];
      return items.some((i) => i.inventoryStatus === "none");
    })
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
    .slice(0, 5);

  if (atRisk.length === 0) {
    return null;
  }

  return (
    <Card className="border-red-200 bg-red-50/30">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium text-red-900">
          <AlertTriangle className="h-4 w-4" />
          At-Risk Batches
        </CardTitle>
        <Link
          href={ROUTES.SCHEDULE}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          View schedule →
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="mb-3 text-xs text-red-900/80">
          These upcoming batches are missing client-supplied inventory and
          have no inbound POs.
        </p>
        <div className="space-y-2">
          {atRisk.map((batch) => {
            const missingCount =
              itemsByBatch
                .get(batch.id)
                ?.filter((i) => i.inventoryStatus === "none").length ?? 0;
            return (
              <Link
                key={batch.id}
                href={ROUTES.SCHEDULE}
                className="flex items-center justify-between rounded-md border border-red-200/60 bg-background px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {batch.productName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Batch #{batch.batchNumber} · {formatCalendarDate(batch.scheduledDate)}
                  </p>
                </div>
                <span className="ml-3 shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                  {missingCount} missing
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
