"use client";

import { useEffect, useRef, useState } from "react";
import { RsvpForm, type RsvpLabels } from "./RsvpForm";

const IMG = "/templates/christmas-gift/v1";
const PIMG = "/templates/christmas-paris/v1"; // Christmas Paris: its own houses, lamps and people

/** Light snow over the whole screen, drawn on a canvas: small flakes of a few sizes falling slowly and drifting. */
function Snow() {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current;
    if (!c || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const g = c.getContext("2d");
    if (!g) return;
    let raf = 0, w = 0, h = 0, last = performance.now();
    const d = Math.min(window.devicePixelRatio || 1, 2);
    type F = { x: number; y: number; r: number; v: number; ph: number };
    let flakes: F[] = [];
    const size = () => {
      w = c.clientWidth; h = c.clientHeight;
      c.width = Math.round(w * d); c.height = Math.round(h * d);
      const n = Math.round((w * h) / 9000); // light snow: about one flake for a 95 x 95 px patch
      flakes = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 0.8 + Math.random() * 2.2, v: 14 + Math.random() * 26, ph: Math.random() * 6.28 }));
    };
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      g.setTransform(d, 0, 0, d, 0, 0);
      g.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.v * dt * (0.6 + f.r / 3);
        f.ph += dt * 0.9;
        f.x += Math.sin(f.ph) * 8 * dt;
        if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
        g.beginPath();
        g.fillStyle = `rgba(255,255,255,${0.55 + f.r * 0.15})`;
        g.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        g.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    size();
    raf = requestAnimationFrame(tick);
    const ro = new ResizeObserver(size);
    ro.observe(c);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={cv} className="gs-snow" aria-hidden="true" />;
}

/** Where the parts of each walking person lie, in % of the person's box (taken from the parts' places in the drawing). */
const PEOPLE: Record<string, { ratio: number; parts: Record<string, { l: number; t: number; w: number; h: number }> }> = {
  grandpa: { ratio: 0.6634, parts: { back: { l: 41.43, t: 60.4, w: 24.05, h: 33.62 }, front: { l: 11.12, t: 59.0, w: 32.66, h: 36.36 }, body: { l: 21.41, t: 8.29, w: 35.51, h: 56.72 }, cane: { l: 53.46, t: 41.28, w: 18.44, h: 55.75 } } },
  grandma: { ratio: 0.4888, parts: { back: { l: 42.32, t: 67.51, w: 28.98, h: 31.15 }, front: { l: 13.58, t: 67.18, w: 40.05, h: 31.61 }, body: { l: 14.13, t: 12.78, w: 75.38, h: 72.83 } } },
  girl: { ratio: 0.4918, parts: { back: { l: 59.11, t: 61.2, w: 40.65, h: 33.27 }, front: { l: 17.11, t: 61.2, w: 41.63, h: 33.27 }, body: { l: 32.42, t: 6.04, w: 58.82, h: 59.78 } } },
  boy: { ratio: 0.642, parts: { back: { l: 53.02, t: 66.8, w: 32.43, h: 26.55 }, front: { l: 22.16, t: 66.8, w: 32.09, h: 27.49 }, body: { l: 21.24, t: 12.55, w: 69.38, h: 59.85 } } },
};

