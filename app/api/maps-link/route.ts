import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isMapsLink } from "@/lib/maps-link";

/**
 * Follows a Google Maps share link (maps.app.goo.gl/...) to the long address it stands for, so the editor can read the
 * place name out of it. Signed-in users only, rate limited, and it only ever talks to Google Maps hosts.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const ok = await createAdminClient().rpc("hit_rate_limit", { p_key: `maps-link:user:${data.user.id}`, p_window_seconds: 600, p_max: 40 });
  if (ok.data === false) return Response.json({ error: "Too many lookups. Try again in a few minutes." }, { status: 429 });

  let url = new URL(request.url).searchParams.get("u") ?? "";
  if (!isMapsLink(url) || url.length > 600) return Response.json({ error: "That is not a Google Maps link." }, { status: 400 });

  try {
    for (let hop = 0; hop < 5; hop++) {
      const res = await fetch(url, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (compatible; PixelInviteBot/1.0)" }, signal: AbortSignal.timeout(6000) });
      const next = res.headers.get("location");
      if (res.status < 300 || res.status >= 400 || !next) break;
      const target = new URL(next, url);
      if (target.hostname === "consent.google.com") { // EU cookie page: the real address is in "continue"
        const back = target.searchParams.get("continue");
        if (!back) break;
        url = back;
        continue;
      }
      if (!isMapsLink(target.toString())) break; // never follow anywhere but Google Maps
      url = target.toString();
    }
  } catch {
    return Response.json({ error: "Could not open that link." }, { status: 502 });
  }
  return Response.json({ url });
}
