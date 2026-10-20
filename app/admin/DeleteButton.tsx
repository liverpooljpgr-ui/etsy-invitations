"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteInvitation } from "./actions";

export function DeleteButton({ invitationId, label }: { invitationId: string; label: string }) {
  const [error, setError] = useState("");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <span className="ui-row-line" style={{ gap: 6 }}>
      <button
        type="button"
        disabled={pending}
        className="ui-btn ui-btn-danger ui-btn-sm"
        onClick={() => {
          if (!confirm(`Delete “${label}” permanently?\n\nThe invitation, its guest link, the customer's content and uploaded files will be removed. This cannot be undone.`)) return;
          setError("");
          start(async () => {
            const r = await deleteInvitation(invitationId);
            if (!r.ok) setError(r.message);
            else router.refresh(); // the list drops the deleted row
          });
        }}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="ui-help" style={{ color: "var(--ui-red)" }}>{error}</span>}
    </span>
  );
}
