// Renders the screenplay (docs/video/mutuals.fountain) as a standard-format PDF: Courier 12, 1.5" left margin,
// character names at 3.7", dialogue at 2.5", scene numbers in both margins, page numbers top right.
// If a recording exists (scripts/video/out/scenes.json), each scene number gets its timecode in the video.
//
//   node scripts/video/render-screenplay.mjs [--script docs/video/mutuals.fountain] [--out docs/video/mutuals-screenplay.pdf] [--notes]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import { parseFountain } from "./fountain.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i < 0 ? d : process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true;
};
const SCRIPT = path.resolve(ROOT, String(arg("script", "docs/video/mutuals.fountain")));
const OUTFILE = path.resolve(ROOT, String(arg("out", SCRIPT.replace(/\.fountain$/, "-screenplay.pdf"))));
const SHOW_NOTES = !!arg("notes", false);
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const doc = parseFountain(fs.readFileSync(SCRIPT, "utf8"));
// Timecodes come from the last capture (the render draws the video on exactly that timeline).
const timesFile = path.join(HERE, "out", "timeline.json");
const tl = fs.existsSync(timesFile) ? JSON.parse(fs.readFileSync(timesFile, "utf8")) : null;
const times = tl ? { recordedAt: tl.capturedAt, scenes: tl.scenes } : null;
const tc = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const timeOf = (n) => times?.scenes.find((s) => String(s.number) === String(n));

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const inline = (s) =>
  esc(s)
    .replace(/~(.+?)~/g, "$1")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<b><i>$1</i></b>")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, "<i>$1</i>")
    .replace(/_(.+?)_/g, "<u>$1</u>")
    .replace(/\n/g, "<br>");

let steps = [];
/** A [[note]] as a reader sees it: "ON SCREEN: ..." (null for notes that only tune the recording). */
function onScreen(note) {
  const [cmd, ...rest] = note.split(/\s+/);
  const argText = rest.join(" ");
  const parts = argText.split("|").map((x) => x.trim()).filter(Boolean);
  const q = (x) => `"${inline(x)}"`;
  switch (cmd.toLowerCase()) {
    case "stat":
      return `ON SCREEN: ${q(parts[0])} ${inline(parts[1] ?? "")}${parts[2] ? ` (Source: ${inline(parts[2])})` : ""}`;
    case "bubbles":
      return `ON SCREEN: Chat bubbles pop in all over the frame: ${parts.map(q).join(", ")}.`;
    case "secrets":
      return `ON SCREEN: ${parts.map(q).join(", ")}. Each one blurs behind a lock.`;
    case "logo":
      return "ON SCREEN: The Mutuals logo.";
    case "activities":
      return `ON SCREEN: Cards in a row: ${parts.map((x) => q(x.replace(/^\S+\s+/, "").replace(" / ", ", on "))).join(", ")}.`;
    case "post": {
      const marks = [...(parts[0] ?? "").matchAll(/~(.+?)~/g)].map((m) => q(m[1]));
      return `ON SCREEN: A Facebook post in ${inline(parts[1] ?? "a Group")}: ${q((parts[0] ?? "").replace(/~/g, ""))}${marks.length ? ` The private parts light up: ${marks.join(", ")}.` : ""}${parts[2] ? ` ${inline(parts[2])}.` : ""}`;
    }
    case "agents":
      return "ON SCREEN: One Muse reaches a crowd of people. Most fall away. A few light up green.";
    case "chapter":
      return `ON SCREEN: Chapter ${inline(parts[0] ?? "")}. ${inline(parts[1] ?? "")}${parts[2] ? `. ${inline(parts[2])}` : ""}`;
    case "funcard":
      return "ON SCREEN: A card of fun facts from the profile: interests, one by one. The switch \"Let Muse use my profile, interests and posts\" turns on.";
    case "reach":
      return `ON SCREEN: Rings around one person, one for each place Muse looks: ${parts.map(q).join(", ")}. People appear on them.`;
    case "models":
      return "ON SCREEN: Three cards. Muse Spark, Muse Wonder, Muse Ember.";
    case "film":
      return `ON SCREEN: The filmed skit (${inline(parts[0] ?? "")}), with captions${parts[1] ? ` from ${inline(parts[1])}` : ""}.`;
    case "clip":
      return `ON SCREEN: Full frame, a video slot: ${inline(parts[1] ?? parts[0] ?? "")} (scripts/video/assets/clips/${inline(parts[0] ?? "")}.mov). The Muse chat sits over it.`;
    case "chat": {
      const m = argText.match(/^(\w+)\s*:\s*([\s\S]*)$/);
      const who = { me: "Jamie", muse: "Muse", ember: "Muse Ember", spark: "Muse Spark", video: "Jamie sends the video" }[m?.[1]?.toLowerCase()] ?? "Muse";
      return m?.[1]?.toLowerCase() === "video" ? `IN THE CHAT: ${who}.` : `IN THE CHAT, ${who.toUpperCase()}: ${q(m ? m[2] : argText)}`;
    }
    case "item":
      return `IN THE CHAT: Spark's card, ${q(parts[0] ?? "")}${parts[1] ? ` (${inline(parts[1])})` : ""}.`;
    case "flurry":
      return `ON SCREEN: Messages pile up faster and faster, a counter running: ${parts.slice(0, 4).map(q).join(", ")} and ${parts.length - 4} more. Then they all fade.`;
    case "clear":
      return "ON SCREEN: Everything fades. A beat of nothing.";
    case "convos":
      return "ON SCREEN: The wall of Muse conversations (like the app's /conversations). Every box at a different point: some typing, some talking, some settled as Fits or Not a fit. Each box's footer says what's never shown. The wall scrolls.";
    case "crowd":
      return `ON SCREEN: Dark. A sea of gray, faceless profiles, tagged "No profile picture", "0 mutual friends", "Joined 2 days ago". ${q(parts[0] ?? "")}`;
    case "narrow":
      return `ON SCREEN: Jamie's Muse appears in the middle and reaches dozens of them. Most fade away. Five stay, turn into real faces, and get a green check.`;
    case "network":
      return "ON SCREEN: The Muse network, live. Jamie's Muse in the middle, everyone it is talking to around it, each one turning into Fits or Not a fit.";
    case "phone":
      return /away/i.test(argText) ? "ON SCREEN: The phone slides away." : null;
    case "steps":
      steps = parts;
      return null;
    case "step": {
      const k = Number(argText);
      return steps[k - 1] ? `ON SCREEN: How it works, step ${k} of ${steps.length}: ${inline(steps[k - 1])}.` : null;
    }
    default:
      return null; // voice, rate, hold, zoom, phone, captions, music
  }
}

