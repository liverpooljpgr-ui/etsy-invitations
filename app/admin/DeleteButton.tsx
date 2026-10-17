"use client";

import { useState, useTransition } from "react";
import { deleteInvitation } from "./actions";

export function DeleteButton({ invitationId, label }: { invitationId: string; label: string }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <span>
      <button
        type="button"
        disabled={pending}
        className="text-xs text-red-700 underline disabled:opacity-60"
        onClick={() => {
          if (!confirm(`Delete “${label}” permanently?\n\nThe invitation, its guest link, the customer's content and uploaded files will be removed. This cannot be undone.`)) return;
          setError("");
          start(async () => {
            const r = await deleteInvitation(invitationId);
            if (!r.ok) setError(r.message);
          });
        }}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="ml-2 text-xs text-red-700">{error}</span>}
    </span>
  );
}
