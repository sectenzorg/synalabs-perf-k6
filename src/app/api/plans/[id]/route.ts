import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/middleware";
import { generateK6Script } from "@/lib/k6-generator";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth();
    if (error) return error;
    const { id } = await params;
    const plan = await prisma.testPlan.findUnique({
        where: { id },
        include: { target: true },
    });
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(plan);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error, session } = await requireAuth();
    if (error) return error;
    if (session!.user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.testPlan.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const plan = await prisma.testPlan.update({
        where: { id },
        data: { ...body, planVersion: existing.planVersion + 1 },
        include: { target: true },
    });
    return NextResponse.json(plan);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error, session } = await requireAuth();
    if (error) return error;
    if (session!.user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await prisma.testPlan.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
}
