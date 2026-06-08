import { getAzureBatchEntries } from "@/data/repositories/azure-schedule";
import { addDays, subMonths, startOfDay } from "date-fns";
import type { BatchEntry } from "@/data/types";

export interface ScheduleFilter {
  /** Retained for callers; data is scoped by cardCode in SQL, not by brand. */
  brands?: string[];
  /** SAP B1 customer CardCode used for live Azure queries. */
  cardCode?: string;
  /** Upcoming-schedule window in days (per-client, default 45). */
  windowDays?: number;
}

/** Default upcoming-schedule horizon when a client has no override. */
export const DEFAULT_SCHEDULE_WINDOW_DAYS = 45;

async function getAllEntries(filter?: ScheduleFilter): Promise<BatchEntry[]> {
  // Live SAP/Azure data only. Without a cardCode (e.g. an admin with no active
  // org selected) there is no client to scope to, so return nothing rather than
  // fall back to fabricated data.
  if (!filter?.cardCode) return [];

  return getAzureBatchEntries(filter.cardCode);
}

/**
 * Get upcoming batches: fill date within the next N days from today, where N is
 * the client's configured window (default 45). Excludes completed batches.
 */
export async function getUpcomingBatches(
  filter?: ScheduleFilter
): Promise<BatchEntry[]> {
  const entries = await getAllEntries(filter);
  const today = startOfDay(new Date());
  const windowDays = filter?.windowDays ?? DEFAULT_SCHEDULE_WINDOW_DAYS;
  const cutoff = addDays(today, windowDays);

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
