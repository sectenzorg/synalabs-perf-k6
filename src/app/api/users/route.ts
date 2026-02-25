export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/middleware";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
    const { error } = await requireRole(["ADMIN"]);
    if (error) return error;

    const users = await prisma.user.findMany({
        select: { id: true, email: true, username: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
    const { error } = await requireRole(["ADMIN"]);
    if (error) return error;

    const body = await req.json();
    const { email, username, password, role } = body;

    if (!email || !username || !password) {
        return NextResponse.json({ error: "email, username, password required" }, { status: 400 });
    }

    const exists = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
    });
    if (exists) return NextResponse.json({ error: "Email or username already exists" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
        data: { email, username, passwordHash, role: role ?? "VIEWER" },
        select: { id: true, email: true, username: true, role: true, createdAt: true },
    });

    return NextResponse.json(user, { status: 201 });
}

