import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="ui ui-center">
      <main className="ui-auth">
        <h1 className="ui-large-title" style={{ margin: "0 0 8px" }}>Sign in</h1>
        <p className="ui-lede">Sign in with the email you used the very first time.</p>
        <div className="ui-card"><LoginForm next={next ?? "/dashboard"} /></div>
      </main>
    </div>
  );
}
