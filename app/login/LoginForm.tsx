"use client";

import Link from "next/link";
import { useActionState } from "react";
import { sendAdminLink, signInAdminPassword, signInByEmail } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInByEmail, null);
  const [pwState, pwAction, pwPending] = useActionState(signInAdminPassword, null);
  const [linkState, linkAction, linkPending] = useActionState(sendAdminLink, null);

  const needsPassword = !!state?.needsPassword || !!pwState?.needsPassword || !!linkState?.needsPassword;
  const email = linkState?.email || pwState?.email || state?.email || "";

  if (needsPassword) {
    return (
      <div className="ui-auth-stack">
        <form action={pwAction} className="ui-auth-stack">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="email" value={email} />
          <p className="ui-help" style={{ margin: 0 }}>Signing in as <b style={{ color: "var(--ui-label)" }}>{email}</b></p>
          <label className="ui-field">
            <span className="ui-label">Password</span>
            <input name="password" type="password" required autoFocus autoComplete="current-password" className="ui-input" />
          </label>
          <button disabled={pwPending} className="ui-btn ui-btn-grad" style={{ width: "100%" }}>{pwPending ? "Signing in…" : "Sign in"}</button>
          {pwState && !pwState.ok && <p role="alert" className="ui-note ui-note-err" style={{ margin: 0 }}>{pwState.message}</p>}
        </form>
        <form action={linkAction} className="ui-auth-stack">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="email" value={email} />
          <button disabled={linkPending} className="ui-btn ui-btn-gray" style={{ width: "100%" }}>{linkPending ? "Sending…" : "Email me a sign-in link instead"}</button>
          {linkState && <p role="status" className={`ui-note ${linkState.ok ? "ui-note-ok" : "ui-note-err"}`} style={{ margin: 0 }}>{linkState.message}</p>}
        </form>
        <p className="ui-help" style={{ textAlign: "center" }}><Link href="/login" className="ui-link">Use a different email</Link></p>
      </div>
    );
  }

  return (
    <form action={action} className="ui-auth-stack">
      <input type="hidden" name="next" value={next} />
      <label className="ui-field">
        <span className="ui-label">Email</span>
        <input name="email" type="email" required autoComplete="email" inputMode="email" className="ui-input" />
      </label>
      <button disabled={pending} className="ui-btn ui-btn-grad" style={{ width: "100%" }}>{pending ? "Signing in…" : "Sign in"}</button>
      {state && !state.ok && <p role="alert" className="ui-note ui-note-err" style={{ margin: 0 }}>{state.message}</p>}
    </form>
  );
}
