"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [dbOk, setDbOk] = useState<boolean | null>(null);
    const [dockerOk, setDockerOk] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (session && session.user.role !== "ADMIN") router.push("/dashboard");
    }, [session, router]);

    async function checkHealth() {
        setChecking(true);
        try {
            const res = await fetch("/api/health");
            if (res.ok) {
                const d = await res.json();
                setDbOk(d.db);
                setDockerOk(d.docker);
            }
        } catch { setDbOk(false); setDockerOk(false); }
        setChecking(false);
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">System configuration and health checks</p>
                </div>
            </div>

            {/* Health Check */}
            <div className="card" style={{ marginBottom: "1.5rem" }}>
                <div className="card-header">
                    <h3 className="card-title">System Health</h3>
                    <button className="btn btn-secondary btn-sm" onClick={checkHealth} disabled={checking}>
                        {checking ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Checking…</> : "↻ Check Now"}
                    </button>
                </div>
                <div className="grid-2">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: 8 }}>
                        <span style={{ fontSize: "1.5rem" }}>🗄️</span>
                        <div>
                            <div style={{ fontWeight: 600 }}>PostgreSQL</div>
                            <div className="text-sm" style={{ color: dbOk === null ? "var(--text-muted)" : dbOk ? "var(--accent-green)" : "var(--accent-red)" }}>
                                {dbOk === null ? "Not checked" : dbOk ? "✅ Connected" : "❌ Unreachable"}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: 8 }}>
                        <span style={{ fontSize: "1.5rem" }}>🐳</span>
                        <div>
                            <div style={{ fontWeight: 600 }}>Docker / k6 Runner</div>
                            <div className="text-sm" style={{ color: dockerOk === null ? "var(--text-muted)" : dockerOk ? "var(--accent-green)" : "var(--accent-yellow)" }}>
                                {dockerOk === null ? "Not checked" : dockerOk ? "✅ Available" : "⚠️ Docker unavailable (k6 CLI fallback)"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Configuration Info */}
            <div className="card" style={{ marginBottom: "1.5rem" }}>
                <div className="card-header"><h3 className="card-title">Runtime Configuration</h3></div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {[
                        ["k6 Docker Image", process.env.NEXT_PUBLIC_K6_IMAGE ?? "grafana/k6:latest"],
                        ["Artifacts Directory", "./artifacts"],
                        ["Session Strategy", "JWT (cookie-based)"],
                        ["Rate Limit (Login)", "5 req/min"],
                    ].map(([k, v]) => (
                        <div key={k} className="flex items-center" style={{ justifyContent: "space-between", paddingBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>
                            <span className="text-secondary text-sm">{k}</span>
                            <span className="font-mono text-sm">{v}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* About */}
            <div className="card">
                <div className="card-header"><h3 className="card-title">About Synalabs Perf</h3></div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: "1.8" }}>
                    <p>Internal stress testing dashboard built with <strong>Next.js 15</strong> + <strong>k6</strong>.</p>
                    <p style={{ marginTop: "0.5rem" }}>Supports CRUD target management, test plan templates, k6 execution via Docker or native CLI, rule-based insights (no AI), and HTML report export.</p>
                    <div style={{ marginTop: "1rem", padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: 8 }}>
                        <div className="font-mono text-sm" style={{ color: "var(--accent-cyan)" }}>
                            Stack: Next.js · TypeScript · Prisma · PostgreSQL · Recharts · k6
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