let n = 0;
const body = [];
for (const e of doc.elements) {
  switch (e.type) {
    case "scene_heading": {
      n++;
      const num = e.number ?? String(n);
      const t = timeOf(num);
      body.push(
        `<div class="scene"><span class="num l">${esc(num)}</span>${inline(e.text)}<span class="num r">${esc(num)}${t ? `<span class="tc">${tc(t.start)}</span>` : ""}</span></div>`,
      );
      break;
    }
    case "action":
      body.push(`<div class="action">${inline(e.text)}</div>`);
      break;
    case "character":
      body.push(`<div class="character">${esc(e.name)}${e.extension ? ` (${esc(e.extension)})` : ""}</div>`);
      break;
    case "parenthetical":
      body.push(`<div class="paren">${inline(e.text)}</div>`);
      break;
    case "dialogue":
      body.push(`<div class="dialogue">${inline(e.text)}</div>`);
      break;
    case "transition":
      body.push(`<div class="transition">${esc(e.text)}</div>`);
      break;
    case "centered":
      body.push(`<div class="centered">${inline(e.text)}</div>`);
      break;
    case "section":
      body.push(`<div class="section">${esc(e.text)}</div>`);
      break;
    case "page_break":
      body.push(`<div class="break"></div>`);
      break;
    case "note": {
      // Notes drive the video; in the PDF they read as what's on screen.
      const shown = onScreen(e.text);
      if (shown) body.push(`<div class="action onscreen">${shown}</div>`);
      if (SHOW_NOTES) body.push(`<div class="note">[[${esc(e.text)}]]</div>`);
      break;
    }
    default:
      break;
  }
}

const t = doc.title;
const titlePage = `
<section class="titlepage">
  <div class="tp-main">
    <div class="tp-title">${esc(t.title ?? "Untitled")}</div>
    ${t.credit ? `<div class="tp-line">${esc(t.credit)}</div>` : ""}
    ${t.author ? `<div class="tp-line">by</div><div class="tp-line">${esc(t.author)}</div>` : ""}
    ${t.source ? `<div class="tp-line tp-source">${esc(t.source)}</div>` : ""}
  </div>
  <div class="tp-foot">
    <div>${esc(t["draft date"] ?? "")}</div>
    ${times ? `<div>Recorded ${esc(new Date(times.recordedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }))}, ${tc(times.scenes.at(-1)?.end ?? 0)} running time</div>` : ""}
    <div>Source: ${esc(path.relative(ROOT, SCRIPT))}</div>
  </div>
</section>`;

