"use client";

import { useState, useTransition } from "react";
import { reissueClaim, type CreateState } from "./actions";
import { CopyField } from "./CreateForm";

/** For a purchase whose personal link has not been used yet: make a fresh link. */
export function NewLinkButton({ invitationId }: { invitationId: string }) {
  const [res, setRes] = useState<CreateState>(null);
  const [pending, start] = useTransition();
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <button type="button" disabled={pending} className="ui-btn ui-btn-soft ui-btn-sm" onClick={() => start(async () => setRes(await reissueClaim(invitationId)))}>
        {pending ? "Creating…" : "Make a new link"}
      </button>
      {res && (
        <div className={`ui-note ${res.ok ? "ui-note-ok" : "ui-note-err"}`}>
          <p style={{ margin: 0 }}>{res.message}</p>
          {res.claimUrl && <CopyField value={res.claimUrl} />}
        </div>
      )}
    </div>
  );
}
