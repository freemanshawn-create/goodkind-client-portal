/**
 * Azure SQL-backed Purchase Orders repository.
 *
 * The portal's "Purchase Orders" tab shows the client's orders to Goodkind,
 * which are recorded in GKC's SAP B1 as Sales Orders (ORDR + RDR1). The client's
 * own PO # is ORDR.NumAtCard; GKC's SO # is ORDR.DocNum.
 *
 * This mirrors the canonical semantic-layer query: one row per order LINE
 * (ORDR × RDR1 × OITM), excluding raw-material (10-) and packaging (20-) lines,
 * with the line ship date as the due date and the item master supplying the
 * client part code (U_BPREF) and description.
 */

import { query, raw } from "@/lib/azure-db";
import {
  excludeMaterialsFilter,
  brandCodeFilter,
} from "@/data/repositories/item-filters";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/data/types";

const SCHEMA = raw("GKCO_PROD");

interface OrderLineRow {
  DocEntry: number;
  LineNum: number;
  DocNum: number;
  NumAtCard: string | null;
  DocDate: Date | null;
  CloseDate: Date | null;
  ShipDate: Date | null;
  Quantity: number;
  OpenQty: number;
  UnitMsr: string | null;
  ProductCode: string | null;
  ProductName: string | null;
}

/**
 * Fetch order LINES for a customer CardCode at the given document status,
 * excluding materials/packaging and (optionally) scoping to brand codes.
 */
async function fetchOrderLines(
  cardCode: string,
  status: "O" | "C",
  brandCodes?: string[]
): Promise<OrderLineRow[]> {
  const noMaterials = excludeMaterialsFilter("l.ItemCode");
  const brandFilter = brandCodeFilter("l.ItemCode", brandCodes);

  return query<OrderLineRow>`
    SELECT
      o.DocEntry,
      l.LineNum,
      o.DocNum,
      o.NumAtCard,
      o.DocDate,
      o.UpdateDate AS CloseDate,
      l.ShipDate,
      l.Quantity,
      l.OpenQty,
      l.unitMsr      AS UnitMsr,
      itm.U_BPREF    AS ProductCode,
      itm.ItemName   AS ProductName
    FROM ${SCHEMA}.ORDR o
    INNER JOIN ${SCHEMA}.RDR1 l   ON o.DocEntry = l.DocEntry
    INNER JOIN ${SCHEMA}.OITM itm ON l.ItemCode = itm.ItemCode
    WHERE o.CardCode  = ${cardCode}
      AND o.DocStatus = ${status}
      AND o.CANCELED  = 'N'
      AND ${noMaterials}
      AND ${brandFilter}
    ORDER BY o.DocNum DESC, l.ShipDate
  `;
}

/**
 * Strip the "FG, <Brand>, " prefix from SAP item descriptions so the portal
 * shows just the product, e.g.
 *   "FG, Dr. Squatch, Fresh Falls Lotion, US, Retail, 10 fl oz, v2"
 *   → "Fresh Falls Lotion, US, Retail, 10 fl oz, v2"
 */
function cleanProductName(raw: string | null): string {
  if (!raw) return "";
  return raw.replace(/^FG,\s*[^,]+,\s*/i, "").trim();
}

/** SAP sales unit is per-line; normalize to CASE vs EACH for display. */
function mapSalesUnit(unitMsr: string | null): string {
  return (unitMsr ?? "").trim().toUpperCase() === "CASE" ? "CASE" : "EACH";
}

function mapRow(row: OrderLineRow, status: PurchaseOrderStatus): PurchaseOrder {
  return {
    id: `so-${row.DocEntry}-${row.LineNum}`,
    poNumber: row.NumAtCard ?? "",
    soNumber: String(row.DocNum),
    productCode: row.ProductCode ?? "",
    productName: cleanProductName(row.ProductName),
    postingDate: row.DocDate ? new Date(row.DocDate) : undefined,
    dueDate: row.ShipDate ? new Date(row.ShipDate) : undefined,
    orderedQuantity: Number(row.Quantity ?? 0),
    remainingQuantity: Number(row.OpenQty ?? 0),
    salesUnit: mapSalesUnit(row.UnitMsr),
    status,
    completedDate:
      status === "completed" && row.CloseDate
        ? new Date(row.CloseDate)
        : undefined,
  };
}

export async function getAzureOpenPurchaseOrders(
  cardCode: string,
  brandCodes?: string[]
): Promise<PurchaseOrder[]> {
  const rows = await fetchOrderLines(cardCode, "O", brandCodes);
  return rows.map((r) => mapRow(r, "open"));
}

export async function getAzureCompletedPurchaseOrders(
  cardCode: string,
  brandCodes?: string[]
): Promise<PurchaseOrder[]> {
  const rows = await fetchOrderLines(cardCode, "C", brandCodes);
  // Filter to past 12 months by close/update date
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  return rows
    .map((r) => mapRow(r, "completed"))
    .filter((po) => !po.completedDate || po.completedDate >= cutoff);
}
