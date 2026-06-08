import {
  getAzureOpenPurchaseOrders,
  getAzureCompletedPurchaseOrders,
} from "@/data/repositories/azure-purchase-orders";
import type { PurchaseOrder } from "@/data/types";

export interface PurchaseOrderFilter {
  /** Retained for callers; data is scoped by cardCode in SQL, not by brand. */
  brands?: string[];
  /** SAP B1 customer CardCode used for live Azure queries. */
  cardCode?: string;
}

/**
 * Get open POs (remaining > 0), sorted by due date ascending.
 *
 * Live SAP/Azure data only. Without a cardCode there is no client to scope to,
 * so return nothing rather than fall back to fabricated data.
 */
export async function getOpenPurchaseOrders(
  filter?: PurchaseOrderFilter
): Promise<PurchaseOrder[]> {
  if (!filter?.cardCode) return [];

  const rows = await getAzureOpenPurchaseOrders(filter.cardCode);
  return rows.sort((a, b) => {
    const aDate = a.dueDate?.getTime() ?? 0;
    const bDate = b.dueDate?.getTime() ?? 0;
    return aDate - bDate;
  });
}

/**
 * Get completed POs from the past 12 months, sorted by completed date descending.
 *
 * Live SAP/Azure data only. Without a cardCode there is no client to scope to,
 * so return nothing rather than fall back to fabricated data.
 */
export async function getCompletedPurchaseOrders(
  filter?: PurchaseOrderFilter
): Promise<PurchaseOrder[]> {
  if (!filter?.cardCode) return [];

  const rows = await getAzureCompletedPurchaseOrders(filter.cardCode);
  return rows.sort((a, b) => {
    const aDate = a.completedDate?.getTime() ?? 0;
    const bDate = b.completedDate?.getTime() ?? 0;
    return bDate - aDate;
  });
}
