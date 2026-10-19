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
      if (ok) window.location.replace(next); // full load so the server sees the new session cookie
      else { setNextPath(next); setFailed(true); }
    });
  }, []);

  return (
    <main className="mx-auto max-w-sm px-5 py-20">
      {failed ? (
        <>
          <h1 className="font-serif text-3xl mb-2">Welcome back</h1>
          <p className="text-base text-stone-700 mb-6">This link was already used. Sign in with the email you used the very first time.</p>
          <LoginForm next={nextPath} />
        </>
      ) : (
        <p className="text-sm text-stone-600 text-center">Opening your invitation…</p>
      )}
    </main>
  );
}
