"use client";

import { useActionState, useEffect, useState } from "react";
import { redeemOrder } from "./actions";

const Star = () => <span aria-hidden="true" style={{ color: "#b3407a" }}>*</span>;

/**
 * One form for everyone, on any phone or computer:
 *  1. the email only → a customer who already has an invitation of this design goes straight in;
 *  2. a first-time buyer is then asked for the Etsy order number (required) and starts the invitation.
 */
export function StartForm({ template, templateName, keyValue }: { template: string; templateName: string; keyValue: string }) {
  const [state, action, pending] = useActionState(redeemOrder, null);
  const [email, setEmail] = useState("");
  const [asked, setAsked] = useState(false); // the order number field stays once it has appeared
  if (state?.needsOrder && !asked) setAsked(true);

  // remember on this device that this design was started: the NEXT visit then asks only for the email
  useEffect(() => {
    if (!state?.ok) return;
    try {
      const have = (document.cookie.split("; ").find((c) => c.startsWith("pi_started="))?.slice(11) ?? "").split(",").filter(Boolean);
      if (!have.includes(template)) have.push(template);
      document.cookie = `pi_started=${have.slice(-8).join(",")}; path=/; max-age=${400 * 86400}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
    } catch { /* cookies blocked: the form simply starts with the email again */ }
  }, [state, template]);

  if (state?.ok) {
    return (
      <div className="ui-card">
        <div role="status" className="ui-auth-stack" style={{ textAlign: "center" }}>
          <h2 className="ui-large-title" style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Check your email</h2>
          <p className="ui-note ui-note-ok" style={{ margin: 0 }}>{state.message}</p>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="ui-card">
        <form action={action} className="ui-auth-stack">
          <input type="hidden" name="template" value={template} />
          <input type="hidden" name="key" value={keyValue} />
          <div style={{ textAlign: "center", padding: "2px 0 6px" }}>
            <p className="ui-label" style={{ margin: 0, fontSize: 11, letterSpacing: ".26em", textTransform: "uppercase" }}>Your design</p>
            <p style={{ margin: "6px 0 0", fontSize: 28, lineHeight: 1.15, fontWeight: 700, letterSpacing: ".01em", color: "var(--ui-label)" }}>{templateName}</p>
          </div>
          <label className="ui-field">
            <span className="ui-label">Your email <Star /></span>
            <input name="email" type="email" required autoComplete="email" inputMode="email" className="ui-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {asked && (
            <>
              <p className="ui-note" style={{ margin: 0, textAlign: "center" }}>First time here? Enter your Etsy order number to start your invitation.</p>
              <label className="ui-field">
                <span className="ui-label">Etsy order number <Star /></span>
                <input name="order" required aria-required="true" autoFocus inputMode="numeric" autoComplete="off" placeholder="3912345678" className="ui-input" />
              </label>
            </>
          )}
          {/* honeypot: people never see or fill this */}
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
          <button disabled={pending} className="ui-btn ui-btn-grad" style={{ width: "100%" }}>{pending ? "Please wait…" : asked ? "Start my invitation" : "Continue"}</button>
          {state && !state.ok && !state.needsOrder && <p role="status" className="ui-note ui-note-err" style={{ margin: 0 }}>{state.message}</p>}
        </form>
      </div>
      {asked && <p className="ui-help" style={{ textAlign: "center", marginTop: 20 }}>You find the order number in your Etsy purchases, or in the confirmation email from Etsy.</p>}
    </>
  );
}
