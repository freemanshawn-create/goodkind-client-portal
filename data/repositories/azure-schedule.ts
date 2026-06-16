/**
 * Azure SQL-backed Production Schedule repository.
 *
 * Sources the live production schedule from SAP B1's Process/Production tables
 * (@BMM_PNMAST = batch header, @BMM_PNITEM = batch lines), mirroring the
 * canonical semantic-layer "90 Day Schedule" query. This replaced the older
 * @BMM_APSSCHEDULING source, which was stale (it lagged weeks behind and held
 * almost no forward-dated rows); PNMAST carries the full forward schedule.
 *
 * We show the finished-good FILL steps: OUTPUT lines (U_LINETYPE = 7) of every
 * non-cancelled batch step whose output is a finished good (90- item). The
 * bulk/compound (WIP) steps that feed them are intentionally excluded — clients
 * only care about the fill runs.
 *
 * Scope: the PNMAST tables have no customer column, so a client is scoped by
 * BRAND via the item code (e.g. items containing "DRS" for Dr. Squatch). This
 * means brandCodes is REQUIRED — without it we cannot safely scope and return
 * nothing rather than leak another client's schedule.
 */

import { query, raw } from "@/lib/azure-db";
import { brandCodeFilter } from "@/data/repositories/item-filters";
import type { BatchEntry, BatchStatus } from "@/data/types";

const SCHEMA = raw("GKCO_PROD");

interface ScheduleRow {
  ScheduledDate: Date;
  SuperBatchNo: string | null;
  BatchNo: string;
  // SAP returns U_SONUMBER as a numeric value (0 when unset), not a string.
  SONumber: string | number | null;
  ItemKey: string;
  ProductCode: string | null;
  ItemName: string | null;
  TheoreticalOutput: number;
  ClientPO: string | null;
}

async function fetchRows(
  cardCode: string,
  brandCodes: string[],
  fromDate: Date
): Promise<ScheduleRow[]> {
  const brandFilter = brandCodeFilter("i.U_ITEMCODE", brandCodes);

  return query<ScheduleRow>`
    SELECT
      m.U_SCHEDULEDSTARTDATE AS ScheduledDate,
      m.U_SUPERBATCHNO       AS SuperBatchNo,
      m.U_BATCHNO            AS BatchNo,
      m.U_SONUMBER           AS SONumber,
      i.U_ITEMCODE           AS ItemKey,
      itm.U_BPREF            AS ProductCode,
      itm.ItemName           AS ItemName,
      i.U_STDQTY             AS TheoreticalOutput,
      o.NumAtCard            AS ClientPO
    FROM ${SCHEMA}.[@BMM_PNMAST] m
    INNER JOIN ${SCHEMA}.[@BMM_PNITEM] i ON m.DocEntry = i.DocEntry
    INNER JOIN ${SCHEMA}.OITM itm        ON i.U_ITEMCODE = itm.ItemCode
    LEFT JOIN ${SCHEMA}.ORDR o
      ON TRY_CAST(m.U_SONUMBER AS INT) = o.DocNum
     AND o.CardCode = ${cardCode}
     AND o.CANCELED = 'N'
    WHERE m.U_BATCHSTATUS <> 6
      AND i.U_LINETYPE = 7
      AND i.U_ITEMCODE LIKE '90-%'   -- finished-good fill steps only (exclude bulk/WIP)
      AND m.U_SCHEDULEDSTARTDATE >= ${fromDate}
      AND ${brandFilter}
    ORDER BY m.U_SCHEDULEDSTARTDATE, m.U_BATCHNO
  `;
}

/**
 * Strip the "FG, <Brand>, " / "Bulk, <Brand>, " prefix from SAP item
 * descriptions so the portal shows just the product.
 */
function cleanItemName(name: string | null, fallback: string): string {
  if (!name) return fallback;
  return name.replace(/^(FG|Bulk),\s*[^,]+,\s*/i, "").trim();
}

/** A 90- item is a finished good (FILL step); anything else is a bulk/WIP step. */
function stepTypeFor(itemKey: string): "fill" | "bulk" {
  return /^90-/i.test(itemKey) ? "fill" : "bulk";
}

/** Past scheduled date → completed; otherwise it's still scheduled/upcoming. */
function statusFor(scheduledDate: Date): BatchStatus {
  return scheduledDate.getTime() < Date.now() ? "completed" : "scheduled";
}

function mapRow(row: ScheduleRow): BatchEntry {
  const scheduledDate = new Date(row.ScheduledDate);
  const so = String(row.SONumber ?? "").trim();
  return {
    id: `pn-${row.BatchNo}-${row.ItemKey}`,
    scheduledDate,
    superBatchNo: row.SuperBatchNo ?? "",
    batchNumber: row.BatchNo,
    productCode: row.ProductCode ?? "",
    productName: cleanItemName(row.ItemName, row.ProductCode ?? row.ItemKey),
    yield: Number(row.TheoreticalOutput ?? 0),
    stepType: stepTypeFor(row.ItemKey),
    salesOrder: so && so !== "0" ? so : undefined,
    clientPO: row.ClientPO ?? undefined,
    status: statusFor(scheduledDate),
    itemKey: row.ItemKey,
  };
}

/**
 * Fetch production-schedule output rows for a client, scoped by brand code(s).
 * Returns [] when no brand codes are configured (cannot scope safely).
 *
 * @param fromDate  Lower bound on scheduled date (e.g. 12 months ago) so the
 *                  past-batches view has data without scanning all history.
 */
export async function getAzureBatchEntries(
  cardCode: string,
  brandCodes: string[] | undefined,
  fromDate: Date
): Promise<BatchEntry[]> {
  const codes = (brandCodes ?? []).filter(Boolean);
  if (codes.length === 0) return [];

  const rows = await fetchRows(cardCode, codes, fromDate);
  return rows.map(mapRow);
}
