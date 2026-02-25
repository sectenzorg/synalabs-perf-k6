export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/middleware";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth();
    if (error) return error;
    const { id } = await params;
    const target = await prisma.target.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(target);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error, session } = await requireAuth();
    if (error) return error;
    if (session!.user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await req.json();

    if (body.baseUrl) {
        try { new URL(body.baseUrl); } catch {
            return NextResponse.json({ error: "Invalid baseUrl format" }, { status: 400 });
        }
    }

    const target = await prisma.target.update({ where: { id }, data: body });
    return NextResponse.json(target);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error, session } = await requireAuth();
    if (error) return error;
    if (session!.user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await prisma.target.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
}
