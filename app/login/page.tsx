import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto max-w-sm px-5 py-20">
      <h1 className="font-serif text-3xl mb-2">Sign in</h1>
      <p className="text-sm text-stone-600 mb-6">Sign in with the email you used the very first time.</p>
      <LoginForm next={next ?? "/dashboard"} />
    </main>
  );
}
