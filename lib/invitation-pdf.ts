import "server-only";
import { existsSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import puppeteer, { type Browser } from "puppeteer-core";

/** Phone-sized pages: the same screens a guest sees on a phone, in the same order (cover, photo & date, venue, timeline, details, RSVP, closing). */
const W = 390;
const H = 844;
const SCALE = 2;

const LOCAL_CHROME = [
  process.env.PDF_CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter((p): p is string => !!p);

async function launch(): Promise<Browser> {
  if (process.env.VERCEL) {
    const { default: chromium } = await import("@sparticuz/chromium");
    return puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: "shell" });
  }
  const executablePath = LOCAL_CHROME.find((p) => existsSync(p));
  if (!executablePath) throw new Error("No Chrome found for the PDF export. Set PDF_CHROME_PATH.");
  return puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
}

/**
 * Opens the PUBLISHED invitation (the public page, exactly what guests see) in a headless phone-sized browser and takes one picture per
 * screen. Reduced motion is switched on, so the envelope opens at once and every screen is already in its final state.
 */
export async function renderInvitationPdf(publicUrl: string, title: string): Promise<Uint8Array> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: SCALE, isMobile: true, hasTouch: true });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    const res = await page.goto(publicUrl, { waitUntil: "networkidle0", timeout: 45000 });
    if (!res || !res.ok()) throw new Error("The invitation page could not be opened.");
    await page.addStyleTag({ content: "nextjs-portal,.music-btn,.swipe-hint{display:none!important}" });
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 700));

    const shots: Buffer[] = [];
    // 1. the cover with the closed envelope
    shots.push(Buffer.from(await page.screenshot({ type: "jpeg", quality: 90 })));
    // 2. tap the envelope (reduced motion: it opens without the animation), then each screen in turn
    await page.click(".env-btn");
    await page.waitForSelector('[data-card="2"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 900));
    const count = await page.$$eval(".card[data-card]", (els) => Math.max(...els.map((e) => Number(e.getAttribute("data-card")) || 0)));
    for (let n = 2; n <= count; n++) {
      const found = await page.evaluate((k) => {
        const el = document.querySelector<HTMLElement>(`.card[data-card="${k}"]`);
        if (!el) return false;
        el.scrollIntoView({ block: "start" });
        el.classList.add("in");
        return true;
      }, n);
      if (!found) continue;
      await new Promise((r) => setTimeout(r, 700));
      shots.push(Buffer.from(await page.screenshot({ type: "jpeg", quality: 90 })));
    }

    const pdf = await PDFDocument.create();
    pdf.setTitle(title);
    pdf.setAuthor("PixelInvite");
    pdf.setSubject("Keepsake copy of the invitation");
    pdf.setCreator("PixelInvite");
    for (const jpg of shots) {
      const img = await pdf.embedJpg(jpg);
      const p = pdf.addPage([W, H]);
      p.drawImage(img, { x: 0, y: 0, width: W, height: H });
    }
    return await pdf.save();
  } finally {
    await browser.close();
  }
}
