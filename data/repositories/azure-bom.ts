/**
 * Azure SQL-backed BOM + inventory status for production batches.
 *
 * For each finished-good ItemKey we:
 *   1. Find the active BOM (latest @BMM_BOM revision)
 *   2. Pull its components (@BMM_BOMITEM, U_LINETYPE=1 = material)
 *   3. Filter to "client-provided" packaging (PKG, ... descriptions)
 *   4. Roll up OITW.OnHand / OnOrder per component
 *
 * Inventory status:
 *   - on-hand : OnHand >= required
 *   - inbound : OnHand + OnOrder >= required (a PO is in-flight)
 *   - none    : neither
 */

import { query, raw } from "@/lib/azure-db";
import type { BatchEntry, BomItem, BomInventoryStatus } from "@/data/types";

const SCHEMA = raw("GKCO_PROD");

interface BomLineRow {
  FgItemKey: string;
  LineId: number;
  ItemCode: string;
  ItemDesc: string;
  QtyPerFg: number;
  DisplayUom: string | null;
  OnHand: number;
  OnOrder: number;
  EarliestPoNum: number | null;
  EarliestPoDate: Date | null;
}

/**
 * Fetch all client-provided BOM lines (with rolled-up inventory) for the
 * given finished-good item codes. Returns one row per (FG, component).
 */
async function fetchBomLines(itemKeys: string[]): Promise<BomLineRow[]> {
  if (itemKeys.length === 0) return [];

  // Build inline list: SAP doesn't accept TVPs through mssql cleanly here and
  // these are item codes from our own data — safe to inline as quoted literals.
  const inList = itemKeys
    .map((k) => "'" + k.replace(/'/g, "''") + "'")
    .join(",");

  return query<BomLineRow>`
    WITH activeBOMs AS (
      -- Pick the most recent BOM revision per FG (highest Code as proxy).
      -- U_STATUS=4 is "active" in this BMM setup; older revs are 6.
      SELECT b.U_FGCODE, MAX(b.Code) AS BomCode
      FROM ${SCHEMA}.[@BMM_BOM] b
      WHERE b.U_FGCODE IN (${raw(inList)})
        AND b.U_STATUS = 4
      GROUP BY b.U_FGCODE
    ),
    inv AS (
      -- Roll up OITW across all warehouses
      SELECT ItemCode,
             SUM(OnHand)  AS OnHand,
             SUM(OnOrder) AS OnOrder
      FROM ${SCHEMA}.OITW
      GROUP BY ItemCode
    ),
    earliestPo AS (
      -- Earliest open inbound PO per component
      SELECT p.ItemCode,
             MIN(h.DocDueDate) AS DueDate,
             MIN(h.DocNum)     AS DocNum
      FROM ${SCHEMA}.POR1 p
      INNER JOIN ${SCHEMA}.OPOR h ON h.DocEntry = p.DocEntry
      WHERE p.LineStatus = 'O' AND h.DocStatus = 'O' AND h.CANCELED = 'N'
      GROUP BY p.ItemCode
    )
    SELECT
      ab.U_FGCODE             AS FgItemKey,
      bi.U_LINEID             AS LineId,
      bi.U_ITEMCODE           AS ItemCode,
      bi.U_ITEMDESC           AS ItemDesc,
      bi.U_QTYINSTOCKUOM      AS QtyPerFg,
      bi.U_DISPLAYUOM         AS DisplayUom,
      ISNULL(inv.OnHand, 0)   AS OnHand,
      ISNULL(inv.OnOrder, 0)  AS OnOrder,
      ep.DocNum               AS EarliestPoNum,
      ep.DueDate              AS EarliestPoDate
    FROM activeBOMs ab
    INNER JOIN ${SCHEMA}.[@BMM_BOMITEM] bi ON bi.Code = CAST(ab.BomCode AS nvarchar(50))
    LEFT JOIN inv          ON inv.ItemCode = bi.U_ITEMCODE
    LEFT JOIN earliestPo ep ON ep.ItemCode = bi.U_ITEMCODE
    WHERE bi.U_LINETYPE = 1                  -- material lines only
      AND bi.U_ITEMDESC LIKE 'PKG,%'         -- client-provided packaging
    ORDER BY ab.U_FGCODE, bi.U_SEQUENCENUM
  `;
}

/**
 * Strip the "PKG, Dr. Squatch, " prefix and trim trailing variant info so the
 * portal shows readable part names like "Body Lotion Bottle 10oz Tan V3".
 */
function cleanPartName(desc: string): string {
  // PKG, <Brand>, <body...>  -> <body>
  // PKG, <body...>           -> <body>
  return desc
    .replace(/^PKG,\s*[^,]+,\s*/i, "")
    .replace(/^PKG,\s*/i, "")
    .trim();
}

function statusFor(
  required: number,
  onHand: number,
  onOrder: number
): BomInventoryStatus {
  if (onHand >= required) return "on-hand";
  if (onHand + onOrder >= required) return "inbound";
  return "none";
}

export async function getAzureBomItemsForBatches(
  batches: Pick<BatchEntry, "id" | "itemKey" | "yield">[]
): Promise<BomItem[]> {
  // Collect distinct itemKeys with at least one batch
  const itemKeys = Array.from(
    new Set(batches.map((b) => b.itemKey).filter((k): k is string => !!k))
  );
  if (itemKeys.length === 0) return [];

  const bomLines = await fetchBomLines(itemKeys);

  // Index lines by FG ItemKey for quick fan-out per batch
  const byItemKey = new Map<string, BomLineRow[]>();
  for (const l of bomLines) {
    const arr = byItemKey.get(l.FgItemKey) ?? [];
    arr.push(l);
    byItemKey.set(l.FgItemKey, arr);
  }

  const result: BomItem[] = [];
  for (const batch of batches) {
    if (!batch.itemKey) continue;
    const lines = byItemKey.get(batch.itemKey) ?? [];
    for (const line of lines) {
      const required = Number(line.QtyPerFg) * Number(batch.yield);
      const onHand = Number(line.OnHand);
      const onOrder = Number(line.OnOrder);
      const inventoryStatus = statusFor(required, onHand, onOrder);
      result.push({
        id: `bom-${batch.id}-${line.LineId}`,
        batchId: batch.id,
        partName: cleanPartName(line.ItemDesc),
        quantityRequired: required,
        quantityOnHand: onHand,
        quantityInbound: onOrder,
        inventoryStatus,
        poNumber:
          inventoryStatus === "inbound" && line.EarliestPoNum
            ? String(line.EarliestPoNum)
            : undefined,
        expectedDate:
          inventoryStatus === "inbound" && line.EarliestPoDate
            ? new Date(line.EarliestPoDate)
            : undefined,
      });
    }
  }
  return result;
}
