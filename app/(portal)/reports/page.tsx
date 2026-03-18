import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="View production and order reports."
      />

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <BarChart3 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-medium">Coming Soon</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Reports and analytics are being built out.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
