import { mockOrders } from "@/data/mock/orders";
import {
  getAzureOrders,
  getAzureOrderById,
  getAzurePendingOrdersCount,
} from "@/data/repositories/azure-orders";
import type { Order, OrderStatus } from "@/data/types";

function useAzure() {
  return !!process.env.AZURE_SQL_CONNECTION_STRING;
}

export async function getOrders(filters?: {
  clientId?: string;
  status?: OrderStatus;
}): Promise<Order[]> {
  if (useAzure()) {
    return getAzureOrders(filters);
  }

  let result = [...mockOrders];
  if (filters?.clientId)
    result = result.filter((o) => o.clientId === filters.clientId);
  if (filters?.status)
    result = result.filter((o) => o.status === filters.status);
  return result.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (useAzure()) {
    return getAzureOrderById(id);
  }
  return mockOrders.find((o) => o.id === id) ?? null;
}

export async function getPendingOrdersCount(): Promise<number> {
  if (useAzure()) {
    return getAzurePendingOrdersCount();
  }
  return mockOrders.filter((o) => o.status !== "delivered").length;
}
