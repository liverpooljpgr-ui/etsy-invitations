"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Invitation } from "@/components/invitation/Invitation";
import { applyPlan, THEMES, type Content, type PlanFeatures } from "@/lib/content/schema";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { publishInvitation, saveDraft, unpublishInvitation } from "./actions";

type Props = {
  id: string; title: string; slug: string; status: string;
  features: PlanFeatures; initialDraft: Content; initialVersion: number;
};
type SaveState = "saved" | "dirty" | "saving" | "error";

const inputCls = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm text-stone-700">{label}{children}</label>;
}
/** Focusing any field scrolls the live preview to the matching card (desktop side-by-side only). */
function Section({ title, n, children }: { title: string; n?: number; children: React.ReactNode }) {
  const jump = () => {
    if (!n || !window.matchMedia("(min-width: 1024px)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector(`[data-card="${n}"]`)?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  };
  return (
    <fieldset onFocus={jump} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <legend className="px-1 font-medium">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Downscale + re-encode as WebP in the browser (also strips EXIF/GPS). */
async function prepareImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/webp", 0.85));
}

export function EditorForm({ id, title, slug, status: initialStatus, features, initialDraft, initialVersion }: Props) {
  const [draft, setDraft] = useState<Content>(initialDraft);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [status, setStatus] = useState(initialStatus);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const latest = useRef(draft);
  const version = useRef(initialVersion);
  const inFlight = useRef(false);
  const again = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flush = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) { again.current = true; return false; }
    inFlight.current = true;
    setSaveState("saving");
    try {
      for (;;) {
        const sent = latest.current;
        again.current = false;
        const r = await saveDraft(id, sent, version.current).catch(() => ({ ok: false as const, error: "Network error. Your changes are kept on this page; retrying…" }));
        if (!r.ok) { setSaveError(r.error); setSaveState("error"); return false; }
        version.current = r.version;
        setSaveError("");
        if (latest.current === sent && !again.current) { setSaveState("saved"); return true; }
      }
    } finally {
      inFlight.current = false;
    }
  }, [id]);

  const update = useCallback((fn: (d: Content) => Content) => {
    setDraft((d) => {
      const next = fn(d);
      latest.current = next;
      return next;
    });
    setSaveState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 1000);
  }, [flush]);

  // retry after an error, and warn before leaving with unsaved changes
  useEffect(() => {
    if (saveState !== "error") return;
    const t = setTimeout(() => void flush(), 5000);
    return () => clearTimeout(t);
  }, [saveState, flush]);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (saveState !== "saved") e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [saveState]);

  const preview = useMemo(() => applyPlan(draft, features), [draft, features]);
  const publicUrl = typeof window === "undefined" ? `/${slug}` : `${window.location.origin}/${slug}`;

  async function onPublish() {
    setBusy(true); setNotice(null);
    clearTimeout(timer.current);
    const saved = saveState === "saved" || (await flush());
    if (!saved) { setBusy(false); setNotice({ ok: false, text: "Could not save your latest changes, so nothing was published." }); return; }
    const r = await publishInvitation(id).catch(() => ({ ok: false as const, error: "Network error. Nothing was published." }));
    setBusy(false);
    if (r.ok) { setStatus("published"); setNotice({ ok: true, text: "Published! Your guest link is ready below." }); }
    else setNotice({ ok: false, text: r.error + ("missing" in r && r.missing ? ` Missing: ${r.missing.join(", ")}.` : "") });
  }
  async function onUnpublish() {
    if (!confirm("Unpublish? Guests will no longer be able to open the link until you publish again.")) return;
    setBusy(true);
    const r = await unpublishInvitation(id);
    setBusy(false);
    if (r.ok) { setStatus("draft"); setNotice({ ok: true, text: "Unpublished. Your draft is kept." }); }
    else setNotice({ ok: false, text: r.error ?? "Could not unpublish." });
  }
  async function onPhoto(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setNotice({ ok: false, text: "Please choose a JPG, PNG or WebP image." });
    if (file.size > 15 * 1024 * 1024) return setNotice({ ok: false, text: "Image is too large (max 15 MB)." });
    setNotice(null);
    try {
      const blob = await prepareImage(file);
      const supabase = createBrowserSupabase();
      const path = `${id}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("invitation-media").upload(path, blob, { contentType: "image/webp" });
      if (error) throw error;
      const { data } = supabase.storage.from("invitation-media").getPublicUrl(path);
      update((d) => ({ ...d, photo: { url: data.publicUrl, alt: d.photo?.alt ?? "" } }));
    } catch {
      setNotice({ ok: false, text: "Photo upload failed. Please try again." });
    }
  }

  const set = <K extends keyof Content>(k: K, v: Content[K]) => update((d) => ({ ...d, [k]: v }));
  const tp = (k: keyof Content["texts"]) => ({
    value: draft.texts[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set("texts", { ...draft.texts, [k]: e.target.value }),
  });
  const stateLabel = { saved: "All changes saved", dirty: "Unsaved changes…", saving: "Saving…", error: "Not saved" }[saveState];
  const editable = status === "draft" || status === "published";

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/dashboard" className="text-sm text-stone-500 hover:underline">←</Link>
          <h1 className="min-w-0 flex-1 truncate font-medium">{title}</h1>
          <a href={`/preview/${id}`} target="_blank" rel="noopener noreferrer" className="hidden text-sm underline sm:inline">Preview animation</a>
          <span role="status" className={`text-xs ${saveState === "error" ? "text-red-700" : "text-stone-500"}`}>{stateLabel}</span>
          <button onClick={onPublish} disabled={busy || !editable} className="rounded-lg bg-stone-900 px-4 py-1.5 text-sm text-white disabled:opacity-50">
            {status === "published" ? "Update published" : "Publish"}
          </button>
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 px-4 pb-2 lg:hidden">
          {(["edit", "preview"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1 text-sm ${tab === t ? "bg-stone-900 text-white" : "bg-stone-100"}`}>{t === "edit" ? "Details" : "Preview"}</button>
          ))}
        </div>
      </header>

      {(saveError || notice) && (
        <div className="mx-auto max-w-6xl px-4 pt-3">
          {saveError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{saveError}</p>}
          {notice && <p role="status" className={`mt-2 rounded-lg p-3 text-sm ${notice.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{notice.text}</p>}
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className={`space-y-4 ${tab === "preview" ? "hidden lg:block" : ""}`}>
          {status === "published" && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
              <p className="mb-2 font-medium text-green-900">Your invitation is live. Send this link to your guests:</p>
              <div className="flex gap-2">
                <input readOnly value={publicUrl} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded border border-green-300 bg-white px-2 py-1 font-mono text-xs" />
                <button onClick={async () => { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="rounded bg-green-800 px-3 text-white">{copied ? "Copied" : "Copy"}</button>
                <a href={`/${slug}`} target="_blank" rel="noopener noreferrer" className="rounded border border-green-800 px-3 py-1 text-green-900">Open</a>
              </div>
              <button onClick={onUnpublish} disabled={busy} className="mt-3 text-xs text-green-900 underline">Unpublish</button>
            </div>
          )}

          <Section title="Style">
            <div className="flex flex-wrap items-center gap-2">
              {THEMES.map((t) => (
                <button key={t} type="button" onClick={() => set("theme", t)} aria-pressed={draft.theme === t} className={`rounded-full border px-4 py-1.5 text-sm capitalize ${draft.theme === t ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`}>{t}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={draft.decor === "butterfly"} onChange={(e) => set("decor", e.target.checked ? "butterfly" : "none")} />
              Butterfly decoration (cards 2 and 3)
            </label>
          </Section>

          <Section n={1} title="Card 1 · Envelope">
            <Field label="Wax seal text (up to 4 characters — leave empty to use your initials)">
              <input className={inputCls} maxLength={4} placeholder="A&O" value={draft.seal.text} onChange={(e) => set("seal", { text: e.target.value })} />
            </Field>
          </Section>

          <Section n={2} title="Card 2 · Opening line">
            <Field label="Text"><input className={inputCls} maxLength={60} {...tp("invited")} /></Field>
          </Section>

          <Section n={3} title="Card 3 · Names">
            <Field label="Small headline"><input className={inputCls} maxLength={60} {...tp("headline")} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name"><input className={inputCls} maxLength={40} value={draft.couple.first} onChange={(e) => set("couple", { ...draft.couple, first: e.target.value })} /></Field>
              <Field label="Second name"><input className={inputCls} maxLength={40} value={draft.couple.second} onChange={(e) => set("couple", { ...draft.couple, second: e.target.value })} /></Field>
            </div>
          </Section>

          <Section n={4} title="Card 4 · Photo & date">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void onPhoto(e.target.files?.[0])} className="text-sm" />
            {draft.photo && (
              <>
                <Field label="Photo description (for screen readers)"><input className={inputCls} maxLength={200} value={draft.photo.alt} onChange={(e) => set("photo", { ...draft.photo!, alt: e.target.value })} /></Field>
                <button type="button" onClick={() => set("photo", null)} className="text-xs text-red-700 underline">Remove photo</button>
              </>
            )}
            <Field label="Line above the date"><input className={inputCls} maxLength={80} {...tp("celebration")} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date"><input type="date" className={inputCls} value={draft.event.date} onChange={(e) => set("event", { ...draft.event, date: e.target.value })} /></Field>
              <Field label="Time (e.g. 2:00 PM)"><input className={inputCls} maxLength={30} value={draft.event.time} onChange={(e) => set("event", { ...draft.event, time: e.target.value })} /></Field>
            </div>
            <Field label="Line below the date"><input className={inputCls} maxLength={80} {...tp("receptionNote")} /></Field>
          </Section>

          <Section n={5} title="Card 5 · Timeline">
            {features.schedule ? (
              <>
                <Field label="Title"><input className={inputCls} maxLength={30} {...tp("timelineTitle")} /></Field>
                {draft.timeline.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <input aria-label="Activity" placeholder="Ceremony" className={`${inputCls} !mt-0 flex-1`} maxLength={60} value={t.label} onChange={(e) => set("timeline", draft.timeline.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <input aria-label="Time" placeholder="2:00" className={`${inputCls} !mt-0 w-24`} maxLength={20} value={t.time} onChange={(e) => set("timeline", draft.timeline.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} />
                    <button type="button" aria-label="Remove" onClick={() => set("timeline", draft.timeline.filter((_, j) => j !== i))} className="px-2 text-stone-500">✕</button>
                  </div>
                ))}
                {draft.timeline.length < 10 && <button type="button" onClick={() => set("timeline", [...draft.timeline, { time: "", label: "" }])} className="text-sm underline">+ Add item</button>}
              </>
            ) : <p className="text-sm text-stone-500">The timeline is not included in your plan.</p>}
          </Section>

          <Section n={6} title="Card 6 · The details">
            <Field label="Venue name"><input className={inputCls} maxLength={120} value={draft.event.venue} onChange={(e) => set("event", { ...draft.event, venue: e.target.value })} /></Field>
            <Field label="Address"><input className={inputCls} maxLength={200} value={draft.event.address} onChange={(e) => set("event", { ...draft.event, address: e.target.value })} /></Field>
            <Field label="Map link (https://…)"><input className={inputCls} inputMode="url" maxLength={500} value={draft.event.mapUrl} onChange={(e) => set("event", { ...draft.event, mapUrl: e.target.value })} /></Field>
            {features.registry ? (
              <div className="space-y-2">
                <p className="text-sm text-stone-700">Registry links (shown as QR codes, up to 2)</p>
                {draft.registry.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <input aria-label="Label" placeholder="Target" className={`${inputCls} !mt-0 w-28`} maxLength={40} value={r.label} onChange={(e) => set("registry", draft.registry.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    <input aria-label="Link" placeholder="https://…" inputMode="url" className={`${inputCls} !mt-0 flex-1`} maxLength={500} value={r.url} onChange={(e) => set("registry", draft.registry.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                    <button type="button" aria-label="Remove" onClick={() => set("registry", draft.registry.filter((_, j) => j !== i))} className="px-2 text-stone-500">✕</button>
                  </div>
                ))}
                {draft.registry.length < 2 && <button type="button" onClick={() => set("registry", [...draft.registry, { label: "", url: "" }])} className="text-sm underline">+ Add registry</button>}
              </div>
            ) : <p className="text-sm text-stone-500">Registry QR codes are not included in your plan.</p>}
            {features.dress_code ? (
              <div className="space-y-2">
                <Field label="Dress code"><input className={inputCls} maxLength={60} placeholder="Formal attire" value={draft.dressCode.label} onChange={(e) => set("dressCode", { ...draft.dressCode, label: e.target.value })} /></Field>
                <div className="flex flex-wrap items-center gap-2">
                  {draft.dressCode.colors.map((c, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <input type="color" aria-label={`Dress code colour ${i + 1}`} value={c} onChange={(e) => set("dressCode", { ...draft.dressCode, colors: draft.dressCode.colors.map((x, j) => (j === i ? e.target.value : x)) })} />
                      <button type="button" aria-label="Remove colour" onClick={() => set("dressCode", { ...draft.dressCode, colors: draft.dressCode.colors.filter((_, j) => j !== i) })} className="text-xs text-stone-500">✕</button>
                    </span>
                  ))}
                  {draft.dressCode.colors.length < 4 && <button type="button" onClick={() => set("dressCode", { ...draft.dressCode, colors: [...draft.dressCode.colors, "#8a9a78"] })} className="text-sm underline">+ Colour</button>}
                </div>
              </div>
            ) : <p className="text-sm text-stone-500">Dress code is not included in your plan.</p>}
            <Field label="Recommended hotel"><input className={inputCls} maxLength={100} value={draft.hotel.name} onChange={(e) => set("hotel", { ...draft.hotel, name: e.target.value })} /></Field>
            <Field label="Hotel address"><input className={inputCls} maxLength={200} value={draft.hotel.address} onChange={(e) => set("hotel", { ...draft.hotel, address: e.target.value })} /></Field>
          </Section>

          <Section n={7} title="Card 7 · RSVP">
            <Field label="Title"><input className={inputCls} maxLength={30} {...tp("rsvpTitle")} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reply by"><input type="date" className={inputCls} value={draft.rsvp.deadline} onChange={(e) => set("rsvp", { ...draft.rsvp, deadline: e.target.value })} /></Field>
              <Field label="Reply to (email)"><input type="email" className={inputCls} maxLength={200} value={draft.rsvp.email} onChange={(e) => set("rsvp", { ...draft.rsvp, email: e.target.value })} /></Field>
            </div>
            <Field label="Note to guests"><input className={inputCls} maxLength={160} placeholder="Please include the names of all guests attending" value={draft.rsvp.note} onChange={(e) => set("rsvp", { ...draft.rsvp, note: e.target.value })} /></Field>
          </Section>

          <Section n={8} title="Card 8 · Closing">
            <Field label="Closing text (leave empty to show both names)"><input className={inputCls} maxLength={60} {...tp("closing")} /></Field>
          </Section>
        </div>

        <aside className={`${tab === "edit" ? "hidden lg:block" : ""}`}>
          <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <p className="mb-2 text-center text-xs uppercase tracking-widest text-stone-500">Static preview · use “Preview animation” to test the envelope</p>
            <Invitation content={preview} mode="preview" />
          </div>
        </aside>
      </div>
    </div>
  );
}
