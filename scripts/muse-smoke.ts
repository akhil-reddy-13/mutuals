// `npm run smoke`: one tiny call to each Muse model to verify key + base URL. Run this first.
import "./env";
import { museText } from "../src/lib/muse";

async function main() {
  if (process.env.MOCK_MUSE !== "true" && (!process.env.MUSE_API_KEY || !process.env.MUSE_BASE_URL)) {
    console.log("❌ MUSE_API_KEY / MUSE_BASE_URL missing. Run: cp .env.example .env.local, then fill them in (dev.meta.ai quickstart).");
    process.exit(1);
  }
  console.log(`base URL: ${process.env.MUSE_BASE_URL}  mock: ${process.env.MOCK_MUSE === "true"}`);
  let failed = 0;
  for (const model of ["ember", "spark", "wonder"] as const) {
    try {
      const t0 = Date.now();
      const out = await museText({ model, system: "Reply with exactly: ok", user: "ping", fresh: true, mock: "ok (mock)" });
      console.log(`✅ ${model}: ${JSON.stringify(out)} (${Date.now() - t0}ms)`);
    } catch (e) {
      failed++;
      console.log(`❌ ${model}: ${e instanceof Error ? e.message : e}`);
    }
  }
  process.exit(failed ? 1 : 0);
}
main();
