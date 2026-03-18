import { mockBomItems } from "@/data/mock/bom";
import type { BomItem } from "@/data/types";

function useAzureSql() {
  return !!process.env.AZURE_SQL_CONNECTION_STRING;
}

export async function getBomItemsForBatches(
  batchIds: string[]
): Promise<BomItem[]> {
  if (useAzureSql()) {
    // Future: query Azure SQL
    // return getAzureBomItems(batchIds);
    return mockBomItems.filter((item) => batchIds.includes(item.batchId));
  }
  return mockBomItems.filter((item) => batchIds.includes(item.batchId));
}
