import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer, Header } from "../../../../components/chrome";
import { Ordering, type Screen } from "../../../../components/ordering";
import { findCoffee, isTableId } from "../../../../lib/catalog";

type Props = {
  params: Promise<{ tableId: string; flow?: string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tableId, flow } = await params;
  return { title: flow?.[0] === "coffee" ? findCoffee(flow[1])?.name : isTableId(tableId) ? `Table ${tableId}` : "Table unavailable" };
}

export default async function TablePage({ params }: Props) {
  const { tableId, flow = [] } = await params;
  if (!isTableId(tableId)) {
    return (
      <div className="site">
        <Header />
        <main className="content empty-page">
          <h1>Table not recognised</h1>
          <p>T3 Coffee serves tables T1–T4. Scan the QR code at your table to set the correct delivery location.</p>
          <Link href="/" className="button secondary">Back to T3 Coffee</Link>
        </main>
        <Footer />
      </div>
    );
  }

  let screen: Screen;
  const [section, id, action] = flow;
  if (flow.length === 0) {
    screen = { name: "menu" };
  } else if (flow.length === 1 && (section === "cart" || section === "checkout")) {
    screen = { name: section };
  } else if (flow.length === 2 && section === "coffee" && findCoffee(id)) {
    screen = { name: "product", productId: id };
  } else if (flow.length === 3 && section === "order" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id)) {
    if (action !== "confirmation" && action !== "tracking") notFound();
    screen = { name: action, orderId: id };
  } else {
    notFound();
  }

  return <Ordering tableId={tableId} screen={screen} />;
}
