import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signOut } from "@/app/login/actions";
import { claimStatus } from "./actions";
import { ClaimForm } from "./ClaimForm";

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const status = await claimStatus(token);
  if (status === "ok") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: me } = await createAdminClient().from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (me?.role !== "admin") redirect(`/claim/${token}/go`); // signed-in customer: attach it straight away

      async function leaveAdmin() {
        "use server";
        await signOut();
        redirect(`/claim/${token}`);
      }
      return (
        <main className="mx-auto max-w-sm px-5 py-20">
          <h1 className="font-serif text-3xl mb-2">You are signed in as admin</h1>
          <p className="text-sm text-stone-600 mb-6">This is a customer&apos;s personal link, so it was not used. To see what the customer sees, sign out here (or open the link in a private window).</p>
          <form action={leaveAdmin}><button className="w-full rounded-lg bg-stone-900 px-4 py-2 text-white">Sign out and view as customer</button></form>
          <p className="mt-6 text-sm"><Link className="underline" href="/admin">Back to admin</Link></p>
        </main>
      );
    }
  }
  return (
    <main className="mx-auto max-w-sm px-5 py-20">
      <h1 className="font-serif text-3xl mb-2">Your invitation is ready</h1>
      {status === "ok" ? (
        <>
          <p className="text-sm text-stone-600 mb-6">Enter your email to personalise it. The first time, we email you one confirmation link; after that you only need your email.</p>
          <ClaimForm token={token} />
        </>
      ) : status === "used" ? (
        <>
          <p className="text-sm text-stone-600 mb-6">This personal link was already opened. Enter the email you used the first time to continue.</p>
          <ClaimForm token={token} />
        </>
      ) : (
        <p className="mb-4 text-sm text-stone-700">This link is invalid or has expired. Contact support for a new one.</p>
      )}
      <p className="mt-8 text-sm"><Link className="underline" href="/login">Already have an invitation? Sign in with your email</Link></p>
    </main>
  );
}
