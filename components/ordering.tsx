"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronRight, Info, LoaderCircle, ShoppingBag, Trash2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BackLink, CoffeeHero, DeliveryTable } from "./chrome";
import { easeOut } from "./motion-tokens";
import { OrderScreen } from "./order-screen";
import { chf, coffees, findCoffee, type CoffeeProduct, type TableId } from "../lib/catalog";
import { demoOrderAdapter, readSnapshot, removeCoffee, selectCoffee, storageSnapshot, subscribeToTable } from "../lib/demo-orders";
import { httpOrderAdapter } from "../lib/http-orders";
import type { CartSelection, OrderMode } from "../lib/orders";

export type Screen =
  | { name: "menu" | "cart" | "checkout" }
  | { name: "product"; productId: string }
  | { name: "confirmation" | "tracking"; orderId: string };

const serverSnapshot = () => undefined;

function CoffeeSummary({ coffee, price }: { coffee: CoffeeProduct; price: number }) {
  return (
    <motion.div className="coffee-summary" initial={{ opacity: 0.65 }} animate={{ opacity: 1 }}>
      <Image src={coffee.image} width={86} height={86} loading="eager" alt="" />
      <div><h2>{coffee.name}</h2><p>Quantity 1</p></div>
      <strong className="price">{chf(price)}</strong>
    </motion.div>
  );
}

function Total({ price }: { price: number }) {
  return <div className="total"><strong>Total</strong><strong className="price">{chf(price)}</strong></div>;
}

function Menu({ base, tableId, hasCart, latest, mode }: { base: string; tableId: TableId; hasCart: boolean; latest?: string; mode: OrderMode }) {
  return (
    <>
      <CoffeeHero />
      <div className="content menu-content">
        <DeliveryTable tableId={tableId} />
        <div className="page-intro">
          <h1>Choose your coffee</h1>
          <p>Welcome to T3 Coffee. Pick a cup for your table.</p>
        </div>
        <ul className="products">
          {coffees.map((coffee, index) => (
            <motion.li key={coffee.id} initial={{ opacity: 0 }}
              animate={{ opacity: 1 }} transition={{ duration: 0.19, delay: index * 0.035, ease: easeOut }}>
              <Link className="product-row" href={`${base}/coffee/${coffee.id}`}>
                <Image src={coffee.image} width={96} height={96} alt="" />
                <span className="product-copy"><strong>{coffee.name}</strong><span>{coffee.description}</span><b>{chf(coffee.price)}</b></span>
                <ChevronRight size={19} className="product-arrow" aria-hidden="true" />
              </Link>
            </motion.li>
          ))}
        </ul>
        {latest && <Link className="text-link past-order" href={`${base}/order/${latest}/tracking`}>{mode === "live" ? "Track your latest order" : "Track your latest demo order"} <ArrowRight size={16} /></Link>}
      </div>
      {hasCart && (
        <div className="action-bar">
          <Link className="button primary" href={`${base}/cart`}>
            <ShoppingBag size={19} aria-hidden="true" />
            View Cart
            <motion.span className="cart-count" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} aria-label="1 item">1</motion.span>
            <ArrowRight className="action-arrow" size={19} aria-hidden="true" />
          </Link>
        </div>
      )}
    </>
  );
}

