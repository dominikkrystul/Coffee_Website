"use client";

import { animate, MotionConfig, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { Footer, Header } from "./chrome";
import { easeOut } from "./motion-tokens";
import type { TableId } from "../lib/catalog";

const historyKey = "t3CoffeePosition";
const screenOrder = ["menu", "coffee", "cart", "checkout", "confirmation", "tracking"];

function flowScreen(path: string) {
  const [, , , section, , action] = path.split("/");
  return action ?? section ?? "menu";
}

export function CustomerShell({ tableId, children }: { tableId: TableId; children: React.ReactNode }) {
  const path = usePathname();
  const screen = flowScreen(path);
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const previous = useRef<{ path: string; position: number }>(null);

  useLayoutEffect(() => {
    const currentEntry = window.history.state;
    const knownPosition: number | undefined = currentEntry?.[historyKey];
    const last = previous.current;
    const position = knownPosition ?? (last ? last.position + Number(last.path !== path) : 0);

    // Mark the current entry without changing its URL or Next.js history state.
    if (knownPosition === undefined) window.history.replaceState({ ...currentEntry, [historyKey]: position }, "");
    previous.current = { path, position };
    if (!last || last.path === path || !panel.current) return;

    const backward = knownPosition !== undefined
      ? position < last.position
      : screenOrder.indexOf(screen) < screenOrder.indexOf(flowScreen(last.path));
    const node = panel.current;
    if (knownPosition === undefined) window.scrollTo({ top: 0, behavior: "instant" });
    node.querySelector<HTMLElement>(".ordering")?.focus({ preventScroll: true });
    node.dataset.direction = backward ? "back" : "forward";
    const entrance = animate(node, {
      opacity: [reduce ? 0.78 : 0, 1],
      transform: [reduce ? "none" : `translateX(${backward ? -20 : 20}px)`, "none"],
    }, { duration: reduce ? 0.12 : 0.26, ease: easeOut });

    return () => {
      entrance.stop();
      node.style.removeProperty("opacity");
      node.style.removeProperty("transform");
    };
  }, [path, reduce, screen]);

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: easeOut }}>
      <div className="site customer-site">
        <Header tableId={tableId} />
        <div ref={panel} className="customer-panel">{children}</div>
        <Footer />
      </div>
    </MotionConfig>
  );
}
