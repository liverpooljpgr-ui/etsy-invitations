"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeNext } from "@/lib/auth";
import { allowAttempt, findReturningCustomer, sendConfirmationLink, signInWithoutLink } from "@/lib/email-login";

/** `needsPassword`: the email belongs to an admin, so the form asks for the admin password next. */
export type LoginState = { ok: boolean; message: string; needsPassword?: boolean; email?: string } | null;

const emailOf = (v: FormDataEntryValue | null) => z.email().safeParse(String(v ?? "").trim().toLowerCase());

/**
 * Returning customers (they confirmed their email once when claiming their invitation) just enter their email:
 * no link, they go straight to their invitation. Admin accounts are asked for their password instead.
 */
export async function signInByEmail(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = emailOf(formData.get("email"));
  if (!email.success) return { ok: false, message: "Please enter a valid email address." };
  if (!(await allowAttempt("login", email.data))) return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };

  const customer = await findReturningCustomer(email.data);
  if (customer) {
    if (!(await signInWithoutLink(email.data))) return { ok: false, message: "Could not sign you in. Please try again." };
    const next = safeNext(formData.get("next"), "");
    redirect(next && next !== "/dashboard" ? next : customer.invitations.length === 1 ? `/editor/${customer.invitations[0]}` : "/dashboard");
  }

  const { data: p } = await createAdminClient().from("profiles").select("role").eq("email", email.data).maybeSingle();
  if (p?.role === "admin") return { ok: true, message: "", needsPassword: true, email: email.data };
  return { ok: false, message: "This is not the right email. Enter the same email you used the first time you opened your personal link. If you haven't opened that link yet, open it first — you only need it once." };
}

/** Admin sign-in with email + password. Anyone who is not an admin is signed straight out again. */
export async function signInAdminPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = emailOf(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const fail: LoginState = { ok: false, needsPassword: true, email: email.success ? email.data : "", message: "Wrong password. If you haven't set one yet, use the emailed link below." };
  if (!email.success || !password) return fail;
  if (!(await allowAttempt("pw", email.data))) return { ...fail, message: "Too many attempts. Please wait a few minutes and try again." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error || !data.user) return fail;
  const { data: p } = await createAdminClient().from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (p?.role !== "admin") {
    await supabase.auth.signOut();
    return fail;
  }
  const next = safeNext(formData.get("next"), "/admin");
  redirect(next === "/dashboard" ? "/admin" : next);
}

/** Fallback for an admin who has not set a password yet (or forgot it): the one-time emailed sign-in link. */
export async function sendAdminLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = emailOf(formData.get("email"));
  if (!email.success) return { ok: false, needsPassword: true, message: "Please enter a valid email address." };
  if (!(await allowAttempt("adminlink", email.data))) return { ok: false, needsPassword: true, email: email.data, message: "Too many attempts. Please wait a few minutes and try again." };
  const { data: p } = await createAdminClient().from("profiles").select("role").eq("email", email.data).maybeSingle();
  if (p?.role !== "admin") return { ok: false, needsPassword: true, email: email.data, message: "Could not send the link." };
  const h = await headers();
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const next = safeNext(formData.get("next"), "/admin");
  if (!(await sendConfirmationLink(email.data, next === "/dashboard" ? "/admin" : next, origin))) {
    return { ok: false, needsPassword: true, email: email.data, message: "Could not send the link. Please wait a minute and try again." };
  }
  return { ok: true, needsPassword: true, email: email.data, message: "Check your inbox for the sign-in link. Open it on any device." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
