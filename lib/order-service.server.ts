import { findCoffee, isTableId } from "./catalog";
import { liveDeliveryStages, orderUuid, type CustomerOrder, type OrderMode } from "./orders";

export function orderMode(): OrderMode {
  const mode = process.env.COFFEE_ORDER_MODE;
  if (mode === undefined || mode === "demo") return "demo";
  if (mode === "live") return "live";
  throw new Error("COFFEE_ORDER_MODE must be demo or live.");
}

export class OrderServiceError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const statusToken = /^[A-Za-z0-9_-]{43}$/;
const statuses = new Set<string>([...liveDeliveryStages, "failed", "cancelled"]);
const unavailable = () => new OrderServiceError(503, "The Coffee Cup console is unavailable. Try again shortly.");

async function requestOrder(path: string, init: RequestInit) {
  const secret = process.env.COFFEE_ORDER_API_SECRET;
  let origin: URL;
  try {
    origin = new URL(process.env.COFFEE_ORDER_API_URL ?? "");
    const localHttp = origin.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname);
    if ((!localHttp && origin.protocol !== "https:") || origin.username || origin.password ||
      origin.pathname !== "/" || origin.search || origin.hash || !secret || !/^[A-Za-z0-9_-]{32,}$/.test(secret)) {
      throw unavailable();
    }
  } catch {
    throw unavailable();
  }

  let response: Response;
  try {
    response = await fetch(new URL(path, origin), {
      ...init,
      headers: {
        ...init.headers, Accept: "application/json", "X-Coffee-Order-Secret": secret,
        ...(origin.hostname.endsWith(".devtunnels.ms") && { "X-Tunnel-Skip-AntiPhishing-Page": "true" }),
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    throw unavailable();
  }
  if (response.headers.get("x-coffee-order-api") !== "1") throw unavailable();
  if (response.status === 404) throw new OrderServiceError(404, "Order unavailable.");
  if (response.status === 409) throw new OrderServiceError(409, "That order reference belongs to another selection.");
  if (response.status === 429) throw new OrderServiceError(429, "The order service is busy. Try again shortly.");
  if (!response.ok) throw unavailable();

  try {
    const { order, token } = await response.json();
    const coffee = findCoffee(order?.productId);
    if (!coffee || !isTableId(order.tableId) || typeof order.id !== "string" || !orderUuid.test(order.id) ||
        order.quantity !== 1 || !statuses.has(order.status) || !Number.isFinite(Date.parse(order.createdAt))) {
      throw unavailable();
    }
    const customerOrder: CustomerOrder = {
      id: order.id, tableId: order.tableId, productId: coffee.id, quantity: 1,
      createdAt: order.createdAt, status: order.status, price: coffee.price, productName: coffee.name,
      ...(order.execution === "sim" || order.execution === "robot" ? { execution: order.execution } : {}),
    };
    return { order: customerOrder, token, status: response.status };
  } catch {
    throw unavailable();
  }
}

async function jsonBody(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new OrderServiceError(415, "JSON required.");
  }
  if (!request.body) throw new OrderServiceError(400, "Order required.");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0, contents = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        void reader.cancel();
        throw new OrderServiceError(413, "Order request is too large.");
      }
      contents += decoder.decode(value, { stream: true });
    }
    return JSON.parse(contents + decoder.decode());
  } catch (error) {
    if (error instanceof OrderServiceError) throw error;
    throw new OrderServiceError(400, "Invalid order JSON.");
  }
}

export async function submitOrder(request: Request) {
  const body = await jsonBody(request);
  if (!body || Array.isArray(body) || typeof body !== "object" || Object.keys(body).length !== 4 ||
      typeof body.id !== "string" || !orderUuid.test(body.id) || !isTableId(body.tableId) ||
      !findCoffee(body.productId) || body.quantity !== 1) {
    throw new OrderServiceError(400, "Choose a valid table and one coffee.");
  }
  const result = await requestOrder("/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": body.id },
    body: JSON.stringify({ tableId: body.tableId, productId: body.productId, quantity: 1 }),
  });
  if (!statusToken.test(result.token ?? "") || result.order.tableId !== body.tableId ||
      result.order.productId !== body.productId) throw unavailable();
  return result;
}

export async function getOrder(request: Request, id: string) {
  const token = request.headers.get("x-order-token");
  if (!orderUuid.test(id) || !token || !statusToken.test(token)) throw new OrderServiceError(404, "Order unavailable.");
  const result = await requestOrder("/v1/orders/" + id, { headers: { "X-Order-Token": token } });
  if (result.order.id !== id) throw unavailable();
  return result.order;
}

export async function orderResponse(request: Request, handle: () => Promise<{ body: object; status: number }>) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  try {
    const origin = request.headers.get("origin");
    const site = request.headers.get("sec-fetch-site");
    const host = request.headers.get("host") ?? new URL(request.url).host;
    if ((origin && origin !== "http://" + host && origin !== "https://" + host) ||
        (site && !["same-origin", "none"].includes(site))) {
      throw new OrderServiceError(403, "Same-origin order request required.");
    }
    if (orderMode() !== "live") throw new OrderServiceError(503, "Live orders are disabled.");
    const { body, status } = await handle();
    return Response.json(body, { status, headers });
  } catch (error) {
    const problem = error instanceof OrderServiceError ? error : unavailable();
    return Response.json({ error: problem.message }, { status: problem.status, headers: {
      ...headers, ...(problem.status === 429 && { "Retry-After": "60" }),
    } });
  }
}
