"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface KPI {
    label: string; value: string | number; change?: string;
    icon: string; color: string; bg: string;
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const [stats, setStats] = useState<any>(null);
    const [recentRuns, setRecentRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [statsRes, runsRes] = await Promise.all([
                    fetch("/api/stats"),
                    fetch("/api/runs?limit=5"),
                ]);
                if (statsRes.ok) setStats(await statsRes.json());
                if (runsRes.ok) {
                    const data = await runsRes.json();
                    setRecentRuns(Array.isArray(data.runs) ? data.runs : []);
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        }
        load();
    }, []);

    const kpis: KPI[] = [
        { label: "Throughput_Cycles", value: stats?.totalRuns ?? "—", icon: "monitoring", color: "text-sky-500", bg: "bg-sky-50" },
        { label: "Integrity_Rating", value: stats?.successRate ? `${stats.successRate}%` : "—", icon: "verified", color: "text-sky-500", bg: "bg-sky-50" },
        { label: "Node_Inventory", value: stats?.targetCount ?? "—", icon: "hub", color: "text-sky-500", bg: "bg-sky-50" },
        { label: "Latency_Horizon", value: stats?.avgP95 ? `${stats.avgP95.toFixed(0)}ms` : "—", icon: "bolt", color: "text-sky-500", bg: "bg-sky-50" },
    ];

    return (
        <div className="space-y-10 sm:space-y-16 animate-in pb-12">
            {/* Welcome Banner: High Tech Entry */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-10 border-b border-slate-100 relative group">
                <div className="space-y-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="size-2 rounded-full bg-primary animate-ping" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic">System_Operational_v2.4</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 leading-none font-display italic">
                        Strategic <span className="text-primary not-italic">Intelligence</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm sm:text-lg max-w-xl leading-relaxed italic border-l-2 border-slate-100 pl-6">
                        Sequence control established. Welcome back, <span className="text-slate-900 font-black">{session?.user?.name?.split(' ')[0]}</span>. Infrastructure parity is currently holding at nominal levels.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 group-hover:translate-x-[-10px] transition-transform duration-700">
                    <Link href="/dashboard/runs" className="btn-premium px-8 h-[64px] bg-white border-2 border-slate-100 hover:border-primary/20 shadow-xl shadow-slate-200/50">
                        <span className="material-symbols-outlined text-xl">history_edu</span>
                        Audit Logs
                    </Link>
                    <Link href="/dashboard/plans" className="btn-primary px-10 h-[64px] shadow-2xl shadow-primary/30">
                        <span className="material-symbols-outlined text-xl">rocket_launch</span>
                        Launch Sequence
                    </Link>
                </div>
            </div>

            {/* Tactical Metric Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
                {kpis.map((kpi, i) => (
                    <div key={i} className="card-premium p-8 lg:p-10 flex flex-col justify-between group h-full relative overflow-hidden transition-all hover:scale-[1.02] hover:-translate-y-2">
                        <div className="absolute right-0 top-0 p-6 opacity-[0.03] rotate-12 group-hover:opacity-[0.08] transition-all duration-700">
                            <span className="material-symbols-outlined text-6xl text-slate-900">{kpi.icon}</span>
                        </div>
                        <div className="flex items-start justify-between mb-10">
                            <div className={`size-14 rounded-[1.8rem] ${kpi.bg} ${kpi.color} flex items-center justify-center transition-all group-hover:rotate-6 shadow-2xl shadow-slate-200/50 border border-white/50`}>
                                <span className="material-symbols-outlined text-3xl">{kpi.icon}</span>
                            </div>
                            <div className="flex flex-col items-end opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Live_State</span>
                                <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse mt-1" />
                            </div>
                        </div>
                        <div className="space-y-2 relative z-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] font-display italic opacity-60">{kpi.label}</p>
                            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter italic">{loading ? "..." : kpi.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Real-time Observation Deck */}
            <div className="grid lg:grid-cols-[1.6fr_1fr] gap-10 lg:gap-16">
                {/* Visual Telemetry Stream */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-[0.3em] font-display italic">Recent_Telemetry</h2>
                            <div className="h-px w-24 bg-slate-100" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Last 5 Cycles</span>
                        </div>
                        <Link href="/dashboard/runs" className="text-[10px] font-black text-primary hover:text-slate-900 uppercase tracking-widest transition-colors flex items-center gap-2">
                            Full Audit Archive
                            <span className="material-symbols-outlined text-base">east</span>
                        </Link>
                    </div>

                    <div className="card-premium overflow-hidden bg-white border-2 border-slate-50/50 shadow-2xl">
                        {loading ? (
                            <div className="py-32 flex flex-col items-center justify-center gap-6">
                                <div className="relative size-12">
                                    <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Hydrating Worker State...</span>
                            </div>
                        ) : recentRuns.length === 0 ? (
                            <div className="py-32 flex flex-col items-center text-center px-8 group">
                                <div className="size-24 rounded-[3rem] bg-slate-50 border border-slate-100 flex items-center justify-center mb-10 shadow-inner group-hover:scale-110 transition-transform duration-700">
                                    <span className="material-symbols-outlined text-5xl text-slate-200 group-hover:text-primary transition-colors">history</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Telemetry Log Empty</h3>
                                <p className="text-sm text-slate-500 font-medium italic max-w-sm">No operational cycles recorded. Initialize a strategy sequence to generate first-party intelligence.</p>
                                <Link href="/dashboard/plans" className="btn-primary mt-10 px-8">Provision First Cycle</Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-900 text-white">
                                        <tr>
                                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 italic">Trajectory</th>
                                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 italic">Mode</th>
                                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 italic text-center">Peak_MS</th>
                                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 italic text-center">TPS</th>
                                            <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] opacity-60 italic text-right">View</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {recentRuns.map((run) => (
                                            <tr key={run.id} className="hover:bg-slate-50/80 transition-all group">
                                                <td className="px-10 py-8">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors tracking-tighter italic">{run.target.name}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Blueprint: {run.plan.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border ${run.status === 'DONE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse'
                                                        }`}>
                                                        {run.status}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-8 text-center font-display">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-lg font-black text-slate-900 tracking-tighter">
                                                            {run.metricsAgg?.p95Ms ? `${run.metricsAgg.p95Ms.toFixed(0)}` : "—"}
                                                        </span>
                                                        <span className="text-[9px] font-black text-slate-300 uppercase italic">Millisec</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 text-center font-display">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-lg font-black text-slate-900 tracking-tighter">
                                                            {run.metricsAgg?.avgRps ? `${run.metricsAgg.avgRps.toFixed(1)}` : "—"}
                                                        </span>
                                                        <span className="text-[9px] font-black text-slate-300 uppercase italic">Req/Sec</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    <Link href={`/dashboard/runs/${run.id}`} className="size-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all active:scale-95 border border-slate-100 shadow-sm">
                                                        <span className="material-symbols-outlined text-xl">insights</span>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tactical Intelligence Sidecar */}
                <div className="space-y-12">
                    {/* Insights Hub */}
                    <div className="card-premium p-10 bg-slate-950 text-white relative overflow-hidden group border-none shadow-2xl">
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-125 transition-transform duration-1000">
                            <span className="material-symbols-outlined text-[120px] italic">auto_awesome</span>
                        </div>
                        <div className="relative z-10 space-y-10">
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic border-b border-white/10 pb-4 flex items-center justify-between">
                                    System_Synopsis
                                    <span className="material-symbols-outlined text-lg">psychology</span>
                                </h3>
                                <p className="text-2xl font-black text-white leading-tight italic tracking-tighter">
                                    Infrastructure consistency identified at <span className="text-primary not-italic">99.2%</span> efficiency.
                                </p>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed italic opacity-80">
                                    Current p95 thresholds on PRODUCTION are holding steady despite 15% traffic increase over T-minus 24h.
                                </p>
                            </div>
                            <div className="flex items-center gap-4 py-6 px-1 bg-white/5 rounded-3xl border border-white/5">
                                <div className="size-3 rounded-full bg-emerald-500 animate-pulse ml-6 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Engine_v2.4_Stable</span>
                            </div>
                            <Link href="/dashboard/compare" className="btn-primary w-full h-[64px] bg-white text-slate-900 hover:bg-slate-50 border-none shadow-xl shadow-white/5">
                                Comparative Analytics
                                <span className="material-symbols-outlined text-xl">compare_arrows</span>
                            </Link>
                        </div>
                    </div>

                    {/* Operational GUIDANCE */}
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2 italic">Intelligence_Feed</h3>
                        {[
                            { i: "speed", t: "Latency_Hook", m: "Decreasing Concurrent VUs by 15% on Dev-Instances improves cold-start tail stability.", c: "text-amber-500" },
                            { i: "security", t: "Compliance_Check", m: "All SSL certificates for the Staging-Legacy node have been validated.", c: "text-emerald-500" },
                        ].map((tip, i) => (
                            <div key={i} className="card-premium p-8 flex gap-6 bg-white/50 border-2 border-slate-50/50 hover:border-primary/10 transition-all group">
                                <div className={`size-14 rounded-[1.5rem] bg-white text-slate-400 flex items-center justify-center shrink-0 shadow-xl border border-slate-50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ${tip.c}`}>
                                    <span className="material-symbols-outlined text-2xl">{tip.i}</span>
                                </div>
                                <div className="space-y-1.5">
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest italic">{tip.t}</h4>
                                    <p className="text-xs font-medium text-slate-500 leading-relaxed italic opacity-80">{tip.m}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
