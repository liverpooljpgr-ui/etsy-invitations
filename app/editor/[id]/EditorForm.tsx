"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Invitation } from "@/components/invitation/Invitation";
import { applyPlan, parseContent, type Content, type PlanFeatures } from "@/lib/content/schema";
import { DateInput, type DateOrder } from "@/components/DateInput";
import { TimeInput } from "@/components/TimeInput";
import { PlaceSearch, type Place } from "@/components/PlaceSearch";
import { MapPicker } from "@/components/MapPicker";
import { PhotoArchThumb, PhotoCrop } from "@/components/PhotoCrop";
import { SongPicker } from "@/components/SongPicker";
import { isMapsLink } from "@/lib/maps-link";
import { lookupPlaceFromLink } from "@/lib/maps-lookup";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { publishInvitation, saveDraft, unpublishInvitation } from "./actions";

type Props = {
  id: string; title: string; slug: string; status: string;
  features: PlanFeatures; initialDraft: Content; initialVersion: number; initialStep?: number; dateOrder?: DateOrder;
};
type SaveState = "saved" | "dirty" | "saving" | "error";

const REGISTRIES = ["Amazon", "Target"] as const;

/** Phone layout is a wizard: one screen of the invitation per step. */
const STEPS = [
  { n: 1, label: "Cover" },
  { n: 2, label: "Photo & date" },
  { n: 3, label: "Venue" },
  { n: 4, label: "Timeline" },
  { n: 5, label: "Details" },
  { n: 6, label: "RSVP" },
  { n: 7, label: "Closing" },
] as const;
const GUEST_STEP = { n: 8, label: "Guest link" } as const; // appears only after the invitation is published
const GUEST_IDX = 7; // its index

const inputCls = "ui-input";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="ui-field"><span className="ui-label">{label}</span>{children}</label>;
}

/**
 * Phones: if the field being typed in is hidden behind the sticky header or the keyboard, bring it into the middle of the
 * free space. Does nothing when it is already comfortably visible, and never animates (so it cannot fight the keyboard).
 */
function ensureVisible(el: HTMLElement) {
  const vv = window.visualViewport;
  const headerBottom = document.querySelector(".ui-top")?.getBoundingClientRect().bottom ?? 0;
  const top = (vv?.offsetTop ?? 0) + headerBottom + 12;
  const bottom = (vv ? vv.offsetTop + vv.height : window.innerHeight) - 64; // iOS also floats an autofill bar above the keyboard
  const r = el.getBoundingClientRect();
  if (r.top >= top && r.bottom <= bottom) return; // already visible: leave the screen alone
  const wanted = top + (bottom - top) / 2 - r.height / 2;
  window.scrollBy({ top: r.top - wanted, behavior: "instant" });
}

const IconArrow = () => (
  <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 7h15M10.5 1.5 16 7l-5.5 5.5" /></svg>
);

const IconPlay = () => (
  <svg width="13" height="14" viewBox="0 0 13 14" fill="currentColor" aria-hidden="true"><path d="M1.5 1.3v11.4a.8.8 0 0 0 1.2.7l9.2-5.7a.8.8 0 0 0 0-1.4L2.7.6a.8.8 0 0 0-1.2.7z" /></svg>
);
const IconPublish = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.2 1.8 7.1 8.9M14.2 1.8l-4.4 12.4-2.7-5.3-5.3-2.7z" /></svg>
);

