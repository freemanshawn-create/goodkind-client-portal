import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { ROUTES } from "@/lib/constants";
import type { PurchaseOrder } from "@/data/types";

interface UpcomingDueDatesProps {
  pos: PurchaseOrder[];
}

export function UpcomingDueDates({ pos }: UpcomingDueDatesProps) {
  // Filter to POs with a due date in the next 30 days, sorted ascending
  const now = Date.now();
  const horizon = now + 30 * 24 * 60 * 60 * 1000;
  const upcoming = pos
    .filter((p) => p.dueDate && p.dueDate.getTime() >= now && p.dueDate.getTime() <= horizon)
    .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
    .slice(0, 6);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-medium">
          Upcoming Due Dates
        </CardTitle>
        <Link
          href={ROUTES.PURCHASE_ORDERS}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          View all →
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {upcoming.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No POs due in the next 30 days.
          </p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((po) => (
              <Link
                key={po.id}
                href={ROUTES.PURCHASE_ORDERS}
                className="flex items-start gap-3 rounded-md p-1 transition-colors hover:bg-muted/40"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {po.productName || `PO #${po.poNumber}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PO #{po.poNumber} · SO #{po.soNumber} ·{" "}
                    {po.remainingQuantity.toLocaleString()} units remaining
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  {po.dueDate && formatDate(po.dueDate)}
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
