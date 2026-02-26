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
        { label: "Total Runs", value: stats?.totalRuns ?? "—", icon: "monitoring", color: "text-[#ec5b13]", bg: "bg-orange-50" },
        { label: "Success Rate", value: stats?.successRate ? `${stats.successRate}%` : "—", icon: "check_circle", color: "text-[#ec5b13]", bg: "bg-orange-50" },
        { label: "Environments", value: stats?.targetCount ?? "—", icon: "hub", color: "text-[#ec5b13]", bg: "bg-orange-50" },
        { label: "Avg Latency", value: stats?.avgP95 ? `${stats.avgP95.toFixed(0)}ms` : "—", icon: "bolt", color: "text-[#ec5b13]", bg: "bg-orange-50" },
    ];

    return (
        <div className="space-y-10 animate-in pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1 font-display">
                        Analytical Engine
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Welcome, {session?.user?.name?.split(' ')[0] || 'Operator'}. System telemetry is currently nominal.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/plans" className="bg-[#ec5b13] text-white flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#ec5b13]/20 hover:opacity-90 transition-opacity">
                        <span className="material-symbols-outlined text-lg">add</span>
                        New Profiling Strategy
                    </Link>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 group hover:border-[#ec5b13]/40 transition-all duration-500">
                        <div className={`size-12 rounded-2xl ${kpi.bg} ${kpi.color} flex items-center justify-center border border-orange-100/50 mb-4 transition-transform group-hover:scale-110 duration-500`}>
                            <span className="material-symbols-outlined text-2xl">{kpi.icon}</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1 opacity-80">{kpi.label}</p>
                            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{loading ? <div className="h-9 w-16 bg-slate-50 animate-pulse rounded-lg" /> : kpi.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-[1fr_380px] gap-8">
                {/* Recent Activity */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Recent Executions</h2>
                        <Link href="/dashboard/runs" className="text-xs font-bold text-[#ec5b13] hover:underline flex items-center gap-1.5 transition-all">
                            View analytical feed
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                    </div>

                    <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/20">
                        {loading ? (
                            <div className="py-32 flex flex-col items-center justify-center gap-4">
                                <div className="size-10 rounded-full border-4 border-slate-100 border-t-[#ec5b13] animate-spin"></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing...</span>
                            </div>
                        ) : recentRuns.length === 0 ? (
                            <div className="py-32 flex flex-col items-center text-center px-8">
                                <div className="size-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-8 border border-dashed border-slate-200 text-slate-200">
                                    <span className="material-symbols-outlined text-4xl">history</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">No telemetry records</h3>
                                <p className="text-sm text-slate-400 font-medium max-w-[280px]">Initialize your first profiling run to populate the analytical data stream.</p>
                                <Link href="/dashboard/plans" className="btn-primary mt-10">Deploy Strategy</Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto no-scrollbar">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Strategy & Destination</th>
                                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Status</th>
                                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Engine Latency</th>
                                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Insight</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {recentRuns.map((run) => (
                                            <tr key={run.id} className="hover:bg-orange-50/20 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900 group-hover:text-[#ec5b13] transition-colors">{run.plan.name}</span>
                                                        <span className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">{run.target.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border transition-all ${run.status === 'DONE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : run.status === 'FAILED' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-orange-50 text-[#ec5b13] border-orange-100 animate-pulse'}`}>
                                                        {run.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className="text-sm font-extrabold text-slate-700 font-mono">
                                                        {run.metricsAgg?.p95Ms ? `${run.metricsAgg.p95Ms.toFixed(0)}ms` : "—"}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <Link href={`/dashboard/runs/${run.id}`} className="size-10 inline-flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-[#ec5b13] hover:bg-orange-100/50 hover:border-orange-100/50 transition-all border border-slate-100 shadow-sm">
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

                {/* Sidebar Insight */}
                <div className="space-y-8">
                    <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] px-2">Operational Context</h2>

                    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white border-none shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
                        <div className="absolute -top-10 -right-10 p-10 opacity-[0.03] group-hover:opacity-[0.08] group-hover:rotate-12 transition-all duration-700">
                            <span className="material-symbols-outlined text-[120px]">analytics</span>
                        </div>
                        <div className="relative z-10 space-y-8">
                            <div className="space-y-3">
                                <h4 className="text-xl font-extrabold leading-tight font-display tracking-tight">Regressive Analysis</h4>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                    Detect performance drift between infrastructure nodes by comparing real-time telemetry datasets.
                                </p>
                            </div>
                            <Link href="/dashboard/compare" className="flex items-center justify-center gap-3 w-full h-14 bg-white text-slate-900 rounded-2xl text-[11px] font-bold hover:bg-orange-50 transition-all shadow-xl active:scale-95">
                                Invoke Drift Analysis
                                <span className="material-symbols-outlined text-lg">compare_arrows</span>
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 space-y-8 transition-all hover:border-[#ec5b13]/20">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Live Nodes</h3>
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>

                        <div className="space-y-8">
                            <div className="flex items-center gap-5 group/item">
                                <div className="size-12 rounded-2xl bg-orange-50 text-[#ec5b13] flex items-center justify-center shrink-0 border border-orange-100/50 transition-transform group-hover/item:rotate-12">
                                    <span className="material-symbols-outlined text-2xl">dns</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold text-slate-900">Analytic Cloud</h4>
                                        <span className="text-[9px] font-extrabold text-[#ec5b13] uppercase tracking-[0.1em]">95% Ops</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner">
                                        <div className="h-full w-[95%] bg-[#ec5b13] rounded-full shadow-[0_0_8px_rgba(236,91,19,0.3)]" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-5 group/item">
                                <div className="size-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 border border-slate-100 transition-transform group-hover/item:-rotate-12">
                                    <span className="material-symbols-outlined text-2xl">database</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-bold text-slate-900">Telemetry Base</h4>
                                        <span className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-[0.1em]">Healthy</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner">
                                        <div className="h-full w-[82%] bg-[#ec5b13]/40 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button className="w-full text-center text-[11px] font-bold text-slate-400 hover:text-[#ec5b13] transition-colors uppercase tracking-[0.2em]">Manage Infrastructure</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
