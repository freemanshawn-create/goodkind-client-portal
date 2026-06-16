import { getAzureBatchEntries } from "@/data/repositories/azure-schedule";
import { addDays, subMonths, startOfDay } from "date-fns";
import type { BatchEntry } from "@/data/types";

export interface ScheduleFilter {
  /** Retained for callers; data is scoped by cardCode in SQL, not by brand. */
  brands?: string[];
  /**
   * SAP item-code brand prefixes (e.g. ["DRS"]). When set, only finished-goods
   * batches of these brands are shown; when omitted, all finished-goods
   * batches for the cardCode are shown.
   */
  brandCodes?: string[];
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
  // fall back to fabricated data. The PNMAST schedule is brand-scoped, so the
  // repo also returns [] when no brandCodes are configured.
  if (!filter?.cardCode) return [];

  // Lower-bound the scan at 12 months ago so the past-batches view has data
  // without pulling all production history.
  const fromDate = subMonths(startOfDay(new Date()), 12);
  return getAzureBatchEntries(filter.cardCode, filter.brandCodes, fromDate);
}

/**
 * Get upcoming batches: scheduled within the next N days from today, where N is
 * the client's configured window (default 45). Excludes completed steps.
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
        e.scheduledDate >= today &&
        e.scheduledDate <= cutoff
    )
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
}

/**
 * Get completed steps from the past 12 months.
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
        e.scheduledDate >= twelveMonthsAgo &&
        e.scheduledDate < today
    )
    .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
}