const head = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
  @page { size: 8.5in 11in; margin: 1in 1in 1in 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #fff; font-family: "Courier Prime", "Courier New", Courier, monospace; font-size: 12pt; line-height: 12pt; color: #000; }
  .page { padding-left: 1.5in; width: 7.5in; }
  .scene, .action, .character, .dialogue, .paren, .transition, .centered, .section, .note { margin: 0; }
  .scene { position: relative; font-weight: 700; margin-top: 24pt; margin-bottom: 12pt; text-transform: uppercase; break-after: avoid; }
  .num { position: absolute; top: 0; font-weight: 700; }
  .num.l { left: -0.75in; }
  .num.r { left: 6.15in; text-align: left; }
  .tc { display: block; font-weight: 400; font-size: 9pt; color: #777; margin-top: 2pt; }
  .action { margin-bottom: 12pt; width: 6in; }
  .character { margin-left: 2.2in; margin-top: 12pt; text-transform: uppercase; break-after: avoid; }
  .paren { margin-left: 1.6in; width: 2in; break-after: avoid; }
  .dialogue { margin-left: 1in; width: 3.5in; margin-bottom: 12pt; }
  .character + .dialogue, .paren + .dialogue { margin-top: 0; }
  .transition { margin-left: 4.5in; margin-top: 12pt; margin-bottom: 12pt; text-transform: uppercase; }
  .centered { text-align: center; width: 6in; margin: 12pt 0; }
  .section { width: 6in; text-align: center; margin-top: 30pt; margin-bottom: 6pt; font-size: 10pt; letter-spacing: .2em; color: #666; text-transform: uppercase; break-after: avoid; }
  .note { width: 6in; margin-bottom: 8pt; font-size: 9pt; color: #8a8a8a; }
  .onscreen { color: #000; }
  .break { break-after: page; }
  .titlepage { height: 9in; display: flex; flex-direction: column; justify-content: space-between; break-after: page; padding-left: 1.5in; width: 7.5in; }
  .tp-main { margin-top: 2.6in; text-align: center; width: 6in; }
  .tp-title { font-weight: 700; text-transform: uppercase; text-decoration: underline; margin-bottom: 24pt; }
  .tp-line { margin-bottom: 12pt; }
  .tp-source { margin-top: 24pt; }
  .tp-foot { font-size: 10pt; line-height: 14pt; }
</style></head><body>`;
const html = `${head}
${titlePage}
<main class="page">${body.join("\n")}</main>
</body></html>`;

// --html <file>: also save the page as HTML (handy for checking the text without a PDF viewer)
if (arg("html", null)) fs.writeFileSync(path.resolve(String(arg("html", null))), html);

// The title page has no page number; the script's pages are numbered from 1. Render both and join them.
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
const pdfOf = async (inner, numbered) => {
  await page.setContent(`${head}${inner}</body></html>`, { waitUntil: "networkidle0", timeout: 60_000 }).catch(() => {});
  await page.evaluateHandle("document.fonts.ready");
  return page.pdf({
    format: "letter",
    displayHeaderFooter: numbered,
    headerTemplate: numbered ? `<div style="width:100%;font-family:'Courier Prime','Courier New',monospace;font-size:12pt;text-align:right;padding-right:1in;"><span class="pageNumber"></span>.</div>` : "<div></div>",
    footerTemplate: "<div></div>",
    margin: { top: "1in", bottom: "1in", left: "0", right: "1in" },
    printBackground: true,
  });
};
const merged = await PDFDocument.create();
for (const bytes of [await pdfOf(titlePage, false), await pdfOf(`<main class="page">${body.join("\n")}</main>`, true)]) {
  const src = await PDFDocument.load(bytes);
  for (const p of await merged.copyPages(src, src.getPageIndices())) merged.addPage(p);
}
merged.setTitle(`${doc.title.title ?? "Screenplay"} (screenplay)`);
fs.writeFileSync(OUTFILE, await merged.save());
if (arg("png", false)) {
  await page.setContent(html, { waitUntil: "networkidle0", timeout: 60_000 }).catch(() => {});
  await page.setViewport({ width: 816, height: 1056 });
  await page.screenshot({ path: OUTFILE.replace(/\.pdf$/, ".png"), fullPage: true });
}
await browser.close();
console.log(`wrote ${path.relative(process.cwd(), OUTFILE)}${times ? " (with timecodes from the last recording)" : ""}`);
