export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/middleware";

// GET /api/runs/compare?a=runId1&b=runId2
export async function GET(req: NextRequest) {
    const { error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const aId = searchParams.get("a");
    const bId = searchParams.get("b");

    if (!aId || !bId) {
        return NextResponse.json({ error: "Provide ?a=runId&b=runId" }, { status: 400 });
    }

    const [runA, runB] = await Promise.all([
        prisma.testRun.findUnique({
            where: { id: aId },
            include: {
                target: { select: { name: true } },
                plan: { select: { name: true } },
                metricsAgg: true,
            },
        }),
        prisma.testRun.findUnique({
            where: { id: bId },
            include: {
                target: { select: { name: true } },
                plan: { select: { name: true } },
                metricsAgg: true,
            },
        }),
    ]);

    if (!runA || !runB) {
        return NextResponse.json({ error: "One or both runs not found" }, { status: 404 });
    }

    const aM = runA.metricsAgg;
    const bM = runB.metricsAgg;

    const THRESHOLD_P95 = 20; // % regression threshold
    const THRESHOLD_ERR = 50; // %

    const deltaP95 = aM && bM ? ((bM.p95Ms - aM.p95Ms) / (aM.p95Ms || 1)) * 100 : null;
    const deltaErr = aM && bM ? ((bM.errorRate - aM.errorRate) / (aM.errorRate || 0.001)) * 100 : null;
    const deltaRps = aM && bM ? bM.avgRps - aM.avgRps : null;

    const regression =
        (deltaP95 !== null && deltaP95 > THRESHOLD_P95) ||
        (deltaErr !== null && deltaErr > THRESHOLD_ERR);

    return NextResponse.json({
        runA: {
            id: runA.id,
            label: runA.label,
            createdAt: runA.createdAt,
            target: runA.target.name,
            plan: runA.plan.name,
            metrics: aM,
        },
        runB: {
            id: runB.id,
            label: runB.label,
            createdAt: runB.createdAt,
            target: runB.target.name,
            plan: runB.plan.name,
            metrics: bM,
        },
        delta: {
            p95Ms: deltaP95,
            errorRate: deltaErr,
            avgRps: deltaRps,
            regression,
        },
    });
}

