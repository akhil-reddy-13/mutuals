// Screenplay -> scenes -> steps. Shared by capture.mjs (drives the app) and render-screenplay.mjs.
import fs from "fs";
import { parseFountain, toScenes } from "./fountain.mjs";

const VERB = (v) =>
  /^open/i.test(v) ? "open" : /^tap/i.test(v) ? "tap" : /^scroll/i.test(v) ? "scroll" : /^wait/i.test(v) ? "wait" : /^upload/i.test(v) ? "upload" : "zoom";
// The quoted thing after one of these words, in the order they appear in the action line.
const CMD =
  /\b(opens?|taps?|scrolls? to|waits? for|uploads?|zooms? in on)\s+"([^"]+)"|"([^"]+)"\s+pops?\s+out|\bpops?\s+out\s+"([^"]+)"/gi;

export const transitionKind = (t = "") =>
  /BUBBLE|WIPE|IRIS/.test(t) ? "wipe" : /SMASH/.test(t) ? "smash" : /MATCH/.test(t) ? "match" : /DISSOLVE/.test(t) ? "dissolve" : /FADE/.test(t) ? "fade" : "cut";

function lineStep(scene, who, ext, paren, text) {
  const appScene = scene.kind === "phone" || scene.kind === "feature";
  if (appScene && (/typ/i.test(paren ?? "") || /TYP/.test(ext))) return { t: "type", who, text };
  const vo = /V\.?O|O\.?S|O\.?C/.test(ext) || who === "NARRATOR";
  return { t: vo ? "vo" : "line", who, paren, text };
}

/** One scene -> a flat list of steps, in script order. */
export function compile(scene) {
  const steps = [];
  const els = scene.elements;
  const appScene = scene.kind === "phone" || scene.kind === "feature";
  for (let i = 0; i < els.length; i++) {
    const e = els[i];
    if (e.type === "note") {
      const [cmd, ...rest] = e.text.split(/\s+/);
      const arg = rest.join(" ");
      steps.push({ t: "note", cmd: cmd.toLowerCase(), arg, parts: arg.split("|").map((s) => s.trim()).filter(Boolean) });
    } else if (e.type === "action") {
      for (const line of e.text.split("\n")) {
        const sup = line.match(/^\s*(SUPER|CAPTION)\s*:\s*(.+)$/i);
        if (sup) {
          steps.push({ t: sup[1].toLowerCase(), text: sup[2].trim() });
          continue;
        }
        if (appScene) {
          for (const m of line.matchAll(CMD)) {
            if (m[1]) steps.push({ t: "cmd", verb: VERB(m[1]), target: m[2] });
            else steps.push({ t: "cmd", verb: "pop", target: m[3] ?? m[4] });
          }
        } else if (scene.kind === "live") steps.push({ t: "describe", text: line });
      }
    } else if (e.type === "character") {
      const who = e.name.toUpperCase();
      const ext = (e.extension ?? "").toUpperCase();
      let paren = null;
      let text = "";
      while (els[i + 1] && (els[i + 1].type === "parenthetical" || els[i + 1].type === "dialogue")) {
        const d = els[++i];
        if (d.type === "parenthetical") {
          if (text) {
            steps.push(lineStep(scene, who, ext, paren, text));
            text = "";
          }
          paren = d.text.replace(/^\(|\)$/g, "");
        } else text = text ? `${text} ${d.text}` : d.text.replace(/\n/g, " ");
      }
      if (text) steps.push(lineStep(scene, who, ext, paren, text));
    }
  }
  return steps;
}

export function loadPlan(file) {
  const doc = parseFountain(fs.readFileSync(file, "utf8"));
  const scenes = toScenes(doc);
  const first = doc.elements.findIndex((e) => e.type === "scene_heading");
  const before = doc.elements.slice(0, first < 0 ? undefined : first);
  const globals = { voices: { NARRATOR: "Samantha" }, rates: {}, music: null };
  for (const n of before.filter((e) => e.type === "note").map((e) => e.text)) {
    let m;
    if ((m = n.match(/^voice\s+(.+?):\s*(.+)$/i))) globals.voices[m[1].trim().toUpperCase()] = m[2].trim();
    else if ((m = n.match(/^rate\s+(.+?):\s*(\d+)$/i))) globals.rates[m[1].trim().toUpperCase()] = Number(m[2]);
    else if ((m = n.match(/^music\s+(.+)$/i))) globals.music = m[1].trim();
  }
  globals.opening = before.find((e) => e.type === "transition")?.text ?? "";
  return { doc, globals, plan: scenes.map((s) => ({ ...s, steps: compile(s) })) };
}
