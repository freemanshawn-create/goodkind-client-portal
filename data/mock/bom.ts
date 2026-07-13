import type { BomItem } from "@/data/types";

// BOM part templates by product type
const DEODORANT_PARTS = ["Plugs", "Caps", "Labels", "Cartons"];
const BODY_PARTS = ["Pumps", "Caps", "Labels", "Cartons"];

function partsForType(productType: string): string[] {
  return productType === "Deodorant" ? DEODORANT_PARTS : BODY_PARTS;
}

// Helper to create a set of BOM items for one batch
function makeBom(
  batchId: string,
  productType: string,
  qty: number,
  statuses: Array<{
    inventoryStatus: BomItem["inventoryStatus"];
    onHand?: number;
    inbound?: number;
    poNumber?: string;
    expectedDate?: Date;
  }>
): BomItem[] {
  const parts = partsForType(productType);
  return parts.map((partName, i) => {
    const s = statuses[i];
    return {
      id: `bom-${batchId}-${i}`,
      batchId,
      partName,
      gkcItemCode: `20-MOCK-${String(i).padStart(6, "0")}`,
      clientItemCode: `CLI-${i}`,
      quantityRequired: qty,
      quantityOnHand: s.onHand ?? 0,
      quantityInbound: s.inbound ?? 0,
      // Mock projected balance: positive cushion when covered, short when none.
      projectedBalance:
        s.inventoryStatus === "none" ? -qty : s.onHand ?? s.inbound ?? qty,
      inventoryStatus: s.inventoryStatus,
      poNumber: s.poNumber,
      expectedDate: s.expectedDate,
    };
  });
}

const allGreen = (qty: number) =>
  Array(4).fill(null).map(() => ({
    inventoryStatus: "on-hand" as const,
    onHand: qty,
  }));

