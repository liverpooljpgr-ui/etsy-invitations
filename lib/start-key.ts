import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Each design has its own secret key for its /start link (the link in the Etsy download PDF), so changing
 * t=cupid-script to another design in the address bar does not work without that design's own key.
 * Derived from a server secret, nothing is stored. Set START_KEY_SECRET to rotate every key at once.
 */
function secret(): string {
  return process.env.START_KEY_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function startKey(slug: string): string {
  return createHmac("sha256", secret()).update(`start:${slug}`).digest("base64url").slice(0, 14);
}

export function startKeyOk(slug: string, key: string): boolean {
  if (!secret() || !/^[A-Za-z0-9_-]{14}$/.test(key)) return false;
  const a = Buffer.from(startKey(slug));
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}
