/**
 * Azure SQL-backed Production Schedule repository.
 *
 * Maps SAP B1 Batch Manufacturing Module data (@BMM_APSSCHEDULING) into the
 * portal's BatchEntry shape.
 *
 * SAP B1 BMM stores one row per production step. A typical run for a finished
 * good has two related rows tied together by SUPERBATCHNO:
 *   - BATCHTYPE='M' (Mix/Compound) — bulk product on a mixing tank, no CUSTNMBR
 *   - BATCHTYPE='F' (Fill)         — finished units on a fill line, has CUSTNMBR + SONUMBER
 *
 * To get the user's client-scoped batches we anchor on the F-rows
 * (CUSTNMBR = customer code) and LEFT JOIN to the M-row by SUPERBATCHNO for
 * the compound date.
 */

import { query, raw } from "@/lib/azure-db";
import type { BatchEntry, BatchStatus } from "@/data/types";

const SCHEMA = raw("GKCO_PROD");

interface ScheduleRow {
  SuperBatchNo: string | null;
  BatchNo: string;
  ItemKey: string;
  ItemName: string | null;
  CompoundDate: Date | null;
  FillDate: Date;
  EndDate: Date | null;
  Yield: number;
  Unit: string | null;
  Status: string; // SAP STATUS string
  ReqShipDate: Date | null;
  SONumber: string | null;
  ClientPO: string | null;
  SODueDate: Date | null;
  Notes: string | null;
}

async function fetchRows(cardCode: string): Promise<ScheduleRow[]> {
  return query<ScheduleRow>`
    WITH compoundSteps AS (
      SELECT
        SUPERBATCHNO,
        MIN(STARTDATE) AS CompoundDate
      FROM ${SCHEMA}.[@BMM_APSSCHEDULING]
      WHERE BATCHTYPE = 'M'
        AND SUPERBATCHNO IS NOT NULL AND SUPERBATCHNO <> ''
      GROUP BY SUPERBATCHNO
    )
    SELECT
      fg.SUPERBATCHNO  AS SuperBatchNo,
      fg.BATCHNO       AS BatchNo,
      fg.ITEMKEY       AS ItemKey,
      itm.ItemName     AS ItemName,
      cs.CompoundDate  AS CompoundDate,
      fg.STARTDATE     AS FillDate,
      fg.ENDDATE       AS EndDate,
      fg.QUANTITY      AS [Yield],
      fg.UNIT          AS Unit,
      fg.STATUS        AS Status,
      fg.REQSHIPDATE   AS ReqShipDate,
      fg.SONUMBER      AS SONumber,
      o.NumAtCard      AS ClientPO,
      o.DocDueDate     AS SODueDate,
      fg.NOTES         AS Notes
    FROM ${SCHEMA}.[@BMM_APSSCHEDULING] fg
    LEFT JOIN compoundSteps cs ON cs.SUPERBATCHNO = fg.SUPERBATCHNO
    LEFT JOIN ${SCHEMA}.ORDR o
      ON TRY_CAST(fg.SONUMBER AS INT) = o.DocNum
     AND o.CardCode = ${cardCode}
     AND o.CANCELED = 'N'
    LEFT JOIN ${SCHEMA}.OITM itm ON itm.ItemCode = fg.ITEMKEY
    WHERE fg.CUSTNMBR = ${cardCode}
      AND fg.BATCHTYPE = 'F'
      AND fg.STARTDATE IS NOT NULL
    ORDER BY fg.STARTDATE
  `;
}

/**
 * Strip "FG, <Brand>, " prefix and any trailing item-code suffix that gets
 * appended by SAP item descriptions.
 */
function cleanItemName(name: string | null, fallback: string): string {
  if (!name) return fallback;
  return name.replace(/^FG,\s*[^,]+,\s*/i, "").trim();
}

/**
 * Map SAP STATUS + dates to portal BatchStatus.
 *
 *  RELEASED            → locked       (production committed)
 *  PART CLOSED         → completed    (some output already produced)
 *  ISSUED              → completed    (materials issued, batch executed)
 *  PARTIAL ALLOCATED   → pending-lock (materials being allocated)
 *  NEW                 → scheduled    (planned but not yet locked in)
 *
 * Anything whose ENDDATE is in the past is forced to 'completed'.
 */
function mapStatus(sapStatus: string, endDate: Date | null): BatchStatus {
  const now = Date.now();
  if (endDate && new Date(endDate).getTime() < now) {
    return "completed";
  }
  switch ((sapStatus ?? "").toUpperCase().trim()) {
    case "RELEASED":
      return "locked";
    case "PART CLOSED":
    case "ISSUED":
      return "completed";
    case "PARTIAL ALLOCATED":
      return "pending-lock";
    case "NEW":
    default:
      return "scheduled";
  }
}

function brandFromCardName(name: string | null | undefined): string {
  if (!name) return "";
  // Strip leading "FG, " / "Bulk, " etc and use the second segment if available
  return name;
}

function mapRow(row: ScheduleRow): BatchEntry {
  const fillDate = new Date(row.FillDate);
  // If we don't have a compound row, fall back to fill date so the column
  // isn't empty (typical for assembly-only / packaging-only runs).
  const compoundDate = row.CompoundDate
    ? new Date(row.CompoundDate)
    : fillDate;

  const status = mapStatus(row.Status, row.EndDate);
  const productName = cleanItemName(row.ItemName, row.ItemKey);

  return {
    id: `bmm-${row.BatchNo}`,
    compoundDate,
    fillDate,
    yield: Number(row.Yield ?? 0),
    brand: brandFromCardName(""), // brand isn't carried by the row; portal scopes by user
    productType: row.Unit ?? "",
    productName,
    batchNumber: row.SuperBatchNo ?? row.BatchNo,
    salesOrder: row.SONumber ?? undefined,
    purchaseOrder: row.ClientPO ?? undefined,
    dueDate: row.ReqShipDate
      ? new Date(row.ReqShipDate)
      : row.SODueDate
        ? new Date(row.SODueDate)
        : undefined,
    status,
    // Without an audit trail we don't know exactly when a batch was locked;
    // for non-locked batches we expose the compound start as the planned
    // lock-by date so the UI can render "Will lock by ..." consistently.
    lockDate: status === "locked" ? compoundDate : undefined,
    itemKey: row.ItemKey,
  };
}

export async function getAzureBatchEntries(
  cardCode: string
): Promise<BatchEntry[]> {
  const rows = await fetchRows(cardCode);
  return rows.map(mapRow);
}
