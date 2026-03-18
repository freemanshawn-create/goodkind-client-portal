import { query } from "@/lib/azure-db";
import type {
  Order,
  OrderStatus,
  OrderItem,
  TrackingStep,
  TrackingStepStatus,
  ShippingInfo,
} from "@/data/types";

// =============================================================================
// IMPORTANT: Update the table/column names below to match your Azure SQL schema.
// The placeholder names use common conventions — adjust as needed.
// =============================================================================

// -- Row types (matching your SQL table columns) --

interface OrderRow {
  Id: string;
  OrderNumber: string;
  ProjectId: string;
  ClientId: string;
  Status: string;
  EstimatedDelivery: Date | null;
  TotalAmount: number;
  CreatedAt: Date;
  UpdatedAt: Date;
  // Shipping fields (may be nullable)
  ShippingCarrier: string | null;
  TrackingNumber: string | null;
  TrackingUrl: string | null;
  ShipFromLocation: string | null;
  ShipToLocation: string | null;
}

interface OrderItemRow {
  Id: string;
  OrderId: string;
  Name: string;
  Sku: string;
  Quantity: number;
  UnitPrice: number;
}

interface TrackingStepRow {
  Id: string;
  OrderId: string;
  Label: string;
  Description: string;
  Status: string;
  StepDate: Date | null;
  Location: string | null;
  SortOrder: number;
}

// -- Mapping helpers --

function mapStatus(dbStatus: string): OrderStatus {
  const normalized = dbStatus.toLowerCase().replace(/[\s_]+/g, "-");
  const valid: OrderStatus[] = [
    "confirmed",
    "in-production",
    "quality-check",
    "shipped",
    "delivered",
  ];
  return valid.includes(normalized as OrderStatus)
    ? (normalized as OrderStatus)
    : "confirmed";
}

function mapTrackingStepStatus(dbStatus: string): TrackingStepStatus {
  const normalized = dbStatus.toLowerCase();
  if (normalized === "completed" || normalized === "complete") return "completed";
  if (normalized === "current" || normalized === "active") return "current";
  return "upcoming";
}

function buildShippingInfo(row: OrderRow): ShippingInfo | undefined {
  if (!row.TrackingNumber) return undefined;
  return {
    carrier: row.ShippingCarrier ?? "",
    trackingNumber: row.TrackingNumber,
    trackingUrl: row.TrackingUrl ?? "",
    origin: row.ShipFromLocation ?? "",
    destination: row.ShipToLocation ?? "",
  };
}

// -- Public API --

export async function getAzureOrders(filters?: {
  clientId?: string;
  status?: OrderStatus;
}): Promise<Order[]> {
  // Fetch orders (optionally filtered)
  let orders: OrderRow[];

  if (filters?.clientId && filters?.status) {
    orders = await query<OrderRow>`
      SELECT * FROM Orders
      WHERE ClientId = ${filters.clientId}
        AND Status = ${filters.status}
      ORDER BY CreatedAt DESC
    `;
  } else if (filters?.clientId) {
    orders = await query<OrderRow>`
      SELECT * FROM Orders
      WHERE ClientId = ${filters.clientId}
      ORDER BY CreatedAt DESC
    `;
  } else if (filters?.status) {
    orders = await query<OrderRow>`
      SELECT * FROM Orders
      WHERE Status = ${filters.status}
      ORDER BY CreatedAt DESC
    `;
  } else {
    orders = await query<OrderRow>`
      SELECT * FROM Orders ORDER BY CreatedAt DESC
    `;
  }

  if (orders.length === 0) return [];

  // Fetch items and tracking steps for all returned orders
  const orderIds = orders.map((o) => o.Id);
  const idList = orderIds.map((id) => `'${id}'`).join(",");

  // Note: We can't use parameterized IN clause easily with tagged templates,
  // so we fetch all items/steps and filter in memory for safety.
  const allItems = await query<OrderItemRow>`
    SELECT * FROM OrderItems
    WHERE OrderId IN (${idList})
  `;
  const allSteps = await query<TrackingStepRow>`
    SELECT * FROM TrackingSteps
    WHERE OrderId IN (${idList})
    ORDER BY SortOrder ASC
  `;

  return orders.map((row) => ({
    id: row.Id,
    orderNumber: row.OrderNumber,
    projectId: row.ProjectId,
    clientId: row.ClientId,
    status: mapStatus(row.Status),
    items: allItems
      .filter((item) => item.OrderId === row.Id)
      .map((item) => ({
        id: item.Id,
        name: item.Name,
        sku: item.Sku,
        quantity: item.Quantity,
        unitPrice: item.UnitPrice,
      })),
    trackingSteps: allSteps
      .filter((step) => step.OrderId === row.Id)
      .map((step) => ({
        id: step.Id,
        label: step.Label,
        description: step.Description,
        status: mapTrackingStepStatus(step.Status),
        date: step.StepDate ?? undefined,
        location: step.Location ?? undefined,
      })),
    shippingInfo: buildShippingInfo(row),
    estimatedDelivery: row.EstimatedDelivery ?? undefined,
    totalAmount: row.TotalAmount,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  }));
}

export async function getAzureOrderById(
  id: string
): Promise<Order | null> {
  const orders = await query<OrderRow>`
    SELECT * FROM Orders WHERE Id = ${id}
  `;

  if (orders.length === 0) return null;
  const row = orders[0];

  const items = await query<OrderItemRow>`
    SELECT * FROM OrderItems WHERE OrderId = ${id}
  `;
  const steps = await query<TrackingStepRow>`
    SELECT * FROM TrackingSteps
    WHERE OrderId = ${id}
    ORDER BY SortOrder ASC
  `;

  return {
    id: row.Id,
    orderNumber: row.OrderNumber,
    projectId: row.ProjectId,
    clientId: row.ClientId,
    status: mapStatus(row.Status),
    items: items.map((item) => ({
      id: item.Id,
      name: item.Name,
      sku: item.Sku,
      quantity: item.Quantity,
      unitPrice: item.UnitPrice,
    })),
    trackingSteps: steps.map((step) => ({
      id: step.Id,
      label: step.Label,
      description: step.Description,
      status: mapTrackingStepStatus(step.Status),
      date: step.StepDate ?? undefined,
      location: step.Location ?? undefined,
    })),
    shippingInfo: buildShippingInfo(row),
    estimatedDelivery: row.EstimatedDelivery ?? undefined,
    totalAmount: row.TotalAmount,
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

export async function getAzurePendingOrdersCount(
  clientId?: string
): Promise<number> {
  if (clientId) {
    const result = await query<{ count: number }>`
      SELECT COUNT(*) as count FROM Orders
      WHERE Status != 'delivered' AND ClientId = ${clientId}
    `;
    return result[0]?.count ?? 0;
  }

  const result = await query<{ count: number }>`
    SELECT COUNT(*) as count FROM Orders WHERE Status != 'delivered'
  `;
  return result[0]?.count ?? 0;
}
