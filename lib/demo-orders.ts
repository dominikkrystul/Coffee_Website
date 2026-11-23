import { findCoffee, type TableId } from "./catalog";
import {
  deliveryStages,
  type CartSelection,
  type CustomerOrder,
  type OrderAdapter,
  type OrderStatus,
} from "./orders";

type DemoOrder = CustomerOrder & { playbackStartedAt?: number };
type TableState = {
  cart: CartSelection | null;
  orders: Record<string, DemoOrder>;
  latestOrderId?: string;
  latestLiveOrderId?: string;
  liveTokens?: Record<string, string>;
};

const storageKey = (tableId: TableId) => `t3-coffee:v1:${tableId}`;
const changeEvent = "t3-coffee:change";
const demoStepMs = 3000;

export function storageSnapshot(tableId: TableId) {
  try {
    return localStorage.getItem(storageKey(tableId));
  } catch {
    return null;
  }
}

export function readSnapshot(snapshot: string | null): TableState {
  try {
    const state = JSON.parse(snapshot ?? "null");
    if (state && typeof state.orders === "object" && state.orders) return state;
  } catch {
    // A corrupt local demo record can be replaced by the next cart action.
  }
  return { cart: null, orders: {} };
}

export function subscribeToTable(tableId: TableId, onChange: () => void) {
  const key = storageKey(tableId);
  function localChange(event: Event) {
    if ((event as CustomEvent<string>).detail === key) onChange();
  }
  function otherTabChange(event: StorageEvent) {
    if (event.key === key || event.key === null) onChange();
  }
  window.addEventListener(changeEvent, localChange);
  window.addEventListener("storage", otherTabChange);
  return () => {
    window.removeEventListener(changeEvent, localChange);
    window.removeEventListener("storage", otherTabChange);
  };
}

function readTable(tableId: TableId) {
  return readSnapshot(storageSnapshot(tableId));
}

function saveTable(tableId: TableId, state: TableState) {
  const key = storageKey(tableId);
  localStorage.setItem(key, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(changeEvent, { detail: key }));
}

function updateTable<T>(tableId: TableId, update: (state: TableState) => T): Promise<T> {
  function write() {
    const state = readTable(tableId);
    const result = update(state);
    saveTable(tableId, state);
    return result;
  }

  // shortcut: browsers without Web Locks serialize within one tab only, use server idempotency for the real adapter
  return navigator.locks ? navigator.locks.request(storageKey(tableId), write) : Promise.resolve().then(write);
}

function newOrderId() {
  // getRandomValues also works on the HTTP development server when opened by LAN IP.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

export function selectCoffee(tableId: TableId, productId: string) {
  return updateTable(tableId, (state) => {
    if (!findCoffee(productId)) throw new Error("This coffee is unavailable.");
    if (state.cart?.productId !== productId) state.cart = { id: newOrderId(), productId };
  });
}

export function removeCoffee(tableId: TableId, id: string) {
  return updateTable(tableId, (state) => {
    if (state.cart?.id === id) state.cart = null;
  });
}

function currentOrder(order: DemoOrder | undefined): CustomerOrder | null {
  if (!order) return null;
  const { playbackStartedAt, ...customerOrder } = order;
  if (playbackStartedAt === undefined) return customerOrder;

  const step = Math.max(0, Math.floor((Date.now() - playbackStartedAt) / demoStepMs));
  return { ...customerOrder, status: deliveryStages[Math.min(step, deliveryStages.length - 1)] };
}

export const demoOrderAdapter: OrderAdapter = {
  submit(request) {
    const { tableId, id, productId, quantity } = request;
    return updateTable(tableId, (state) => {
      const existing = state.orders[id];
      if (existing) {
        if (existing.productId !== productId || quantity !== 1) throw new Error("This order reference was already used.");
        return { order: currentOrder(existing)! };
      }

      const coffee = findCoffee(productId);
      if (!coffee || quantity !== 1 || state.cart?.id !== id || state.cart.productId !== productId) {
        throw new Error("Your cart changed. Review it before placing an order.");
      }

      const order: CustomerOrder = {
        ...request,
        createdAt: new Date().toISOString(),
        status: "received",
        price: coffee.price,
        productName: coffee.name,
      };
      state.orders[id] = order;
      state.latestOrderId = id;
      state.cart = null;
      return { order };
    });
  },

  async get(tableId, id) {
    return currentOrder(readTable(tableId).orders[id]);
  },

  subscribe(tableId, id, onChange) {
    let timer: number | undefined;

    function schedule() {
      window.clearTimeout(timer);
      const order = readTable(tableId).orders[id];
      const start = order?.playbackStartedAt;
      if (start === undefined) return;
      const elapsed = Math.max(0, Date.now() - start);
      if (elapsed >= demoStepMs * (deliveryStages.length - 1)) return;

      timer = window.setTimeout(() => {
        onChange();
        schedule();
      }, demoStepMs - (elapsed % demoStepMs));
    }

    const unsubscribe = subscribeToTable(tableId, () => {
      onChange();
      schedule();
    });
    schedule();
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  },
};

export function startDemoPlayback(tableId: TableId, id: string) {
  return updateTable(tableId, ({ orders }) => {
    const order = orders[id];
    if (order?.status === "received") order.playbackStartedAt ??= Date.now();
  });
}

export function setDemoStatus(tableId: TableId, id: string, status: OrderStatus) {
  return updateTable(tableId, ({ orders }) => {
    const order = orders[id];
    if (!order) return;
    order.status = status;
    delete order.playbackStartedAt;
  });
}

export function liveOrderToken(tableId: TableId, id: string) {
  return readTable(tableId).liveTokens?.[id];
}

export function rememberLiveOrder(tableId: TableId, selectionId: string, orderId: string, token: string) {
  return updateTable(tableId, (state) => {
    (state.liveTokens ??= {})[orderId] = token;
    state.latestLiveOrderId = orderId;
    if (state.cart?.id === selectionId) state.cart = null;
  });
}
