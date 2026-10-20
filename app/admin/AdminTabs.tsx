"use client";

import { useState } from "react";

const TABS = [
  { id: "new", label: "New purchase" },
  { id: "orders", label: "Orders" },
  { id: "settings", label: "Settings" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Three admin tabs. The chosen tab is kept in the address (?tab=orders), so a refresh or a shared link opens the same one. */
export function AdminTabs({ initial, counts, panels }: { initial: TabId; counts: { orders: number }; panels: Record<TabId, React.ReactNode> }) {
  const [tab, setTab] = useState<TabId>(initial);
  const pick = (id: TabId) => {
    setTab(id);
    window.history.replaceState(null, "", id === "new" ? window.location.pathname : `?tab=${id}`);
  };
  return (
    <>
      <div className="adm-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`adm-tab ${tab === t.id ? "adm-tab-on" : ""}`} onClick={() => pick(t.id)}>
            {t.label}{t.id === "orders" && <b>{counts.orders}</b>}
          </button>
        ))}
      </div>
      {TABS.map((t) => (
        <div key={t.id} role="tabpanel" hidden={tab !== t.id}>{panels[t.id]}</div>
      ))}
    </>
  );
}
