// Load .env.local / .env the same way `next dev` does. Import FIRST in any script.
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
