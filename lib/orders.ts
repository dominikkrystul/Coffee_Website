import type { TableId } from "./catalog";

export const deliveryStages = ["received", "preparing", "ready", "delivering", "delivered"] as const;
export const liveDeliveryStages = [deliveryStages[0], deliveryStages[1], deliveryStages[2], deliveryStages[3], "arrived", "delivered"] as const;
export const orderUuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
export type OrderMode = "live" | "demo" | "unavailable";
export type OrderStatus = (typeof deliveryStages)[number] | "arrived" | "failed" | "cancelled";

export type CartSelection = {
  id: string;
  productId: string;
};

export type OrderRequest = {
  id: string;
  tableId: TableId;
  productId: string;
  quantity: 1;
};

export type CustomerOrder = OrderRequest & {
  createdAt: string;
  status: OrderStatus;
  price: number;
  productName: string;
  execution?: "sim" | "robot";
  tableArrivalAt?: string;
  pickupDeadline?: number;
  serverTime?: number;
  departureWait?: "spotter_clearance" | "return_pending";
  pickupDeadlineLocal?: number;
};

export type OrderSubmissionResult = { order: CustomerOrder };

export interface OrderAdapter {
  submit(request: OrderRequest): Promise<OrderSubmissionResult>;
  get(tableId: TableId, id: string, signal?: AbortSignal): Promise<CustomerOrder | null>;
  subscribe(tableId: TableId, id: string, onChange: () => void): () => void;
}
