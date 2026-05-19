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
 *
 * Cold-start handling: Azure SQL on the serverless tier auto-pauses after an
 * idle window. The first request after a pause has to wake the DB up, which
 * can take 20–45s. We bump the connection timeout to 60s and retry once on
 * the initial cold-start error.
 */

const globalForDb = globalThis as typeof globalThis & {
  _azureSqlPool?: sql.ConnectionPool;
};

/**
 * Parse an ADO.NET-style connection string into the object config that the
 * mssql library prefers — this gives us control over timeouts and pool
 * settings that the string form doesn't expose.
 */
function buildConfig(): sql.config {
  const cs = process.env.AZURE_SQL_CONNECTION_STRING;
  if (!cs) {
    throw new Error(
      "AZURE_SQL_CONNECTION_STRING environment variable is not set"
    );
  }

  const map: Record<string, string> = {};
  for (const part of cs.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim().toLowerCase();
    const v = part.slice(eq + 1).trim();
    if (k) map[k] = v;
  }

  return {
    server: map["server"] ?? "",
    database: map["database"] ?? "",
    user: map["user id"] ?? map["uid"] ?? "",
    password: map["password"] ?? map["pwd"] ?? "",
    options: {
      encrypt: (map["encrypt"] ?? "true").toLowerCase() !== "false",
      trustServerCertificate:
        (map["trustservercertificate"] ?? "false").toLowerCase() === "true",
      // Azure SQL needs this for older versions
      enableArithAbort: true,
    },
    // 60s gives Azure SQL serverless room to wake from auto-pause
    connectionTimeout: 60_000,
    requestTimeout: 30_000,
    pool: {
      // Serverless functions are short-lived — keep pool small but warm
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
  };
}

async function createPool(): Promise<sql.ConnectionPool> {
  const pool = new sql.ConnectionPool(buildConfig());
  await pool.connect();
  return pool;
}

export async function getPool(): Promise<sql.ConnectionPool> {
  // Reuse existing pool if it's still connected
  if (globalForDb._azureSqlPool?.connected) {
    return globalForDb._azureSqlPool;
  }

  // If we have a stale pool object, clean it up before making a new one
  if (globalForDb._azureSqlPool) {
    try {
      await globalForDb._azureSqlPool.close();
    } catch {
      // ignore — pool was already in a bad state
    }
    globalForDb._azureSqlPool = undefined;
  }

  try {
    globalForDb._azureSqlPool = await createPool();
    return globalForDb._azureSqlPool;
  } catch (err) {
    // Azure SQL serverless cold-start: first connection after auto-pause can
    // exceed even a generous timeout. Retry once before giving up.
    const isTimeout =
      (err as { code?: string })?.code === "ETIMEOUT" ||
      (err as { code?: string })?.code === "ESOCKET" ||
      (err as Error)?.message?.includes("Failed to connect");
    if (!isTimeout) throw err;

    console.warn(
      "Azure SQL initial connect timed out (likely serverless cold start). Retrying once..."
    );
    globalForDb._azureSqlPool = await createPool();
    return globalForDb._azureSqlPool;
  }
}

/**
 * Marker for a value that should be inlined into the SQL text rather than
 * passed as a bound parameter. Use ONLY with trusted, non-user input — most
 * commonly schema or table names that can't be parameterized in T-SQL.
 */
export function raw(value: string): { __raw: string } {
  return { __raw: value };
}

function isRaw(v: unknown): v is { __raw: string } {
  return (
    typeof v === "object" &&
    v !== null &&
    "__raw" in v &&
    typeof (v as { __raw: unknown }).__raw === "string"
  );
}

/**
 * Run a query and return the recordset.
 * Usage:
 *   const rows = await query<MyRow>`SELECT * FROM Orders WHERE ClientId = ${clientId}`;
 *
 * To inline an identifier (e.g. schema name) instead of binding it as a parameter:
 *   const rows = await query<MyRow>`SELECT * FROM ${raw("GKCO_PROD")}.ORDR WHERE CardCode = ${code}`;
 */
export async function query<T = sql.IRecordSet<unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const pool = await getPool();
  const request = pool.request();

  // Build parameterized query from tagged template literal
  let queryText = "";
  let paramIdx = 0;
  strings.forEach((str, i) => {
    queryText += str;
    if (i < values.length) {
      const v = values[i];
      if (isRaw(v)) {
        queryText += v.__raw;
      } else {
        const paramName = `p${paramIdx++}`;
        request.input(paramName, v);
        queryText += `@${paramName}`;
      }
    }
  });

  const result = await request.query(queryText);
  return result.recordset as T[];
}
