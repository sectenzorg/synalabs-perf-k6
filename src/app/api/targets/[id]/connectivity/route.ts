export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

// GET /api/targets/:id/connectivity
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // We need to import prisma here dynamically to avoid edge issues
    const { prisma } = await import("@/lib/prisma");
    const { requireAuth } = await import("@/lib/middleware");
    const { error } = await requireAuth();
    if (error) return error;

    const target = await prisma.target.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const startTime = Date.now();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), Math.min(target.timeoutMs, 10000));

        const headers: Record<string, string> = {
            ...(target.defaultHeaders as Record<string, string>),
        };

        if (target.authType === "BEARER" && target.authValue) {
            headers["Authorization"] = `Bearer ${target.authValue}`;
        } else if (target.authType === "BASIC" && target.authValue) {
            headers["Authorization"] = `Basic ${Buffer.from(target.authValue).toString("base64")}`;
        } else if (target.authType === "API_KEY" && target.authKey && target.authValue) {
            headers[target.authKey] = target.authValue;
        }

        const res = await fetch(target.baseUrl, {
            method: "GET",
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeout);
        const latency = Date.now() - startTime;

        return NextResponse.json({
            reachable: true,
            status: res.status,
            latencyMs: latency,
            message: `HTTP ${res.status} in ${latency}ms`,
        });
    } catch (err: any) {
        const latency = Date.now() - startTime;
        return NextResponse.json({
            reachable: false,
            status: null,
            latencyMs: latency,
            message: err.name === "AbortError" ? "Connection timed out" : err.message,
        });
    }
}
