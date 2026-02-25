export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/middleware";

export async function GET(req: NextRequest) {
    const { error, session } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") ?? "";
    const env = searchParams.get("env") ?? "";

    const targets = await prisma.target.findMany({
        where: {
            isActive: true,
            ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
            ...(env ? { environment: env as any } : {}),
        },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(targets);
}

export async function POST(req: NextRequest) {
    const { error, session } = await requireAuth();
    if (error) return error;

    if (session!.user.role === "VIEWER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, baseUrl, environment, defaultHeaders, authType, authValue, authKey, timeoutMs, tlsVerify } = body;

    if (!name || !baseUrl) {
        return NextResponse.json({ error: "name and baseUrl are required" }, { status: 400 });
    }

    try {
        new URL(baseUrl);
    } catch {
        return NextResponse.json({ error: "Invalid baseUrl format" }, { status: 400 });
    }

    const target = await prisma.target.create({
        data: {
            name,
            baseUrl,
            environment: environment ?? "DEV",
            defaultHeaders: defaultHeaders ?? {},
            authType: authType ?? "NONE",
            authValue: authValue ?? null,
            authKey: authKey ?? null,
            timeoutMs: timeoutMs ?? 30000,
            tlsVerify: tlsVerify ?? true,
        },
    });

    return NextResponse.json(target, { status: 201 });
}

