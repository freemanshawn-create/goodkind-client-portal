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
 * Get completed POs from the past 12 months, sorted by PO number descending
 * (highest PO # first). Falls back to string compare for non-numeric PO #s.
 *
 * Live SAP/Azure data only. Without a cardCode there is no client to scope to,
 * so return nothing rather than fall back to fabricated data.
 */
export async function getCompletedPurchaseOrders(
  filter?: PurchaseOrderFilter
): Promise<PurchaseOrder[]> {
  if (!filter?.cardCode) return [];

  const rows = await getAzureCompletedPurchaseOrders(filter.cardCode);
  return rows.sort((a, b) => comparePoNumberDesc(a.poNumber, b.poNumber));
}

/** Sort PO numbers high→low, numerically when possible, else lexically. */
function comparePoNumberDesc(a: string, b: string): number {
  const an = Number(a);
  const bn = Number(b);
  const aNum = a.trim() !== "" && !Number.isNaN(an);
  const bNum = b.trim() !== "" && !Number.isNaN(bn);
  if (aNum && bNum) return bn - an;
  if (aNum) return -1; // numeric PO #s sort ahead of blanks/non-numeric
  if (bNum) return 1;
  return b.localeCompare(a);
}
