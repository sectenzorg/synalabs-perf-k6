export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

export async function GET() {
    let db = false;
    let docker = false;
    let k6Native = false;

    try {
        await prisma.$queryRaw`SELECT 1`;
        db = true;
    } catch { }

    // Check for native k6 first
    try {
        await execAsync("k6 version", { timeout: 5000 });
        k6Native = true;
    } catch { }

    // Check for docker as fallback
    try {
        await execAsync("docker info", { timeout: 5000 });
        docker = true;
    } catch { }

    return NextResponse.json({
        db,
        docker,
        k6Native,
        runner: k6Native ? "native" : docker ? "docker" : "none",
        ts: new Date().toISOString(),
    });
}
