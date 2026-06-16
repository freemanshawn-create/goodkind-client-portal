import Link from "next/link";
import { ChevronRight, BarChart3, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Reports" };

interface ReportLink {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

// Add new reports here — each renders as a card linking to /reports/<slug>.
const REPORTS: ReportLink[] = [
  {
    slug: "weekly-inventory-walkforward",
    title: "Weekly Inventory Walkforward",
    description:
      "Per-item inventory roll-forward for the previous week: opening balance, receipts, production, consumption, scrap, shipments, and ending balance.",
    icon: BarChart3,
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Select a report to view."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.slug} href={`/reports/${report.slug}`}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-card/60">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium">{report.title}</h3>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {report.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
