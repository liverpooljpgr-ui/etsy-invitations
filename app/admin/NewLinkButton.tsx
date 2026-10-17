"use client";

import { useState, useTransition } from "react";
import { reissueClaim, type CreateState } from "./actions";
import { CopyField } from "./CreateForm";

/** For a purchase whose personal link has not been used yet: make a fresh link. */
export function NewLinkButton({ invitationId }: { invitationId: string }) {
  const [res, setRes] = useState<CreateState>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <button type="button" disabled={pending} className="text-xs underline disabled:opacity-60"
        onClick={() => start(async () => setRes(await reissueClaim(invitationId)))}>
        {pending ? "Creating…" : "Make a new link"}
      </button>
      {res && (
        <div className={`mt-1 text-xs ${res.ok ? "text-green-800" : "text-red-700"}`}>
          <p>{res.message}</p>
          {res.claimUrl && <CopyField value={res.claimUrl} />}
        </div>
      )}
    </div>
  );
}
