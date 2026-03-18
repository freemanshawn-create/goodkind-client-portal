import { getSheetData } from "@/lib/google-sheets";
import type { BatchEntry, BatchStatus } from "@/data/types";

// =============================================================================
// Maps rows from the Google Sheet "Batch Schedule" tab to BatchEntry[].
//
// Expected column layout (based on "Batch Schedule 0313"):
//   A: Status (LOCKED / LOCK 3/19 / empty)
//   B: PLUGS/PUMPS (ignored)
//   C: COMPS (ignored)
//   D: LABELS (ignored)
//   E: PACK (ignored)
//   F: DATE (fill date)
//   G: YIELD
//   H: BRAND
//   I: TYPE
//   J: SKU / Product Name
//   K: BATCH
//   L: SO #
//   M: PO #
//   N: DUE DATE
//   O: EST READY BY (ignored in new schema)
//   P: Notes (ignored in new schema)
//
// Note: Compound date is not in the sheet. We derive it as fillDate - 2 days.
// Update this mapper when the sheet adds a compound date column.
// =============================================================================

const NON_PRODUCTION_SKUS = [
  "HOLIDAY CLOSURE",
  "PRODUCTION FREEZE",
  "GKC closed",
];

function isNonProductionRow(sku: string): boolean {
  return NON_PRODUCTION_SKUS.some((phrase) =>
    sku.toUpperCase().includes(phrase.toUpperCase())
  );
}

function parseDate(val: string | undefined): Date | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

function parseStatusAndLockDate(val: string | undefined): {
  status: BatchStatus;
  lockDate?: Date;
} {
  if (!val) return { status: "scheduled" };
  const upper = val.trim().toUpperCase();
  if (upper === "LOCKED") return { status: "locked" };
  if (upper.startsWith("LOCK")) {
    // Parse "LOCK 3/19" style lock dates
    const rest = val.trim().substring(4).trim();
    const lockDate = parseDate(rest);
    return { status: "pending-lock", lockDate };
  }
  return { status: "scheduled" };
}

function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

export async function getSheetsBatchEntries(): Promise<BatchEntry[]> {
  const rows = await getSheetData();

  if (rows.length < 2) return []; // header + at least 1 data row

  // Skip header row (row 0)
  const dataRows = rows.slice(1);
  const entries: BatchEntry[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];

    // Column indices (0-based)
    const statusRaw = row[0] ?? "";
    const dateRaw = row[5] ?? "";
    const yieldRaw = row[6] ?? "";
    const brand = row[7] ?? "";
    const productType = row[8] ?? "";
    const sku = row[9] ?? "";
    const batchNumber = row[10] ?? "";
    const salesOrder = row[11] ?? "";
    const purchaseOrder = row[12] ?? "";
    const dueDateRaw = row[13] ?? "";

    // Skip rows without a date or SKU
    if (!dateRaw || !sku) continue;

    // Skip non-production rows (closures, freezes)
    if (isNonProductionRow(sku)) continue;

    // Skip rows without a brand (likely sub-header or spacer rows)
    if (!brand) continue;

    const fillDate = parseDate(dateRaw);
    if (!fillDate) continue;

    const yieldNum = parseInt(yieldRaw.replace(/,/g, ""), 10) || 0;
    const { status, lockDate } = parseStatusAndLockDate(statusRaw);

    entries.push({
      id: `sheet-${i}`,
      compoundDate: subtractDays(fillDate, 2),
      fillDate,
      yield: yieldNum,
      brand: brand.trim(),
      productType: productType.trim(),
      productName: sku.trim(),
      batchNumber: batchNumber.trim(),
      salesOrder: salesOrder.trim() || undefined,
      purchaseOrder: purchaseOrder.trim() || undefined,
      dueDate: parseDate(dueDateRaw),
      status,
      lockDate,
    });
  }

  return entries;
}
