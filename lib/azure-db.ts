import sql from "mssql";

/**
 * Azure SQL Database connection pool.
 *
 * Uses a singleton pattern so the pool is created once and reused across
 * requests. In Next.js dev mode (with hot reload), we store the pool on
 * `globalThis` to prevent creating new pools on every file change.
 *
 * Required env var:
 *   AZURE_SQL_CONNECTION_STRING - full ADO.NET-style connection string, e.g.:
 *     Server=myserver.database.windows.net;Database=mydb;User Id=user;Password=pass;Encrypt=true;TrustServerCertificate=false;
 */

const globalForDb = globalThis as typeof globalThis & {
  _azureSqlPool?: sql.ConnectionPool;
};

function getConnectionString(): string {
  const cs = process.env.AZURE_SQL_CONNECTION_STRING;
  if (!cs) {
    throw new Error("AZURE_SQL_CONNECTION_STRING environment variable is not set");
  }
  return cs;
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (globalForDb._azureSqlPool?.connected) {
    return globalForDb._azureSqlPool;
  }

  const pool = new sql.ConnectionPool(getConnectionString());
  await pool.connect();
  globalForDb._azureSqlPool = pool;
  return pool;
}

/**
 * Run a query and return the recordset.
 * Usage:
 *   const rows = await query<MyRow>`SELECT * FROM Orders WHERE ClientId = ${clientId}`;
 */
export async function query<T = sql.IRecordSet<unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const pool = await getPool();
  const request = pool.request();

  // Build parameterized query from tagged template literal
  let queryText = "";
  strings.forEach((str, i) => {
    queryText += str;
    if (i < values.length) {
      const paramName = `p${i}`;
      request.input(paramName, values[i]);
      queryText += `@${paramName}`;
    }
  });

  const result = await request.query(queryText);
  return result.recordset as T[];
}
