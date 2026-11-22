import Image from "next/image";
import Link from "next/link";
import { Armchair, ArrowLeft, Coffee } from "lucide-react";
import type { TableId } from "../lib/catalog";

export function Header({ tableId }: { tableId?: TableId }) {
  return (
    <header className="masthead">
      <Link className="wordmark" href={tableId ? `/table/${tableId}` : "/"}>
        <Coffee size={29} strokeWidth={1.55} aria-hidden="true" />
        <span><strong>T3 Coffee</strong><small>Robot Coffee Delivery</small></span>
      </Link>
      {tableId && <span className="header-table">Table {tableId}</span>}
    </header>
  );
}

export function Footer() {
  return <footer className="credit">Team T3 · HSLU Robot Coffee Cup</footer>;
}

export function DeliveryTable({ tableId }: { tableId: TableId }) {
  return (
    <div className="delivery-table">
      <Armchair size={19} strokeWidth={1.7} aria-hidden="true" />
      <span>Delivering to <strong>Table {tableId}</strong></span>
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="back-link" href={href}>
      <ArrowLeft size={17} aria-hidden="true" />{children}
    </Link>
  );
}

export function CoffeeHero() {
  return (
    <div className="menu-hero">
      <Image src="/coffee/menu-hero.jpg" alt="Cappuccino with rosetta latte art on a walnut café table" fill sizes="(max-width: 480px) 100vw, 480px" preload />
    </div>
  );
}
