"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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

const inputCls = "ui-input";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="ui-field"><span className="ui-label">{label}</span>{children}</label>;
}

/** iOS-style switch. */
function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className="ui-switch">
      <span />
    </button>
  );
}

/** A "choose file" capsule (the native file input is hidden). */
function FilePick({ accept, label, onFile }: { accept: string; label: string; onFile: (f: File | undefined) => void }) {
  return (
    <label className="ui-btn ui-btn-soft">
      {label}
      <input type="file" accept={accept} hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
    </label>
  );
}

/** Focusing any field scrolls the live preview to the matching card (desktop side-by-side only). */
function Section({ title, n, children, toggle }: { title: string; n?: number; children: React.ReactNode; toggle?: { on: boolean; set: (v: boolean) => void } }) {
  const jump = () => {
    if (!n || !window.matchMedia("(min-width: 1024px)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector(`[data-card="${n}"]`)?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  };
  const cut = title.indexOf(" · ");
  const num = cut > 0 ? title.slice(0, cut).replace("Card ", "") : "";
  const name = cut > 0 ? title.slice(cut + 3) : title;
  return (
    <section onFocus={jump} className="ui-section">
      <h2 className="ui-sec-head">{num && <span className="ui-badge">{num}</span>}{name}</h2>
      <div className="ui-group">
        {toggle && (
          <div className="ui-row-switch">
            <span>{toggle.on ? "Shown to your guests" : "Hidden from your guests"}</span>
            <Switch on={toggle.on} onChange={toggle.set} label={`Show ${name}`} />
          </div>
        )}
        <div className={`ui-fields ${toggle && !toggle.on ? "ui-dim" : ""}`}>{children}</div>
      </div>
    </section>
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

  // success messages ("Published! …") fade away after 3 seconds; problems stay until the next action
  useEffect(() => {
    if (!notice?.ok) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

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
        const r = await saveDraft(id, sent, version.current).catch(() => ({ ok: false as const, error: "Could not reach the server. Your changes are kept on this page and will retry — if this keeps happening, reload the page (a newer version of the editor may have been released)." }));
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
  // the full link needs the site address, which only the browser knows; the server render must not bake in a bare "/slug"
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "");
  const publicUrl = `${origin}/${slug}`;

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

  async function onMusic(file: File | undefined) {
    if (!file) return;
    if (!(file.type === "audio/mpeg" || /.mp3$/i.test(file.name))) return setNotice({ ok: false, text: "Please choose an MP3 file." });
    if (file.size > 4 * 1024 * 1024) return setNotice({ ok: false, text: "Music file is too large (max 4 MB)." });
    setNotice(null);
    try {
      const supabase = createBrowserSupabase();
      const path = `${id}/${crypto.randomUUID()}.mp3`;
      const { error } = await supabase.storage.from("invitation-media").upload(path, file, { contentType: "audio/mpeg" });
      if (error) throw error;
      const { data } = supabase.storage.from("invitation-media").getPublicUrl(path);
      update((d) => ({ ...d, music: { url: data.publicUrl, name: file.name.replace(/.mp3$/i, "").slice(0, 80) } }));
    } catch {
      setNotice({ ok: false, text: "Music upload failed. Please try again." });
    }
  }

  const screenToggle = (n: number) => ({
    on: !draft.hidden.includes(n),
    set: (v: boolean) => update((d) => ({ ...d, hidden: v ? d.hidden.filter((x) => x !== n) : [...new Set([...d.hidden, n])].sort() })),
  });
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
    <div className="ui">
      <header className="ui-top">
        <div className="ui-bar">
          <Link href="/dashboard" className="ui-icon-btn" aria-label="Back to my invitations">
            <svg width="11" height="19" viewBox="0 0 11 19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.5 1.5 1.5 9.5l8 8" /></svg>
          </Link>
          <div className="ui-bar-title">
            <h1>{title}</h1>
            <span role="status" className="ui-status"><i className="ui-dot" data-s={saveState} />{stateLabel}</span>
          </div>
          <a href={`/preview/${id}`} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-plain hidden sm:inline-flex">▶ Preview animation</a>
          <button onClick={onPublish} disabled={busy || !editable} className="ui-btn ui-btn-primary">
            {status === "published" ? "Update published" : "Publish"}
          </button>
        </div>
        <div className="ui-seg-row lg:hidden">
          <div className="ui-seg" role="group" aria-label="View">
            {(["edit", "preview"] as const).map((t) => (
              <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)}>{t === "edit" ? "Details" : "Preview"}</button>
            ))}
          </div>
          <a href={`/preview/${id}`} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-gray ui-btn-sm ml-auto">▶ Animation</a>
        </div>
      </header>

      {(saveError || notice || conflict) && (
        <div className="ui-wrap">
          {conflict && (
            <div role="alert" className="ui-note ui-note-warn">
              <p style={{ margin: 0 }}>This invitation was changed somewhere else (another tab, or by support) after you opened it. Your latest edits are not saved yet. Which version do you want to keep?</p>
              <div className="ui-actions">
                <button type="button" onClick={keepMine} className="ui-btn ui-btn-primary ui-btn-sm">Keep what I&apos;m editing</button>
                <button type="button" onClick={loadTheirs} className="ui-btn ui-btn-gray ui-btn-sm">Load the other version</button>
              </div>
            </div>
          )}
          {saveError && <p role="alert" className="ui-note ui-note-err">{saveError}</p>}
          {notice && <p role="status" className={`ui-note ${notice.ok ? "ui-note-ok" : "ui-note-err"}`}>{notice.text}</p>}
        </div>
      )}

      <div className="ui-wrap" style={{ paddingTop: 16 }}>
        {status === "published" ? (
          <div className="ui-card ui-live">
            <h3>Your invitation is live</h3>
            <p className="ui-help">Send this link to your guests.</p>
            <div className="ui-linkfield">
              <input readOnly value={publicUrl} aria-label="Guest link" onFocus={(e) => e.currentTarget.select()} />
              <button onClick={async () => { try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked: the field above is selectable */ } }} className="ui-btn ui-btn-primary">{copied ? "Copied" : "Copy"}</button>
            </div>
            <div className="ui-actions">
              <a href={`/${slug}`} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-gray ui-btn-sm">Open</a>
              <a href={`https://wa.me/?text=${encodeURIComponent(`You are invited! ${publicUrl}`)}`} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-gray ui-btn-sm">WhatsApp</a>
              <a href={`sms:?&body=${encodeURIComponent(`You are invited! ${publicUrl}`)}`} className="ui-btn ui-btn-gray ui-btn-sm">Message</a>
              <a href={`mailto:?subject=${encodeURIComponent("You are invited")}&body=${encodeURIComponent(publicUrl)}`} className="ui-btn ui-btn-gray ui-btn-sm">Email</a>
              <button onClick={onUnpublish} disabled={busy} className="ui-btn ui-btn-danger ui-btn-sm ml-auto">Unpublish</button>
            </div>
            <p className="ui-help" style={{ marginTop: 12 }}>Changed something? Press “Update published” at the top — the same link then shows the new version.</p>
          </div>
        ) : (
          <div className="ui-card">
            <h3>Your guest link</h3>
            <div className="ui-linkfield">
              <input readOnly value={publicUrl} aria-label="Guest link" style={{ background: "var(--ui-fill)", color: "var(--ui-secondary)" }} />
            </div>
            <p className="ui-help" style={{ marginTop: 12 }}>Press <b>Publish</b> when you are happy with the preview. The link then goes live and you can send it to your guests.</p>
          </div>
        )}
      </div>

      <div className="ui-wrap grid gap-6 py-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className={`ui-sections ${tab === "preview" ? "hidden lg:flex" : ""}`}>

          <Section n={1} title="Card 1 · Cover (the envelope screen)">
            <Field label="Line above the names"><input className={inputCls} maxLength={40} {...tp("coverTop")} /></Field>
            <div className="ui-two">
              <Field label="First name"><input className={inputCls} maxLength={40} autoComplete="off" value={draft.couple.first} onChange={(e) => set("couple", { ...draft.couple, first: e.target.value })} /></Field>
              <Field label="Second name"><input className={inputCls} maxLength={40} autoComplete="off" value={draft.couple.second} onChange={(e) => set("couple", { ...draft.couple, second: e.target.value })} /></Field>
            </div>
            <Field label="Line under the envelope"><input className={inputCls} maxLength={40} {...tp("coverBottom")} /></Field>
            <div className="ui-field">
              <span className="ui-label">Background music (optional)</span>
              <div className="ui-media">
                <FilePick accept="audio/mpeg,.mp3" label={draft.music ? "Change song" : "Choose an MP3"} onFile={(f) => void onMusic(f)} />
                {draft.music && <button type="button" onClick={() => set("music", null)} className="ui-btn ui-btn-danger ui-btn-sm">Remove</button>}
              </div>
              {draft.music && (
                <>
                  <p className="ui-help" style={{ color: "var(--ui-label)" }}>{draft.music.name || "Your song"}</p>
                  <audio controls preload="none" src={draft.music.url} className="ui-audio" />
                </>
              )}
              <p className="ui-help">Plays when your guest taps the envelope. MP3, up to 4 MB. Please use music you have the right to share.</p>
            </div>
          </Section>

          <Section n={2} title="Card 2 · Photo, date & save the date">
            <div className="ui-field">
              <span className="ui-label">Photo (shown in an arch)</span>
              <div className="ui-media">
                {draft.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.photo.url} alt="" className="ui-thumb" />
                )}
                <FilePick accept="image/jpeg,image/png,image/webp" label={draft.photo ? "Change photo" : "Choose a photo"} onFile={(f) => void onPhoto(f)} />
                {draft.photo && <button type="button" onClick={() => set("photo", null)} className="ui-btn ui-btn-danger ui-btn-sm">Remove</button>}
              </div>
            </div>
            <div className="ui-two">
              <Field label="Date"><input type="date" className={inputCls} value={draft.event.date} onChange={(e) => set("event", { ...draft.event, date: e.target.value })} /></Field>
              <Field label="Time (e.g. 2:00 PM)"><input className={inputCls} maxLength={30} value={draft.event.time} onChange={(e) => set("event", { ...draft.event, time: e.target.value })} /></Field>
            </div>
            <Field label="Text under the date"><input className={inputCls} maxLength={40} {...tp("saveTheDate")} /></Field>
          </Section>

          <Section n={3} toggle={screenToggle(3)} title="Card 3 · Venue">
            <Field label="Line at the top"><input className={inputCls} maxLength={60} {...tp("venueIntro")} /></Field>
            <Field label="Venue name"><input className={inputCls} maxLength={120} value={draft.event.venue} onChange={(e) => set("event", { ...draft.event, venue: e.target.value })} /></Field>
            <Field label="Full address (Enter starts a new line)">
              <textarea className={inputCls} rows={3} maxLength={300} value={draft.event.address} onChange={(e) => set("event", { ...draft.event, address: e.target.value })} />
            </Field>
            <Field label="Map link (https://…)"><input className={inputCls} inputMode="url" maxLength={500} value={draft.event.mapUrl} onChange={(e) => set("event", { ...draft.event, mapUrl: e.target.value })} /></Field>
            <Field label="Line under the address"><input className={inputCls} maxLength={80} {...tp("receptionNote")} /></Field>
          </Section>

          <Section n={4} toggle={screenToggle(4)} title="Card 4 · Timeline">
            {features.schedule ? (
              <>
                <Field label="Title"><input className={inputCls} maxLength={30} {...tp("timelineTitle")} /></Field>
                <div className="ui-field">
                  <span className="ui-label">Schedule</span>
                  {draft.timeline.map((t, i) => (
                    <div key={i} className="ui-row-line">
                      <input aria-label="Activity" placeholder="Ceremony" className={`${inputCls} flex-1`} maxLength={60} value={t.label} onChange={(e) => set("timeline", draft.timeline.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                      <input aria-label="Time" placeholder="2:00" className={`${inputCls} w-24`} maxLength={20} value={t.time} onChange={(e) => set("timeline", draft.timeline.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} />
                      <button type="button" aria-label="Remove" onClick={() => set("timeline", draft.timeline.filter((_, j) => j !== i))} className="ui-x">✕</button>
                    </div>
                  ))}
                  {draft.timeline.length < 10 && <div><button type="button" onClick={() => set("timeline", [...draft.timeline, { time: "", label: "" }])} className="ui-btn ui-btn-soft ui-btn-sm">+ Add item</button></div>}
                </div>
              </>
            ) : <p className="ui-help">The timeline is not included in your plan.</p>}
          </Section>

          <Section n={5} toggle={screenToggle(5)} title="Card 5 · Details (accommodation, dress code, registry)">
            <Field label="Title"><input className={inputCls} maxLength={30} {...tp("detailsTitle")} /></Field>
            <Field label="Accommodation — hotel name"><input className={inputCls} maxLength={30} value={draft.hotel.name} onChange={(e) => set("hotel", { ...draft.hotel, name: e.target.value })} /></Field>
            <Field label="Accommodation — address (Enter starts a new line)">
              <textarea className={inputCls} rows={2} maxLength={60} value={draft.hotel.address} onChange={(e) => set("hotel", { ...draft.hotel, address: e.target.value })} />
            </Field>
            {features.dress_code ? (
              <div className="ui-field">
                <Field label="Dress code"><input className={inputCls} maxLength={26} placeholder="Formal attire" value={draft.dressCode.label} onChange={(e) => set("dressCode", { ...draft.dressCode, label: e.target.value })} /></Field>
                <div className="ui-colors">
                  {draft.dressCode.colors.map((c, i) => (
                    <span key={i} className="ui-row-line" style={{ gap: 0 }}>
                      <input type="color" className="ui-swatch" aria-label={`Dress code colour ${i + 1}`} value={c} onChange={(e) => set("dressCode", { ...draft.dressCode, colors: draft.dressCode.colors.map((x, j) => (j === i ? e.target.value : x)) })} />
                      <button type="button" aria-label="Remove colour" onClick={() => set("dressCode", { ...draft.dressCode, colors: draft.dressCode.colors.filter((_, j) => j !== i) })} className="ui-x" style={{ width: 32, height: 32, marginLeft: -6 }}>✕</button>
                    </span>
                  ))}
                  {draft.dressCode.colors.length < 4 && <button type="button" onClick={() => set("dressCode", { ...draft.dressCode, colors: [...draft.dressCode.colors, "#8a9a78"] })} className="ui-btn ui-btn-soft ui-btn-sm">+ Colour</button>}
                </div>
              </div>
            ) : <p className="ui-help">Dress code is not included in your plan.</p>}
            {features.registry ? (
              <div className="ui-field" style={{ gap: 14 }}>
                <span className="ui-label">Registry QR codes</span>
                {REGISTRIES.map((label) => (
                  <Field key={label} label={`${label} registry link (https://…)`}>
                    <input className={inputCls} inputMode="url" maxLength={500} value={regUrl(label)} onChange={(e) => setRegUrl(label, e.target.value)} />
                  </Field>
                ))}
                <p className="ui-help">Leave a link empty to hide that QR code.</p>
              </div>
            ) : <p className="ui-help">Registry QR codes are not included in your plan.</p>}
          </Section>

          <Section n={6} toggle={screenToggle(6)} title="Card 6 · RSVP">
            <Field label="Title (first word in script, the rest large — e.g. “please RSVP”)"><input className={inputCls} maxLength={30} {...tp("rsvpTitle")} /></Field>
            <div className="ui-two">
              <Field label="Reply by"><input type="date" className={inputCls} value={draft.rsvp.deadline} onChange={(e) => set("rsvp", { ...draft.rsvp, deadline: e.target.value })} /></Field>
              <Field label="Reply to (email)"><input type="email" className={inputCls} maxLength={200} value={draft.rsvp.email} onChange={(e) => set("rsvp", { ...draft.rsvp, email: e.target.value })} /></Field>
            </div>
            <Field label="Note to guests"><input className={inputCls} maxLength={160} placeholder="Please include all guests name you are taking with you" value={draft.rsvp.note} onChange={(e) => set("rsvp", { ...draft.rsvp, note: e.target.value })} /></Field>
          </Section>

          <Section n={7} toggle={screenToggle(7)} title="Card 7 · Closing">
            <Field label="Closing sentence (shown under both names)"><input className={inputCls} maxLength={80} placeholder="Thank you for your time." {...tp("closing")} /></Field>
            <div className="ui-switch-row">
              <span>Show “Add to calendar” <span className="ui-help" style={{ display: "block" }}>Needs the event date</span></span>
              <Switch on={draft.showCalendar} onChange={(v) => set("showCalendar", v)} label="Show Add to calendar link" />
            </div>
          </Section>
        </div>

        <aside className={`${tab === "edit" ? "hidden lg:block" : ""}`}>
          <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <p className="ui-caption">Static preview · use “Preview animation” to test the envelope</p>
            <Invitation content={preview} mode="preview" />
          </div>
        </aside>
      </div>
    </div>
  );
}
