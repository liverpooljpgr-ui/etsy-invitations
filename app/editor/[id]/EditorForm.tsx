"use client";

import { TimelineIcon, TIMELINE_ICONS } from "@/components/invitation/TimelineIcons";
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
import { RsvpReplies } from "@/components/RsvpReplies";
import { coverBottomText, DEFAULT_TEMPLATE, PHOTO_FRAME, PHOTO_SHAPE, TEMPLATE_COVER, type TemplateSlug , PARTY_TEMPLATES } from "@/lib/templates";
import { isMapsLink } from "@/lib/maps-link";
import { lookupPlaceFromLink } from "@/lib/maps-lookup";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { PdfLoader } from "@/components/PdfLoader";
import { publishInvitation, saveDraft, unpublishInvitation } from "./actions";

type Props = {
  id: string; title: string; slug: string; status: string;
  features: PlanFeatures; initialDraft: Content; initialVersion: number; initialStep?: number; dateOrder?: DateOrder; template?: TemplateSlug;
};
type SaveState = "saved" | "dirty" | "saving" | "error";

const REGISTRIES = ["Amazon", "Target"] as const;

/** Phone layout is a wizard: one screen of the invitation per step. */
const STEPS = [
  { n: 1, label: "Cover" },
  { n: 2, label: "Photo & Date" },
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
  const num = cut > 0 ? title.slice(0, cut).replace(/^(Card|Screen) /, "") : "";
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
  const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/webp", 0.8));
}

/** A new dress-code colour starts as the first of these that is not used yet, so added colours do not all look the same. */
const DRESS_STARTERS = ["#8a9a78", "#d8c3a5", "#c08f86", "#44505f"];
const nextDressColor = (used: string[]) => DRESS_STARTERS.find((c) => !used.includes(c)) ?? DRESS_STARTERS[used.length % DRESS_STARTERS.length];

