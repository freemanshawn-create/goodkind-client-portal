/**
 * Azure SQL-backed Weekly Inventory Walkforward report.
 *
 * For the previous full week (Mon–Sun) this produces, per item, the inventory
 * roll-forward: Opening Balance + Received/Produced/Adjusted/Cycled − Consumed/
 * Scrap/Shipped ± R&D = Ending Balance. Sourced from SAP B1 inventory document
 * tables (goods receipts/issues, deliveries/returns, counts, etc.).
 *
 * Scope: brand-scoped via the client's brand codes (item code contains the
 * code, e.g. "DRS"). Like the schedule, this REQUIRES brandCodes — without it
 * we cannot scope safely and return nothing.
 *
 * Note: this is a heavy multi-union query (~13s). Callers should render a
 * loading state and allow a generous function timeout.
 */

import { query, raw } from "@/lib/azure-db";
import { brandCodeFilter } from "@/data/repositories/item-filters";
import type { InventoryWalkforwardRow } from "@/data/types";

interface WalkforwardDbRow {
  ItemCode: string;
  Sku: string | null;
  Description: string | null;
  OpeningBalance: number;
  ReceivedQuantity: number;
  AdjustedQuantity: number;
  CycledQuantity: number;
  ProducedQuantity: number;
  ConsumedQuantity: number;
  ScrapWarehouse: number;
  ScrapProduction: number;
  ShippedQuantity: number;
  ToFromRnD: number;
  EndingBalance: number;
}

/**
 * The walkforward SQL. The schema (GKCO_PROD) is constant and the brand filter
 * is injected as a sanitized predicate at /*BRAND_FILTER*\/. @StartDate/@EndDate
 * are T-SQL locals (previous Monday / previous Sunday) — distinct from any bound
 * parameters.
 */
