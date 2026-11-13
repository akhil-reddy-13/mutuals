// A small Fountain (https://fountain.io) parser, enough for our demo-video screenplay.
// It turns the .fountain text into a list of typed elements, then groups them into scenes the recorder can play.
//
// Supported: title page, scene headings (INT./EXT./EST./I/E, or forced with "."), scene numbers (#12#), action,
// character (incl. extensions like (V.O.) and forced "@"), dialogue, parentheticals, transitions ("CUT TO:", forced
// ">"), centered text ("> text <"), notes ([[...]]), boneyard (/* ... */), sections (#), synopses (=), page breaks
// (===). Emphasis markers (*, **, _) are kept in the text and handled by the renderer.

const SCENE_RE = /^(INT|EXT|EST|INT\.?\/EXT|I\/E)[.\s]/i;
const TRANSITION_RE = /^[A-Z0-9 .'-]+TO:$|^(FADE IN:|FADE OUT\.|FADE TO BLACK\.|CUT TO BLACK\.)$/;

export function parseFountain(src) {
  // Boneyard (comments) disappear entirely.
  const text = src.replace(/\r\n?/g, "\n").replace(/\/\*[\s\S]*?\*\//g, "");
  const lines = text.split("\n");
  let i = 0;

  // Title page: "Key: value" lines at the very top, up to the first blank line.
  const title = {};
  if (/^[A-Za-z][A-Za-z ]*:/.test(lines[0] ?? "")) {
    let key = null;
    for (; i < lines.length && lines[i].trim() !== ""; i++) {
      const m = lines[i].match(/^([A-Za-z][A-Za-z ]*):\s*(.*)$/);
      if (m && !/^\s/.test(lines[i])) {
        key = m[1].trim().toLowerCase();
        title[key] = m[2].trim();
      } else if (key) {
        title[key] = [title[key], lines[i].trim()].filter(Boolean).join("\n");
      }
    }
  }

  const els = [];
  const blank = (k) => k < 0 || k >= lines.length || lines[k].trim() === "";
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (line === "") {
      i++;
      continue;
    }
    const lineNo = i + 1;
    // Page break
    if (/^={3,}$/.test(line)) {
      els.push({ type: "page_break", lineNo });
      i++;
      continue;
    }
    // Section / synopsis
    const sec = line.match(/^(#+)\s*(.*)$/);
    if (sec) {
      els.push({ type: "section", depth: sec[1].length, text: sec[2], lineNo });
      i++;
      continue;
    }
    if (/^=(?!=)/.test(line)) {
      els.push({ type: "synopsis", text: line.replace(/^=\s*/, ""), lineNo });
      i++;
      continue;
    }
    // A note on its own line (possibly spanning lines)
    if (line.startsWith("[[")) {
      let note = line;
      while (!note.includes("]]") && i + 1 < lines.length) note += "\n" + lines[++i].trim();
      for (const m of note.matchAll(/\[\[([\s\S]*?)\]\]/g)) els.push({ type: "note", text: m[1].trim(), lineNo });
      i++;
      continue;
    }
    // Centered text
    if (/^>.*<$/.test(line)) {
      els.push({ type: "centered", text: line.slice(1, -1).trim(), lineNo });
      i++;
      continue;
    }
    // Scene heading
    const forcedScene = line.startsWith(".") && !line.startsWith("..");
    if ((SCENE_RE.test(line) || forcedScene) && blank(i - 1)) {
      let heading = forcedScene ? line.slice(1).trim() : line;
      let number = null;
      const num = heading.match(/\s*#([^#]+)#\s*$/);
      if (num) {
        number = num[1].trim();
        heading = heading.slice(0, num.index).trim();
      }
      els.push({ type: "scene_heading", text: heading.toUpperCase(), number, lineNo });
      i++;
      continue;
    }
    // Transition
    if ((line.startsWith(">") && !line.endsWith("<")) || (TRANSITION_RE.test(line) && blank(i - 1) && blank(i + 1))) {
      els.push({ type: "transition", text: line.replace(/^>\s*/, "").toUpperCase(), lineNo });
      i++;
      continue;
    }
    // Character + dialogue block: an all-caps line (or forced "@") followed directly by a non-blank line.
    const forcedChar = line.startsWith("@");
    const isCaps = line === line.toUpperCase() && /[A-Z]/.test(line) && !/[.:]$/.test(line.replace(/\(.*\)$/, "").trim());
    if ((forcedChar || isCaps) && blank(i - 1) && !blank(i + 1)) {
      const name = (forcedChar ? line.slice(1) : line).trim();
      const ext = name.match(/\(([^)]*)\)\s*$/);
      els.push({ type: "character", name: name.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s*\^$/, "").trim(), extension: ext ? ext[1] : null, lineNo });
      i++;
      while (i < lines.length && lines[i].trim() !== "") {
        const l = lines[i].trim();
        if (/^\(.*\)$/.test(l)) els.push({ type: "parenthetical", text: l, lineNo: i + 1 });
        else {
          const last = els[els.length - 1];
          if (last.type === "dialogue") last.text += "\n" + l;
          else els.push({ type: "dialogue", text: l, lineNo: i + 1 });
        }
        i++;
      }
      continue;
    }
    // Action: everything else, up to the next blank line. Inline notes are pulled out as their own elements.
    const block = [];
    while (i < lines.length && lines[i].trim() !== "") block.push(lines[i++].replace(/^!/, ""));
    const joined = block.join("\n");
    const inlineNotes = [...joined.matchAll(/\[\[([\s\S]*?)\]\]/g)].map((m) => m[1].trim());
    const actionText = joined.replace(/\s*\[\[[\s\S]*?\]\]/g, "").trim();
    if (actionText) els.push({ type: "action", text: actionText, lineNo });
    for (const n of inlineNotes) els.push({ type: "note", text: n, lineNo });
  }
  return { title, elements: els };
}

/**
 * Scene kinds, from the location in the scene heading:
 *   "INT. PHONE SCREEN - CHICAGO SUMMER INTERNS 2027"  -> phone   (the real app, on a floating phone)
 *   "INT. FEATURE - THE SHORTLIST"                     -> feature  (the app still runs; pieces of it shown big, no phone)
 *   "INT. MOTION GRAPHICS - THE NUMBERS"               -> graphics (type, numbers, bubbles; no phone)
 *   "INT. FILM - THE SKIT"                             -> film     (filmed footage: [[film file | captions.srt]])
 *   "INT. VIDEO OVERLAY - SELLING"                     -> overlay  (a [[clip]] slot behind a Muse chat)
 *   "INT. OFF CAMERA - JAMIE'S ROOMMATE ASK"           -> setup    (app steps run, nothing is filmed)
 *   anything else ("INT. JAMIE'S DORM - NIGHT")         -> live    (live action; a storyboard frame until filmed)
 */
export function sceneKind(heading) {
  const loc = heading.replace(/^(INT\.?\/EXT|INT|EXT|EST|I\/E)[.\s]+/i, "");
  if (/^(FILM|FOOTAGE)\b/.test(loc)) return "film";
  if (/^(VIDEO OVERLAY|OVERLAY)\b/.test(loc)) return "overlay";
  if (/^(OFF CAMERA|SETUP)\b/.test(loc)) return "setup";
  if (/^(PHONE|SCREEN|APP)\b/.test(loc)) return "phone";
  if (/^(FEATURE|CLOSE ON|SHOWCASE)\b/.test(loc)) return "feature";
  if (/^(MOTION GRAPHICS|GRAPHICS|TITLE|BLACK)\b/.test(loc)) return "graphics";
  return "live";
}

/** Group elements into scenes (with their act/section and the transition that ends them). */
export function toScenes(doc) {
  const scenes = [];
  let act = null;
  let cur = null;
  let n = 0;
  for (const el of doc.elements) {
    if (el.type === "section") {
      act = el.text;
      continue;
    }
    if (el.type === "scene_heading") {
      n++;
      cur = { number: el.number ?? String(n), heading: el.text, kind: sceneKind(el.text), act, elements: [], transition: null, lineNo: el.lineNo };
      scenes.push(cur);
      continue;
    }
    if (!cur) continue; // anything before the first scene (e.g. FADE IN:) is ignored by the player
    if (el.type === "transition") {
      cur.transition = el.text;
      continue;
    }
    cur.elements.push(el);
  }
  return scenes;
}
