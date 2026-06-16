import { startOfWeek, subDays } from "date-fns";
import { getAzureWeeklyWalkforward } from "@/data/repositories/azure-inventory-report";
import type { InventoryWalkforward } from "@/data/types";

export interface InventoryReportFilter {
  /** Brand codes (e.g. ["DRS"]) — required to scope; empty → no data. */
  brandCodes?: string[];
}

/** Previous full week, Monday–Sunday (matches the report's SQL date logic). */
function previousWeek(): { weekStart: Date; weekEnd: Date } {
  const thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
  return {
    weekStart: subDays(thisMonday, 7), // last Monday
    weekEnd: subDays(thisMonday, 1), // last Sunday
  };
}

/**
 * Weekly inventory walkforward for the previous full week, scoped to the
 * client's brand codes. Returns the week range plus rows (only items with
 * activity). Empty rows when no brand codes are configured.
 */
export async function getWeeklyWalkforward(
  filter?: InventoryReportFilter
): Promise<InventoryWalkforward> {
  const { weekStart, weekEnd } = previousWeek();
  const rows = await getAzureWeeklyWalkforward(filter?.brandCodes);
  return { weekStart, weekEnd, rows };
}
