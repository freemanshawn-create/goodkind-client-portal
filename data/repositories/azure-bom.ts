/**
 * Azure SQL-backed BOM + component status for production batches.
 *
 * This mirrors Goodkind's "Batch Component Status" semantic-layer query: a
 * time-phased net-requirements (MRP-style) calculation rather than a naive
 * point-in-time snapshot. For each client-supplied component (item code
 * `20-<BRAND>-…`) we project a running on-hand balance across the next 90 days,
 * netting batch demand against current stock and incoming POs in date order.
 *
 * Why not the standard SAP tables: on-hand is read from @BMM_BINDETAIL (the
 * actual bin quantities), NOT OITW — OITW does not hold the correct on-hand for
 * this setup. And because the balance is cumulative across all batches in the
 * window, a component consumed by an earlier batch is no longer "available" to a
 * later one (the old OITW snapshot double-counted it against every batch).
 *
 * Per-batch component status (matches the semantic-layer CASE):
 *   - none    (Red, "Short")    : projected balance after this batch < 0
 *   - inbound (Orange, "Incoming"): balance >= 0 only because an incoming PO is
 *                                   counted; demand-only balance would be short
 *   - on-hand (Green, "Covered"): balance >= 0 on current stock alone
 *
 * Scope: components are scoped by BRAND via the 20-<BRAND> item-code prefix, so
 * brandCodes is REQUIRED — with none we return nothing rather than leak another
 * client's components.
 *
 * This matches the canonical "Batch Component Status" query: same demand/supply
 * event set, same 90-day window applied before the running sum
 * (BETWEEN GETDATE() AND DATEADD(day, 90, GETDATE())), same partition/order, and
 * the same open-PO predicate (LineStatus='O' only). Minor, non-balance-affecting
 * differences from the literal source:
 *   - On-hand totals come from a separate keyed CTE joined once, avoiding the
 *     @BMM_BINDETAIL row fan-out of the inline version (same OH value).
 *   - A balance of exactly 0 is treated as covered (>= 0); the source CASE
 *     leaves an exact-0 balance unclassified. Does not occur in practice.
 */

import { query, raw } from "@/lib/azure-db";
import { componentBrandFilter } from "@/data/repositories/item-filters";
import type { BatchEntry, BomItem, BomInventoryStatus } from "@/data/types";

const SCHEMA = raw("GKCO_PROD");

interface ComponentStatusRow {
  BatchNo: string;
  ItemCode: string;
  ClientCode: string | null;
  ItemDesc: string | null;
  RequiredQty: number;
  OnHand: number;
  InboundQty: number;
  Balance: number;
  CheckBalance: number;
  EarliestPo: string | null;
  EarliestDate: Date | null;
}

/**
 * Run the time-phased component-status query for a client's brand(s). Returns
 * one row per (batch, component) demand event in the next 90 days, annotated
 * with its projected running balance.
 */
async function fetchComponentStatus(
  brandCodes: string[]
): Promise<ComponentStatusRow[]> {
  const ohFilter = componentBrandFilter("bd.U_ITEMCODE", brandCodes);
  const demandFilter = componentBrandFilter("i.U_ITEMCODE", brandCodes);
  const supplyFilter = componentBrandFilter("p.ItemCode", brandCodes);
  const incFilter = componentBrandFilter("p.ItemCode", brandCodes);

  return query<ComponentStatusRow>`
    WITH oh AS (
      -- Actual on-hand from bin detail (NOT OITW), summed across bins.
      SELECT bd.U_ITEMCODE AS ItemCode, SUM(bd.U_TOTALQTY) AS OnHand
      FROM ${SCHEMA}.[@BMM_BINDETAIL] bd
      WHERE ${ohFilter}
      GROUP BY bd.U_ITEMCODE
    ),
    incoming AS (
      -- Open inbound POs landing within the same 90-day window the balance
      -- nets over (matches the canonical query: LineStatus='O', no cancel test).
      SELECT p.ItemCode,
             SUM(p.InvQty)     AS InboundQty,
             MIN(p.ShipDate)   AS EarliestDate,
             MIN(CAST(h.DocNum AS nvarchar(50))) AS EarliestPo
      FROM ${SCHEMA}.POR1 p
      INNER JOIN ${SCHEMA}.OPOR h ON h.DocEntry = p.DocEntry
      WHERE p.LineStatus = 'O'
        AND p.ShipDate BETWEEN GETDATE() AND DATEADD(day, 90, GETDATE())
        AND ${incFilter}
      GROUP BY p.ItemCode
    ),
    events AS (
      -- Demand: each batch's component requirement (negative change).
      SELECT m.U_SCHEDULEDSTARTDATE       AS EventDate,
             m.U_BATCHNO                  AS BatchNo,
             i.U_ITEMCODE                 AS ItemCode,
             CAST(i.U_STDQTY AS float)     AS ReqQty,
             CAST(i.U_STDQTY AS float) * -1 AS ChangeVal,
             CAST(i.U_STDQTY AS float) * -1 AS DemandVal
      FROM ${SCHEMA}.[@BMM_PNMAST] m
      INNER JOIN ${SCHEMA}.[@BMM_PNITEM] i ON m.DocEntry = i.DocEntry
      WHERE m.U_BATCHSTATUS IN (1, 2, 3, 4)
        AND ${demandFilter}
      UNION ALL
      -- Supply: incoming PO quantity (positive change, no demand component).
      SELECT p.ShipDate,
             CAST(h.DocNum AS nvarchar(50)),
             p.ItemCode,
             0,
             CAST(p.InvQty AS float),
             0
      FROM ${SCHEMA}.POR1 p
      INNER JOIN ${SCHEMA}.OPOR h ON h.DocEntry = p.DocEntry
      WHERE p.LineStatus = 'O'
        AND ${supplyFilter}
    ),
    running AS (
      -- Cumulative balances per component in date order. The 90-day window is
      -- applied HERE (before the window function), exactly as the canonical
      -- query does, so the running balance nets only in-window events. On the
      -- same date, supply (DemandVal = 0) is counted before demand (< 0).
      SELECT e.BatchNo, e.ItemCode, e.ReqQty, e.EventDate, e.DemandVal,
             SUM(e.ChangeVal) OVER (
               PARTITION BY e.ItemCode
               ORDER BY e.EventDate, e.DemandVal DESC, e.BatchNo
               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
             ) AS CumChange,
             SUM(e.DemandVal) OVER (
               PARTITION BY e.ItemCode
               ORDER BY e.EventDate, e.DemandVal DESC, e.BatchNo
               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
             ) AS CumDemand
      FROM events e
      WHERE e.EventDate BETWEEN GETDATE() AND DATEADD(day, 90, GETDATE())
    )
    SELECT
      r.BatchNo                              AS BatchNo,
      r.ItemCode                             AS ItemCode,
      itm.U_BPREF                            AS ClientCode,
      itm.ItemName                           AS ItemDesc,
      r.ReqQty                               AS RequiredQty,
      ISNULL(oh.OnHand, 0)                   AS OnHand,
      ISNULL(inc.InboundQty, 0)              AS InboundQty,
      ISNULL(oh.OnHand, 0) + r.CumChange     AS Balance,
      ISNULL(oh.OnHand, 0) + r.CumDemand     AS CheckBalance,
      inc.EarliestPo                         AS EarliestPo,
      inc.EarliestDate                       AS EarliestDate
    FROM running r
    LEFT JOIN oh        ON oh.ItemCode  = r.ItemCode
    LEFT JOIN incoming inc ON inc.ItemCode = r.ItemCode
    LEFT JOIN ${SCHEMA}.OITM itm ON itm.ItemCode = r.ItemCode
    WHERE r.DemandVal < 0   -- keep only demand (batch) rows; supply rows just fed the balance
    ORDER BY r.ItemCode, r.EventDate
  `;
}

