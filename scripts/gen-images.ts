// `npx tsx scripts/gen-images.ts` — generate demo photos with Muse Image (muse-image-1.0) and save avatars locally,
// so the demo never depends on outside image hosts (venue wifi). Skips files that already exist; delete one to redo.
// Output: public/img/*.jpg (≤900px JPEG), public/avatars/<userId>.jpg. Commit the results.
import "./env";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const STYLE = "Candid smartphone photo, natural light, realistic, slightly imperfect framing, no text, no logos, no watermark.";
export const IMAGES: Record<string, string> = {
  // Group posts (seed/posts.json imageUrl)
  post_sublet: "A friendly golden retriever lying on a hardwood floor in a small San Francisco apartment living room, looking at the camera.",
  post_guitar: "An acoustic guitar in a soft black gig bag leaning against a dorm room bed, a guitar picks tin on the desk beside it.",
  post_lamp: "A white IKEA-style floor lamp standing in a tidy dorm room corner, small scratch visible on the round metal base.",
  post_runs: "The San Francisco Embarcadero waterfront path at sunrise with the Bay Bridge in the background, a couple of joggers far away.",
  post_lena_tix: "A vintage art deco theater marquee lit up at night with a small crowd lining up outside, concert night, blurred lights.",
  post_rosa_brunch: "Overhead shot of a crowded brunch table in a sunny Mission District cafe: avocado toast, coffee cups, friends' hands reaching in.",
  post_maya_runs2: "A small group of young runners on a waterfront path near the Golden Gate Bridge on a foggy morning, seen from behind.",
  post_dev_sold: "A student desk with an empty black monitor arm clamped to the edge, a laptop and a coffee mug, the monitor gone.",
  // Marketplace "Today's picks"
  mp_lamp: "A white floor lamp with a round base standing next to a window in a dorm room, for sale listing photo.",
  mp_fridge: "A small black mini fridge on a dorm room floor with the door slightly open showing clean shelves, for sale listing photo.",
  mp_chair: "A black mesh-back office desk chair on wheels in an empty dorm room, for sale listing photo.",
  mp_bookshelf: "A white five-tier bookshelf against a wall, mostly empty with a few books, for sale listing photo.",
  mp_yoga: "A rolled purple yoga mat and two foam yoga blocks on a hardwood floor, for sale listing photo.",
  mp_monitor: "A 24 inch computer monitor on its stand on a desk, screen off, cable coiled next to it, for sale listing photo.",
  // Chicago Summer Interns 2027 (demo video storyline)
  post_chi_lakefront: "Chicago's Lakefront Trail at sunrise with the downtown skyline behind it, a small group of young runners in the distance, Lake Michigan calm on the right.",
  post_chi_sublet: "A bright furnished one-bedroom apartment living room in Chicago: exposed brick wall, a grey sofa, plants, a window with a colorful mural visible across the street.",
};

// Portraits for personas whose avatar file doesn't exist yet (fictional people). Saved as public/avatars/<id>.jpg.
const PORTRAIT_STYLE = "Head-and-shoulders portrait, candid smartphone photo, natural light, realistic, friendly expression, no text, no logos.";
export const PORTRAITS: Record<string, string> = {
  jamie: "A 20-year-old Latino college student with short curly dark hair and a warm smile, plain grey hoodie, sunny university campus behind him.",
  nora: "A 21-year-old woman with long red hair and freckles, smiling, navy running jacket, city park in the morning.",
  diego: "A 21-year-old Latino man with a short beard and round glasses holding a grey tabby cat, cozy apartment behind him.",
  sofia: "A 21-year-old woman with dark wavy shoulder-length hair, smiling, indoor climbing gym wall behind her.",
  dana: "A 22-year-old woman with short platinum blonde hair holding a film camera, red brick wall behind her.",
  ava: "A 23-year-old Black woman with braids in a high ponytail, running gear, lakefront path at sunrise behind her.",
};

async function gen(name: string, prompt: string, outDir: string, style = STYLE, maxPx = 900) {
  const out = path.join(outDir, `${name}.jpg`);
  if (fs.existsSync(out)) return `skip ${name}`;
  const res = await fetch(`${process.env.MUSE_BASE_URL}/images/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MUSE_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "muse-image-1.0", prompt: `${prompt} ${style}`, size: "1024x1024", n: 1 }),
  });
  const j = await res.json();
  if (!j.data?.[0]?.b64_json) throw new Error(`${name}: ${JSON.stringify(j).slice(0, 200)}`);
  const png = out.replace(/\.jpg$/, ".png");
  fs.writeFileSync(png, Buffer.from(j.data[0].b64_json, "base64"));
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "78", "-Z", String(maxPx), png, "--out", out], { stdio: "ignore" });
  fs.unlinkSync(png);
  return `made ${name}`;
}

async function avatars() {
  const dir = path.join(process.cwd(), "public", "avatars");
  fs.mkdirSync(dir, { recursive: true });
  const usersFile = path.join(process.cwd(), "seed", "users.json");
  const users = JSON.parse(fs.readFileSync(usersFile, "utf8")) as { id: string; avatarUrl: string }[];
  for (const u of users) {
    const local = `/avatars/${u.id}.jpg`;
    if (u.avatarUrl.startsWith("http")) {
      const r = await fetch(u.avatarUrl);
      fs.writeFileSync(path.join(dir, `${u.id}.jpg`), Buffer.from(await r.arrayBuffer()));
      u.avatarUrl = local;
    }
  }
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2) + "\n");
  for (const [id, prompt] of Object.entries(PORTRAITS)) console.log(await gen(id, prompt, dir, PORTRAIT_STYLE, 128));
  return `avatars: ${users.length}`;
}

async function main() {
  const dir = path.join(process.cwd(), "public", "img");
  fs.mkdirSync(dir, { recursive: true });
  console.log(await avatars());
  const entries = Object.entries(IMAGES);
  for (let i = 0; i < entries.length; i += 4) {
    const batch = await Promise.allSettled(entries.slice(i, i + 4).map(([n, p]) => gen(n, p, dir)));
    for (const b of batch) console.log(b.status === "fulfilled" ? b.value : `ERR ${b.reason}`);
  }
}
main();
