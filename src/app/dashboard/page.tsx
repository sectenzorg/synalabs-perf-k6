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
        { label: "Total Runs", value: stats?.totalRuns ?? "—", icon: "monitoring", color: "text-sky-600", bg: "bg-sky-50" },
        { label: "Success Rate", value: stats?.successRate ? `${stats.successRate}%` : "—", icon: "check_circle", color: "text-sky-600", bg: "bg-sky-50" },
        { label: "Targets", value: stats?.targetCount ?? "—", icon: "hub", color: "text-sky-600", bg: "bg-sky-50" },
        { label: "Avg Latency", value: stats?.avgP95 ? `${stats.avgP95.toFixed(0)}ms` : "—", icon: "bolt", color: "text-sky-600", bg: "bg-sky-50" },
    ];

    return (
        <div className="space-y-8 animate-in pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1 font-display">
                        Dashboard
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Welcome back, {session?.user?.name?.split(' ')[0]}. Here is your performance overview.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/plans" className="btn-primary h-11 px-6 shadow-lg shadow-sky-500/20">
                        <span className="material-symbols-outlined text-lg">add</span>
                        New Test Plan
                    </Link>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, i) => (
                    <div key={i} className="card-premium p-6 flex flex-col gap-4 bg-white border-slate-100/60 shadow-xl shadow-slate-200/20 group hover:border-sky-200 transition-all">
                        <div className={`size-10 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center border border-sky-100/30`}>
                            <span className="material-symbols-outlined text-xl">{kpi.icon}</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{loading ? <div className="h-8 w-16 bg-slate-50 animate-pulse rounded-lg" /> : kpi.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-[1fr_360px] gap-8">
                {/* Recent Activity */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Recent Executions</h2>
                        <Link href="/dashboard/runs" className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1.5 transition-colors">
                            View all
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                    </div>

                    <div className="card-premium overflow-hidden border-slate-100/60 bg-white">
                        {loading ? (
                            <div className="py-24 flex flex-col items-center justify-center gap-4">
                                <div className="size-8 rounded-full border-2 border-slate-100 border-t-sky-500 animate-spin"></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hydrating state...</span>
                            </div>
                        ) : recentRuns.length === 0 ? (
                            <div className="py-24 flex flex-col items-center text-center px-8">
                                <div className="size-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-3xl text-slate-200">history</span>
                                </div>
                                <h3 className="text-base font-bold text-slate-900 mb-1">No execution history</h3>
                                <p className="text-xs text-slate-400 font-medium max-w-[240px]">Initialize a test plan to start collecting performance telemetry.</p>
                                <Link href="/dashboard/plans" className="btn-primary mt-8 scale-90">First run</Link>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuration</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Engine Latency</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Insight</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {recentRuns.map((run) => (
                                            <tr key={run.id} className="hover:bg-slate-50/30 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900">{run.target.name}</span>
                                                        <span className="text-[11px] font-medium text-slate-400">{run.plan.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${run.status === 'DONE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-sky-50 text-sky-600 border-sky-100 animate-pulse'}`}>
                                                        {run.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className="text-sm font-bold text-slate-700">
                                                        {run.metricsAgg?.p95Ms ? `${run.metricsAgg.p95Ms.toFixed(0)}ms` : "—"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <Link href={`/dashboard/runs/${run.id}`} className="size-8 inline-flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:text-sky-600 group-hover:bg-sky-50 transition-all border border-slate-100">
                                                        <span className="material-symbols-outlined text-lg">insights</span>
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
                <div className="space-y-6">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Infrastructure Insight</h2>

                    <div className="card-premium p-6 bg-slate-900 text-white border-none shadow-xl shadow-slate-950/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="material-symbols-outlined text-6xl">analytics</span>
                        </div>
                        <div className="relative z-10 space-y-6">
                            <div className="space-y-2">
                                <p className="text-lg font-bold leading-tight">Compare results easily.</p>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                    Analyze regressions between deployments by comparing telemetry across multiple test runs.
                                </p>
                            </div>
                            <Link href="/dashboard/compare" className="flex items-center justify-center gap-2 w-full h-11 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-sky-50 transition-all shadow-lg shadow-white/5">
                                Comparative Analytics
                                <span className="material-symbols-outlined text-lg">compare_arrows</span>
                            </Link>
                        </div>
                    </div>

                    <div className="card-premium p-6 space-y-6 border-slate-100/60 transition-all hover:border-sky-100">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active nodes</h3>
                        <div className="space-y-5">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center shrink-0 border border-sky-100/50">
                                    <span className="material-symbols-outlined text-xl">dns</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-xs font-bold text-slate-900">Runner Engine</h4>
                                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Healthy</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div className="h-full w-[95%] bg-sky-500 rounded-full" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 border border-slate-100">
                                    <span className="material-symbols-outlined text-xl">database</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-xs font-bold text-slate-900">Telemetry DB</h4>
                                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Online</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div className="h-full w-[82%] bg-sky-400/50 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
