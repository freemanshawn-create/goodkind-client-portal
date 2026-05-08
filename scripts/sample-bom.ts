/**
 * Sample BOM + inventory + open PO data for one finished-good item.
 * Goal: figure out how to render BOM rows with on-hand / inbound / none status.
 */
import { config } from "dotenv";
import sql from "mssql";

config({ path: ".env.local" });

async function main() {
  const cs = process.env.AZURE_SQL_CONNECTION_STRING!;
  const pool = new sql.ConnectionPool(cs);
  await pool.connect();

  // Pick a Dr Squatch FG item
  const ITEM = "90-DRS-000780-04"; // Wood Barrel Bourbon Lotion FG

  console.log(`=== Looking up BOM for ${ITEM} ===\n`);

  console.log("--- @BMM_BOM rows for this FG ---");
  const bomHdr = await pool.request().query(`
    SELECT TOP 5 Code, U_FGCODE, U_FGWHSE, U_REVISIONNO, U_STATUS, U_BOMTYPE,
                 U_FORMULAID, U_FILLLEVEL, U_FILLUNIT, U_EFFECTIVEFROM, U_EFFETIVETO
    FROM GKCO_PROD.[@BMM_BOM]
    WHERE U_FGCODE = '${ITEM}'
    ORDER BY U_EFFECTIVEFROM DESC
  `);
  console.table(bomHdr.recordset);

  if (!bomHdr.recordset.length) {
    console.log("No BOM found");
    await pool.close();
    return;
  }

  const bomCode = bomHdr.recordset[0].Code;
  console.log(`\n--- @BMM_BOMITEM rows for BOM Code=${bomCode} ---`);
  const items = await pool.request().query(`
    SELECT U_LINEID, U_SEQUENCENUM, U_ITEMCODE, U_ITEMDESC, U_QTYINSTOCKUOM,
           U_QTYINDISPLAYUOM, U_DISPLAYUOM, U_STOCKUOM, U_MAKEBUY, U_LINETYPE,
           U_WHSCODE, U_BACKFLUSHWHSE
    FROM GKCO_PROD.[@BMM_BOMITEM]
    WHERE Code = '${bomCode}'
    ORDER BY U_SEQUENCENUM, U_LINEID
  `);
  console.table(items.recordset);

  // Now check inventory + inbound PO for one component
  if (!items.recordset.length) {
    await pool.close();
    return;
  }

  // Use a "Buy" component (raw material / packaging)
  const buyComp = items.recordset.find((i) => i.U_MAKEBUY === "B") ??
    items.recordset[0];
  const compItem = buyComp.U_ITEMCODE;
  console.log(`\n--- Inventory (OITW) for component ${compItem} ---`);
  const inv = await pool.request().query(`
    SELECT WhsCode, OnHand, IsCommited, OnOrder
    FROM GKCO_PROD.OITW
    WHERE ItemCode = '${compItem}'
  `);
  console.table(inv.recordset);

  console.log(`\n--- Open POR1 lines (inbound) for component ${compItem} ---`);
  const por = await pool.request().query(`
    SELECT TOP 10 p.DocEntry, p.LineNum, p.ItemCode, p.OpenQty, p.Quantity,
           p.LineStatus, h.DocNum, h.DocStatus, h.DocDate, h.DocDueDate
    FROM GKCO_PROD.POR1 p
    INNER JOIN GKCO_PROD.OPOR h ON h.DocEntry = p.DocEntry
    WHERE p.ItemCode = '${compItem}' AND p.LineStatus = 'O'
    ORDER BY h.DocDueDate ASC
  `);
  console.table(por.recordset);

  // Also check OITW columns
  console.log("\n--- OITW available columns ---");
  const oitwCols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'GKCO_PROD' AND TABLE_NAME = 'OITW'
      AND COLUMN_NAME IN ('ItemCode','WhsCode','OnHand','IsCommited','OnOrder','U_INTRANSIT')
  `);
  console.table(oitwCols.recordset);

  // OITM relevant fields for "is this client-supplied?"
  console.log("\n--- OITM columns for client/supplier identification ---");
  const oitmCols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'GKCO_PROD' AND TABLE_NAME = 'OITM'
      AND (COLUMN_NAME LIKE '%CARD%' OR COLUMN_NAME LIKE '%BRAND%'
           OR COLUMN_NAME LIKE '%CLIENT%' OR COLUMN_NAME LIKE '%CUST%'
           OR COLUMN_NAME = 'CardCode' OR COLUMN_NAME = 'PrchseItem'
           OR COLUMN_NAME = 'ItmsGrpCod')
    ORDER BY COLUMN_NAME
  `);
  console.table(oitmCols.recordset);

  await pool.close();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
