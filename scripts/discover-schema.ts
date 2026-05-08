/**
 * One-off script to discover the Azure SQL schema.
 * Run with: npx tsx scripts/discover-schema.ts
 */
import { config } from "dotenv";
import sql from "mssql";

config({ path: ".env.local" });

async function main() {
  const cs = process.env.AZURE_SQL_CONNECTION_STRING;
  if (!cs) {
    console.error("AZURE_SQL_CONNECTION_STRING not set");
    process.exit(1);
  }

  console.log("Connecting to Azure SQL...");
  const pool = new sql.ConnectionPool(cs);
  await pool.connect();
  console.log("✓ Connected\n");

  // List all tables grouped by schema
  const tables = await pool.request().query<{
    TABLE_SCHEMA: string;
    TABLE_NAME: string;
    TABLE_TYPE: string;
  }>(`
    SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
    ORDER BY TABLE_SCHEMA, TABLE_NAME
  `);

  console.log(`Found ${tables.recordset.length} tables/views:\n`);
  const bySchema: Record<string, typeof tables.recordset> = {};
  for (const row of tables.recordset) {
    bySchema[row.TABLE_SCHEMA] = bySchema[row.TABLE_SCHEMA] || [];
    bySchema[row.TABLE_SCHEMA].push(row);
  }
  for (const [schema, rows] of Object.entries(bySchema)) {
    console.log(`  [${schema}] (${rows.length})`);
    for (const row of rows) {
      console.log(`    ${row.TABLE_NAME} (${row.TABLE_TYPE})`);
    }
    console.log();
  }

  await pool.close();
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
