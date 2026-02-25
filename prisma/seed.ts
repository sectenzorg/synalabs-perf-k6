import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

console.log("DEBUG: Starting seed.ts...");

// Manually load .env if DATABASE_URL is missing
if (!process.env.DATABASE_URL) {
    console.log("DEBUG: DATABASE_URL not found in env, trying to load .env file...");
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
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error("❌ ERROR: DATABASE_URL is not defined. Please check your .env file.");
    process.exit(1);
}

console.log("DEBUG: Connection string found, initializing adapter...");
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Seeding database...");

    // Admin user
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
    console.log("✅ Admin user:", admin.email);

    // Tester user
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
    console.log("✅ Tester user:", tester.email);

    // Viewer user
    const viewerHash = await bcrypt.hash("viewer123", 12);
    const viewer = await prisma.user.upsert({
        where: { email: "viewer@synalabs.id" },
        update: {},
        create: {
            email: "viewer@synalabs.id",
            username: "viewer",
            passwordHash: viewerHash,
            role: "VIEWER",
            isActive: true,
        },
    });
    console.log("✅ Viewer user:", viewer.email);

    // Sample target
    const target = await prisma.target.upsert({
        where: { id: "seed-target-001" },
        update: {},
        create: {
            id: "seed-target-001",
            name: "Example API",
            baseUrl: "https://httpbin.org",
            environment: "DEV",
            defaultHeaders: {},
            authType: "NONE",
            timeoutMs: 10000,
            tlsVerify: true,
        },
    });
    console.log("✅ Sample target:", target.name);

    // Sample test plan
    const plan = await prisma.testPlan.upsert({
        where: { id: "seed-plan-001" },
        update: {},
        create: {
            id: "seed-plan-001",
            name: "Basic GET Health Check",
            description: "Simple smoke test for /get endpoint",
            targetId: target.id,
            method: "GET",
            path: "/get",
            headers: {},
            expectedStatus: 200,
            vus: 5,
            duration: 15,
            sloP95Ms: 2000,
            sloErrorPct: 5,
            envVars: {},
        },
    });
    console.log("✅ Sample plan:", plan.name);

    console.log("\n🚀 Seed complete!");
    console.log("─────────────────────────────────────────");
    console.log("Login credentials:");
    console.log("  Admin:  admin@synalabs.id / admin123");
    console.log("  Tester: tester@synalabs.id / tester123");
    console.log("  Viewer: viewer@synalabs.id / viewer123");
    console.log("─────────────────────────────────────────");
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
