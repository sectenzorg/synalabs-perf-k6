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
        <div className="space-y-8 animate-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Platform Console</h1>
                    <p className="text-slate-500 font-medium">System configuration, infrastructure health, and environment telemetry.</p>
                </div>
                <button
                    onClick={checkHealth}
                    disabled={checking}
                    className="btn-premium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                    {checking ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : (
                        <span className="material-symbols-outlined">health_and_safety</span>
                    )}
                    Run Diagnostics
                </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Infrastructure Status */}
                <div className="card-premium p-6 space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 border-b border-slate-100 pb-4 uppercase tracking-widest">Infrastructure Heartbeat</h3>
                    <div className="grid gap-4">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-100">
                            <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100 shrink-0">
                                <span className="material-symbols-outlined text-2xl">database</span>
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-black text-slate-900">PostgreSQL Core</div>
                                <div className={`text-[10px] font-black uppercase tracking-tight ${dbOk === null ? "text-slate-400" : dbOk ? "text-green-500" : "text-red-500"}`}>
                                    {dbOk === null ? "Idle" : dbOk ? "Operational / Latency &lt; 5ms" : "Connectivity Fault"}
                                </div>
                            </div>
                            {dbOk !== null && (
                                <span className={`material-symbols-outlined ${dbOk ? "text-green-500" : "text-red-500"}`}>
                                    {dbOk ? "verified" : "error"}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-100">
                            <div className="size-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-500 border border-cyan-100 shrink-0">
                                <span className="material-symbols-outlined text-2xl">terminal</span>
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-black text-slate-900">k6 Runner Engine</div>
                                <div className={`text-[10px] font-black uppercase tracking-tight ${dockerOk === null ? "text-slate-400" : dockerOk ? "text-green-500" : "text-amber-500"}`}>
                                    {dockerOk === null ? "Idle" : dockerOk ? "Native / Docker Daemon Active" : "CLI Fallback Engaged"}
                                </div>
                            </div>
                            {dockerOk !== null && (
                                <span className={`material-symbols-outlined ${dockerOk ? "text-green-500" : "text-amber-500"}`}>
                                    {dockerOk ? "verified" : "warning"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Environment Info */}
                <div className="card-premium p-6">
                    <h3 className="text-[10px] font-black text-slate-400 border-b border-slate-100 pb-4 uppercase tracking-widest">Environment Constants</h3>
                    <div className="mt-6 space-y-4">
                        {[
                            { k: "k6 Distro", v: process.env.NEXT_PUBLIC_K6_IMAGE ?? "grafana/k6:latest", i: "layers" },
                            { k: "Artifact Target", v: "./artifacts", i: "folder_managed" },
                            { k: "Auth Persistence", v: "JWT / Session-Lock", i: "encrypted" },
                            { k: "Burst Threshold", v: "5 req/min @ API", i: "speed" },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-slate-400 text-lg">{item.i}</span>
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{item.k}</span>
                                </div>
                                <span className="text-xs font-mono font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                    {item.v}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* About Section */}
                <div className="lg:col-span-2 card-premium p-8 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 size-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-primary/10 transition-all duration-1000" />
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                        <div className="size-20 rounded-2xl bg-primary shadow-2xl shadow-primary/40 flex items-center justify-center text-white shrink-0">
                            <span className="material-symbols-outlined text-4xl">analytics</span>
                        </div>
                        <div className="space-y-6 max-w-2xl">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase">Synalabs Performance Suite</h2>
                                <p className="text-sm font-bold text-slate-500 leading-relaxed italic">
                                    The ultimate analytical dashboard for infrastructure stress assessment. Empowering engineers to benchmark, validate, and scale with confidence.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { l: "Platform", v: "Next.js 15" },
                                    { l: "Engine", v: "k6 Core" },
                                    { l: "Persistence", v: "Prisma v6" },
                                    { l: "Visuals", v: "Tailwind 4" },
                                ].map((stat, i) => (
                                    <div key={i} className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.l}</span>
                                        <span className="text-xs font-black text-slate-800 tracking-tight">{stat.v}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                                <span className="size-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">v2.4.0 Production Release · Stable Arch</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
