import { getSession } from "@/lib/auth";
import { safe } from "@/lib/safe";
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
import type { BatchEntry, BomItem, Document, PurchaseOrder } from "@/data/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  // Everyone — admins included — is scoped to their active org's SAP CardCode.
  // With no active org (no cardCode) there is nothing to show. The upcoming
  // window honors the client's per-org setting (default 45 days).
  const filter = {
    brands: user.brands,
    cardCode: user.cardCode,
    windowDays: user.scheduleWindowDays,
  };

  const [openPos, upcomingBatches, docsResult] = await Promise.all([
    safe<PurchaseOrder[]>(
      "Open POs",
      () => getOpenPurchaseOrders(filter),
      []
    ),
    safe<BatchEntry[]>(
      "Upcoming batches",
      () => getUpcomingBatches(filter),
      []
    ),
    safe<{ documents: Document[] }>(
      "Documents",
      async () => {
        const { documents } = await getDocumentsAndFolders({
          driveFolderId: user.driveFolderId,
        });
        return { documents };
      },
      { documents: [] }
    ),
  ]);
  const documents = docsResult.documents;

  // BOM depends on upcomingBatches having loaded successfully
  const bomItems: BomItem[] = await safe(
    "BOM items",
    () => getBomItemsForBatches(upcomingBatches),
    []
  );

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