/** One walking person: the legs (behind the body) swing in turn from the hip, the body bobs with each step, a cane swings with the front leg. */
function Walker({ who }: { who: keyof typeof PEOPLE }) {
  const p = PEOPLE[who];
  /* eslint-disable @next/next/no-img-element */
  return (
    <span className={`gw gw-${who}`} style={{ aspectRatio: String(p.ratio) }}>
      {Object.entries(p.parts).map(([role, b]) => (
        <img key={role} className={`gw-${role}`} src={`${IMG}/people/${who}-${role}.webp`} alt="" draggable={false} style={{ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%` }} />
      ))}
    </span>
  );
  /* eslint-enable @next/next/no-img-element */
}

/** The family with the pram, its legs cut off the drawing so they step (the child's back leg stays: it is drawn over the pram's wheel). Each leg reaches up under the coat, so no gap opens at the hip; it turns about the hip (ox, oy). */
const FAMILY_LEGS: Record<string, { l: number; t: number; w: number; h: number; ox: number; oy: number }> = {
  "dad-back": { l: 0, t: 58.24, w: 17.01, h: 41.76, ox: 83.8, oy: 9 },
  "dad-front": { l: 17.01, t: 58.24, w: 15.51, h: 41.76, ox: 21.4, oy: 9 },
  "mum-back": { l: 34.27, t: 68.17, w: 12.88, h: 31.83, ox: 80.6, oy: 11.9 },
  "mum-front": { l: 47.15, t: 68.17, w: 10.01, h: 31.83, ox: 25, oy: 11.9 },
  "kid-front": { l: 87.68, t: 56.03, w: 12.32, h: 43.97, ox: 21.8, oy: 8.6 },
};
function Family() {
  /* eslint-disable @next/next/no-img-element */
  return (
    <span className="gf">
      {Object.entries(FAMILY_LEGS).map(([k, b]) => (
        <img key={k} className={`gf-leg gf-${k}`} src={`${IMG}/people/family-${k}.webp`} alt="" draggable={false} style={{ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%`, transformOrigin: `${b.ox}% ${b.oy}%` }} />
      ))}
      <img className="gf-body" src={`${IMG}/people/family-body.webp`} alt="" draggable={false} />
    </span>
  );
  /* eslint-enable @next/next/no-img-element */
}

