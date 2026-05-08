/**
 * Azure SQL-backed Purchase Orders repository.
 *
 * Maps SAP B1 Sales Orders (ORDR + RDR1) to the portal's PurchaseOrder type.
 * From the client's perspective, their PO to GKC is recorded in GKC's SAP as
 * a Sales Order, with the client's PO # stored in ORDR.NumAtCard and GKC's
 * SO # in ORDR.DocNum.
 */

import { query, raw } from "@/lib/azure-db";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/data/types";

const SCHEMA = raw("GKCO_PROD");

interface OrdrRow {
  DocEntry: number;
  DocNum: number;
  NumAtCard: string | null;
  CardCode: string;
  CardName: string;
  CardName2: string;
  DocDate: Date;
  DocDueDate: Date | null;
  DocStatus: string; // 'O' = Open, 'C' = Closed
  CloseDate: Date | null;
  ProductName: string | null;
  TotalQty: number;
  DeliveredQty: number;
  RemainingQty: number;
}

/**
 * Fetch SAP Sales Orders for a given customer CardCode, aggregating line totals.
 * Uses a CTE to roll up RDR1 lines into per-SO totals and pick a representative
 * product name (first non-empty line description).
 */
async function fetchOrders(
  cardCode: string,
  status: "O" | "C"
): Promise<OrdrRow[]> {
  // Tagged-template parameterizes cardCode and status safely
  const rows = await query<OrdrRow>`
    WITH lines AS (
      SELECT
        l.DocEntry,
        SUM(l.Quantity)    AS TotalQty,
        SUM(l.DelivrdQty)  AS DeliveredQty,
        SUM(l.OpenQty)     AS RemainingQty,
        MIN(CASE WHEN l.Dscription IS NOT NULL AND l.Dscription <> '' THEN l.LineNum END) AS FirstLineNum
      FROM ${SCHEMA}.RDR1 l
      GROUP BY l.DocEntry
    ),
    firstLine AS (
      SELECT l.DocEntry, l.Dscription
      FROM ${SCHEMA}.RDR1 l
      INNER JOIN lines ON lines.DocEntry = l.DocEntry AND lines.FirstLineNum = l.LineNum
    )
    SELECT
      o.DocEntry, o.DocNum, o.NumAtCard, o.CardCode, o.CardName,
      o.DocDate, o.DocDueDate, o.DocStatus,
      o.UpdateDate AS CloseDate,
      f.Dscription AS ProductName,
      ISNULL(lines.TotalQty, 0)     AS TotalQty,
      ISNULL(lines.DeliveredQty, 0) AS DeliveredQty,
      ISNULL(lines.RemainingQty, 0) AS RemainingQty
    FROM ${SCHEMA}.ORDR o
    LEFT JOIN lines     ON lines.DocEntry     = o.DocEntry
    LEFT JOIN firstLine f ON f.DocEntry        = o.DocEntry
    WHERE o.CardCode  = ${cardCode}
      AND o.DocStatus = ${status}
      AND o.CANCELED  = 'N'
    ORDER BY o.DocDate DESC
  `;
  return rows;
}

/**
 * Strip the "FG, <Brand>, " prefix from SAP item descriptions so the portal
 * shows just the product name, e.g.
 *   "FG, Dr. Squatch, Fresh Falls Lotion, US, Retail, 10 fl oz, v2"
 *   → "Fresh Falls Lotion, US, Retail, 10 fl oz, v2"
 */
function cleanProductName(raw: string | null): string {
  if (!raw) return "";
  return raw.replace(/^FG,\s*[^,]+,\s*/i, "").trim();
}

function mapRow(row: OrdrRow, status: PurchaseOrderStatus): PurchaseOrder {
  return {
    id: `so-${row.DocEntry}`,
    poNumber: row.NumAtCard ?? "",
    soNumber: String(row.DocNum),
    brand: row.CardName,
    productName: cleanProductName(row.ProductName),
    dueDate: row.DocDueDate ? new Date(row.DocDueDate) : undefined,
    totalQuantity: Number(row.TotalQty),
    deliveredQuantity: Number(row.DeliveredQty),
    remainingQuantity: Number(row.RemainingQty),
    status,
    completedDate:
      status === "completed" && row.CloseDate
        ? new Date(row.CloseDate)
        : undefined,
  };
}

export async function getAzureOpenPurchaseOrders(
  cardCode: string
): Promise<PurchaseOrder[]> {
  const rows = await fetchOrders(cardCode, "O");
  return rows.map((r) => mapRow(r, "open"));
}

export async function getAzureCompletedPurchaseOrders(
  cardCode: string
): Promise<PurchaseOrder[]> {
  const rows = await fetchOrders(cardCode, "C");
  // Filter to past 12 months by close/update date
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  return rows
    .map((r) => mapRow(r, "completed"))
    .filter((po) => !po.completedDate || po.completedDate >= cutoff);
}