/**
 * Drop the leading "PKG," class label, and drop a following brand-name segment
 * ONLY when it matches one of the client's known brand names — so genuine
 * description text is never chopped. Examples (brand "Dr. Squatch"):
 *   "PKG, Dr. Squatch, Body Lotion 10oz"      -> "Body Lotion 10oz"
 *   "PKG, Inner for Wide Stick, Deodorant..." -> "Inner for Wide Stick, Deodorant..."
 * Falls back to the code when there's no description.
 */
function cleanPartName(
  desc: string | null,
  fallback: string,
  brandNames: string[]
): string {
  if (!desc) return fallback;
  let s = desc.replace(/^PKG,\s*/i, "").trim();

  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, "");
  const names = brandNames.map(norm).filter(Boolean);
  const comma = s.indexOf(",");
  if (names.length && comma > -1 && names.includes(norm(s.slice(0, comma)))) {
    s = s.slice(comma + 1).trim();
  }
  return s;
}

/** Map the projected balances to the portal's three-state status. */
function statusFor(balance: number, checkBalance: number): BomInventoryStatus {
  if (balance < 0) return "none"; // short even with incoming PO
  if (checkBalance < 0) return "inbound"; // covered only by an incoming PO
  return "on-hand"; // covered on current stock
}

/**
 * Component status for the given batches, scoped by brand. Returns [] when no
 * brand codes are configured (cannot scope safely). Rows are matched to the
 * supplied batches by batch number; batches outside the 90-day demand window
 * (e.g. completed/past batches) simply have no component rows.
 */
export async function getAzureBomItemsForBatches(
  batches: Pick<BatchEntry, "id" | "batchNumber">[],
  brandCodes: string[] | undefined,
  brandNames: string[] | undefined
): Promise<BomItem[]> {
  const codes = (brandCodes ?? []).filter(Boolean);
  if (codes.length === 0) return [];
  if (batches.length === 0) return [];

  const names = (brandNames ?? []).filter(Boolean);

  const rows = await fetchComponentStatus(codes);

  // Index displayed batches by batch number for fan-out (a batch number can in
  // principle map to more than one displayed entry).
  const batchesByNo = new Map<string, string[]>();
  for (const b of batches) {
    if (!b.batchNumber) continue;
    const arr = batchesByNo.get(b.batchNumber) ?? [];
    arr.push(b.id);
    batchesByNo.set(b.batchNumber, arr);
  }

  const result: BomItem[] = [];
  for (const row of rows) {
    const batchIds = batchesByNo.get(row.BatchNo);
    if (!batchIds) continue; // demand row for a batch we're not displaying

    const required = Number(row.RequiredQty);
    const onHand = Number(row.OnHand);
    const inbound = Number(row.InboundQty);
    const balance = Number(row.Balance);
    const inventoryStatus = statusFor(balance, Number(row.CheckBalance));

    for (const batchId of batchIds) {
      result.push({
        id: `bom-${batchId}-${row.ItemCode}`,
        batchId,
        partName: cleanPartName(row.ItemDesc, row.ItemCode, names),
        gkcItemCode: row.ItemCode,
        clientItemCode: row.ClientCode ?? "",
        quantityRequired: required,
        quantityOnHand: onHand,
        quantityInbound: inbound,
        projectedBalance: balance,
        inventoryStatus,
        poNumber:
          inventoryStatus === "inbound" && row.EarliestPo
            ? String(row.EarliestPo)
            : undefined,
        expectedDate:
          inventoryStatus === "inbound" && row.EarliestDate
            ? new Date(row.EarliestDate)
            : undefined,
      });
    }
  }
  return result;
}
