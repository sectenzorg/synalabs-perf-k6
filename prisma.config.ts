import { defineConfig } from "prisma/config";
import * as fs from "fs";
import * as path from "path";

// Manually load .env because Prisma 6/7 skips auto-loading when prisma.config.ts exists
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] || "",
  },
  // @ts-ignore - Prisma 6.13+ supports this, but types might be lagging
  seed: {
    command: "ts-node --transpile-only prisma/seed.ts",
  },
});
