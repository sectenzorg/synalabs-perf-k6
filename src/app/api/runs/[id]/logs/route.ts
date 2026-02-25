export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware";
import { getRunLogs } from "@/lib/k6-runner";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const logs = getRunLogs(id);
    return NextResponse.json({ logs });
}