export function EditorForm({ id, title, slug, status: initialStatus, features, initialDraft, initialVersion, initialStep, dateOrder, template }: Props) {
  const [draft, setDraft] = useState<Content>(initialDraft);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [everSaved, setEverSaved] = useState(false); // "All changes saved" only means something after a real save in this session
  const [step, setStep] = useState(() => Math.max(0, Math.min((initialStep ?? 1) - 1, initialStatus === "published" ? GUEST_IDX : GUEST_IDX - 1))); // phone wizard
  const [typing, setTyping] = useState(false); // phone keyboard is up: fold the header away so the field stays visible
  const [status, setStatus] = useState(initialStatus);
  const party = !!PARTY_TEMPLATES[template ?? DEFAULT_TEMPLATE]; // the Christmas party: its own wording and pages
  const steps: readonly { n: number; label: string }[] = status === "published" ? [...STEPS, GUEST_STEP] : STEPS;
  const goStep = (i: number) => setStep(Math.max(0, Math.min(steps.length - 1, i)));
  // the Christmas party has no separate venue and timeline screens (indexes 2 and 3): next / previous jump over them
  const stepNear = (s0: number, dir: 1 | -1) => { let t = s0 + dir; while (party && (t === 2 || t === 3) && t > 0 && t < GUEST_IDX) t += dir; return t; };
  // phones: swipe the live preview left / right to go to the next / previous screen
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [slide, setSlide] = useState<{ dir: "next" | "prev"; step: number } | null>(null);
  const onSwipeEnd = (e: React.TouchEvent) => {
    const s0 = swipe.current; swipe.current = null;
    const t = e.changedTouches[0];
    if (!s0 || !t) return;
    const dx = t.clientX - s0.x, dy = t.clientY - s0.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // a clear sideways flick only, not a scroll
    const to = Math.max(0, Math.min(GUEST_IDX - 1, stepNear(step, dx < 0 ? 1 : -1)));
    if (to === step) return;
    setSlide({ dir: dx < 0 ? "next" : "prev", step: to });
    goStep(to);
  };
  // every step opens from its top
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [step]);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // a photo is on its way: the editor is locked until it is uploaded and the draft holding it is saved
  const [photoWait, setPhotoWait] = useState<null | "upload" | "save">(null);
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
          setNotice((n) => (n && !n.ok ? null : n)); // a red message about a problem goes away once saving works again
          setConflict(null);
          if (latest.current === sent && !again.current) { setSaveState("saved"); setPhotoWait((w) => (w === "save" ? null : w)); return true; }
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
          setSaveState("error"); setPhotoWait((w) => (w === "save" ? null : w));
          return false;
        }
        setSaveError(r.error);
        setSaveState("error"); setPhotoWait((w) => (w === "save" ? null : w));
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
    setNotice((n) => (n && !n.ok ? null : n)); // the person is fixing things: drop the old red message
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
  const [mailOpen, setMailOpen] = useState(false); // the Email choices (mail app, Gmail, Outlook, copy)
  const [mailCopied, setMailCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false); // making the keepsake PDF takes a few seconds
  async function onDownloadPdf() {
    if (pdfBusy) return;
    setPdfBusy(true); setNotice(null);
    try {
      const res = await fetch(`/api/invitations/${id}/pdf`, { cache: "no-store" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setNotice({ ok: false, text: j?.error ?? "Could not create the PDF. Please try again in a minute." });
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url; a.download = `${liveSlug}-invitation.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNotice({ ok: true, text: "Your PDF is ready." });
    } catch { setNotice({ ok: false, text: "Network error. The PDF was not created." }); }
    finally { setPdfBusy(false); }
  }
  const [liveSlug, setLiveSlug] = useState(slug); // the first publish can swap the random code for the couple's names
  const publicUrl = `${origin}/${liveSlug}`;
  // the email is the one place a full, warm message is written (chat apps show a preview card instead)
  const niceDate = (iso: string) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }) : "");
  const mail = (() => {
    const a = draft.couple.first.trim(), b = draft.couple.second.trim();
    const names = a && b ? `${a} & ${b}` : "";
    const when = niceDate(draft.event.date), replyBy = niceDate(draft.rsvp.deadline);
    if (party) {
      // the Christmas party: a party, not a wedding; the host (if given) signs it
      const host = a;
      const body = [
        "Dear friend,",
        "",
        `${host ? `${host} would` : "We would"} love to have you at our Christmas dinner party${when ? ` on ${when}` : ""}.`,
        "",
        "Everything you need to know is in a small invitation page made just for our guests: the date, the time and the place, the dress code and how to let us know that you are coming. There is nothing to download and nothing to sign up for. Just tap the link and open the envelope.",
        "",
        publicUrl,
        "",
        replyBy ? `Please let us know whether you can join us by ${replyBy}. You can reply right inside the invitation, or simply answer this email.` : "You can reply right inside the invitation, or simply answer this email.",
        "",
        "We are waiting for you to have fun!",
        "",
        "Merry Christmas,",
        host || "Your friends",
      ].join("\r\n");
      return { subject: host ? `You are invited to ${host}'s Christmas party` : "You are invited to our Christmas party", body };
    }
    const body = [
      "Dear friend,",
      "",
      names ? `It is ${a} and ${b}, and we have some happy news: we are getting married${when ? ` on ${when}` : ""}.` : `We have some happy news: we are getting married${when ? ` on ${when}` : ""}.`,
      "It would mean the world to us to have you with us on our special day.",
      "",
      "We have put everything you need to know into a small invitation page made just for our guests: the place, the schedule and how to let us know that you are coming. There is nothing to download and nothing to sign up for. Just tap the link below and open the envelope.",
      "",
      publicUrl,
      "",
      replyBy ? `If you can, please let us know whether you can join us by ${replyBy}. You can reply right inside the invitation, or simply answer this email.` : "You can reply right inside the invitation, or simply answer this email.",
      "",
      "Thank you for being part of our story. We cannot wait to celebrate with you.",
      "",
      "With love,",
      names || "Your friends",
    ].join("\r\n");
    return { subject: names ? `You are invited: ${names}` : "You are invited", body };
  })();

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
      setLiveSlug(r.slug);
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
    setPhotoWait("upload");
    try {
      const blob = await prepareImage(file);
      const supabase = createBrowserSupabase();
      const path = `${id}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("invitation-media").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (error) throw error;
      const { data } = supabase.storage.from("invitation-media").getPublicUrl(path);
      update((d) => ({ ...d, photo: { url: data.publicUrl, alt: d.photo?.alt ?? "" } }));
      setPhotoWait("save");
      setCropOpen(true); // a new photo opens the crop / zoom tool
    } catch {
      setPhotoWait(null);
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
    <>
    <div className="ui-card ui-live">
      <div className="ui-live-head">
          <h3>Your invitation is live</h3>
          <button onClick={onUnpublish} disabled={busy} className="ui-btn ui-btn-danger ui-btn-sm">Unpublish</button>
        </div>
      <p className="ui-help">Send this link to your guests.</p>
      <p className="ui-help" style={{ marginTop: 4 }}>Changed something? Publish again — the same link then shows the new version.</p>
      <div className="ui-linkfield">
        <input readOnly value={publicUrl} aria-label="Guest link" onFocus={(e) => e.currentTarget.select()} />
        <button onClick={async () => { try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked: the field above is selectable */ } }} className="ui-btn ui-btn-black">{copied ? "Copied" : "Copy"}</button>
      </div>
      <div className="ui-actions">
        {/* chat apps show the names, greeting and photo in the preview card themselves, so only the link is sent (an email has no card, so it gets the greeting) */}
        <a href={`https://wa.me/?text=${encodeURIComponent(publicUrl)}`} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-gray ui-btn-sm">WhatsApp</a>
        <a href={`https://t.me/share/url?url=${encodeURIComponent(publicUrl)}`} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-gray ui-btn-sm">Telegram</a>
        <button type="button" className="ui-btn ui-btn-gray ui-btn-sm" aria-expanded={mailOpen} onClick={() => setMailOpen((o) => !o)}>Email</button>
        <button type="button" onClick={onDownloadPdf} disabled={pdfBusy} className="ui-btn ui-btn-sm" style={{ background: "#fff", color: "var(--ui-text, #1c1c1e)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)", gap: 8 }}>
          <svg width="18" height="20" viewBox="0 0 18 20" fill="none" aria-hidden="true" focusable="false">
            <path d="M3 1h8l5 5v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1Z" fill="#fff" stroke="#e5322d" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M11 1v4a1 1 0 0 0 1 1h4" stroke="#e5322d" strokeWidth="1.4" strokeLinejoin="round" />
            <rect x="2" y="10.2" width="14" height="5.6" rx="1" fill="#e5322d" />
            <text x="9" y="14.6" textAnchor="middle" fontSize="4.6" fontWeight="700" fontFamily="Arial, Helvetica, sans-serif" fill="#fff">PDF</text>
          </svg>
          {pdfBusy ? "Preparing your PDF…" : "Download as PDF"}
        </button>
      </div>
      {mailOpen && (
        <div className="ui-actions" role="group" aria-label="Send by email with">
          <a className="ui-btn ui-btn-soft ui-btn-sm" href={`mailto:?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`}>Mail app</a>
          <a className="ui-btn ui-btn-soft ui-btn-sm" target="_blank" rel="noopener noreferrer" href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`}>Gmail</a>
          <a className="ui-btn ui-btn-soft ui-btn-sm" target="_blank" rel="noopener noreferrer" href={`https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`}>Outlook.com</a>
          <button type="button" className="ui-btn ui-btn-soft ui-btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(`${mail.subject}\n\n${mail.body}`); setMailCopied(true); setTimeout(() => setMailCopied(false), 2000); } catch { /* the choices above still work */ } }}>{mailCopied ? "Copied" : "Copy the message"}</button>
        </div>
      )}
    </div>
    <RsvpReplies invitationId={id} />
    </>
  );

  return (
    <div className="ui">
      {pdfBusy && <PdfLoader />}
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
              {steps.map((t, i) => (party && (t.n === 3 || t.n === 4) ? null :
                <button
                  key={t.n} type="button" role="tab" aria-selected={step === i}
                  ref={(el) => { if (el && step === i) el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }}
                  onClick={() => goStep(i)}
                  className={`wiz-chip ${step === i ? "wiz-chip-on" : ""} ${t.n === 8 ? "wiz-chip-guest" : ""} ${t.n >= 3 && t.n <= 7 && draft.hidden.includes(t.n) ? "wiz-chip-off" : ""}`}
                ><b>{party && t.n >= 5 && t.n <= 7 ? t.n - 2 : t.n}</b>{party ? ({ 2: "Dinner", 5: "Details", 6: "RSVP", 7: "Closing" } as Record<number, string>)[t.n] ?? t.label : t.label}</button>
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
                <Invitation content={preview} mode="preview" calendarHref={`/preview/${id}/calendar.ics`} template={template} />
              </div>
            )}
          </div>
        </div>

        {photoWait && (
          <div className="photo-lock" role="alert" aria-live="assertive">
            <span className="photo-lock-box"><i className="photo-spin" aria-hidden="true" />{photoWait === "upload" ? "Uploading your photo…" : "Saving your photo…"}</span>
          </div>
        )}
        <div className="ui-sections">

          <Section n={1} mobileHidden={step !== 0} title={party ? "Screen 1 · Cover (envelope)" : "Card 1 · Cover (the envelope screen)"}>
            {party ? (
              <>
                <Field label="Small line at the top"><input className={inputCls} maxLength={40} {...tp("coverIntro")} /></Field>
                <Field label="Big word"><input className={inputCls} maxLength={40} {...tp("coverTop")} /></Field>
                <Field label="Second line (script)"><input className={inputCls} maxLength={60} autoComplete="off" {...tp("headline")} /></Field>
              </>
            ) : (
              <>
                {!(template && TEMPLATE_COVER[template]?.hideTop) && <Field label="Line above the names"><input className={inputCls} maxLength={40} {...tp("coverTop")} /></Field>}
                <div className="ui-two">
                  <Field label="Beloved 1"><input className={inputCls} maxLength={40} autoComplete="off" value={draft.couple.first} onChange={(e) => set("couple", { ...draft.couple, first: e.target.value })} /></Field>
                  <Field label="Beloved 2"><input className={inputCls} maxLength={40} autoComplete="off" value={draft.couple.second} onChange={(e) => set("couple", { ...draft.couple, second: e.target.value })} /></Field>
                </div>
                <Field label="Line under the envelope"><input className={inputCls} maxLength={40} {...tp("coverBottom")} value={coverBottomText(template, draft.texts.coverBottom)} /></Field>
              </>
            )}
            <div className="ui-field">
              <span className="ui-label">Background music (optional)</span>
              <SongPicker currentUrl={draft.music?.url ?? null} template={template} onPick={(song) => set("music", { url: song.url, name: song.name })} />
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

          <Section n={2} mobileHidden={step !== 1} title={party ? "Screen 2 · Dinner (date, time, place)" : "Card 2 · Photo & Date"}>
            {!party && <div className="ui-field">
              <span className="ui-label">Photo (shown in {{ oval: "an oval", rect: "a frame", arch: "an arch" }[PHOTO_SHAPE[template ?? DEFAULT_TEMPLATE]]})</span>
              <div className="ui-media">
                {draft.photo && cropOpen && (
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
                    <PhotoCrop shape={PHOTO_SHAPE[template ?? DEFAULT_TEMPLATE]} frameRatio={PHOTO_FRAME[template ?? DEFAULT_TEMPLATE]} photo={draft.photo} onChange={(patch) => update((d) => (d.photo ? { ...d, photo: { ...d.photo, ...patch } } : d))} />
                    <button type="button" onClick={() => setCropOpen(false)} className="ui-btn ui-btn-grad" style={{ width: "100%" }}>Save photo</button>
                  </div>
                )}
                {draft.photo && !cropOpen && <PhotoArchThumb shape={PHOTO_SHAPE[template ?? DEFAULT_TEMPLATE]} frameRatio={PHOTO_FRAME[template ?? DEFAULT_TEMPLATE]} photo={draft.photo} />}
                <FilePick accept="image/jpeg,image/png,image/webp" label={draft.photo ? "Change photo" : "Choose a photo"} onFile={(f) => void onPhoto(f)} />
                {draft.photo && !cropOpen && <button type="button" onClick={() => setCropOpen(true)} className="ui-btn ui-btn-gray ui-btn-sm">Adjust</button>}
                {draft.photo && <button type="button" onClick={() => { set("photo", null); setCropOpen(false); }} className="ui-btn ui-btn-danger ui-btn-sm">Remove</button>}
              </div>
            </div>}
            <Field label={party ? "Line above the date" : "Text above the date"}><input className={inputCls} maxLength={40} {...tp("saveTheDate")} /></Field>
            {template === "sage-forest" && !party && <Field label="Line under it"><input className={inputCls} maxLength={60} {...tp("saveSubtitle")} /></Field>}
            <div className="ui-two">
              <Field label="Date"><DateInput order={dateOrder} value={draft.event.date} onChange={(date) => set("event", { ...draft.event, date })} /></Field>
              <Field label="Time"><TimeInput value={draft.event.time} onChange={(time) => set("event", { ...draft.event, time })} /></Field>
            </div>
            {party && <Field label="Hosted by"><input className={inputCls} maxLength={40} autoComplete="off" value={draft.couple.first} onChange={(e) => set("couple", { ...draft.couple, first: e.target.value })} /></Field>}
            {party && (
              <>
                <PlaceSearch label="Find the place" placeholder="Name, address or a Google Maps link" onPick={pickVenue} />
                <MapPicker query={[draft.event.venue, draft.event.address].filter(Boolean).join(", ")} center={venuePos} onPick={pickVenue} />
                <Field label="Place name (for example: The Martins' house)"><input className={inputCls} maxLength={120} value={draft.event.venue} onChange={(e) => set("event", { ...draft.event, venue: e.target.value })} /></Field>
                <Field label="Address (Enter starts a new line)">
                  <textarea className={inputCls} rows={3} maxLength={300} value={draft.event.address} onChange={(e) => set("event", { ...draft.event, address: e.target.value })} />
                </Field>
                <Field label="Map link for “Get directions” (https://…)">
                  <input className={inputCls} inputMode="url" maxLength={500} value={draft.event.mapUrl} onChange={(e) => set("event", { ...draft.event, mapUrl: e.target.value })}
                    onPaste={(e) => { const t = e.clipboardData.getData("text"); if (isMapsLink(t)) void fillVenueFromLink(t); }} onBlur={(e) => void fillVenueFromLink(e.target.value)} />
                  {mapNote && <span className="ui-help">{mapNote}</span>}
                </Field>
              </>
            )}
          </Section>

          {!party && (<>
          <Section n={3} mobileHidden={step !== 2} toggle={party ? undefined : screenToggle(3)} title={party ? "Card 3 · Place (shown on the dinner card)" : "Card 3 · Venue"}>
            {template === "sage-forest" && <Field label="Heading"><input className={inputCls} maxLength={40} {...tp("venueTitle")} /></Field>}
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

          <Section n={4} mobileHidden={step !== 3} toggle={party ? undefined : screenToggle(4)} title="Card 4 · Timeline">
            {party ? <p className="ui-help">This design has no timeline screen: the date, time and place are on card 2.</p> : features.schedule ? (
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
                      {template === "sage-forest" && (
                        <div role="group" aria-label="Icon" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {[{ key: "", label: "No icon" }, ...TIMELINE_ICONS].map((ic) => {
                            const on = (t.icon ?? "") === ic.key;
                            return (
                              <button key={ic.key || "none"} type="button" title={ic.label} aria-label={ic.label} aria-pressed={on}
                                onClick={() => set("timeline", draft.timeline.map((x, j) => (j === i ? { ...x, icon: ic.key } : x)))}
                                style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 10, cursor: "pointer", border: on ? "1.5px solid var(--ui-tint)" : ".5px solid var(--ui-hair)", background: on ? "var(--ui-fill)" : "transparent", color: "var(--ui-text, #222)", fontSize: 12 }}>
                                {ic.key ? <TimelineIcon name={ic.key} size={24} /> : "–"}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                  {draft.timeline.length < 10 && <div><button type="button" onClick={() => set("timeline", [...draft.timeline, { time: "", label: "" }])} className="ui-btn ui-btn-soft ui-btn-sm">+ Add item</button></div>}
                </div>
              </>
            ) : <p className="ui-help">The timeline is not included in your plan.</p>}
          </Section>

          </>)}

          <Section n={5} mobileHidden={step !== 4} toggle={screenToggle(5)} title={party ? "Screen 3 · Details (dress code, presents)" : "Card 5 · Details"}>
            <Field label="Title"><input className={inputCls} maxLength={30} {...tp("detailsTitle")} /></Field>
            {!party && (
              <>
            <PlaceSearch label="Find the hotel for accommodation" placeholder="Hotel name, address or a Google Maps link" onPick={pickHotel} />
            <MapPicker query={[draft.hotel.name, draft.hotel.address].filter(Boolean).join(", ")} center={hotelPos} onPick={pickHotel} hint="Tap the hotel on the map to choose it." />
            {template === "sage-forest" && (
              <>
                <Field label="Heading of the accommodation block"><input className={inputCls} maxLength={30} {...tp("detailsAccommodation")} /></Field>
                <Field label="Text under that heading, before the hotel name (optional)"><input className={inputCls} maxLength={120} {...tp("detailsAccommodationNote")} /></Field>
                <Field label="Heading of the dress code block"><input className={inputCls} maxLength={30} {...tp("detailsDressCode")} /></Field>
                <Field label="Heading of the registry block"><input className={inputCls} maxLength={30} {...tp("detailsRegistry")} /></Field>
              </>
            )}
            <Field label="Accommodation — hotel name"><input className={inputCls} maxLength={30} value={draft.hotel.name} onChange={(e) => set("hotel", { ...draft.hotel, name: e.target.value })} /></Field>
            <Field label="Accommodation — address (Enter starts a new line)">
              <textarea className={inputCls} rows={2} maxLength={60} value={draft.hotel.address} onChange={(e) => set("hotel", { ...draft.hotel, address: e.target.value })} />
            </Field>
              </>
            )}
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
                  {draft.dressCode.colors.length < 4 && <button type="button" onClick={() => set("dressCode", { ...draft.dressCode, colors: [...draft.dressCode.colors, nextDressColor(draft.dressCode.colors)] })} className="ui-btn ui-btn-soft ui-btn-sm">+ Colour</button>}
                </div>
              </div>
            ) : <p className="ui-help">Dress code is not included in your plan.</p>}
            {party ? null : features.registry ? (
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
                      {(template === "sage-forest" || party) && (
              <div className="ui-field" style={{ gap: 10 }}>
                <span className="ui-label">{party ? "Presents, or any block of your own" : "Your own block"}</span>
                <Field label="Heading (for example: Gifts, Kids, Transport)"><input className={inputCls} maxLength={30} {...tp("detailsExtraTitle")} /></Field>
                <Field label="Text">
                  <textarea className={inputCls} rows={4} maxLength={300} value={draft.texts.detailsExtraText} onChange={(e) => set("texts", { ...draft.texts, detailsExtraText: e.target.value })} />
                </Field>
                <p className="ui-help">Leave both empty to hide this block. Enter starts a new line.</p>
              </div>
            )}
            {party && (
              <div className="ui-field" style={{ gap: 10 }}>
                <span className="ui-label">One more block of your own</span>
                <Field label="Heading (for example: Gifts, Parking, Kids)"><input className={inputCls} maxLength={30} {...tp("detailsExtra2Title")} /></Field>
                <Field label="Text">
                  <textarea className={inputCls} rows={4} maxLength={300} value={draft.texts.detailsExtra2Text} onChange={(e) => set("texts", { ...draft.texts, detailsExtra2Text: e.target.value })} />
                </Field>
                <p className="ui-help">Leave both empty to hide this block. Enter starts a new line.</p>
              </div>
            )}
          </Section>

          <Section n={6} mobileHidden={step !== 5} toggle={screenToggle(6)} title={party ? "Screen 4 · RSVP" : "Card 6 · RSVP"}>
            <div className="ui-two">
              <Field label="Reply by"><DateInput order={dateOrder} value={draft.rsvp.deadline} onChange={(deadline) => set("rsvp", { ...draft.rsvp, deadline })} /></Field>
              <Field label="Reply to (email)"><input type="email" className={inputCls} maxLength={200} value={draft.rsvp.email} onChange={(e) => set("rsvp", { ...draft.rsvp, email: e.target.value })} /></Field>
            </div>
            <Field label="Note to guests"><input className={inputCls} maxLength={160} placeholder="A short line for your guests (leave empty to show nothing)" value={draft.rsvp.note} onChange={(e) => set("rsvp", { ...draft.rsvp, note: e.target.value })} /></Field>
            <div className="ui-switch-row">
              <span>Let guests reply inside the invitation</span>
              <Switch on={draft.rsvp.online} onChange={(online) => set("rsvp", { ...draft.rsvp, online })} label="Let guests reply inside the invitation" />
            </div>
            {draft.rsvp.online && (
              <Field label="Most guests in one reply">
                <select className={inputCls} value={draft.rsvp.maxParty} onChange={(e) => set("rsvp", { ...draft.rsvp, maxParty: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
            )}
            <p className="ui-help">Guests can reply here, or by email, until the “Reply by” date. After that day the reply form closes. You will see every reply in the Guest link tab once the invitation is published.</p>
          </Section>

          <Section n={7} mobileHidden={step !== 6} toggle={screenToggle(7)} title={party ? "Screen 5 · Closing" : "Card 7 · Closing"}>
            <Field label={party ? "First line (script)" : "Closing sentence (shown under both names)"}><input className={inputCls} maxLength={80} placeholder={party ? "We are waiting for you:" : "Share this moment with us"} {...tp("closing")} /></Field>
            {party && <Field label="Second line (regular text)"><input className={inputCls} maxLength={120} placeholder="come hungry, come merry and be ready to have fun!" {...tp("closingNote")} /></Field>}
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
          <button type="button" onClick={() => goStep(stepNear(step, 1))} className="ui-btn ui-btn-grad-dark lg:hidden" style={{ width: "100%" }}>
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
            <Invitation content={preview} mode="preview" calendarHref={`/preview/${id}/calendar.ics`} template={template} />
          </div>
        </aside>
      </div>
    </div>
  );
}
