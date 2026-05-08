import { mockPurchaseOrders } from "@/data/mock/purchase-orders";
import { subMonths, startOfDay } from "date-fns";
import {
  getAzureOpenPurchaseOrders,
  getAzureCompletedPurchaseOrders,
} from "@/data/repositories/azure-purchase-orders";
import type { PurchaseOrder } from "@/data/types";

export interface PurchaseOrderFilter {
  /** Brand names to filter mock data by. Ignored when Azure is configured. */
  brands?: string[];
  /** SAP B1 customer CardCode used for live Azure queries. */
  cardCode?: string;
}

function useAzureSql() {
  return !!process.env.AZURE_SQL_CONNECTION_STRING;
}

function filterMockByBrands(brands?: string[]): PurchaseOrder[] {
  if (!brands || brands.length === 0) return [...mockPurchaseOrders];
  return mockPurchaseOrders.filter((po) => brands.includes(po.brand));
}

/**
 * Get open POs (remaining > 0), sorted by due date ascending.
 */
export async function getOpenPurchaseOrders(
  filter?: PurchaseOrderFilter
): Promise<PurchaseOrder[]> {
  if (useAzureSql() && filter?.cardCode) {
    const rows = await getAzureOpenPurchaseOrders(filter.cardCode);
    return rows.sort((a, b) => {
      const aDate = a.dueDate?.getTime() ?? 0;
      const bDate = b.dueDate?.getTime() ?? 0;
      return aDate - bDate;
    });
  }

  return filterMockByBrands(filter?.brands)
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
  filter?: PurchaseOrderFilter
): Promise<PurchaseOrder[]> {
  if (useAzureSql() && filter?.cardCode) {
    const rows = await getAzureCompletedPurchaseOrders(filter.cardCode);
    return rows.sort((a, b) => {
      const aDate = a.completedDate?.getTime() ?? 0;
      const bDate = b.completedDate?.getTime() ?? 0;
      return bDate - aDate;
    });
  }

  const twelveMonthsAgo = subMonths(startOfDay(new Date()), 12);
  return filterMockByBrands(filter?.brands)
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
