"use client";

import Link from "next/link";
import { useCallback, useState, useSyncExternalStore } from "react";
import { statusCopy } from "../../components/order-screen";
import { isTableId, tableIds, type TableId } from "../../lib/catalog";
import { readSnapshot, setDemoStatus, storageSnapshot, subscribeToTable } from "../../lib/demo-orders";
import { deliveryStages, type OrderStatus } from "../../lib/orders";

const statuses = [...deliveryStages, "failed", "cancelled"] satisfies OrderStatus[];
const emptySnapshot = () => null;

export function DemoTools() {
  const [tableId, setTableId] = useState<TableId>("T1");
  const [message, setMessage] = useState("");
  const subscribe = useCallback((change: () => void) => subscribeToTable(tableId, change), [tableId]);
  const getSnapshot = useCallback(() => storageSnapshot(tableId), [tableId]);
  const { latestOrderId } = readSnapshot(useSyncExternalStore(subscribe, getSnapshot, emptySnapshot));

  async function update(status: OrderStatus) {
    if (!latestOrderId) return;
    try {
      await setDemoStatus(tableId, latestOrderId, status);
      setMessage(`${tableId} updated to ${statusCopy[status].title}.`);
    } catch {
      setMessage("The status could not be saved.");
    }
  }

  return (
    <div className="dev-tools">
      <nav aria-label="Test table menus" className="dev-grid">
        {tableIds.map((id) => <Link key={id} href={`/table/${id}`} className="button secondary">Table {id}</Link>)}
      </nav>
      <h2>Simulate a status</h2>
      <label htmlFor="demo-table">Delivery table</label>
      <select id="demo-table" value={tableId} onChange={(event) => {
        if (isTableId(event.target.value)) setTableId(event.target.value);
        setMessage("");
      }}>
        {tableIds.map((id) => <option key={id}>{id}</option>)}
      </select>
      {latestOrderId ? (
        <>
          <Link className="text-link" target="_blank" rel="noopener" href={`/table/${tableId}/order/${latestOrderId}/tracking`}>Open order tracking in a new tab</Link>
          <div className="dev-grid">
            {statuses.map((status) => <button key={status} className="button secondary" onClick={() => update(status)}>{statusCopy[status].title}</button>)}
          </div>
        </>
      ) : <p>Place a demo order for {tableId} to set its status.</p>}
      <p role="status">{message}</p>
    </div>
  );
}
