"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createInvitation } from "./actions";

const input = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2";

export function CreateForm() {
  const [s, action, pending] = useActionState(createInvitation, null);
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="font-medium">New invitation</h2>
      <label className="text-sm">Plan
        <select name="plan" className={input} defaultValue="signature">
          <option value="essential">Essential</option>
          <option value="signature">Signature</option>
          <option value="signature_rsvp">Signature RSVP</option>
          <option value="personalized_setup">Personalized Setup</option>
        </select>
      </label>
      <label className="text-sm">Title (e.g. Adele &amp; Oliver)<input name="title" required maxLength={80} className={input} /></label>
      <label className="text-sm">Guest link slug (e.g. adele-oliver)<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={40} className={input} /></label>
      <label className="text-sm">Etsy order reference (optional)<input name="etsyRef" maxLength={60} className={input} /></label>
      <fieldset className="text-sm">
        <legend>Who edits it?</legend>
        <label className="mr-4"><input type="radio" name="owner" value="claim" defaultChecked /> Customer (claim link)</label>
        <label><input type="radio" name="owner" value="me" /> Me (Personalized Setup)</label>
      </fieldset>
      <button disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2 text-white disabled:opacity-60">{pending ? "Creating…" : "Create"}</button>
      {s && (
        <div role="status" className={`text-sm ${s.ok ? "text-green-800" : "text-red-700"}`}>
          <p>{s.message}</p>
          {s.claimUrl && <input readOnly value={s.claimUrl} onFocus={(e) => e.currentTarget.select()} className="mt-2 w-full rounded border border-stone-300 bg-stone-50 px-2 py-1 font-mono text-xs" />}
          {s.editorUrl && <Link className="underline" href={s.editorUrl}>Open editor</Link>}
        </div>
      )}
    </form>
  );
}
