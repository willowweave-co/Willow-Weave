/** Minimal .env.local loader for the scripts (no dotenv dependency). */
import { readFileSync } from "node:fs";
import path from "node:path";

export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(path.join(process.cwd(), file), "utf8");
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        let value = m[2];
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(m[1] in process.env)) process.env[m[1]] = value;
      }
    } catch {
      /* file absent — fine */
    }
  }
}
