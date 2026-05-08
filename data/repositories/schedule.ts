import { mockBatchEntries } from "@/data/mock/schedule";
import { getSheetsBatchEntries } from "@/data/repositories/sheets-schedule";
import { getAzureBatchEntries } from "@/data/repositories/azure-schedule";
import { addDays, subMonths, startOfDay } from "date-fns";
import type { BatchEntry } from "@/data/types";

export interface ScheduleFilter {
  /** Brand names to filter mock/Sheets data by. Ignored when Azure is configured. */
  brands?: string[];
  /** SAP B1 customer CardCode used for live Azure queries. */
  cardCode?: string;
}

function useAzureSql() {
  return !!process.env.AZURE_SQL_CONNECTION_STRING;
}

function useGoogleSheets() {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );
}

async function getAllEntries(filter?: ScheduleFilter): Promise<BatchEntry[]> {
  // Azure SQL takes precedence when configured and we have a cardCode
  if (useAzureSql() && filter?.cardCode) {
    return getAzureBatchEntries(filter.cardCode);
  }

  let entries: BatchEntry[];
  if (useGoogleSheets()) {
    entries = await getSheetsBatchEntries();
  } else {
    entries = [...mockBatchEntries];
  }

  // Filter by user's associated brands (client-level access control for mock/sheets)
  if (filter?.brands && filter.brands.length > 0) {
    entries = entries.filter((e) => filter.brands!.includes(e.brand));
  }

  return entries;
}

/**
 * Get upcoming batches: fill date within the next 45 days from today.
 * Excludes completed batches.
 */
export async function getUpcomingBatches(
  filter?: ScheduleFilter
): Promise<BatchEntry[]> {
  const entries = await getAllEntries(filter);
  const today = startOfDay(new Date());
  const cutoff = addDays(today, 45);

  return entries
    .filter(
      (e) =>
        e.status !== "completed" &&
        e.fillDate >= today &&
        e.fillDate <= cutoff
    )
    .sort((a, b) => a.fillDate.getTime() - b.fillDate.getTime());
}

/**
 * Get completed batches from the past 12 months.
 */
export async function getPastBatches(
  filter?: ScheduleFilter
): Promise<BatchEntry[]> {
  const entries = await getAllEntries(filter);
  const today = startOfDay(new Date());
  const twelveMonthsAgo = subMonths(today, 12);

  return entries
    .filter(
      (e) =>
        e.status === "completed" &&
        e.fillDate >= twelveMonthsAgo &&
        e.fillDate < today
    )
    .sort((a, b) => b.fillDate.getTime() - a.fillDate.getTime());
}
