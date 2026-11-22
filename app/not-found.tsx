import Link from "next/link";
import { Footer, Header } from "../components/chrome";

export default function NotFound() {
  return (
    <div className="site">
      <Header />
      <main className="content empty-page">
        <h1>Page unavailable</h1>
        <p>Scan the QR code at your table to reopen the menu.</p>
        <Link href="/" className="button secondary">Back to T3 Coffee</Link>
      </main>
      <Footer />
    </div>
  );
}
