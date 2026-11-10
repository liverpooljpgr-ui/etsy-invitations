import { redirectIfSignedIn } from "@/lib/auth";
import { AuthLogo } from "@/components/AuthLogo";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  await redirectIfSignedIn(next);
  return (
    <div className="ui ui-center">
      <main className="ui-auth">
        <AuthLogo />
        <h1 className="ui-accent" style={{ margin: "0 0 2px", fontSize: 64, lineHeight: 1.1, textAlign: "center", fontWeight: 400, color: "var(--ui-label)" }}>Sign in</h1>
        <p className="ui-lede" style={{ textAlign: "center" }}>Sign in with the email you used the very first time.</p>
        <div className="ui-card"><LoginForm next={next ?? "/dashboard"} /></div>
      </main>
    </div>
  );
}
