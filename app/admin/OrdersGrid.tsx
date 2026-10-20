"use client";

import { useState } from "react";
import { saveOrderNote } from "./actions";
import { DeleteButton } from "./DeleteButton";
import { NewLinkButton } from "./NewLinkButton";

export type OrderRow = {
  id: string; orderId: string; purchased: string; template: string; etsy: string;
  email: string | null; status: string; expires: string | null; note: string;
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

/** A few words of private notes, saved when you leave the field or press Enter. */
function NoteField({ orderId, initial }: { orderId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [last, setLast] = useState(initial);
  async function commit() {
    if (value.trim() === last.trim()) return;
    setSaved("saving");
    const r = await saveOrderNote(orderId, value);
    if (r.ok) { setLast(value); setSaved("ok"); setTimeout(() => setSaved("idle"), 1800); } else setSaved("err");
  }
  return (
    <div className="adm-note">
      <input
        className="ui-input adm-note-input" value={value} maxLength={80} placeholder="Add a note…" aria-label="Note"
        onChange={(e) => { setValue(e.target.value); setSaved("idle"); }}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      />
      <span className="adm-note-state" data-s={saved} aria-live="polite">{saved === "saving" ? "Saving…" : saved === "ok" ? "Saved ✓" : saved === "err" ? "Not saved" : ""}</span>
    </div>
  );
}

export function OrdersGrid({ rows }: { rows: OrderRow[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? rows.filter((r) => [r.etsy, r.email ?? "", r.template, r.note, r.status].some((x) => x.toLowerCase().includes(needle)))
    : rows;

  return (
    <div>
      <div className="adm-tools">
        <input className="ui-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by order number, email, note…" aria-label="Search orders" />
        <span className="ui-help" style={{ whiteSpace: "nowrap" }}>{shown.length} {shown.length === 1 ? "order" : "orders"}</span>
      </div>

      <div className="adm-grid" role="table" aria-label="Orders">
        <div className="adm-head" role="row">
          <span role="columnheader">Date</span>
          <span role="columnheader">Template</span>
          <span role="columnheader">Order #</span>
          <span role="columnheader">Email</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">Expires</span>
          <span role="columnheader">Notes</span>
          <span role="columnheader" aria-label="Actions" />
        </div>
        {shown.length === 0 && <p className="ui-help" style={{ padding: "18px 16px", margin: 0 }}>{rows.length === 0 ? "No orders yet. Create the first one in the “New purchase” tab." : "Nothing matches your search."}</p>}
        {shown.map((r) => (
          <div className="adm-line" role="row" key={r.id}>
            <span role="cell" data-label="Date">{fmt(r.purchased)}</span>
            <span role="cell" data-label="Template" className="adm-strong">{r.template}</span>
            <span role="cell" data-label="Order #">{r.etsy}</span>
            <span role="cell" data-label="Email">{r.email ?? <em className="adm-muted">link not opened yet</em>}</span>
            <span role="cell" data-label="Status"><b className={`dash-pill ${r.status === "published" ? "dash-live" : ""}`} style={{ marginTop: 0 }}>{r.status === "published" ? "Published" : r.status === "draft" ? "Draft" : r.status}</b></span>
            <span role="cell" data-label="Expires">{r.expires ? fmt(r.expires) : <em className="adm-muted">starts when published</em>}</span>
            <span role="cell" data-label="Notes"><NoteField orderId={r.orderId} initial={r.note} /></span>
            <span role="cell" className="adm-actions">
              {!r.email && <NewLinkButton invitationId={r.id} />}
              <DeleteButton invitationId={r.id} label={`${r.template} · Etsy ${r.etsy}${r.email ? ` (${r.email})` : ""}`} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
