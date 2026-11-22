import Link from "next/link";
import { CoffeeHero, Footer, Header } from "../components/chrome";

export default function Home() {
  return (
    <div className="site">
      <Header />
      <main className="ordering">
        <CoffeeHero />
        <div className="content empty-page">
          <h1>Order from your table</h1>
          <p>Scan the T3 Coffee QR code at your table to open the menu and set your delivery location.</p>
          {process.env.NODE_ENV === "development" && <Link className="button secondary" href="/dev">Open demo tools</Link>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