const WALKFORWARD_SQL = `
DECLARE @StartDate DATE = DATEADD(wk, DATEDIFF(wk, 0, GETDATE()) - 1, 0); -- previous Monday
DECLARE @EndDate   DATE = DATEADD(dd, -1, DATEADD(wk, DATEDIFF(wk, 0, GETDATE()), 0)); -- previous Sunday

SELECT
    T0."ItemCode" AS "ItemCode",
    T0."U_BPREF" AS "Sku",
    T0."ItemName" AS "Description",
    COALESCE(SUM(T2."Opening Balance"), 0) AS "OpeningBalance",
    COALESCE(SUM(T2."Received Quantity"), 0) AS "ReceivedQuantity",
    COALESCE(SUM(T2."Adjusted Quantity"), 0) AS "AdjustedQuantity",
    COALESCE(SUM(T2."Cycled Quantity"), 0) AS "CycledQuantity",
    COALESCE(SUM(T2."Produced Quantity"), 0) AS "ProducedQuantity",
    COALESCE(SUM("Consumed Quantity"), 0) AS "ConsumedQuantity",
    COALESCE(SUM(T2."Scrap (WH)"), 0) AS "ScrapWarehouse",
    COALESCE(SUM(T2."Scrap (Production)"), 0) AS "ScrapProduction",
    COALESCE(SUM(T2."Shipped Quantity"), 0) AS "ShippedQuantity",
    COALESCE(SUM(T2."To/From R&D"), 0) AS "ToFromRnD",
    COALESCE(SUM(T2."Calaculated Balance"), 0) AS "EndingBalance"
FROM
    GKCO_PROD.OITM T0
LEFT JOIN (
    -- OPENING BALANCE: All transactions BEFORE the @StartDate
    SELECT
        T3."ItemCode" AS "Item Code", T3."ItemName" AS "Item Description", T3."Quantity" AS "Opening Balance", null AS "Received Quantity", null AS "Adjusted Quantity", null AS "Cycled Quantity",
        null AS "Produced Quantity", null AS "Consumed Quantity", null AS "Scrap (WH)", null AS "Scrap (Production)", null AS "Shipped Quantity", null AS "To/From R&D",
        T3."Quantity" AS "Calaculated Balance", null AS " Ending Balance"
    FROM GKCO_PROD.OIQI T2 INNER JOIN GKCO_PROD.IQI1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" < @StartDate
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", T3."InvQty" * -1, null, null, null, null, null, null, null, null, null, T3."InvQty" * -1, null
    FROM GKCO_PROD.OIGE T2 INNER JOIN GKCO_PROD.IGE1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" < @StartDate AND T3."AcctCode" != '131300' AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", T3."InvQty", null, null, null, null, null, null, null, null, null, T3."InvQty", null
    FROM GKCO_PROD.OIGN T2 INNER JOIN GKCO_PROD.IGN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" < @StartDate AND T3."AcctCode" != '131300' AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", T3."InvQty", null, null, null, null, null, null, null, null, null, T3."InvQty", null
    FROM GKCO_PROD.OPDN T2 INNER JOIN GKCO_PROD.PDN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" < @StartDate AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", T3."InvQty" * -1, null, null, null, null, null, null, null, null, null, T3."InvQty" * -1, null
    FROM GKCO_PROD.ODLN T2 INNER JOIN GKCO_PROD.DLN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" < @StartDate AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", T3."InvQty", null, null, null, null, null, null, null, null, null, T3."InvQty", null
    FROM GKCO_PROD.ORDN T2 INNER JOIN GKCO_PROD.RDN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" < @StartDate AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", T3."InvQty" * -1, null, null, null, null, null, null, null, null, null, T3."InvQty" * -1, null
    FROM GKCO_PROD.OIGE T2 INNER JOIN GKCO_PROD.IGE1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" < @StartDate AND T3."AcctCode" = '131300' AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", T3."InvQty", null, null, null, null, null, null, null, null, null, T3."InvQty", null
    FROM GKCO_PROD.OIGN T2 INNER JOIN GKCO_PROD.IGN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" < @StartDate AND T3."AcctCode" = '131300' AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."ItemName", T3."Quantity", null, null, null, null, null, null, null, null, null, T3."Quantity", null
    FROM GKCO_PROD.OIQR T2 INNER JOIN GKCO_PROD.IQR1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" < @StartDate

    -- WALKFORWARD: All transactions BETWEEN @StartDate and @EndDate
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, T3."InvQty", null, null, null, null, null, null, null, null, T3."InvQty", null
    FROM GKCO_PROD.OPDN T2 INNER JOIN GKCO_PROD.PDN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, T3."InvQty" * -1, null, null, null, null, null, null, null, T3."InvQty" * -1, null
    FROM GKCO_PROD.OIGE T2 INNER JOIN GKCO_PROD.IGE1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T3."AcctCode" = '533000' AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, T3."InvQty", null, null, null, null, null, null, null, T3."InvQty", null
    FROM GKCO_PROD.OIGN T2 INNER JOIN GKCO_PROD.IGN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T3."AcctCode" IN ('533000', '532000') AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, T3."InvQty" * -1, null, null, null, null, null, null, T3."InvQty" * -1, null
    FROM GKCO_PROD.OIGE T2 INNER JOIN GKCO_PROD.IGE1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T3."AcctCode" = '534000' AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, T3."InvQty", null, null, null, null, null, null, T3."InvQty", null
    FROM GKCO_PROD.OIGN T2 INNER JOIN GKCO_PROD.IGN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T3."AcctCode" = '534000' AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."ItemName", null, null, null, T3."Quantity", null, null, null, null, null, null, T3."Quantity", null
    FROM GKCO_PROD.OIQR T2 INNER JOIN GKCO_PROD.IQR1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, T3."InvQty" * -1, null, null, null, null, T3."InvQty" * -1, null
    FROM GKCO_PROD.OIGE T2 INNER JOIN GKCO_PROD.IGE1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T3."AcctCode" = '131300' AND T2."CANCELED" = 'N' AND T2."Comments" NOT LIKE '%FG Return%'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, T3."InvQty", null, null, null, null, T3."InvQty", null
    FROM GKCO_PROD.OIGN T2 INNER JOIN GKCO_PROD.IGN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T3."AcctCode" = '131300' AND T2."CANCELED" = 'N' AND T2."Comments" LIKE 'Material Return%'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, T3."InvQty", null, null, null, null, null, T3."InvQty", null
    FROM GKCO_PROD.OIGN T2 INNER JOIN GKCO_PROD.IGN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T3."AcctCode" = '131300' AND T2."CANCELED" = 'N' AND T2."Comments" NOT LIKE 'Material Return%'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, T3."InvQty" * -1, null, null, null, null, null, T3."InvQty" * -1, null
    FROM GKCO_PROD.OIGE T2 INNER JOIN GKCO_PROD.IGE1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T3."AcctCode" = '131300' AND T2."CANCELED" = 'N' AND T2."Comments" LIKE '%FG Return%'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, T3."InvQty" * -1, null, null, null, T3."InvQty" * -1, null
    FROM GKCO_PROD.OIGE T2 INNER JOIN GKCO_PROD.IGE1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T3."AcctCode" = '531000' AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, T3."InvQty", null, null, null, T3."InvQty", null
    FROM GKCO_PROD.OIGN T2 INNER JOIN GKCO_PROD.IGN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T3."AcctCode" = '531000' AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, null, T3."InvQty" * -1, null, null, T3."InvQty" * -1, null
    FROM GKCO_PROD.OIGE T2 INNER JOIN GKCO_PROD.IGE1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T3."AcctCode" IN ('532000', '509400', '509500', '509600', '509900') AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, null, T3."InvQty", null, null, T3."InvQty", null
    FROM GKCO_PROD.OIGN T2 INNER JOIN GKCO_PROD.IGN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T3."AcctCode" IN ('532000', '509400', '509500', '509600', '509900') AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, null, null, T3."InvQty" * -1, null, T3."InvQty" * -1, null
    FROM GKCO_PROD.ODLN T2 INNER JOIN GKCO_PROD.DLN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, null, null, T3."InvQty", null, T3."InvQty", null
    FROM GKCO_PROD.ORDN T2 INNER JOIN GKCO_PROD.RDN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, null, null, null, T3."InvQty" * -1, T3."InvQty" * -1, null
    FROM GKCO_PROD.OIGE T2 INNER JOIN GKCO_PROD.IGE1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T3."AcctCode" IN ('722000', '725000') AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, null, null, null, T3."InvQty", T3."InvQty", null
    FROM GKCO_PROD.OIGN T2 INNER JOIN GKCO_PROD.IGN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" BETWEEN @StartDate AND @EndDate AND T3."AcctCode" IN ('722000', '725000') AND T2."CANCELED" = 'N'

    -- ENDING BALANCE: All transactions UP TO the @EndDate
    UNION ALL
    SELECT T3."ItemCode", T3."ItemName", null, null, null, null, null, null, null, null, null, null, null, T3."Quantity"
    FROM GKCO_PROD.OIQI T2 INNER JOIN GKCO_PROD.IQI1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" <= @EndDate
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, null, null, null, null, null, T3."InvQty" * -1
    FROM GKCO_PROD.OIGE T2 INNER JOIN GKCO_PROD.IGE1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" <= @EndDate AND T3."AcctCode" != '131300' AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, null, null, null, null, null, T3."InvQty"
    FROM GKCO_PROD.OIGN T2 INNER JOIN GKCO_PROD.IGN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" <= @EndDate AND T3."AcctCode" != '131300' AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, null, null, null, null, null, T3."InvQty"
    FROM GKCO_PROD.OPDN T2 INNER JOIN GKCO_PROD.PDN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" <= @EndDate AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, null, null, null, null, null, T3."InvQty" * -1
    FROM GKCO_PROD.ODLN T2 INNER JOIN GKCO_PROD.DLN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" <= @EndDate AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, null, null, null, null, null, T3."InvQty"
    FROM GKCO_PROD.ORDN T2 INNER JOIN GKCO_PROD.RDN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" <= @EndDate AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, null, null, null, null, null, T3."InvQty" * -1
    FROM GKCO_PROD.OIGE T2 INNER JOIN GKCO_PROD.IGE1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" <= @EndDate AND T3."AcctCode" = '131300' AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."Dscription", null, null, null, null, null, null, null, null, null, null, null, T3."InvQty"
    FROM GKCO_PROD.OIGN T2 INNER JOIN GKCO_PROD.IGN1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" <= @EndDate AND T3."AcctCode" = '131300' AND T2."CANCELED" = 'N'
    UNION ALL
    SELECT T3."ItemCode", T3."ItemName", null, null, null, null, null, null, null, null, null, null, null, T3."Quantity"
    FROM GKCO_PROD.OIQR T2 INNER JOIN GKCO_PROD.IQR1 T3 ON T2."DocEntry" = T3."DocEntry"
    WHERE T2."DocDate" <= @EndDate

) T2 ON T0."ItemCode" = T2."Item Code"
WHERE
    /*BRAND_FILTER*/
    AND T0."frozenFor" = 'N'
GROUP BY
    T0."ItemCode",
    T0."U_BPREF",
    T0."ItemName"
ORDER BY
    T0."ItemCode";
`;

