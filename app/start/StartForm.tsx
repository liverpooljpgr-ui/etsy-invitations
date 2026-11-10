"use client";

import { useActionState, useEffect } from "react";
import { redeemOrder } from "./actions";

export function StartForm({ template, templateName, keyValue }: { template: string; templateName: string; keyValue: string }) {
  const [state, action, pending] = useActionState(redeemOrder, null);
  // remember on this device that this design was started: the NEXT visit then asks only for the email
  useEffect(() => {
    if (!state?.ok) return;
    try {
      const have = (document.cookie.split("; ").find((c) => c.startsWith("pi_started="))?.slice(11) ?? "").split(",").filter(Boolean);
      if (!have.includes(template)) have.push(template);
      document.cookie = `pi_started=${have.slice(-8).join(",")}; path=/; max-age=${400 * 86400}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
    } catch { /* cookies blocked: the full form simply shows again next time */ }
  }, [state, template]);
  if (state?.ok) {
    return (
      <div role="status" className="ui-auth-stack" style={{ textAlign: "center" }}>
        <h2 className="ui-large-title" style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Check your email</h2>
        <p className="ui-note ui-note-ok" style={{ margin: 0 }}>{state.message}</p>
      </div>
    );
  }
  return (
    <form action={action} className="ui-auth-stack">
      <input type="hidden" name="template" value={template} />
      <input type="hidden" name="key" value={keyValue} />
      <div style={{ textAlign: "center", padding: "2px 0 6px" }}>
        <p className="ui-label" style={{ margin: 0, fontSize: 11, letterSpacing: ".26em", textTransform: "uppercase" }}>Your design</p>
        <p style={{ margin: "6px 0 0", fontSize: 28, lineHeight: 1.15, fontWeight: 700, letterSpacing: ".01em", color: "var(--ui-label)" }}>{templateName}</p>
      </div>
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
