export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/middleware";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const run = await prisma.testRun.findUnique({
        where: { id },
        include: {
            target: true,
            plan: true,
            triggeredBy: { select: { id: true, username: true, role: true } },
            metricsAgg: true,
            metricsSeries: { orderBy: { bucketTs: "asc" } },
            insights: { orderBy: { createdAt: "asc" } },
            artifacts: true,
        },
    });

    if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(run);
}
