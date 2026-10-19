"use client";

import { useState, useSyncExternalStore } from "react";

const KEY = "open-in-browser-tip-hidden-until";
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

type Env = { show: boolean; ios: boolean; inApp: boolean };
const HIDDEN: Env = { show: false, ios: false, inApp: false };
let cached: Env | null = null;

/** Phones/tablets only, not when already installed on the home screen, not while dismissed (7 days). */
function read(): Env {
  if (cached) return cached;
  try {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua);
    const android = /Android/.test(ua);
    // built-in browsers of apps: known app names, Android WebView, and iOS WKWebView (no "Safari" token in the UA)
    const inApp =
      /FBAN|FBAV|Instagram|Line\/|Twitter|TikTok|Snapchat|Pinterest|MicroMessenger|Etsy/i.test(ua) ||
      (android && /; wv\)/.test(ua)) ||
      (ios && /AppleWebKit/.test(ua) && !/Safari|CriOS|FxiOS|EdgiOS/.test(ua));
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try { dismissed = Number(localStorage.getItem(KEY) ?? 0) > Date.now(); } catch { /* storage blocked: show it */ }
    cached = { show: (ios || android) && !standalone && !dismissed, ios, inApp };
  } catch {
    cached = HIDDEN;
  }
  return cached;
}
const snapshot = () => read();

/**
 * Many customers open the personal link inside an app's built-in browser (email, Etsy, social apps). That mini browser is
 * thrown away when they switch to another app (a map, say), taking the sign-in with it. This tip points them to Safari /
 * Chrome and gives them a link that brings them back to this very page.
 */
export function OpenInBrowserTip() {
  const env = useSyncExternalStore(subscribe, snapshot, () => HIDDEN);
  const [copied, setCopied] = useState(false);
  if (!env.show) return null;

  const comeBackLink = () => `${window.location.origin}/login?next=${encodeURIComponent(window.location.pathname)}`;
  const dismiss = () => {
    try { localStorage.setItem(KEY, String(Date.now() + 7 * 864e5)); } catch { /* ignore */ }
    cached = { ...env, show: false };
    listeners.forEach((l) => l());
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(comeBackLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* the link is also shared through the share sheet below */ }
  };
  const share = async () => {
    try { await navigator.share({ title: "My invitation", url: comeBackLink() }); } catch { /* cancelled */ }
  };
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div role="note" className="ui-note ui-note-warn ui-tip">
      <button type="button" className="ui-tip-x" onClick={dismiss} aria-label="Hide this tip">✕</button>
      <p className="ui-tip-title">{env.inApp ? "You are in an app's built-in browser" : "Tip: you can always come back"}</p>
      <p className="ui-tip-text">
        {env.inApp
          ? "If you switch to another app (a map, for example), this page may be closed and you would need the email again. "
          : "Open this page in your normal browser so you can leave to check a map and return to the same place. "}
        {env.ios
          ? "Tap the compass or ⋯ icon, then “Open in Safari”."
          : "Tap the ⋮ menu, then “Open in Chrome” (or your browser)."}
      </p>
      <div className="ui-actions" style={{ marginTop: 10 }}>
        <button type="button" className="ui-btn ui-btn-black ui-btn-sm" onClick={copy}>{copied ? "Link copied" : "Copy link"}</button>
        {canShare && <button type="button" className="ui-btn ui-btn-gray ui-btn-sm" onClick={share}>Share…</button>}
      </div>
    </div>
  );
}
