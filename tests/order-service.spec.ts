import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { POST } from "../app/api/orders/route";
import { orderMode } from "../lib/order-service.server";

const selection = { id: randomUUID(), tableId: "T4", productId: "espresso", quantity: 1 };
const upstreamOrder = { ...selection, id: randomUUID(), status: "received", createdAt: new Date().toISOString() };
const upstreamHeaders = { "X-Coffee-Order-API": "1" };
const token = "T".repeat(43);
const secret = "proxy-test-secret-that-must-stay-private";
const submit = () => POST(new Request("http://localhost/api/orders", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selection),
}));

test("Production requires an explicit mode; demo remains available by choice", async () => {
  const previous = process.env;
  process.env = { ...previous, VERCEL_ENV: "production" };
  delete process.env.COFFEE_ORDER_MODE;
  try {
    expect(orderMode()).toBe("unavailable");
    expect((await submit()).status).toBe(503);
    process.env.COFFEE_ORDER_MODE = "invalid";
    expect(orderMode()).toBe("unavailable");
    process.env.COFFEE_ORDER_MODE = "demo";
    expect(orderMode()).toBe("demo");
    expect(await (await submit()).json()).toEqual({ error: "Live orders are disabled." });
    process.env.COFFEE_ORDER_MODE = "live";
    expect(orderMode()).toBe("live");
  } finally {
    process.env = previous;
  }
});

test("live proxy requires configuration and verified acceptance from the order listener", async () => {
  const previous = process.env;
  const originalFetch = globalThis.fetch;
  process.env = { ...previous, COFFEE_ORDER_MODE: "live" };
  delete process.env.COFFEE_ORDER_API_URL;
  try {
    expect((await submit()).status).toBe(503);
    process.env.COFFEE_ORDER_API_URL = "https://test-3102.example.devtunnels.ms";
    process.env.COFFEE_ORDER_API_SECRET = secret;

    globalThis.fetch = async (input, init) => {
      expect(String(input)).toBe("https://test-3102.example.devtunnels.ms/v1/orders");
      expect(init?.redirect).toBe("error");
      const headers = new Headers(init?.headers);
      expect(headers.get("X-Coffee-Order-Secret")).toBe(secret);
      expect(headers.get("X-Tunnel-Skip-AntiPhishing-Page")).toBe("true");
      expect(headers.get("Idempotency-Key")).toBe(selection.id);
      expect(JSON.parse(String(init?.body))).toEqual({ tableId: "T4", productId: "espresso", quantity: 1 });
      return Response.json({ order: upstreamOrder, token }, { status: 201, headers: upstreamHeaders });
    };
    const accepted = await submit();
    expect(accepted.status).toBe(201);
    expect(await accepted.json()).toMatchObject({ order: { id: upstreamOrder.id, status: "received" }, token });
    expect((await submit()).status).toBe(201);

    for (const [reply, status] of [
      [() => new Response("<html>Sign in</html>", { headers: { "Content-Type": "text/html" } }), 502],
      [() => new Response("{", { headers: { ...upstreamHeaders, "Content-Type": "application/json" } }), 502],
      [() => new Response(null, { status: 401, headers: upstreamHeaders }), 502],
      [() => new Response(null, { status: 403, headers: upstreamHeaders }), 502],
      [() => new Response(null, { status: 429 }), 429],
      [() => { throw new Error("Connection refused"); }, 503],
      [() => { throw new DOMException("Timed out", "TimeoutError"); }, 504],
    ] as const) {
      globalThis.fetch = async () => reply();
      const response = await submit();
      expect(response.status).toBe(status);
      const message = await response.json();
      expect(Object.keys(message)).toEqual(["error"]);
      expect(message.error).not.toContain(secret);
    }
  } finally {
    process.env = previous;
    globalThis.fetch = originalFetch;
  }
});