/** Christmas Paris: where the parts of each walker lie (in % of the person's box) and the hip each leg turns about (ox, oy in % of the leg). */
const PARIS_PEOPLE: Record<string, { ratio: number; parts: Record<string, { l: number; t: number; w: number; h: number; ox?: number; oy?: number }> }> = {"pman": {ratio: 0.4353, parts: {"body": {"l": 0, "t": 0, "w": 74.38, "h": 84.17}, "back": {"l": 2.89, "t": 46.04, "w": 35.12, "h": 37.23, "ox": 76.5, "oy": 13.5}, "front": {"l": 37.6, "t": 46.04, "w": 36.78, "h": 38.13, "ox": 14.6, "oy": 13.2}, "dog": {"l": 45.45, "t": 47.12, "w": 54.55, "h": 52.88}}}, "pwoman": {ratio: 0.558, parts: {"body": {"l": 0, "t": 0, "w": 100, "h": 87.75}, "front": {"l": 10.59, "t": 78.99, "w": 44.31, "h": 21.01, "ox": 62.8, "oy": 11.5}, "back": {"l": 54.9, "t": 78.99, "w": 42.35, "h": 20.79, "ox": 42.6, "oy": 20}}}, "pwoman2": {ratio: 0.473, parts: {"body": {"l": 0, "t": 0, "w": 93.93, "h": 95.27}, "front": {"l": 70, "t": 72.8, "w": 30, "h": 27.2, "ox": 13.1, "oy": -3.7}, "back": {"l": 14.64, "t": 80.24, "w": 25.36, "h": 18.92, "ox": 63.4, "oy": -4.5}}}, "pman2": {ratio: 0.4317, parts: {"body": {"l": 1.4, "t": 0, "w": 98.6, "h": 61.04}, "front": {"l": 25.58, "t": 54.62, "w": 69.77, "h": 45.38, "ox": 24, "oy": 11.9}, "back": {"l": 0, "t": 54.62, "w": 64.19, "h": 44.98, "ox": 73.2, "oy": 12.1}}}, "pgirl": {ratio: 0.6571, parts: {"body": {"l": 0, "t": 0, "w": 63.75, "h": 57.59}, "dog": {"l": 31.47, "t": 51.83, "w": 68.53, "h": 48.17}, "back": {"l": 6.77, "t": 54.97, "w": 25.1, "h": 21.47, "ox": 60.3, "oy": 9.8}, "front": {"l": 31.87, "t": 54.97, "w": 20.32, "h": 21.2, "ox": 51, "oy": 9.9}}}};
/** A Paris walker: the legs swing from the hip behind the body, the body bobs a little; the man's dog trots along beside him on its leash. */
function ParisWalker({ who }: { who: "pman" | "pwoman" | "pwoman2" | "pman2" | "pgirl" }) {
  const p = PARIS_PEOPLE[who];
  /* eslint-disable @next/next/no-img-element */
  return (
    <span className={`ppw ppw-${who}`} style={{ aspectRatio: String(p.ratio) }}>
      {Object.entries(p.parts).map(([role, b]) => (
        <img key={role} className={`ppw-${role}`} src={`${PIMG}/people/${who}-${role}.webp`} alt="" draggable={false}
          style={{ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%`, ...(b.ox != null ? { transformOrigin: `${b.ox}% ${b.oy}%` } : {}) }} />
      ))}
    </span>
  );
  /* eslint-enable @next/next/no-img-element */
}

export type StreetText = {
  intro: string; title: string; host: string; when: string; time?: string; where: string;
  placeIntro?: string; place: string; address: string; mapUrl?: string; directions?: string; next: string;
  detailsTitle: string; details: { label: string; text: string }[]; detailsNext: string;
  replyTitle: string; replyBy: string; reply: string; calendar?: string; closing?: string; down?: string;
};

/**
 * The pages after the present: a snowy street of houses under a big sky, the words written on the sky.
 * Page 2 shows the left half of the street; "Where?" swipes the view to the right, where the street goes on (page 3);
 * the next button lifts the view up into the sky with the clouds (page 4, the reply). People walk along the street, clouds drift, it snows.
 */
export function GiftStreet({ text, rsvp, calendarHref, page: pageProp, variant = "amsterdam" }: { variant?: "amsterdam" | "paris"; page?: 2 | 3 | 5 | 4; text: StreetText; rsvp?: { slug?: string; deadline: string; maxParty: number; email?: string; labels?: RsvpLabels }; calendarHref?: string }) {
  const [page, setPage] = useState<2 | 3 | 5 | 4>(pageProp ?? 2); // 2 and 3: the street; 5: the Christmas tree with the details; 4: the sky with the reply
  useEffect(() => { if (pageProp) setPage(pageProp); }, [pageProp]); // the editor's preview follows the step being edited
  // the street is two screens long: only the houses that fit on it whole are shown (none is cut, none reaches the tree screen)
  const housesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = housesRef.current;
    if (!row) return;
    const fit = () => {
      const end = row.clientWidth;
      for (const im of Array.from(row.children) as HTMLElement[]) { im.style.display = ""; }
      for (const im of Array.from(row.children) as HTMLElement[]) { if (im.offsetLeft + im.offsetWidth > end + 1) im.style.display = "none"; }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(row);
    row.querySelectorAll("img").forEach((im) => im.addEventListener("load", fit));
    return () => ro.disconnect();
  }, []);
  /* eslint-disable @next/next/no-img-element */
  return (
    <div className={`gs gs-${variant}`} data-page={page}>
      <div className="gs-world">
        <img className="gs-cloud gs-c1" src={`${IMG}/cloud6.webp`} alt="" />
        <img className="gs-cloud gs-c2" src={`${IMG}/cloud3.webp`} alt="" />
        <img className="gs-cloud gs-c3" src={`${IMG}/cloud5.webp`} alt="" />
        <img className="gs-cloud gs-c4" src={`${IMG}/cloud4.webp`} alt="" />
        <img className="gs-cloud gs-c5" src={`${IMG}/cloud6.webp`} alt="" />
        <img className="gs-cloud gs-c6" src={`${IMG}/cloud3.webp`} alt="" />
        <img className="gs-cloud gs-c8" src={`${IMG}/cloud6.webp`} alt="" />
        <img className="gs-cloud gs-c9" src={`${IMG}/cloud4.webp`} alt="" />
        <div className="gs-ground" />
        {/* the seven houses stand side by side along the street; where the two screens need more, they repeat from the first one */}
        <div className="gs-houses" ref={housesRef}>{variant === "paris" ? Array.from({ length: 24 }, (_, i) => <img key={i} src={`${PIMG}/house${(i % 8) + 1}.webp`} alt="" />) : Array.from({ length: 21 }, (_, i) => <img key={i} src={`${IMG}/house${(i % 7) + 1}.webp`} alt="" />)}</div>
        {/* the family with the pram walks further away on the street: behind the street lamps */}
        <div className="gs-people gs-people-far">
          <span className="gs-walk gs-w2"><Family /></span>
          <span className="gs-walk gs-w2 gs-later"><Family /></span>
        </div>
        {/* two street lamps, one on each street screen, their lanterns glowing softly */}
        {variant === "paris" && <><img className="gs-ptrees" src={`${PIMG}/trees.webp`} alt="" /><img className="gs-kiosk" src={`${PIMG}/kiosk.webp`} alt="" /></>}
        <span className="gs-lamp gs-l1"><img src={variant === "paris" ? `${PIMG}/lamp.webp` : `${IMG}/lamp.webp`} alt="" /></span>
        <span className="gs-lamp gs-l2"><img src={variant === "paris" ? `${PIMG}/lamp.webp` : `${IMG}/lamp.webp`} alt="" /></span>
        {variant === "paris" && <span className="gs-lamp gs-l5"><img src={`${PIMG}/lamp.webp`} alt="" /></span>}
        <img className="gs-tree gs-t1" src={`${IMG}/tree-bare.webp`} alt="" />
        <img className="gs-tree gs-t2" src={`${IMG}/tree-snow.webp`} alt="" />
        <img className="gs-tree gs-t3" src={`${IMG}/tree-bare.webp`} alt="" />
        {/* the second screen: a little stone bridge over a frozen canal, in front of the street */}
        <img className="gs-bridge" src={`${IMG}/bridge.webp`} alt="" />
        {/* the third screen: a decorated Christmas tree in the snow, Santa flying over now and then */}
        {/* guests standing round the tree, some further back (smaller, higher, behind it), some close in front; each sways a little */}
        <img className="gs-guests gs-g2" src={`${IMG}/people/guests2.webp`} alt="" />
        <img className="gs-guests gs-g4" src={`${IMG}/people/guests4.webp`} alt="" />
        {/* Christmas Paris, the tree screen: the Eiffel Tower behind a little Christmas market (roasted chestnuts, crêpes), the tree with presents,
            two street lamps, a girl with a hot drink and a grandmother with flowers */}
        {variant === "paris" && (
          <>
            <img className="gs-ptower" src={`${PIMG}/tower.webp`} alt="" />
            {/* the Eiffel Tower sparkles: little lights blink on and off all over it, as it does in the evening */}
            <span className="gs-psparkle" aria-hidden="true"><b className="gs-pbeam" /><b className="gs-pbeam gs-pbeam2" />{([[38.9,32.5,1.56,1.49],[43.8,51.2,0.14,2.01],[49.2,7.3,0.17,1.51],[62.6,41.4,0.3,1.67],[73.3,59.2,1.39,1.88],[15.9,89.9,2.06,1.75],[42.4,16.7,0.74,2.38],[51.8,19.9,1.53,1.85],[29.6,52.2,0.14,1.65],[46.0,63.9,0.75,2.1],[41.9,43.9,1.91,2.24],[52.0,25.5,1.26,2.45],[37.5,68.2,2.35,1.54],[59.8,40.8,0.36,1.99],[52.2,7.5,1.83,2.09],[37.2,81.0,1.67,2.11],[47.9,55.0,2.02,2.53],[56.9,45.7,0.15,2.24]] as const).map(([x, y, d, t], i) => <i key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s`, animationDuration: `${t}s` }} />)}</span>
            {/* two more booths further back, at the edges of the market: mulled wine and gingerbread */}
            <img className="gs-pstall gs-pstall-back gs-pstall-bl" src={`${PIMG}/stall-wine.webp`} alt="" />
            <img className="gs-pstall gs-pstall-back gs-pstall-br" src={`${PIMG}/stall-ginger.webp`} alt="" />
            <img className="gs-pstall gs-pstall-l" src={`${PIMG}/stall-chestnut.webp`} alt="" />
            <img className="gs-pstall gs-pstall-r" src={`${PIMG}/stall-crepe.webp`} alt="" />
            {/* the steam drawn over the crêpe booth sways gently (it is cut from the drawing, in the same box as the booth) */}
            <span className="gs-pbooth-steam" aria-hidden="true"><img src={`${PIMG}/stall-crepe-steam.webp`} alt="" style={{ left: "69.63%", top: "0.3%", width: "12.03%", height: "22.69%" }} /></span>
          </>
        )}
        <img className="gs-xtree" src={variant === "paris" ? `${PIMG}/xtree.webp` : `${IMG}/xmas-tree.webp`} alt="" />
        {/* Christmas Paris: the tree shines, a warm glow round it and its little lights twinkling */}
        {variant === "paris" && <span className="gs-ptreeshine" aria-hidden="true">{([[52.5,42.6,2.03,1.76],[54.0,46.6,0.41,1.81],[66.0,55.4,0.21,1.56],[55.6,16.5,1.53,1.25],[86.3,80.7,1.44,1.94],[39.0,21.3,1.16,1.27],[43.6,23.7,0.07,1.76],[64.3,41.7,1.14,1.97],[57.4,46.0,1.01,1.53],[89.3,81.8,1.85,2.05],[41.0,32.7,0.64,1.28],[43.7,65.2,1.86,1.66],[76.6,79.0,0.0,1.45],[47.8,75.5,2.16,1.68],[52.2,15.3,1.71,1.52],[47.0,16.3,2.12,2.11],[44.9,18.5,0.22,1.27],[28.8,67.4,1.23,1.74],[55.8,23.7,0.29,1.97],[48.4,18.4,0.47,1.52],[73.5,79.9,0.67,2.26],[47.2,25.2,1.88,1.97]] as const).map(([x, y, d, t], i) => <i key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s`, animationDuration: `${t}s` }} />)}</span>}
        {variant === "paris" && (
          <>
            <img className="gs-pguest gs-pg-girl" src={`${PIMG}/people/girlcup.webp`} alt="" />
            <img className="gs-pguest gs-pg-granny" src={`${PIMG}/people/granny.webp`} alt="" />
            {/* a father with his little one on his shoulders, by the tree */}
            <span className="gs-pguest gs-pg-mankid" aria-hidden="true">
              <img className="gs-mk-body" src={`${PIMG}/people/mankid-body.webp`} alt="" />
              <img className="gs-mk-arm" src={`${PIMG}/people/mankid-arm.webp`} alt="" style={{ left: "58.49%", top: "6.9%", width: "23.27%", height: "6.9%", transformOrigin: "0% 87.9%" }} />
            </span>
          </>
        )}
        <img className="gs-guests gs-g1" src={`${IMG}/people/guests1.webp`} alt="" />
        <img className="gs-guests gs-g3" src={`${IMG}/people/guests3.webp`} alt="" />
        <img className="gs-treestar" src={`${IMG}/star.webp`} alt="" />
        <span className="gs-santa"><img src={`${IMG}/santa.webp`} alt="" /></span>
        {/* the people walk only along the street (the two first screens; the tree screen stays quiet), and there are always some on it:
            each group walks twice, half a walk apart. Their legs swing in turn and their body rises a little with every step */}
        {/* Christmas Paris: the man with his French bulldog and the woman with her shopping bags walk along the street */}
        {variant === "paris" && (
          <>
            {/* the man and his dog walk behind the left street lamp, in front of the right one; the woman in front of both */}
            {/* the girl with her dachshund walks behind everybody */}
            <div className="gs-people gs-people-paris gs-pp-girl">
              <span className="gs-walk gs-pw4"><ParisWalker who="pgirl" /></span>
              <span className="gs-walk gs-pw4 gs-later"><ParisWalker who="pgirl" /></span>
            </div>
            <div className="gs-people gs-people-paris gs-pp-man">
              <span className="gs-walk gs-pw1"><ParisWalker who="pman" /></span>
              <span className="gs-walk gs-pw1 gs-later"><ParisWalker who="pman" /></span>
            </div>
            {/* the second screen: the woman in the camel coat */}
            <div className="gs-people gs-people-paris gs-pp-two">
              <span className="gs-walk gs-pw3"><ParisWalker who="pwoman2" /></span>
              <span className="gs-walk gs-pw3 gs-later"><ParisWalker who="pwoman2" /></span>
            </div>
            <div className="gs-people gs-people-paris gs-pp-woman">
              <span className="gs-walk gs-pw2"><ParisWalker who="pwoman" /></span>
              <span className="gs-walk gs-pw2 gs-later"><ParisWalker who="pwoman" /></span>
            </div>
          </>
        )}
        <div className="gs-people">
          <span className="gs-walk gs-w3"><Walker who="grandma" /><Walker who="grandpa" /></span>
          <span className="gs-walk gs-w3 gs-later"><Walker who="grandma" /><Walker who="grandpa" /></span>
          <span className="gs-walk gs-w4"><Walker who="boy" /><Walker who="girl" /></span>
          <span className="gs-walk gs-w4 gs-later"><Walker who="boy" /><Walker who="girl" /></span>
        </div>

        {/* the words, written on the sky of each page */}
        <section className="gs-text gs-p2" aria-hidden={page !== 2}>
          {text.intro && <p className="gs-small">{text.intro}</p>}
          {text.title && <h1 className="gs-title">{text.title}</h1>}
          {text.host && <p className="gs-line">{text.host}</p>}
          <p className="gs-when gs-date">{text.when}</p>
          {text.time && <p className="gs-when gs-date gs-time">{text.time}</p>}
          <button type="button" className="gs-btn" onClick={() => setPage(3)} tabIndex={page === 2 ? 0 : -1}>{text.where}</button>
        </section>
        <section className="gs-text gs-p3" aria-hidden={page !== 3}>
          {/* the name of the place in the decorative letters, the address under it in plain ones */}
          {text.placeIntro && <p className="gs-small gs-place-intro">{text.placeIntro}</p>}
          {text.place && <h2 className="gs-title gs-place">{text.place}</h2>}
          <p className="gs-line gs-address">{text.address}</p>
          {text.mapUrl && text.directions && <a className="gs-link" href={text.mapUrl} target="_blank" rel="noopener noreferrer" tabIndex={page === 3 ? 0 : -1}>{text.directions}</a>}
          <button type="button" className="gs-btn" onClick={() => setPage(5)} tabIndex={page === 3 ? 0 : -1}>{text.next}</button>
        </section>
        <section className="gs-text gs-p5" aria-hidden={page !== 5}>
          {text.detailsTitle && <h2 className="gs-title">{text.detailsTitle}</h2>}
          {text.details.slice(0, 2).map((d, i) => ( // two sections at most: more does not fit above the tree
            <div key={i} className="gs-detail">
              <p className="gs-small">{d.label}</p>
              <p className="gs-line">{d.text}</p>
            </div>
          ))}
          <button type="button" className="gs-btn" onClick={() => setPage(4)} tabIndex={page === 5 ? 0 : -1}>{text.detailsNext}</button>
        </section>
        <section className="gs-text gs-p4" aria-hidden={page !== 4}>
          {text.replyTitle && <h2 className="gs-title">{text.replyTitle}</h2>}
          {text.replyBy && <p className="gs-when">{text.replyBy}</p>}
          {text.closing && <p className="gs-line gs-closing">{text.closing}</p>}
          {/* "Reply now" opens the reply form in a window over the sky (the same form as the other invitations: name, yes / no / not sure, how many, food, a note) */}
          <RsvpForm slug={rsvp?.slug} deadline={rsvp?.deadline ?? ""} maxParty={rsvp?.maxParty ?? 6} contactEmail={rsvp?.email} hostSelector=".gs" triggerClassName="gs-btn" trigger={text.reply} party labels={rsvp?.labels} />
          {text.calendar && calendarHref && <a className="gs-link" href={calendarHref} tabIndex={page === 4 ? 0 : -1}>{text.calendar}</a>}
          <button type="button" className="gs-back" onClick={() => setPage(2)} tabIndex={page === 4 ? 0 : -1}>{text.down || "Down to the street"}</button>
        </section>
      </div>
      {/* "Will you come?": the star leaves the top of the tree, shining brighter and growing, and rises with the view into the sky, where the reply is written under it */}
      <img className="gs-flystar" src={`${IMG}/star.webp`} alt="" aria-hidden="true" />
      <Snow />
    </div>
  );
  /* eslint-enable @next/next/no-img-element */
}
