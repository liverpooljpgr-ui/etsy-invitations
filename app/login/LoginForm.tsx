"use client";

import { useActionState } from "react";
import { sendMagicLink } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm">Email
        <input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2" />
      </label>
      <button disabled={pending} className="w-full rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-60">
        {pending ? "Sending…" : "Send sign-in link"}
      </button>
      {state && <p role="status" className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</p>}
    </form>
  );
}
