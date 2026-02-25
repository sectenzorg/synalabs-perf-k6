import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

/**
 * Load .env manually for compatibility with Prisma 6/7 config
 */
function loadEnv() {
    if (process.env.DATABASE_URL) return;

    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return;

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

loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error("❌ DATABASE_URL is missing in environment");
    process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Seeding database...");

    // 1. Root Admin
    const adminHash = await bcrypt.hash("admin123", 12);
    const admin = await prisma.user.upsert({
        where: { email: "admin@synalabs.id" },
        update: {},
        create: {
            email: "admin@synalabs.id",
            username: "admin",
            passwordHash: adminHash,
            role: "ADMIN",
            isActive: true,
        },
    });
    console.log("✅ Admin:", admin.email);

    // 2. Sample Tester
    const testerHash = await bcrypt.hash("tester123", 12);
    const tester = await prisma.user.upsert({
        where: { email: "tester@synalabs.id" },
        update: {},
        create: {
            email: "tester@synalabs.id",
            username: "tester",
            passwordHash: testerHash,
            role: "TESTER",
            isActive: true,
        },
    });
    console.log("✅ Tester:", tester.email);

    // 3. Sample Target
    const target = await prisma.target.upsert({
        where: { id: "seed-target-01" },
        update: {},
        create: {
            id: "seed-target-01",
            name: "Production API",
            baseUrl: "https://httpbin.org",
            environment: "PROD",
            authType: "NONE",
            timeoutMs: 30000,
        },
    });
    console.log("✅ Target:", target.name);

    // 4. Sample Test Plan
    const plan = await prisma.testPlan.upsert({
        where: { id: "seed-plan-01" },
        update: {},
        create: {
            id: "seed-plan-01",
            name: "API Health Check",
            description: "Automated smoke test for core API",
            targetId: target.id,
            method: "GET",
            path: "/get",
            vus: 10,
            duration: 30,
            sloP95Ms: 500,
            sloErrorPct: 1,
        },
    });
    console.log("✅ Plan:", plan.name);

    console.log("\n🚀 Seeding finished successfully!");
    console.log("───────────────────────────────────");
    console.log("Admin: admin@synalabs.id / admin123");
    console.log("───────────────────────────────────");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
