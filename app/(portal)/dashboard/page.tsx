import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOpenPurchaseOrders } from "@/data/repositories/purchase-orders";
import { getUpcomingBatches } from "@/data/repositories/schedule";
import { getBomItemsForBatches } from "@/data/repositories/bom";
import { getDocumentsAndFolders } from "@/data/repositories/documents";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { UpcomingDueDates } from "@/components/dashboard/upcoming-due-dates";
import { LatestDocuments } from "@/components/dashboard/latest-documents";
import { AtRiskBatches } from "@/components/dashboard/at-risk-batches";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  // Filter both POs and Schedule by the user's client (CardCode in Azure)
  // Falls back to brand filtering for mock data when Azure isn't configured.
  const filter =
    user.role === "admin"
      ? {}
      : { brands: user.brands, cardCode: user.cardCode };

  const [openPos, upcomingBatches, { documents }] = await Promise.all([
    getOpenPurchaseOrders(filter),
    getUpcomingBatches(filter),
    getDocumentsAndFolders({ driveFolderId: user.driveFolderId }),
  ]);

  // BOM lookup needs the batches' itemKeys to know which BOMs to fetch
  const bomItems = await getBomItemsForBatches(upcomingBatches);

  const unitsRemaining = openPos.reduce(
    (sum, po) => sum + (po.remainingQuantity ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          user.company
            ? `Welcome back. Here's what's happening for ${user.company}.`
            : "Welcome back."
        }
      />

      <StatsCards
        openPoCount={openPos.length}
        unitsRemaining={unitsRemaining}
        upcomingBatchCount={upcomingBatches.length}
        documentsCount={documents.length}
      />

      <AtRiskBatches batches={upcomingBatches} bomItems={bomItems} />

      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingDueDates pos={openPos} />
        <LatestDocuments documents={documents} />
      </div>
    </div>
  );
}
