import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireAuth() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
    }
    return { error: null, session };
}

export async function requireRole(roles: string[]) {
    const { error, session } = await requireAuth();
    if (error || !session) return { error: error!, session: null };
    if (!roles.includes(session.user.role)) {
        return {
            error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
            session: null,
        };
    }
    return { error: null, session };
}
