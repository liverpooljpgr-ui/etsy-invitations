"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Reply = { id: string; guest_name: string; attendance: "attending" | "declined" | "maybe"; attendee_count: number; dietary: string | null; message: string | null; submitted_at: string };

const LABEL = { attending: "Coming", declined: "Can't come", maybe: "Not sure" } as const;

const csvCell = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** The couple's list of replies from the invitation (only the owner can read them: the database enforces it). */
export function RsvpReplies({ invitationId }: { invitationId: string }) {
  const [rows, setRows] = useState<Reply[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let gone = false;
    createBrowserSupabase()
      .from("rsvp_responses")
      .select("id, guest_name, attendance, attendee_count, dietary, message, submitted_at")
      .eq("invitation_id", invitationId)
      .order("submitted_at", { ascending: false })
      .then(({ data, error: e }) => {
        if (gone) return;
        if (e) setError("Could not load the replies."); else { setRows((data ?? []) as Reply[]); setError(""); }
      });
    return () => { gone = true; };
  }, [invitationId]);

  const remove = async (r: Reply) => {
    if (!confirm(`Delete the reply from ${r.guest_name}?`)) return;
    const { error: e } = await createBrowserSupabase().from("rsvp_responses").delete().eq("id", r.id);
    if (e) setError("Could not delete that reply."); else setRows((cur) => (cur ?? []).filter((x) => x.id !== r.id));
  };

  const download = () => {
    const head = ["Name", "Answer", "Guests", "Food needs", "Message", "Sent"];
    const lines = (rows ?? []).map((r) => [r.guest_name, LABEL[r.attendance], r.attendee_count, r.dietary, r.message, r.submitted_at].map(csvCell).join(","));
    const url = URL.createObjectURL(new Blob(["﻿" + [head.map(csvCell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "replies.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const yes = (rows ?? []).filter((r) => r.attendance === "attending");
  const guests = yes.reduce((n, r) => n + r.attendee_count, 0);
  const maybe = (rows ?? []).filter((r) => r.attendance === "maybe");
  const no = (rows ?? []).filter((r) => r.attendance === "declined");

  return (
    <div className="ui-card" style={{ marginTop: 16 }}>
      <h3>Guest replies</h3>
      {error && <p className="ui-help" style={{ color: "var(--ui-red)" }}>{error}</p>}
      {rows === null && !error && <p className="ui-help">Loading…</p>}
      {rows && rows.length === 0 && <p className="ui-help">No replies yet. They appear here as guests answer inside the invitation.</p>}
      {rows && rows.length > 0 && (
        <>
          <p className="ui-help" style={{ color: "var(--ui-label)", fontWeight: 600 }}>
            {guests} {guests === 1 ? "guest" : "guests"} coming ({yes.length} {yes.length === 1 ? "reply" : "replies"}) · {maybe.length} not sure · {no.length} can&apos;t come
          </p>
          <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
            {rows.map((r) => (
              <li key={r.id} style={{ padding: "10px 0", borderTop: ".5px solid var(--ui-hair)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{r.guest_name}
                    <span className="ui-help" style={{ marginLeft: 8, color: r.attendance === "attending" ? "#12a150" : "var(--ui-secondary)", fontWeight: 600 }}>
                      {LABEL[r.attendance]}{r.attendance !== "declined" ? ` · ${r.attendee_count}` : ""}
                    </span>
                  </div>
                  {r.dietary && <div className="ui-help">Food: {r.dietary}</div>}
                  {r.message && <div className="ui-help" style={{ color: "var(--ui-label)" }}>“{r.message}”</div>}
                  <div className="ui-help" style={{ fontSize: 11.5 }}>{new Date(r.submitted_at).toLocaleString()}</div>
                </div>
                <button type="button" className="ui-btn ui-btn-danger ui-btn-sm" onClick={() => void remove(r)}>Delete</button>
              </li>
            ))}
          </ul>
          <div className="ui-actions"><button type="button" className="ui-btn ui-btn-gray ui-btn-sm" onClick={download}>Download as spreadsheet (CSV)</button></div>
        </>
      )}
    </div>
  );
}
