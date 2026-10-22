import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Random guest-link codes made by createPurchase look like "k7m2xq9p" (8 characters, no vowels trick letters i / l / o / 0 / 1). */
export const RANDOM_SLUG = /^[a-hj-km-np-z2-9]{8}$/;

// wedding words, used when two couples have the same names
const WORDS = [
  "forever", "love", "vows", "bliss", "together", "rings", "evermore", "romance", "bouquet", "happily",
  "devoted", "cherish", "blossom", "honey", "always", "union", "aisle", "sweetheart", "wedding", "celebration",
];

const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", є: "ye", і: "i", ї: "yi", ґ: "g",
};

/** "Anna-Maria Škoda" -> "anna" (first word only, letters and numbers only, latin letters). */
export function slugPart(name: string, max = 12): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  const latin = first.toLowerCase().split("").map((ch) => CYRILLIC[ch] ?? ch).join("");
  return latin.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "").slice(0, max);
}

/**
 * A readable guest-link address from the couple's names: "anna-and-richard". If another couple already has it, a wedding
 * word is added ("anna-and-richard-forever"); in the very unlikely case all of those are taken too, a number is added.
 * Returns null when the names give nothing usable (for example names in a script we can not write in latin letters).
 */
export async function pickNameSlug(db: SupabaseClient, first: string, second: string): Promise<string | null> {
  const a = slugPart(first), b = slugPart(second);
  if (!a || !b) return null;
  const base = `${a}-and-${b}`;

  const free = async (slug: string) => {
    if (slug.length < 3 || slug.length > 40) return false;
    const [{ data: taken }, { data: reserved }] = await Promise.all([
      db.from("invitations").select("id").eq("slug", slug).maybeSingle(),
      db.from("reserved_slugs").select("slug").eq("slug", slug).maybeSingle(),
    ]);
    return !taken && !reserved;
  };

  if (await free(base)) return base;
  // start the word list at a different place for different names, so the same word is not always the first choice
  const start = [...base].reduce((n, ch) => n + ch.charCodeAt(0), 0) % WORDS.length;
  for (let i = 0; i < WORDS.length; i++) {
    const s = `${base}-${WORDS[(start + i) % WORDS.length]}`;
    if (await free(s)) return s;
  }
  for (let n = 2; n < 50; n++) {
    const s = `${base}-${WORDS[start]}-${n}`;
    if (await free(s)) return s;
  }
  return null;
}
