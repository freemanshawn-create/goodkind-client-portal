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
import type { BatchEntry, BomItem, Document, PurchaseOrder } from "@/data/types";

export const metadata = { title: "Dashboard" };

/**
 * Run a data fetch with a soft fallback — if it throws (Azure SQL down,
 * Drive API rate-limited, etc.) we log the error and return the fallback
 * value so a single bad source doesn't take down the whole dashboard.
 */
async function safe<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`Dashboard: ${label} failed:`, err);
    return fallback;
  }
}

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const filter =
    user.role === "admin"
      ? {}
      : { brands: user.brands, cardCode: user.cardCode };

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
