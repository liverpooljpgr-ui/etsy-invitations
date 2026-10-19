import Link from "next/link";

export default function Home() {
  return (
    <div className="ui ui-center">
      <main className="ui-auth" style={{ textAlign: "center" }}>
        <h1 className="ui-large-title" style={{ margin: "0 0 10px" }}>PixelBridge Invitations</h1>
        <p className="ui-lede">Interactive digital invitations, personalised by you, hosted by us.</p>
        <Link href="/login" className="ui-btn ui-btn-primary" style={{ minWidth: 180 }}>Sign in</Link>
      </main>
    </div>
  );
}
