"use client";

import { Armchair, Check, Store } from "lucide-react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useLayoutEffect } from "react";
import { easeOut } from "./motion-tokens";
import type { TableId } from "../lib/catalog";
import type { OrderStatus } from "../lib/orders";

type Ride = "entrance" | "travel" | "still";

function Wheel({ x, radius, ride }: { x: number; radius: number; ride: Ride }) {
  const spinning = ride !== "still";
  return (
    <g transform={`translate(${x} 77)`}>
      <circle r={radius + 1.4} fill="#252321" stroke="#181715" strokeWidth="1.1" />
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        initial={spinning ? { transform: "rotate(0deg)" } : false}
        animate={{ transform: spinning ? ["rotate(0deg)", "rotate(360deg)"] : "rotate(0deg)" }}
        transition={ride === "travel"
          ? { duration: 0.85, ease: "linear", repeat: Infinity }
          : { duration: spinning ? 0.86 : 0, delay: spinning ? 0.5 : 0, ease: easeOut }}
      >
        <circle r={radius * 0.73} fill="#55504a" stroke="#6d655d" strokeWidth="0.9" />
        <path d="M0-8v16m-7-12L7 4m0-8-14 8" stroke="#352f2b" strokeWidth="1.5" strokeLinecap="round" />
        <circle r={radius * 0.25} fill="#302d2a" />
      </motion.g>
    </g>
  );
}

function TurtleBot({ cup, ride }: { cup: boolean; ride: Ride }) {
  const enter = ride === "entrance";
  const travel = ride === "travel";
  return (
    <>
      <motion.g
        initial={enter ? { transform: "translateY(0px)" } : false}
        animate={{ transform: enter ? ["translateY(0px)", "translateY(-1.5px)", "translateY(0px)"] : "none" }}
        transition={{ duration: enter ? 0.72 : 0, delay: enter ? 0.53 : 0, ease: easeOut }}
      >
        <path d="M21 61c2-12 12-19 24-19h50c14 0 27 7 32 20l2 7c1 7-5 13-13 13H35c-11 0-17-7-16-15Z"
          fill="#373431" stroke="#282522" strokeWidth="1.5" />
        <path d="M23 61l2-12c2-8 8-13 16-14h57c11 0 21 6 25 15l3 10c-8 5-21 7-35 7H42c-7 0-14-2-19-6Z"
          fill="#f7f4ee" stroke="#494039" strokeWidth="1.5" />
        <path d="M27 49c6 4 13 5 27 5h28l-4 13H42c-7 0-14-2-19-6Z" fill="#e2d8cb" />
        <path d="M84 54h17c8 0 15-1 22-4l3 10c-11 5-24 7-39 7h-9Z" fill="#393532" />
        <path d="M96 59h14" stroke="#eee5d7" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M44 43h9m-4.5 0v6m8-6c3-1 5 1 2 3 4 2 1 5-2 4" fill="none" stroke="#87553f" strokeWidth="1.35" strokeLinecap="round" />
        <path d="M38 35v-7m66 7-1-7" stroke="#5f544a" strokeWidth="2" />
        <path d="M32 29c-4 0-5-4-2-6 2-1 5-2 10-2h57c7 0 13 2 14 5 1 2-2 4-6 4H35Z"
          fill="#3b3632" stroke="#24211f" strokeWidth="1.3" />
        <path d="M35 25h69" stroke="#75685c" strokeWidth="1.25" strokeLinecap="round" />
        <rect x="36" y="16" width="17" height="7" rx="3" fill="#292726" stroke="#655b52" strokeWidth="0.9" />
        {cup && (
          <motion.g className="turtlebot-cup" initial={enter ? { transform: "rotate(0deg)" } : false}
            style={{ transformBox: "fill-box", transformOrigin: "bottom center" }}
            animate={{ transform: enter
              ? ["rotate(0deg)", "rotate(-4deg)", "rotate(2deg)", "rotate(0deg)"]
              : travel ? ["rotate(-2deg)", "rotate(2deg)", "rotate(-2deg)"] : "rotate(0deg)" }}
            transition={travel ? { duration: 1.3, ease: "easeInOut", repeat: Infinity }
              : { duration: enter ? 0.36 : 0, delay: enter ? 1.12 : 0, ease: easeOut }}
          >
            <ellipse cx="79" cy="23" rx="17" ry="3.7" fill="#d7ba9d" stroke="#936b51" strokeWidth="0.9" />
            <path d="M88 9h6c7 1 6 10-5 10" fill="none" stroke="#c89a72" strokeWidth="2.5" />
            <path d="M66 8h25l-2 9c-1 4-4 6-10 6s-10-2-11-6Z" fill="#ecd5bb" stroke="#9a6a49" strokeWidth="1" />
            <ellipse cx="78.5" cy="8" rx="12.5" ry="3.8" fill="#8a563b" stroke="#f1d8b8" strokeWidth="1.3" />
            <path d="M75 7c2-1 5 0 5 1-1 2-4 1-5-1Z" fill="#f3dfc5" />
          </motion.g>
        )}
      </motion.g>
      <Wheel x={105} radius={9} ride={ride} />
      <Wheel x={52} radius={13} ride={ride} />
    </>
  );
}

