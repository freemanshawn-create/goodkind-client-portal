import {
  getOpenPurchaseOrders,
  getCompletedPurchaseOrders,
} from "@/data/repositories/purchase-orders";
import { getSession } from "@/lib/auth";
import { safe } from "@/lib/safe";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PurchaseOrdersTable } from "@/components/purchase-orders/purchase-orders-table";
import type { PurchaseOrder } from "@/data/types";

export const metadata = { title: "Purchase Orders" };

export default async function PurchaseOrdersPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  // Everyone — admins included — is scoped to their active org's SAP CardCode.
  // With no active org (no cardCode) there is nothing to show.
  const filter = {
    brands: user.brands,
    brandCodes: user.brandCodes,
    cardCode: user.cardCode,
  };

  // Soft-fail: if Azure is unreachable, render an empty state, not an error page.
  const [open, completed] = await Promise.all([
    safe<PurchaseOrder[]>("Open POs", () => getOpenPurchaseOrders(filter), []),
    safe<PurchaseOrder[]>(
      "Completed POs",
      () => getCompletedPurchaseOrders(filter),
      []
    ),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="View all open and completed purchase orders."
      />

      <PurchaseOrdersTable open={open} completed={completed} />
    </div>
  );
}
