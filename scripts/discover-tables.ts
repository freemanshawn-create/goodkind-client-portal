/**
 * Sample data + column info for the SAP B1 tables we care about.
 * Run with: npx tsx scripts/discover-tables.ts
 */
import { config } from "dotenv";
import sql from "mssql";

config({ path: ".env.local" });

const SCHEMA = "GKCO_PROD";
const CLIENT_CARDCODE = "C0006"; // Dr. Squatch

async function main() {
  const cs = process.env.AZURE_SQL_CONNECTION_STRING!;
  const pool = new sql.ConnectionPool(cs);
  await pool.connect();

  // 1. Confirm Dr. Squatch in OCRD
  console.log("=== OCRD (Business Partners) match for Dr. Squatch ===");
  const card = await pool.request().query(`
    SELECT TOP 5 CardCode, CardName, CardType
    FROM ${SCHEMA}.OCRD
    WHERE CardCode = '${CLIENT_CARDCODE}' OR CardName LIKE '%Squatch%'
  `);
  console.table(card.recordset);

  // 2. ORDR columns (Sales Order header)
  console.log("\n=== ORDR columns (key fields) ===");
  const ordrCols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${SCHEMA}' AND TABLE_NAME = 'ORDR'
      AND COLUMN_NAME IN ('DocEntry','DocNum','DocDate','DocDueDate','CardCode','CardName',
                          'NumAtCard','DocStatus','CANCELED','DocTotal','Comments',
                          'U_ClientPO','U_DueDate','TaxDate','U_GKC_Status')
    ORDER BY COLUMN_NAME
  `);
  console.table(ordrCols.recordset);

  // 3. RDR1 columns (Sales Order line)
  console.log("\n=== RDR1 columns (key fields) ===");
  const rdr1Cols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${SCHEMA}' AND TABLE_NAME = 'RDR1'
      AND COLUMN_NAME IN ('DocEntry','LineNum','ItemCode','Dscription','Quantity',
                          'OpenQty','DelivrdQty','Price','LineTotal','LineStatus',
                          'ShipDate','U_BatchNum')
    ORDER BY COLUMN_NAME
  `);
  console.table(rdr1Cols.recordset);

  // 4. Sample Dr. Squatch Sales Orders
  console.log("\n=== Sample Dr. Squatch Sales Orders (top 3 open) ===");
  const sampleSO = await pool.request().query(`
    SELECT TOP 3
      DocEntry, DocNum, NumAtCard, DocDate, DocDueDate, CardCode, CardName,
      DocStatus, DocTotal
    FROM ${SCHEMA}.ORDR
    WHERE CardCode = '${CLIENT_CARDCODE}'
      AND DocStatus = 'O'
    ORDER BY DocDate DESC
  `);
  console.table(sampleSO.recordset);

  // 5. Sample SO lines for one of those
  if (sampleSO.recordset.length > 0) {
    const docEntry = sampleSO.recordset[0].DocEntry;
    console.log(`\n=== RDR1 lines for SO DocEntry=${docEntry} ===`);
    const lines = await pool.request().query(`
      SELECT LineNum, ItemCode, Dscription, Quantity, OpenQty, LineStatus, ShipDate
      FROM ${SCHEMA}.RDR1
      WHERE DocEntry = ${docEntry}
    `);
    console.table(lines.recordset);
  }

  // 6. Delivery Note schema sanity
  console.log("\n=== ODLN columns (key fields) ===");
  const odlnCols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${SCHEMA}' AND TABLE_NAME = 'ODLN'
      AND COLUMN_NAME IN ('DocEntry','DocNum','DocDate','CardCode','CardName','BaseType','DocTotal')
    ORDER BY COLUMN_NAME
  `);
  console.table(odlnCols.recordset);

  // 7. DLN1 line schema (delivered qty per SO line)
  console.log("\n=== DLN1 columns (key fields) ===");
  const dln1Cols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${SCHEMA}' AND TABLE_NAME = 'DLN1'
      AND COLUMN_NAME IN ('DocEntry','LineNum','ItemCode','Quantity','BaseEntry','BaseType','BaseLine')
    ORDER BY COLUMN_NAME
  `);
  console.table(dln1Cols.recordset);

  // 8. APS Scheduling table for Production Schedule
  console.log("\n=== @BMM_APSSCHEDULING columns ===");
  const apsCols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${SCHEMA}' AND TABLE_NAME = '@BMM_APSSCHEDULING'
    ORDER BY ORDINAL_POSITION
  `);
  console.table(apsCols.recordset);

  // 9. BMM ORDERS - production orders
  console.log("\n=== @BMM_ORDERS columns ===");
  const bmmOrdersCols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${SCHEMA}' AND TABLE_NAME = '@BMM_ORDERS'
    ORDER BY ORDINAL_POSITION
  `);
  console.table(bmmOrdersCols.recordset);

  // 10. BOM tables
  console.log("\n=== @BMM_BOM columns ===");
  const bomCols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${SCHEMA}' AND TABLE_NAME = '@BMM_BOM'
    ORDER BY ORDINAL_POSITION
  `);
  console.table(bomCols.recordset);

  console.log("\n=== @BMM_BOMITEM columns ===");
  const bomItemCols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = '${SCHEMA}' AND TABLE_NAME = '@BMM_BOMITEM'
    ORDER BY ORDINAL_POSITION
  `);
  console.table(bomItemCols.recordset);

  await pool.close();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
