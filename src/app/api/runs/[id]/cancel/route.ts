export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware";
import { cancelK6Run } from "@/lib/k6-runner";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error, session } = await requireAuth();
    if (error) return error;
    if (session!.user.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const canceled = await cancelK6Run(id);
    if (!canceled) return NextResponse.json({ error: "Run not cancelable" }, { status: 400 });
    return NextResponse.json({ success: true });
}
