import { mockPurchaseOrders } from "@/data/mock/purchase-orders";
import { subMonths, startOfDay } from "date-fns";
import type { PurchaseOrder } from "@/data/types";

function useAzureSql() {
  return !!process.env.AZURE_SQL_CONNECTION_STRING;
}

async function getAllPurchaseOrders(
  brands?: string[]
): Promise<PurchaseOrder[]> {
  // Future: query Azure SQL when connection string is set
  let entries = [...mockPurchaseOrders];

  if (brands && brands.length > 0) {
    entries = entries.filter((e) => brands.includes(e.brand));
  }

  return entries;
}

/**
 * Get open POs (remaining > 0), sorted by due date ascending.
 */
export async function getOpenPurchaseOrders(
  brands?: string[]
): Promise<PurchaseOrder[]> {
  const entries = await getAllPurchaseOrders(brands);

  return entries
    .filter((e) => e.status === "open")
    .sort((a, b) => {
      const aDate = a.dueDate?.getTime() ?? 0;
      const bDate = b.dueDate?.getTime() ?? 0;
      return aDate - bDate;
    });
}

/**
 * Get completed POs from the past 12 months, sorted by completed date descending.
 */
export async function getCompletedPurchaseOrders(
  brands?: string[]
): Promise<PurchaseOrder[]> {
  const entries = await getAllPurchaseOrders(brands);
  const twelveMonthsAgo = subMonths(startOfDay(new Date()), 12);

  return entries
    .filter(
      (e) =>
        e.status === "completed" &&
        (!e.completedDate || e.completedDate >= twelveMonthsAgo)
    )
    .sort((a, b) => {
      const aDate = a.completedDate?.getTime() ?? 0;
      const bDate = b.completedDate?.getTime() ?? 0;
      return bDate - aDate;
    });
}
