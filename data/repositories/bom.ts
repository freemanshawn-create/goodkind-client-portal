import { getAzureBomItemsForBatches } from "@/data/repositories/azure-bom";
import type { BatchEntry, BomItem } from "@/data/types";

export async function getBomItemsForBatches(
  batches: Pick<BatchEntry, "id" | "batchNumber">[],
  brandCodes: string[] | undefined,
  brandNames?: string[] | undefined
): Promise<BomItem[]> {
  // Live SAP/Azure data only. Component status is brand-scoped (20-<BRAND>
  // item codes); with no brand codes there is nothing we can safely scope to.
  if (!brandCodes || brandCodes.length === 0) return [];
  if (batches.length === 0) return [];

  return getAzureBomItemsForBatches(batches, brandCodes, brandNames);
}
