"use client";

import { useActionState } from "react";
import { redeemOrder } from "./actions";

export function StartForm({ template, templateName, keyValue }: { template: string; templateName: string; keyValue: string }) {
  const [state, action, pending] = useActionState(redeemOrder, null);
  if (state?.ok) return <p role="status" className="ui-note ui-note-ok" style={{ margin: 0 }}>{state.message}</p>;
  return (
    <form action={action} className="ui-auth-stack">
      <input type="hidden" name="template" value={template} />
      <input type="hidden" name="key" value={keyValue} />
      <p className="ui-help" style={{ margin: 0 }}>Your design: <b>{templateName}</b></p>
      <label className="ui-field">
        <span className="ui-label">Etsy order number</span>
        <input name="order" required inputMode="numeric" autoComplete="off" placeholder="3912345678" className="ui-input" />
      </label>
      <label className="ui-field">
        <span className="ui-label">Your email</span>
        <input name="email" type="email" required autoComplete="email" inputMode="email" className="ui-input" />
      </label>
      {/* honeypot: people never see or fill this */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
      <button disabled={pending} className="ui-btn ui-btn-grad" style={{ width: "100%" }}>{pending ? "Please wait…" : "Start my invitation"}</button>
      {state && <p role="status" className="ui-note ui-note-err" style={{ margin: 0 }}>{state.message}</p>}
    </form>
  );
}
