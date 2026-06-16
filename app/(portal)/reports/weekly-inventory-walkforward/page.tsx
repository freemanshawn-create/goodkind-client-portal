import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { safe } from "@/lib/safe";
import { getWeeklyWalkforward } from "@/data/repositories/inventory-report";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { InventoryWalkforwardTable } from "@/components/reports/inventory-walkforward-table";
import type { InventoryWalkforward } from "@/data/types";

export const metadata = { title: "Weekly Inventory Walkforward" };

// The walkforward is a heavy multi-union query (~13s); allow a generous
// serverless function timeout so it isn't killed mid-flight.
export const maxDuration = 60;

export default async function WeeklyWalkforwardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  // Brand-scoped report. Without brand codes we cannot scope safely.
  const hasBrandCodes = (user.brandCodes ?? []).length > 0;

  const report = hasBrandCodes
    ? await safe<InventoryWalkforward | null>(
        "Weekly walkforward",
        () => getWeeklyWalkforward({ brandCodes: user.brandCodes }),
        null
      )
    : null;

  const weekLabel = report
    ? `Week of ${format(report.weekStart, "MMM d")} – ${format(
        report.weekEnd,
        "MMM d, yyyy"
      )}`
    : "Inventory movement for the previous week.";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/reports"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All reports
        </Link>
        <PageHeader
          title="Weekly Inventory Walkforward"
          description={weekLabel}
        />
      </div>

      {!hasBrandCodes ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-medium">No report available</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              This report is scoped by brand. Once brand codes are configured for
              this client, the weekly inventory walkforward will appear here.
            </p>
          </CardContent>
        </Card>
      ) : !report ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-medium">Report unavailable</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              We couldn&apos;t load the inventory data just now. Please try again
              in a moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <InventoryWalkforwardTable report={report} />
      )}
    </div>
  );
}
