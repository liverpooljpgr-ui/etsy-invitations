"use client";

import { useActionState, useState } from "react";
import { createPurchase } from "./actions";

const input = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex gap-2">
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded border border-stone-300 bg-stone-50 px-2 py-1 font-mono text-xs" />
      <button type="button" className="rounded bg-stone-900 px-3 text-xs text-white" onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* select the field instead */ } }}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function CreateForm({ templates }: { templates: { id: string; name: string }[] }) {
  const [s, action, pending] = useActionState(createPurchase, null);
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="font-medium">New purchase link</h2>
      <label className="text-sm">Template they bought
        <select name="templateId" required className={input} defaultValue={templates[0]?.id}>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      <label className="text-sm">Etsy order reference<input name="etsyRef" required maxLength={60} className={input} /></label>
      <button disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-60">{pending ? "Creating…" : "Create link"}</button>
      {s && (
        <div role="status" className={`text-sm ${s.ok ? "text-green-800" : "text-red-700"}`}>
          <p>{s.message}</p>
          {s.claimUrl && <CopyField value={s.claimUrl} />}
        </div>
      )}
    </form>
  );
}
