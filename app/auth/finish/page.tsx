"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

/** Completes an emailed sign-in link opened on any device: reads the tokens from the URL fragment and starts the session here. */
export default function AuthFinish() {
  const [failed, setFailed] = useState(false);

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
      else setFailed(true);
    });
  }, []);

  return (
    <main className="mx-auto max-w-sm px-5 py-20 text-center">
      {failed ? (
        <>
          <h1 className="font-serif text-2xl mb-2">This link no longer works</h1>
          <p className="text-sm text-stone-600 mb-6">It may have expired or already been used. Open your personal link again and enter your email to get a fresh one.</p>
          <Link className="underline text-sm" href="/login">Go to sign in</Link>
        </>
      ) : (
        <p className="text-sm text-stone-600">Opening your invitation…</p>
      )}
    </main>
  );
}