function mapRow(r: WalkforwardDbRow): InventoryWalkforwardRow {
  const n = (v: number) => Number(v ?? 0);
  return {
    itemCode: r.ItemCode,
    sku: r.Sku ?? "",
    description: r.Description ?? "",
    openingBalance: n(r.OpeningBalance),
    received: n(r.ReceivedQuantity),
    adjusted: n(r.AdjustedQuantity),
    cycled: n(r.CycledQuantity),
    produced: n(r.ProducedQuantity),
    consumed: n(r.ConsumedQuantity),
    scrapWarehouse: n(r.ScrapWarehouse),
    scrapProduction: n(r.ScrapProduction),
    shipped: n(r.ShippedQuantity),
    toFromRnD: n(r.ToFromRnD),
    endingBalance: n(r.EndingBalance),
  };
}

/** True if the row had any balance or movement in the period (drop dead rows). */
function hasActivity(row: InventoryWalkforwardRow): boolean {
  return (
    row.openingBalance !== 0 ||
    row.endingBalance !== 0 ||
    row.received !== 0 ||
    row.adjusted !== 0 ||
    row.cycled !== 0 ||
    row.produced !== 0 ||
    row.consumed !== 0 ||
    row.scrapWarehouse !== 0 ||
    row.scrapProduction !== 0 ||
    row.shipped !== 0 ||
    row.toFromRnD !== 0
  );
}

/**
 * Run the weekly walkforward for the given brand codes. Returns [] when no
 * brand codes are configured (cannot scope safely).
 */
export async function getAzureWeeklyWalkforward(
  brandCodes: string[] | undefined
): Promise<InventoryWalkforwardRow[]> {
  const codes = (brandCodes ?? []).filter(Boolean);
  if (codes.length === 0) return [];

  const brandFilter = brandCodeFilter('T0."ItemCode"', codes);
  const sql = WALKFORWARD_SQL.replace("/*BRAND_FILTER*/", brandFilter.__raw);

  const rows = await query<WalkforwardDbRow>`${raw(sql)}`;
  return rows.map(mapRow).filter(hasActivity);
}