export const mockBomItems: BomItem[] = [
  // --- Completed batches: all parts on hand ---
  ...makeBom("batch-001", "Deodorant", 20000, allGreen(20000)),
  ...makeBom("batch-002", "Body", 15000, allGreen(15000)),
  ...makeBom("batch-003", "Deodorant", 20000, allGreen(20000)),
  ...makeBom("batch-004", "Deodorant", 20000, allGreen(20000)),
  ...makeBom("batch-005", "Deodorant", 20000, allGreen(20000)),
  ...makeBom("batch-006", "Deodorant", 20000, allGreen(20000)),
  ...makeBom("batch-007", "Body", 10000, allGreen(10000)),
  ...makeBom("batch-008", "Deodorant", 20000, allGreen(20000)),
  ...makeBom("batch-009", "Deodorant", 20000, allGreen(20000)),
  ...makeBom("batch-010", "Deodorant", 20000, allGreen(20000)),
  ...makeBom("batch-011", "Body", 15000, allGreen(15000)),
  ...makeBom("batch-012", "Deodorant", 20000, allGreen(20000)),

  // --- Locked batches: all parts on hand ---
  ...makeBom("batch-013", "Deodorant", 20000, allGreen(20000)),
  ...makeBom("batch-014", "Body", 15000, allGreen(15000)),

  // --- Pending-lock batches: mix of on-hand and inbound ---
  ...makeBom("batch-015", "Deodorant", 20000, [
    { inventoryStatus: "on-hand", onHand: 20000 },
    { inventoryStatus: "on-hand", onHand: 20000 },
    { inventoryStatus: "inbound", inbound: 20000, poNumber: "PO-4401", expectedDate: new Date("2026-03-26") },
    { inventoryStatus: "on-hand", onHand: 20000 },
  ]),
  ...makeBom("batch-016", "Deodorant", 21400, [
    { inventoryStatus: "inbound", inbound: 21400, poNumber: "PO-4415", expectedDate: new Date("2026-03-28") },
    { inventoryStatus: "on-hand", onHand: 21400 },
    { inventoryStatus: "inbound", inbound: 21400, poNumber: "PO-4416", expectedDate: new Date("2026-04-01") },
    { inventoryStatus: "on-hand", onHand: 21400 },
  ]),

  // --- Scheduled batches: mix of all statuses ---
  ...makeBom("batch-017", "Deodorant", 20000, [
    { inventoryStatus: "on-hand", onHand: 20000 },
    { inventoryStatus: "inbound", inbound: 20000, poNumber: "PO-4520", expectedDate: new Date("2026-04-08") },
    { inventoryStatus: "none" },
    { inventoryStatus: "on-hand", onHand: 20000 },
  ]),
  ...makeBom("batch-018", "Body", 10000, [
    { inventoryStatus: "inbound", inbound: 10000, poNumber: "PO-4530", expectedDate: new Date("2026-04-15") },
    { inventoryStatus: "none" },
    { inventoryStatus: "inbound", inbound: 10000, poNumber: "PO-4531", expectedDate: new Date("2026-04-12") },
    { inventoryStatus: "none" },
  ]),
  ...makeBom("batch-019", "Deodorant", 20000, [
    { inventoryStatus: "on-hand", onHand: 20000 },
    { inventoryStatus: "on-hand", onHand: 20000 },
    { inventoryStatus: "inbound", inbound: 20000, poNumber: "PO-4540", expectedDate: new Date("2026-04-20") },
    { inventoryStatus: "inbound", inbound: 20000, poNumber: "PO-4541", expectedDate: new Date("2026-04-18") },
  ]),
  ...makeBom("batch-020", "Body", 15000, [
    { inventoryStatus: "none" },
    { inventoryStatus: "none" },
    { inventoryStatus: "none" },
    { inventoryStatus: "none" },
  ]),

  // --- New scheduled batches: mix of all statuses ---
  ...makeBom("batch-021", "Deodorant", 20000, [
    { inventoryStatus: "on-hand", onHand: 20000 },
    { inventoryStatus: "on-hand", onHand: 20000 },
    { inventoryStatus: "inbound", inbound: 20000, poNumber: "PO-4612", expectedDate: new Date("2026-05-08") },
    { inventoryStatus: "on-hand", onHand: 20000 },
  ]),
  ...makeBom("batch-022", "Deodorant", 20000, [
    { inventoryStatus: "inbound", inbound: 20000, poNumber: "PO-4625", expectedDate: new Date("2026-05-14") },
    { inventoryStatus: "on-hand", onHand: 20000 },
    { inventoryStatus: "inbound", inbound: 20000, poNumber: "PO-4626", expectedDate: new Date("2026-05-16") },
    { inventoryStatus: "on-hand", onHand: 20000 },
  ]),
  ...makeBom("batch-023", "Deodorant", 20000, [
    { inventoryStatus: "on-hand", onHand: 20000 },
    { inventoryStatus: "none" },
    { inventoryStatus: "inbound", inbound: 20000, poNumber: "PO-4640", expectedDate: new Date("2026-05-22") },
    { inventoryStatus: "on-hand", onHand: 20000 },
  ]),
  ...makeBom("batch-024", "Body", 10000, [
    { inventoryStatus: "none" },
    { inventoryStatus: "inbound", inbound: 10000, poNumber: "PO-4655", expectedDate: new Date("2026-05-29") },
    { inventoryStatus: "none" },
    { inventoryStatus: "on-hand", onHand: 10000 },
  ]),
  ...makeBom("batch-025", "Deodorant", 21400, [
    { inventoryStatus: "none" },
    { inventoryStatus: "none" },
    { inventoryStatus: "none" },
    { inventoryStatus: "none" },
  ]),
  ...makeBom("batch-026", "Body", 15000, [
    { inventoryStatus: "inbound", inbound: 15000, poNumber: "PO-4710", expectedDate: new Date("2026-06-12") },
    { inventoryStatus: "inbound", inbound: 15000, poNumber: "PO-4711", expectedDate: new Date("2026-06-12") },
    { inventoryStatus: "none" },
    { inventoryStatus: "none" },
  ]),

  // --- Additional historical: all parts on hand ---
  ...makeBom("batch-027", "Deodorant", 20000, allGreen(20000)),
  ...makeBom("batch-028", "Body", 15000, allGreen(15000)),
  ...makeBom("batch-029", "Deodorant", 20000, allGreen(20000)),
  ...makeBom("batch-030", "Body", 15000, allGreen(15000)),
  ...makeBom("batch-031", "Deodorant", 21400, allGreen(21400)),
  ...makeBom("batch-032", "Deodorant", 20000, allGreen(20000)),
  ...makeBom("batch-033", "Deodorant", 20000, allGreen(20000)),
  ...makeBom("batch-034", "Deodorant", 21400, allGreen(21400)),
  ...makeBom("batch-035", "Body", 10000, allGreen(10000)),
];
