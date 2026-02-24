import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    // Admin user
    const adminHash = await bcrypt.hash("admin123", 12);
    const admin = await prisma.user.upsert({
        where: { email: "admin@synalabs.com" },
        update: {},
        create: {
            email: "admin@synalabs.com",
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
        where: { email: "tester@synalabs.com" },
        update: {},
        create: {
            email: "tester@synalabs.com",
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
        where: { email: "viewer@synalabs.com" },
        update: {},
        create: {
            email: "viewer@synalabs.com",
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
    console.log("  Admin:  admin@synalabs.com / admin123");
    console.log("  Tester: tester@synalabs.com / tester123");
    console.log("  Viewer: viewer@synalabs.com / viewer123");
    console.log("─────────────────────────────────────────");
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
