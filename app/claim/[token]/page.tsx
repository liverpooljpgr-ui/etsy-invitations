import { requireUser } from "@/lib/auth";
import { claimInvitation } from "./actions";

export default async function ClaimPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  await requireUser(`/claim/${token}`);
  return (
    <main className="mx-auto max-w-sm px-5 py-20">
      <h1 className="font-serif text-3xl mb-2">Your invitation is ready</h1>
      <p className="text-sm text-stone-600 mb-6">Confirm to link this invitation to your account. You&apos;ll then be able to personalise and publish it.</p>
      {error && <p className="mb-4 text-sm text-red-700">This link is invalid, expired or already used. Contact support for a new one.</p>}
      <form action={claimInvitation.bind(null, token)}>
        <button className="w-full rounded-lg bg-stone-900 px-4 py-2 text-white">Start personalising</button>
      </form>
    </main>
  );
}
