import { mockBatchEntries } from "@/data/mock/schedule";
import { getSheetsBatchEntries } from "@/data/repositories/sheets-schedule";
import { addDays, subMonths, startOfDay } from "date-fns";
import type { BatchEntry } from "@/data/types";

function useGoogleSheets() {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );
}

async function getAllEntries(brands?: string[]): Promise<BatchEntry[]> {
  let entries: BatchEntry[];

  if (useGoogleSheets()) {
    entries = await getSheetsBatchEntries();
  } else {
    entries = [...mockBatchEntries];
  }

  // Filter by user's associated brands (client-level access control)
  if (brands && brands.length > 0) {
    entries = entries.filter((e) => brands.includes(e.brand));
  }

  return entries;
}

/**
 * Get upcoming batches: fill date within the next 45 days from today.
 * Excludes completed batches.
 */
export async function getUpcomingBatches(
  brands?: string[]
): Promise<BatchEntry[]> {
  const entries = await getAllEntries(brands);
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
  brands?: string[]
): Promise<BatchEntry[]> {
  const entries = await getAllEntries(brands);
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
