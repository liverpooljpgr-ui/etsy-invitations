import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="font-serif text-4xl mb-3">PixelBridge Invitations</h1>
      <p className="text-stone-600 mb-8">Interactive digital invitations, personalised by you, hosted by us.</p>
      <Link href="/login" className="rounded-lg bg-stone-900 px-5 py-2.5 text-white">Sign in</Link>
    </main>
  );
}
