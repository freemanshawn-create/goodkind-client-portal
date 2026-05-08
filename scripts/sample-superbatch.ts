/**
 * Look at a single SUPERBATCHNO group to understand how compound + fill rows
 * relate, and how to derive the locked status / lock date.
 */
import { config } from "dotenv";
import sql from "mssql";

config({ path: ".env.local" });

async function main() {
  const cs = process.env.AZURE_SQL_CONNECTION_STRING!;
  const pool = new sql.ConnectionPool(cs);
  await pool.connect();

  // Pick a recent Dr. Squatch SUPERBATCHNO
  const pickRes = await pool.request().query(`
    SELECT TOP 1 SUPERBATCHNO
    FROM GKCO_PROD.[@BMM_APSSCHEDULING]
    WHERE CUSTNMBR = 'C0006' AND SUPERBATCHNO IS NOT NULL AND SUPERBATCHNO <> ''
    ORDER BY STARTDATE DESC
  `);
  const sb = pickRes.recordset[0]?.SUPERBATCHNO;
  console.log(`Sampling SUPERBATCHNO=${sb}\n`);

  const rows = await pool.request().query(`
    SELECT
      BATCHNO, BATCHTYPE, ITEMKEY, PROCESSCELL, SCHEDULED, SCHEDULESEQUENCE,
      STARTDATE, ENDDATE, ORIGINALSTARTDATE, ORIGINALENDDATE,
      QUANTITY, UNIT, BATCHWEIGHT, ORDERWEIGHT,
      STATUS, LINESTATUS, REQSHIPDATE,
      SONUMBER, CUSTNMBR, PARENTBATCH, SUPERBATCHNO, FORMULAID,
      UPDATEDATE, CREATEDATE
    FROM GKCO_PROD.[@BMM_APSSCHEDULING]
    WHERE SUPERBATCHNO = '${sb}'
    ORDER BY SCHEDULESEQUENCE, STARTDATE
  `);
  console.log(JSON.stringify(rows.recordset, null, 2));

  // Also: how does a multi-step run for the same finished good look?
  console.log("\n=== A few more Dr Squatch superbatches and their step counts ===");
  const grouped = await pool.request().query(`
    SELECT TOP 10
      SUPERBATCHNO,
      MAX(ITEMKEY)         AS ItemKey,
      COUNT(*)             AS StepCount,
      STRING_AGG(BATCHTYPE, ',')   AS Types,
      STRING_AGG(PROCESSCELL, ',') AS Cells,
      MIN(STARTDATE) AS FirstStart,
      MAX(ENDDATE)   AS LastEnd,
      MIN(STATUS)    AS Status,
      MAX(SONUMBER)  AS SO
    FROM GKCO_PROD.[@BMM_APSSCHEDULING]
    WHERE CUSTNMBR = 'C0006' AND SUPERBATCHNO IS NOT NULL AND SUPERBATCHNO <> ''
    GROUP BY SUPERBATCHNO
    ORDER BY MIN(STARTDATE) DESC
  `);
  console.table(grouped.recordset);

  // OITM lookup for product description
  console.log("\n=== OITM columns for ItemCode/Name ===");
  const oitmCols = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'GKCO_PROD' AND TABLE_NAME = 'OITM'
      AND COLUMN_NAME IN ('ItemCode','ItemName','frgnName','U_BRAND','U_PRODTYPE','U_PRODUCTCATE')
  `);
  console.table(oitmCols.recordset);

  // Sample an OITM row for one of the items in the schedule
  if (rows.recordset.length > 0) {
    const itemKey = rows.recordset[0].ITEMKEY;
    console.log(`\n=== OITM row for ${itemKey} ===`);
    const item = await pool.request().query(`
      SELECT TOP 1 ItemCode, ItemName
      FROM GKCO_PROD.OITM
      WHERE ItemCode = '${itemKey}'
    `);
    console.table(item.recordset);
  }

  await pool.close();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
