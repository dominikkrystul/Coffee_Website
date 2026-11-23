import { orderResponse, submitOrder } from "../../../lib/order-service.server";

export async function POST(request: Request) {
  return orderResponse(request, async () => {
    const { order, token, status } = await submitOrder(request);
    return { body: { order, token }, status };
  });
}
