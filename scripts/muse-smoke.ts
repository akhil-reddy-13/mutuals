// `npm run smoke` — one tiny call to each Muse model to verify key + base URL. Run this first.
import { museText } from "../src/lib/muse";

async function main() {
for (const model of ["ember", "spark", "wonder"] as const) {
  try {
    const t0 = Date.now();
    const out = await museText({ model, system: "Reply with exactly: ok", user: "ping", fresh: true });
    console.log(`✅ ${model}: ${JSON.stringify(out)} (${Date.now() - t0}ms)`);
  } catch (e) {
    console.log(`❌ ${model}: ${e instanceof Error ? e.message : e}`);
  }
}
}
main();
