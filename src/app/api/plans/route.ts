export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/middleware";

export async function GET(req: NextRequest) {
    const { error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get("targetId") ?? "";

    const plans = await prisma.testPlan.findMany({
        where: {
            isActive: true,
            ...(targetId ? { targetId } : {}),
        },
        include: { target: { select: { id: true, name: true, baseUrl: true } } },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
    const { error, session } = await requireAuth();
    if (error) return error;
    if (session!.user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const {
        name, description, targetId, method, path, headers, body: reqBody,
        expectedStatus, vus, duration, rampUpStages,
        sloP95Ms, sloErrorPct, sloMinRps, envVars,
    } = body;

    if (!name || !targetId) {
        return NextResponse.json({ error: "name and targetId are required" }, { status: 400 });
    }

    const target = await prisma.target.findUnique({ where: { id: targetId } });
    if (!target) return NextResponse.json({ error: "Target not found" }, { status: 404 });

    const plan = await prisma.testPlan.create({
        data: {
            name, description, targetId,
            method: method ?? "GET",
            path: path ?? "/",
            headers: headers ?? {},
            body: reqBody ?? null,
            expectedStatus: expectedStatus ?? 200,
            vus: vus ?? 10,
            duration: duration ?? 30,
            rampUpStages: rampUpStages ?? null,
            sloP95Ms: sloP95Ms ?? null,
            sloErrorPct: sloErrorPct ?? null,
            sloMinRps: sloMinRps ?? null,
            envVars: envVars ?? {},
        },
        include: { target: true },
    });

    return NextResponse.json(plan, { status: 201 });
}

