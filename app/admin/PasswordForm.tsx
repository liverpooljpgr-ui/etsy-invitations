"use client";

import { useActionState } from "react";
import { setAdminPassword } from "./actions";

/** The admin chooses their own password here (after signing in once with the emailed link). */
export function PasswordForm() {
  const [s, action, pending] = useActionState(setAdminPassword, null);
  return (
    <form action={action} className="ui-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p className="ui-help" style={{ margin: 0 }}>After you set a password, sign in at <b>/login</b> with your email and this password. The emailed link stays available as a fallback.</p>
      <label className="ui-field">
        <span className="ui-label">New password (at least 10 characters)</span>
        <input name="password" type="password" required minLength={10} autoComplete="new-password" className="ui-input" />
      </label>
      <label className="ui-field">
        <span className="ui-label">Repeat password</span>
        <input name="confirm" type="password" required minLength={10} autoComplete="new-password" className="ui-input" />
      </label>
      <button disabled={pending} className="ui-btn ui-btn-primary" style={{ width: "100%" }}>{pending ? "Saving…" : "Save password"}</button>
      {s && <p role="status" className={`ui-note ${s.ok ? "ui-note-ok" : "ui-note-err"}`} style={{ margin: 0 }}>{s.message}</p>}
    </form>
  );
}
