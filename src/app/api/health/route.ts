import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

export async function GET() {
    let db = false;
    let docker = false;

    try {
        await prisma.$queryRaw`SELECT 1`;
        db = true;
    } catch { }

    try {
        await execAsync("docker info", { timeout: 3000 });
        docker = true;
    } catch { }

    return NextResponse.json({ db, docker, ts: new Date().toISOString() });
}