/** iOS-style switch. */
function Switch({ on, onChange, label, small }: { on: boolean; onChange: (v: boolean) => void; label: string; small?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={small ? "ui-switch ui-switch-sm" : "ui-switch"}>
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
function Section({ title, n, children, toggle, mobileHidden }: { title: string; n?: number; children: React.ReactNode; toggle?: { on: boolean; set: (v: boolean) => void }; mobileHidden?: boolean }) {
  const jump = () => {
    if (!n || !window.matchMedia("(min-width: 1024px)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // scroll only the preview panel to the card: scrollIntoView would also move the whole page under the cursor
    const card = document.querySelector<HTMLElement>(`aside [data-card="${n}"]`);
    let box = card?.parentElement ?? null;
    while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
    if (!card || !box) return;
    const c = card.getBoundingClientRect(), b = box.getBoundingClientRect();
    box.scrollTo({ top: box.scrollTop + (c.top - b.top) - (b.height - c.height) / 2, behavior: reduce ? "auto" : "smooth" });
  };
  const cut = title.indexOf(" · ");
  const num = cut > 0 ? title.slice(0, cut).replace("Card ", "") : "";
  const name = cut > 0 ? title.slice(cut + 3) : title;
  return (
    <section onFocus={jump} className={`ui-section ${mobileHidden ? "max-lg:hidden" : "wiz-in"}`}>
      <div className="ui-sec-row">
        <h2 className="ui-sec-head">{num && <span className="ui-badge">{num}</span>}{name}</h2>
        {toggle && (
          <span className="ui-sec-toggle">
            <span>Show page to guests</span>
            <Switch small on={toggle.on} onChange={toggle.set} label={`Show page to guests: ${name}`} />
          </span>
        )}
      </div>
      <div className={`ui-group ${toggle && !toggle.on ? "ui-group-off" : ""}`} inert={toggle && !toggle.on ? true : undefined}>
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

export function EditorForm({ id, title, slug, status: initialStatus, features, initialDraft, initialVersion, initialStep, dateOrder }: Props) {
  const [draft, setDraft] = useState<Content>(initialDraft);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [everSaved, setEverSaved] = useState(false); // "All changes saved" only means something after a real save in this session
  const [step, setStep] = useState(() => Math.max(0, Math.min((initialStep ?? 1) - 1, initialStatus === "published" ? GUEST_IDX : GUEST_IDX - 1))); // phone wizard
  const [typing, setTyping] = useState(false); // phone keyboard is up: fold the header away so the field stays visible
  const [status, setStatus] = useState(initialStatus);
  const steps: readonly { n: number; label: string }[] = status === "published" ? [...STEPS, GUEST_STEP] : STEPS;
  const goStep = (i: number) => setStep(Math.max(0, Math.min(steps.length - 1, i)));
  // phones: swipe the live preview left / right to go to the next / previous screen
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [slide, setSlide] = useState<{ dir: "next" | "prev"; step: number } | null>(null);
  const onSwipeEnd = (e: React.TouchEvent) => {
    const s0 = swipe.current; swipe.current = null;
    const t = e.changedTouches[0];
    if (!s0 || !t) return;
    const dx = t.clientX - s0.x, dy = t.clientY - s0.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // a clear sideways flick only, not a scroll
    const to = Math.max(0, Math.min(GUEST_IDX - 1, step + (dx < 0 ? 1 : -1)));
    if (to === step) return;
    setSlide({ dir: dx < 0 ? "next" : "prev", step: to });
    goStep(to);
  };
  // every step opens from its top
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [step]);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const [conflict, setConflict] = useState<{ version: number; draft: unknown } | null>(null);

  useEffect(() => {
    const isField = (t: EventTarget | null): t is HTMLElement =>
      t instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !["checkbox", "radio", "file", "color", "button", "submit"].includes((t as HTMLInputElement).type);
    let off: ReturnType<typeof setTimeout> | undefined;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let focused: HTMLElement | null = null;
    // "Keyboard up" means the visual viewport is clearly shorter than the window. The header folds only while that is true
    // (a field can stay focused after the keyboard was hidden). The keyboard animation fires dozens of resize events, so every
    // decision waits until they stop: no flip-flopping header, no repeated scrolling.
    const keyboardUp = () => { const vv = window.visualViewport; return !vv || window.innerHeight - vv.height > 120; };
    const settle = () => {
      setTyping(focused !== null && keyboardUp());
      // wait for React to fold the header / add the bottom room, then look once
      requestAnimationFrame(() => requestAnimationFrame(() => { if (focused && document.activeElement === focused && keyboardUp()) ensureVisible(focused); }));
    };
    const settleSoon = (ms: number) => { clearTimeout(settleTimer); settleTimer = setTimeout(settle, ms); };
    const onIn = (e: FocusEvent) => {
      if (!isField(e.target) || window.innerWidth >= 1024) return;
      clearTimeout(off);
      focused = e.target;
      settleSoon(500); // after the keyboard has come up
    };
    const onOut = () => { clearTimeout(off); off = setTimeout(() => { focused = null; settleSoon(0); }, 200); };
    const onViewport = () => settleSoon(350);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    window.visualViewport?.addEventListener("resize", onViewport);
    return () => {
      clearTimeout(off);
      clearTimeout(settleTimer);
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
      window.visualViewport?.removeEventListener("resize", onViewport);
    };
  }, []);

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
          setEverSaved(true);
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
  const publishTone = "ui-btn-grad"; // Publish keeps the same look whatever the state
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
    if (r.ok) {
      const wasLive = status === "published";
      setStatus("published");
      setStep(GUEST_IDX); // the Guest link tab appears now and opens
      setNotice({ ok: true, text: wasLive ? "Updated. Guests now see the latest version." : "Published! Your guest link is ready." });
    }
    else setNotice({ ok: false, text: r.error + ("missing" in r && r.missing ? ` Missing: ${r.missing.join(", ")}.` : "") });
  }
  async function onUnpublish() {
    if (!confirm("Unpublish? Guests will no longer be able to open the link until you publish again.")) return;
    setBusy(true);
    const r = await unpublishInvitation(id);
    setBusy(false);
    if (r.ok) { setStatus("draft"); setStep((s) => Math.min(s, GUEST_IDX - 1)); setNotice({ ok: true, text: "Unpublished. Your draft is kept." }); }
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
      setCropOpen(true); // a new photo opens the crop / zoom tool
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
  // a place chosen in the search box or on the map fills the venue / hotel fields
  const [venuePos, setVenuePos] = useState<{ lat: number; lng: number } | null>(null);
  const [hotelPos, setHotelPos] = useState<{ lat: number; lng: number } | null>(null);
  const pickVenue = (p: Place) => {
    set("event", { ...draft.event, venue: p.name.slice(0, 120), address: p.address.slice(0, 300), mapUrl: p.mapUrl.slice(0, 500) });
    if (p.lat !== undefined && p.lng !== undefined) setVenuePos({ lat: p.lat, lng: p.lng });
  };
  const pickHotel = (p: Place) => {
    set("hotel", { ...draft.hotel, name: p.name.slice(0, 30), address: p.address.slice(0, 60) });
    if (p.lat !== undefined && p.lng !== undefined) setHotelPos({ lat: p.lat, lng: p.lng });
  };
  // a Google Maps link pasted into "Map link" fills in the venue name and address
  const [mapNote, setMapNote] = useState("");
  const [cropOpen, setCropOpen] = useState(false); // the crop / zoom tool is open only while a photo is being adjusted
  const [lookedUp, setLookedUp] = useState("");
  const fillVenueFromLink = async (link: string) => {
    const l = link.trim();
    if (!isMapsLink(l) || lookedUp === l) return;
    setLookedUp(l);
    setMapNote("Reading the link…");
    try {
      const pl = await lookupPlaceFromLink(l);
      if (!pl) { setMapNote("Link saved. We could not read a place name from it, so fill in the name and address by hand."); return; }
      update((d) => ({ ...d, event: { ...d.event, venue: pl.name.slice(0, 120), address: pl.address.slice(0, 300), mapUrl: l.slice(0, 500) } }));
      setMapNote("Venue name and address filled in from the link. You can edit them.");
    } catch { setMapNote("Could not read that link. Fill in the name and address by hand."); }
  };
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

  const liveCard = (
    <div className="ui-card ui-live">
      <div className="ui-live-head">
          <h3>Your invitation is live</h3>
          <button onClick={onUnpublish} disabled={busy} className="ui-btn ui-btn-danger ui-btn-sm">Unpublish</button>
        </div>
      <p className="ui-help">Send this link to your guests.</p>
      <div className="ui-linkfield">
        <input readOnly value={publicUrl} aria-label="Guest link" onFocus={(e) => e.currentTarget.select()} />
        <button onClick={async () => { try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked: the field above is selectable */ } }} className="ui-btn ui-btn-black">{copied ? "Copied" : "Copy"}</button>
      </div>
      <div className="ui-actions">
        <a href={`https://wa.me/?text=${encodeURIComponent(`You are invited! ${publicUrl}`)}`} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-gray ui-btn-sm">WhatsApp</a>
        <a href={`sms:?&body=${encodeURIComponent(`You are invited! ${publicUrl}`)}`} className="ui-btn ui-btn-gray ui-btn-sm">Message</a>
        <a href={`mailto:?subject=${encodeURIComponent("You are invited")}&body=${encodeURIComponent(publicUrl)}`} className="ui-btn ui-btn-gray ui-btn-sm">Email</a>
      </div>
      <p className="ui-help" style={{ marginTop: 12 }}>Changed something? Publish again — the same link then shows the new version.</p>
    </div>
  );

  return (
    <div className="ui">
      <header className="ui-top">
        <div className="ui-bar">
          <Link href="/dashboard" className="ui-icon-btn" aria-label="Back to my invitations">
            <svg width="11" height="19" viewBox="0 0 11 19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.5 1.5 1.5 9.5l8 8" /></svg>
          </Link>
          <div className="ui-bar-title max-lg:items-center max-lg:text-center">
            <h1>{title.split(" · ")[0]}</h1>
            {(everSaved || saveState !== "saved") && <span role="status" className="ui-status" data-s={saveState}>
              {saveState === "saved"
                ? <i className="ui-check" aria-hidden="true"><svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.5l2.4 2.4 4.6-5.3" /></svg></i>
                : <i className="ui-dot" data-s={saveState} />}
              {stateLabel}
            </span>}
          </div>
          <a href={`/preview/${id}`} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-grad-dark max-lg:hidden"><IconPlay /> Preview animation</a>
          <button onClick={onPublish} disabled={busy || !editable} className={`ui-btn max-lg:hidden ${publishTone}`}>
            <IconPublish /> {status === "published" ? "Publish Updates" : "Publish"}
          </button>
          <span className="ui-icon-btn lg:hidden" aria-hidden="true" style={{ visibility: "hidden" }} />
        </div>
        <div className={`wiz-head lg:hidden ${typing ? "hidden" : ""}`}>
          <div className="wiz-row">
            <div className="wiz-chips" role="tablist" aria-label="Screens">
              {steps.map((t, i) => (
                <button
                  key={t.n} type="button" role="tab" aria-selected={step === i}
                  ref={(el) => { if (el && step === i) el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }}
                  onClick={() => goStep(i)}
                  className={`wiz-chip ${step === i ? "wiz-chip-on" : ""} ${t.n === 8 ? "wiz-chip-guest" : ""} ${t.n >= 3 && t.n <= 7 && draft.hidden.includes(t.n) ? "wiz-chip-off" : ""}`}
                ><b>{t.n}</b>{t.label}</button>
              ))}
            </div>
          </div>
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

      {/* the guest link only exists for guests once the invitation has been published: nothing is shown before that */}
      {status === "published" && (
        <div className="ui-wrap max-lg:hidden" style={{ paddingTop: 16 }}>{liveCard}</div>
      )}

      <div className={`ui-wrap grid gap-6 py-5 lg:grid-cols-[minmax(0,1fr)_380px] ${typing ? "max-lg:pb-[50vh]" : ""}`}>
        <div className={`wiz-preview-wrap lg:hidden ${step === GUEST_IDX ? "hidden" : ""}`} onTouchStart={(e) => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={onSwipeEnd} onTouchCancel={() => { swipe.current = null; }}>
          <p className="ui-caption" style={{ margin: 0 }}>Screen {step + 1} of {GUEST_IDX} · live preview · swipe to change screen</p>
          <div key={step} className={`wiz-preview-box ${slide?.step === step ? `wiz-slide-${slide.dir}` : ""}`}>
            {STEPS[Math.min(step, GUEST_IDX - 1)].n >= 3 && draft.hidden.includes(STEPS[Math.min(step, GUEST_IDX - 1)].n) ? (
              <div className="wiz-off">This screen is switched off.<br />Guests won’t see it.</div>
            ) : (
              <div className="wiz-preview" data-step={STEPS[Math.min(step, GUEST_IDX - 1)].n}>
                <Invitation content={preview} mode="preview" calendarHref={`/preview/${id}/calendar.ics`} />
              </div>
            )}
          </div>
        </div>

        <div className="ui-sections">

          <Section n={1} mobileHidden={step !== 0} title="Card 1 · Cover (the envelope screen)">
            <Field label="Line above the names"><input className={inputCls} maxLength={40} {...tp("coverTop")} /></Field>
            <div className="ui-two">
              <Field label="Beloved"><input className={inputCls} maxLength={40} autoComplete="off" value={draft.couple.first} onChange={(e) => set("couple", { ...draft.couple, first: e.target.value })} /></Field>
              <Field label="Beloved"><input className={inputCls} maxLength={40} autoComplete="off" value={draft.couple.second} onChange={(e) => set("couple", { ...draft.couple, second: e.target.value })} /></Field>
            </div>
            <Field label="Line under the envelope"><input className={inputCls} maxLength={40} {...tp("coverBottom")} /></Field>
            <div className="ui-field">
              <span className="ui-label">Background music (optional)</span>
              <SongPicker currentUrl={draft.music?.url ?? null} onPick={(song) => set("music", { url: song.url, name: song.name })} />
              <span className="ui-help">Or use your own song:</span>
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
              <p className="ui-help">Plays when your guest taps the envelope. Your own MP3 can be up to 4 MB; please use music you have the right to share.</p>
            </div>
          </Section>

          <Section n={2} mobileHidden={step !== 1} title="Card 2 · Photo, date & save the date">
            <div className="ui-field">
              <span className="ui-label">Photo (shown in an arch)</span>
              <div className="ui-media">
                {draft.photo && cropOpen && (
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
                    <PhotoCrop photo={draft.photo} onChange={(patch) => update((d) => (d.photo ? { ...d, photo: { ...d.photo, ...patch } } : d))} />
                    <button type="button" onClick={() => setCropOpen(false)} className="ui-btn ui-btn-grad" style={{ width: "100%" }}>Save photo</button>
                  </div>
                )}
                {draft.photo && !cropOpen && <PhotoArchThumb photo={draft.photo} />}
                <FilePick accept="image/jpeg,image/png,image/webp" label={draft.photo ? "Change photo" : "Choose a photo"} onFile={(f) => void onPhoto(f)} />
                {draft.photo && !cropOpen && <button type="button" onClick={() => setCropOpen(true)} className="ui-btn ui-btn-gray ui-btn-sm">Adjust</button>}
                {draft.photo && <button type="button" onClick={() => { set("photo", null); setCropOpen(false); }} className="ui-btn ui-btn-danger ui-btn-sm">Remove</button>}
              </div>
            </div>
            <Field label="Text above the date"><input className={inputCls} maxLength={40} {...tp("saveTheDate")} /></Field>
            <div className="ui-two">
              <Field label="Date"><DateInput order={dateOrder} value={draft.event.date} onChange={(date) => set("event", { ...draft.event, date })} /></Field>
              <Field label="Time"><TimeInput value={draft.event.time} onChange={(time) => set("event", { ...draft.event, time })} /></Field>
            </div>
          </Section>

          <Section n={3} mobileHidden={step !== 2} toggle={screenToggle(3)} title="Card 3 · Venue">
            <Field label="Line at the top"><input className={inputCls} maxLength={60} {...tp("venueIntro")} /></Field>
            <PlaceSearch label="Find the venue" placeholder="Venue name, address or a Google Maps link" onPick={pickVenue} />
            <MapPicker query={[draft.event.venue, draft.event.address].filter(Boolean).join(", ")} center={venuePos} onPick={pickVenue} />
            <Field label="Venue name"><input className={inputCls} maxLength={120} value={draft.event.venue} onChange={(e) => set("event", { ...draft.event, venue: e.target.value })} /></Field>
            <Field label="Full address (Enter starts a new line)">
              <textarea className={inputCls} rows={3} maxLength={300} value={draft.event.address} onChange={(e) => set("event", { ...draft.event, address: e.target.value })} />
            </Field>
            <Field label="Map link (https://…)">
              <input className={inputCls} inputMode="url" maxLength={500} value={draft.event.mapUrl} onChange={(e) => set("event", { ...draft.event, mapUrl: e.target.value })}
                onPaste={(e) => { const t = e.clipboardData.getData("text"); if (isMapsLink(t)) void fillVenueFromLink(t); }} onBlur={(e) => void fillVenueFromLink(e.target.value)} />
              {mapNote && <span className="ui-help">{mapNote}</span>}
            </Field>
            <Field label="Line under the address"><input className={inputCls} maxLength={80} {...tp("receptionNote")} /></Field>
          </Section>

          <Section n={4} mobileHidden={step !== 3} toggle={screenToggle(4)} title="Card 4 · Timeline">
            {features.schedule ? (
              <>
                <Field label="Title"><input className={inputCls} maxLength={30} {...tp("timelineTitle")} /></Field>
                <div className="ui-field">
                  <span className="ui-label">Schedule</span>
                  {draft.timeline.map((t, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 0", borderTop: i ? ".5px solid var(--ui-hair)" : 0 }}>
                      <div className="ui-row-line">
                        <input aria-label="Activity" placeholder="Ceremony" className={`${inputCls} flex-1`} maxLength={60} value={t.label} onChange={(e) => set("timeline", draft.timeline.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                        <button type="button" aria-label="Remove" onClick={() => set("timeline", draft.timeline.filter((_, j) => j !== i))} className="ui-x">✕</button>
                      </div>
                      <TimeInput value={t.time} onChange={(time) => set("timeline", draft.timeline.map((x, j) => (j === i ? { ...x, time } : x)))} />
                    </div>
                  ))}
                  {draft.timeline.length < 10 && <div><button type="button" onClick={() => set("timeline", [...draft.timeline, { time: "", label: "" }])} className="ui-btn ui-btn-soft ui-btn-sm">+ Add item</button></div>}
                </div>
              </>
            ) : <p className="ui-help">The timeline is not included in your plan.</p>}
          </Section>

          <Section n={5} mobileHidden={step !== 4} toggle={screenToggle(5)} title="Card 5 · Details (accommodation, dress code, registry)">
            <Field label="Title"><input className={inputCls} maxLength={30} {...tp("detailsTitle")} /></Field>
            <PlaceSearch label="Find the hotel" placeholder="Hotel name, address or a Google Maps link" onPick={pickHotel} />
            <MapPicker query={[draft.hotel.name, draft.hotel.address].filter(Boolean).join(", ")} center={hotelPos} onPick={pickHotel} hint="Tap the hotel on the map to choose it." />
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

          <Section n={6} mobileHidden={step !== 5} toggle={screenToggle(6)} title="Card 6 · RSVP">
            <div className="ui-two">
              <Field label="Reply by"><DateInput order={dateOrder} value={draft.rsvp.deadline} onChange={(deadline) => set("rsvp", { ...draft.rsvp, deadline })} /></Field>
              <Field label="Reply to (email)"><input type="email" className={inputCls} maxLength={200} value={draft.rsvp.email} onChange={(e) => set("rsvp", { ...draft.rsvp, email: e.target.value })} /></Field>
            </div>
            <Field label="Note to guests"><input className={inputCls} maxLength={160} placeholder="Please include all guests name you are taking with you" value={draft.rsvp.note} onChange={(e) => set("rsvp", { ...draft.rsvp, note: e.target.value })} /></Field>
          </Section>

          <Section n={7} mobileHidden={step !== 6} toggle={screenToggle(7)} title="Card 7 · Closing">
            <Field label="Closing sentence (shown under both names)"><input className={inputCls} maxLength={80} placeholder="Thank you for your time." {...tp("closing")} /></Field>
            <div className="ui-switch-row">
              <span>Show “Add to calendar” <span className="ui-help" style={{ display: "block" }}>Needs the event date</span></span>
              <Switch on={draft.showCalendar} onChange={(v) => set("showCalendar", v)} label="Show Add to calendar link" />
            </div>
          </Section>
        </div>

        {status === "published" && (
          <div className={`ui-auth-stack lg:hidden ${step === GUEST_IDX ? "wiz-in" : "hidden"}`}>
            {liveCard}
            <div className="wiz-actions">
              <a href={`/preview/${id}?from=8`} className="ui-btn ui-btn-grad-dark"><IconPlay /> Preview</a>
              <button onClick={onPublish} disabled={busy || !editable} className={`ui-btn ${publishTone}`}>
                <IconPublish /> Republish
              </button>
            </div>
          </div>
        )}

        {step < GUEST_IDX - 1 && (
          <button type="button" onClick={() => goStep(step + 1)} className="ui-btn ui-btn-grad-dark lg:hidden" style={{ width: "100%" }}>
            Next <IconArrow />
          </button>
        )}
        {step === GUEST_IDX - 1 && (
          <div className="wiz-actions lg:hidden">
            <a href={`/preview/${id}?from=7`} className="ui-btn ui-btn-grad-dark"><IconPlay /> Preview</a>
            <button onClick={onPublish} disabled={busy || !editable} className={`ui-btn ${publishTone}`}>
              <IconPublish /> Publish
            </button>
          </div>
        )}

        <aside className="hidden lg:block">
          <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <p className="ui-caption">Static preview · use “Preview animation” to test the envelope</p>
            <Invitation content={preview} mode="preview" calendarHref={`/preview/${id}/calendar.ics`} />
          </div>
        </aside>
      </div>
    </div>
  );
}
