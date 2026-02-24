import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/middleware";
import { startK6Run } from "@/lib/k6-runner";

export async function GET(req: NextRequest) {
    const { error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get("targetId") ?? "";
    const planId = searchParams.get("planId") ?? "";
    const status = searchParams.get("status") ?? "";
    const label = searchParams.get("label") ?? "";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    const runs = await prisma.testRun.findMany({
        where: {
            ...(targetId ? { targetId } : {}),
            ...(planId ? { planId } : {}),
            ...(status ? { status: status as any } : {}),
            ...(label ? { label: { contains: label, mode: "insensitive" } } : {}),
            ...(from || to
                ? {
                    createdAt: {
                        ...(from ? { gte: new Date(from) } : {}),
                        ...(to ? { lte: new Date(to) } : {}),
                    },
                }
                : {}),
        },
        include: {
            target: { select: { id: true, name: true } },
            plan: { select: { id: true, name: true } },
            triggeredBy: { select: { id: true, username: true } },
            metricsAgg: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
    });

    const total = await prisma.testRun.count({
        where: {
            ...(targetId ? { targetId } : {}),
            ...(planId ? { planId } : {}),
            ...(status ? { status: status as any } : {}),
        },
    });

    return NextResponse.json({ runs, total, page, limit });
}

export async function POST(req: NextRequest) {
    const { error, session } = await requireAuth();
    if (error) return error;
    if (session!.user.role === "VIEWER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { targetId, planId, label, vusOverride, durationOverride, envVarsOverride } = body;

    if (!targetId || !planId) {
        return NextResponse.json({ error: "targetId and planId required" }, { status: 400 });
    }

    const [target, plan] = await Promise.all([
        prisma.target.findUnique({ where: { id: targetId } }),
        prisma.testPlan.findUnique({ where: { id: planId } }),
    ]);

    if (!target || !plan) {
        return NextResponse.json({ error: "Target or Plan not found" }, { status: 404 });
    }

    const run = await prisma.testRun.create({
        data: {
            targetId,
            planId,
            triggeredById: session!.user.id,
            label: label ?? null,
            status: "QUEUED",
            vusOverride: vusOverride ?? null,
            durationOverride: durationOverride ?? null,
            envVarsOverride: envVarsOverride ?? null,
        },
    });

    // Fire and forget — runs async
    startK6Run(run.id, target, plan, vusOverride, durationOverride, envVarsOverride).catch(
        (err) => console.error("[runs] startK6Run error:", err)
    );

    return NextResponse.json(run, { status: 201 });
}