export function ConfirmationRobot() {
  const reduce = useReducedMotion();
  return (
    <svg className="confirmation-robot" viewBox="0 0 320 126" aria-hidden="true">
      <path d="M0 100c59 3 87 8 145 8 72 0 106-11 175-13v31H0Z" fill="#f1e7da" />
      <ellipse cx="163" cy="106" rx="71" ry="8" fill="#e2d0bc" />
      <motion.g className="confirmation-ride"
        initial={reduce ? false : { transform: "translateX(-88px)", opacity: 0 }}
        animate={{ transform: "translateX(0px)", opacity: 1 }}
        transition={reduce ? { duration: 0 } : {
          transform: { duration: 0.86, delay: 0.5, ease: easeOut },
          opacity: { duration: 0.23, delay: 0.5, ease: easeOut },
        }}
      >
        <g transform="translate(85 13) scale(1.08)">
          <TurtleBot cup ride={reduce ? "still" : "entrance"} />
        </g>
      </motion.g>
    </svg>
  );
}

const start = 24;
const destination = 208;

export function DeliveryJourney({ tableId, status }: { tableId: TableId; status: OrderStatus }) {
  const reduce = useReducedMotion();
  const travelling = status === "delivering";
  const delivered = status === "delivered";
  const stopped = status === "failed" || status === "cancelled";
  const cup = status === "ready" || travelling || delivered;
  const position = useMotionValue(delivered ? destination : travelling ? (start + destination) / 2 : start);
  const transform = useTransform(position, (value) => `translateX(${value}px)`);
  const movingOpacity = useTransform(position, [start, start + 20, destination - 18, destination], [0.35, 1, 1, 0.35]);

  useLayoutEffect(() => {
    if (stopped) return;
    if (travelling && !reduce) {
      const ride = animate(position, [start, destination], { duration: 5, ease: "linear", repeat: Infinity });
      return () => ride.stop();
    }
    if (delivered && !reduce) {
      const park = animate(position, destination, { duration: 0.55, ease: easeOut });
      return () => park.stop();
    }
    position.set(delivered ? destination : travelling ? (start + destination) / 2 : start);
  }, [delivered, position, reduce, stopped, travelling]);

  return (
    <section className="delivery-journey" data-journey={status} aria-label="Illustrated demo delivery journey">
      <h2>Delivery journey</h2>
      <div className="journey-scene" aria-hidden="true">
        <div className="journey-endpoint"><Store size={25} strokeWidth={1.65} /></div>
        <svg className="journey-route" viewBox="0 0 320 63">
          <path d="M31 49h258" fill="none" stroke="#bea087" strokeWidth="1.5" strokeDasharray="5 5" strokeLinecap="round" />
          <motion.g className="journey-robot" style={{ transform, opacity: travelling && !reduce ? movingOpacity : 1 }}>
            <g transform="scale(.61)">
              <TurtleBot cup={cup} ride={travelling && !reduce ? "travel" : "still"} />
            </g>
          </motion.g>
        </svg>
        <div className="journey-endpoint">
          <Armchair size={25} strokeWidth={1.65} />
          {delivered && (
            <motion.span className="journey-check" initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: reduce ? 0 : 0.5 }}>
              <Check size={11} />
            </motion.span>
          )}
        </div>
      </div>
      <div className="journey-labels"><span>Café</span><span>Table {tableId}</span></div>
    </section>
  );
}