function Product({ base, tableId, product, selection }: { base: string; tableId: TableId; product: CoffeeProduct; selection: CartSelection | null }) {
  const router = useRouter();
  const busy = useRef(false);
  const reduce = useReducedMotion();
  const advance = useRef<ReturnType<typeof setTimeout>>(null);
  const [pending, setPending] = useState<"saving" | "added" | null>(null);
  useEffect(() => () => { if (advance.current) clearTimeout(advance.current); }, []);
  const [error, setError] = useState("");
  const selected = selection?.productId === product.id;

  async function add() {
    if (busy.current) return;
    busy.current = true;
    setPending("saving");
    setError("");
    try {
      await selectCoffee(tableId, product.id);
      setPending("added");
      if (reduce) router.push(`${base}/cart`);
      else advance.current = setTimeout(() => router.push(`${base}/cart`), 180);
    } catch {
      setError("Your cart could not be saved. Check that site storage is available and try again.");
      busy.current = false;
      setPending(null);
    }
  }

  return (
    <>
      <div className={`detail-photo ${product.id}`}>
        <Image src={product.image} alt={product.name} fill sizes="(max-width: 480px) 100vw, 480px" preload />
        <BackLink href={base}>Menu</BackLink>
      </div>
      <div className="content detail-content">
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <strong className="detail-price price">{chf(product.price)}</strong>
        <DeliveryTable tableId={tableId} />
      </div>
      <div className="action-bar">
        {selection && !selected && <p className="action-note">One cup per order. This will replace the coffee in your cart.</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {selected && !pending ? (
          <Link className="button primary" href={`${base}/cart`}><ShoppingBag size={19} />View Cart<ArrowRight className="action-arrow" size={19} /></Link>
        ) : (
          <button className="button primary" disabled={pending !== null} aria-busy={pending === "saving"} onClick={add}>
            {pending === "added" ? <Check size={19} aria-hidden="true" /> : <ShoppingBag size={19} aria-hidden="true" />}
            {pending === "added" ? "Added to cart" : pending === "saving" ? "Saving cup…" : selection && !selected ? "Replace coffee" : "Add to Cart"}
            <span className="action-end">{chf(product.price)}</span>
          </button>
        )}
      </div>
    </>
  );
}

function Basket({ base, tableId, selection, latest, ready, checkout, mode }: {
  base: string; tableId: TableId; selection: CartSelection | null; latest?: string; ready: boolean; checkout: boolean; mode: OrderMode;
}) {
  const router = useRouter();
  const live = mode === "live";
  const submitting = useRef(false);
  const [pending, setPending] = useState<CartSelection | null>(null);
  const [error, setError] = useState("");
  const [removed, setRemoved] = useState(false);
  const emptyTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (removed && !selection) emptyTitle.current?.focus(); }, [removed, selection]);
  const item = pending ?? selection;
  const coffee = item && findCoffee(item.productId);

  async function submit() {
    if (!item || submitting.current) return;
    submitting.current = true;
    setPending(item);
    setError("");
    try {
      const { order } = await (live ? httpOrderAdapter : demoOrderAdapter).submit({ id: item.id, tableId, productId: item.productId, quantity: 1 });
      router.push(`${base}/order/${order.id}/confirmation`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not reach the order service. Try again.");
      submitting.current = false;
      setPending(null);
    }
  }

  async function remove() {
    if (!item) return;
    setError("");
    try {
      await removeCoffee(tableId, item.id);
      setRemoved(true);
    } catch {
      setError("Your cart could not be updated. Try again.");
    }
  }

  return (
    <>
      <div className="content">
        <BackLink href={checkout ? `${base}/cart` : base}>{checkout ? "Cart" : "Menu"}</BackLink>
        <div className="page-intro">
          <h1>{checkout ? "Checkout" : "Your cart"}</h1>
          <p>{checkout ? "Review your coffee and delivery table." : "Review your coffee before checking out."}</p>
        </div>
        {!ready ? <p role="status">Loading your cart…</p> : coffee ? (
          <>
            <CoffeeSummary key={coffee.id} coffee={coffee} price={coffee.price} />
            {!checkout && (
              <div className="cart-tools">
                <Link href={base} className="text-link">Change coffee</Link>
                <button className="text-link" onClick={remove}><Trash2 size={15} />Remove</button>
              </div>
            )}
            <DeliveryTable tableId={tableId} />
            <Total price={coffee.price} />
            {checkout && (
              <aside className="notice">
                <Info aria-hidden="true" size={20} />
                <div>
                  <strong>{live ? "Coffee Cup checkout" : "Demo checkout"}</strong>
                  <p>{live ? "No payment is collected. The café will prepare your order and dispatch it when ready." :
                    "No real payment will be processed. This order is part of the Robot Coffee Cup demonstration."}</p>
                </div>
              </aside>
            )}
            {error && <p className="error" role="alert">{error}</p>}
          </>
        ) : (
          <motion.div className="empty-cart" initial={{ opacity: 0.65 }} animate={{ opacity: 1 }}>
            <ShoppingBag size={24} aria-hidden="true" />
            <h2 tabIndex={-1} ref={emptyTitle}>Your cart is empty</h2>
            <p>Choose a coffee from the menu.</p>
            <Link href={base} className="button secondary">Browse menu<ArrowRight size={19} /></Link>
            {latest && <Link className="text-link" href={`${base}/order/${latest}/tracking`}>{mode === "live" ? "Track your latest order" : "Track your latest demo order"}</Link>}
          </motion.div>
        )}
      </div>
      {coffee && (
        <div className="action-bar">
          {checkout ? (
            <button className="button primary" onClick={submit} disabled={pending !== null} aria-busy={pending !== null}>
              {pending && <LoaderCircle className="processing-icon" size={17} aria-hidden="true" />}
              {pending ? (live ? "Placing order…" : "Placing demo order…") : live ? "Place Order" : "Place Demo Order"}<ArrowRight className="action-arrow" size={19} aria-hidden="true" />
            </button>
          ) : (
            <Link href={`${base}/checkout`} className="button primary">Continue to Checkout<ArrowRight className="action-arrow" size={19} aria-hidden="true" /></Link>
          )}
        </div>
      )}
    </>
  );
}

export function Ordering({ tableId, screen, mode }: { tableId: TableId; screen: Screen; mode: OrderMode }) {
  const base = `/table/${tableId}`;
  const subscribe = useCallback((change: () => void) => subscribeToTable(tableId, change), [tableId]);
  const getSnapshot = useCallback(() => storageSnapshot(tableId), [tableId]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const { cart, latestOrderId, latestLiveOrderId } = readSnapshot(snapshot ?? null);
  const latest = mode === "live" ? latestLiveOrderId : latestOrderId;

  return (
    <main className="ordering" data-screen={screen.name} tabIndex={-1}>
      {screen.name === "menu" && <Menu base={base} tableId={tableId} hasCart={!!cart} latest={latest} mode={mode} />}
      {screen.name === "product" && <Product key={screen.productId} base={base} tableId={tableId} product={findCoffee(screen.productId)!} selection={cart} />}
      {(screen.name === "cart" || screen.name === "checkout") && (
        <Basket key={screen.name} base={base} tableId={tableId} ready={snapshot !== undefined} selection={cart} latest={latest} mode={mode} checkout={screen.name === "checkout"} />
      )}
      {"orderId" in screen && <OrderScreen key={screen.orderId + screen.name} base={base} tableId={tableId} id={screen.orderId} tracking={screen.name === "tracking"} mode={mode} />}
    </main>
  );
}
