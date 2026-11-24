"use client";

import { useState } from "react";

/** "Copy link" for one demo: the full address, ready to send. */
export function CopyLink({ path }: { path: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(`${window.location.origin}${path}`); setDone(true); setTimeout(() => setDone(false), 2000); } catch { window.prompt("Copy this link", `${window.location.origin}${path}`); }
      }}
      className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
    >
      {done ? "Copied ✓" : "Copy link"}
    </button>
  );
}
