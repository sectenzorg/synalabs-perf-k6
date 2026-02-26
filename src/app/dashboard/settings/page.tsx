"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [dbOk, setDbOk] = useState<boolean | null>(null);
    const [dockerOk, setDockerOk] = useState<boolean | null>(null);
    const [k6Native, setK6Native] = useState<boolean | null>(null);
    const [runner, setRunner] = useState<string | null>(null);
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
                setK6Native(d.k6Native ?? false);
                setRunner(d.runner ?? "none");
            }
        } catch { setDbOk(false); setDockerOk(false); setK6Native(false); setRunner("none"); }
        setChecking(false);
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-1">Platform Console</h1>
                    <p className="text-slate-500 text-sm font-medium">System configuration, infrastructure health, and environment telemetry.</p>
                </div>
                <button
                    onClick={checkHealth}
                    disabled={checking}
                    className="btn-premium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                >
                    {checking ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : (
                        <span className="material-symbols-outlined text-lg">health_and_safety</span>
                    )}
                    Run Diagnostics
                </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Infrastructure Status */}
                <div className="card-premium p-5 sm:p-6 space-y-5">
                    <h3 className="text-[10px] font-bold text-slate-400 border-b border-slate-100 pb-3 uppercase tracking-widest">Infrastructure Heartbeat</h3>
                    <div className="grid gap-3">
                        <div className="flex items-center gap-3 sm:gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                            <div className="size-10 sm:size-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100 shrink-0">
                                <span className="material-symbols-outlined text-xl sm:text-2xl">database</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-900">PostgreSQL Core</div>
                                <div className={`text-[10px] font-bold uppercase tracking-tight ${dbOk === null ? "text-slate-400" : dbOk ? "text-green-500" : "text-red-500"}`}>
                                    {dbOk === null ? "Idle" : dbOk ? "Operational / Latency < 5ms" : "Connectivity Fault"}
                                </div>
                            </div>
                            {dbOk !== null && (
                                <span className={`material-symbols-outlined ${dbOk ? "text-green-500" : "text-red-500"}`}>
                                    {dbOk ? "verified" : "error"}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4 p-3.5 bg-slate-50 rounded-xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                            <div className="size-10 sm:size-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-500 border border-cyan-100 shrink-0">
                                <span className="material-symbols-outlined text-xl sm:text-2xl">terminal</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-900">k6 Runner Engine</div>
                                <div className={`text-[10px] font-bold uppercase tracking-tight ${runner === null ? "text-slate-400" : runner === "native" ? "text-green-500" : runner === "docker" ? "text-blue-500" : "text-red-500"}`}>
                                    {runner === null ? "Idle" : runner === "native" ? "Native k6 Binary / Ready" : runner === "docker" ? "Docker Mode / Active" : "Not Available / Install k6"}
                                </div>
                            </div>
                            {runner !== null && (
                                <span className={`material-symbols-outlined ${runner !== "none" ? "text-green-500" : "text-red-500"}`}>
                                    {runner !== "none" ? "verified" : "error"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Environment Info */}
                <div className="card-premium p-5 sm:p-6">
                    <h3 className="text-[10px] font-bold text-slate-400 border-b border-slate-100 pb-3 uppercase tracking-widest">Environment Constants</h3>
                    <div className="mt-5 space-y-3">
                        {[
                            { k: "k6 Distro", v: process.env.NEXT_PUBLIC_K6_IMAGE ?? "grafana/k6:latest", i: "layers" },
                            { k: "Artifact Target", v: "./artifacts", i: "folder_managed" },
                            { k: "Auth Persistence", v: "JWT / Session-Lock", i: "encrypted" },
                            { k: "Burst Threshold", v: "5 req/min @ API", i: "speed" },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-colors gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="material-symbols-outlined text-slate-400 text-lg shrink-0">{item.i}</span>
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">{item.k}</span>
                                </div>
                                <span className="text-[11px] font-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 shrink-0 max-w-[50%] truncate">
                                    {item.v}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* About Section */}
                <div className="lg:col-span-2 card-premium p-6 sm:p-8 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 size-48 sm:size-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all duration-1000" />
                    <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start">
                        <div className="size-14 sm:size-16 rounded-2xl bg-primary shadow-xl shadow-primary/30 flex items-center justify-center text-white shrink-0">
                            <span className="material-symbols-outlined text-3xl">analytics</span>
                        </div>
                        <div className="space-y-5 max-w-2xl">
                            <div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5">Synalabs Performance Suite</h2>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    The ultimate analytical dashboard for infrastructure stress assessment. Empowering engineers to benchmark, validate, and scale with confidence.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { l: "Platform", v: "Next.js 15" },
                                    { l: "Engine", v: "k6 Core" },
                                    { l: "Persistence", v: "Prisma v6" },
                                    { l: "Visuals", v: "Tailwind 4" },
                                ].map((stat, i) => (
                                    <div key={i} className="flex flex-col">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{stat.l}</span>
                                        <span className="text-xs font-bold text-slate-800 tracking-tight">{stat.v}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                                <span className="size-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">v2.4.0 Production Release · Stable</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
