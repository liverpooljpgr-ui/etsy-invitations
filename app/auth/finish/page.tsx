"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { LoginForm } from "@/app/login/LoginForm";

/** Completes an emailed sign-in link opened on any device: reads the tokens from the URL fragment and starts the session here. */
export default function AuthFinish() {
  const [failed, setFailed] = useState(false);
  const [nextPath, setNextPath] = useState("/dashboard");

  useEffect(() => {
    const frag = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const access_token = frag.get("access_token");
    const refresh_token = frag.get("refresh_token");
    const nextParam = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
    const next = nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.includes("\\") ? nextParam : "/dashboard";
    const start = access_token && refresh_token
      ? createBrowserSupabase().auth.setSession({ access_token, refresh_token }).then(({ error }) => !error)
      : Promise.resolve(false);
    void start.then((ok) => {
      if (ok) { window.location.replace(next); return; } // full load so the server sees the new session cookie
      // no valid tokens: the link was already used (or has expired). It must NOT open the invitation, even if this device is still signed in.
      setNextPath(next);
      setFailed(true);
    });
  }, []);

  return (
    <div className="ui ui-center">
      <main className="ui-auth">
        {failed ? (
          <>
            <h1 className="ui-accent" style={{ margin: "0 0 2px", fontSize: 64, lineHeight: 1.1, textAlign: "center", fontWeight: 400, color: "var(--ui-label)" }}>Welcome back</h1>
            <p className="ui-lede" style={{ textAlign: "center" }}>This confirmation link works only once and has already been used. Enter the email you used the first time to continue.</p>
            <div className="ui-card"><LoginForm next={nextPath} /></div>
          </>
        ) : (
          <p className="ui-lede" style={{ textAlign: "center" }}>Opening your invitation…</p>
        )}
      </main>
    </div>
  );
}
