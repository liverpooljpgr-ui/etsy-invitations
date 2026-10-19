"use client";

import { useActionState, useState } from "react";
import { createPurchase } from "./actions";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ui-linkfield">
      <input readOnly value={value} aria-label="Personal link" onFocus={(e) => e.currentTarget.select()} style={{ background: "var(--ui-fill)" }} />
      <button type="button" className="ui-btn ui-btn-black" onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* select the field instead */ } }}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function CreateForm({ templates }: { templates: { id: string; name: string }[] }) {
  const [s, action, pending] = useActionState(createPurchase, null);
  return (
    <form action={action} className="ui-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h3>New purchase link</h3>
      <label className="ui-field">
        <span className="ui-label">Template they bought</span>
        <select name="templateId" required className="ui-input" defaultValue={templates[0]?.id}>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      <label className="ui-field">
        <span className="ui-label">Etsy order reference</span>
        <input name="etsyRef" required maxLength={60} className="ui-input" />
      </label>
      <button disabled={pending} className="ui-btn ui-btn-primary" style={{ width: "100%" }}>{pending ? "Creating…" : "Create link"}</button>
      {s && (
        <div role="status" className={`ui-note ${s.ok ? "ui-note-ok" : "ui-note-err"}`} style={{ margin: 0 }}>
          <p style={{ margin: 0 }}>{s.message}</p>
          {s.claimUrl && <CopyField value={s.claimUrl} />}
        </div>
      )}
    </form>
  );
}
