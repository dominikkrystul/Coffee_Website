import { notFound } from "next/navigation";
import { DemoTools } from "./tools";
import { Footer, Header } from "../../components/chrome";

export default function DevPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <div className="site">
      <Header />
      <main className="content">
        <h1>Demo tools</h1>
        <p>Open a table menu or update the latest demo order for that table.</p>
        <DemoTools />
      </main>
      <Footer />
    </div>
  );
}
