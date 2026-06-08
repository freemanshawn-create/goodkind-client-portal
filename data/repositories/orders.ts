import {
  getAzureOrders,
  getAzureOrderById,
  getAzurePendingOrdersCount,
} from "@/data/repositories/azure-orders";
import type { Order, OrderStatus } from "@/data/types";

// Live SAP/Azure data only — no mock fallback.

export async function getOrders(filters?: {
  clientId?: string;
  status?: OrderStatus;
}): Promise<Order[]> {
  return getAzureOrders(filters);
}

export async function getOrderById(id: string): Promise<Order | null> {
  return getAzureOrderById(id);
}

export async function getPendingOrdersCount(): Promise<number> {
  return getAzurePendingOrdersCount();
}
