import { liveOrderToken, rememberLiveOrder } from "./demo-orders";
import type { OrderAdapter, OrderSubmissionResult } from "./orders";

async function orderError(response: Response) {
  const body = await response.json().catch(() => null);
  return new Error(typeof body?.error === "string" ? body.error : "The Coffee Cup console is unavailable. Try again shortly.");
}

export const httpOrderAdapter: OrderAdapter = {
  async submit(request) {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
    }).catch(() => {
      throw new Error("Could not reach the order service. Try again.");
    });
    if (!response.ok) throw await orderError(response);
    const { order, token }: OrderSubmissionResult & { token: string } = await response.json();
    await rememberLiveOrder(request.tableId, request.id, order.id, token);
    return { order };
  },

  async get(tableId, id, signal) {
    const token = liveOrderToken(tableId, id);
    if (!token) return null;
    const requestStarted = Date.now();
    const response = await fetch("/api/orders/" + encodeURIComponent(id), {
      headers: { "X-Order-Token": token }, cache: "no-store", signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) throw await orderError(response);
    const { order }: OrderSubmissionResult = await response.json();
    if (order.tableId !== tableId || order.id !== id) return null;
    if (order.pickupDeadline !== undefined && order.serverTime !== undefined) {
      const midpoint = (requestStarted + Date.now()) / 2;
      return { ...order, pickupDeadlineLocal: midpoint + order.pickupDeadline - order.serverTime };
    }
    return order;
  },

  subscribe(_tableId, _id, onChange) {
    const interval = window.setInterval(onChange, 2000);
    return () => window.clearInterval(interval);
  },
};
