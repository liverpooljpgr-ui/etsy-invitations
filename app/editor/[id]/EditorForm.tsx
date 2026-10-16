"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Invitation } from "@/components/invitation/Invitation";
import { applyPlan, parseContent, type Content, type PlanFeatures } from "@/lib/content/schema";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { publishInvitation, saveDraft, unpublishInvitation } from "./actions";

type Props = {
  id: string; title: string; slug: string; status: string;
  features: PlanFeatures; initialDraft: Content; initialVersion: number;
};
type SaveState = "saved" | "dirty" | "saving" | "error";

const REGISTRIES = ["Amazon", "Target"] as const;

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

  const [conflict, setConflict] = useState<{ version: number; draft: unknown } | null>(null);

  const latest = useRef(draft);
  const version = useRef(initialVersion);
  const inFlight = useRef(false);
  const again = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // normalised JSON of what this tab last stored, to tell a harmless version bump from a real change elsewhere
  const norm = (d: unknown) => JSON.stringify(parseContent(d));
  const lastSaved = useRef(norm(initialDraft));

  const flush = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) { again.current = true; return false; }
    inFlight.current = true;
    setSaveState("saving");
    let retries = 0;
    try {
      for (;;) {
        const sent = latest.current;
        again.current = false;
        const r = await saveDraft(id, sent, version.current).catch(() => ({ ok: false as const, error: "Network error. Your changes are kept on this page; retrying…" }));
        if (r.ok) {
          version.current = r.version;
          lastSaved.current = JSON.stringify(parseContent(sent));
          setSaveError("");
          setConflict(null);
          if (latest.current === sent && !again.current) { setSaveState("saved"); return true; }
          continue;
        }
        if ("conflict" in r && r.conflict) {
          // Stored content is identical to what we last saved: only the version moved (e.g. a data fix). Safe to retry.
          if (JSON.stringify(parseContent(r.conflict.draft)) === lastSaved.current && retries++ < 3) {
            version.current = r.conflict.version;
            continue;
          }
          setConflict(r.conflict);
          setSaveError("");
          setSaveState("error");
          return false;
        }
        setSaveError(r.error);
        setSaveState("error");
        return false;
      }
    } finally {
      inFlight.current = false;
    }
  }, [id]);

  function keepMine() {
    if (!conflict) return;
    version.current = conflict.version;
    setConflict(null);
    void flush();
  }
  function loadTheirs() {
    if (!conflict) return;
    const d = parseContent(conflict.draft);
    latest.current = d;
    setDraft(d);
    lastSaved.current = JSON.stringify(d);
    version.current = conflict.version;
    setConflict(null);
    setSaveError("");
    setSaveState("saved");
  }

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
    if (saveState !== "error" || conflict) return;
    const t = setTimeout(() => void flush(), 5000);
    return () => clearTimeout(t);
  }, [saveState, flush, conflict]);
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
  // Two fixed registry options (Amazon, Target), stored as registry[] items with those labels.
  const regUrl = (label: string) => draft.registry.find((r) => r.label === label)?.url ?? "";
  const setRegUrl = (label: string, url: string) =>
    update((d) => ({
      ...d,
      registry: REGISTRIES.map((l) => ({ label: l, url: l === label ? url : d.registry.find((r) => r.label === l)?.url ?? "" })),
    }));
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

      {(saveError || notice || conflict) && (
        <div className="mx-auto max-w-6xl px-4 pt-3">
          {conflict && (
            <div role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <p>This invitation was changed somewhere else (another tab, or by support) after you opened it. Your latest edits are not saved yet. Which version do you want to keep?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={keepMine} className="rounded bg-amber-900 px-3 py-1.5 text-white">Keep what I&apos;m editing</button>
                <button type="button" onClick={loadTheirs} className="rounded border border-amber-900 px-3 py-1.5">Load the other version</button>
              </div>
            </div>
          )}
          {saveError &&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{saveError}</p>}
          {notice && <p role="status" className={`mt-2 rounded-lg p-3 text-sm ${notice.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{notice.text}</p>}
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 pt-4">
        {status === "published" ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
            <p className="mb-2 font-medium text-green-900">Your invitation is live. Send this link to your guests:</p>
            <div className="flex gap-2">
              <input readOnly value={publicUrl} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded border border-green-300 bg-white px-2 py-1 font-mono text-xs" />
              <button onClick={async () => { try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked: the field above is selectable */ } }} className="rounded bg-green-800 px-3 text-white">{copied ? "Copied" : "Copy"}</button>
              <a href={`/${slug}`} target="_blank" rel="noopener noreferrer" className="rounded border border-green-800 px-3 py-1 text-green-900">Open</a>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a href={`https://wa.me/?text=${encodeURIComponent(`You are invited! ${publicUrl}`)}`} target="_blank" rel="noopener noreferrer" className="rounded border border-green-800 px-3 py-1 text-green-900">Share on WhatsApp</a>
              <a href={`sms:?&body=${encodeURIComponent(`You are invited! ${publicUrl}`)}`} className="rounded border border-green-800 px-3 py-1 text-green-900">Text message</a>
              <a href={`mailto:?subject=${encodeURIComponent("You are invited")}&body=${encodeURIComponent(publicUrl)}`} className="rounded border border-green-800 px-3 py-1 text-green-900">Email</a>
              <button onClick={onUnpublish} disabled={busy} className="ml-auto text-xs text-green-900 underline">Unpublish</button>
            </div>
            <p className="mt-2 text-xs text-green-900/80">Changed something? Press “Update published” at the top — the same link then shows the new version.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
            <p className="mb-2 font-medium">Your guest link</p>
            <input readOnly value={publicUrl} className="w-full rounded border border-stone-200 bg-stone-50 px-2 py-1 font-mono text-xs text-stone-400" />
            <p className="mt-2 text-xs text-stone-600">Press <b>Publish</b> at the top when you are happy with the preview — the link then goes live and you can copy and send it to your guests.</p>
          </div>
        )}
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className={`space-y-4 ${tab === "preview" ? "hidden lg:block" : ""}`}>

          <Section n={1} title="Card 1 · Cover (the envelope screen)">
            <Field label="Line above the names"><input className={inputCls} maxLength={40} {...tp("coverTop")} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name"><input className={inputCls} maxLength={40} value={draft.couple.first} onChange={(e) => set("couple", { ...draft.couple, first: e.target.value })} /></Field>
              <Field label="Second name"><input className={inputCls} maxLength={40} value={draft.couple.second} onChange={(e) => set("couple", { ...draft.couple, second: e.target.value })} /></Field>
            </div>
            <Field label="Line under the envelope"><input className={inputCls} maxLength={40} {...tp("coverBottom")} /></Field>
          </Section>

          <Section n={2} title="Card 2 · Photo, date & save the date">
            <p className="text-sm text-stone-700">Photo (shown in an arch)</p>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void onPhoto(e.target.files?.[0])} className="text-sm" />
            {draft.photo && (
              <>
                <Field label="Photo description (for screen readers)"><input className={inputCls} maxLength={200} value={draft.photo.alt} onChange={(e) => set("photo", { ...draft.photo!, alt: e.target.value })} /></Field>
                <button type="button" onClick={() => set("photo", null)} className="text-xs text-red-700 underline">Remove photo</button>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date"><input type="date" className={inputCls} value={draft.event.date} onChange={(e) => set("event", { ...draft.event, date: e.target.value })} /></Field>
              <Field label="Time (e.g. 2:00 PM)"><input className={inputCls} maxLength={30} value={draft.event.time} onChange={(e) => set("event", { ...draft.event, time: e.target.value })} /></Field>
            </div>
            <Field label="Text under the date"><input className={inputCls} maxLength={40} {...tp("saveTheDate")} /></Field>
          </Section>

          <Section n={3} title="Card 3 · Venue">
            <Field label="Line at the top"><input className={inputCls} maxLength={60} {...tp("venueIntro")} /></Field>
            <Field label="Venue name"><input className={inputCls} maxLength={120} value={draft.event.venue} onChange={(e) => set("event", { ...draft.event, venue: e.target.value })} /></Field>
            <Field label="Full address (use Enter for a new line)">
              <textarea className={inputCls} rows={3} maxLength={300} value={draft.event.address} onChange={(e) => set("event", { ...draft.event, address: e.target.value })} />
            </Field>
            <Field label="Map link (https://…)"><input className={inputCls} inputMode="url" maxLength={500} value={draft.event.mapUrl} onChange={(e) => set("event", { ...draft.event, mapUrl: e.target.value })} /></Field>
            <Field label="Line under the address"><input className={inputCls} maxLength={80} {...tp("receptionNote")} /></Field>
          </Section>

          <Section n={4} title="Card 4 · Timeline">
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

          <Section n={5} title="Card 5 · Details (accommodation, dress code, registry)">
            <Field label="Title"><input className={inputCls} maxLength={30} {...tp("detailsTitle")} /></Field>
            <Field label="Accommodation — hotel name"><input className={inputCls} maxLength={30} value={draft.hotel.name} onChange={(e) => set("hotel", { ...draft.hotel, name: e.target.value })} /></Field>
            <Field label="Accommodation — address (use Enter for a new line)">
              <textarea className={inputCls} rows={2} maxLength={60} value={draft.hotel.address} onChange={(e) => set("hotel", { ...draft.hotel, address: e.target.value })} />
            </Field>
            {features.dress_code ? (
              <div className="space-y-2">
                <Field label="Dress code"><input className={inputCls} maxLength={26} placeholder="Formal attire" value={draft.dressCode.label} onChange={(e) => set("dressCode", { ...draft.dressCode, label: e.target.value })} /></Field>
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
            {features.registry ? (
              <div className="space-y-2">
                <p className="text-sm text-stone-700">Registry QR codes (leave a link empty to hide that one)</p>
                {REGISTRIES.map((label) => (
                  <Field key={label} label={`${label} registry link (https://…)`}>
                    <input className={inputCls} inputMode="url" maxLength={500} value={regUrl(label)} onChange={(e) => setRegUrl(label, e.target.value)} />
                  </Field>
                ))}
              </div>
            ) : <p className="text-sm text-stone-500">Registry QR codes are not included in your plan.</p>}
          </Section>

          <Section n={6} title="Card 6 · RSVP">
            <Field label="Title (first word in script, the rest large — e.g. “please RSVP”)"><input className={inputCls} maxLength={30} {...tp("rsvpTitle")} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reply by"><input type="date" className={inputCls} value={draft.rsvp.deadline} onChange={(e) => set("rsvp", { ...draft.rsvp, deadline: e.target.value })} /></Field>
              <Field label="Reply to (email)"><input type="email" className={inputCls} maxLength={200} value={draft.rsvp.email} onChange={(e) => set("rsvp", { ...draft.rsvp, email: e.target.value })} /></Field>
            </div>
            <Field label="Note to guests"><input className={inputCls} maxLength={160} placeholder="Please include the names of all guests attending" value={draft.rsvp.note} onChange={(e) => set("rsvp", { ...draft.rsvp, note: e.target.value })} /></Field>
          </Section>

          <Section n={7} title="Card 7 · Closing">
            <Field label="Short sentence about love (shown under both names)"><input className={inputCls} maxLength={80} placeholder="Our forever begins" {...tp("closing")} /></Field>
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
