"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Play, Truck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { ConfirmationRobot, DeliveryJourney } from "./delivery-illustration";
import { easeOut } from "./motion-tokens";
import { BackLink } from "./chrome";
import { chf, findCoffee, type TableId } from "../lib/catalog";
import { demoOrderAdapter, startDemoPlayback } from "../lib/demo-orders";
import { deliveryStages, type CustomerOrder, type OrderStatus } from "../lib/orders";

const statusCopy = {
  received: { title: "Order received", detail: "Your demo order was saved on this device." },
  preparing: { title: "Preparing coffee", detail: "In the demo, the café is preparing your coffee." },
  ready: { title: "Ready for delivery", detail: "The coffee is ready. A real run requires the operator to confirm the cup is loaded." },
  delivering: { title: "On the way", detail: "The demo delivery is on its way to your table." },
  delivered: { title: "Delivered", detail: "Your simulated delivery is complete." },
  failed: { title: "Delivery failed", detail: "The simulated delivery could not be completed." },
  cancelled: { title: "Order cancelled", detail: "This demo order was cancelled." },
} satisfies Record<OrderStatus, { title: string; detail: string }>;

export { statusCopy };

function OrderCard({ order }: { order: CustomerOrder }) {
  const coffee = findCoffee(order.productId);
  return (
    <div className="order-card">
      {coffee && <Image src={coffee.image} width={104} height={104} loading="eager" alt="" />}
      <div>
        <span className="order-reference">Order <abbr title={order.id}>#{order.id.slice(0, 8).toUpperCase()}</abbr></span>
        <h2>{order.productName}</h2>
        <p>Delivering to <strong>Table {order.tableId}</strong></p>
        <strong className="order-price price">{chf(order.price)}</strong>
      </div>
    </div>
  );
}

function SuccessMark() {
  const reduce = useReducedMotion();
  return (
    <motion.div className="success-mark" aria-hidden="true"
      initial={reduce ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.24, delay: reduce ? 0 : 0.25, ease: easeOut }}>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
        <motion.path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.28, delay: reduce ? 0 : 0.32, ease: easeOut }} />
      </svg>
    </motion.div>
  );
}

function Timeline({ status }: { status: OrderStatus }) {
  const current = deliveryStages.findIndex((stage) => stage === status);
  return (
    <ol className="timeline" aria-label="Delivery progress">
      {deliveryStages.map((stage, index) => {
        const active = current === index;
        const done = current > index || (active && stage === "delivered");
        return (
          <li key={stage} aria-current={active ? "step" : undefined} data-state={active ? "current" : done ? "done" : "upcoming"}>
            <span className="step-marker">
              {done && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Check size={13} aria-hidden="true" /></motion.span>}
            </span>
            <span>{statusCopy[stage].title}{done && !active && <span className="sr-only"> (complete)</span>}</span>
            {active && <span className="current-label">{done ? "Complete" : "Current"}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function Tracking({ base, order }: { base: string; order: CustomerOrder }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const { status, tableId, id } = order;

  async function play() {
    setPlaying(true);
    setError("");
    try {
      await startDemoPlayback(tableId, id);
    } catch {
      setPlaying(false);
      setError("The demo could not start. Try again.");
    }
  }

  return (
    <div className="content tracking">
      <BackLink href={base}>Menu</BackLink>
      <div className="page-intro">
        <h1>Track your order</h1>
        <p>Demo tracking · Simulated status updates</p>
      </div>
      <OrderCard order={order} />
      <DeliveryJourney tableId={tableId} status={status} />
      <Timeline status={status} />
      <div className="tracking-message" aria-live="polite" aria-atomic="true">
        <motion.div key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <strong className={status === "failed" || status === "cancelled" ? undefined : "sr-only"}>{statusCopy[status].title}</strong>
          <p>{statusCopy[status].detail}</p>
        </motion.div>
      </div>
      {status === "received" && (
        <button className="button secondary" disabled={playing} onClick={play}>
          <Play size={17} aria-hidden="true" />{playing ? "Demo playback started" : "Play delivery demo"}
        </button>
      )}
      {status === "delivered" && <Link className="button secondary" href={base}>Back to menu<ArrowRight size={19} aria-hidden="true" /></Link>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

export function OrderScreen({ base, tableId, id, tracking }: { base: string; tableId: TableId; id: string; tracking: boolean }) {
  const [order, setOrder] = useState<CustomerOrder | null>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let reading = 0;
    function refresh() {
      const request = ++reading;
      demoOrderAdapter.get(tableId, id).then((value) => {
        if (reading === request) { setOrder(value); setFailed(false); }
      }, () => {
        if (reading === request) setFailed(true);
      });
    }
    const unsubscribe = demoOrderAdapter.subscribe(tableId, id, refresh);
    refresh();
    return () => {
      reading++;
      unsubscribe();
    };
  }, [tableId, id]);

  if (failed || !order) {
    return (
      <div className="content">
        <BackLink href={base}>Menu</BackLink>
        {failed ? <p role="alert">Your demo order could not be loaded. Refresh to try again.</p> :
          order === undefined ? <p role="status">Loading demo order…</p> : (
            <><h1>Order unavailable</h1><p>Demo orders are saved to the browser and table where they were placed.</p></>
          )}
      </div>
    );
  }

  if (tracking) return <Tracking base={base} order={order} />;

  return (
    <>
      <div className="content confirmation">
        <SuccessMark />
        <div className="page-intro">
          <h1>Order received!</h1>
          <p>Your demo order is saved. Follow the simulated delivery to Table {order.tableId}.</p>
        </div>
        <ConfirmationRobot />
        <OrderCard order={order} />
      </div>
      <div className="action-bar">
        <Link className="button primary" href={`${base}/order/${id}/tracking`}>
          <Truck size={20} aria-hidden="true" />Track Order<ArrowRight className="action-arrow" size={19} aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}
