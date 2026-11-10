"use client";

import { useActionState } from "react";
import { returnByEmail } from "./actions";

export function ReturnForm() {
  const [state, action, pending] = useActionState(returnByEmail, null);
  if (state?.ok) return <p role="status" className="ui-note ui-note-ok" style={{ margin: 0 }}>{state.message}</p>;
  return (
    <form action={action} className="ui-auth-stack">
      <label className="ui-field">
        <span className="ui-label">Your email</span>
        <input name="email" type="email" required autoFocus autoComplete="email" inputMode="email" className="ui-input" />
      </label>
      <button disabled={pending} className="ui-btn ui-btn-grad" style={{ width: "100%" }}>{pending ? "Please wait…" : "Continue"}</button>
      {state && <p role="alert" className="ui-note ui-note-err" style={{ margin: 0 }}>{state.message}</p>}
    </form>
  );
}
