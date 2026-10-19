"use client";

import { useActionState } from "react";
import { startClaim } from "./actions";

export function ClaimForm({ token, label = "Continue" }: { token: string; label?: string }) {
  const [state, action, pending] = useActionState(startClaim.bind(null, token), null);
  return (
    <form action={action} className="ui-auth-stack">
      <label className="ui-field">
        <span className="ui-label">Your email</span>
        <input name="email" type="email" required autoComplete="email" inputMode="email" className="ui-input" />
      </label>
      <button disabled={pending} className="ui-btn ui-btn-primary" style={{ width: "100%" }}>{pending ? "Please wait…" : label}</button>
      {state && <p role="status" className={`ui-note ${state.ok ? "ui-note-ok" : "ui-note-err"}`} style={{ margin: 0 }}>{state.message}</p>}
    </form>
  );
}
