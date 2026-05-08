import { mockBomItems } from "@/data/mock/bom";
import { getAzureBomItemsForBatches } from "@/data/repositories/azure-bom";
import type { BatchEntry, BomItem } from "@/data/types";

function useAzureSql() {
  return !!process.env.AZURE_SQL_CONNECTION_STRING;
}

export async function getBomItemsForBatches(
  batches: Pick<BatchEntry, "id" | "itemKey" | "yield">[]
): Promise<BomItem[]> {
  // Use live SAP data when any batch has an itemKey (i.e. came from Azure repo)
  if (useAzureSql() && batches.some((b) => b.itemKey)) {
    return getAzureBomItemsForBatches(batches);
  }
  const ids = batches.map((b) => b.id);
  return mockBomItems.filter((item) => ids.includes(item.batchId));
}
