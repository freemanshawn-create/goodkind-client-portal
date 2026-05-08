import {
  getOpenPurchaseOrders,
  getCompletedPurchaseOrders,
} from "@/data/repositories/purchase-orders";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PurchaseOrdersTable } from "@/components/purchase-orders/purchase-orders-table";

export const metadata = { title: "Purchase Orders" };

export default async function PurchaseOrdersPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  // Admins see everything; clients are scoped to their brands (mock) / cardCode (Azure)
  const filter =
    user.role === "admin"
      ? {}
      : { brands: user.brands, cardCode: user.cardCode };

  const [open, completed] = await Promise.all([
    getOpenPurchaseOrders(filter),
    getCompletedPurchaseOrders(filter),
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
