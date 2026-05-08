/**
 * Sample @BMM_APSSCHEDULING data to confirm column meanings
 * Run: npx tsx scripts/sample-schedule.ts
 */
import { config } from "dotenv";
import sql from "mssql";

config({ path: ".env.local" });

const SCHEMA = "GKCO_PROD";

async function main() {
  const cs = process.env.AZURE_SQL_CONNECTION_STRING!;
  const pool = new sql.ConnectionPool(cs);
  await pool.connect();

  // Distinct CUSTNMBR values
  console.log("=== Distinct CUSTNMBR values in APSSCHEDULING ===");
  const cust = await pool.request().query(`
    SELECT DISTINCT CUSTNMBR, COUNT(*) AS rows
    FROM ${SCHEMA}.[@BMM_APSSCHEDULING]
    GROUP BY CUSTNMBR
    ORDER BY rows DESC
  `);
  console.table(cust.recordset);

  // Distinct STATUS values
  console.log("\n=== Distinct STATUS values ===");
  const status = await pool.request().query(`
    SELECT DISTINCT STATUS, COUNT(*) AS rows
    FROM ${SCHEMA}.[@BMM_APSSCHEDULING]
    GROUP BY STATUS
    ORDER BY rows DESC
  `);
  console.table(status.recordset);

  // Distinct BATCHTYPE / LINESTATUS / SCHEDULED
  console.log("\n=== Distinct BATCHTYPE values ===");
  const bt = await pool.request().query(`
    SELECT DISTINCT BATCHTYPE, COUNT(*) AS rows
    FROM ${SCHEMA}.[@BMM_APSSCHEDULING]
    GROUP BY BATCHTYPE
    ORDER BY rows DESC
  `);
  console.table(bt.recordset);

  console.log("\n=== Distinct LINESTATUS values ===");
  const ls = await pool.request().query(`
    SELECT DISTINCT LINESTATUS, COUNT(*) AS rows
    FROM ${SCHEMA}.[@BMM_APSSCHEDULING]
    GROUP BY LINESTATUS
    ORDER BY rows DESC
  `);
  console.table(ls.recordset);

  console.log("\n=== Distinct PROCESSCELL values (top 20) ===");
  const pc = await pool.request().query(`
    SELECT TOP 20 PROCESSCELL, COUNT(*) AS rows
    FROM ${SCHEMA}.[@BMM_APSSCHEDULING]
    GROUP BY PROCESSCELL
    ORDER BY rows DESC
  `);
  console.table(pc.recordset);

  // Sample 5 Dr. Squatch upcoming batches
  console.log("\n=== Sample Dr. Squatch batches (most recent) ===");
  const sample = await pool.request().query(`
    SELECT TOP 10
      BATCHNO, BATCHTYPE, ITEMKEY, LOCATION, FORMULAID,
      SCHEDULED, STARTDATE, ENDDATE, QUANTITY, UNIT,
      PROCESSCELL, STATUS, LINESTATUS, REQSHIPDATE,
      SONUMBER, CUSTNMBR, NOTES, PARENTBATCH, SUPERBATCHNO
    FROM ${SCHEMA}.[@BMM_APSSCHEDULING]
    WHERE CUSTNMBR LIKE '%C0006%' OR CUSTNMBR LIKE '%Squatch%'
    ORDER BY STARTDATE DESC
  `);
  console.log(JSON.stringify(sample.recordset, null, 2));

  // Try matching by SONUMBER → ORDR.DocNum to see if DocNum links match
  console.log("\n=== Matching APSSCHEDULING.SONUMBER to ORDR.DocNum (sample) ===");
  const linked = await pool.request().query(`
    SELECT TOP 5
      a.BATCHNO, a.SONUMBER, o.DocNum, o.NumAtCard, o.CardCode, o.CardName
    FROM ${SCHEMA}.[@BMM_APSSCHEDULING] a
    LEFT JOIN ${SCHEMA}.ORDR o ON TRY_CAST(a.SONUMBER AS INT) = o.DocNum
    WHERE a.SONUMBER IS NOT NULL AND a.SONUMBER <> ''
    ORDER BY a.STARTDATE DESC
  `);
  console.table(linked.recordset);

  await pool.close();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
