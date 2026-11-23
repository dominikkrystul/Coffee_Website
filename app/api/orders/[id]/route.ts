import { getOrder, orderResponse } from "../../../../lib/order-service.server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return orderResponse(request, async () => ({ body: { order: await getOrder(request, id) }, status: 200 }));
}
