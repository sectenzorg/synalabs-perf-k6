import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/middleware";
import { generateK6Script } from "@/lib/k6-generator";

// POST /api/plans/:id/preview — preview k6 script
export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const plan = await prisma.testPlan.findUnique({
        where: { id },
        include: { target: true },
    });
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const script = generateK6Script(plan.target, plan);
    return NextResponse.json({ script });
}
