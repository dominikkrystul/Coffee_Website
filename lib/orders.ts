import type { TableId } from "./catalog";

export const deliveryStages = ["received", "preparing", "ready", "delivering", "delivered"] as const;
export type OrderStatus = (typeof deliveryStages)[number] | "failed" | "cancelled";

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
};

export type OrderSubmissionResult = { order: CustomerOrder };

export interface OrderAdapter {
  submit(request: OrderRequest): Promise<OrderSubmissionResult>;
  get(tableId: TableId, id: string): Promise<CustomerOrder | null>;
  subscribe(tableId: TableId, id: string, onChange: () => void): () => void;
}
