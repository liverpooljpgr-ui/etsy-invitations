"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeNext } from "@/lib/auth";
import { allowAttempt, findReturningCustomer, sendConfirmationLink, signInWithoutLink } from "@/lib/email-login";

export type LoginState = { ok: boolean; message: string } | null;

/**
 * Returning customers (they confirmed their email once when claiming their invitation) just enter their email:
 * no link, they go straight to their invitation. Admins always get an emailed sign-in link instead.
 */
export async function signInByEmail(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { ok: false, message: "Please enter a valid email address." };
  if (!(await allowAttempt("login", email.data))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };

  const customer = await findReturningCustomer(email.data);
  if (customer) {
    if (!(await signInWithoutLink(email.data))) return { ok: false, message: "Could not sign you in. Please try again." };
    const next = safeNext(formData.get("next"), "");
    redirect(next && next !== "/dashboard" ? next : customer.invitations.length === 1 ? `/editor/${customer.invitations[0]}` : "/dashboard");
  }

  // Not a returning customer: staff get an emailed link; everyone else is pointed to their purchase link.
  const { data: p } = await createAdminClient().from("profiles").select("role").eq("email", email.data).maybeSingle();
  if (p?.role === "admin") {
    const h = await headers();
    const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const next = safeNext(formData.get("next"));
    if (!(await sendConfirmationLink(email.data, next, origin))) return { ok: false, message: "Could not send the link. Please wait a minute and try again." };
    return { ok: true, message: "Check your inbox for the sign-in link. Open it on any device." };
  }
  return { ok: false, message: "This is not the right email. Enter the same email you used the first time you opened your personal link. If you haven't opened that link yet, open it first — you only need it once." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
