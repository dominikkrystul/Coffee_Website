import Link from "next/link";

export default function TablePageNotFound() {
  return (
    <main className="ordering content empty-page" tabIndex={-1}>
      <h1>Page unavailable</h1>
      <p>Scan the QR code at your table to reopen the menu.</p>
      <Link href="/" className="button secondary">Back to T3 Coffee</Link>
    </main>
  );
}
