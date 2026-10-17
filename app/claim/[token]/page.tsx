import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { claimStatus } from "./actions";
import { ClaimForm } from "./ClaimForm";

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const status = await claimStatus(token);
  if (status === "ok") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect(`/claim/${token}/go`); // already signed in: attach it straight away
  }
  return (
    <main className="mx-auto max-w-sm px-5 py-20">
      <h1 className="font-serif text-3xl mb-2">Your invitation is ready</h1>
      {status === "ok" ? (
        <>
          <p className="text-sm text-stone-600 mb-6">Enter your email to personalise it. The first time, we email you one confirmation link; after that you only need your email.</p>
          <ClaimForm token={token} />
        </>
      ) : (
        <p className="mb-4 text-sm text-stone-700">
          {status === "used" ? "This personal link has already been used." : "This link is invalid or has expired. Contact support for a new one."}
        </p>
      )}
      <p className="mt-8 text-sm"><Link className="underline" href="/login">Already have an invitation? Sign in with your email</Link></p>
    </main>
  );
}
