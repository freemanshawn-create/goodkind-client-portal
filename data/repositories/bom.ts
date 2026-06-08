import { getAzureBomItemsForBatches } from "@/data/repositories/azure-bom";
import type { BatchEntry, BomItem } from "@/data/types";

export async function getBomItemsForBatches(
  batches: Pick<BatchEntry, "id" | "itemKey" | "yield">[]
): Promise<BomItem[]> {
  // Live SAP/Azure data only. BOM rows are keyed off the batch itemKey that the
  // Azure schedule repo supplies; with no such batches there is nothing to fetch.
  if (!batches.some((b) => b.itemKey)) return [];

  return getAzureBomItemsForBatches(batches);
}
